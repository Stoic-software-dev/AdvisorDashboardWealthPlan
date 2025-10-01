import React, { useState, useEffect } from 'react';
import { NoteTemplate } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Loader2, X } from "lucide-react";

export default function TemplateManager({ isOpen, onClose, onTemplateUpdate }) {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null); // Can be a new or existing template

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const userTemplates = await NoteTemplate.list();
      setTemplates(userTemplates);
    } catch (error) {
      console.error("Error loading note templates:", error);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!editingTemplate || !editingTemplate.name || !editingTemplate.prompt) {
      alert("Template Name and Prompt are required.");
      return;
    }
    setIsLoading(true);
    try {
      if (editingTemplate.id) {
        await NoteTemplate.update(editingTemplate.id, { name: editingTemplate.name, prompt: editingTemplate.prompt });
      } else {
        await NoteTemplate.create({ name: editingTemplate.name, prompt: editingTemplate.prompt });
      }
      setEditingTemplate(null);
      await loadTemplates();
      onTemplateUpdate(); // Notify parent to reload templates
    } catch (error) {
      console.error("Error saving template:", error);
    }
    setIsLoading(false);
  };

  const handleDelete = async (templateId) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    setIsLoading(true);
    try {
      await NoteTemplate.delete(templateId);
      await loadTemplates();
      onTemplateUpdate();
    } catch (error) {
      console.error("Error deleting template:", error);
    }
    setIsLoading(false);
  };

  const startNewTemplate = () => {
    setEditingTemplate({ name: '', prompt: '' });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Note Template Manager</DialogTitle>
          <DialogDescription>Create and manage reusable AI prompts for different types of notes.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden">
          {/* Left: List of Templates */}
          <div className="flex flex-col gap-4 overflow-y-auto pr-2">
            <Button onClick={startNewTemplate} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Create New Template
            </Button>
            {isLoading && <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>}
            {!isLoading && templates.map(template => (
              <Card key={template.id} className="flex flex-col">
                <CardHeader className="flex-grow">
                  <CardTitle className="text-md">{template.name}</CardTitle>
                  <CardDescription className="line-clamp-2 text-xs">{template.prompt}</CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-end gap-2 p-2">
                  <Button variant="ghost" size="icon" onClick={() => setEditingTemplate(template)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(template.id)}><Trash2 className="w-4 h-4" /></Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Right: Editor */}
          <div className="bg-slate-50 rounded-lg p-4 flex flex-col">
            {editingTemplate ? (
              <div className="flex flex-col h-full gap-4">
                <h3 className="text-lg font-semibold">{editingTemplate.id ? "Edit Template" : "Create New Template"}</h3>
                <div>
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    placeholder="e.g., Annual Review, KYC Update"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  />
                </div>
                <div className="flex-1 flex flex-col">
                  <Label htmlFor="template-prompt">Template Prompt</Label>
                  <Textarea
                    id="template-prompt"
                    placeholder="e.g., Summarize the financial review including..."
                    value={editingTemplate.prompt}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, prompt: e.target.value })}
                    className="flex-1"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Save Template
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <p>Select a template to edit or create a new one.</p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}