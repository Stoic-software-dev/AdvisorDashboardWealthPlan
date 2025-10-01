import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Clock, 
  User, 
  Calendar,
  CheckCircle,
  Eye,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { WorkflowInstance } from "@/api/entities";

const statusColors = {
  not_started: "bg-gray-100 text-gray-800 border-gray-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  on_hold: "bg-yellow-100 text-yellow-800 border-yellow-200",
  cancelled: "bg-red-100 text-red-800 border-red-200"
};

export default function ActiveWorkflows({ instances, workflows, clients, onView, onReload, showCompleted = false }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const getWorkflowName = (workflowId) => {
    const workflow = workflows.find(w => w.id === workflowId);
    return workflow?.name || 'Unknown Workflow';
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : 'Unknown Client';
  };

  const handleDeleteClick = (instance) => {
    setWorkflowToDelete(instance);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!workflowToDelete) return;

    setIsDeleting(true);
    try {
      await WorkflowInstance.delete(workflowToDelete.id);
      setShowDeleteDialog(false);
      setWorkflowToDelete(null);
      onReload(); // Reload the data after deletion
    } catch (error) {
      console.error("Error deleting workflow instance:", error);
      alert("Error deleting workflow. Please try again.");
    }
    setIsDeleting(false);
  };

  return (
    <>
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            {showCompleted ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                Completed Workflows
              </>
            ) : (
              <>
                <Clock className="w-5 h-5 text-blue-600" />
                Active Workflows
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {instances.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>{showCompleted ? 'No completed workflows' : 'No active workflows'}</p>
            </div>
          ) : (
            <div className="space-y-0">
              {instances.map((instance) => {
                return (
                  <div key={instance.id} className="p-6 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-900">{instance.instance_name}</h3>
                          <Badge 
                            variant="outline" 
                            className={statusColors[instance.status]}
                          >
                            {instance.status?.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">
                          {getWorkflowName(instance.workflow_id)} • {getClientName(instance.client_id)}
                        </p>
                        
                        {!showCompleted && instance.progress_percentage > 0 && (
                          <div className="mb-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-600">Progress</span>
                              <span className="text-slate-500">{instance.progress_percentage.toFixed(0)}%</span>
                            </div>
                            <Progress value={instance.progress_percentage} className="h-2" />
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {instance.assigned_to || 'Unassigned'}
                          </span>
                          {instance.target_completion_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Due {format(new Date(instance.target_completion_date), "MMM d")}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onView(instance)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Board
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(instance)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Workflow Instance
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to permanently delete <strong>{workflowToDelete?.instance_name}</strong>?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">
                  <strong>Warning:</strong> This action cannot be undone. All associated tasks, comments, and progress will be permanently lost.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}