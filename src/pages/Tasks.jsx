
import React, { useState, useEffect } from "react";
import { Task, Client, User, SubUser } from "@/api/entities"; // Updated import to include SubUser
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Plus, Filter, Star, ThumbsUp, TrendingUp, Archive, ArchiveRestore, Search, CheckCircle2, Clock, AlertCircle, Calendar, Users } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { isPast, isToday, isThisWeek, parseISO, format, isTomorrow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import TaskCard from "../components/tasks/TaskCard";
import TaskForm from "../components/tasks/TaskForm";
import DeleteTaskDialog from "../components/tasks/DeleteTaskDialog";
import ClientCombobox from "../components/shared/ClientCombobox";

// New constants from outline - not yet used in current TasksPage logic but included as per instructions
const statusColors = {
  pending: "bg-gray-100 text-gray-800 border-gray-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  archived: "bg-slate-100 text-slate-800 border-slate-200"
};

const priorityColors = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200"
};

const statusColumns = {
  pending: { name: "Pending", icon: <Star className="w-4 h-4 text-yellow-500" /> },
  in_progress: { name: "In Progress", icon: <TrendingUp className="w-4 h-4 text-green-500" /> },
  completed: { name: "Completed", icon: <ThumbsUp className="w-4 h-4 text-green-500" /> }
};

