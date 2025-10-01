
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { WorkflowStep, WorkflowTask, TaskComment, WorkflowInstance, Note, ArchivedWorkflowTask, User, Checklist, SubUser } from "@/api/entities";
import TaskCard from "./TaskCard";
import TaskDetailsModal from "./TaskDetailsModal";
import TaskCommentsModal from "./TaskCommentsModal";
import ChecklistViewerModal from "./ChecklistViewerModal";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { isPast, isToday, isThisWeek, parseISO, formatDistanceToNow } from 'date-fns';

const formatCommentDate = (dateString) => {
  if (!dateString) return "Just now";
  try {
    let date = new Date(dateString);
    if (isNaN(date.getTime())) {
      date = new Date(dateString.replace(/-/g, '/'));
      if (isNaN(date.getTime())) {
        return "Just now";
      }
    }
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (e) {
    console.error("Date formatting error:", e, "for date string:", dateString);
    return "Just now";
  }
};

export default function WorkflowBoard({ workflowInstance, workflow, clients, onUpdate, focusedClient }) {
  const [steps, setSteps] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [comments, setComments] = useState({});
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState(null);

  const [filters, setFilters] = useState({
    client: focusedClient?.id || 'all',
    dueDate: 'all',
    priority: 'all',
    keyword: ''
  });

  useEffect(() => {
    // If the main client context changes, update the filter
    setFilters(prev => ({ ...prev, client: focusedClient?.id || 'all' }));
  }, [focusedClient]);

  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        const [currentUser, subUsers] = await Promise.all([
            User.me(),
            SubUser.filter({ status: 'active' })
        ]);
        
        const allTeamMembers = [
          { id: currentUser.id, email: currentUser.email, full_name: `${currentUser.full_name} (Me)` },
          ...(Array.isArray(subUsers) ? subUsers : [])
        ];
        
        const uniqueTeamMembers = allTeamMembers.filter((v,i,a)=>a.findIndex(t=>(t.email === v.email))===i);

        setTeamMembers(uniqueTeamMembers);
      } catch (error) {
        console.error("Error loading team members:", error);
        setTeamMembers([]);
      }
    };
    
    loadTeamMembers();
  }, []);

  const loadBoardData = useCallback(async () => {
    setIsLoading(true);
    if (!workflowInstance || !workflow) {
        setIsLoading(false);
        return;
    }
    
    try {
        const isTemplateView = workflowInstance.status === 'template';
        let tasksData = [];

        // This is the critical fix: Load tasks using BOTH old and new patterns to ensure all data is visible.
        // Keeping the existing robust logic for task fetching.
        if (isTemplateView) {
            console.log(`Template View: Fetching tasks for instance ID ${workflowInstance.id}`);
            const [oldPatternTasks, newPatternTasks] = await Promise.all([
                WorkflowTask.filter({ workflow_id: workflow.id }, "-created_date"),
                WorkflowTask.filter({ workflow_instance_id: workflowInstance.id }, "-created_date")
            ]);

            const allTasks = [...(oldPatternTasks || []), ...(newPatternTasks || [])];
            // De-duplicate the merged list to prevent any potential double-ups.
            tasksData = Array.from(new Map(allTasks.map(task => [task.id, task])).values());
            
            console.log(`Template View: Loaded ${tasksData.length} unique tasks.`);

        } else {
            // For a live client workflow, the logic remains simple and correct.
            tasksData = await WorkflowTask.filter({ workflow_instance_id: workflowInstance.id }, "-created_date");
            console.log(`Live Instance View: Loaded ${tasksData.length} tasks.`);
        }

        const [stepsData, commentsData, checklistsData, noteData] = await Promise.all([
            WorkflowStep.filter({ workflow_id: workflow.id }, "step_order"),
            TaskComment.filter({}), 
            Checklist.filter({ is_template: true }),
            Note.list() 
        ]);
        
        setSteps(stepsData);
        setTasks(tasksData);
        setChecklists(checklistsData || []);
        setNotes(noteData || []);

        const commentsByTask = (commentsData || []).reduce((acc, comment) => {
            (acc[comment.task_id] = acc[comment.task_id] || []).push(comment);
            return acc;
        }, {});
        setComments(commentsByTask);

    } catch (error) {
        console.error("Error loading workflow data:", error);
        setTasks([]); // Ensure tasks are reset on error to avoid stale data
    }
    setIsLoading(false);
  }, [workflowInstance, workflow]);

  useEffect(() => {
    loadBoardData();
  }, [loadBoardData]);
  
  const commentCounts = useMemo(() => {
    return Object.entries(comments).reduce((acc, [taskId, taskComments]) => {
      acc[taskId] = taskComments.length;
      return acc;
    }, {});
  }, [comments]);
  
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      client: 'all',
      dueDate: 'all',
      priority: 'all',
      keyword: ''
    });
  };

  const filteredTasks = useMemo(() => {
    console.log('All tasks before filtering:', tasks);
    console.log('Current filters:', filters);
    
    const filtered = tasks.filter(task => { 
      if (task.status === 'cancelled' || task.status === 'deleted') {
        return false;
      }

      // Check for client_ids array or fallback to client_id string
      const clientMatch = filters.client === 'all' || 
                          (Array.isArray(task.client_ids) && task.client_ids.includes(filters.client)) ||
                          (task.client_id === filters.client); 
      
      const priorityMatch = filters.priority === 'all' || task.priority === filters.priority;
      
      const keywordMatch = !filters.keyword ||
          task.task_name.toLowerCase().includes(filters.keyword.toLowerCase()) ||
          (task.description && task.description.toLowerCase().includes(filters.keyword.toLowerCase()));

      let dateMatch = true;
      if (filters.dueDate !== 'all') {
        const dueDate = task.due_date ? parseISO(task.due_date) : null;
        if (!dueDate) {
          dateMatch = filters.dueDate === 'no_date';
        } else {
          switch(filters.dueDate) {
            case 'overdue':
              dateMatch = isPast(dueDate) && !isToday(dueDate);
              break;
            case 'today':
              dateMatch = isToday(dueDate);
              break;
            case 'this_week':
              dateMatch = isThisWeek(dueDate, { weekStartsOn: 1 });
              break;
            case 'no_date':
              dateMatch = false;
              break;
            default:
              dateMatch = true;
          }
        }
      }
      
      const matches = clientMatch && priorityMatch && keywordMatch && dateMatch;
      console.log(`Task ${task.task_name}: client=${clientMatch}, priority=${priorityMatch}, keyword=${keywordMatch}, date=${dateMatch}, final=${matches}`);
      
      return matches;
    });

    console.log('Filtered tasks:', filtered);
    return filtered;
  }, [tasks, filters]);

  const getTasksInStep = (stepId) => {
    const tasksInStep = filteredTasks.filter(task => task.current_step_id === stepId);
    console.log(`Tasks in step ${stepId}:`, tasksInStep);
    return tasksInStep;
  };

  const handleOpenTaskModal = (task, stepId = null) => {
    // Simplified handleOpenTaskModal for creating new tasks
    if (task) { // Existing task
      setSelectedTask(task);
      setSelectedStep(task.current_step_id);
    } else { // New task
      const isTemplateView = workflowInstance.status === 'template';
      const newTaskData = {
        current_step_id: stepId,
        workflow_instance_id: workflowInstance.id,
        status: 'pending',
        // Pre-populate with the focused client if not in template view
        // Ensure client_ids is always an array
        client_ids: !isTemplateView && focusedClient?.id ? [focusedClient.id] : [],
      };
      setSelectedTask(newTaskData);
      setSelectedStep(stepId);
    }
    setIsTaskModalOpen(true);
  };
  
  const handleOpenCommentsModal = (task) => {
    setSelectedTask(task);
    setIsCommentsModalOpen(true);
  };
  
  const handleOpenChecklistModal = (task) => {
    setSelectedTask(task);
    setIsChecklistModalOpen(true);
  };

  const handleSaveTask = useCallback(async (data) => {
    try {
      // The `isTemplateView` check might still be relevant for some backend logic
      // if the API differentiates between template and instance tasks for certain fields,
      // but for client_ids, we aim for consistency.
      const isTemplateView = workflowInstance.status === 'template'; 
      const taskData = {
        ...data,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
      };
      
      if (taskData.id) {
        // --- UPDATE EXISTING TASK ---
        // The data from the modal (`taskData`) already contains the correct `client_ids` array.
        // We just need to pass it to the update function.
        await WorkflowTask.update(taskData.id, taskData);
        console.log('Updated task:', taskData.id, 'with clients:', taskData.client_ids);
      } else {
        // --- CREATE NEW TASK ---
        const newTaskPayload = {
            ...taskData, // This now correctly includes the `client_ids` array from the modal (due to handleOpenTaskModal change)
            current_step_id: selectedStep,
            status: 'pending',
            workflow_id: workflow.id,
            workflow_instance_id: workflowInstance.id,
        };

        // No special client_id logic is needed here anymore as the modal (and handleOpenTaskModal)
        // handles client_ids directly and consistently.
        console.log('Creating new task with data:', newTaskPayload);
        await WorkflowTask.create(newTaskPayload);
      }
      
      setSelectedTask(null);
      setIsTaskModalOpen(false);
      setSelectedStep(null); // Ensure selectedStep is cleared on modal close

      await loadBoardData();
      if (onUpdate) onUpdate(); 
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Error saving task. Please try again.");
    }
  }, [workflowInstance, workflow, selectedStep, loadBoardData, onUpdate]);

  const handleArchiveTask = async (task) => {
    if (!window.confirm(`Are you sure you want to mark "${task.task_name}" as complete? This will archive the task.`)) return;

    try {
        const fullTaskData = await WorkflowTask.get(task.id);
        const taskComments = await TaskComment.filter({task_id: task.id});

        const archiveData = {
            client_id: fullTaskData.client_id || (Array.isArray(fullTaskData.client_ids) && fullTaskData.client_ids[0]) || null, // Handle both client_id and client_ids
            original_task_id: fullTaskData.id,
            workflow_name: workflow.name,
            workflow_instance_name: workflowInstance.instance_name,
            step_name: steps.find(s => s.id === fullTaskData.current_step_id)?.step_name || 'Unknown Step',
            task_name: fullTaskData.task_name,
            description: fullTaskData.description,
            priority: fullTaskData.priority,
            assigned_to: fullTaskData.assigned_to,
            due_date: fullTaskData.due_date,
            completed_date: new Date().toISOString(),
            archived_date: new Date().toISOString(),
            subtasks: fullTaskData.subtasks || [],
            linked_note_id: fullTaskData.linked_note_id,
            comments: taskComments.map(c => ({ comment: c.comment, created_date: c.created_date, created_by: c.created_by }))
        };
        
        await ArchivedWorkflowTask.create(archiveData);
        await WorkflowTask.delete(fullTaskData.id);
        
        await loadBoardData();
        if (onUpdate) onUpdate();
    } catch (error) {
        console.error("Error archiving task:", error);
        alert("Failed to archive task. Please try again.");
    }
  };

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Are you sure you want to delete "${task.task_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await WorkflowTask.delete(task.id);
      
      // Reload the board data to reflect the deletion
      await loadBoardData();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Failed to delete task. Please try again.");
    }
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const taskToMoveOptimistically = tasks.find(t => t.id === draggableId);
    if (!taskToMoveOptimistically) return;

    const originalTasks = [...tasks];

    if (destination.droppableId === 'completed') {
      const updatedTasks = tasks.filter(task => task.id !== draggableId);
      setTasks(updatedTasks);

      try {
        await handleArchiveTask(taskToMoveOptimistically);
      } catch (error) {
        console.error("Failed to mark task as completed and archive:", error);
        setTasks(originalTasks);
        alert("Failed to mark task as complete and archive. Please try again.");
      }
      return;
    }

    const optimisticTasks = tasks.map(task =>
      task.id === draggableId
        ? { ...task, current_step_id: destination.droppableId }
        : task
    );
    setTasks(optimisticTasks);

    try {
      const taskToUpdate = await WorkflowTask.get(draggableId);
      if (!taskToUpdate) throw new Error("Task not found on server.");

      const processedSubtasks = taskToUpdate.subtasks?.map(sub => {
        return {
          id: sub.id || crypto.randomUUID(),
          text: sub.text || sub.name || '',
          completed: sub.completed || false,
        };
      }).filter(sub => sub.text.trim() !== '');

      await WorkflowTask.update(draggableId, {
        ...taskToUpdate,
        current_step_id: destination.droppableId,
        subtasks: processedSubtasks,
      });

    } catch (error) {
      console.error("Failed to update task step:", error);
      setTasks(originalTasks);
      alert("Failed to move the task. The data for this task might be out of date. Please refresh.");
    }
  };

  // Old getClientName - kept for compatibility if needed elsewhere
  const getClientName = useCallback((clientId) => {
    if (!clientId) return 'N/A';
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : 'N/A';
  }, [clients]);

  // New getClientNames to handle multiple client IDs and return a comma-separated string
  const getClientNames = useCallback((clientIdsArray) => {
    if (!Array.isArray(clientIdsArray) || clientIdsArray.length === 0) {
      return 'N/A';
    }
    const names = clientIdsArray
      .map(id => {
        const client = clients.find(c => c.id === id);
        return client ? `${client.first_name} ${client.last_name}` : null;
      })
      .filter(Boolean); // Remove any nulls from clients not found
    return names.length > 0 ? names.join(', ') : 'N/A';
  }, [clients]);

  const getAssigneeName = (email) => {
    if (!email) return null;
    const user = teamMembers.find(u => u.email === email);
    return user ? user.full_name : email.split('@')[0];
  };

  if (isLoading) {
    return <div className="p-6 text-center">Loading board...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap gap-4 items-center mb-4 p-3 bg-slate-50 rounded-lg border">
        <div className="flex-1 min-w-[150px]">
          <Select value={filters.client} onValueChange={(v) => handleFilterChange('client', v)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Filter by client..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Household Members</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <Select value={filters.dueDate} onValueChange={(v) => handleFilterChange('dueDate', v)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Filter by due date..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Due Dates</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="no_date">No Due Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <Select value={filters.priority} onValueChange={(v) => handleFilterChange('priority', v)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Filter by priority..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search by keyword..."
            value={filters.keyword}
            onChange={(e) => handleFilterChange('keyword', e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleClearFilters}
          className="whitespace-nowrap"
        >
          Clear Filters
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 h-full overflow-x-auto pb-4">
            {steps.map((step) => {
              const tasksInColumn = getTasksInStep(step.id);
              return (
                <div key={step.id} className="flex flex-col bg-slate-50 rounded-lg p-3 w-80 flex-shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-slate-700 truncate">
                      {step.step_name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {tasksInColumn.length}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleOpenTaskModal(null, step.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Droppable droppableId={step.id}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-1 space-y-2 overflow-y-auto min-h-[200px] ${
                          snapshot.isDraggingOver ? 'bg-blue-50 rounded-md' : ''
                        }`}
                      >
                        {tasksInColumn.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={snapshot.isDragging ? 'rotate-3' : ''}
                              >
                                <TaskCard
                                  task={task}
                                  clientName={getClientNames(task.client_ids || (task.client_id ? [task.client_id] : []))}
                                  assigneeName={getAssigneeName(task.assigned_to)}
                                  onEdit={() => handleOpenTaskModal(task)}
                                  onMarkComplete={() => handleArchiveTask(task)}
                                  onComment={() => handleOpenCommentsModal(task)}
                                  onLinkChecklist={() => handleOpenChecklistModal(task)}
                                  onDelete={() => handleDeleteTask(task)}
                                  commentCount={commentCounts[task.id] || 0}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {isTaskModalOpen && (
        <TaskDetailsModal
          task={selectedTask}
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setSelectedTask(null);
            setSelectedStep(null);
          }}
          onSave={handleSaveTask}
          onUpdate={loadBoardData}
          clients={clients}
          teamMembers={teamMembers}
          workflowInstance={workflowInstance}
          checklists={checklists}
          onLinkChecklist={() => handleOpenChecklistModal(selectedTask)}
        />
      )}
      {isCommentsModalOpen && (
        <TaskCommentsModal
          task={selectedTask}
          isOpen={isCommentsModalOpen}
          onClose={() => {
            setIsCommentsModalOpen(false);
            setSelectedTask(null);
          }}
          onUpdate={loadBoardData}
        />
      )}
      {isChecklistModalOpen && (
        <ChecklistViewerModal
          task={selectedTask}
          checklists={checklists}
          isOpen={isChecklistModalOpen}
          onClose={() => setIsChecklistModalOpen(false)}
          onUpdate={loadBoardData}
        />
      )}
    </div>
  );
}
