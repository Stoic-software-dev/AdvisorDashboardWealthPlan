
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, Save } from "lucide-react"; // Added X and Save imports as per outline

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  // Ensure two decimal places even if value is integer
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

const formatPercentage = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return `${num.toFixed(2)}%`;
};

const parseValue = (value) => {
  if (typeof value !== 'string') return String(value || ''); // Ensure value is a string for replace
  return value.replace(/[^0-9.-]+/g, ""); // Remove currency symbols, commas, percentage signs
};

export default function AddLiabilityModal({ isOpen, onClose, onSubmit, liability, householdClients }) {
  const [formData, setFormData] = useState({
    liability_category: "",
    liability_name: "",
    liability_value: "",
    owner_client_id: "",
    periodic_payment: "",
    payment_frequency: "",
    interest_rate: "",
    maturity_date: "",
    amortization_in_months: "",
    notes: ""
  });

  const [displayValues, setDisplayValues] = useState({ // New state for formatted display values
    liability_value: '',
    periodic_payment: '',
    interest_rate: '',
  });

  useEffect(() => {
    if (liability) {
      setFormData({
        liability_category: liability.liability_category || "",
        liability_name: liability.liability_name || "",
        liability_value: liability.liability_value || "",
        owner_client_id: liability.owner_client_id || "",
        periodic_payment: liability.periodic_payment || "",
        payment_frequency: liability.payment_frequency || "",
        interest_rate: liability.interest_rate || "",
        maturity_date: liability.maturity_date || "",
        amortization_in_months: liability.amortization_in_months || "",
        notes: liability.notes || ""
      });
    } else {
      setFormData({
        liability_category: "",
        liability_name: "",
        liability_value: "",
        owner_client_id: householdClients?.[0]?.id || "", // Default to first client or empty
        periodic_payment: "",
        payment_frequency: "Monthly", // Default frequency
        interest_rate: "",
        maturity_date: "",
        amortization_in_months: "",
        notes: ""
      });
    }
  }, [liability, householdClients]); // Added householdClients as dependency

  useEffect(() => {
    // Update display values whenever formData changes
    setDisplayValues({
      liability_value: formData.liability_value ? formatCurrency(formData.liability_value) : '',
      periodic_payment: formData.periodic_payment ? formatCurrency(formData.periodic_payment) : '',
      interest_rate: formData.interest_rate ? formatPercentage(formData.interest_rate) : '',
    });
  }, [formData]); // Runs when formData changes

  const handleChange = (field, value) => {
    // This updates the raw data in formData
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDisplayChange = (field, value) => {
    // This updates the value shown in the input field directly
    setDisplayValues(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field, type) => {
    const rawValue = parseValue(displayValues[field]);
    const parsed = parseFloat(rawValue);
    // If parsed is NaN, set to null for numeric fields, otherwise use parsed value
    const finalValue = !isNaN(parsed) ? parsed : null;

    handleChange(field, finalValue); // Update the actual form data with the numeric value

    // Re-format the display value after blur
    if (type === 'currency') {
      setDisplayValues(prev => ({ ...prev, [field]: formatCurrency(finalValue) }));
    } else if (type === 'percentage') {
      setDisplayValues(prev => ({ ...prev, [field]: formatPercentage(finalValue) }));
    }
  };

  const handleFocus = (field) => {
    // When input gets focus, remove formatting to show raw number
    setDisplayValues(prev => ({ ...prev, [field]: parseValue(prev[field]) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const processedData = {
      ...formData,
      // Ensure values are numbers or null before submission
      liability_value: parseFloat(formData.liability_value) || 0, // Required field
      periodic_payment: parseFloat(formData.periodic_payment) || null,
      interest_rate: parseFloat(formData.interest_rate) || null,
      amortization_in_months: parseInt(formData.amortization_in_months) || null,
      maturity_date: formData.maturity_date || null,
    };
    onSubmit(processedData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{liability ? "Edit Liability" : "Add Liability"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Liability Category *</Label>
              <Select value={formData.liability_category} onValueChange={v => handleChange('liability_category', v)} required>
                <SelectTrigger><SelectValue placeholder="Please select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Principal Mortgage">Principal Mortgage</SelectItem>
                  <SelectItem value="Long-Term Debt">Long-Term Debt</SelectItem>
                  <SelectItem value="Short-Term Debt">Short-Term Debt</SelectItem>
                  <SelectItem value="Other Liability">Other Liability</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Liability Name *</Label>
              <Input value={formData.liability_name} onChange={e => handleChange('liability_name', e.target.value)} required placeholder="e.g. Primary Mortgage" />
            </div>
            <div>
              <Label>Liability Value *</Label>
              <Input
                value={displayValues.liability_value || ''}
                onChange={e => handleDisplayChange('liability_value', e.target.value)}
                onBlur={() => handleBlur('liability_value', 'currency')}
                onFocus={() => handleFocus('liability_value')}
                placeholder="$0.00"
                required
              />
            </div>
            <div>
              <Label>Owner *</Label> {/* Changed label from 'Liability Owner' to 'Owner' */}
              <Select value={formData.owner_client_id} onValueChange={v => handleChange('owner_client_id', v)} required>
                <SelectTrigger><SelectValue placeholder="Please select" /></SelectTrigger>
                <SelectContent>
                  {householdClients.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}
                  <SelectItem value="joint">Joint</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <h3 className="text-lg font-semibold pt-4 border-b pb-2">Optional Details</h3> {/* New header */}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Periodic Payment</Label>
              <Input
                value={displayValues.periodic_payment || ''}
                onChange={e => handleDisplayChange('periodic_payment', e.target.value)}
                onBlur={() => handleBlur('periodic_payment', 'currency')}
                onFocus={() => handleFocus('periodic_payment')}
                placeholder="$0.00"
              />
            </div>
            <div>
              <Label>Payment Frequency</Label>
              <Select value={formData.payment_frequency} onValueChange={v => handleChange('payment_frequency', v)}>
                <SelectTrigger><SelectValue placeholder="Please select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Interest Rate (%)</Label>
              <Input
                value={displayValues.interest_rate || ''}
                onChange={e => handleDisplayChange('interest_rate', e.target.value)}
                onBlur={() => handleBlur('interest_rate', 'percentage')}
                onFocus={() => handleFocus('interest_rate')}
                placeholder="0.00%"
              />
            </div>
            <div>
              <Label>Maturity Date</Label>
              <Input type="date" value={formData.maturity_date || ''} onChange={e => handleChange('maturity_date', e.target.value)} />
            </div>
            <div className="col-span-2"> {/* Added col-span-2 */}
              <Label>Amortization (Months)</Label> {/* Changed label from 'Amortization in Months' */}
              <Input
                type="number"
                value={formData.amortization_in_months || ''}
                onChange={e => handleChange('amortization_in_months', e.target.value ? parseInt(e.target.value, 10) : null)} // Parse to int or null
                placeholder="0"
              />
            </div>
          </div>
          <div> {/* This div wraps the Notes textarea and is outside the grid */}
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={e => handleChange('notes', e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Entry</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