// Function to format dates in Eastern Time
const formatInEasternTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateString;
  }
};

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]); // Add team members state
  const [currentUser, setCurrentUser] = useState(null); // Add current user state
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ client_id: "all", priority: "all", date: "all", assigned_to: "all" }); // Add assigned_to filter
  const [selectedTasks, setSelectedTasks] = new useState(new Set());
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUserData = await User.me();
      setCurrentUser(currentUserData);
      
      const isUserAdmin = currentUserData.role === 'admin';
      const dataFilter = isUserAdmin ? {} : { created_by: currentUserData.email };

      const [taskData, clientData, subUserData] = await Promise.all([
        Task.filter(dataFilter, "-created_date"),
        Client.filter(dataFilter),
        SubUser.filter({ status: 'active' }),
      ]);
      
      setTasks(taskData || []);
      setClients(clientData || []);
      
      // Combine current user with sub-users for the assignee list
      const allTeamMembers = [
        { id: currentUserData.id, email: currentUserData.email, full_name: `${currentUserData.full_name} (Me)` },
        ...(Array.isArray(subUserData) ? subUserData : [])
      ];
      // Remove duplicates just in case
      const uniqueTeamMembers = allTeamMembers.filter((v,i,a)=>a.findIndex(t=>(t.email === v.email))===i);
      setTeamMembers(uniqueTeamMembers);

    } catch (error) {
      console.error("Error loading data:", error);
      setTasks([]);
      setClients([]);
      setTeamMembers([]);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (taskData) => {
    // The form component is now responsible for formatting the data correctly.
    // No further transformation is needed here.
    try {
      if (editingTask) {
        await Task.update(editingTask.id, taskData);
      } else {
        await Task.create({ ...taskData, status: "pending" });
      }
      setShowForm(false);
      setEditingTask(null);
      await loadData();
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleDeleteConfirm = async (task) => {
    try {
      await Task.delete(task.id);
      setDeletingTask(null);
      // Remove deleted task from selection if it was selected
      setSelectedTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(task.id);
        return newSet;
      });
      await loadData();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    
    setSelectedTasks(new Set()); // Clear selection on drag

    const task = tasks.find(t => t.id === draggableId);
    if (task && task.status !== destination.droppableId) {
      const updatedTask = { ...task, status: destination.droppableId };
      // Optimistic update - this might be removed if loadData() re-syncs fast enough
      // For now, it's kept as it was in the original code, but loadData() will replace it.
      setTasks(prev => prev.map(t => t.id === draggableId ? updatedTask : t)); 
      
      await Task.update(task.id, { status: destination.droppableId });
      await loadData(); // Re-sync with server
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleSelect = (taskId) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const activeTasks = tasks.filter(t => t.status !== 'archived');
  const archivedTasks = tasks.filter(t => t.status === 'archived');

  const filteredTasks = activeTasks.filter(task => {
    const clientMatch = filters.client_id === "all" || task.client_id === filters.client_id;
    const priorityMatch = filters.priority === "all" || task.priority === filters.priority;
    const assignedToMatch = filters.assigned_to === "all" || 
      (filters.assigned_to === "unassigned" && !task.assigned_to) ||
      (filters.assigned_to === "me" && task.assigned_to === currentUser?.email) ||
      task.assigned_to === filters.assigned_to;
    
    // Date filtering logic
    if (filters.date !== "all") {
      if (!task.due_date) return false; // Tasks without a due date are excluded from date filters
      const dueDate = parseISO(task.due_date);
      
      const dateMatch = {
        overdue: isPast(dueDate) && !isToday(dueDate), // isPast includes today, so exclude today
        today: isToday(dueDate),
        this_week: isThisWeek(dueDate, { weekStartsOn: 1 }), // weekStartsOn: 1 means Monday
      }[filters.date];

      return clientMatch && priorityMatch && assignedToMatch && dateMatch;
    }

    return clientMatch && priorityMatch && assignedToMatch;
  });

  const getTasksInColumn = (status) => filteredTasks.filter(t => t.status === status);

  const handleSelectAllInColumn = (status) => {
    const columnTaskIds = getTasksInColumn(status).map(t => t.id);
    const allInColumnSelected = columnTaskIds.length > 0 && columnTaskIds.every(id => selectedTasks.has(id));

    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (allInColumnSelected) {
        columnTaskIds.forEach(id => newSet.delete(id));
      } else {
        columnTaskIds.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  };

  const handleArchiveSelected = async () => {
    if (selectedTasks.size === 0) return;
    const tasksToArchiveIds = Array.from(selectedTasks);
    
    try {
      await Promise.all(
        tasksToArchiveIds.map(id => Task.update(id, { status: 'archived' }))
      );
      setSelectedTasks(new Set()); // Clear selection after archiving
      await loadData(); // Reload data to reflect changes
    } catch(e) {
      console.error("Error archiving tasks", e);
    }
  };

  const handleUnarchive = async (task) => {
    try {
      await Task.update(task.id, { status: 'pending' }); // Move back to pending
      await loadData();
    } catch(e) {
      console.error("Error unarchiving task", e);
    }
  };

  // Helper function to get assignee display name
  const getAssigneeDisplayName = (email) => {
    if (!email) return null;
    const teamMember = teamMembers.find(tm => tm.email === email);
    return teamMember ? teamMember.full_name : email;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Tasks</h1>
            <p className="text-slate-600">Manage your non-workflow related tasks.</p>
          </div>
          <Button onClick={() => { setShowForm(true); setEditingTask(null); }} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-[var(--color-accent-foreground)] shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            Add New Task
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between gap-4 mb-6 p-4 bg-white/60 backdrop-blur-sm rounded-lg shadow-md">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="w-5 h-5 text-slate-500" />
            <div className="flex items-center gap-2">
              <Label htmlFor="client-filter" className="text-sm font-medium">Client:</Label>
              <div className="w-48 h-9">
                <ClientCombobox
                  clients={clients}
                  value={filters.client_id}
                  onChange={(v) => handleFilterChange("client_id", v)}
                  showAllOption
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="priority-filter" className="text-sm font-medium">Priority:</Label>
              <Select value={filters.priority} onValueChange={(v) => handleFilterChange("priority", v)}>
                <SelectTrigger className="w-40 h-9" id="priority-filter">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* New Date Filter */}
            <div className="flex items-center gap-2">
              <Label htmlFor="date-filter" className="text-sm font-medium">Due:</Label>
              <Select value={filters.date} onValueChange={(v) => handleFilterChange("date", v)}>
                <SelectTrigger className="w-40 h-9" id="date-filter">
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* New Assigned To Filter */}
            <div className="flex items-center gap-2">
              <Label htmlFor="assigned-filter" className="text-sm font-medium">Assigned:</Label>
              <Select value={filters.assigned_to} onValueChange={(v) => handleFilterChange("assigned_to", v)}>
                <SelectTrigger className="w-40 h-9" id="assigned-filter">
                  <SelectValue placeholder="All Tasks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  <SelectItem value="me">My Tasks</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.email}>{member.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* New Show Archived Switch */}
          <div className="flex items-center gap-3">
            <Label htmlFor="show-archived" className="text-sm font-medium text-slate-700">Show Archived</Label>
            <Switch
              id="show-archived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
          </div>
        </div>
        
        {/* Bulk Actions Bar */}
        {selectedTasks.size > 0 && (
          <div className="flex items-center justify-between gap-4 mb-6 p-3 bg-green-100/80 backdrop-blur-sm border border-green-200 rounded-lg shadow-md">
            <span className="font-medium text-green-800">{selectedTasks.size} task{selectedTasks.size > 1 ? 's' : ''} selected</span>
            <div className="flex items-center gap-2">
              <Button onClick={handleArchiveSelected} size="sm" variant="outline" className="bg-white">
                <Archive className="w-4 h-4 mr-2" />
                Archive Selected
              </Button>
               <Button onClick={() => setSelectedTasks(new Set())} size="sm" variant="ghost">
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Kanban Board */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(statusColumns).map(([statusKey, statusInfo]) => {
              // Get tasks relevant to this column after main filters
              const columnTasks = getTasksInColumn(statusKey);
              const allInColumnSelected = columnTasks.length > 0 && columnTasks.every(id => selectedTasks.has(id));

              return (
              <Droppable key={statusKey} droppableId={statusKey}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`p-4 rounded-xl shadow-lg transition-colors duration-200 ${
                      snapshot.isDraggingOver ? 'bg-green-50' : 'bg-white/80 backdrop-blur-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-4">
                       <div className="flex items-center gap-3">
                        {statusInfo.icon}
                        <h2 className="text-lg font-bold text-slate-800">{statusInfo.name}</h2>
                        <Badge variant="secondary" className="text-slate-600">
                          {columnTasks.length}
                        </Badge>
                       </div>
                       {/* Select All Checkbox */}
                       <div className="flex items-center gap-2">
                          <Label htmlFor={`select-all-${statusKey}`} className="text-xs font-medium sr-only">Select All</Label>
                          <Checkbox 
                            id={`select-all-${statusKey}`}
                            checked={allInColumnSelected}
                            onCheckedChange={() => handleSelectAllInColumn(statusKey)}
                            disabled={columnTasks.length === 0} // Disable if no tasks in column
                          />
                       </div>
                    </div>
                    <div className="space-y-4 min-h-[400px]">
                      {columnTasks.length > 0 ? (
                        columnTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <TaskCard
                                  task={task}
                                  clientName={clients.find(c => c.id === task.client_id)?.first_name + ' ' + clients.find(c => c.id === task.client_id)?.last_name}
                                  assigneeName={getAssigneeDisplayName(task.assigned_to)}
                                  onEdit={() => handleEdit(task)}
                                  onDelete={() => setDeletingTask(task)}
                                  isDragging={snapshot.isDragging}
                                  isSelected={selectedTasks.has(task.id)}
                                  onSelect={() => handleToggleSelect(task.id)}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))
                      ) : (
                        <p className="text-slate-400 text-center py-8">No tasks in this column.</p>
                      )}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            )})}
          </div>
        </DragDropContext>
        
        {/* Archived Tasks Section */}
        {showArchived && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Archive className="w-6 h-6" />
              Archived Tasks ({archivedTasks.length})
            </h2>
            <div className="space-y-3">
              {archivedTasks.length > 0 ? archivedTasks.map(task => (
                <Card key={task.id} className="bg-slate-100/70">
                   <CardContent className="p-4 flex items-center justify-between">
                     <div>
                       <p className="font-medium text-slate-600 line-through">{task.title}</p>
                       <p className="text-xs text-slate-500">Archived on {formatInEasternTime(task.updated_date || task.created_date)}</p>
                     </div>
                     <Button variant="outline" size="sm" onClick={() => handleUnarchive(task)}>
                       <ArchiveRestore className="w-4 h-4 mr-2" /> Unarchive
                     </Button>
                   </CardContent>
                </Card>
              )) : (
                <p className="text-slate-500 text-center py-4">No archived tasks.</p>
              )}
            </div>
          </div>
        )}
        
        {/* Modals */}
        {showForm && (
          <TaskForm
            task={editingTask}
            clients={clients}
            teamMembers={teamMembers}
            currentUser={currentUser}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditingTask(null); }}
          />
        )}
        {deletingTask && (
          <DeleteTaskDialog
            task={deletingTask}
            onConfirm={() => handleDeleteConfirm(deletingTask)}
            onCancel={() => setDeletingTask(null)}
          />
        )}
      </div>
    </div>
  );
}
