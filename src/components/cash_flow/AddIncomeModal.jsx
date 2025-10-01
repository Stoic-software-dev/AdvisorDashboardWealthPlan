
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Save, X } from "lucide-react";

export default function AddIncomeModal({ isOpen, onClose, onSubmit, income, householdClients }) {
  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    type: "gross",
    client_id: "",
    description: ""
  });
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  useEffect(() => {
    if (income) {
      setFormData({
        category: income.category || "",
        amount: income.amount || "",
        type: income.type || "gross",
        client_id: income.client_id || "", // Preserve 'joint' if it comes from income
        description: income.description || ""
      });
    } else {
      setFormData({
        category: "",
        amount: "",
        type: "gross",
        // Default to the first client's ID, or empty. 'joint' should be selected manually.
        client_id: householdClients.length > 0 ? householdClients[0].id : "",
        description: ""
      });
    }
  }, [income, isOpen, householdClients]);

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    const sanitizedValue = value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
    handleFormChange('amount', sanitizedValue);
  };
  
  const formatCurrency = (value) => {
    if (value === '' || value === null || value === undefined) return '';
    const number = parseFloat(value);
    if (isNaN(number)) return '';
    return number.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount) || 0,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            {income ? "Edit Income Item" : "Add Income Item"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleFormChange("category", value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select income category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Employment Income">Employment Income</SelectItem>
                <SelectItem value="Self-Employment Income">Self-Employment Income</SelectItem>
                <SelectItem value="Pension Income">Pension Income</SelectItem>
                <SelectItem value="Investment Income">Investment Income</SelectItem>
                <SelectItem value="Rental Income">Rental Income</SelectItem>
                <SelectItem value="RRSP/LIF/RRIF/TFSA Withdrawals">RRSP/LIF/RRIF/TFSA Withdrawals</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Annual Amount *</Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">$</span>
              <Input
                id="amount"
                type="text"
                value={isAmountFocused ? formData.amount : formatCurrency(formData.amount)}
                onChange={handleAmountChange}
                onFocus={() => setIsAmountFocused(true)}
                onBlur={() => setIsAmountFocused(false)}
                required
                placeholder="60,000.00"
                className="pl-7 text-right"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="type">Amount Type</Label>
            <Select value={formData.type} onValueChange={(value) => handleFormChange("type", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gross">Gross (Pre-tax)</SelectItem>
                <SelectItem value="net">Net (After-tax)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="client_id">Client</Label>
            <Select value={formData.client_id} onValueChange={(value) => handleFormChange("client_id", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {householdClients.length > 1 && (
                  <SelectItem value="joint">Joint</SelectItem>
                )}
                {householdClients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleFormChange("description", e.target.value)}
              placeholder="Optional description..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
            <Button type="submit">
              <Save className="w-4 h-4 mr-2" /> {income ? "Save Changes" : "Save Income"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
