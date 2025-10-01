
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  X, 
  Trash2, 
  Calendar, 
  User, 
  StickyNote, 
  File, 
  ClipboardCheck, 
  Link as LinkIcon, 
  Eye, 
  ExternalLink 
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Note, Document, Checklist } from "@/api/entities";

import NoteViewerModal from "../notes/NoteViewerModal";
import LinkDocumentModal from "./LinkDocumentModal";
import ChecklistPreviewModal from '../checklists/ChecklistPreviewModal';
import TaskClientSearch from './TaskClientSearch'; // Added new import

export default function TaskDetailsModal({ 
  task, 
  isOpen, 
  onClose, 
  onSave, 
  onUpdate,
  clients, 
  teamMembers,
  workflowInstance,
  checklists = []
}) {
  const [formData, setFormData] = useState(null);
  const [clientNotes, setClientNotes] = useState([]);
  const [newSubtask, setNewSubtask] = useState("");

  const [linkedNote, setLinkedNote] = useState(null);
  const [linkedDocument, setLinkedDocument] = useState(null);
  
  const [isNoteViewerOpen, setIsNoteViewerOpen] = useState(false);
  const [isDocLinkerOpen, setIsDocLinkerOpen] = useState(false);
  const [isPreviewChecklistOpen, setIsPreviewChecklistOpen] = useState(false);
  const [previewingChecklist, setPreviewingChecklist] = useState(null);

  useEffect(() => {
    if (task && isOpen) {
      setFormData({
        ...task,
        client_ids: Array.isArray(task.client_ids) ? task.client_ids : [],
        subtasks: Array.isArray(task.subtasks) ? task.subtasks.map(s => ({ ...s, id: s.id || crypto.randomUUID() })) : [],
        linked_checklists: Array.isArray(task.linked_checklists) ? task.linked_checklists : [],
      });
    } else {
      setFormData(null);
    }
  }, [task, isOpen]);
  
  useEffect(() => {
    const fetchLinkedItems = async () => {
        if (!formData) return;

        // Fetch Note
        if (formData.linked_note_id) {
            try {
                const note = await Note.get(formData.linked_note_id);
                setLinkedNote(note);
            } catch { setLinkedNote(null); }
        } else {
            setLinkedNote(null);
        }

        // Fetch Document
        if (formData.linked_document_id) {
            try {
                const doc = await Document.get(formData.linked_document_id);
                setLinkedDocument(doc);
            } catch { setLinkedDocument(null); }
        } else {
            setLinkedDocument(null);
        }
    };

    if (isOpen) {
        fetchLinkedItems();
    }
  }, [isOpen, formData]);

  const loadClientNotes = useCallback(async () => {
    if (formData?.client_ids?.length > 0) {
      try {
        const notesPromises = formData.client_ids.map(clientId => Note.filter({ client_id: clientId }));
        const notesArrays = await Promise.all(notesPromises);
        const allNotes = notesArrays.flat();
        setClientNotes(allNotes || []);
      } catch (error) {
        console.error("Error loading client notes:", error);
        setClientNotes([]);
      }
    } else {
      setClientNotes([]);
    }
  }, [formData?.client_ids]);

  useEffect(() => {
    if (isOpen) {
      loadClientNotes();
    }
  }, [isOpen, loadClientNotes]);

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubtaskChange = (index, text) => {
    const newSubtasks = [...formData.subtasks];
    newSubtasks[index].text = text;
    handleFormChange('subtasks', newSubtasks);
  };

  const handleSubtaskToggle = (index) => {
    const newSubtasks = [...formData.subtasks];
    newSubtasks[index].completed = !newSubtasks[index].completed;
    handleFormChange('subtasks', newSubtasks);
  };

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      const subtask = { id: crypto.randomUUID(), text: newSubtask.trim(), completed: false };
      handleFormChange('subtasks', [...(formData.subtasks || []), subtask]);
      setNewSubtask("");
    }
  };

  const handleRemoveSubtask = (index) => {
    const newSubtasks = formData.subtasks.filter((_, i) => i !== index);
    handleFormChange('subtasks', newSubtasks);
  };

  const handleLinkChecklist = (checklistId) => {
    if (!checklistId) return;
    const checklistToAdd = checklists.find(c => c.id === checklistId);
    if (checklistToAdd && !formData.linked_checklists.some(lc => lc.checklist_id === checklistId)) {
        const newLinkedChecklist = { checklist_id: checklistToAdd.id, checklist_name: checklistToAdd.name };
        handleFormChange('linked_checklists', [...formData.linked_checklists, newLinkedChecklist]);
    }
  };

  const handleUnlinkChecklist = (checklistId) => {
      const updatedChecklists = formData.linked_checklists.filter(lc => lc.checklist_id !== checklistId);
      handleFormChange('linked_checklists', updatedChecklists);
  };
  
  const handlePreviewChecklist = (checklistId) => {
      const checklistToPreview = checklists.find(c => c.id === checklistId);
      if (checklistToPreview) {
          setPreviewingChecklist(checklistToPreview);
          setIsPreviewChecklistOpen(true);
      }
  };

  const handleDocumentLinked = (document) => {
    handleFormChange('linked_document_id', document.id);
    setIsDocLinkerOpen(false);
    onUpdate(); // Refresh the modal to show the linked doc
  };

  if (!isOpen || !formData) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formData.id ? "Edit Task" : "Create Task"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 p-1">
            {/* Task Name and Description */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="task-name">Task Name</Label>
                <Input id="task-name" value={formData.task_name || ""} onChange={(e) => handleFormChange('task_name', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="task-description">Description</Label>
                <Textarea id="task-description" value={formData.description || ""} onChange={(e) => handleFormChange('description', e.target.value)} />
              </div>
            </div>

            {/* Grid for Details */}
            <div className="grid grid-cols-2 gap-4">
              {/* Clients */}
              <div>
                <Label>Client(s)</Label>
                <TaskClientSearch
                  clients={clients}
                  selectedClientIds={formData.client_ids}
                  onSelectionChange={(ids) => handleFormChange('client_ids', ids)}
                />
              </div>

              {/* Assigned To */}
              <div>
                <Label htmlFor="assigned-to">Assigned To</Label>
                <Select value={formData.assigned_to || ""} onValueChange={(val) => handleFormChange('assigned_to', val)}>
                  <SelectTrigger id="assigned-to">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Unassigned</SelectItem>
                    {teamMembers.map(member => (
                      <SelectItem key={member.email} value={member.email}>{member.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div>
                <Label htmlFor="due-date">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {formData.due_date ? format(new Date(formData.due_date), 'PPP') : "Set due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent mode="single" selected={formData.due_date ? new Date(formData.due_date) : null} onSelect={(date) => handleFormChange('due_date', date)} />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Priority */}
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority || "medium"} onValueChange={(val) => handleFormChange('priority', val)}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Attachments */}
            <Card className="bg-slate-50 border-slate-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" /> Attachments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Linked Note */}
                <div>
                  <Label className="text-sm font-medium">Linked Note</Label>
                  {linkedNote ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="flex-1 justify-between p-2">
                        <span className="truncate">{linkedNote.subject}</span>
                        <div className="flex items-center gap-1 ml-2">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsNoteViewerOpen(true)}>
                                <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-red-100 hover:text-red-600" onClick={() => handleFormChange('linked_note_id', null)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                      </Badge>
                    </div>
                  ) : (
                    <Select onValueChange={(val) => handleFormChange('linked_note_id', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Link a client note..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clientNotes.map(note => (
                          <SelectItem key={note.id} value={note.id}>{note.subject}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Link Document */}
                <div>
                  <Label className="text-sm font-medium">Link Document</Label>
                  {linkedDocument ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="flex-1 justify-between p-2">
                          <span className="truncate">{linkedDocument.name}</span>
                           <div className="flex items-center gap-1 ml-2">
                              <a href={linkedDocument.file_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon" className="h-6 w-6"><ExternalLink className="w-4 h-4" /></Button>
                              </a>
                              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-red-100 hover:text-red-600" onClick={() => handleFormChange('linked_document_id', null)}>
                                <X className="w-4 h-4" />
                              </Button>
                          </div>
                        </Badge>
                      </div>
                  ) : (
                    <Button variant="outline" className="w-full" onClick={() => setIsDocLinkerOpen(true)}>
                      <File className="w-4 h-4 mr-2" /> Attach a Document
                    </Button>
                  )}
                </div>

                {/* Link Checklist */}
                <div>
                  <Label className="text-sm font-medium">Link Checklist</Label>
                  <div className="space-y-2 mt-1">
                    {formData.linked_checklists.map(lc => (
                      <div key={lc.checklist_id} className="flex items-center gap-2">
                        <Badge variant="secondary" className="flex-1 justify-between p-2">
                           <span className="truncate">{lc.checklist_name}</span>
                          <div className="flex items-center gap-1 ml-2">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handlePreviewChecklist(lc.checklist_id)}>
                                  <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-red-100 hover:text-red-600" onClick={() => handleUnlinkChecklist(lc.checklist_id)}>
                                  <X className="w-4 h-4" />
                              </Button>
                          </div>
                        </Badge>
                      </div>
                    ))}
                    <Select onValueChange={handleLinkChecklist}>
                      <SelectTrigger>
                        <SelectValue placeholder="Link a checklist template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {checklists.filter(c => !formData.linked_checklists.some(lc => lc.checklist_id === c.id)).map(checklist => (
                          <SelectItem key={checklist.id} value={checklist.id}>{checklist.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subtasks */}
            <Card className="bg-slate-50 border-slate-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" /> Subtasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(formData.subtasks || []).map((subtask, index) => (
                    <div key={subtask.id} className="flex items-center gap-2">
                      <Checkbox id={`subtask-${index}`} checked={subtask.completed} onCheckedChange={() => handleSubtaskToggle(index)} />
                      <Input value={subtask.text} onChange={(e) => handleSubtaskChange(index, e.target.value)} className={`flex-1 ${subtask.completed ? 'line-through text-slate-500' : ''}`} />
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveSubtask(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Input placeholder="Add new subtask..." value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()} />
                  <Button onClick={handleAddSubtask}>Add</Button>
                </div>
              </CardContent>
            </Card>

          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSave(formData)}>Save Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {isNoteViewerOpen && linkedNote && (
          <NoteViewerModal 
            isOpen={isNoteViewerOpen}
            onClose={() => setIsNoteViewerOpen(false)}
            note={linkedNote}
          />
      )}

      {isDocLinkerOpen && (
        <LinkDocumentModal
          client={clients.find(c => c.id === formData.client_ids[0])} // Use first client for now
          isOpen={isDocLinkerOpen}
          onClose={() => setIsDocLinkerOpen(false)}
          onLink={handleDocumentLinked}
        />
      )}

      {isPreviewChecklistOpen && previewingChecklist && (
          <ChecklistPreviewModal
            isOpen={isPreviewChecklistOpen}
            onClose={() => setIsPreviewChecklistOpen(false)}
            checklist={previewingChecklist}
          />
      )}
    </>
  );
}
