import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, X, Users } from "lucide-react";
import { format } from "date-fns";
import ClientCombobox from '../shared/ClientCombobox';
import { Badge } from "@/components/ui/badge";

export default function CreateStatementModal({ isOpen, onClose, onSubmit, clients, preselectedClientId, isEditing = false, statement = null }) {
  const [formData, setFormData] = useState({
    name: '',
    statement_date: format(new Date(), 'yyyy-MM-dd'),
    client_ids: preselectedClientId ? [preselectedClientId] : [],
    notes: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (isEditing && statement) {
        // Populate form with existing statement data
        setFormData({
          name: statement.name || '',
          statement_date: statement.statement_date || format(new Date(), 'yyyy-MM-dd'),
          client_ids: statement.client_ids || [],
          notes: statement.notes || ''
        });
      } else {
        // Reset form for new statement
        setFormData({
          name: '',
          statement_date: format(new Date(), 'yyyy-MM-dd'),
          client_ids: preselectedClientId ? [preselectedClientId] : [],
          notes: ''
        });
      }
      setError('');
    }
  }, [isOpen, isEditing, statement, preselectedClientId]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleAddClient = (clientId) => {
    if (clientId && !formData.client_ids.includes(clientId)) {
      handleChange('client_ids', [...formData.client_ids, clientId]);
    }
  };

  const handleRemoveClient = (clientIdToRemove) => {
    if (formData.client_ids.length > 1) { // Ensure at least one client remains
      handleChange('client_ids', formData.client_ids.filter(id => id !== clientIdToRemove));
    }
  };

  const getClientName = (clientId) => {
    const client = clients?.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : 'Unknown Client';
  };

  const getAvailableClients = () => {
    return clients?.filter(client => !formData.client_ids.includes(client.id)) || [];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Statement name is required');
      return;
    }
    
    if (!formData.statement_date) {
      setError('Statement date is required');
      return;
    }
    
    if (!formData.client_ids.length) {
      setError('At least one client must be selected');
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      console.error('Error submitting statement:', err);
      setError('An error occurred while saving the statement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {isEditing ? 'Edit Net Worth Statement' : 'Create New Net Worth Statement'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Statement Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Joint Net Worth - December 2024"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="statement_date">Statement Date *</Label>
              <Input
                id="statement_date"
                type="date"
                value={formData.statement_date}
                onChange={(e) => handleChange('statement_date', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Client Selection Section */}
          <div>
            <Label className="text-base font-semibold">Associated Clients *</Label>
            <p className="text-sm text-slate-600 mb-3">
              Select all clients who should have access to this Net Worth Statement. 
              For joint statements, include both spouses/partners.
            </p>
            
            {/* Selected Clients Display */}
            {formData.client_ids.length > 0 && (
              <div className="mb-4">
                <Label className="text-sm font-medium mb-2 block">Selected Clients:</Label>
                <div className="flex flex-wrap gap-2">
                  {formData.client_ids.map(clientId => (
                    <Badge key={clientId} variant="default" className="text-sm py-1 px-3">
                      {getClientName(clientId)}
                      {formData.client_ids.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveClient(clientId)}
                          className="ml-2 rounded-full hover:bg-black/20 p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Add Additional Client */}
            {getAvailableClients().length > 0 && (
              <div>
                <Label htmlFor="add-client" className="text-sm font-medium mb-2 block">
                  Add Additional Client:
                </Label>
                <ClientCombobox
                  clients={getAvailableClients()}
                  value={null}
                  onChange={handleAddClient}
                  placeholder="Select a client to add..."
                  showNoneOption={false}
                />
              </div>
            )}
            
            {getAvailableClients().length === 0 && formData.client_ids.length > 0 && (
              <p className="text-sm text-slate-500 italic">
                All available clients have been selected.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Add any notes about this statement..."
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Saving...' : (isEditing ? 'Update Statement' : 'Create Statement')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}