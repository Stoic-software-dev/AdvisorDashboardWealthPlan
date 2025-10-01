import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Copy, X, Users } from "lucide-react";

export default function CopyNoteDialog({ isOpen, onClose, note, allClients, currentClient, onConfirm }) {
  const [selectedClientId, setSelectedClientId] = useState("");

  const handleCopy = () => {
    if (selectedClientId) {
      onConfirm(selectedClientId);
      setSelectedClientId("");
    }
  };

  const handleClose = () => {
    setSelectedClientId("");
    onClose();
  };

  // Filter out the current client from the list
  const availableClients = allClients.filter(client => client.id !== currentClient.id);

  // Find spouse/partner in household
  const spouseClient = allClients.find(client => 
    (client.primary_client_id === currentClient.id && 
     (client.relationship_to_primary === 'Spouse' || client.relationship_to_primary === 'Partner')) ||
    (currentClient.primary_client_id === client.id) ||
    (currentClient.primary_client_id && client.primary_client_id === currentClient.primary_client_id && 
     client.id !== currentClient.id && 
     (client.relationship_to_primary === 'Spouse' || client.relationship_to_primary === 'Partner'))
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-blue-600" />
            Copy Note
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-slate-900 mb-2">Note to Copy:</h4>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="font-medium text-sm">{note?.subject}</p>
              <p className="text-xs text-slate-600 mt-1 line-clamp-2">{note?.body}</p>
            </div>
          </div>

          {spouseClient && (
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Quick Copy to Spouse:</Label>
              <Button
                variant="outline"
                onClick={() => setSelectedClientId(spouseClient.id)}
                className="w-full justify-start"
              >
                <Users className="w-4 h-4 mr-2" />
                {spouseClient.first_name} {spouseClient.last_name}
                <span className="text-xs text-slate-500 ml-2">({spouseClient.relationship_to_primary || 'Primary'})</span>
              </Button>
            </div>
          )}

          <div>
            <Label htmlFor="client-select" className="text-sm font-medium text-slate-700 mb-2 block">
              Or select any client:
            </Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a client to copy the note to..." />
              </SelectTrigger>
              <SelectContent>
                {availableClients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.first_name} {client.last_name}
                    {client.email && (
                      <span className="text-xs text-slate-500 ml-2">({client.email})</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleCopy} disabled={!selectedClientId} className="bg-blue-600 hover:bg-blue-700">
            <Copy className="w-4 h-4 mr-2" />
            Copy Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}