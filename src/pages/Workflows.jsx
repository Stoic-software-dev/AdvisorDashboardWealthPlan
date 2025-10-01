
import React, { useState, useEffect } from "react";
import { Workflow, WorkflowInstance, Client, WorkflowTask, User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import WorkflowTemplates from "../components/workflows/WorkflowTemplates";
import WorkflowBuilder from "../components/workflows/WorkflowBuilder";
import WorkflowDetailsDialog from "../components/workflows/WorkflowDetailsDialog";

export default function Workflows() {
  const [workflows, setWorkflows] = useState([]);
  const [workflowInstances, setWorkflowInstances] = useState([]);
  const [clients, setClients] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for viewing a specific workflow instance
  const [viewingInstance, setViewingInstance] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      const isUserAdmin = currentUser.role === 'admin';
      const dataFilter = isUserAdmin ? {} : { created_by: currentUser.email };

      // Use Promise.allSettled to handle individual failures gracefully
      const [workflowData, instanceData, clientData, taskData] = await Promise.allSettled([
        Workflow.list("-sort_order", undefined, { sort_order: { $exists: true } }).then(sortedWorkflows => {
          // If no workflows have sort_order, fall back to creation date sorting
          if (sortedWorkflows.length === 0) {
            return Workflow.list("-created_date");
          }
          return sortedWorkflows;
        }).catch(err => {
          console.warn("Failed to load workflows:", err);
          return [];
        }),
        WorkflowInstance.filter(dataFilter, "-created_date").catch(err => {
          console.warn("Failed to load workflow instances:", err);
          return [];
        }),
        Client.filter(dataFilter).catch(err => {
          console.warn("Failed to load clients:", err);
          return [];
        }),
        WorkflowTask.filter(dataFilter).catch(err => {
          console.warn("Failed to load workflow tasks:", err);
          return [];
        })
      ]);

      let workflows = workflowData.status === 'fulfilled' ? workflowData.value : [];
      
      // Assign sort_order to workflows that don't have it
      const workflowsNeedingSortOrder = workflows.filter(w => w.sort_order === undefined || w.sort_order === null);
      if (workflowsNeedingSortOrder.length > 0) {
        // Calculate max sort_order from existing workflows that have one
        const maxSortOrder = workflows.reduce((max, w) => 
          (w.sort_order !== undefined && w.sort_order !== null && w.sort_order > max) ? w.sort_order : max, 0
        );
        
        const updatePromises = workflowsNeedingSortOrder.map((workflow, index) => 
          Workflow.update(workflow.id, { sort_order: maxSortOrder + index + 1 })
        );
        await Promise.allSettled(updatePromises);
        
        // Reload workflows to get updated sort_order values
        // Important: reload all workflows to ensure consistency after updates
        workflows = await Workflow.list("-sort_order").then(sorted => {
          // Fallback if sorting by sort_order doesn't yield results (e.g., all were new)
          if (sorted.length === 0 && workflowsNeedingSortOrder.length > 0) {
              return Workflow.list("-created_date"); // Re-fetch by created_date if no sort_order data yet
          }
          return sorted;
        }).catch(() => []);
      }
      
      // Sort workflows by sort_order, then by created_date as fallback
      workflows.sort((a, b) => {
        const aHasSortOrder = a.sort_order !== undefined && a.sort_order !== null;
        const bHasSortOrder = b.sort_order !== undefined && b.sort_order !== null;

        if (aHasSortOrder && bHasSortOrder) {
          return a.sort_order - b.sort_order;
        }
        if (aHasSortOrder && !bHasSortOrder) return -1; // a comes before b
        if (!aHasSortOrder && bHasSortOrder) return 1;  // b comes before a
        
        // Fallback to created_date if neither has sort_order or both don't
        return new Date(b.created_date) - new Date(a.created_date);
      });

      setWorkflows(workflows);
      setWorkflowInstances(instanceData.status === 'fulfilled' ? instanceData.value : []);
      setClients(clientData.status === 'fulfilled' ? clientData.value : []);
      setAllTasks(taskData.status === 'fulfilled' ? taskData.value : []);
    } catch (error) {
      console.error("Error loading workflow data:", error);
      // Ensure we have empty arrays instead of undefined
      setWorkflows([]);
      setWorkflowInstances([]);
      setClients([]);
      setAllTasks([]);
    }
    setIsLoading(false);
  };

  const handleCreateWorkflow = () => {
    setEditingWorkflow(null);
    setShowBuilder(true);
  };

  const handleEditWorkflow = (workflow) => {
    setEditingWorkflow(workflow);
    setShowBuilder(true);
  };
  
  const handleViewInstance = (instance) => {
    setViewingInstance(instance);
  };

  const handleOpenWorkflow = (workflow) => {
    // Create a temporary workflow instance to open the Kanban board
    const tempInstance = {
      id: 'template_' + workflow.id,
      workflow_id: workflow.id,
      instance_name: workflow.name,
      status: 'template',
      client_id: null // No specific client for template view
    };
    setViewingInstance(tempInstance);
  };

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-green-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Workflows</h1>
            <p className="text-slate-600">Create, manage, and track standardized processes</p>
          </div>
          <Button 
            onClick={handleCreateWorkflow}
            className="shadow-lg"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-accent-foreground)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'var(--color-accent-gradient-to)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'var(--color-accent)';
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Workflow
          </Button>
        </div>

        <WorkflowTemplates 
          workflows={workflows}
          clients={clients}
          onEdit={handleEditWorkflow}
          onReload={loadData}
          onOpenWorkflow={handleOpenWorkflow}
        />

        {showBuilder && (
          <WorkflowBuilder
            workflow={editingWorkflow}
            onSave={loadData}
            onClose={() => {
              setShowBuilder(false);
              setEditingWorkflow(null);
            }}
          />
        )}

        {viewingInstance && (
          <WorkflowDetailsDialog
            instance={viewingInstance}
            workflow={workflows.find(w => w.id === viewingInstance.workflow_id)}
            client={clients.find(c => c.id === viewingInstance.client_id)}
            allClients={clients}
            onClose={() => setViewingInstance(null)}
            onUpdate={loadData}
          />
        )}
      </div>
    </div>
  );
}
