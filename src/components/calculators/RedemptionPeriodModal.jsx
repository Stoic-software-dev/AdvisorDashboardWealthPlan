
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

const formatPercentage = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return `${num.toFixed(2)}%`;
};

const parseValue = (value) => {
  if (typeof value !== 'string') return value || '';
  return value.replace(/[^0-9.-]+/g, "");
};

const defaultPeriod = {
  id: null,
  start_year: 1,
  end_year: 0,
  redemption_type: 'fixed_amount',
  annual_redemption: 0,
  percentage_of_initial_rate: 0,
  redemption_timing: "end",
  indexing_rate_type: 'none',
  custom_indexing_rate: 0,
};

const RedemptionPeriodModal = ({ isOpen, onClose, onSave, period, maxYear, inflationRate }) => {
  const [periodData, setPeriodData] = useState(period || defaultPeriod);
  const [displayValues, setDisplayValues] = useState({});
  const [error, setError] = useState(''); // State for validation errors

  useEffect(() => {
    const newPeriodData = period || { ...defaultPeriod, end_year: maxYear };
    setPeriodData(newPeriodData);
    
    // Initialize display values with formatting
    setDisplayValues({
      annual_redemption: formatCurrency(newPeriodData.annual_redemption),
      percentage_of_initial_rate: formatPercentage(newPeriodData.percentage_of_initial_rate),
      custom_indexing_rate: formatPercentage(newPeriodData.custom_indexing_rate)
    });
    setError(''); // Clear errors when modal opens or period changes
  }, [period, maxYear]);

  const handleChange = (field, value) => {
    if (field === 'start_year' || field === 'end_year') {
      // Store empty string if input is cleared, otherwise parse to number (could be NaN)
      const numValue = parseInt(value, 10);
      setPeriodData(prev => ({ ...prev, [field]: value === '' ? '' : numValue }));
    } else {
      setPeriodData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleDisplayChange = (field, value) => {
    setDisplayValues(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field, type) => {
    const rawValue = parseValue(displayValues[field]);
    const parsed = parseFloat(rawValue);
    const finalValue = !isNaN(parsed) ? parsed : 0;
    
    handleChange(field, finalValue); // Update periodData with numeric value
    
    if (type === 'currency') {
      setDisplayValues(prev => ({ ...prev, [field]: formatCurrency(finalValue) }));
    } else if (type === 'percentage') {
      setDisplayValues(prev => ({ ...prev, [field]: formatPercentage(finalValue) }));
    }
  };

  const handleFocus = (field) => {
    setDisplayValues(prev => ({ ...prev, [field]: parseValue(prev[field]) }));
  };

  const handleSave = () => {
    // Parse current state values for start_year and end_year, providing defaults for empty/invalid inputs
    const parsedStartYear = parseInt(periodData.start_year, 10);
    const parsedEndYear = parseInt(periodData.end_year, 10);

    const effectiveStartYear = Number.isFinite(parsedStartYear) ? parsedStartYear : 1;
    const effectiveEndYear = Number.isFinite(parsedEndYear) ? parsedEndYear : 0; // 0 implies maxYear

    // Validation
    if (effectiveStartYear < 0) {
      setError('Start year must be 0 or greater.');
      return;
    }
    // If effectiveEndYear is 0, it means maxYear, which is always valid relative to start_year.
    // We only validate if a specific end year is set and it's less than start_year.
    if (effectiveEndYear !== 0 && effectiveEndYear < effectiveStartYear) {
      setError('End year cannot be before start year.');
      return;
    }

    // All validations pass, clear error and prepare final data
    setError('');
    // `periodData` already has other fields (annual_redemption, etc.) updated by `handleBlur`
    // So just update `start_year` and `end_year` with their validated numeric versions
    const finalPeriodData = {
      ...periodData,
      start_year: effectiveStartYear,
      end_year: effectiveEndYear,
    };
    onSave(finalPeriodData);
  };

  const getRedemptionTypeLabel = () => {
    switch (periodData.redemption_type) {
      case 'fixed_amount':
        return 'Annual Redemption Amount ($)';
      case 'percentage_of_initial':
        return 'Percentage of Initial Portfolio Value (%)';
      case 'percentage_of_current':
        return 'Percentage of Current Portfolio Value (%)';
      default:
        return 'Redemption Amount';
    }
  };

  const getIndexingDescription = () => {
    if (periodData.indexing_rate_type === 'inflation') {
      const amount = periodData.annual_redemption || 0;
      return `Uses the application's preferred inflation rate of ${inflationRate.toFixed(2)}%. Your $${amount.toLocaleString()} annual redemption will increase each year.`;
    } else if (periodData.indexing_rate_type === 'custom') {
      const amount = periodData.annual_redemption || 0;
      const rate = periodData.custom_indexing_rate || 0;
      return `Uses a custom rate of ${rate.toFixed(2)}%. Your $${amount.toLocaleString()} annual redemption will increase each year.`;
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold">
            {period ? "Edit" : "Add"} Redemption Period
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
                  value={periodData.start_year ?? ""}
                  onChange={(e) => handleChange("start_year", e.target.value)}
                  min="0"
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
                  value={periodData.end_year ?? ""}
                  onChange={(e) => handleChange("end_year", e.target.value)}
                  placeholder={maxYear}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Redemption Details Section */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-4">Redemption Details</h3>
            
            {/* Redemption Type */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-slate-600">Redemption Type</Label>
                <Select
                  value={periodData.redemption_type}
                  onValueChange={(value) => handleChange("redemption_type", value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_amount">Fixed Amount ($)</SelectItem>
                    <SelectItem value="percentage_of_initial">Percentage of Initial Value (Fixed $)</SelectItem>
                    <SelectItem value="percentage_of_current">Percentage of Current Value (Variable $)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount/Percentage Input */}
              <div>
                <Label className="text-sm text-slate-600">
                  {getRedemptionTypeLabel()}
                </Label>
                {periodData.redemption_type === 'fixed_amount' ? (
                  <Input
                    type="text"
                    value={displayValues.annual_redemption || ''}
                    onChange={(e) => handleDisplayChange('annual_redemption', e.target.value)}
                    onBlur={() => handleBlur('annual_redemption', 'currency')}
                    onFocus={() => handleFocus('annual_redemption')}
                    className="mt-1"
                  />
                ) : (
                  <Input
                    type="text"
                    value={displayValues.percentage_of_initial_rate || ''}
                    onChange={(e) => handleDisplayChange('percentage_of_initial_rate', e.target.value)}
                    onBlur={() => handleBlur('percentage_of_initial_rate', 'percentage')}
                    onFocus={() => handleFocus('percentage_of_initial_rate')}
                    className="mt-1"
                  />
                )}
              </div>

              {/* Timing */}
              <div>
                <Label className="text-sm text-slate-600">When to Make Redemptions</Label>
                <Select
                  value={periodData.redemption_timing}
                  onValueChange={(value) => handleChange("redemption_timing", value)}
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

          {/* Redemption Adjustment Section */}
          {periodData.redemption_type === 'fixed_amount' && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-4">Redemption Adjustment</h3>
              <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                <div>
                  <Label className="text-sm text-slate-600">Annual Adjustment</Label>
                  <Select
                    value={periodData.indexing_rate_type}
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
                    <Label className="text-sm text-slate-600">Custom Adjustment Rate (%)</Label>
                    <Input
                      type="text"
                      value={displayValues.custom_indexing_rate || ''}
                      onChange={(e) => handleDisplayChange('custom_indexing_rate', e.target.value)}
                      onBlur={() => handleBlur('custom_indexing_rate', 'percentage')}
                      onFocus={() => handleFocus('custom_indexing_rate')}
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
          )}
        </div>
        
        {error && (
          <p className="text-red-500 text-sm mt-4 text-center">{error}</p>
        )}

        <DialogFooter className="pt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
            {period ? "Update" : "Add"} Period
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RedemptionPeriodModal;
