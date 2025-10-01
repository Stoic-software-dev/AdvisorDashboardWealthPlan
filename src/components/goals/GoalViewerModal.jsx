import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function GoalViewerModal({ goal, clientName, isOpen, onClose }) {
  if (!goal) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900">{goal.goal_name}</DialogTitle>
          <DialogDescription>
            Goal Details for {clientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Description */}
          {goal.description && (
            <div>
              <h4 className="font-semibold text-slate-800 mb-3 border-b pb-2">Description</h4>
              <p className="text-slate-700 leading-relaxed">{goal.description}</p>
            </div>
          )}
          
          {/* Manual Recommendations */}
          {goal.recommendations && (
            <div>
              <h4 className="font-semibold text-slate-800 mb-3 border-b pb-2">Recommendations</h4>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{goal.recommendations}</p>
              </div>
            </div>
          )}

          {/* AI Recommendations */}
          {goal.ai_recommendations && (
            <div>
              <h4 className="font-semibold text-slate-800 mb-3 border-b pb-2">AI-Generated Recommendations</h4>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{goal.ai_recommendations}</p>
              </div>
            </div>
          )}

          {/* Show message if no description or recommendations */}
          {!goal.description && !goal.recommendations && !goal.ai_recommendations && (
            <div className="text-center py-8 text-slate-500">
              <p>No additional details or recommendations available for this goal.</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}