import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Copy, Calendar, FileText, X } from "lucide-react";
import { format } from "date-fns";

export default function NoteViewerModal({ isOpen, onClose, note, onEdit, onDelete, onCopy }) {
  if (!note) return null;

  const isRecent = () => {
    const noteDate = new Date(note.created_date);
    const now = new Date();
    const diffInHours = (now - noteDate) / (1000 * 60 * 60);
    return diffInHours <= 24;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-slate-500" />
                <DialogTitle className="text-xl font-semibold text-slate-900">
                  {note.subject}
                </DialogTitle>
                {isRecent() && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                    New
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Calendar className="w-4 h-4" />
                {format(new Date(note.created_date), 'MMMM d, yyyy • h:mm a')}
                <span className="mx-2">•</span>
                <span>Created by {note.created_by}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onCopy(note)} title="Copy Note">
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onEdit(note)}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onDelete(note)} 
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-6">
          <div className="prose prose-slate max-w-none">
            <div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-base">
              {note.body}
            </div>
          </div>
        </div>
        
        <div className="border-t pt-4 flex justify-between items-center text-xs text-slate-400">
          <span>Last updated: {format(new Date(note.updated_date), 'MMM d, yyyy • h:mm a')}</span>
          <span>Note ID: {note.id}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}