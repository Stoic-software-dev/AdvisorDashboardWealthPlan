
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Workflow, WorkflowStep } from "@/api/entities";
import { 
  X, 
  Save, 
  Plus, 
  Trash2, 
  GripVertical,
  ArrowUp,
  ArrowDown
} from "lucide-react";

export default function WorkflowBuilder({ workflow, onSave, onClose }) {
  const [workflowData, setWorkflowData] = useState({
    name: workflow?.name || "",
    description: workflow?.description || "",
    category: workflow?.category || "custom",
    estimated_duration: workflow?.estimated_duration || "",
    is_template: workflow?.is_template !== false,
    status: workflow?.status || "active"
  });

  const [steps, setSteps] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (workflow?.id) {
      loadWorkflowSteps();
    }
  }, [workflow]);

  const loadWorkflowSteps = async () => {
    if (!workflow?.id) return;
    try {
      const workflowSteps = await WorkflowStep.filter({ workflow_id: workflow.id }, "step_order");
      setSteps(workflowSteps);
    } catch (error) {
      console.error("Error loading workflow steps:", error);
    }
  };

  const handleWorkflowChange = (field, value) => {
    setWorkflowData(prev => ({ ...prev, [field]: value }));
  };

  const addStep = () => {
    const newStep = {
      step_name: "",
      description: "",
      step_order: steps.length + 1,
      estimated_duration: 1,
      is_required: true,
      auto_create_tasks: false,
      isNew: true
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (index, field, value) => {
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, [field]: value } : step
    ));
  };

  const removeStep = (index) => {
    setSteps(prev => {
      const newSteps = prev.filter((_, i) => i !== index);
      // Reorder remaining steps
      return newSteps.map((step, i) => ({ ...step, step_order: i + 1 }));
    });
  };

  const moveStep = (index, direction) => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    
    // Update step orders
    newSteps.forEach((step, i) => {
      step.step_order = i + 1;
    });
    
    setSteps(newSteps);
  };

  const handleSave = async () => {
    if (!workflowData.name.trim()) {
      alert("Please enter a workflow name");
      return;
    }

    setIsLoading(true);
    try {
      let workflowId;
      
      const duration = parseInt(workflowData.estimated_duration);
      const processedWorkflowData = {
        ...workflowData,
        estimated_duration: isNaN(duration) ? null : duration,
      };
      
      if (workflow?.id) {
        // Update existing workflow
        await Workflow.update(workflow.id, processedWorkflowData);
        workflowId = workflow.id;
      } else {
        // Create new workflow
        const newWorkflow = await Workflow.create(processedWorkflowData);
        workflowId = newWorkflow.id;
      }

      // Save steps
      for (const step of steps) {
        const stepDuration = parseInt(step.estimated_duration);
        const stepData = {
          workflow_id: workflowId,
          step_name: step.step_name,
          description: step.description,
          step_order: step.step_order,
          estimated_duration: isNaN(stepDuration) ? null : stepDuration,
          is_required: step.is_required,
          auto_create_tasks: step.auto_create_tasks
        };

        if (step.id && !step.isNew) {
          await WorkflowStep.update(step.id, stepData);
        } else if (step.step_name.trim()) {
          await WorkflowStep.create(stepData);
        }
      }

      onSave();
      onClose();
    } catch (error) {
      console.error("Error saving workflow:", error);
      alert("Error saving workflow. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              {workflow ? "Edit Workflow" : "Create New Workflow"}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Workflow Details */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Workflow Name *</Label>
                  <Input
                    id="name"
                    value={workflowData.name}
                    onChange={(e) => handleWorkflowChange("name", e.target.value)}
                    placeholder="Enter workflow name"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={workflowData.category} onValueChange={(value) => handleWorkflowChange("category", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client_onboarding">Client Onboarding</SelectItem>
                      <SelectItem value="financial_planning">Financial Planning</SelectItem>
                      <SelectItem value="portfolio_review">Portfolio Review</SelectItem>
                      <SelectItem value="compliance">Compliance</SelectItem>
                      <SelectItem value="annual_review">Annual Review</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={workflowData.description}
                  onChange={(e) => handleWorkflowChange("description", e.target.value)}
                  placeholder="Describe what this workflow accomplishes"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimated_duration">Estimated Duration (days)</Label>
                  <Input
                    id="estimated_duration"
                    type="number"
                    value={workflowData.estimated_duration}
                    onChange={(e) => handleWorkflowChange("estimated_duration", e.target.value)}
                    placeholder="10"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={workflowData.status} onValueChange={(value) => handleWorkflowChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workflow Steps */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Workflow Steps ({steps.length})</CardTitle>
                <Button onClick={addStep} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Step
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {steps.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>No steps added yet. Click "Add Step" to get started.</p>
                </div>
              ) : (
                steps.map((step, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <GripVertical className="w-4 h-4 text-slate-400" />
                      <Badge variant="outline">Step {step.step_order}</Badge>
                      <div className="flex gap-1 ml-auto">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveStep(index, 'up')}
                          disabled={index === 0}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveStep(index, 'down')}
                          disabled={index === steps.length - 1}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeStep(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label>Step Name *</Label>
                        <Input
                          value={step.step_name}
                          onChange={(e) => updateStep(index, "step_name", e.target.value)}
                          placeholder="Enter step name"
                        />
                      </div>

                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={step.description}
                          onChange={(e) => updateStep(index, "description", e.target.value)}
                          placeholder="Describe what this step involves"
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label>Duration (days)</Label>
                          <Input
                            type="number"
                            value={step.estimated_duration}
                            onChange={(e) => updateStep(index, "estimated_duration", e.target.value)}
                            placeholder="1"
                          />
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                          <input
                            type="checkbox"
                            id={`required-${index}`}
                            checked={step.is_required}
                            onChange={(e) => updateStep(index, "is_required", e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor={`required-${index}`} className="text-sm">Required</Label>
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                          <input
                            type="checkbox"
                            id={`auto-tasks-${index}`}
                            checked={step.auto_create_tasks}
                            onChange={(e) => updateStep(index, "auto_create_tasks", e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor={`auto-tasks-${index}`} className="text-sm">Auto-create tasks</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Saving..." : "Save Workflow"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
