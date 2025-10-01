import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ChecklistInstance, Checklist, User } from "@/api/entities";
import { ClipboardList, CheckCircle, User as UserIcon } from "lucide-react";
import { format } from "date-fns";

export default function ChecklistInstancePreviewModal({ task, checklistInstances, isOpen, onClose, onUpdate }) {
  const [instances, setInstances] = useState([]);
  const [checklists, setChecklists] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && checklistInstances) {
      loadChecklistData();
    }
  }, [isOpen, checklistInstances]);

  const loadChecklistData = async () => {
    setIsLoading(true);
    try {
      setInstances(checklistInstances);
      
      // Load checklist templates for names and descriptions
      const checklistIds = [...new Set(checklistInstances.map(ci => ci.checklist_id))];
      const checklistData = {};
      
      for (const id of checklistIds) {
        try {
          const checklist = await Checklist.get(id);
          checklistData[id] = checklist;
        } catch (error) {
          console.error(`Error loading checklist ${id}:`, error);
        }
      }
      
      setChecklists(checklistData);
    } catch (error) {
      console.error("Error loading checklist data:", error);
    }
    setIsLoading(false);
  };

  const handleToggleItem = async (instanceId, itemId) => {
    try {
      const user = await User.me();
      const instance = instances.find(i => i.id === instanceId);
      if (!instance) return;

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

      await ChecklistInstance.update(instanceId, { items: updatedItems });
      
      // Update local state
      setInstances(prev => prev.map(i => 
        i.id === instanceId ? { ...i, items: updatedItems } : i
      ));
      
      onUpdate();
    } catch (error) {
      console.error("Error updating checklist item:", error);
      alert("Failed to update item. Please try again.");
    }
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Checklists for: {task.task_name}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p>Loading checklists...</p>
            </div>
          </div>
        ) : instances.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No checklists are linked to this task.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {instances.map((instance) => {
              const checklist = checklists[instance.checklist_id];
              const completedItems = instance.items.filter(item => item.completed).length;
              const totalItems = instance.items.length;
              const completionPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

              return (
                <div key={instance.id} className="border rounded-lg p-4 bg-slate-50/50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">
                        {instance.instance_name}
                      </h3>
                      {checklist?.description && (
                        <p className="text-sm text-slate-600 mb-2">{checklist.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>Created {format(new Date(instance.created_date), "MMM d, yyyy")}</span>
                        {instance.assigned_to && (
                          <span className="flex items-center gap-1">
                            <UserIcon className="w-3 h-3" />
                            {instance.assigned_to}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant={instance.status === 'completed' ? 'default' : 'secondary'}>
                      {instance.status === 'completed' ? 'Completed' : 'In Progress'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <Progress value={completionPercentage} className="flex-1 h-2" />
                    <span className="text-sm font-medium text-slate-700">
                      {completedItems}/{totalItems}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {instance.items.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 p-2 hover:bg-white rounded-md transition-colors">
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={() => handleToggleItem(instance.id, item.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className={`font-medium ${item.completed ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                            {item.text}
                          </p>
                          {item.description && (
                            <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                          )}
                          {item.completed && item.completed_by && (
                            <p className="text-xs text-slate-400 mt-1">
                              Completed by {item.completed_by} on {format(new Date(item.completed_date), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                        <Badge variant={item.is_required ? "default" : "secondary"} className="text-xs">
                          {item.is_required ? "Required" : "Optional"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}