
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Helper functions for formatting and parsing currency
const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

// Helper function for formatting percentage
const formatPercentage = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return `${num.toFixed(2)}%`;
};

// Generic helper function for parsing input values by removing non-numeric characters
const parseValue = (value) => {
  if (typeof value !== 'string') return String(value || '');
  return value.replace(/[^0-9.-]+/g, "");
};

// Default values for a new contribution period
const defaultPeriod = {
  start_year: 1,
  annual_contribution: 2000,
  contribution_timing: "beginning",
  indexing_rate_type: 'none', // New field: 'none', 'inflation', 'custom'
  annual_index_rate: 2.5, // New field: custom rate in percentage
};

export default function ContributionPeriodModal({ isOpen, onClose, onSave, period, maxYear, inflationRate }) {
  const [periodData, setPeriodData] = useState(defaultPeriod);
  const [displayValues, setDisplayValues] = useState({});

  // Effect to initialize periodData and display states when period or maxYear changes, or modal opens
  useEffect(() => {
    if (isOpen) {
      let initialData;
      if (period) {
        // Editing an existing period: Merge existing period data with defaults
        initialData = { ...defaultPeriod, ...period };

        // Migration logic for old `index_contributions` boolean to new `indexing_rate_type` string
        // If the new 'indexing_rate_type' is not present but the old 'index_contributions' is,
        // map it to the new string format.
        if (period.indexing_rate_type === undefined && period.index_contributions !== undefined) {
          initialData.indexing_rate_type = period.index_contributions ? 'inflation' : 'none';
        }
        // Ensure indexing_rate_type is always defined, fallback to 'none' if missing after migration check
        if (initialData.indexing_rate_type === undefined) {
          initialData.indexing_rate_type = 'none';
        }

        // Ensure annual_index_rate is defined, fallback to defaultPeriod's value if missing
        if (initialData.annual_index_rate === undefined) {
          initialData.annual_index_rate = defaultPeriod.annual_index_rate;
        }

      } else {
        // Adding a new period: Use default values and set end_year if maxYear is available
        initialData = {
          ...defaultPeriod,
          end_year: maxYear // If maxYear is undefined, end_year will be undefined, which is fine for the input
        };
      }

      setPeriodData(initialData);

      // Set display values for formatted inputs
      setDisplayValues({
        annual_contribution: formatCurrency(initialData.annual_contribution),
        annual_index_rate: formatPercentage(initialData.annual_index_rate),
      });
    }
  }, [period, maxYear, isOpen]);

  // handleInputChange for fields that don't require special formatting (e.g., years, timing, select for adjustment type)
  const handleChange = (field, value) => {
    setPeriodData(prev => ({ ...prev, [field]: value }));
  };

  // Handler for updating display state as user types in formatted fields
  const handleDisplayChange = (field, value) => {
    setDisplayValues(prev => ({ ...prev, [field]: value }));
  };

  // Handler for when a formatted input loses focus (blur event)
  const handleBlur = (field, type) => {
    const rawValue = parseValue(displayValues[field]);
    const parsed = parseFloat(rawValue);
    const finalValue = !isNaN(parsed) ? parsed : 0; // Fallback to 0 if parsing results in NaN

    handleChange(field, finalValue); // Update actual periodData state

    // Re-format the display value to ensure consistency based on type
    if (type === 'currency') {
      setDisplayValues(prev => ({ ...prev, [field]: formatCurrency(finalValue) }));
    } else if (type === 'percentage') {
      setDisplayValues(prev => ({ ...prev, [field]: formatPercentage(finalValue) }));
    }
  };

  // Handler for when a formatted input gains focus
  const handleFocus = (field) => {
    // Show raw number for easier editing when focused
    setDisplayValues(prev => ({ ...prev, [field]: parseValue(prev[field]) }));
  };

  const handleSave = () => {
    onSave(periodData);
  };

  const getIndexingDescription = () => {
    switch(periodData.indexing_rate_type) {
        case 'inflation':
            return `Your annual contribution will increase each year by the application's preferred inflation rate of ${formatPercentage(inflationRate)}.`;
        case 'custom':
            return `Your annual contribution will increase each year by your custom rate.`;
        default:
            return '';
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold">
            {period ? 'Edit' : 'Add'} Contribution Period
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Period Duration Section */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-4">Period Duration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_year" className="text-sm text-slate-600">
                  Start Year
                </Label>
                <Input
                  id="start_year"
                  type="number"
                  value={periodData.start_year || ""}
                  onChange={(e) => handleChange("start_year", parseInt(e.target.value) || 0)} // Modified: Allow 0 for start_year
                  min="0" // Added: Set minimum input value to 0
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end_year" className="text-sm text-slate-600">
                  End Year
                </Label>
                <Input
                  id="end_year"
                  type="number"
                  value={periodData.end_year || ""}
                  onChange={(e) => handleChange("end_year", parseInt(e.target.value) || 0)}
                  placeholder={maxYear ? String(maxYear) : "N/A"}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Contribution Details Section */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-4">Contribution Details</h3>

            <div className="space-y-4">
              <div>
                <Label className="text-sm text-slate-600">Annual Contribution Amount ($)</Label>
                <Input
                  type="text"
                  value={displayValues.annual_contribution || ''}
                  onChange={(e) => handleDisplayChange('annual_contribution', e.target.value)}
                  onBlur={() => handleBlur('annual_contribution', 'currency')}
                  onFocus={() => handleFocus('annual_contribution')}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm text-slate-600">When to Make Contributions</Label>
                <Select
                  value={periodData.contribution_timing}
                  onValueChange={(value) => handleChange("contribution_timing", value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginning">Beginning of Year</SelectItem>
                    <SelectItem value="end">End of Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contribution Adjustment Section */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-4">Contribution Adjustment</h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
              <div>
                <Label className="text-sm text-slate-600">Annual Adjustment</Label>
                <Select
                  value={periodData.indexing_rate_type || 'none'}
                  onValueChange={(value) => handleChange("indexing_rate_type", value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Adjustment</SelectItem>
                    <SelectItem value="inflation">Inflation Rate</SelectItem>
                    <SelectItem value="custom">Custom Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {periodData.indexing_rate_type === 'custom' && (
                <div>
                  <Label className="text-sm text-slate-600">Custom Annual Index Rate (%)</Label>
                  <Input
                    type="text"
                    value={displayValues.annual_index_rate || ''}
                    onChange={(e) => handleDisplayChange('annual_index_rate', e.target.value)}
                    onBlur={() => handleBlur('annual_index_rate', 'percentage')}
                    onFocus={() => handleFocus('annual_index_rate')}
                    className="mt-1"
                  />
                </div>
              )}

              {getIndexingDescription() && (
                <p className="text-xs text-slate-500">
                  {getIndexingDescription()}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
            {period ? 'Update' : 'Add'} Period
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
