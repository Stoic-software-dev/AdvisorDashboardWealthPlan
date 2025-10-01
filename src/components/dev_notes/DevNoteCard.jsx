
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";

const categoryColors = {
  "Bug": "bg-red-100 text-red-800 border-red-200",
  "Fix": "bg-blue-100 text-blue-800 border-blue-200",
  "New Idea": "bg-green-100 text-green-800 border-green-200",
};

const statusColors = {
  "Open": "bg-slate-100 text-slate-800 border-slate-200",
  "In Progress": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Completed": "bg-purple-100 text-purple-800 border-purple-200",
  "Won't Fix": "bg-gray-100 text-gray-500 border-gray-200",
};

export default function DevNoteCard({ note, onEdit, onDelete }) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg leading-tight">{note.title}</CardTitle>
          <div className="flex gap-2 flex-shrink-0 ml-4">
            <Badge variant="outline" className={categoryColors[note.category]}>{note.category}</Badge>
            <Badge variant="outline" className={statusColors[note.status]}>{note.status}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-slate-600 whitespace-pre-wrap">{note.content}</p>
      </CardContent>
      <CardFooter className="flex justify-between items-center text-xs text-slate-500 pt-3 border-t">
        <div>
          <p>Created by: {note.created_by}</p>
          <p>On: {format(new Date(note.created_date), "MMM d, yyyy")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(note)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => onDelete(note.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
