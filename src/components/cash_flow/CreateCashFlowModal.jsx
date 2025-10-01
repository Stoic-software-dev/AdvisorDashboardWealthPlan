
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Save, X, Landmark } from "lucide-react";

export default function CreateCashFlowModal({ clients, onClose, onSubmit, preselectedClientIds = [] }) {
  const [formData, setFormData] = useState({
    name: "",
    statement_date: new Date().toISOString().split('T')[0],
    notes: ""
  });
  const [selectedClientIds, setSelectedClientIds] = useState(preselectedClientIds);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find household members
  const currentClient = clients.find(c => c.id === preselectedClientIds[0]);
  let householdMembers = [];

  if (currentClient && Array.isArray(clients)) {
    const primaryId = currentClient.primary_client_id || currentClient.id;

    // Find all clients who are either the primary or have that primary ID set.
    const members = clients.filter(c => c.id === primaryId || c.primary_client_id === primaryId);
    
    // Use a Map to get unique members, which is more robust than a Set.
    const uniqueMembers = Array.from(new Map(members.map(item => [item.id, item])).values());
    
    // Find the primary client within the unique members list
    const primaryClient = uniqueMembers.find(c => c.id === primaryId);
    
    // Sort to ensure the primary client is first, then the rest.
    if (primaryClient) {
        householdMembers = [
            primaryClient,
            ...uniqueMembers.filter(c => c.id !== primaryId)
        ];
    } else {
        // Fallback if primary client not found for some reason
        householdMembers = uniqueMembers;
    }
  }

  const handleClientToggle = (clientId, checked) => {
    if (checked) {
      setSelectedClientIds(prev => [...prev, clientId]);
    } else {
      setSelectedClientIds(prev => prev.filter(id => id !== clientId));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Updated validation based on the outline, adapted to existing state structure
    // The outline suggested `!formData.client_ids.length` but client_ids are in `selectedClientIds` state.
    // Preserving async/await and isSubmitting logic as per requirements.
    if (!formData.name.trim() || !formData.statement_date || selectedClientIds.length === 0) {
      alert('Please fill in all required fields and select at least one client.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        client_ids: selectedClientIds // Ensures `client_ids` are sent as an array
      });
    } catch (error) {
      console.error("Error creating cash flow statement:", error);
      alert("Error creating statement. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-blue-600" />
            Create Cash Flow Statement
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name" className="text-base font-semibold">Statement Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., 2024 Annual Cash Flow"
              required
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="statement_date" className="text-base font-semibold">Statement Date</Label>
            <Input
              id="statement_date"
              type="date"
              value={formData.statement_date}
              onChange={(e) => setFormData(prev => ({ ...prev, statement_date: e.target.value }))}
              className="mt-2"
            />
          </div>

          {/* Share Statement Section */}
          {householdMembers.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="text-base font-semibold mb-2">Share Statement</h3>
              <p className="text-sm text-slate-600 mb-4">Select household members to share this statement with.</p>
              
              <div className="space-y-3">
                {householdMembers.map((client) => {
                  const isCurrentClient = client.id === preselectedClientIds[0];
                  const isSelected = selectedClientIds.includes(client.id);
                  
                  return (
                    <div key={client.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`client-${client.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => handleClientToggle(client.id, checked)}
                        disabled={isCurrentClient} // Keep current client always selected
                      />
                      <Label 
                        htmlFor={`client-${client.id}`} 
                        className="text-sm font-medium flex-1 cursor-pointer"
                      >
                        {client.first_name} {client.last_name}
                        {isCurrentClient && <span className="text-slate-500 ml-2">(This Client)</span>}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="notes" className="text-base font-semibold">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="General notes about this cash flow statement..."
              rows={4}
              className="mt-2"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-slate-900 hover:bg-slate-800">
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Creating...' : 'Create Statement'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
