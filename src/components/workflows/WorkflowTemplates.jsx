import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GitBranch,
  Edit,
  Clock,
  FileText,
  Trash2,
  ExternalLink,
  GripVertical
} from "lucide-react";
import { Workflow } from "@/api/entities";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const categoryColors = {
  client_onboarding: "bg-blue-100 text-blue-800 border-blue-200",
  financial_planning: "bg-green-100 text-green-800 border-green-200",
  portfolio_review: "bg-purple-100 text-purple-800 border-purple-200",
  compliance: "bg-red-100 text-red-800 border-red-200",
  annual_review: "bg-orange-100 text-orange-800 border-orange-200",
  custom: "bg-gray-100 text-gray-800 border-gray-200"
};

export default function WorkflowTemplates({ workflows, clients, onEdit, onReload, onOpenWorkflow }) {
  const [isReordering, setIsReordering] = useState(false);

  const handleDeleteWorkflow = async (workflow) => {
    if (window.confirm(`Are you sure you want to delete the workflow "${workflow.name}"? This action cannot be undone.`)) {
      try {
        await Workflow.delete(workflow.id);
        onReload();
      } catch (error) {
        console.error("Error deleting workflow:", error);
        alert("Error deleting workflow. Please try again.");
      }
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination } = result;
    if (source.index === destination.index) return;

    setIsReordering(true);
    
    try {
      // Create a new array with reordered items
      const reorderedWorkflows = Array.from(workflows);
      const [removed] = reorderedWorkflows.splice(source.index, 1);
      reorderedWorkflows.splice(destination.index, 0, removed);

      // Update sort_order for all affected workflows
      const updatePromises = reorderedWorkflows.map((workflow, index) => {
        const newSortOrder = index + 1;
        if (workflow.sort_order !== newSortOrder) {
          return Workflow.update(workflow.id, { sort_order: newSortOrder });
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);
      
      // Reload the data to reflect the new order
      onReload();
    } catch (error) {
      console.error("Error reordering workflows:", error);
      alert("Error reordering workflows. Please try again.");
    } finally {
      setIsReordering(false);
    }
  };

  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-blue-600" />
          Workflow Templates
          {isReordering && (
            <Badge variant="secondary" className="ml-2">
              Reordering...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {workflows.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <GitBranch className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No workflow templates found</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="workflow-templates">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`p-6 space-y-4 ${snapshot.isDraggingOver ? 'bg-slate-50' : ''}`}
                >
                  {workflows.map((workflow, index) => (
                    <Draggable key={workflow.id} draggableId={workflow.id} index={index}>
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`border border-slate-200 transition-all ${
                            snapshot.isDragging 
                              ? 'shadow-2xl rotate-2 bg-white' 
                              : 'hover:shadow-md cursor-pointer'
                          }`}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-start gap-3 flex-1">
                                <div 
                                  {...provided.dragHandleProps}
                                  className="mt-1 p-1 rounded hover:bg-slate-100 cursor-grab active:cursor-grabbing"
                                >
                                  <GripVertical className="w-4 h-4 text-slate-400" />
                                </div>
                                <div className="flex-1" onClick={() => onOpenWorkflow(workflow)}>
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-semibold text-slate-900 transition-colors flex items-center gap-2">
                                      {workflow.name}
                                      <ExternalLink className="w-4 h-4" />
                                    </h3>
                                    <Badge
                                      variant="outline"
                                      className={categoryColors[workflow.category]}
                                    >
                                      {workflow.category?.replace(/_/g, ' ')}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-slate-600 mb-3">{workflow.description}</p>
                                  <div className="flex items-center gap-4 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {workflow.estimated_duration || 'N/A'} days
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <FileText className="w-3 h-3" />
                                      {workflow.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2 ml-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); onEdit(workflow); }}
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteWorkflow(workflow); }}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </CardContent>
    </Card>
  );
}