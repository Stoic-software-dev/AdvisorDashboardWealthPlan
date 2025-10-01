import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Calendar, FileText, Copy } from "lucide-react";
import { format } from "date-fns";

export default function NoteCard({ note, onEdit, onDelete, onCopy, onView }) {
  const isRecent = () => {
    const noteDate = new Date(note.created_date);
    const now = new Date();
    const diffInHours = (now - noteDate) / (1000 * 60 * 60);
    return diffInHours <= 24;
  };

  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1" onClick={() => onView(note)}>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-900 line-clamp-1">{note.subject}</h3>
              {isRecent() && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                  New
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="w-3 h-3" />
              {format(new Date(note.created_date), 'MMM d, yyyy • h:mm a')}
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onCopy(note); }} title="Copy Note">
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(note); }}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(note); }} className="text-red-600 hover:text-red-700">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0" onClick={() => onView(note)}>
        <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">
          {note.body}
        </p>
      </CardContent>
    </Card>
  );
}