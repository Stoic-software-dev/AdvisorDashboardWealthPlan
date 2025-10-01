
import React from 'react';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal, 
  CheckCircle2, 
  Trash2, 
  MessageCircle, 
  Calendar,
  User
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";

const priorityColors = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200"
};

export default function TaskCard({ 
  task, 
  clientName, 
  clientNames = [], // Add support for multiple client names
  assigneeName, 
  onEdit, 
  onMarkComplete, 
  onComment,
  onDelete,
  commentCount = 0 
}) {
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  // Handle both single client name (legacy) and multiple client names
  const displayClientNames = clientNames.length > 0 ? clientNames : (clientName ? [clientName] : []);
  const validClientNames = displayClientNames.filter(name => name && name !== "N/A" && name.trim() !== "");

  return (
    <Card className="bg-white hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-2" onClick={onEdit}>
            <h4 className="font-medium text-sm text-slate-900 line-clamp-2 leading-tight">
              {task.task_name}
            </h4>
            {task.description && (
              <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-600 flex-shrink-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onMarkComplete} className="cursor-pointer">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark as Complete
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onDelete} 
                className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]} capitalize`}>
              {task.priority}
            </Badge>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onComment}
            className="h-6 px-2 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <MessageCircle className="w-3 h-3" />
            {commentCount > 0 && <span>{commentCount}</span>}
          </Button>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {validClientNames.length > 0 && (
              <div className="flex items-center gap-1 min-w-0">
                <User className="w-3 h-3 text-blue-500 flex-shrink-0" />
                <div className="flex flex-wrap gap-1 min-w-0">
                  {validClientNames.length === 1 ? (
                    <span className="text-blue-600 font-medium truncate max-w-[120px]" title={validClientNames[0]}>
                      {validClientNames[0]}
                    </span>
                  ) : validClientNames.length === 2 ? (
                    <>
                      <span className="text-blue-600 font-medium truncate max-w-[60px]" title={validClientNames[0]}>
                        {validClientNames[0]}
                      </span>
                      <span className="text-slate-400">&</span>
                      <span className="text-blue-600 font-medium truncate max-w-[60px]" title={validClientNames[1]}>
                        {validClientNames[1]}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-blue-600 font-medium truncate max-w-[60px]" title={validClientNames[0]}>
                        {validClientNames[0]}
                      </span>
                      <span className="text-slate-400">+ {validClientNames.length - 1} more</span>
                    </>
                  )}
                </div>
              </div>
            )}
            {assigneeName && (
              <span className="flex items-center gap-1" title={assigneeName}>
                <User className="w-3 h-3 text-green-500" />
                <span className="truncate max-w-[80px] text-green-600">{assigneeName}</span>
              </span>
            )}
          </div>
          
          {task.due_date && (
            <span className={`flex items-center gap-1 flex-shrink-0 ${
              isOverdue ? "text-red-500 font-medium" : 
              isDueToday ? "text-orange-500 font-medium" : ""
            }`}>
              <Calendar className="w-3 h-3" />
              {format(new Date(task.due_date), "MMM d")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
