import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Note } from '@/api/entities';
import { format } from "date-fns";
import { Loader2, CheckCircle } from 'lucide-react';

export default function CopyNoteDialog({ isOpen, onClose, clients, noteText, originalClientName }) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveCopy = async () => {
    if (!selectedClientId || !noteText) {
      alert("Please select a client to copy the note to.");
      return;
    }
    setIsSaving(true);
    setSaveSuccess(false);

    // Create a generic subject for the copied note
    const subject = `Note Copied from ${originalClientName} - ${format(new Date(), 'yyyy-MM-dd')}`;
    
    try {
      await Note.create({
        client_id: selectedClientId,
        subject: subject,
        body: noteText
      });
      setSaveSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500); // Close dialog after 1.5 seconds on success
    } catch(error) {
      console.error("Error copying note:", error);
      alert("Failed to copy note. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Reset state before closing
    setSelectedClientId('');
    setSaveSuccess(false);
    setIsSaving(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy Note to Another Client</DialogTitle>
          <DialogDescription>
            Select a client to create a copy of the generated note in their record.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <Label htmlFor="client-select" className="mb-2 block">
              Destination Client
            </Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId} disabled={isSaving}>
              <SelectTrigger id="client-select">
                <SelectValue placeholder="Select a client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="p-3 bg-slate-50 rounded-md border text-sm text-slate-700 max-h-40 overflow-y-auto">
            <p className="font-semibold mb-1">Note Preview:</p>
            <p className="line-clamp-5">{noteText}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSaveCopy} disabled={!selectedClientId || isSaving || saveSuccess}>
            {isSaving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Copying...</>
            ) : saveSuccess ? (
              <><CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Copied!</>
            ) : (
              "Save Copy"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}