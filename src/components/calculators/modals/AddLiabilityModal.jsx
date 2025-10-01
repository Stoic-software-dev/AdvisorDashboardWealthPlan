
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Trash2 } from "lucide-react";

// Generate unique ID without uuid package
const generateId = () => `liability_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const emptyLumpSum = { id: generateId(), age: '', amount: '' };

export default function AddLiabilityModal({ isOpen, onClose, onSave, client1, client2, netWorthLiabilities, existingLiability }) {
  const [liability, setLiability] = useState(null);

  const getInitialState = useCallback(() => {
    if (existingLiability) {
      return {
        ...existingLiability,
        lump_sum_payments: existingLiability.lump_sum_payments || [],
      };
    }
    return {
      id: generateId(),
      name: '',
      assigned_to: 'joint',
      initial_balance: '',
      interest_rate: '',
      amortization_years: '',
      payment_monthly: '',
      lump_sum_payments: []
    };
  }, [existingLiability]);
  
  useEffect(() => {
    if (isOpen) {
      setLiability(getInitialState());
    }
  }, [isOpen, getInitialState]);

  if (!liability) return null;

  const handleInputChange = (field, value) => {
    setLiability(prev => ({ ...prev, [field]: value }));
  };

  const handleLumpSumChange = (id, field, value) => {
    setLiability(prev => ({
      ...prev,
      lump_sum_payments: prev.lump_sum_payments.map(ls => ls.id === id ? { ...ls, [field]: value } : ls)
    }));
  };

  const addLumpSumPayment = () => {
    setLiability(prev => ({ 
      ...prev, 
      lump_sum_payments: [...prev.lump_sum_payments, { ...emptyLumpSum, id: generateId() }] 
    }));
  };

  const removeLumpSumPayment = (id) => {
    setLiability(prev => ({ 
      ...prev, 
      lump_sum_payments: prev.lump_sum_payments.filter(ls => ls.id !== id) 
    }));
  };

  const handleNetWorthSelect = (liabilityId) => {
    if (!liabilityId) { // If "Manual Entry" is selected
      setLiability(prev => ({
        ...prev,
        name: '',
        initial_balance: '',
        assigned_to: 'joint',
        interest_rate: '',
        payment_monthly: ''
      }));
      return;
    }

    const selected = netWorthLiabilities.find(l => l.id === liabilityId);
    if (selected) {
      setLiability(prev => ({
        ...prev,
        name: selected.liability_name,
        initial_balance: selected.liability_value,
        assigned_to: selected.owner_client_id === client1?.id ? 'client1' : (selected.owner_client_id === client2?.id ? 'client2' : 'joint'),
        interest_rate: selected.interest_rate || '',
        payment_monthly: selected.periodic_payment || ''
      }));
    }
  };

  const handleSave = () => {
    onSave(liability);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existingLiability ? 'Edit Liability' : 'Add New Liability'}</DialogTitle>
          <p className="text-sm text-slate-500">Define all client assets and liabilities for the projection.</p>
        </DialogHeader>
        <Tabs defaultValue="liabilities">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assets" disabled>Assets</TabsTrigger>
            <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
          </TabsList>
          <TabsContent value="liabilities" className="mt-4">
            <div className="space-y-6 p-1 max-h-[60vh] overflow-y-auto">
              <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Liability Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label htmlFor="liability-name">Liability Name</Label>
                    <Input
                      id="liability-name"
                      value={liability.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Mortgage"
                    />
                  </div>
                  <div>
                    <Label htmlFor="assigned-to">Assigned To</Label>
                    <Select value={liability.assigned_to} onValueChange={(value) => handleInputChange('assigned_to', value)}>
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
                    <Label htmlFor="initial-balance">Initial Balance ($)</Label>
                    <Input
                      id="initial-balance"
                      type="number"
                      value={liability.initial_balance}
                      onChange={(e) => handleInputChange('initial_balance', parseFloat(e.target.value) || 0)}
                      placeholder="200000"
                    />
                  </div>
                </div>

                {netWorthLiabilities && netWorthLiabilities.length > 0 && (
                  <div className="mb-4">
                    <Label>Or choose a liability...</Label>
                    <Select onValueChange={handleNetWorthSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select from Net Worth Statement" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Manual Entry</SelectItem>
                        {netWorthLiabilities.map(liability => (
                          <SelectItem key={liability.id} value={liability.id}>
                            {liability.liability_name} - ${liability.liability_value?.toLocaleString()} ({liability.liability_category})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="interest-rate">Interest Rate (%)</Label>
                    <Input
                      id="interest-rate"
                      type="number"
                      step="0.01"
                      value={liability.interest_rate}
                      onChange={(e) => handleInputChange('interest_rate', parseFloat(e.target.value) || 0)}
                      placeholder="3.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="amortization">Amortization (Years)</Label>
                    <Input
                      id="amortization"
                      type="number"
                      value={liability.amortization_years}
                      onChange={(e) => handleInputChange('amortization_years', parseInt(e.target.value) || 0)}
                      placeholder="25"
                    />
                  </div>
                  <div>
                    <Label htmlFor="payment-monthly">Payment (Monthly)</Label>
                    <Input
                      id="payment-monthly"
                      type="number"
                      value={liability.payment_monthly}
                      onChange={(e) => handleInputChange('payment_monthly', parseFloat(e.target.value) || 0)}
                      placeholder="1200"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Lump Sum Payments</h3>
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addLumpSumPayment}
                    >
                      <PlusCircle className="w-4 h-4 mr-1" />
                      Add Lump Sum Payment
                    </Button>
                  </div>
                  {liability.lump_sum_payments.map((lumpSum) => (
                    <div key={lumpSum.id} className="flex gap-2 items-center mb-2">
                      <Input
                        type="number"
                        value={lumpSum.age}
                        onChange={(e) => handleLumpSumChange(lumpSum.id, 'age', parseInt(e.target.value) || '')}
                        placeholder="Age"
                        className="w-24"
                      />
                      <Input
                        type="number"
                        value={lumpSum.amount}
                        onChange={(e) => handleLumpSumChange(lumpSum.id, 'amount', parseFloat(e.target.value) || '')}
                        placeholder="Amount"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLumpSumPayment(lumpSum.id)}
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
