
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, Calculator, DollarSign, AlertCircle, TrendingUp, RotateCcw } from "lucide-react";
import MultiClientSelector from "../shared/MultiClientSelector";
import GiuseppeAIOptimizer from "../shared/GiuseppeAIOptimizer";

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
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

const CapRateCalculator = forwardRef(({ initialState, clients, goals, isLoading, preselectedClientId, isViewer = false, onNameChange }, ref) => {
  const [formData, setFormData] = useState({
    client_ids: preselectedClientId ? [preselectedClientId] : [],
    property_name: "",
    current_market_value: 0,
    gross_rental_income: 0,
    other_income: 0,
    property_taxes: 0,
    insurance: 0,
    maintenance_repairs: 0,
    property_management_type: "percentage",
    property_management_percentage: 8,
    property_management_fixed: 0,
    utilities: 0,
    other_expenses: 0,
    vacancy_rate: 5,
    notes: ""
  });

  const [displayValues, setDisplayValues] = useState({});

  const [results, setResults] = useState({
    totalGrossIncome: 0,
    totalOperatingExpenses: 0,
    netOperatingIncome: 0,
    capRate: 0,
    monthlyNOI: 0,
    vacancyLoss: 0
  });

  const [showResults, setShowResults] = useState(false);

  // Update display values whenever formData changes
  useEffect(() => {
    setDisplayValues({
      current_market_value: formatCurrency(formData.current_market_value),
      gross_rental_income: formatCurrency(formData.gross_rental_income),
      other_income: formatCurrency(formData.other_income),
      property_taxes: formatCurrency(formData.property_taxes),
      insurance: formatCurrency(formData.insurance),
      maintenance_repairs: formatCurrency(formData.maintenance_repairs),
      property_management_fixed: formatCurrency(formData.property_management_fixed),
      utilities: formatCurrency(formData.utilities),
      other_expenses: formatCurrency(formData.other_expenses),
      vacancy_rate: formatPercentage(formData.vacancy_rate),
      property_management_percentage: formatPercentage(formData.property_management_percentage)
    });
  }, [formData]);

  // Load initial state if provided
  useEffect(() => {
    if (initialState?.formData) {
      setFormData(prev => ({ ...prev, ...initialState.formData }));
      // If initial state contains a property name, propagate it via onNameChange
      if (initialState.formData.property_name && onNameChange) {
        onNameChange(initialState.formData.property_name);
      }
      if (initialState.results) {
        setResults(initialState.results);
        setShowResults(true);
      }
    } else if (preselectedClientId) { // If no initial state, but a preselected client, ensure client_ids is set
      setFormData(prev => ({ ...prev, client_ids: [preselectedClientId] }));
    }
  }, [initialState, preselectedClientId, onNameChange]);

  // Expose getState method for parent component
  useImperativeHandle(ref, () => ({
    getState: () => ({
      formData,
      results: showResults ? results : null,
      showResults
    })
  }));

  const handleFormDataChange = (field, value) => {
    // If the field is property_name and onNameChange prop is provided, call it
    if (field === 'property_name' && onNameChange) {
      onNameChange(value);
    }
    setFormData(prev => ({
      ...prev,
      [field]: value === null || value === undefined || value === "null" ? "" : value
    }));
  };

  const handleDisplayChange = (field, value) => {
    setDisplayValues(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field, type) => {
    const rawValue = parseValue(displayValues[field]);
    const parsed = parseFloat(rawValue);
    const finalValue = !isNaN(parsed) ? parsed : 0;
    
    handleFormDataChange(field, finalValue);

    if (type === 'currency') setDisplayValues(prev => ({ ...prev, [field]: formatCurrency(finalValue) }));
    if (type === 'percentage') setDisplayValues(prev => ({ ...prev, [field]: formatPercentage(finalValue) }));
  };

  const handleFocus = (field) => {
    setDisplayValues(prev => ({ ...prev, [field]: parseValue(prev[field]) }));
  };

  const formatCurrencyDisplay = (amount) => {
    if (!amount || isNaN(amount)) return "$0";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentageDisplay = (rate) => {
    if (!rate || isNaN(rate)) return "0.00%";
    return `${rate.toFixed(2)}%`;
  };

  const calculateCapRate = () => {
    const marketValue = parseFloat(formData.current_market_value) || 0;
    const grossRental = parseFloat(formData.gross_rental_income) || 0;
    const otherIncome = parseFloat(formData.other_income) || 0;
    const propertyTaxes = parseFloat(formData.property_taxes) || 0;
    const insurance = parseFloat(formData.insurance) || 0;
    const maintenanceRepairs = parseFloat(formData.maintenance_repairs) || 0;
    const utilities = parseFloat(formData.utilities) || 0;
    const otherExpenses = parseFloat(formData.other_expenses) || 0;
    const vacancyRate = parseFloat(formData.vacancy_rate) || 0;

    // Calculate property management costs
    let propertyManagement = 0;
    if (formData.property_management_type === "percentage") {
      const mgmtPercentage = parseFloat(formData.property_management_percentage) || 0;
      propertyManagement = grossRental * (mgmtPercentage / 100);
    } else {
      propertyManagement = parseFloat(formData.property_management_fixed) || 0;
    }

    // Calculate totals
    const totalGrossIncome = grossRental + otherIncome;
    const vacancyLoss = totalGrossIncome * (vacancyRate / 100);
    const effectiveGrossIncome = totalGrossIncome - vacancyLoss;
    
    const totalOperatingExpenses = propertyTaxes + insurance + maintenanceRepairs + 
                                  propertyManagement + utilities + otherExpenses;
    
    const netOperatingIncome = effectiveGrossIncome - totalOperatingExpenses;
    const capRate = marketValue > 0 ? (netOperatingIncome / marketValue) * 100 : 0;
    const monthlyNOI = netOperatingIncome / 12;

    const calculatedResults = {
      totalGrossIncome: effectiveGrossIncome,
      totalOperatingExpenses,
      netOperatingIncome,
      capRate,
      monthlyNOI,
      vacancyLoss
    };

    setResults(calculatedResults);
    setShowResults(true);
  };

  const resetCalculator = () => {
    const resetData = {
      client_ids: preselectedClientId ? [preselectedClientId] : [], // Keep initial preselected client if available, or reset
      property_name: "",
      current_market_value: 0,
      gross_rental_income: 0,
      other_income: 0,
      property_taxes: 0,
      insurance: 0,
      maintenance_repairs: 0,
      property_management_type: "percentage",
      property_management_percentage: 8,
      property_management_fixed: 0,
      utilities: 0,
      other_expenses: 0,
      vacancy_rate: 5,
      notes: ""
    };
    setFormData(resetData);
    setResults({
      totalGrossIncome: 0,
      totalOperatingExpenses: 0,
      netOperatingIncome: 0,
      capRate: 0,
      monthlyNOI: 0,
      vacancyLoss: 0
    });
    setShowResults(false);
    if (onNameChange) { // Reset name in parent component as well
      onNameChange("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Home className="w-6 h-6 text-orange-600" />
              Cap Rate Calculator
            </CardTitle>
            <Button variant="outline" onClick={resetCalculator} disabled={isViewer}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Client Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Associated Clients</Label>
              <MultiClientSelector
                clients={clients}
                selectedClientIds={formData.client_ids}
                onSelectionChange={(selectedIds) => handleFormDataChange('client_ids', selectedIds)}
                placeholder="Select clients..."
                disabled={isViewer}
              />
            </div>
            <div>
              <Label htmlFor="property_name">Property Name/Address (Optional)</Label>
              <Input
                id="property_name"
                value={formData.property_name}
                onChange={(e) => handleFormDataChange('property_name', e.target.value)}
                placeholder="e.g., 123 Main Street or Investment Property #1"
                disabled={isViewer}
              />
            </div>
          </div>

          {/* Property Value */}
          <div>
            <Label htmlFor="current_market_value">Current Market Value ($) *</Label>
            <Input
              id="current_market_value"
              value={displayValues.current_market_value || ''}
              onChange={(e) => handleDisplayChange('current_market_value', e.target.value)}
              onBlur={() => handleBlur('current_market_value', 'currency')}
              onFocus={() => handleFocus('current_market_value')}
              placeholder="$500,000"
              required
              disabled={isViewer}
            />
          </div>
        </CardContent>
      </Card>

      {/* Annual Income Section */}
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-green-700">
            <DollarSign className="w-5 h-5" />
            Annual Income
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gross_rental_income">Gross Rental Income ($) *</Label>
              <Input
                id="gross_rental_income"
                value={displayValues.gross_rental_income || ''}
                onChange={(e) => handleDisplayChange('gross_rental_income', e.target.value)}
                onBlur={() => handleBlur('gross_rental_income', 'currency')}
                onFocus={() => handleFocus('gross_rental_income')}
                placeholder="$42,000"
                required
                disabled={isViewer}
              />
            </div>
            <div>
              <Label htmlFor="other_income">Other Income ($)</Label>
              <Input
                id="other_income"
                value={displayValues.other_income || ''}
                onChange={(e) => handleDisplayChange('other_income', e.target.value)}
                onBlur={() => handleBlur('other_income', 'currency')}
                onFocus={() => handleFocus('other_income')}
                placeholder="$0"
                disabled={isViewer}
              />
              <p className="text-xs text-slate-500 mt-1">Laundry, parking, storage fees, etc.</p>
            </div>
          </div>

          <div>
            <Label htmlFor="vacancy_rate">Vacancy Rate (%)</Label>
            <Input
              id="vacancy_rate"
              value={displayValues.vacancy_rate || ''}
              onChange={(e) => handleDisplayChange('vacancy_rate', e.target.value)}
              onBlur={() => handleBlur('vacancy_rate', 'percentage')}
              onFocus={() => handleFocus('vacancy_rate')}
              placeholder="5.00%"
              disabled={isViewer}
            />
            <p className="text-xs text-slate-500 mt-1">Expected percentage of time property will be vacant</p>
          </div>
        </CardContent>
      </Card>

      {/* Annual Operating Expenses Section */}
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-red-700">
            <Calculator className="w-5 h-5" />
            Annual Operating Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="property_taxes">Property Taxes ($)</Label>
              <Input
                id="property_taxes"
                value={displayValues.property_taxes || ''}
                onChange={(e) => handleDisplayChange('property_taxes', e.target.value)}
                onBlur={() => handleBlur('property_taxes', 'currency')}
                onFocus={() => handleFocus('property_taxes')}
                placeholder="$6,000"
                disabled={isViewer}
              />
            </div>
            <div>
              <Label htmlFor="insurance">Insurance ($)</Label>
              <Input
                id="insurance"
                value={displayValues.insurance || ''}
                onChange={(e) => handleDisplayChange('insurance', e.target.value)}
                onBlur={() => handleBlur('insurance', 'currency')}
                onFocus={() => handleFocus('insurance')}
                placeholder="$1,200"
                disabled={isViewer}
              />
            </div>
            <div>
              <Label htmlFor="maintenance_repairs">Maintenance & Repairs ($)</Label>
              <Input
                id="maintenance_repairs"
                value={displayValues.maintenance_repairs || ''}
                onChange={(e) => handleDisplayChange('maintenance_repairs', e.target.value)}
                onBlur={() => handleBlur('maintenance_repairs', 'currency')}
                onFocus={() => handleFocus('maintenance_repairs')}
                placeholder="$3,000"
                disabled={isViewer}
              />
            </div>
            <div>
              <Label htmlFor="utilities">Utilities (if owner-paid) ($)</Label>
              <Input
                id="utilities"
                value={displayValues.utilities || ''}
                onChange={(e) => handleDisplayChange('utilities', e.target.value)}
                onBlur={() => handleBlur('utilities', 'currency')}
                onFocus={() => handleFocus('utilities')}
                placeholder="$0"
                disabled={isViewer}
              />
            </div>
          </div>

          {/* Property Management */}
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
            <Label>Property Management</Label>
            <Select 
              value={formData.property_management_type} 
              onValueChange={(value) => handleFormDataChange('property_management_type', value)}
              disabled={isViewer}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage of Rental Income</SelectItem>
                <SelectItem value="fixed">Fixed Annual Amount</SelectItem>
              </SelectContent>
            </Select>

            {formData.property_management_type === "percentage" ? (
              <div>
                <Label htmlFor="property_management_percentage">Management Fee (%)</Label>
                <Input
                  id="property_management_percentage"
                  value={displayValues.property_management_percentage || ''}
                  onChange={(e) => handleDisplayChange('property_management_percentage', e.target.value)}
                  onBlur={() => handleBlur('property_management_percentage', 'percentage')}
                  onFocus={() => handleFocus('property_management_percentage')}
                  placeholder="8.00%"
                  disabled={isViewer}
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="property_management_fixed">Fixed Management Fee ($)</Label>
                <Input
                  id="property_management_fixed"
                  value={displayValues.property_management_fixed || ''}
                  onChange={(e) => handleDisplayChange('property_management_fixed', e.target.value)}
                  onBlur={() => handleBlur('property_management_fixed', 'currency')}
                  onFocus={() => handleFocus('property_management_fixed')}
                  placeholder="$3,000"
                  disabled={isViewer}
                />
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="other_expenses">Other Expenses ($)</Label>
            <Input
              id="other_expenses"
              value={displayValues.other_expenses || ''}
              onChange={(e) => handleDisplayChange('other_expenses', e.target.value)}
              onBlur={() => handleBlur('other_expenses', 'currency')}
              onFocus={() => handleFocus('other_expenses')}
              placeholder="$1,000"
              disabled={isViewer}
            />
            <p className="text-xs text-slate-500 mt-1">Legal fees, accounting, advertising, etc.</p>
          </div>
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Notes (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full p-3 border border-slate-300 rounded-md resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows="3"
            value={formData.notes}
            onChange={(e) => handleFormDataChange('notes', e.target.value)}
            placeholder="Add any additional notes about this property or calculation..."
            disabled={isViewer}
          />
        </CardContent>
      </Card>

      {/* Calculate Button */}
      <div className="flex justify-center">
        <Button 
          onClick={calculateCapRate}
          size="lg"
          className="bg-orange-600 hover:bg-orange-700 text-white px-8"
          disabled={isViewer}
        >
          <Calculator className="w-5 h-5 mr-2" />
          Calculate Cap Rate
        </Button>
      </div>

      {/* Results */}
      {showResults && (
        <Card className="border-none shadow-lg bg-gradient-to-r from-orange-50 to-orange-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <TrendingUp className="w-5 h-5" />
              Cap Rate Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/60 p-4 rounded-lg text-center">
                <p className="text-sm font-medium text-slate-600">Effective Gross Income</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrencyDisplay(results.totalGrossIncome)}</p>
                <p className="text-xs text-slate-500">After vacancy loss</p>
              </div>
              <div className="bg-white/60 p-4 rounded-lg text-center">
                <p className="text-sm font-medium text-slate-600">Operating Expenses</p>
                <p className="text-2xl font-bold text-red-700">{formatCurrencyDisplay(results.totalOperatingExpenses)}</p>
                <p className="text-xs text-slate-500">Annual total</p>
              </div>
              <div className="bg-white/60 p-4 rounded-lg text-center">
                <p className="text-sm font-medium text-slate-600">Net Operating Income</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrencyDisplay(results.netOperatingIncome)}</p>
                <p className="text-xs text-slate-500">{formatCurrencyDisplay(results.monthlyNOI)}/month</p>
              </div>
              <div className="bg-white/60 p-4 rounded-lg text-center border-2 border-orange-300">
                <p className="text-sm font-medium text-slate-600">Cap Rate</p>
                <p className="text-3xl font-bold text-orange-700">{formatPercentageDisplay(results.capRate)}</p>
                <p className="text-xs text-slate-500">Annual return rate</p>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="bg-white/60 p-4 rounded-lg">
              <h4 className="font-semibold text-slate-800 mb-3">Calculation Breakdown</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Gross Rental Income:</span>
                  <span className="font-medium">{formatCurrencyDisplay(parseFloat(formData.gross_rental_income) || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Other Income:</span>
                  <span className="font-medium">{formatCurrencyDisplay(parseFloat(formData.other_income) || 0)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Vacancy Loss ({formatPercentageDisplay(formData.vacancy_rate)}):</span>
                  <span className="font-medium">-{formatCurrencyDisplay(results.vacancyLoss || 0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Effective Gross Income:</span>
                  <span>{formatCurrencyDisplay(results.totalGrossIncome)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Total Operating Expenses:</span>
                  <span className="font-medium">-{formatCurrencyDisplay(results.totalOperatingExpenses)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Net Operating Income:</span>
                  <span>{formatCurrencyDisplay(results.netOperatingIncome)}</span>
                </div>
              </div>
            </div>

            {/* Cap Rate Interpretation */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Cap Rate Interpretation:</strong> 
                {results.capRate >= 10 ? " This is considered a high cap rate, indicating potentially higher returns but may also suggest higher risk or lower-quality property." :
                 results.capRate >= 7 ? " This is a moderate cap rate, typical for many investment properties in stable markets." :
                 results.capRate >= 4 ? " This is a lower cap rate, often seen in prime locations or high-quality properties with lower risk." :
                 " This is a very low cap rate, which may indicate premium properties in desirable areas or potential overvaluation."}
              </AlertDescription>
            </Alert>

            {/* AI Optimizer */}
            <div className="mt-6">
              <GiuseppeAIOptimizer
                calculatorName="Cap Rate Calculator"
                calculatorData={{
                  inputs: formData,
                  results: results
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

CapRateCalculator.displayName = 'CapRateCalculator';

export default CapRateCalculator;
