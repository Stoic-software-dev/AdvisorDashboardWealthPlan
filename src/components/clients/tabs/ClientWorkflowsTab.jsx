import React, { useState, useEffect } from 'react';
import { Workflow, WorkflowInstance } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Plus, Eye, Loader2, User } from "lucide-react";
import WorkflowDetailsDialog from '../../workflows/WorkflowDetailsDialog';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

const statusColors = {
  not_started: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800"
};

export default function ClientWorkflowsTab({ client, allClients, householdMembers }) {
  const [instances, setInstances] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingInstance, setViewingInstance] = useState(null);

  useEffect(() => {
    if (householdMembers) {
      loadData();
    }
  }, [client, householdMembers]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const householdMemberIds = householdMembers.map(m => m.id);
      if (householdMemberIds.length === 0) {
        householdMemberIds.push(client.id); // Fallback if household members not loaded yet
      }

      const [instanceData, workflowData] = await Promise.all([
        WorkflowInstance.filter({ client_id: householdMemberIds }, "-created_date"),
        Workflow.list()
      ]);
      setInstances(instanceData || []);
      setWorkflows(workflowData || []);
    } catch (error) {
      console.error("Error loading workflow data:", error);
    }
    setIsLoading(false);
  };

  const getWorkflowName = (workflowId) => {
    const workflow = workflows.find(w => w.id === workflowId);
    return workflow ? workflow.name : "Unknown Workflow";
  };

  const getClientName = (clientId) => {
    const clientData = allClients.find(c => c.id === clientId);
    return clientData ? `${clientData.first_name} ${clientData.last_name}` : "Unknown Client";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <>
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-blue-600" />
            Household Workflows for {client.first_name}
          </CardTitle>
          <Link to={createPageUrl("Workflows")}>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Start New Workflow
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {instances.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <GitBranch className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No active workflows for this household.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {instances.map(instance => (
                <Card key={instance.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{instance.instance_name}</p>
                      <p className="text-sm text-slate-500">{getWorkflowName(instance.workflow_id)}</p>
                       <p className="text-xs text-slate-600 flex items-center gap-1 mt-2 mb-2">
                          <User className="w-3 h-3" />
                          For: {getClientName(instance.client_id)}
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                         <Badge variant="secondary" className={`${statusColors[instance.status] || ''}`}>
                          {(instance.status || '').replace(/_/g, ' ')}
                        </Badge>
                        {instance.started_date && (
                          <span>Started: {format(new Date(instance.started_date), 'MMM d, yyyy')}</span>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => setViewingInstance(instance)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Board
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {viewingInstance && (
        <WorkflowDetailsDialog
          instance={viewingInstance}
          workflow={workflows.find(w => w.id === viewingInstance.workflow_id)}
          client={allClients.find(c => c.id === viewingInstance.client_id)}
          allClients={allClients}
          onClose={() => setViewingInstance(null)}
          onUpdate={loadData}
        />
      )}
    </>
  );
}