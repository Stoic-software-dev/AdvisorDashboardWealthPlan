
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Save, Loader2, X, Copy } from "lucide-react";
import { InvokeLLM } from "@/api/integrations";
import ClientCombobox from '../shared/ClientCombobox'; // Adjusted path for shared component

export default function NoteForm({ isOpen, onClose, client, note, onSave, onCopy, allClients }) {
  const [formData, setFormData] = useState({ subject: "", body: "" });
  const [selectedClientId, setSelectedClientId] = useState(null); // Removed TypeScript type annotation
  const [isSaving, setIsSaving] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (note) {
      setFormData({ subject: note.subject, body: note.body });
      setSelectedClientId(note.client_id); // Initialize with note's client_id if editing
    } else {
      setFormData({ subject: "", body: "" });
      setSelectedClientId(client?.id || null); // Initialize with client prop's ID if creating for a specific client
    }
    setError("");
  }, [note, isOpen, client]);

  // Derived state to find the selected client object from allClients array for display and AI prompt
  const displayClient = selectedClientId ? allClients?.find(c => c.id === selectedClientId) : null;

  const handlePolishWithAI = async () => {
    if (!formData.body.trim()) {
      setError("Please enter some content before using AI polish.");
      return;
    }
    if (!displayClient) {
      setError("Please select a client before using AI polish.");
      return;
    }

    setIsPolishing(true);
    setError("");

    try {
      const response = await InvokeLLM({
        prompt: `Please polish and expand the following client note into a professional, well-structured format suitable for a financial advisor's client record. Keep the core information but improve clarity, grammar, and professional tone. The note is for client ${displayClient.first_name} ${displayClient.last_name}.

Original note: "${formData.body}"

Please return a polished version that maintains the key information while making it more professional and comprehensive.`,
        response_json_schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string" }
          }
        }
      });

      setFormData({
        subject: response.subject || formData.subject,
        body: response.body || formData.body
      });
    } catch (error) {
      console.error("Error polishing note:", error);
      setError("Failed to polish note with AI. Please try again.");
    } finally {
      setIsPolishing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.body.trim() || !selectedClientId) {
      setError("Subject, body, and client selection are required.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await onSave({
        ...formData,
        client_id: selectedClientId // Use the selected client ID
      });
      onClose();
    } catch (error) {
      console.error("Error saving note:", error);
      setError("Failed to save note. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyNote = () => {
    if (!formData.subject.trim() || !formData.body.trim()) {
      setError("Please fill in both subject and body before copying.");
      return;
    }

    const noteToCreate = {
      subject: formData.subject,
      body: formData.body
    };

    onCopy(noteToCreate);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {note ? "Edit Note" : "Add Note"} for {displayClient ? `${displayClient.first_name} ${displayClient.last_name}` : "a Client"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="client-select">Client *</Label>
            <ClientCombobox
              clients={allClients || []} // Pass allClients to the combobox
              value={selectedClientId}
              onChange={setSelectedClientId}
              placeholder="Select a client"
              showNoneOption={false}
            />
          </div>

          <div>
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Meeting summary, phone call, etc."
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="body">Note Content *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePolishWithAI}
                disabled={isPolishing || !formData.body.trim() || !selectedClientId}
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                {isPolishing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                AI Polish
              </Button>
            </div>
            <Textarea
              id="body"
              value={formData.body}
              onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
              placeholder="Enter your notes here. You can write briefly and use AI Polish to expand and professionalize the content."
              rows={8}
              required
            />
            <p className="text-sm text-slate-500 mt-1">
              Tip: Write a quick summary and click "AI Polish" to automatically expand and improve your notes.
            </p>
          </div>

          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            {allClients && allClients.length > 1 && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCopyNote}
                disabled={!formData.subject.trim() || !formData.body.trim()}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Note
              </Button>
            )}
            <Button type="submit" disabled={isSaving || !selectedClientId}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {note ? "Update Note" : "Save Note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
