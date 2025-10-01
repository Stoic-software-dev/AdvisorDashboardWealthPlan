
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, Save, Plus, Trash2 } from "lucide-react"; // These imports are added as per the outline, though not all are used in this specific component's current scope.

// Helper function to format a value as currency
const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

// Helper function to format a value as a percentage
const formatPercentage = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return `${num.toFixed(2)}%`;
};

// Helper function to parse a formatted string back to a raw number string
const parseValue = (value) => {
  if (typeof value !== 'string') return String(value || ''); // Ensure it's a string
  return value.replace(/[^0-9.-]+/g, ""); // Remove all non-numeric, non-dot, non-hyphen characters
};

export default function AddAssetModal({ isOpen, onClose, onSubmit, asset, householdClients }) {
  const [formData, setFormData] = useState({
    asset_category: "",
    asset_name: "",
    asset_value: "",
    owner_client_id: "",
    periodic_contribution: "",
    contribution_frequency: "",
    interest_rate_earned: "",
    maturity_date: "",
    maturity_value: "",
    notes: ""
  });

  // State to hold formatted values for display in input fields
  const [displayValues, setDisplayValues] = useState({});

  // Effect to initialize formData and displayValues when asset prop changes or on mount
  useEffect(() => {
    if (asset) {
      // When editing an asset, populate formData with existing asset data
      setFormData({
        asset_category: asset.asset_category || "",
        asset_name: asset.asset_name || "",
        asset_value: asset.asset_value || "",
        owner_client_id: asset.owner_client_id || "",
        periodic_contribution: asset.periodic_contribution || "",
        contribution_frequency: asset.contribution_frequency || "",
        interest_rate_earned: asset.interest_rate_earned || "",
        maturity_date: asset.maturity_date || "",
        maturity_value: asset.maturity_value || "",
        notes: asset.notes || ""
      });
    } else {
      // When adding a new asset, set default values
      setFormData({
        asset_category: "",
        asset_name: "",
        asset_value: "",
        owner_client_id: householdClients?.[0]?.id || "", // Default to first client or empty
        periodic_contribution: "",
        contribution_frequency: "Monthly", // Default contribution frequency
        interest_rate_earned: "",
        maturity_date: "",
        maturity_value: "",
        notes: ""
      });
    }
  }, [asset, householdClients]);

  // Effect to update displayValues whenever formData changes
  useEffect(() => {
    setDisplayValues({
      asset_value: formData.asset_value ? formatCurrency(formData.asset_value) : '',
      periodic_contribution: formData.periodic_contribution ? formatCurrency(formData.periodic_contribution) : '',
      interest_rate_earned: formData.interest_rate_earned ? formatPercentage(formData.interest_rate_earned) : '',
      maturity_value: formData.maturity_value ? formatCurrency(formData.maturity_value) : '',
    });
  }, [formData]);

  // Standard handleChange for non-formatted fields (e.g., text, date, select)
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handler for changes in the display-formatted input fields
  const handleDisplayChange = (field, value) => {
    setDisplayValues(prev => ({ ...prev, [field]: value }));
  };

  // Handler for when an input field loses focus (blur event)
  const handleBlur = (field, type) => {
    const rawValue = parseValue(displayValues[field]); // Get the raw numeric string
    const parsed = parseFloat(rawValue); // Parse it to a number

    // Update formData with the actual numeric value, or null if invalid/empty
    const finalValue = !isNaN(parsed) ? parsed : null;
    handleChange(field, finalValue);

    // Re-format the display value based on its type
    if (type === 'currency') {
      setDisplayValues(prev => ({ ...prev, [field]: formatCurrency(finalValue) }));
    } else if (type === 'percentage') {
      setDisplayValues(prev => ({ ...prev, [field]: formatPercentage(finalValue) }));
    }
  };

  // Handler for when an input field gains focus
  const handleFocus = (field) => {
    // Show the raw, unformatted value when focused for easier editing
    setDisplayValues(prev => ({ ...prev, [field]: parseValue(prev[field]) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Ensure all numeric fields are correctly parsed from their potential raw string format
    // before submission, especially if the user didn't blur an input before clicking save.
    // The blur handler usually takes care of this, but this provides a fallback.
    const processedData = {
      ...formData,
      asset_value: parseFloat(parseValue(displayValues.asset_value)) || 0, // Ensure required fields have a default 0 if empty
      periodic_contribution: parseFloat(parseValue(displayValues.periodic_contribution)) || null,
      interest_rate_earned: parseFloat(parseValue(displayValues.interest_rate_earned)) || null,
      maturity_value: parseFloat(parseValue(displayValues.maturity_value)) || null,
      maturity_date: formData.maturity_date || null, // Date is handled separately
    };
    onSubmit(processedData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{asset ? "Edit Asset" : "Add Asset"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Asset Category *</Label>
              <Select value={formData.asset_category} onValueChange={v => handleChange('asset_category', v)} required>
                <SelectTrigger><SelectValue placeholder="Please select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Capital Registered">Capital Registered</SelectItem>
                  <SelectItem value="Capital Non-Registered">Capital Non-Registered</SelectItem>
                  <SelectItem value="Capital Tax-Free">Capital Tax-Free</SelectItem>
                  <SelectItem value="Principal Residence">Principal Residence</SelectItem>
                  <SelectItem value="Investment Real Estate">Investment Real Estate</SelectItem>
                  <SelectItem value="Other Real Estate">Other Real Estate</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Asset Name *</Label>
              <Input value={formData.asset_name} onChange={e => handleChange('asset_name', e.target.value)} required placeholder="e.g. Primary Residence" />
            </div>
            <div>
              <Label>Asset Value *</Label>
              <Input
                value={displayValues.asset_value || ''}
                onChange={e => handleDisplayChange('asset_value', e.target.value)}
                onBlur={() => handleBlur('asset_value', 'currency')}
                onFocus={() => handleFocus('asset_value')}
                placeholder="$0.00"
                required
              />
            </div>
            <div>
              <Label>Owner *</Label> {/* Label changed to 'Owner' */}
              <Select value={formData.owner_client_id} onValueChange={v => handleChange('owner_client_id', v)} required>
                <SelectTrigger><SelectValue placeholder="Please select" /></SelectTrigger>
                <SelectContent>
                  {householdClients.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}
                  <SelectItem value="joint">Joint</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <h3 className="text-lg font-semibold pt-4 border-b pb-2">Optional Details</h3> {/* Added optional details header */}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Periodic Contribution</Label>
              <Input
                value={displayValues.periodic_contribution || ''}
                onChange={e => handleDisplayChange('periodic_contribution', e.target.value)}
                onBlur={() => handleBlur('periodic_contribution', 'currency')}
                onFocus={() => handleFocus('periodic_contribution')}
                placeholder="$0.00"
              />
            </div>
            <div>
              <Label>Contribution Frequency</Label>
              <Select value={formData.contribution_frequency} onValueChange={v => handleChange('contribution_frequency', v)}>
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
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Interest Rate Earned (%)</Label>
              <Input
                value={displayValues.interest_rate_earned || ''}
                onChange={e => handleDisplayChange('interest_rate_earned', e.target.value)}
                onBlur={() => handleBlur('interest_rate_earned', 'percentage')}
                onFocus={() => handleFocus('interest_rate_earned')}
                placeholder="0.00%"
              />
            </div>
            <div>
              <Label>Maturity Date</Label>
              <Input type="date" value={formData.maturity_date || ''} onChange={e => handleChange('maturity_date', e.target.value)} />
            </div>
            <div className="col-span-2"> {/* Made Maturity Value span 2 columns to align with layout */}
              <Label>Maturity Value</Label>
              <Input
                value={displayValues.maturity_value || ''}
                onChange={e => handleDisplayChange('maturity_value', e.target.value)}
                onBlur={() => handleBlur('maturity_value', 'currency')}
                onFocus={() => handleFocus('maturity_value')}
                placeholder="$0.00"
              />
            </div>
          </div>
          <div className="col-span-2"> {/* Notes field also spans 2 columns */}
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
