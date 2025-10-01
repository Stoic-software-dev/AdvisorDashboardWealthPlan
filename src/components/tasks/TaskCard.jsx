
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, User, MoreVertical, Edit, Trash2, UserCheck } from "lucide-react";
import { format, isPast } from "date-fns";

const priorityColors = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200"
};

const categoryColors = {
  follow_up: "bg-blue-100 text-blue-800",
  documentation: "bg-indigo-100 text-indigo-800",
  research: "bg-purple-100 text-purple-800",
  planning: "bg-pink-100 text-pink-800",
  compliance: "bg-gray-200 text-gray-800",
  other: "bg-slate-100 text-slate-800"
};

// Function to format dates in Eastern Time
const formatTaskDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    // Use toLocaleDateString with specific locale and timezone
    return date.toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    // Fallback to original date-fns format if toLocaleDateString fails
    return format(new Date(dateString), "MMM d");
  }
};

export default function TaskCard({ task, clientName, assigneeName, onEdit, onDelete, isDragging, onSelect, isSelected }) {
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== "completed";

  return (
    <Card className={`hover:shadow-xl transition-shadow ${isDragging ? "shadow-2xl rotate-3" : "shadow-md"} ${isSelected ? 'border-green-500 bg-green-50/50' : 'bg-white/90'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              className="mt-1"
              aria-label={`Select task ${task.title}`}
            />
            <p className="font-semibold text-slate-900 flex-1 truncate">{task.title}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {task.description && <p className="text-sm text-slate-600 mb-3">{task.description}</p>}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`${priorityColors[task.priority]} capitalize`}>{task.priority}</Badge>
            {task.category && <Badge variant="secondary" className={`${categoryColors[task.category]} capitalize`}>{task.category.replace('_', ' ')}</Badge>}
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            {task.client_id && clientName !== "undefined undefined" && (
              <span className="flex items-center gap-1" title={clientName}>
                <User className="w-3 h-3" />
                <span className="truncate max-w-[100px]">{clientName}</span>
              </span>
            )}
            <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500 font-semibold" : ""}`}>
              <Calendar className="w-3 h-3" />
              {formatTaskDate(task.due_date)}
            </span>
          </div>
        </div>

        {/* Show Assignee if present */}
        {assigneeName && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1 text-xs text-slate-600">
              <UserCheck className="w-3 h-3 text-green-600" />
              Assigned to: <span className="font-medium text-green-700">{assigneeName}</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
