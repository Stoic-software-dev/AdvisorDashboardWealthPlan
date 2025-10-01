import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ChecklistInstance, User } from "@/api/entities";
import { CheckCircle, Archive, User as UserIcon, Calendar, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export default function ChecklistInstanceCard({ instance, checklist, client, onUpdate, showArchiveOption = false }) {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!checklist || !client) return null;

  const completedItems = instance.items.filter(item => item.completed).length;
  const totalItems = instance.items.length;
  const completionPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  const requiredItems = instance.items.filter(item => item.is_required);
  const completedRequiredItems = requiredItems.filter(item => item.completed);
  const canComplete = requiredItems.length === completedRequiredItems.length;

  const handleToggleItem = async (itemId) => {
    setIsUpdating(true);
    try {
      const user = await User.me();
      const updatedItems = instance.items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            completed: !item.completed,
            completed_by: !item.completed ? user.email : null,
            completed_date: !item.completed ? new Date().toISOString() : null
          };
        }
        return item;
      });

      await ChecklistInstance.update(instance.id, { items: updatedItems });
      onUpdate();
    } catch (error) {
      console.error("Error updating checklist item:", error);
      alert("Failed to update item. Please try again.");
    }
    setIsUpdating(false);
  };

  const handleCompleteChecklist = async () => {
    if (!canComplete) {
      alert("Please complete all required items before marking this checklist as complete.");
      return;
    }

    setIsUpdating(true);
    try {
      await ChecklistInstance.update(instance.id, {
        status: 'completed',
        completed_date: new Date().toISOString()
      });
      onUpdate();
    } catch (error) {
      console.error("Error completing checklist:", error);
      alert("Failed to complete checklist. Please try again.");
    }
    setIsUpdating(false);
  };

  const handleArchiveChecklist = async () => {
    setIsUpdating(true);
    try {
      await ChecklistInstance.update(instance.id, {
        status: 'archived',
        archived_date: new Date().toISOString()
      });
      onUpdate();
    } catch (error) {
      console.error("Error archiving checklist:", error);
      alert("Failed to archive checklist. Please try again.");
    }
    setIsUpdating(false);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-slate-900 mb-2">
              {instance.instance_name}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
              <div className="flex items-center gap-1">
                <UserIcon className="w-4 h-4" />
                <span>{client.first_name} {client.last_name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(instance.created_date), "MMM d, yyyy")}</span>
              </div>
              {instance.assigned_to && (
                <div className="flex items-center gap-1">
                  <UserIcon className="w-4 h-4" />
                  <span>{instance.assigned_to}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Progress value={completionPercentage} className="flex-1 h-2" />
              <span className="text-sm font-medium text-slate-700">
                {completedItems}/{totalItems}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {instance.status === 'in_progress' && (
              <Button
                onClick={handleCompleteChecklist}
                disabled={!canComplete || isUpdating}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete
              </Button>
            )}
            {showArchiveOption && instance.status === 'completed' && (
              <Button
                onClick={handleArchiveChecklist}
                disabled={isUpdating}
                variant="outline"
                size="sm"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {instance.items.map((item) => (
            <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50">
              <Checkbox
                checked={item.completed}
                onCheckedChange={() => handleToggleItem(item.id)}
                disabled={isUpdating}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${item.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                  {item.text}
                  {item.is_required && !item.completed && (
                    <AlertTriangle className="w-3 h-3 inline ml-1 text-orange-500" />
                  )}
                </p>
                {item.description && (
                  <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                )}
                {item.completed && item.completed_by && (
                  <p className="text-xs text-slate-500 mt-1">
                    Completed by {item.completed_by} on {format(new Date(item.completed_date), "MMM d, yyyy")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}