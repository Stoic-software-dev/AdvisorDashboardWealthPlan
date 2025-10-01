
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Copy, Trash2, ClipboardList, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function ChecklistCard({ checklist, onEdit, onDuplicate, onDelete, onPreview, categoryColors }) {
  const completionRate = checklist.items.length > 0 ? 
    (checklist.items.filter(item => !item.is_required).length / checklist.items.length) * 100 : 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex-1 mr-2">
          <CardTitle 
            className="text-lg font-semibold text-slate-900 mb-2 cursor-pointer hover:underline"
            onClick={onPreview}
          >
            {checklist.name}
          </CardTitle>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge className={`${categoryColors[checklist.category]} capitalize text-xs`}>
              {checklist.category.replace('_', ' ')}
            </Badge>
            {checklist.is_template && (
              <Badge variant="outline" className="text-xs">
                Template
              </Badge>
            )}
          </div>
          {checklist.description && (
            <p className="text-sm text-slate-600 line-clamp-2 mb-2">
              {checklist.description}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} className="text-slate-500 hover:text-slate-700">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDuplicate} className="text-slate-500 hover:text-slate-700">
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-red-500 hover:text-red-700">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <ClipboardList className="w-4 h-4" />
              <span>{checklist.items.length} items</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              <span>Used {checklist.usage_count || 0} times</span>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            {format(new Date(checklist.created_date), "MMM d, yyyy")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
