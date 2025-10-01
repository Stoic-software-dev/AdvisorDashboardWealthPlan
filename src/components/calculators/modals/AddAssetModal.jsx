
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Trash2 } from "lucide-react";

// Generate unique ID without uuid package
const generateId = () => `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const emptyPeriod = { id: generateId(), start_age: '', end_age: '', return_rate: '', amount: '', type: 'contribution', indexation: '', timing: 'end_of_year' };
const emptyLumpSum = { id: generateId(), age: '', amount: '' };

export default function AddAssetModal({ isOpen, onClose, onSave, client1, client2, netWorthAssets, existingAsset }) {
  const [asset, setAsset] = useState(() => {
    const baseAsset = existingAsset || {};
    return {
      id: baseAsset.id || generateId(),
      name: baseAsset.name || '',
      initial_value: baseAsset.initial_value || 0,
      return_rate: baseAsset.return_rate || 0, // New field: asset-level return rate
      is_registered: baseAsset.is_registered || false,
      assigned_to: baseAsset.assigned_to || 'joint',
      periods: (baseAsset.periods && baseAsset.periods.length > 0) ? baseAsset.periods : [{ ...emptyPeriod, id: generateId() }],
      lump_sum_contributions: baseAsset.lump_sum_contributions || [],
      lump_sum_withdrawals: baseAsset.lump_sum_withdrawals || [],
    };
  });

  const handleInputChange = (field, value) => {
    setAsset(prev => ({ ...prev, [field]: value }));
  };

  const handlePeriodChange = (id, field, value) => {
    setAsset(prev => ({
      ...prev,
      periods: prev.periods.map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const addPeriod = () => {
    setAsset(prev => ({ ...prev, periods: [...prev.periods, { ...emptyPeriod, id: generateId() }] }));
  };

  const removePeriod = (id) => {
    setAsset(prev => ({ ...prev, periods: prev.periods.filter(p => p.id !== id) }));
  };
  
  const handleLumpSumChange = (type, id, field, value) => {
    setAsset(prev => ({
      ...prev,
      [type]: prev[type].map(ls => ls.id === id ? { ...ls, [field]: value } : ls)
    }));
  };

  const addLumpSum = (type) => {
    setAsset(prev => ({ ...prev, [type]: [...prev[type], { ...emptyLumpSum, id: generateId() }] }));
  };

  const removeLumpSum = (type, id) => {
    setAsset(prev => ({ ...prev, [type]: prev[type].filter(ls => ls.id !== id) }));
  };
  
  const handleNetWorthSelect = (assetId) => {
    // If assetId is null, it means "Manual Entry" was selected, so clear relevant fields.
    if (assetId === 'null') { // Use string 'null' as SelectItem value is string
      setAsset(prev => ({
        ...prev,
        name: '',
        initial_value: 0, // Ensure it's a number
        assigned_to: 'joint',
        category: '', // Clear category if it exists
      }));
      return;
    }

    const selected = netWorthAssets.find(a => a.id === assetId);
    if (selected) {
      setAsset(prev => ({
        ...prev,
        name: selected.asset_name,
        initial_value: selected.asset_value, // Assuming asset_value from netWorthAssets is numerical
        assigned_to: selected.owner_client_id === client1?.id ? 'client1' : (selected.owner_client_id === client2?.id ? 'client2' : 'joint'),
        category: selected.asset_category
      }));
    }
  };

  const handleSave = () => {
    onSave(asset);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{existingAsset ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
          <p className="text-sm text-slate-500">Define all client assets and liabilities for the projection.</p>
        </DialogHeader>
        <Tabs defaultValue="assets">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="liabilities" disabled>Liabilities</TabsTrigger>
          </TabsList>
          <TabsContent value="assets" className="mt-4">
            <div className="space-y-6 p-1 max-h-[60vh] overflow-y-auto">
              <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Asset Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="asset-name">Asset Name</Label>
                    <Input
                      id="asset-name"
                      value={asset.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Investment Portfolio"
                    />
                  </div>
                  <div>
                    <Label htmlFor="assigned-to">Assigned To</Label>
                    <Select value={asset.assigned_to} onValueChange={(value) => handleInputChange('assigned_to', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client or joint" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="joint">Joint</SelectItem>
                        {client1 && (
                          <SelectItem value="client1">{client1.first_name} {client1.last_name}</SelectItem>
                        )}
                        {client2 && (
                          <SelectItem value="client2">{client2.first_name} {client2.last_name}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="initial-value">Initial Value ($)</Label>
                    <Input
                      id="initial-value"
                      type="number"
                      value={asset.initial_value}
                      onChange={(e) => handleInputChange('initial_value', parseFloat(e.target.value) || 0)}
                      placeholder="100000"
                    />
                  </div>
                   <div>
                    <Label htmlFor="return-rate">Return Rate (%)</Label>
                    <Input
                      id="return-rate"
                      type="number"
                      value={asset.return_rate}
                      onChange={(e) => handleInputChange('return_rate', parseFloat(e.target.value) || 0)}
                      placeholder="5.0"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 mb-4">
                  <Switch
                    id="registered-asset"
                    checked={asset.is_registered}
                    onCheckedChange={(checked) => handleInputChange('is_registered', checked)}
                  />
                  <Label htmlFor="registered-asset">Registered Asset?</Label>
                </div>

                {netWorthAssets && netWorthAssets.length > 0 && (
                  <div className="mb-4">
                    <Label>Or choose an asset...</Label>
                    <Select onValueChange={handleNetWorthSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select from Net Worth Statement" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Manual Entry</SelectItem>
                        {netWorthAssets.map(asset => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.asset_name} - ${asset.asset_value?.toLocaleString()} ({asset.asset_category})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Periods</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-7 gap-2 text-xs font-medium text-slate-600">
                    <div>Start Age</div>
                    <div>End Age</div>
                    <div>Return Rate (%)</div>
                    <div>Amount ($)</div>
                    <div>Type</div>
                    <div>Indexation (%)</div>
                    <div>Timing</div>
                  </div>
                  {asset.periods.map((period) => (
                    <div key={period.id} className="grid grid-cols-7 gap-2 items-center">
                      <Input
                        type="number"
                        value={period.start_age}
                        onChange={(e) => handlePeriodChange(period.id, 'start_age', parseInt(e.target.value) || '')}
                        placeholder="65"
                      />
                      <Input
                        type="number"
                        value={period.end_age}
                        onChange={(e) => handlePeriodChange(period.id, 'end_age', parseInt(e.target.value) || '')}
                        placeholder="95"
                      />
                      <Input
                        type="number"
                        step="0.1"
                        value={period.return_rate}
                        onChange={(e) => handlePeriodChange(period.id, 'return_rate', parseFloat(e.target.value) || '')}
                        placeholder="7"
                      />
                      <Input
                        type="number"
                        value={period.amount}
                        onChange={(e) => handlePeriodChange(period.id, 'amount', parseFloat(e.target.value) || '')}
                        placeholder="0"
                      />
                      <Select value={period.type} onValueChange={(value) => handlePeriodChange(period.id, 'type', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contribution">Contribution</SelectItem>
                          <SelectItem value="withdrawal">Withdrawal</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.1"
                        value={period.indexation}
                        onChange={(e) => handlePeriodChange(period.id, 'indexation', parseFloat(e.target.value) || '')}
                        placeholder="2"
                      />
                      <Select value={period.timing} onValueChange={(value) => handlePeriodChange(period.id, 'timing', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="end_of_year">End of Year</SelectItem>
                          <SelectItem value="start_of_year">Start of Year</SelectItem>
                        </SelectContent>
                      </Select>
                      {asset.periods.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePeriod(period.id)}
                          className="text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPeriod}
                  className="mt-3"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Add Period
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">One-Time Events</h3>
                
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-medium">Lump Sum Contributions</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addLumpSum('lump_sum_contributions')}
                    >
                      <PlusCircle className="w-4 h-4 mr-1" />
                      Add Lump Sum Contribution
                    </Button>
                  </div>
                  {asset.lump_sum_contributions.map((lumpSum) => (
                    <div key={lumpSum.id} className="flex gap-2 items-center mb-2">
                      <Input
                        type="number"
                        value={lumpSum.age}
                        onChange={(e) => handleLumpSumChange('lump_sum_contributions', lumpSum.id, 'age', parseInt(e.target.value) || '')}
                        placeholder="Age"
                        className="w-24"
                      />
                      <Input
                        type="number"
                        value={lumpSum.amount}
                        onChange={(e) => handleLumpSumChange('lump_sum_contributions', lumpSum.id, 'amount', parseFloat(e.target.value) || '')}
                        placeholder="Amount"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLumpSum('lump_sum_contributions', lumpSum.id)}
                        className="text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-medium">Lump Sum Withdrawals</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addLumpSum('lump_sum_withdrawals')}
                    >
                      <PlusCircle className="w-4 h-4 mr-1" />
                      Add Lump Sum Withdrawal
                    </Button>
                  </div>
                  {asset.lump_sum_withdrawals.map((lumpSum) => (
                    <div key={lumpSum.id} className="flex gap-2 items-center mb-2">
                      <Input
                        type="number"
                        value={lumpSum.age}
                        onChange={(e) => handleLumpSumChange('lump_sum_withdrawals', lumpSum.id, 'age', parseInt(e.target.value) || '')}
                        placeholder="Age"
                        className="w-24"
                      />
                      <Input
                        type="number"
                        value={lumpSum.amount}
                        onChange={(e) => handleLumpSumChange('lump_sum_withdrawals', lumpSum.id, 'amount', parseFloat(e.target.value) || '')}
                        placeholder="Amount"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLumpSum('lump_sum_withdrawals', lumpSum.id)}
                        className="text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
