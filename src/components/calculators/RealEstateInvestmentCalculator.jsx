
import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Plus, Trash2, Edit, Home, DollarSign, Undo2, Table, Download, Loader2 } from "lucide-react";
import { differenceInYears } from "date-fns";
import MultiClientSelector from '../shared/MultiClientSelector';
import GiuseppeAIOptimizer from '../shared/GiuseppeAIOptimizer';
import { NetWorthStatement, Asset } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"; // Added Dialog imports
import { Switch } from "@/components/ui/switch";

const ONTARIO_TAX_BRACKETS_2024 = [
  { label: "20.05% (Income up to $51,446)", value: 20.05 },
  { label: "24.15% (Income up to $55,867)", value: 24.15 },
  { label: "29.65% (Income up to $102,894)", value: 29.65 },
  { label: "31.48% (Income up to $111,733)", value: 31.48 },
  { label: "33.89% (Income up to $150,000)", value: 33.89 },
  { label: "37.91% (Income up to $173,205)", value: 37.91 },
  { label: "43.41% (Income up to $220,000)", value: 43.41 },
  { label: "44.97% (Income up to $246,752)", value: 44.97 },
  { label: "48.29% (Income over $246,752)", value: 48.29 },
];

// Utility functions
const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

const formatPercentage = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return `${num.toFixed(2)}%`;
};

const parseValue = (value) => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value !== 'string') return String(value) || '';
  return value.replace(/[^0-9.-]+/g, "");
};

const emptyFormData = {
  calculator_name: "",
  scenario_details: "",
  client_ids: [],
  goal_id: "",
  current_age_1: "",
  current_age_2: "",
  projection_years: 30,
  marginal_tax_rate: 40.00,
  capital_gains_inclusion_rate: 50.00,
  initial_properties: [],
  property_transactions: []
};

