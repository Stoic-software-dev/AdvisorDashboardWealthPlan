
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ChecklistInstance, User } from "@/api/entities";
import { CheckCircle, Clock, User as UserIcon, X } from "lucide-react";
import { format } from "date-fns";

export default function ChecklistViewerModal({ task, client, isOpen, onClose, onUpdate }) {
  const [checklistInstances, setChecklistInstances] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState(new Set());

  useEffect(() => {
    if (isOpen && task) {
      loadChecklistInstances();
    }
  }, [isOpen, task]);

  const loadChecklistInstances = async () => {
    setIsLoading(true);
    try {
      console.log('Loading checklist instances for task:', task.id);
      const instances = await ChecklistInstance.filter({ 
        workflow_task_id: task.id 
      });
      console.log('Found checklist instances:', instances);
      setChecklistInstances(instances || []);
    } catch (error) {
      console.error("Error loading checklist instances:", error);
      setChecklistInstances([]);
    }
    setIsLoading(false);
  };

  const handleToggleItem = async (instanceId, itemId) => {
    const updateKey = `${instanceId}-${itemId}`;
    setUpdatingItems(prev => new Set([...prev, updateKey]));
    
    try {
      const user = await User.me();
      const instance = checklistInstances.find(i => i.id === instanceId);
      
      if (instance) {
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

        await ChecklistInstance.update(instanceId, { 
          items: updatedItems,
          status: updatedItems.every(item => !item.is_required || item.completed) ? 'completed' : 'in_progress'
        });
        
        await loadChecklistInstances();
        onUpdate?.();
      }
    } catch (error) {
      console.error("Error updating checklist item:", error);
      alert("Failed to update item. Please try again.");
    }
    
    setUpdatingItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(updateKey);
      return newSet;
    });
  };

  const calculateProgress = (items) => {
    if (!items || items.length === 0) return 0;
    const completed = items.filter(item => item.completed).length;
    return (completed / items.length) * 100;
  };

  const getCompletionStats = (items) => {
    if (!items || items.length === 0) return { completed: 0, total: 0 };
    return {
      completed: items.filter(item => item.completed).length,
      total: items.length
    };
  };

  if (!task || !client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              Checklists for: {task.task_name}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-sm text-slate-600">
            Client: {client.first_name} {client.last_name}
          </div>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading checklists...</span>
            </div>
          ) : checklistInstances.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No checklists are linked to this task.</p>
              <p className="text-sm mt-1">Edit the task to add checklists.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {checklistInstances.map((instance) => {
                const progress = calculateProgress(instance.items);
                const stats = getCompletionStats(instance.items);
                
                return (
                  <div key={instance.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {instance.instance_name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                          <span>Created: {format(new Date(instance.created_date), "MMM d, yyyy")}</span>
                          {instance.assigned_to && (
                            <span className="flex items-center gap-1">
                              <UserIcon className="w-3 h-3" />
                              {instance.assigned_to}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant="outline" 
                          className={
                            instance.status === 'completed' 
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-blue-100 text-blue-800 border-blue-200'
                          }
                        >
                          {instance.status === 'completed' ? 'Completed' : 'In Progress'}
                        </Badge>
                        <div className="flex items-center gap-2 mt-2">
                          <Progress value={progress} className="w-24 h-2" />
                          <span className="text-sm font-medium text-slate-700">
                            {stats.completed}/{stats.total}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {instance.items.map((item) => {
                        const updateKey = `${instance.id}-${item.id}`;
                        const isUpdating = updatingItems.has(updateKey);
                        
                        return (
                          <div 
                            key={item.id} 
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                              item.completed 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <Checkbox
                              checked={item.completed}
                              onCheckedChange={() => handleToggleItem(instance.id, item.id)}
                              disabled={isUpdating}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <p className={`font-medium ${
                                item.completed 
                                  ? 'line-through text-slate-500' 
                                  : 'text-slate-800'
                              }`}>
                                {item.text}
                              </p>
                              {item.description && (
                                <p className="text-sm text-slate-600 mt-1">
                                  {item.description}
                                </p>
                              )}
                              {item.completed && item.completed_by && (
                                <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Completed by {item.completed_by} on {format(new Date(item.completed_date), "MMM d, yyyy 'at' h:mm a")}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {item.is_required && (
                                <Badge variant="outline" size="sm">
                                  Required
                                </Badge>
                              )}
                              {isUpdating && (
                                <Clock className="w-4 h-4 text-blue-500 animate-spin" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
