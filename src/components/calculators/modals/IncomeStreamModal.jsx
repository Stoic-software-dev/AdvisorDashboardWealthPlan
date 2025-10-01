import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GovernmentBenefitRates } from '@/api/entities';

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

const defaultFormData = {
  name: '',
  category: 'Employment Income',
  assigned_to_client_id: '',
  start_age: 65,
  end_age: 100,
  annual_amount: 50000,
  indexing_rate: 2.0,
  percent_of_max: 80,
};

export default function IncomeStreamModal({
  isOpen,
  onClose,
  onSave,
  clients = [],
  initialData = null,
  governmentRates,
  clientAges = {}
}) {
  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      // When creating a new stream, default to the first client if available
      const defaultClient = clients.length > 0 ? clients[0].id : '';
      setFormData({ ...defaultFormData, assigned_to_client_id: defaultClient });
    }
  }, [initialData, clients, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculatedAnnualPayment = useMemo(() => {
    if (!governmentRates || !['CPP Income', 'OAS Income'].includes(formData.category)) {
      return null;
    }

    const { max_cpp_annual, max_oas_annual, max_oas_annual_75_plus } = governmentRates;
    const startAge = parseFloat(formData.start_age);
    const percentOfMax = parseFloat(formData.percent_of_max) / 100;

    let basePaymentInTodaysDollars = 0;

    if (formData.category === 'CPP Income') {
      const cppMonthsDiff = (startAge - 65) * 12;
      const cppAdjustment = cppMonthsDiff < 0 ? cppMonthsDiff * 0.006 : cppMonthsDiff * 0.007;
      const cppAgeFactor = 1 + cppAdjustment;
      basePaymentInTodaysDollars = (max_cpp_annual || 0) * cppAgeFactor * percentOfMax;
    }

    if (formData.category === 'OAS Income') {
      const oasMonthsDiff = Math.max(0, (startAge - 65) * 12);
      const oasAdjustment = Math.min(oasMonthsDiff * 0.006, 0.36);
      const oasAgeFactor = 1 + oasAdjustment;
      // OAS has an age 75 step-up, but for starting amount, we use the standard max. The projection handles the step-up.
      basePaymentInTodaysDollars = (max_oas_annual || 0) * oasAgeFactor * percentOfMax;
    }

    // Inflate the base payment from today to the start age
    const clientCurrentAge = clientAges[formData.assigned_to_client_id];
    if (clientCurrentAge !== undefined && clientCurrentAge !== null) {
      const yearsToStart = startAge - clientCurrentAge;
      if (yearsToStart > 0) {
        const inflationFactor = Math.pow(1 + (formData.indexing_rate / 100), yearsToStart);
        return basePaymentInTodaysDollars * inflationFactor;
      }
    }

    return basePaymentInTodaysDollars;
  }, [formData, governmentRates, clientAges]);

  useEffect(() => {
    if (calculatedAnnualPayment !== null) {
      handleInputChange('annual_amount', Math.round(calculatedAnnualPayment));
    }
  }, [calculatedAnnualPayment]);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  const isGovBenefit = ['CPP Income', 'OAS Income'].includes(formData.category);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Income Stream</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="assigned_to_client_id">Assigned To</Label>
              <Select value={formData.assigned_to_client_id} onValueChange={(value) => handleInputChange('assigned_to_client_id', value)}>
                <SelectTrigger id="assigned_to_client_id">
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
              <Label htmlFor="name">Income Stream Name</Label>
              <Input id="name" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="category">Income Category</Label>
            <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Employment Income">Employment Income</SelectItem>
                <SelectItem value="Self-Employment Income">Self-Employment Income</SelectItem>
                <SelectItem value="CPP Income">CPP Income</SelectItem>
                <SelectItem value="OAS Income">OAS Income</SelectItem>
                <SelectItem value="Pension Income">Pension Income</SelectItem>
                <SelectItem value="Rental Income">Rental Income</SelectItem>
                <SelectItem value="Other Income">Other Income</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_age">Start Age</Label>
              <Input id="start_age" type="number" value={formData.start_age} onChange={(e) => handleInputChange('start_age', parseNumberInput(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="end_age">End Age</Label>
              <Input id="end_age" type="number" value={formData.end_age} onChange={(e) => handleInputChange('end_age', parseNumberInput(e.target.value))} />
            </div>
          </div>

          {isGovBenefit ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="percent_of_max">% of Max Benefit</Label>
                <Input id="percent_of_max" type="number" value={formData.percent_of_max} onChange={(e) => handleInputChange('percent_of_max', parseNumberInput(e.target.value))} />
              </div>
              <div>
                <Label htmlFor="indexing_rate">Annual Indexing Rate (%)</Label>
                <Input id="indexing_rate" type="number" step="0.1" value={formData.indexing_rate} onChange={(e) => handleInputChange('indexing_rate', parseNumberInput(e.target.value))} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="annual_amount">Annual Amount ($)</Label>
                <Input id="annual_amount" type="number" value={formData.annual_amount} onChange={(e) => handleInputChange('annual_amount', parseNumberInput(e.target.value))} />
              </div>
              <div>
                <Label htmlFor="indexing_rate">Annual Indexing Rate (%)</Label>
                <Input id="indexing_rate" type="number" step="0.1" value={formData.indexing_rate} onChange={(e) => handleInputChange('indexing_rate', parseNumberInput(e.target.value))} />
              </div>
            </div>
          )}

          {isGovBenefit && (
            <div className="pt-2">
              <Label className="text-sm text-gray-500">Calculated Annual Payment (at start age)</Label>
              <p className="text-lg font-semibold">{formatCurrency(formData.annual_amount)}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Stream</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}