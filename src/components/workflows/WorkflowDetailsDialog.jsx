
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import WorkflowBoard from "./WorkflowBoard";

export default function WorkflowDetailsDialog({ instance, workflow, client, allClients, onClose, onUpdate }) {
  const getAvailableClients = () => {
    // If we don't have the list of all clients, we can't do anything.
    if (!allClients || allClients.length === 0) {
      return [];
    }

    // Always return all clients to allow for flexible selection within the modal.
    return allClients;
  };

  const availableClientsForBoard = getAvailableClients();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[96vw] h-[95vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              {instance.instance_name}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-sm text-slate-600">
            {workflow?.name}
            {/* Only display the client name if one is associated with the workflow instance */}
            {client ? ` • ${client.first_name} ${client.last_name}` : ''}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4">
          <WorkflowBoard
            workflowInstance={instance}
            workflow={workflow}
            clients={availableClientsForBoard}
            onUpdate={onUpdate}
            focusedClient={client}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
