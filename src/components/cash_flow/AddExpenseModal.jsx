
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { TrendingDown, Save, X } from "lucide-react";

export default function AddExpenseModal({ isOpen, onClose, onSubmit, expense, householdClients }) {
  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    client_id: "",
    description: "",
    exclude_from_retirement: false,
  });
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  useEffect(() => {
    if (expense) {
      setFormData({
        category: expense.category || "",
        amount: expense.amount || "",
        client_id: expense.client_id || "",
        description: expense.description || "",
        exclude_from_retirement: expense.exclude_from_retirement || false,
      });
    } else {
      setFormData({
        category: "",
        amount: "",
        client_id: householdClients.length > 0 ? householdClients[0].id : "",
        description: "",
        exclude_from_retirement: false,
      });
    }
  }, [expense, isOpen, householdClients]);

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
            <TrendingDown className="w-5 h-5 text-red-500" />
            {expense ? "Edit Expense Item" : "Add Expense Item"}
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
                <SelectValue placeholder="Select expense category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mortgage / Rent">Mortgage / Rent</SelectItem>
                <SelectItem value="Property Taxes">Property Taxes</SelectItem>
                <SelectItem value="Utilities">Utilities</SelectItem>
                <SelectItem value="Insurance">Insurance</SelectItem>
                <SelectItem value="Groceries">Groceries</SelectItem>
                <SelectItem value="Transportation">Transportation</SelectItem>
                <SelectItem value="Childcare / Education">Childcare / Education</SelectItem>
                <SelectItem value="Medical / Dental / Extended Health">Medical / Dental / Extended Health</SelectItem>
                <SelectItem value="Travel / Entertainment">Travel / Entertainment</SelectItem>
                <SelectItem value="Subscriptions / Memberships">Subscriptions / Memberships</SelectItem>
                <SelectItem value="Investment">Investment</SelectItem>
                <SelectItem value="Miscellaneous">Miscellaneous</SelectItem>
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
                placeholder="1,200.00"
                className="pl-7 text-right"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="client_id_expense">Client</Label>
            <Select value={formData.client_id} onValueChange={(value) => handleFormChange("client_id", value)}>
              <SelectTrigger id="client_id_expense">
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
            <Label htmlFor="description_expense">Description</Label>
            <Textarea
              id="description_expense"
              value={formData.description}
              onChange={(e) => handleFormChange("description", e.target.value)}
              placeholder="Optional description..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="exclude_from_retirement"
              checked={formData.exclude_from_retirement}
              onCheckedChange={(checked) => handleFormChange("exclude_from_retirement", checked)}
            />
            <Label htmlFor="exclude_from_retirement" className="text-sm">
              Exclude this expense from retirement planning calculations
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
            <Button type="submit">
              <Save className="w-4 h-4 mr-2" /> {expense ? "Save Changes" : "Save Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