// Modal Components
const AddPropertyModal = ({ isOpen, onClose, onSubmit, year, clients, baseCalendarYear, editingTransaction }) => {
  const [formData, setFormData] = useState({});
  const [displayValues, setDisplayValues] = useState({});
  const [focusedFields, setFocusedFields] = useState({});

  useEffect(() => {
    if (isOpen) {
      const defaultState = {
        property_name: "",
        property_address: "",
        purchase_price: "",
        growth_rate: "3.00",
        gross_rent: "", // gross_annual_rent
        rent_index_rate: "0.00", // New
        expenses: "", // annual_expenses
        expense_index_rate: "0.00", // New
        start_year_indexation: "1", // New
        mortgage_amount: "",
        mortgage_rate: "5.00",
        amortization_period: "25",
        owner_client_id: clients?.[0]?.id || "",
        ownership_percentage: "100.00"
      };

      if (editingTransaction) {
        setFormData({ ...defaultState, ...editingTransaction });
      } else {
        setFormData(defaultState);
      }
      
      setDisplayValues({});
      setFocusedFields({});
    }
  }, [isOpen, clients, editingTransaction]);

  useEffect(() => {
    setDisplayValues({
      purchase_price: focusedFields.purchase_price ? formData.purchase_price : formatCurrency(formData.purchase_price),
      growth_rate: focusedFields.growth_rate ? formData.growth_rate : formatPercentage(formData.growth_rate),
      gross_rent: focusedFields.gross_rent ? formData.gross_rent : formatCurrency(formData.gross_rent),
      rent_index_rate: focusedFields.rent_index_rate ? formData.rent_index_rate : formatPercentage(formData.rent_index_rate), // New
      expenses: focusedFields.expenses ? formData.expenses : formatCurrency(formData.expenses),
      expense_index_rate: focusedFields.expense_index_rate ? formData.expense_index_rate : formatPercentage(formData.expense_index_rate), // New
      mortgage_amount: focusedFields.mortgage_amount ? formData.mortgage_amount : formatCurrency(formData.mortgage_amount),
      mortgage_rate: focusedFields.mortgage_rate ? formData.mortgage_rate : formatPercentage(formData.mortgage_rate),
      ownership_percentage: focusedFields.ownership_percentage ? formData.ownership_percentage : formatPercentage(formData.ownership_percentage)
    });
  }, [formData, focusedFields]);

  const handleDisplayChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFocus = (field) => {
    setFocusedFields(prev => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field) => {
    setFocusedFields(prev => ({ ...prev, [field]: false }));
    const rawValue = parseValue(String(formData[field]));
    const parsed = parseFloat(rawValue);
    const finalValue = !isNaN(parsed) ? parsed : 0;
    setFormData(prev => ({ ...prev, [field]: finalValue }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const transactionId = editingTransaction ? editingTransaction.id : `purchase_${year}_${Date.now()}_${Math.random()}`;
    const processedData = {
      ...formData,
      purchase_price: parseFloat(parseValue(String(formData.purchase_price))) || 0,
      growth_rate: parseFloat(parseValue(String(formData.growth_rate))) || 0,
      gross_rent: parseFloat(parseValue(String(formData.gross_rent))) || 0,
      rent_index_rate: parseFloat(parseValue(String(formData.rent_index_rate))) || 0, // New
      expenses: parseFloat(parseValue(String(formData.expenses))) || 0,
      expense_index_rate: parseFloat(parseValue(String(formData.expense_index_rate))) || 0, // New
      start_year_indexation: parseInt(formData.start_year_indexation) || 1, // New
      mortgage_amount: parseFloat(parseValue(String(formData.mortgage_amount))) || 0,
      mortgage_rate: parseFloat(parseValue(String(formData.mortgage_rate))) || 0,
      ownership_percentage: parseFloat(parseValue(String(formData.ownership_percentage))) || 100,
      amortization_period: parseInt(formData.amortization_period) || 25,
      year: editingTransaction ? editingTransaction.year : year,
      transaction_type: 'purchase',
      id: transactionId
    };
    onSubmit(processedData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-600" />
              {editingTransaction ? 'Edit Property Purchase' : `Add Property Purchase - Year ${baseCalendarYear + year}`}
            </DialogTitle>
            <div className="w-32">
              <Label className="text-sm font-medium">Start Year</Label>
              <Input 
                type="number" 
                value={formData.start_year_indexation || ''} 
                onChange={e => handleDisplayChange('start_year_indexation', e.target.value === '' ? '' : parseInt(e.target.value))} 
                placeholder="e.g., 1"
                className="mt-1"
              />
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Property Name *</Label>
              <Input
                value={formData.property_name || ''}
                onChange={(e) => handleDisplayChange('property_name', e.target.value)}
                placeholder="e.g., 123 Main St Rental"
                required
              />
            </div>
            <div>
              <Label>Property Address</Label>
              <Input
                value={formData.property_address || ''}
                onChange={(e) => handleDisplayChange('property_address', e.target.value)}
                placeholder="Full address"
              />
            </div>
            <div>
              <Label>Purchase Price *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <Input
                  type="text"
                  value={displayValues.purchase_price || ''}
                  onChange={(e) => handleDisplayChange('purchase_price', e.target.value)}
                  onFocus={() => handleFocus('purchase_price')}
                  onBlur={() => handleBlur('purchase_price')}
                  className="pl-7 text-right"
                  placeholder="500,000.00"
                  required
                />
              </div>
            </div>
            <div>
              <Label>Annual Growth Rate</Label>
              <div className="relative">
                <Input
                  type="text"
                  value={displayValues.growth_rate || ''}
                  onChange={(e) => handleDisplayChange('growth_rate', e.target.value)}
                  onFocus={() => handleFocus('growth_rate')}
                  onBlur={() => handleBlur('growth_rate')}
                  className="pr-7 text-right"
                  placeholder="3.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
              </div>
            </div>
            <div>
              <Label>Annual Gross Rent</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <Input
                  type="text"
                  value={displayValues.gross_rent || ''}
                  onChange={(e) => handleDisplayChange('gross_rent', e.target.value)}
                  onFocus={() => handleFocus('gross_rent')}
                  onBlur={() => handleBlur('gross_rent')}
                  className="pl-7 text-right"
                  placeholder="24,000.00"
                />
              </div>
            </div>
            <div>
              <Label>Rent Index Rate (%)</Label>
              <div className="relative">
                <Input
                  type="text"
                  value={displayValues.rent_index_rate || ''}
                  onChange={(e) => handleDisplayChange('rent_index_rate', e.target.value)}
                  onFocus={() => handleFocus('rent_index_rate')}
                  onBlur={() => handleBlur('rent_index_rate')}
                  className="pr-7 text-right"
                  placeholder="2.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
              </div>
            </div>
            <div>
              <Label>Annual Expenses</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <Input
                  type="text"
                  value={displayValues.expenses || ''}
                  onChange={(e) => handleDisplayChange('expenses', e.target.value)}
                  onFocus={() => handleFocus('expenses')}
                  onBlur={() => handleBlur('expenses')}
                  className="pl-7 text-right"
                  placeholder="8,000.00"
                />
              </div>
            </div>
            <div>
              <Label>Expense Index Rate (%)</Label>
              <div className="relative">
                <Input
                  type="text"
                  value={displayValues.expense_index_rate || ''}
                  onChange={(e) => handleDisplayChange('expense_index_rate', e.target.value)}
                  onFocus={() => handleFocus('expense_index_rate')}
                  onBlur={() => handleBlur('expense_index_rate')}
                  className="pr-7 text-right"
                  placeholder="3.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
              </div>
            </div>
            {/* The indexation start year field has been moved to the header based on outline */}
            <div>
              <Label>Mortgage Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <Input
                  type="text"
                  value={displayValues.mortgage_amount || ''}
                  onChange={(e) => handleDisplayChange('mortgage_amount', e.target.value)}
                  onFocus={() => handleFocus('mortgage_amount')}
                  onBlur={() => handleBlur('mortgage_amount')}
                  className="pl-7 text-right"
                  placeholder="400,000.00"
                />
              </div>
            </div>
            <div>
              <Label>Mortgage Rate</Label>
              <div className="relative">
                <Input
                  type="text"
                  value={displayValues.mortgage_rate || ''}
                  onChange={(e) => handleDisplayChange('mortgage_rate', e.target.value)}
                  onFocus={() => handleFocus('mortgage_rate')}
                  onBlur={() => handleBlur('mortgage_rate')}
                  className="pr-7 text-right"
                  placeholder="5.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
              </div>
            </div>
            <div>
              <Label>Amortization Period (Years)</Label>
              <Input
                type="number"
                value={formData.amortization_period || ''}
                onChange={(e) => handleDisplayChange('amortization_period', e.target.value)}
                placeholder="25"
              />
            </div>
            <div>
              <Label>Owner</Label>
              <Select value={formData.owner_client_id || ''} onValueChange={(value) => handleDisplayChange('owner_client_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.length > 1 && <SelectItem value="joint">Joint</SelectItem>}
                  {clients?.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.first_name} {client.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>% Ownership</Label>
              <div className="relative">
                <Input
                  type="text"
                  value={displayValues.ownership_percentage || ''}
                  onChange={(e) => handleDisplayChange('ownership_percentage', e.target.value)}
                  onFocus={() => handleFocus('ownership_percentage')}
                  onBlur={() => handleBlur('ownership_percentage')}
                  className="pr-7 text-right"
                  placeholder="100.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{editingTransaction ? 'Save Changes' : 'Add Property'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const SellPropertyModal = ({ isOpen, onClose, onSubmit, onDelete, year, availableProperties, baseCalendarYear, editingTransaction }) => {
  const [formData, setFormData] = useState({});
  const [displayValues, setDisplayValues] = useState({});
  const [focusedFields, setFocusedFields] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        setFormData({
          property_id: editingTransaction.property_id || "",
          sale_price: editingTransaction.sale_price || "",
          outlays_expenses: editingTransaction.outlays_expenses || ""
        });
      } else {
        setFormData({
          property_id: "",
          sale_price: "",
          outlays_expenses: ""
        });
      }
      setDisplayValues({});
      setFocusedFields({});
    }
  }, [isOpen, editingTransaction]);

  useEffect(() => {
    setDisplayValues({
      sale_price: focusedFields.sale_price ? formData.sale_price : formatCurrency(formData.sale_price),
      outlays_expenses: focusedFields.outlays_expenses ? formData.outlays_expenses : formatCurrency(formData.outlays_expenses)
    });
  }, [formData, focusedFields]);

  const handleDisplayChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFocus = (field) => {
    setFocusedFields(prev => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field) => {
    setFocusedFields(prev => ({ ...prev, [field]: false }));
    const rawValue = parseValue(String(formData[field]));
    const parsed = parseFloat(rawValue);
    const finalValue = !isNaN(parsed) ? parsed : 0;
    setFormData(prev => ({ ...prev, [field]: finalValue }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const transactionId = editingTransaction ? editingTransaction.id : `sale_${year}_${Date.now()}_${Math.random()}`;
    const processedData = {
      property_id: formData.property_id,
      sale_price: parseFloat(parseValue(String(formData.sale_price))) || 0,
      outlays_expenses: parseFloat(parseValue(String(formData.outlays_expenses))) || 0,
      year: editingTransaction ? editingTransaction.year : year,
      transaction_type: 'sale',
      id: transactionId
    };
    onSubmit(processedData);
    onClose();
  };

  const handleDelete = () => {
    if (editingTransaction && onDelete) {
      onDelete(editingTransaction.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-orange-600" />
            {editingTransaction ? `Edit Sale - Year ${baseCalendarYear + editingTransaction.year}` : `Sell Property - Year ${baseCalendarYear + year}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Select Property *</Label>
              <Select value={formData.property_id || ''} onValueChange={(value) => handleDisplayChange('property_id', value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Choose property to sell" />
                </SelectTrigger>
                <SelectContent>
                  {availableProperties.map(property => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.property_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sale Price *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <Input
                  type="text"
                  value={displayValues.sale_price || ''}
                  onChange={(e) => handleDisplayChange('sale_price', e.target.value)}
                  onFocus={() => handleFocus('sale_price')}
                  onBlur={() => handleBlur('sale_price')}
                  className="pl-7 text-right"
                  placeholder="600,000.00"
                  required
                />
              </div>
            </div>
            <div>
              <Label>Outlays and Expenses</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <Input
                  type="text"
                  value={displayValues.outlays_expenses || ''}
                  onChange={(e) => handleDisplayChange('outlays_expenses', e.target.value)}
                  onFocus={() => handleFocus('outlays_expenses')}
                  onBlur={() => handleBlur('outlays_expenses')}
                  className="pl-7 text-right"
                  placeholder="15,000.00"
                />
              </div>
            </div>
            <div className="flex justify-between items-center pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <div className="flex items-center gap-2">
                {editingTransaction && (
                  <Button variant="destructive" type="button" onClick={handleDelete}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Cancel Sale
                  </Button>
                )}
                <Button type="submit">{editingTransaction ? 'Save Changes' : 'Sell Property'}</Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

const EditInitialPropertyModal = ({ isOpen, onClose, onSubmit, property, propertyIndex, clients }) => {
  const [formData, setFormData] = useState({});
  const [displayValues, setDisplayValues] = useState({});
  const [focusedFields, setFocusedFields] = useState({});

  useEffect(() => {
    if (isOpen && property) {
      setFormData({
        ...property,
        purchase_price: property.purchase_price ? String(property.purchase_price) : "",
        current_value: property.current_value !== undefined && property.current_value !== null ? String(property.current_value) : (property.purchase_price ? String(property.purchase_price) : ""),
        growth_rate: property.growth_rate ? String(property.growth_rate) : "3.00",
        gross_rent: property.gross_rent ? String(property.gross_rent) : "",
        rent_index_rate: property.rent_index_rate ? String(property.rent_index_rate) : "0.00", // New
        expenses: property.expenses ? String(property.expenses) : "",
        expense_index_rate: property.expense_index_rate ? String(property.expense_index_rate) : "0.00", // New
        start_year_indexation: property.start_year_indexation ? String(property.start_year_indexation) : "1", // New
        mortgage_amount: property.mortgage_amount ? String(property.mortgage_amount) : "",
        mortgage_rate: property.mortgage_rate ? String(property.mortgage_rate) : "5.00",
        amortization_period: property.amortization_period ? String(property.amortization_period) : "25",
        owner_client_id: property.owner_client_id || (clients?.[0]?.id || ""),
        ownership_percentage: property.ownership_percentage ? String(property.ownership_percentage) : "100.00"
      });
      setFocusedFields({});
    }
  }, [isOpen, property, clients]);

  useEffect(() => {
    setDisplayValues({
      purchase_price: focusedFields.purchase_price ? formData.purchase_price : formatCurrency(formData.purchase_price),
      current_value: focusedFields.current_value ? formData.current_value : formatCurrency(formData.current_value),
      growth_rate: focusedFields.growth_rate ? formData.growth_rate : formatPercentage(formData.growth_rate),
      gross_rent: focusedFields.gross_rent ? formData.gross_rent : formatCurrency(formData.gross_rent),
      rent_index_rate: focusedFields.rent_index_rate ? formData.rent_index_rate : formatPercentage(formData.rent_index_rate), // New
      expenses: focusedFields.expenses ? formData.expenses : formatCurrency(formData.expenses),
      expense_index_rate: focusedFields.expense_index_rate ? formData.expense_index_rate : formatPercentage(formData.expense_index_rate), // New
      mortgage_amount: focusedFields.mortgage_amount ? formData.mortgage_amount : formatCurrency(formData.mortgage_amount),
      mortgage_rate: focusedFields.mortgage_rate ? formData.mortgage_rate : formatPercentage(formData.mortgage_rate),
      ownership_percentage: focusedFields.ownership_percentage ? formData.ownership_percentage : formatPercentage(formData.ownership_percentage)
    });
  }, [formData, focusedFields]);

  const handleDisplayChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFocus = (field) => setFocusedFields(prev => ({ ...prev, [field]: true }));
  
  const handleBlur = (field) => {
    setFocusedFields(prev => ({ ...prev, [field]: false }));
    const rawValue = parseValue(String(formData[field]));
    const parsed = parseFloat(rawValue);
    const finalValue = !isNaN(parsed) ? parsed : 0;
    setFormData(prev => ({ ...prev, [field]: finalValue.toString() }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const processedData = {
      ...formData,
      purchase_price: parseFloat(parseValue(String(formData.purchase_price))) || 0,
      current_value: parseFloat(parseValue(String(formData.current_value))) || 0,
      growth_rate: parseFloat(parseValue(String(formData.growth_rate))) || 0,
      gross_rent: parseFloat(parseValue(String(formData.gross_rent))) || 0,
      rent_index_rate: parseFloat(parseValue(String(formData.rent_index_rate))) || 0, // New
      expenses: parseFloat(parseValue(String(formData.expenses))) || 0,
      expense_index_rate: parseFloat(parseValue(String(formData.expense_index_rate))) || 0, // New
      start_year_indexation: parseInt(formData.start_year_indexation) || 1, // New
      mortgage_amount: parseFloat(parseValue(String(formData.mortgage_amount))) || 0,
      mortgage_rate: parseFloat(parseValue(String(formData.mortgage_rate))) || 0,
      ownership_percentage: parseFloat(parseValue(String(formData.ownership_percentage))) || 100,
      amortization_period: parseInt(formData.amortization_period) || 25,
    };
    onSubmit(processedData, propertyIndex);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Edit Property Details
            </DialogTitle>
            <div className="w-32">
              <Label className="text-sm font-medium">Start Year</Label>
              <Input 
                type="number" 
                value={formData.start_year_indexation || ''} 
                onChange={e => handleDisplayChange('start_year_indexation', e.target.value === '' ? '' : parseInt(e.target.value))} 
                placeholder="e.g., 1"
                className="mt-1"
              />
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <Label>Property Name *</Label>
                  <Input value={formData.property_name || ""} onChange={e => handleDisplayChange('property_name', e.target.value)} required />
              </div>
              <div>
                  <Label>Property Address</Label>
                  <Input value={formData.property_address || ""} onChange={e => handleDisplayChange('property_address', e.target.value)} />
              </div>
              <div>
                  <Label>Purchase Price *</Label>
                  <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">$</span>
                      <Input
                          value={displayValues.purchase_price || ""}
                          onChange={e => handleDisplayChange('purchase_price', e.target.value)}
                          onFocus={() => handleFocus('purchase_price')}
                          onBlur={() => handleBlur('purchase_price')}
                          className="pl-7 text-right"
                          required
                      />
                  </div>
              </div>
              <div>
                  <Label>Current Value</Label>
                  <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">$</span>
                      <Input
                          value={displayValues.current_value || ""}
                          onChange={e => handleDisplayChange('current_value', e.target.value)}
                          onFocus={() => handleFocus('current_value')}
                          onBlur={() => handleBlur('current_value')}
                          className="pl-7 text-right"
                      />
                  </div>
              </div>
              <div>
                  <Label>Annual Growth Rate</Label>
                  <div className="relative">
                      <Input
                          value={displayValues.growth_rate || ""}
                          onChange={e => handleDisplayChange('growth_rate', e.target.value)}
                          onFocus={() => handleFocus('growth_rate')}
                          onBlur={() => handleBlur('growth_rate')}
                          className="pr-7 text-right"
                      />
                      <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500">%</span>
                  </div>
              </div>
              <div>
                  <Label>Gross Annual Rent</Label>
                  <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">$</span>
                      <Input
                          value={displayValues.gross_rent || ""}
                          onChange={e => handleDisplayChange('gross_rent', e.target.value)}
                          onFocus={() => handleFocus('gross_rent')}
                          onBlur={() => handleBlur('gross_rent')}
                          className="pl-7 text-right"
                      />
                  </div>
              </div>
              <div>
                <Label>Rent Index Rate (%)</Label>
                <div className="relative">
                  <Input
                    type="text"
                    value={displayValues.rent_index_rate || ''}
                    onChange={(e) => handleDisplayChange('rent_index_rate', e.target.value)}
                    onFocus={() => handleFocus('rent_index_rate')}
                    onBlur={() => handleBlur('rent_index_rate')}
                    className="pr-7 text-right"
                    placeholder="2.00"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                </div>
              </div>
              <div>
                  <Label>Annual Expenses</Label>
                  <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">$</span>
                      <Input
                          value={displayValues.expenses || ""}
                          onChange={e => handleDisplayChange('expenses', e.target.value)}
                          onFocus={() => handleFocus('expenses')}
                          onBlur={() => handleBlur('expenses')}
                          className="pl-7 text-right"
                      />
                  </div>
              </div>
              <div>
                <Label>Expense Index Rate (%)</Label>
                <div className="relative">
                  <Input
                    type="text"
                    value={displayValues.expense_index_rate || ''}
                    onChange={(e) => handleDisplayChange('expense_index_rate', e.target.value)}
                    onFocus={() => handleFocus('expense_index_rate')}
                    onBlur={() => handleBlur('expense_index_rate')}
                    className="pr-7 text-right"
                    placeholder="3.00"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                </div>
              </div>
              {/* The indexation start year field has been moved to the header based on outline */}
              <div>
                  <Label>Mortgage Amount</Label>
                  <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">$</span>
                      <Input
                          value={displayValues.mortgage_amount || ""}
                          onChange={e => handleDisplayChange('mortgage_amount', e.target.value)}
                          onFocus={() => handleFocus('mortgage_amount')}
                          onBlur={() => handleBlur('mortgage_amount')}
                          className="pl-7 text-right"
                      />
                  </div>
              </div>
              <div>
                  <Label>Mortgage Rate</Label>
                  <div className="relative">
                      <Input
                          value={displayValues.mortgage_rate || ""}
                          onChange={e => handleDisplayChange('mortgage_rate', e.target.value)}
                          onFocus={() => handleFocus('mortgage_rate')}
                          onBlur={() => handleBlur('mortgage_rate')}
                          className="pr-7 text-right"
                      />
                      <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500">%</span>
                  </div>
              </div>
              <div>
                  <Label>Amortization Period (Years)</Label>
                  <Input type="number" value={formData.amortization_period || ""} onChange={e => handleDisplayChange('amortization_period', e.target.value)} />
              </div>
              <div>
                  <Label>Owner</Label>
                  <Select value={formData.owner_client_id || ""} onValueChange={value => handleDisplayChange('owner_client_id', value)}>
                      <SelectTrigger>
                          <SelectValue placeholder="Select owner" />
                      </SelectTrigger>
                      <SelectContent>
                          {clients?.length > 1 && <SelectItem value="joint">Joint</SelectItem>}
                          {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
              <div>
                <Label>% Ownership</Label>
                <div className="relative">
                  <Input 
                    value={displayValues.ownership_percentage || ""} 
                    onChange={e => handleDisplayChange('ownership_percentage', e.target.value)} 
                    onFocus={() => handleFocus('ownership_percentage')} 
                    onBlur={() => handleBlur('ownership_percentage')} 
                    className="pr-7 text-right" 
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500">%</span>
                </div>
              </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


function RealEstateInvestmentCalculator({ clients, goals, isLoading, preselectedClientId, initialState, isViewer = false, onNameChange }, ref) {
  const [formData, setFormData] = useState({
    ...emptyFormData,
    client_ids: preselectedClientId ? [preselectedClientId] : []
  });
  const [results, setResults] = useState(null);
  const [summaryData, setSummaryData] = useState([]);
  const [detailedData, setDetailedData] = useState({});
  const [viewMode, setViewMode] = useState("summary"); // Added to fix error
  const [modalConfig, setModalConfig] = useState({ isOpen: false, year: 0, type: null, propertyId: null, editingTransaction: null });
  const [editInitialModalState, setEditInitialModalState] = useState({ isOpen: false, property: null, index: -1 });
  
  const [netWorthStatements, setNetWorthStatements] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false); 

  const [taxBrackets, setTaxBrackets] = useState(ONTARIO_TAX_BRACKETS_2024);
  const [isFetchingTaxRates, setIsFetchingTaxRates] = useState(false);

  const currentCalendarYear = new Date().getFullYear();

  const [displayValues, setDisplayValues] = useState({});
  const [focusedFields, setFocusedFields] = useState({});

  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [paymentView, setPaymentView] = useState('annual'); // New state for the toggle
  const [activeDetailedTab, setActiveDetailedTab] = useState('');

  const client1Id = formData.client_ids?.[0];
  const client2Id = formData.client_ids?.[1];

  const client1 = client1Id ? clients.find(c => c.id === client1Id) : null;
  const client2 = client2Id ? clients.find(c => c.id === client2Id) : null;

  const client1Header = client1 ? `${client1.first_name} Age` : 'Client 1 Age';
  const client2Header = client2 ? `${client2.first_name} Age` : 'Client 2 Age';

  useImperativeHandle(ref, () => ({
    getState: () => ({
      formData,
      projectionData: detailedData,
      summaryData
    })
  }));

  const handleFormDataChange = useCallback((field, value) => {
    if (field === 'calculator_name' && onNameChange) {
      onNameChange(value);
    }
    setFormData(prev => ({
      ...prev,
      [field]: value === null || value === undefined || value === "null" ? "" : value
    }));
  }, [onNameChange]);

  useEffect(() => {
    if (initialState?.formData) {
      const clientIds = initialState.formData.client_ids || 
                       (initialState.formData.client_id ? [initialState.formData.client_id] : []) ||
                       (preselectedClientId ? [preselectedClientId] : []);
      
      const safeFormData = {
        ...emptyFormData,
        ...initialState.formData,
        client_ids: clientIds,
      };
      setFormData(safeFormData);
    } else {
      setFormData(prev => ({
        ...emptyFormData,
        ...prev, 
        client_ids: preselectedClientId ? [preselectedClientId] : (prev.client_ids.length > 0 ? prev.client_ids : []),
      }));
    }
  }, [initialState, preselectedClientId]);

  useEffect(() => {
    const propertyIds = Object.keys(detailedData);
    if (propertyIds.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(propertyIds[0]);
    } else if (propertyIds.length === 0 && selectedPropertyId) {
      setSelectedPropertyId(null);
    }
  }, [detailedData, selectedPropertyId]);

  const selectedProperty = selectedPropertyId ? (() => {
    try {
      let found = formData.initial_properties?.find(p => p && p.id === selectedPropertyId);
      if (found) return found;
      
      found = formData.property_transactions?.find(t => t && t.id === selectedPropertyId && t.transaction_type === 'purchase');
      if (found) return found;
      
      const detailedProperty = detailedData[selectedPropertyId];
      if (detailedProperty && detailedProperty.length > 0 && detailedProperty[0].property_name) {
        const propertyName = detailedProperty[0].property_name;
        found = formData.initial_properties?.find(p => p && p.property_name === propertyName);
        if (found) return found;
        
        found = formData.property_transactions?.find(t => t && t.property_name === propertyName && t.transaction_type === 'purchase');
        if (found) return found;
      }
      
      return null;
    } catch (error) {
      console.error('Error finding selected property:', error);
      return null;
    }
  })() : null;

  useEffect(() => {
    setDisplayValues({
      marginal_tax_rate: focusedFields.marginal_tax_rate ? 
        (formData.marginal_tax_rate || '') : 
        formatPercentage(formData.marginal_tax_rate || 0),
      capital_gains_inclusion_rate: focusedFields.capital_gains_inclusion_rate ? 
        (formData.capital_gains_inclusion_rate || '') : 
        formatPercentage(formData.capital_gains_inclusion_rate || 0),
    });
  }, [formData.marginal_tax_rate, formData.capital_gains_inclusion_rate, focusedFields.marginal_tax_rate, focusedFields.capital_gains_inclusion_rate]);
  
  const handleFocus = (field) => {
    setFocusedFields(prev => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field) => {
    setFocusedFields(prev => ({ ...prev, [field]: false }));
    const rawValue = parseValue(String(formData[field] || ''));
    const parsed = parseFloat(rawValue);
    const finalValue = !isNaN(parsed) ? parsed : 0;
    setFormData(prev => ({ ...prev, [field]: finalValue }));
  };

  useEffect(() => {
    if (formData.client_ids.length > 0 && clients) {
      const primaryClient = clients.find(c => c.id === formData.client_ids[0]);
      const secondaryClient = formData.client_ids.length > 1 ? clients.find(c => c.id === formData.client_ids[1]) : null;
      
      if (primaryClient?.date_of_birth) {
        const age1 = differenceInYears(new Date(), new Date(primaryClient.date_of_birth));
        if (formData.current_age_1 !== age1) 
          handleFormDataChange('current_age_1', age1);
      } else if (formData.current_age_1 !== "") {
        handleFormDataChange('current_age_1', '');
      }
      
      if (secondaryClient?.date_of_birth) {
        const age2 = differenceInYears(new Date(), new Date(secondaryClient.date_of_birth));
        if (formData.current_age_2 !== age2)
          handleFormDataChange('current_age_2', age2);
      } else if (formData.current_age_2 !== "") {
        handleFormDataChange('current_age_2', '');
      }

      loadNetWorthStatements(formData.client_ids); 
    } else {
      setNetWorthStatements([]);
    }
  }, [formData.client_ids, clients, handleFormDataChange, formData.current_age_1, formData.current_age_2]);


  const loadNetWorthStatements = async (clientIds) => {
    if (!clientIds || clientIds.length === 0) {
      setNetWorthStatements([]);
      return;
    }
    setLoadingAssets(true);
    try {
      const allStatements = await NetWorthStatement.list();
      const clientSpecificStatements = allStatements.filter(statement =>
        statement.client_ids.some(id => clientIds.includes(id))
      );
      setNetWorthStatements(clientSpecificStatements);
    } catch (error) {
      console.error("Error loading Net Worth statements:", error);
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleLoadFromNetWorth = async (statementId) => {
    if (!statementId) return;

    setLoadingAssets(true);
    try {
      const allAssets = await Asset.filter({ statement_id: statementId });
      
      const realEstateAssets = (allAssets || []).filter(asset =>
        ['Investment Real Estate', 'Other Real Estate'].includes(asset.asset_category)
      );
      
      const newInitialProperties = realEstateAssets.map(asset => ({
        id: `initial_${asset.id || Date.now()}_${Math.random()}`, 
        property_name: asset.asset_name || "Untitled Property",
        property_address: "", 
        purchase_price: asset.original_cost || asset.asset_value || 0,
        current_value: asset.asset_value || 0,
        growth_rate: 3.0, 
        gross_rent: 0,
        rent_index_rate: 0, 
        expenses: 0,
        expense_index_rate: 0, 
        start_year_indexation: 1, // Default for imported
        mortgage_amount: 0,
        mortgage_rate: 5.0,
        amortization_period: 25,
        owner_client_id: asset.owner_client_id || formData.client_ids[0], 
        ownership_percentage: 100,
        year: 0,
        transaction_type: 'initial'
      }));

      setFormData(prev => ({
        ...prev,
        initial_properties: [...prev.initial_properties, ...newInitialProperties]
      }));

    } catch (error) {
      console.error("Error loading Net Worth assets for statement:", statementId, error);
    } finally {
      setLoadingAssets(false);
    }
  };

  const fetchCurrentTaxRates = async () => {
    setIsFetchingTaxRates(true);
    try {
      const currentYear = new Date().getFullYear();
      const province = "Ontario";
      const prompt = `Please act as a data extractor specializing in Canadian tax information from taxtips.ca.

For the year ${currentYear}, strictly extract the **COMBINED Federal and ${province} marginal tax rates**.

**CRITICAL INSTRUCTIONS FOR ACCURATE EXTRACTION:**
*   **Source:** Strictly use \`taxtips.ca\` as the data source.
*   **Year Specificity:** **ONLY** extract data pertaining to the year **${currentYear}**. **IGNORE** any tables or sections for other years.
*   **Income Type Specificity:** For the combined tax brackets, **ONLY** provide rates and thresholds for **'Other Income' (general income)**. **IGNORE** columns for 'Capital Gains', 'Eligible Dividends', or 'Non-Eligible Dividends'.
*   **Output Format:** Provide a list of all combined brackets, from lowest to highest income.
`;
      const response = await InvokeLLM({
        prompt: prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            tax_brackets: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  rate: { type: "number", description: "Combined tax rate as a percentage (e.g., 20.05)" },
                  income_threshold: { type: "number", description: "The upper income threshold for this bracket." },
                  label: { type: "string", description: "A descriptive label for the bracket (e.05% (Income up to $51,446)')" }
                },
                required: ["rate", "label"]
              }
            },
            year: { type: "number", description: "The tax year these rates apply to" }
          },
          required: ["tax_brackets", "year"]
        }
      });
      
      if (response.tax_brackets && response.tax_brackets.length > 0) {
        const formattedBrackets = response.tax_brackets.map(bracket => ({
          label: bracket.label || `${bracket.rate.toFixed(2)}% (Income ${bracket.income_threshold ? `up to $${bracket.income_threshold.toLocaleString()}` : 'threshold not specified'})`,
          value: bracket.rate
        }));
        setTaxBrackets(formattedBrackets);
        if (!formattedBrackets.some(b => b.value === formData.marginal_tax_rate) && formattedBrackets.length > 0) {
          setFormData(prev => ({ ...prev, marginal_tax_rate: formattedBrackets[0].value }));
        }
      } else {
        console.warn("InvokeLLM returned incomplete tax bracket data.", response);
        alert("Could not fetch the latest tax rates completely. Using existing values.");
      }
    }
    catch (error) {
      console.error("Failed to fetch current tax rates:", error);
      alert("Could not fetch the latest tax rates. Using default values.");
    }
    finally {
      setIsFetchingTaxRates(false);
    }
  };

  const calculatePortfolio = useCallback(() => {
    if (!formData.current_age_1 || formData.projection_years <= 0) {
      setSummaryData([]);
      setDetailedData({});
      return;
    }

    const CAPITAL_GAINS_INCLUSION_RATE = (parseFloat(formData.capital_gains_inclusion_rate) || 50) / 100;
    const marginalTaxRate = (parseFloat(formData.marginal_tax_rate) || 0) / 100;

    const summary = [];
    const detailed = {};
    
    let currentProperties = formData.initial_properties.map(p => {
      let annualMortgagePayment = 0;
      if (p.mortgage_amount > 0 && p.mortgage_rate > 0 && p.amortization_period > 0) {
          const monthlyRate = p.mortgage_rate / 100 / 12;
          const totalMonths = p.amortization_period * 12;
          if (monthlyRate > 0 && totalMonths > 0) {
              const monthlyPayment = p.mortgage_amount *
                  (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
                  (Math.pow(1 + monthlyRate, totalMonths) - 1);
              annualMortgagePayment = monthlyPayment * 12;
          }
      }
      return {
        ...p,
        id: p.id || `initial_${Date.now()}_${Math.random()}`,
        current_value: p.current_value !== undefined && p.current_value !== null ? p.current_value : p.purchase_price,
        mortgage_outstanding: p.mortgage_amount,
        annual_mortgage_payment: annualMortgagePayment,
        ownership_percentage: (parseFloat(p.ownership_percentage) || 100) / 100,
        // Add indexable fields and their current values
        current_gross_rent: parseFloat(p.gross_rent) || 0,
        current_expenses: parseFloat(p.expenses) || 0,
        rent_index_rate: parseFloat(p.rent_index_rate) || 0,
        expense_index_rate: parseFloat(p.expense_index_rate) || 0,
        start_year_indexation: parseInt(p.start_year_indexation) || 1, 
      };
    });
    
    currentProperties.forEach(p => detailed[p.id] = []);

    for (let year = 0; year <= formData.projection_years; year++) { 
      const calendarYear = currentCalendarYear + year;
      const age1 = parseInt(formData.current_age_1) + year;
      const age2 = formData.current_age_2 ? parseInt(formData.current_age_2) + year : null;

      const purchasesThisYear = formData.property_transactions.filter(t => t.year === year && t.transaction_type === 'purchase');
      purchasesThisYear.forEach(p => {
        let annualMortgagePayment = 0;
        if (p.mortgage_amount > 0 && p.mortgage_rate > 0 && p.amortization_period > 0) {
            const monthlyRate = p.mortgage_rate / 100 / 12;
            const totalMonths = p.amortization_period * 12;
            if (monthlyRate > 0 && totalMonths > 0) {
                const monthlyPayment = p.mortgage_amount *
                    (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
                    (Math.pow(1 + monthlyRate, totalMonths) - 1);
                annualMortgagePayment = monthlyPayment * 12;
            }
        }
        const newProp = {
          ...p,
          id: p.id || `purchase_${p.year}_${Date.now()}_${Math.random()}`,
          current_value: p.purchase_price,
          mortgage_outstanding: p.mortgage_amount,
          annual_mortgage_payment: annualMortgagePayment,
          ownership_percentage: (parseFloat(p.ownership_percentage) || 100) / 100,
          // Add indexable fields and their current values
          current_gross_rent: parseFloat(p.gross_rent) || 0,
          current_expenses: parseFloat(p.expenses) || 0,
          rent_index_rate: parseFloat(p.rent_index_rate) || 0,
          expense_index_rate: parseFloat(p.expense_index_rate) || 0,
          start_year_indexation: parseInt(p.start_year_indexation) || 1, 
        };
        currentProperties.push(newProp);
        detailed[newProp.id] = [];
      });

      // Apply indexation for the current year (from year 1 onwards)
      currentProperties.forEach(prop => {
          const startYear = parseInt(prop.start_year_indexation);
          // Indexation applies from the specified start year onwards relative to the projection start (year 0)
          if (!isNaN(startYear) && year >= startYear) {
              prop.current_gross_rent *= (1 + (prop.rent_index_rate / 100));
              prop.current_expenses *= (1 + (prop.expense_index_rate / 100));
          }
      });

      const salesThisYear = formData.property_transactions.filter(t => t.year === year && t.transaction_type === 'sale');
      const activePropertiesNextYear = [];

      let totalMarketValue = 0;
      let totalMortgageOutstanding = 0;
      let totalGrossRents = 0;
      let totalExpenses = 0;
      let totalMortgagePayments = 0; 
      let totalNetCashFlow = 0; // This will now be total_net_cash_flow
      let totalACB = 0;
      let totalEquity = 0;

      currentProperties.forEach(prop => {
        const ownership = prop.ownership_percentage;

        // Apply property value growth for the current year
        prop.current_value *= (1 + (prop.growth_rate / 100)); 

        // Mortgage principal payment calculation
        let principalPaid = 0;
        if (prop.mortgage_outstanding > 0 && prop.annual_mortgage_payment > 0) {
            const interestForYear = prop.mortgage_outstanding * (prop.mortgage_rate / 100);
            principalPaid = prop.annual_mortgage_payment - interestForYear;
            prop.mortgage_outstanding = Math.max(0, prop.mortgage_outstanding - principalPaid);
        }

        // Initialize gain/tax based on unrealized appreciation for this year
        let fullAccruedGain = prop.current_value - prop.purchase_price;
        let proratedAccruedGain = fullAccruedGain * ownership;
        
        let taxableGain = proratedAccruedGain > 0 ? proratedAccruedGain * CAPITAL_GAINS_INCLUSION_RATE : 0;
        let potentialTax = taxableGain * marginalTaxRate;

        // Variables for the table row, default to current values
        let valueForTableRow = prop.current_value; 
        let salePriceForTableRow = null; 
        let equityForTableRow = (prop.current_value - prop.mortgage_outstanding) * ownership;

        const saleTransaction = salesThisYear.find(t => t.property_id === prop.id);
        const isSoldThisYear = !!saleTransaction;

        if (isSoldThisYear) {
          const mortgageOutstandingBeforeSale = prop.mortgage_outstanding; 
          
          salePriceForTableRow = (saleTransaction.sale_price || 0);
          
          // Re-calculate gain, taxable gain, and potential tax based on the actual sale price
          fullAccruedGain = salePriceForTableRow - prop.purchase_price;
          proratedAccruedGain = fullAccruedGain * ownership;
          
          taxableGain = proratedAccruedGain > 0 ? proratedAccruedGain * CAPITAL_GAINS_INCLUSION_RATE : 0;
          potentialTax = taxableGain * marginalTaxRate;

          valueForTableRow = salePriceForTableRow; 
          equityForTableRow = 0; // Equity is realized on sale, so 0 for calculation purposes

          const netRentForSaleYear = prop.current_gross_rent - prop.current_expenses;
          const netCashFlowFromOps = (netRentForSaleYear * ownership) - (prop.annual_mortgage_payment * ownership);

          const fullNetCashFlowOnSale = salePriceForTableRow - (saleTransaction.outlays_expenses || 0) - mortgageOutstandingBeforeSale;
          const proratedNetCashFlowOnSale = fullNetCashFlowOnSale * ownership;

          const totalNetCashFlowForProperty = netCashFlowFromOps + proratedNetCashFlowOnSale;

          const propYearData = {
            property_name: prop.property_name,
            year: calendarYear,
            client_1_age: age1,
            client_2_age: age2,
            purchase_price: prop.purchase_price * ownership,
            current_value: valueForTableRow * ownership, // Prorated sale price used as current value
            sale_price: salePriceForTableRow * ownership, // Prorated sale price
            accrued_gain: proratedAccruedGain,
            taxable_gain: taxableGain,
            potential_tax: potentialTax,
            gross_rent: prop.current_gross_rent * ownership, 
            expenses: prop.current_expenses * ownership,   
            net_rent: (prop.current_gross_rent - prop.current_expenses) * ownership,
            mortgage_outstanding: 0, // 0 after sale
            mortgage_rate: prop.mortgage_rate,
            mortgage_payment: prop.annual_mortgage_payment * ownership,
            net_cash_flow_from_operations: netCashFlowFromOps,
            net_cash_flow_from_sale: proratedNetCashFlowOnSale,
            total_net_cash_flow: totalNetCashFlowForProperty,
            equity: 0, // Equity is realized on sale
            cap_rate: 0, // Not applicable for sale year
            sale_transaction_id: saleTransaction.id, 
            sale_transaction: saleTransaction 
          };
          detailed[prop.id].push(propYearData);
          
          totalMarketValue += propYearData.current_value; 
          totalMortgageOutstanding += 0;
          totalGrossRents += propYearData.gross_rent;
          totalExpenses += propYearData.expenses;
          totalMortgagePayments += propYearData.mortgage_payment;
          totalNetCashFlow += propYearData.total_net_cash_flow; // Sum total net cash flow for summary
          totalACB += propYearData.purchase_price;
          totalEquity += 0; // Equity realized for summary purposes, don't count for total
          
        } else { // Not sold this year
          // taxableGain and potentialTax already hold the unrealized values
          
          const proratedGrossRent = prop.current_gross_rent * ownership;
          const proratedExpenses = prop.current_expenses * ownership;
          const proratedNetRent = proratedGrossRent - proratedExpenses;
          const proratedMortgagePayment = prop.annual_mortgage_payment * ownership;
          const netCashFlowFromOps = proratedNetRent - proratedMortgagePayment;

          const propYearData = {
            property_name: prop.property_name,
            year: calendarYear, 
            client_1_age: age1, 
            client_2_age: age2, 
            purchase_price: prop.purchase_price * ownership,
            current_value: valueForTableRow * ownership, // Prorated current value
            sale_price: null, // No sale this year
            accrued_gain: proratedAccruedGain, // Potential accrued gain
            taxable_gain: taxableGain, // Potential taxable gain
            potential_tax: potentialTax, // Potential tax
            gross_rent: proratedGrossRent,
            expenses: proratedExpenses,
            net_rent: proratedNetRent,
            mortgage_outstanding: prop.mortgage_outstanding * ownership,
            mortgage_rate: prop.mortgage_rate,
            mortgage_payment: proratedMortgagePayment,
            net_cash_flow_from_operations: netCashFlowFromOps,
            net_cash_flow_from_sale: 0, // No sale this year
            total_net_cash_flow: netCashFlowFromOps,
            equity: equityForTableRow,
            cap_rate: prop.current_value > 0 ? (prop.current_gross_rent - prop.current_expenses) / prop.current_value * 100 : 0,
            sale_transaction_id: null, // No sale this year
            sale_transaction: null // No sale this year
          };
          detailed[prop.id].push(propYearData);
          activePropertiesNextYear.push(prop); 

          totalMarketValue += propYearData.current_value;
          totalMortgageOutstanding += propYearData.mortgage_outstanding;
          totalGrossRents += propYearData.gross_rent;
          totalExpenses += propYearData.expenses;
          totalMortgagePayments += propYearData.mortgage_payment;
          totalNetCashFlow += propYearData.total_net_cash_flow; // Sum total net cash flow for summary
          totalACB += propYearData.purchase_price;
          totalEquity += propYearData.equity;
        }
      });
      
      currentProperties = activePropertiesNextYear;

      const summaryRow = {
        year: calendarYear,
        client_1_age: age1,
        client_2_age: age2,
        properties_owned: currentProperties.length,
        acb: totalACB,
        market_value: totalMarketValue,
        mortgage_outstanding: totalMortgageOutstanding,
        gross_rents: totalGrossRents,
        net_rents: totalGrossRents - totalExpenses,
        net_cash_flow: totalNetCashFlow,
        current_equity: totalEquity
      };

      summary.push(summaryRow);
    }

    setSummaryData(summary);
    setDetailedData(detailed);
  }, [formData.initial_properties, formData.property_transactions, formData.current_age_1, formData.current_age_2, formData.projection_years, formData.marginal_tax_rate, formData.capital_gains_inclusion_rate, currentCalendarYear]);

  useEffect(() => {
    calculatePortfolio();
  }, [calculatePortfolio]);

  const handleAddPurchase = (year, editingData = null) => {
    setModalConfig({ isOpen: true, year, type: 'purchase', editingTransaction: editingData });
  };
  
  const handleAddOrUpdateTransaction = (transactionData) => {
    const existingIndex = formData.property_transactions.findIndex(t => t.id === transactionData.id);

    if (existingIndex > -1) {
      // Update existing transaction
      const updatedTransactions = [...formData.property_transactions];
      updatedTransactions[existingIndex] = transactionData;
      setFormData(prev => ({ ...prev, property_transactions: updatedTransactions }));
    } else {
      // Add new transaction
      setFormData(prev => ({
        ...prev,
        property_transactions: [...prev.property_transactions, transactionData]
      }));
    }
  };
  
  const handleSellProperty = (year, editingData = null) => {
    setModalConfig({ isOpen: true, year, type: 'sell', editingTransaction: editingData });
  };

  const handleOpenEditInitialModal = (property, index) => {
    setEditInitialModalState({ isOpen: true, property, index });
  };
  
  const handleSaveInitialProperty = (updatedProperty, index) => {
    const newInitialProperties = [...formData.initial_properties];
    newInitialProperties[index] = updatedProperty;
    setFormData(prev => ({ ...prev, initial_properties: newInitialProperties }));
    setEditInitialModalState({ isOpen: false, property: null, index: -1 });
  };

  const handleRemoveInitialProperty = (index) => {
    const propertyToRemove = formData.initial_properties[index];
    setFormData(prev => ({
      ...prev,
      initial_properties: prev.initial_properties.filter((_, i) => i !== index),
      // Also remove any sale transactions associated with this initial property
      property_transactions: prev.property_transactions.filter(t => t.property_id !== propertyToRemove.id)
    }));
  };

  const handleDeleteTransaction = (transactionId) => {
    setFormData(prev => ({
      ...prev,
      property_transactions: prev.property_transactions.filter(t => t.id !== transactionId)
    }));
  };

  const handleEditTransaction = (transaction) => {
    // Determine the year relative to currentCalendarYear if needed, or use the transaction's inherent year
    const yearRelativeToBase = transaction.year - currentCalendarYear;

    if (transaction.transaction_type === 'purchase') {
      handleAddPurchase(yearRelativeToBase, transaction);
    } else if (transaction.transaction_type === 'sale') {
      handleSellProperty(yearRelativeToBase, transaction);
    }
  };

  const getAvailablePropertiesForYear = (year) => {
    let tempPropertyState = new Map();
    
    formData.initial_properties.forEach(property => {
      tempPropertyState.set(property.id, property);
    });

    const transactionsUpToYear = formData.property_transactions.filter(t => t.year < year); 

    transactionsUpToYear.forEach(transaction => {
        if (transaction.transaction_type === 'purchase') {
            tempPropertyState.set(transaction.id, transaction);
        } else if (transaction.transaction_type === 'sale') {
           tempPropertyState.delete(transaction.property_id);
        }
    });

    return Array.from(tempPropertyState.values());
  };

  const handleClearFields = () => {
    setFormData({
      ...emptyFormData,
      client_ids: preselectedClientId ? [preselectedClientId] : []
    });
    setSummaryData([]);
    setDetailedData({});
  };

  const clientGoals = formData.client_ids && formData.client_ids.length > 0
    ? (goals || []).filter(goal => {
        const goalClientIds = goal.client_ids || (goal.client_id ? [goal.client_id] : []);
        return formData.client_ids.some(selectedId => goalClientIds.includes(selectedId));
      })
    : [];

  const householdClients = formData.client_ids.map(id => clients?.find(c => c.id === id)).filter(Boolean);

  return (
    <fieldset disabled={isViewer} className="space-y-6">
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5 text-orange-600" />
              Real Estate Investment Calculator
            </CardTitle>
            {!isViewer && (
              <Button variant="outline" onClick={handleClearFields}>
                <Undo2 className="w-4 h-4 mr-2" />
                Clear Fields
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="calculator_name">Calculator Name</Label>
              <Input
                id="calculator_name"
                value={formData.calculator_name}
                onChange={(e) => handleFormDataChange('calculator_name', e.target.value)}
                placeholder="Enter calculator name"
                disabled={isViewer}
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Associated Clients</Label>
              <MultiClientSelector
                clients={clients}
                selectedClientIds={formData.client_ids}
                onSelectionChange={(selectedIds) => handleFormDataChange('client_ids', selectedIds)}
                disabled={isViewer}
                placeholder="Select clients..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="scenario_details">Scenario Details</Label>
              <Input
                id="scenario_details"
                value={formData.scenario_details || ''}
                onChange={(e) => handleFormDataChange('scenario_details', e.target.value)}
                placeholder="E.g., Conservative Growth, Aggressive Expansion"
                disabled={isViewer}
              />
            </div>
            <div>
              <Label htmlFor="goal_id">Linked Goal (Optional)</Label>
              <Select
                value={formData.goal_id || ''}
                onValueChange={(value) => handleFormDataChange('goal_id', value)}
                disabled={isViewer || formData.client_ids.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a goal..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No goal selected</SelectItem> 
                  {clientGoals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.goal_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="current_age_1">Client 1 Age</Label>
                <Input
                  id="current_age_1"
                  type="number"
                  value={formData.current_age_1}
                  onChange={(e) => handleFormDataChange("current_age_1", e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  placeholder="65"
                  disabled={formData.client_ids.length > 0 || isViewer}
                  readOnly={formData.client_ids.length > 0}
                />
              </div>
              <div>
                <Label htmlFor="current_age_2">Client 2 Age (Optional)</Label>
                <Input
                  id="current_age_2"
                  type="number"
                  value={formData.current_age_2}
                  onChange={(e) => handleFormDataChange("current_age_2", e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  placeholder="62"
                  disabled={isViewer}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Selected Property Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-end">
            {formData.client_ids.length > 0 && !isViewer && (
              <div className="flex flex-col">
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Import from Net Worth Statement</Label>
                <Select onValueChange={handleLoadFromNetWorth} disabled={loadingAssets || netWorthStatements.length === 0}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder={loadingAssets ? "Loading statements..." : "Choose a statement"} />
                  </SelectTrigger>
                  <SelectContent>
                    {netWorthStatements.length > 0 ? (
                      netWorthStatements.map(s => <SelectItem key={s.id} value={s.id}>{s.statement_name || `Statement ${s.statement_date}`}</SelectItem>)
                    ) : (
                      <SelectItem value="no_statements" disabled>No statements found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">Properties to Model</h4>
              {!isViewer && (
                <Button onClick={() => handleAddPurchase(0)} size="sm">
                  +Add Property
                </Button>
              )}
            </div>
          </div>

          {selectedProperty ? (
            <div className="bg-slate-100 p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h5 className="font-semibold text-lg">{selectedProperty.property_name}</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                    <div>
                      <span className="text-slate-600">Purchase: </span>
                      <span className="font-medium">{formatCurrency(selectedProperty.purchase_price)}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Current Value: </span>
                      <span className="font-medium">{formatCurrency(selectedProperty.current_value || selectedProperty.purchase_price)}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Growth: </span>
                      <span className="font-medium">{formatPercentage(selectedProperty.growth_rate)}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Ownership: </span>
                      <span className="font-medium">{formatPercentage(selectedProperty.ownership_percentage || 100)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2 text-sm">
                    <div>
                      <span className="text-slate-600">Gross Rent: </span>
                      <span className="font-medium">{formatCurrency(selectedProperty.gross_rent)}</span>
                      <span className="text-slate-600"> (Index: {formatPercentage(selectedProperty.rent_index_rate)})</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Expenses: </span>
                      <span className="font-medium">{formatCurrency(selectedProperty.expenses)}</span>
                      <span className="text-slate-600"> (Index: {formatPercentage(selectedProperty.expense_index_rate)})</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Mortgage (Prorated): </span>
                      <span className="font-medium">{formatCurrency((selectedProperty.mortgage_amount || 0) * ((selectedProperty.ownership_percentage || 100) / 100))}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Mortgage Rate: </span>
                      <span className="font-medium">{formatPercentage(selectedProperty.mortgage_rate)}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Index Start Year: </span>
                      <span className="font-medium">{selectedProperty.start_year_indexation}</span>
                    </div>
                  </div>
                </div>
                {!isViewer && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        let targetIndex = formData.initial_properties.findIndex(p => p.id === selectedProperty.id);
                        if (targetIndex !== -1) {
                          handleOpenEditInitialModal(formData.initial_properties[targetIndex], targetIndex);
                          return;
                        }

                        const transactionIndex = formData.property_transactions.findIndex(t => t.id === selectedProperty.id && t.transaction_type === 'purchase');
                        if (transactionIndex !== -1) {
                          handleAddPurchase(0, formData.property_transactions[transactionIndex]);
                          return;
                        }

                        console.warn("Cannot edit: Selected property not found.");
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!selectedProperty) return;

                        let initialPropIndex = formData.initial_properties.findIndex(p => p.id === selectedProperty.id);
                        if (initialPropIndex !== -1) {
                          handleRemoveInitialProperty(initialPropIndex);
                          setSelectedPropertyId(null);
                          return;
                        }
                        
                        let transactionIdToDelete = selectedProperty.id;
                        handleDeleteTransaction(transactionIdToDelete);
                        setSelectedPropertyId(null);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-100 p-4 rounded-lg text-center text-slate-500">
              No property selected. Add a property or select a tab from the projections below.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Tax & Projection Assumptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="projection_years">Projection Years</Label>
              <Input
                id="projection_years"
                type="number"
                value={formData.projection_years}
                onChange={(e) => handleFormDataChange('projection_years', parseInt(e.target.value) || 30)}
                placeholder="30"
                disabled={isViewer}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="marginal_tax_rate">Marginal Tax Rate (ON)</Label>
                {!isViewer && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={fetchCurrentTaxRates}
                    disabled={isFetchingTaxRates}
                    className="h-6 px-2 text-xs"
                  >
                    {isFetchingTaxRates ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                  </Button>
                )}
              </div>
              <Select 
                value={String(formData.marginal_tax_rate)} 
                onValueChange={(v) => handleFormDataChange("marginal_tax_rate", parseFloat(v))} 
                disabled={isViewer}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tax bracket..." />
                </SelectTrigger>
                <SelectContent>
                  {taxBrackets.map(bracket => (
                    <SelectItem key={bracket.value} value={String(bracket.value)}>
                      {bracket.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="capital_gains_inclusion_rate">Capital Gains Inclusion Rate</Label>
              <div className="relative">
                <Input 
                  id="capital_gains_inclusion_rate"
                  type="text"
                  value={displayValues.capital_gains_inclusion_rate || ""} 
                  onChange={e => handleFormDataChange('capital_gains_inclusion_rate', e.target.value)} 
                  onFocus={() => handleFocus('capital_gains_inclusion_rate')} 
                  onBlur={() => handleBlur('capital_gains_inclusion_rate')} 
                  className="pr-7 text-right"
                  placeholder="50.00"
                  disabled={isViewer}
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500">%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {summaryData.length > 0 && (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Real Estate Portfolio Projections</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "summary" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("summary")}
              >
                Summary
              </Button>
              <Button
                variant={viewMode === "detailed" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("detailed")}
              >
                Detailed by Property
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === "summary" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Year</th>
                      <th className="px-3 py-2 text-left">{client1Header}</th>
                      {formData.current_age_2 && <th className="px-3 py-2 text-left">{client2Header}</th>}
                      <th className="px-3 py-2 text-right">Properties Owned</th>
                      <th className="px-3 py-2 text-right">ACB</th>
                      <th className="px-3 py-2 text-right">Market Value</th>
                      <th className="px-3 py-2 text-right">Mortgage Outstanding</th>
                      <th className="px-3 py-2 text-right">Gross Rents</th>
                      <th className="px-3 py-2 text-right">Net Rents</th>
                      <th className="px-3 py-2 text-right">Net Cash Flow</th>
                      <th className="px-3 py-2 text-right">Current Equity</th>
                      {!isViewer && <th className="px-3 py-2 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.map((row, index) => (
                      <tr key={index} className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2">{row.year}</td>
                        <td className="px-3 py-2">{row.client_1_age}</td>
                        {formData.current_age_2 && <td className="px-3 py-2">{row.client_2_age}</td>}
                        <td className="px-3 py-2 text-right">{row.properties_owned}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(row.acb)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatCurrency(row.market_value)}</td>
                        <td className="px-3 py-2 text-right text-red-600">{formatCurrency(row.mortgage_outstanding)}</td>
                        <td className="px-3 py-2 text-right text-green-600">{formatCurrency(row.gross_rents)}</td>
                        <td className="px-3 py-2 text-right text-green-600">{formatCurrency(row.net_rents)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(row.net_cash_flow)}</td>
                        <td className="px-3 py-2 text-right font-bold text-blue-600">{formatCurrency(row.current_equity)}</td>
                        {!isViewer && (
                          <td className="px-3 py-2 text-center">
                            <div className="flex gap-1 justify-center">
                              <Button size="sm" variant="outline" onClick={() => handleAddPurchase(index)}>
                                <Plus className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleSellProperty(index)}>
                                <DollarSign className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Tabs 
                value={selectedPropertyId || Object.keys(detailedData)[0] || 'none'} 
                onValueChange={setSelectedPropertyId} 
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1">
                  {Object.keys(detailedData).map(propId => {
                    const propData = detailedData[propId];
                    const propName = propData.length > 0 ? propData[0].property_name : `Property ${propId}`;
                    return (
                      <TabsTrigger key={propId} value={propId} className="text-xs px-2 py-1">
                        {propName}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                {Object.keys(detailedData).map(propId => {
                  const propDetails = detailedData[propId];
                  return (
                    <TabsContent key={propId} value={propId} className="mt-4">
                      <div className="overflow-x-auto">
                        <div className="flex justify-end mb-2">
                          <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-md">
                            <Button
                              size="sm"
                              variant={paymentView === 'annual' ? 'default' : 'ghost'}
                              onClick={() => setPaymentView('annual')}
                              className="text-xs h-7"
                            >
                              Annual
                            </Button>
                            <Button
                              size="sm"
                              variant={paymentView === 'monthly' ? 'default' : 'ghost'}
                              onClick={() => setPaymentView('monthly')}
                              className="text-xs h-7"
                            >
                              Monthly
                            </Button>
                          </div>
                        </div>
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              {[
                                'Year', 
                                client1Header, 
                                ...(formData.current_age_2 ? [client2Header] : []), 
                                'Purchase Price', 
                                'Current Value', 
                                'Sale Price', 
                                'Accrued Gain/Loss', 
                                'Taxable Gain', 
                                'Potential Tax', 
                                `Gross Rent ${paymentView === 'monthly' ? '(Monthly)' : ''}`, 
                                `Expenses ${paymentView === 'monthly' ? '(Monthly)' : ''}`, 
                                `Net Rent ${paymentView === 'monthly' ? '(Monthly)' : ''}`, 
                                'Mortgage Outstanding', 
                                `Mortgage Payment ${paymentView === 'monthly' ? '(Monthly)' : ''}`, 
                                `Net Cash Flow ${paymentView === 'monthly' ? '(Monthly)' : ''}`,
                                'Equity',
                                'Cap Rate',
                              ].map(h => (
                                <th key={h} className="px-3 py-2 text-left">{h}</th>
                              ))}
                              {!isViewer && <th className="px-3 py-2 text-center">Actions</th>}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {propDetails.map((row, index) => {
                                const displayValue = (annualValue) => {
                                    if (annualValue === null || annualValue === undefined) return '-';
                                    const val = parseFloat(annualValue);
                                    if (isNaN(val)) return '-';
                                    if (paymentView === 'monthly') {
                                        return formatCurrency(val / 12);
                                    }
                                    return formatCurrency(val);
                                };
                                return (
                                  <tr key={index} className="border-b hover:bg-slate-50">
                                    <td className="px-3 py-2">{row.year}</td>
                                    <td className="px-3 py-2">{row.client_1_age}</td>
                                    {formData.current_age_2 && <td className="px-3 py-2">{row.client_2_age || '-'}</td>}
                                    <td className="px-3 py-2 text-right">{formatCurrency(row.purchase_price)}</td>
                                    <td className="px-3 py-2 text-right">{formatCurrency(row.current_value)}</td>
                                    <td className="px-3 py-2 text-right">
                                      {row.sale_price > 0 ? (
                                        <div className="flex items-center justify-end gap-1">
                                          <span>{formatCurrency(row.sale_price)}</span>
                                          {!isViewer && row.sale_transaction && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleEditTransaction(row.sale_transaction)}
                                              className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700"
                                            >
                                              <Edit className="w-3 h-3" />
                                            </Button>
                                          )}
                                        </div>
                                      ) : '-'}
                                    </td>
                                    <td className="px-3 py-2 text-right">{formatCurrency(row.accrued_gain)}</td>
                                    <td className="px-3 py-2 text-right">{formatCurrency(row.taxable_gain)}</td>
                                    <td className="px-3 py-2 text-right text-red-600">{formatCurrency(row.potential_tax)}</td>
                                    <td className="px-3 py-2 text-right">{displayValue(row.gross_rent)}</td>
                                    <td className="px-3 py-2 text-right">{displayValue(row.expenses)}</td>
                                    <td className="px-3 py-2 text-right">{displayValue(row.net_rent)}</td>
                                    <td className="px-3 py-2 text-right">{formatCurrency(row.mortgage_outstanding)}</td>
                                    <td className="px-3 py-2 text-right">{displayValue(row.mortgage_payment)}</td>
                                    <td className="px-3 py-2 text-right">{displayValue(row.total_net_cash_flow)}</td>
                                    <td className="px-3 py-2 text-right font-bold text-blue-600">{formatCurrency(row.equity)}</td>
                                    <td className="px-3 py-2 text-right font-semibold text-purple-600">{formatPercentage(row.cap_rate)}</td>
                                    {!isViewer && (
                                      <td className="px-3 py-2 text-center">
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                                            const saleTransaction = formData.property_transactions.find(t => t.property_id === propId && t.year === row.year);
                                            handleSellProperty(row.year - currentCalendarYear, saleTransaction)
                                        }} disabled={row.sale_price > 0}>
                                          <DollarSign className="w-4 h-4 text-green-600" />
                                        </Button>
                                      </td>
                                    )}
                                  </tr>
                                );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}

      <AddPropertyModal
        isOpen={modalConfig.type === 'purchase' && modalConfig.isOpen}
        onClose={() => setModalConfig({ isOpen: false, type: null, year: 0, editingTransaction: null })}
        onSubmit={handleAddOrUpdateTransaction}
        year={modalConfig.year}
        clients={householdClients}
        baseCalendarYear={currentCalendarYear}
        editingTransaction={modalConfig.editingTransaction}
      />

      <SellPropertyModal
        isOpen={modalConfig.type === 'sell' && modalConfig.isOpen}
        onClose={() => setModalConfig({ isOpen: false, type: null, year: 0, editingTransaction: null })}
        onSubmit={handleAddOrUpdateTransaction}
        onDelete={handleDeleteTransaction}
        year={modalConfig.year}
        availableProperties={getAvailablePropertiesForYear(modalConfig.year)}
        baseCalendarYear={currentCalendarYear}
        editingTransaction={modalConfig.editingTransaction}
      />
      
      <EditInitialPropertyModal
        isOpen={editInitialModalState.isOpen}
        onClose={() => setEditInitialModalState({ isOpen: false, property: null, index: -1 })}
        onSubmit={handleSaveInitialProperty}
        property={editInitialModalState.property}
        propertyIndex={editInitialModalState.index}
        clients={householdClients}
      />

      {summaryData.length > 0 && (
        <GiuseppeAIOptimizer
          calculatorName="Real Estate Investment Calculator"
          description="Analyze this projection to identify opportunities for optimizing cash flow, accelerating equity growth, and managing mortgage debt effectively."
          contextData={{
            summaryData,
            detailedProjection: detailedData, 
            initialState: formData
          }}
        />
      )}
    </fieldset>
  );
}

export default forwardRef(RealEstateInvestmentCalculator);
