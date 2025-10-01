
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
};

const parseNumberInput = (value) => {
  if (typeof value !== 'string') return value || '';
  const parsed = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? '' : parsed;
};

const defaultAssetData = {
  name: '',
  category: 'Capital Non-Registered',
  owner_client_id: '',
  current_value: 0,
  growth_rate: 3.0,
  is_registered: false,
};

const defaultLiabilityData = {
  name: '',
  owner_client_id: '',
  current_balance: 300000,
  interest_rate: 4.0,
  payment: 1500, // Monthly payment
  amortization: 25, // Years
};

export default function NetWorthModal({ isOpen, onClose, onSave, clients = [], initialData = null, modalType = 'asset' }) {
  const [localData, setLocalData] = useState(modalType === 'asset' ? defaultAssetData : defaultLiabilityData);

  useEffect(() => {
    if (isOpen) { // Only run when modal is open
      if (initialData) {
        // Map old initial_value/balance to new current_value/balance if initialData is from an older structure
        const mappedInitialData = { ...initialData };
        if (initialData.initial_value !== undefined && modalType === 'asset') {
          mappedInitialData.current_value = initialData.initial_value;
          delete mappedInitialData.initial_value;
        }
        if (initialData.initial_balance !== undefined && modalType === 'liability') {
          mappedInitialData.current_balance = initialData.initial_balance;
          delete mappedInitialData.initial_balance;
        }
        // Map old assigned_client_id to new owner_client_id
        if (initialData.assigned_client_id !== undefined) {
            mappedInitialData.owner_client_id = initialData.assigned_client_id === 'joint' && clients.length > 0
                ? clients[0].id // If 'joint' was set, default to first client for simplified model
                : initialData.assigned_client_id;
            delete mappedInitialData.assigned_client_id;
        }

        setLocalData({
            ... (modalType === 'asset' ? defaultAssetData : defaultLiabilityData), // Ensure all default fields are present
            ...mappedInitialData
        });
      } else {
        const defaultData = modalType === 'asset' ? defaultAssetData : defaultLiabilityData;
        const defaultClient = clients.length > 0 ? clients[0].id : '';
        setLocalData({ ...defaultData, owner_client_id: defaultClient });
      }
    }
  }, [initialData, clients, isOpen, modalType]);

  const handleLocalDataChange = (field, value) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveClick = () => {
    onSave(localData);
    onClose();
  };

  const renderAssetForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="owner-client-id">Assigned To</Label>
        <Select
          value={localData.owner_client_id}
          onValueChange={(value) => handleLocalDataChange('owner_client_id', value)}
        >
          <SelectTrigger id="owner-client-id">
            <SelectValue placeholder="Select a client..." />
          </SelectTrigger>
          <SelectContent>
            {clients.map(client => (
              <SelectItem key={client.id} value={client.id}>
                {client.first_name} {client.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="asset-name">Asset Name</Label>
        <Input
          id="asset-name"
          value={localData.name}
          onChange={(e) => handleLocalDataChange('name', e.target.value)}
          placeholder="e.g., Main St. Home, BMO Mutual Fund"
        />
      </div>
      <div>
        <Label htmlFor="asset-category">Asset Category</Label>
        <Select value={localData.category} onValueChange={(value) => handleLocalDataChange('category', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select asset category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Capital Registered">Capital Registered</SelectItem>
            <SelectItem value="Capital Non-Registered">Capital Non-Registered</SelectItem>
            <SelectItem value="TFSA">TFSA</SelectItem>
            <SelectItem value="Principal Residence">Principal Residence</SelectItem>
            <SelectItem value="Investment Real Estate">Investment Real Estate</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-4 pt-2">
        <Switch
          id="is_registered"
          checked={localData.is_registered || false}
          onCheckedChange={(checked) => handleLocalDataChange('is_registered', checked)}
        />
        <Label htmlFor="is_registered" className="cursor-pointer">Registered Asset (for Tax Calculation)</Label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="asset-current-value">Current Value ($)</Label>
          <Input
            id="asset-current-value"
            type="text"
            value={formatCurrency(localData.current_value)}
            onChange={(e) => handleLocalDataChange('current_value', parseNumberInput(e.target.value))}
            placeholder="$100,000"
          />
        </div>
        <div>
          <Label htmlFor="asset-growth-rate">Annual Growth Rate (%)</Label>
          <Input
            id="asset-growth-rate"
            type="text"
            value={localData.growth_rate}
            onChange={(e) => handleLocalDataChange('growth_rate', parseNumberInput(e.target.value))}
            placeholder="3.0"
          />
        </div>
      </div>
    </div>
  );

  const renderLiabilityForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="owner-client-id">Assigned To</Label>
        <Select
          value={localData.owner_client_id}
          onValueChange={(value) => handleLocalDataChange('owner_client_id', value)}
        >
          <SelectTrigger id="owner-client-id">
            <SelectValue placeholder="Select a client..." />
          </SelectTrigger>
          <SelectContent>
            {clients.map(client => (
              <SelectItem key={client.id} value={client.id}>
                {client.first_name} {client.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="liability-name">Liability Name</Label>
        <Input
          id="liability-name"
          value={localData.name}
          onChange={(e) => handleLocalDataChange('name', e.target.value)}
          placeholder="e.g., Mortgage"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="liability-current-balance">Current Balance ($)</Label>
          <Input
            id="liability-current-balance"
            type="text"
            value={formatCurrency(localData.current_balance)}
            onChange={(e) => handleLocalDataChange('current_balance', parseNumberInput(e.target.value))}
            placeholder="$300,000"
          />
        </div>
        <div>
          <Label htmlFor="liability-interest-rate">Interest Rate (%)</Label>
          <Input
            id="liability-interest-rate"
            type="text"
            step="0.1"
            value={localData.interest_rate}
            onChange={(e) => handleLocalDataChange('interest_rate', parseNumberInput(e.target.value))}
            placeholder="4.0"
          />
        </div>
        <div>
          <Label htmlFor="liability-payment">Monthly Payment ($)</Label>
          <Input
            id="liability-payment"
            type="text"
            value={formatCurrency(localData.payment)}
            onChange={(e) => handleLocalDataChange('payment', parseNumberInput(e.target.value))}
            placeholder="$1,500"
          />
        </div>
        <div>
          <Label htmlFor="liability-amortization">Amortization (Years)</Label>
          <Input
            id="liability-amortization"
            type="text"
            value={localData.amortization}
            onChange={(e) => handleLocalDataChange('amortization', parseNumberInput(e.target.value))}
            placeholder="25"
          />
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit' : 'Add'} {modalType === 'asset' ? 'Asset' : 'Liability'}</DialogTitle>
          <DialogDescription>
            {modalType === 'asset' ? 'Enter the details for the asset.' : 'Enter the details for the liability.'}
          </DialogDescription>
        </DialogHeader>
        {modalType === 'asset' ? renderAssetForm() : renderLiabilityForm()}
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSaveClick}>Save {modalType === 'asset' ? 'Asset' : 'Liability'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
