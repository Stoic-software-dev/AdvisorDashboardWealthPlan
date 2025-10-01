
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X, Plus, Trash2, Loader2, AlertTriangle, Building, Upload, FileText, ChevronsUpDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import MultiClientSelector from '../shared/MultiClientSelector';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { UploadFile, ExtractDataFromUploadedFile } from "@/api/integrations"; // Removed CalculatorInstance
import { CalculatorInstance } from "@/api/entities"; // Fixed import for CalculatorInstance

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

// Helper function for className concatenation (cn) - not used in final code, but kept for completeness if other parts relied on it
function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}

// Helper functions for formatting and parsing values
const formatCurrency = (value) => {
  const number = parseFloat(String(value).replace(/[$,]/g, ''));
  if (isNaN(number)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(number);
};

const formatPercentage = (value) => {
  const number = parseFloat(String(value).replace(/[%]/g, ''));
  if (isNaN(number)) return '0.00%';
  return `${number.toFixed(2)}%`;
};

const parseValue = (value) => {
  if (typeof value !== 'string') return value || 0;
  return parseFloat(value.replace(/[$,%]/g, '')) || 0;
};


export default function PortfolioForm({
  portfolio,
  goals,
  models,
  funds,
  onSave,
  onCancel,
  allClients,
  preselectedClientId,
}) {
  const [formData, setFormData] = useState(() => {
    const initialData = {
      client_ids: portfolio?.client_ids || (portfolio?.client_id ? [portfolio.client_id] : (preselectedClientId ? [preselectedClientId] : [])),
      account_name: portfolio?.account_name || "",
      account_number: portfolio?.account_number || "",
      account_type: portfolio?.account_type || (portfolio ? "" : "taxable"), // Default for new portfolios
      goal_id: portfolio?.goal_id || "", // Use "" instead of null for Select component compatibility
      risk_level: portfolio?.risk_level || (portfolio ? "" : "moderate"), // Default for new portfolios
      inception_date: portfolio?.inception_date ? portfolio.inception_date.split('T')[0] : "",
      fund_holdings: portfolio?.fund_holdings || [],
      // Convert numbers to strings for input fields, apply formatting
      total_value: portfolio?.total_value !== undefined && portfolio?.total_value !== null ? String(portfolio.total_value) : "",
      cash_balance: portfolio?.cash_balance !== undefined && portfolio?.cash_balance !== null ? String(portfolio.cash_balance) : "",
      performance_ytd: portfolio?.performance_ytd !== undefined && portfolio?.performance_ytd !== null ? String(portfolio.performance_ytd) : "",
      performance_1yr: portfolio?.performance_1yr !== undefined && portfolio?.performance_1yr !== null ? String(portfolio.performance_1yr) : "",
      previous_value: portfolio?.previous_value !== undefined && portfolio?.previous_value !== null ? String(portfolio.previous_value) : "",
      expectations_statement: portfolio?.expectations_statement || "",
      signed_ips_url: portfolio?.signed_ips_url || "",
      calculator_instance_id: portfolio?.calculator_instance_id || "",
      linked_risk_assessment_id: portfolio?.linked_risk_assessment_id || ""
    };

    // Apply initial formatting for display values if they exist
    return {
      ...initialData,
      total_value: initialData.total_value !== "" ? formatCurrency(initialData.total_value) : "",
      cash_balance: initialData.cash_balance !== "" ? formatCurrency(initialData.cash_balance) : "",
      performance_ytd: initialData.performance_ytd !== "" ? formatPercentage(initialData.performance_ytd) : "",
      performance_1yr: initialData.performance_1yr !== "" ? formatPercentage(initialData.performance_1yr) : "",
      previous_value: initialData.previous_value !== "" ? formatCurrency(initialData.previous_value) : "",
    };
  });

  const [totalAllocation, setTotalAllocation] = useState(0);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // New state for document upload
  const [showDocumentUpload, setShowDocumentUpload] = useState(!portfolio); // Show for new portfolios only
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  // New state for fund family filter
  const [fundFamilyFilter, setFundFamilyFilter] = useState('all');
  // New state for controlling individual fund selection popovers
  const [openPopovers, setOpenPopovers] = useState({});

  // New state for calculator instances, fetched internally
  const [calculatorInstances, setCalculatorInstances] = useState([]);
  // New state to control visibility of fund holdings section
  const [showFundHoldings, setShowFundHoldings] = useState(false);

  // Derived state for unique fund families
  const fundFamilies = [...new Set(funds.map(f => f.fund_family))].sort();

  // Effect to calculate total allocation of fund holdings
  useEffect(() => {
    const total = formData.fund_holdings.reduce((sum, holding) => sum + (parseFloat(holding.allocation_percentage) || 0), 0);
    setTotalAllocation(total);
  }, [formData.fund_holdings]);

  // Effect to fetch calculator instances and determine initial fund holdings visibility
  useEffect(() => {
    async function fetchCalculators() {
      try {
        const calcs = await CalculatorInstance.list();
        setCalculatorInstances(calcs || []);
      } catch (e) {
        console.error("Failed to fetch calculator instances", e);
        setCalculatorInstances([]); // Set to empty array on error
      }
    }
    fetchCalculators();

    // Determine if fund holdings should be shown initially
    if (portfolio?.fund_holdings && portfolio.fund_holdings.length > 0) {
      setShowFundHoldings(true);
    }
  }, [portfolio]); // Now depends on portfolio to re-fetch if context changes


  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field, type) => (e) => {
    const value = e.target.value;
    let formattedValue;
    if (type === 'currency') {
      formattedValue = formatCurrency(value);
    } else if (type === 'percentage') {
      formattedValue = formatPercentage(value);
    }
    handleChange(field, formattedValue);
  };

  const handleFocus = (field) => (e) => {
    const value = e.target.value;
    const parsed = parseValue(value);
    handleChange(field, parsed);
  };

  const handleHoldingChange = (index, field, value) => {
    const newHoldings = [...formData.fund_holdings];
    newHoldings[index] = { ...newHoldings[index], [field]: value }; // Ensure existing properties are spread
    handleChange("fund_holdings", newHoldings);
  };

  const addHolding = () => {
    handleChange("fund_holdings", [...formData.fund_holdings, { fund_id: '', allocation_percentage: "" }]); // Changed 0 to "" for better UX if using type="number"
    setShowFundHoldings(true); // Ensure fund holdings section is visible when adding a holding
  };

  const removeHolding = (index) => {
    const newHoldings = [...formData.fund_holdings];
    newHoldings.splice(index, 1);
    handleChange("fund_holdings", newHoldings); // Use handleChange
    // Also close popover if it's open for this index
    setOpenPopovers(prev => {
        const newPopovers = { ...prev };
        delete newPopovers[index];
        return newPopovers;
    });
  };

  const applyModelPortfolio = (modelId) => {
    setSelectedModelId(modelId);
    const model = models.find(m => m.id === modelId);
    if (model && model.fund_holdings) {
      setFormData(prev => ({
        ...prev,
        fund_holdings: model.fund_holdings.map(fh => ({
          fund_id: fh.fund_id,
          allocation_percentage: fh.allocation_percentage
        })),
        risk_level: model.risk_level
      }));
      setShowFundHoldings(true); // Ensure fund holdings section is visible when applying a model
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setUploadedFile({ name: file.name, url: file_url });

      // Auto-extract data after upload
      await handleExtractData(file_url, file.name);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleExtractData = async (fileUrl, fileName) => {
    setIsExtracting(true);
    try {
      const schema = {
        type: "object",
        properties: {
          account_name: { type: "string", description: "Account name or title" },
          account_number: { type: "string", description: "Account or policy number" },
          account_type: { type: "string", description: "Type of account (RRSP, TFSA, etc.)" },
          total_value: { type: "number", description: "Total portfolio or account value" },
          cash_balance: { type: "number", description: "Cash balance in the account" },
          inception_date: { type: "string", description: "Account opening date" },
          performance_ytd: { type: "number", description: "Year-to-date performance percentage" },
          performance_1yr: { type: "number", description: "1-year performance percentage" },
          fund_holdings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                fund_name: { type: "string" },
                fund_code: { type: "string" },
                allocation_percentage: { type: "number" },
                value: { type: "number" }
              }
            }
          }
        }
      };

      const result = await ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: schema
      });

      if (result.status === 'success' && result.output) {
        handleDocumentDataExtracted(result.output);
        alert('Portfolio data extracted successfully!');
      } else {
        alert(`Failed to extract data: ${result.details || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error extracting data:', error);
      alert('Failed to extract data from document. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDocumentDataExtracted = (extractedData) => {
    const updatedFormData = { ...formData };

    // Map extracted data to form fields, only if not already filled by user or initial load
    if (extractedData.account_name && !updatedFormData.account_name) {
      updatedFormData.account_name = extractedData.account_name;
    }
    if (extractedData.account_number && !updatedFormData.account_number) {
      updatedFormData.account_number = extractedData.account_number;
    }
    if (extractedData.account_type) {
      // Map common account type variations
      const typeMap = {
        'rrsp': 'rrsp', 'retirement savings plan': 'rrsp',
        'tfsa': 'tfsa', 'tax free savings': 'tfsa',
        'rrif': 'rrif', 'retirement income fund': 'rrif',
        'resp': 'resp', 'education savings': 'resp',
        'lira': 'lira', 'locked-in retirement': 'lira',
        'lif': 'lif', 'life income fund': 'lif',
        'non-registered': 'taxable', 'taxable': 'taxable',
        'corporate': 'corporate', 'trust': 'trust', 'individual': 'taxable'
      };
      const normalizedType = String(extractedData.account_type).toLowerCase(); // Ensure it's a string for .toLowerCase()
      // Find the first key in typeMap whose key is included in the normalizedType, then get its value
      const mappedValueEntry = Object.entries(typeMap).find(([key, value]) => normalizedType.includes(key));
      if (mappedValueEntry && (updatedFormData.account_type === "taxable" || !updatedFormData.account_type)) { // Only overwrite if default or empty
        updatedFormData.account_type = mappedValueEntry[1];
      }
    }
    if (extractedData.total_value && parseValue(updatedFormData.total_value) === 0) {
      updatedFormData.total_value = formatCurrency(extractedData.total_value);
    }
    if (extractedData.cash_balance && parseValue(updatedFormData.cash_balance) === 0) {
      updatedFormData.cash_balance = formatCurrency(extractedData.cash_balance);
    }
    if (extractedData.inception_date && !updatedFormData.inception_date) {
      try {
        const date = new Date(extractedData.inception_date);
        if (!isNaN(date.getTime())) {
          updatedFormData.inception_date = date.toISOString().split('T')[0];
        }
      } catch (e) {
        console.warn('Could not parse inception date:', extractedData.inception_date);
      }
    }
    if (extractedData.performance_ytd && parseValue(updatedFormData.performance_ytd) === 0) {
      updatedFormData.performance_ytd = formatPercentage(extractedData.performance_ytd);
    }
    if (extractedData.performance_1yr && parseValue(updatedFormData.performance_1yr) === 0) {
      updatedFormData.performance_1yr = formatPercentage(extractedData.performance_1yr);
    }

    // Handle fund holdings
    if (extractedData.fund_holdings && Array.isArray(extractedData.fund_holdings)) {
      const mappedHoldings = extractedData.fund_holdings.map(holding => ({
        fund_id: "", // Will need to be selected manually
        fund_name: holding.fund_name || "", // Store for display until fund_id selected
        fund_code: holding.fund_code || "", // Store for display until fund_id selected
        allocation_percentage: holding.allocation_percentage || 0
      }));
      // Append new holdings, avoid duplicates if matching fund_id/name/code exist
      const existingHoldingIdentifiers = new Set(updatedFormData.fund_holdings.map(h => {
        if (h.fund_id) return h.fund_id;
        if (h.fund_name) return h.fund_name.toLowerCase();
        if (h.fund_code) return h.fund_code.toLowerCase();
        return '';
      }).filter(Boolean));

      const newUniqueHoldings = mappedHoldings.filter(nh => {
        const identifier = (nh.fund_name || nh.fund_code || '').toLowerCase();
        return !existingHoldingIdentifiers.has(identifier);
      });

      updatedFormData.fund_holdings = [...(updatedFormData.fund_holdings || []), ...newUniqueHoldings];
      if (newUniqueHoldings.length > 0) {
        setShowFundHoldings(true); // Show fund holdings if new ones were extracted
      }
    }

    setFormData(updatedFormData);
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.account_name.trim()) {
      alert('Please enter an account name.');
      return;
    }

    if (formData.client_ids.length === 0) {
      alert('Please select at least one client.');
      return;
    }

    // Ensure numeric fields are parsed back to numbers before saving
    const submitData = {
      ...formData,
      total_value: parseValue(formData.total_value),
      cash_balance: parseValue(formData.cash_balance),
      performance_ytd: parseValue(formData.performance_ytd),
      performance_1yr: parseValue(formData.performance_1yr),
      previous_value: parseValue(formData.previous_value),
      fund_holdings: formData.fund_holdings.map(h => ({
        ...h,
        allocation_percentage: parseFloat(h.allocation_percentage) || 0
      })),
      goal_id: formData.goal_id === "" ? null : formData.goal_id, // Convert "" back to null for API
      calculator_instance_id: formData.calculator_instance_id === "" ? null : formData.calculator_instance_id // Convert "" back to null for API
    };

    console.log("Portfolio form - saving data:", submitData);

    setIsLoading(true);
    try {
      await onSave(submitData);
    } catch (error) {
      console.error("Failed to save portfolio:", error);
      alert("Failed to save portfolio. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered funds for the search functionality in Popover
  const filteredFunds = funds.filter(fund =>
    fundFamilyFilter === 'all' || fund.fund_family === fundFamilyFilter
  );

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {portfolio ? "Edit Portfolio" : "Create New Portfolio"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Document Upload Section - Only for new portfolios */}
          {showDocumentUpload && !portfolio && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-600" />
                    Upload Investment Statement
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDocumentUpload(false)}
                    aria-label="Close upload section"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  Upload an investment statement or portfolio document to automatically populate the form fields below.
                </p>

                {!uploadedFile ? (
                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="portfolio-file-upload"
                      disabled={isUploading || isExtracting}
                    />
                    <label
                      htmlFor="portfolio-file-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                          <p className="text-sm text-blue-600">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-blue-600" />
                          <p className="text-sm text-blue-600 font-medium">
                            Click to upload statement
                          </p>
                          <p className="text-xs text-slate-500">
                            Supports PDF, PNG, JPG, CSV
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                ) : (
                  <div className="bg-white border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium">{uploadedFile.name}</span>
                        {isExtracting && (
                          <div className="flex items-center gap-1 text-blue-600">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span className="text-xs">Extracting data...</span>
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeUploadedFile}
                        disabled={isExtracting}
                        aria-label="Remove uploaded file"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Toggle Document Upload Section - Only for new portfolios */}
          {!portfolio && !showDocumentUpload && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDocumentUpload(true)}
                className="text-sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Statement to Auto-Fill
              </Button>
            </div>
          )}

          {/* Basic Information */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-slate-900 mb-4">Basic Information</h3>

              {/* Client Selection */}
              <div className="mb-4">
                <Label htmlFor="clients">Associated Clients *</Label>
                <MultiClientSelector
                  clients={allClients}
                  selectedClientIds={formData.client_ids}
                  onChange={(clientIds) => handleChange("client_ids", clientIds)}
                  preselected={preselectedClientId ? [preselectedClientId] : []}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="account_name">Account Name *</Label>
                  <Input
                    id="account_name"
                    value={formData.account_name}
                    onChange={(e) => handleChange("account_name", e.target.value)}
                    placeholder="e.g., John's RRSP"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="account_number">Account Number</Label>
                  <Input
                    id="account_number"
                    value={formData.account_number}
                    onChange={(e) => handleChange("account_number", e.target.value)}
                    placeholder="e.g., 123456789"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="account_type">Account Type *</Label>
                  <Select
                    value={formData.account_type}
                    onValueChange={(value) => handleChange("account_type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rrsp">RRSP</SelectItem>
                      <SelectItem value="rrif">RRIF</SelectItem>
                      <SelectItem value="tfsa">TFSA</SelectItem>
                      <SelectItem value="resp">RESP</SelectItem>
                      <SelectItem value="lira">LIRA</SelectItem>
                      <SelectItem value="lif">LIF</SelectItem>
                      <SelectItem value="taxable">Non-Registered</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="trust">Trust</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="goal_id">Associated Goal</Label>
                  <Select
                    value={formData.goal_id || "none"} // Use "none" for Select to show placeholder when "" or null
                    onValueChange={(value) => handleChange("goal_id", value === "none" ? "" : value)} // Convert "none" back to ""
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a goal (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No associated goal</SelectItem>
                      {goals.map(goal => (
                        <SelectItem key={goal.id} value={goal.id}>
                          {goal.goal_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="risk_level">Risk Level *</Label>
                  <Select
                    value={formData.risk_level}
                    onValueChange={(value) => handleChange("risk_level", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select risk level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="inception_date">Inception Date</Label>
                  <Input
                    id="inception_date"
                    type="date"
                    value={formData.inception_date}
                    onChange={(e) => handleChange("inception_date", e.target.value)}
                  />
                </div>
              </div>

              {/* Linked Calculator Instance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="calculator_instance_id">Linked Calculator Instance</Label>
                  <Select
                    value={formData.calculator_instance_id}
                    onValueChange={(value) => {
                      console.log("Calculator selected:", value);
                      handleChange("calculator_instance_id", value === "none" ? "" : value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a calculator..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No calculator linked</SelectItem>
                      {calculatorInstances && calculatorInstances.filter(calc =>
                        calc.client_ids && calc.client_ids.some(cid => formData.client_ids.includes(cid))
                      ).map((calc) => (
                        <SelectItem key={calc.id} value={calc.id}>
                          {calc.name} ({calc.calculator_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Portfolio Holdings */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-indigo-600" />
                  Fund Holdings
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowFundHoldings(!showFundHoldings)}>
                    {showFundHoldings ? 'Hide Holdings' : 'Show Holdings'}
                  </Button>
                  <Select onValueChange={applyModelPortfolio} value={selectedModelId || ""}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Apply model portfolio" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map(model => (
                        <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={addHolding}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Fund
                  </Button>
                </div>
              </div>
            </CardHeader>
            {showFundHoldings && (
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label>Filter by Fund Family</Label>
                     <Select value={fundFamilyFilter} onValueChange={setFundFamilyFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by fund family..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Fund Families</SelectItem>
                        {fundFamilies.map(family => (
                          <SelectItem key={family} value={family}>{family}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.fund_holdings.map((holding, index) => {
                  const fund = funds.find(f => f.id === holding.fund_id); // Find fund for display details
                  return (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-start p-4 border rounded-lg bg-slate-50">
                      <div className="grid gap-1.5">
                        <Label htmlFor={`fund-${index}`}>Fund</Label>
                        <Popover open={openPopovers[index]} onOpenChange={(isOpen) => setOpenPopovers(prev => ({...prev, [index]: isOpen}))}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openPopovers[index]}
                                    className="w-full justify-between font-normal"
                                >
                                    {holding.fund_id
                                        ? fund?.name // Use fund?.name for display
                                        : (holding.fund_name || holding.fund_code || "Select a fund...")} {/* Display extracted name/code */}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                                <Command>
                                    <CommandInput placeholder="Search for a fund..." />
                                    <CommandList>
                                        <CommandEmpty>No fund found.</CommandEmpty>
                                        <CommandGroup>
                                            {filteredFunds.map((f) => ( // Use 'f' for fund to avoid conflict with outer 'fund'
                                                <CommandItem
                                                    key={f.id}
                                                    value={`${f.name} ${f.fund_code} ${f.fund_family}`} // Include fund_family in search
                                                    onSelect={() => {
                                                        handleHoldingChange(index, "fund_id", f.id);
                                                        setOpenPopovers(prev => ({...prev, [index]: false}));
                                                    }}
                                                >
                                                    <div>
                                                        <p>{f.name}</p>
                                                        <p className="text-xs text-slate-500">{f.fund_code} &bull; {f.fund_family}</p>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        {fund && (
                          <div className="flex gap-2 mt-1 text-sm text-gray-600">
                            <span className="text-xs border rounded-full px-2 py-0.5 bg-gray-100">{fund.fund_family}</span>
                            <span className="text-xs border rounded-full px-2 py-0.5 bg-gray-100">{fund.category}</span>
                          </div>
                        )}
                        {!holding.fund_id && (holding.fund_name || holding.fund_code) && (
                            <p className="text-xs text-orange-600 mt-1">
                                <AlertTriangle className="inline w-3 h-3 mr-1" />
                                Fund "{holding.fund_name || holding.fund_code}" extracted from document. Please select a matching fund.
                            </p>
                        )}
                      </div>

                      <div className="grid gap-1.5">
                        <Label htmlFor={`allocation-${index}`}>Allocation %</Label>
                        <Input
                          id={`allocation-${index}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={holding.allocation_percentage}
                          onChange={(e) => handleHoldingChange(index, 'allocation_percentage', parseFloat(e.target.value) || 0)}
                          className="w-28 text-right"
                        />
                      </div>
                      <div className="flex items-end h-full">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => removeHolding(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {formData.fund_holdings.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <Building className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>No funds added yet. Click "Add Fund" or apply a model portfolio to get started.</p>
                    </div>
                  )}

                {formData.fund_holdings.length > 0 && totalAllocation !== 100 && (
                  <Alert variant="default" className="bg-amber-50 border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      Total allocation is {totalAllocation.toFixed(2)}%. {totalAllocation < 100 ? ' Consider adding more funds or increasing allocations.' : ' Please reduce allocations to total 100%.'}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            )}
          </Card>

          {/* Portfolio Values */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-slate-900 mb-4">Portfolio Values</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total_value">Total Portfolio Value ($) *</Label>
                  <Input
                    id="total_value"
                    type="text"
                    value={formData.total_value}
                    onChange={(e) => handleChange("total_value", e.target.value)}
                    onBlur={handleBlur("total_value", "currency")}
                    onFocus={handleFocus("total_value")}
                    placeholder="$0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cash_balance">Cash Balance ($)</Label>
                  <Input
                    id="cash_balance"
                    type="text"
                    value={formData.cash_balance}
                    onChange={(e) => handleChange("cash_balance", e.target.value)}
                    onBlur={handleBlur("cash_balance", "currency")}
                    onFocus={handleFocus("cash_balance")}
                    placeholder="$0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Tracking */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-slate-900 mb-4">Performance Tracking</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="performance_ytd">YTD Performance (%)</Label>
                  <Input
                    id="performance_ytd"
                    type="text"
                    value={formData.performance_ytd}
                    onChange={(e) => handleChange("performance_ytd", e.target.value)}
                    onBlur={handleBlur("performance_ytd", "percentage")}
                    onFocus={handleFocus("performance_ytd")}
                    placeholder="0.00%"
                  />
                </div>
                <div>
                  <Label htmlFor="performance_1yr">1-Year Performance (%)</Label>
                  <Input
                    id="performance_1yr"
                    type="text"
                    value={formData.performance_1yr}
                    onChange={(e) => handleChange("performance_1yr", e.target.value)}
                    onBlur={handleBlur("performance_1yr", "percentage")}
                    onFocus={handleFocus("performance_1yr")}
                    placeholder="0.00%"
                  />
                </div>
                <div>
                  <Label htmlFor="previous_value">Previous Statement Value ($)</Label>
                  <Input
                    id="previous_value"
                    type="text"
                    value={formData.previous_value}
                    onChange={(e) => handleChange("previous_value", e.target.value)}
                    onBlur={handleBlur("previous_value", "currency")}
                    onFocus={handleFocus("previous_value")}
                    placeholder="$0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || isUploading || isExtracting}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading || isUploading || isExtracting}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {portfolio ? "Update Portfolio" : "Create Portfolio"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
