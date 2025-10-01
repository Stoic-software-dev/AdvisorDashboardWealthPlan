
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { WorkflowTask, Checklist, ChecklistInstance, User as UserEntity } from "@/api/entities";
import { Save, X, User as UserIcon, CalendarDays, ClipboardList, Plus, Trash2, FileText, CheckSquare } from "lucide-react";
import { format } from "date-fns";
import ClientCombobox from '../shared/ClientCombobox';

export default function AddTaskModal({
  isOpen,
  onClose,
  onTaskAdded, // Renamed from onSave
  workflowInstance,
  stepId,
  clients,
  task,
  teamMembers // New prop
}) {
  const [formData, setFormData] = useState({
    task_name: "",
    description: "",
    priority: "medium",
    due_date: "",
    client_id: null,
    subtasks: [],
    linked_note_id: null,
    assigned_to: null // New state field
  });
  
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [availableNotes, setAvailableNotes] = useState([]);

  const [linkedChecklists, setLinkedChecklists] = useState([]);
  const [availableChecklists, setAvailableChecklists] = useState([]);
  const [selectedChecklistToAdd, setSelectedChecklistToAdd] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadChecklists = async () => {
    try {
      const checklists = await Checklist.list();
      setAvailableChecklists(checklists);
    } catch (error) {
      console.error("Error loading checklists:", error);
      setAvailableChecklists([]);
    }
  };

  useEffect(() => {
    if (task) {
      setFormData({
        task_name: task.task_name || "",
        description: task.description || "",
        priority: task.priority || "medium",
        due_date: task.due_date || "",
        client_id: task.client_id || null,
        subtasks: task.subtasks || [],
        linked_note_id: task.linked_note_id || null,
        assigned_to: task.assigned_to || null // Initialize from existing task
      });
      setLinkedChecklists(task.linked_checklists || []);
    } else {
       setFormData({
        task_name: "",
        description: "",
        priority: "medium",
        due_date: "",
        client_id: null,
        subtasks: [],
        linked_note_id: null,
        assigned_to: null // Reset for new task
      });
      setLinkedChecklists([]);
    }
    
    if (isOpen) {
      loadChecklists();
    }
  }, [task, isOpen]);

  useEffect(() => {
    const loadNotes = async () => {
      if (formData.client_id) {
        try {
          const { Note } = await import("@/api/entities");
          const clientNotes = await Note.filter({ client_id: formData.client_id }, "-created_date");
          setAvailableNotes(clientNotes || []);
        } catch (error) {
          console.error("Error loading notes:", error);
          setAvailableNotes([]);
        }
      } else {
        setAvailableNotes([]);
      }
    };
    loadNotes();
  }, [formData.client_id]);

  const handleChange = (field, value) => {
    // For select components that might return 'null' string, convert to actual null
    const adjustedValue = value === "null" ? null : value; 
    setFormData((prev) => ({ ...prev, [field]: adjustedValue }));
  };

  const addSubtask = () => {
    if (newSubtaskText.trim()) {
      const newSubtask = { name: newSubtaskText, completed: false };
      handleChange("subtasks", [...formData.subtasks, newSubtask]);
      setNewSubtaskText("");
    }
  };

  const toggleSubtask = (index) => {
    const updatedSubtasks = [...formData.subtasks];
    updatedSubtasks[index].completed = !updatedSubtasks[index].completed;
    handleChange("subtasks", updatedSubtasks);
  };
  
  const removeSubtask = (index) => {
    const updatedSubtasks = formData.subtasks.filter((_, i) => i !== index);
    handleChange("subtasks", updatedSubtasks);
  };

  const handleAddChecklist = () => {
    if (!selectedChecklistToAdd) return;
    
    const checklist = availableChecklists.find(c => c.id === selectedChecklistToAdd);
    if (checklist && !linkedChecklists.find(lc => lc.checklist_id === selectedChecklistToAdd)) {
      setLinkedChecklists([...linkedChecklists, {
        checklist_id: selectedChecklistToAdd,
        checklist_name: checklist.name
      }]);
      setSelectedChecklistToAdd('');
    }
  };

  const handleRemoveChecklist = (checklistId) => {
    setLinkedChecklists(linkedChecklists.filter(lc => lc.checklist_id !== checklistId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.task_name.trim()) {
      alert("Task name is required.");
      return;
    }
    
    setIsSaving(true);

    try {
      const taskData = {
        ...formData,
        linked_note_id: formData.linked_note_id || null,
        workflow_instance_id: workflowInstance.id,
        client_id: formData.client_id,
        current_step_id: stepId,
        linked_checklists: linkedChecklists,
        subtasks: formData.subtasks.map(st => ({ name: st.name, completed: st.completed })),
        assigned_to: formData.assigned_to // Include assigned_to
      };

      let savedTask;
      if (task?.id) {
        // Update existing task
        savedTask = await WorkflowTask.update(task.id, taskData);
        
        // Handle checklist updates for existing tasks
        if (linkedChecklists.length > 0) {
          // Get existing checklist instances for this task
          const existingInstances = await ChecklistInstance.filter({ workflow_task_id: task.id });
          const existingChecklistIds = existingInstances.map(instance => instance.checklist_id);
          
          // Create instances for newly linked checklists
          const user = await UserEntity.me();
          for (const linkedChecklist of linkedChecklists) {
            if (!existingChecklistIds.includes(linkedChecklist.checklist_id)) {
              const checklist = availableChecklists.find(c => c.id === linkedChecklist.checklist_id);
              if (checklist) {
                console.log('Creating checklist instance for existing task:', {
                  checklist_id: checklist.id,
                  workflow_task_id: task.id,
                  client_id: formData.client_id,
                  instance_name: `${checklist.name} - ${formData.task_name}`
                });
                
                await ChecklistInstance.create({
                  checklist_id: checklist.id,
                  workflow_task_id: task.id,
                  client_id: formData.client_id,
                  instance_name: `${checklist.name} - ${formData.task_name}`,
                  items: checklist.items.map(item => ({
                    ...item,
                    completed: false,
                    completed_by: null,
                    completed_date: null,
                    notes: ''
                  })),
                  assigned_to: formData.assigned_to || user.email // Use formData.assigned_to if set, otherwise current user
                });
              }
            }
          }
        }
      } else {
        // Create new task
        savedTask = await WorkflowTask.create(taskData);
        console.log('Created new task:', savedTask);
        
        // Create checklist instances for new task
        if (linkedChecklists.length > 0) {
          const user = await UserEntity.me();
          console.log('Creating checklist instances for new task. Linked checklists:', linkedChecklists);
          
          for (const linkedChecklist of linkedChecklists) {
            const checklist = availableChecklists.find(c => c.id === linkedChecklist.checklist_id);
            if (checklist) {
              console.log('Creating checklist instance:', {
                checklist_id: checklist.id,
                workflow_task_id: savedTask.id,
                client_id: formData.client_id,
                instance_name: `${checklist.name} - ${formData.task_name}`
              });
              
              try {
                const instance = await ChecklistInstance.create({
                  checklist_id: checklist.id,
                  workflow_task_id: savedTask.id,
                  client_id: formData.client_id,
                  instance_name: `${checklist.name} - ${formData.task_name}`,
                  items: checklist.items.map(item => ({
                    ...item,
                    completed: false,
                    completed_by: null,
                    completed_date: null,
                    notes: ''
                  })),
                  assigned_to: formData.assigned_to || user.email // Use formData.assigned_to if set, otherwise current user
                });
                console.log('Successfully created checklist instance:', instance);
              } catch (instanceError) {
                console.error('Error creating checklist instance:', instanceError);
                alert(`Warning: Failed to create checklist instance for "${checklist.name}". The task was saved but you may need to manually link the checklist.`);
              }
            } else {
              console.warn('Could not find checklist with ID:', linkedChecklist.checklist_id);
            }
          }
        }
      }

      console.log('Task save completed. Calling onTaskAdded...');
      onTaskAdded(); // Renamed from onSave
      onClose();
    } catch (error) {
      console.error("Error saving workflow task:", error);
      alert("Error saving task. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {task ? "Edit Task" : "Add New Task"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="task_name" className="flex items-center gap-2 text-sm">
              <ClipboardList className="w-4 h-4" />
              Task Name
            </Label>
            <Input
              id="task_name"
              value={formData.task_name}
              onChange={(e) => handleChange("task_name", e.target.value)}
              placeholder="e.g., Prepare review documents"
              required
            />
          </div>

          <div>
            <Label htmlFor="description" className="flex items-center gap-2 text-sm">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Add more details about the task..."
              rows={2}
            />
          </div>
          
          <div>
            <Label htmlFor="client_id" className="flex items-center gap-2 text-sm">
              <UserIcon className="w-4 h-4" />
              Client
            </Label>
            <ClientCombobox
                clients={clients}
                value={formData.client_id}
                onChange={(clientId) => handleChange("client_id", clientId)}
                placeholder="Select a client"
              />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority" className="flex items-center gap-2 text-sm">
                Priority
              </Label>
              <Select value={formData.priority} onValueChange={(v) => handleChange("priority", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="assigned_to" className="flex items-center gap-2 text-sm">
                <UserIcon className="w-4 h-4" />
                Assign To
              </Label>
              <Select 
                value={formData.assigned_to === null ? "null" : formData.assigned_to} 
                onValueChange={(value) => handleChange("assigned_to", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Unassigned</SelectItem>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.email}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="due_date" className="flex items-center gap-2 text-sm">
              <CalendarDays className="w-4 h-4" />
              Due Date
            </Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => handleChange("due_date", e.target.value)}
            />
          </div>

          {formData.client_id && (
            <div>
              <Label htmlFor="linked_note_id" className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4" />
                Link to Client Note (Optional)
              </Label>
              <Select 
                value={formData.linked_note_id === null ? "null" : formData.linked_note_id} 
                onValueChange={(v) => handleChange("linked_note_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a note to link" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">No note linked</SelectItem>
                  {availableNotes.map(note => (
                    <SelectItem key={note.id} value={note.id}>
                      {note.subject} ({format(new Date(note.created_date), "MMM d, yyyy")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableNotes.length === 0 && formData.client_id && (
                <p className="text-xs text-slate-500 mt-1">No notes available for this client.</p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="subtasks" className="flex items-center gap-2 text-sm mb-2">
              <ClipboardList className="w-4 h-4" />
              Subtasks
            </Label>
            <div className="space-y-2">
              {(formData.subtasks || []).map((subtask, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Checkbox
                    id={`subtask-${index}`}
                    checked={subtask.completed}
                    onCheckedChange={() => toggleSubtask(index)}
                  />
                  <Label
                    htmlFor={`subtask-${index}`}
                    className={`flex-1 text-sm ${subtask.completed ? "line-through text-slate-500" : ""}`}
                  >
                    {subtask.name}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSubtask(index)}
                    className="h-6 w-6"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Input
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
                placeholder="Add a new subtask..."
              />
              <Button type="button" onClick={addSubtask}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-base font-medium">Linked Checklists</Label>
            <p className="text-sm text-slate-600 mb-3">Attach checklists to this task for systematic completion tracking.</p>
            
            <div className="flex gap-2 mb-3">
              <Select value={selectedChecklistToAdd} onValueChange={setSelectedChecklistToAdd}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a checklist to add..." />
                </SelectTrigger>
                <SelectContent>
                  {availableChecklists
                    .filter(c => !linkedChecklists.find(lc => lc.checklist_id === c.id))
                    .map(checklist => (
                      <SelectItem key={checklist.id} value={checklist.id}>
                        {checklist.name} ({checklist.items.length} items)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={handleAddChecklist}
                disabled={!selectedChecklistToAdd}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>

            {linkedChecklists.length > 0 && (
              <div className="space-y-2">
                {linkedChecklists.map((linkedChecklist) => {
                  const checklist = availableChecklists.find(c => c.id === linkedChecklist.checklist_id);
                  return (
                    <div key={linkedChecklist.checklist_id} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">{linkedChecklist.checklist_name}</span>
                        {checklist && (
                          <Badge variant="secondary" className="text-xs">
                            {checklist.items.length} items
                          </Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveChecklist(linkedChecklist.checklist_id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : (task ? "Update Task" : "Create Task")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
