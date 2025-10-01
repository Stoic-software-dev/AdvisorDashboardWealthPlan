
import React, { useState, useEffect, useImperativeHandle, forwardRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, User, Users, Target, Calculator, Undo2, Loader2, Download } from "lucide-react";
import { Client, NetWorthStatement, Asset, Liability } from "@/api/entities";
import { differenceInYears } from "date-fns";
import MultiClientSelector from '../shared/MultiClientSelector';
import { Switch } from "@/components/ui/switch"; // Added Switch import
import { toast } from "@/components/ui/use-toast";
import { generateInsuranceNeedsPdf } from "@/api/functions";

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

const emptyFormData = {
  calculator_name: "",
  client_ids: [],
  spouse_id: "",
  client_age: '',
  client_income: 0,
  spouse_age: '',
  spouse_income: 0,
  liquid_assets: 0, // Changed from capital_assets
  illiquid_assets: 0, // Added illiquid_assets
  total_debt: 0,
  client_income_recovery_perc: 75,
  spouse_income_recovery_perc: 75,
  years_of_income_needed: 20,
  investment_return_rate: 5,
  inflation_rate: 2,
  final_expenses: 15000,
  education_fund: 0,
  existing_life_insurance_client: 0,
  existing_life_insurance_spouse: 0,
};

function InsuranceNeedsAnalysisCalculator({ clients = [], goals, portfolios, isLoading, preselectedClientId, initialState, isViewer = false, onNameChange }, ref) {
  const [formData, setFormData] = useState(() => {
    let initialClientIds = [];
    if (preselectedClientId) {
      initialClientIds = [preselectedClientId];
    } else if (initialState?.formData?.client_ids) {
      initialClientIds = initialState.formData.client_ids;
    } else if (initialState?.formData?.client_id) { // Handle old single client_id
      initialClientIds = [initialState.formData.client_id];
    }

    return {
      ...emptyFormData,
      ...initialState?.formData, // Merge existing initial state data
      client_ids: initialClientIds,
      calculator_name: initialState?.formData?.calculator_name || "",
    };
  });

  const [displayValues, setDisplayValues] = useState({});
  const [results, setResults] = useState(null);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [projectionData, setProjectionData] = useState([]);
  const [includeIlliquidAssets, setIncludeIlliquidAssets] = useState(true); // New state for toggle
  const [isExporting, setIsExporting] = useState(false);

  useImperativeHandle(ref, () => ({
    getState: () => ({ formData })
  }));

  // Effect to update formData from external initialState prop
  useEffect(() => {
    if (initialState?.formData) {
      // Handle both old client_id format and new client_ids format
      const clientIds = initialState.formData.client_ids ||
                       (initialState.formData.client_id ? [initialState.formData.client_id] : []) ||
                       (preselectedClientId ? [preselectedClientId] : []); // Ensure preselectedClientId is considered if others are empty

      const safeFormData = {
        ...emptyFormData, // Start with clean empty state
        ...initialState.formData, // Overlay with initialState
        client_ids: clientIds.length > 0 ? clientIds : (preselectedClientId ? [preselectedClientId] : []), // Final check for client_ids
        calculator_name: initialState.formData.calculator_name || "",
      };
      setFormData(safeFormData);
    } else {
      // If initialState is cleared, reset to default empty form but keep preselected client
      setFormData({
        ...emptyFormData,
        client_ids: preselectedClientId ? [preselectedClientId] : [],
      });
    }
  }, [initialState, preselectedClientId]);

  // Effect to update displayValues whenever formData changes (specifically for currency fields)
  useEffect(() => {
    setDisplayValues({
      client_income: formatCurrency(formData.client_income),
      spouse_income: formatCurrency(formData.spouse_income),
      liquid_assets: formatCurrency(formData.liquid_assets), // Updated
      illiquid_assets: formatCurrency(formData.illiquid_assets), // Added
      total_debt: formatCurrency(formData.total_debt),
      final_expenses: formatCurrency(formData.final_expenses),
      education_fund: formatCurrency(formData.education_fund),
      existing_life_insurance_client: formatCurrency(formData.existing_life_insurance_client),
      existing_life_insurance_spouse: formatCurrency(formData.existing_life_insurance_spouse),
    });
  }, [
    formData.client_income,
    formData.spouse_income,
    formData.liquid_assets, // Updated
    formData.illiquid_assets, // Added
    formData.total_debt,
    formData.final_expenses,
    formData.education_fund,
    formData.existing_life_insurance_client,
    formData.existing_life_insurance_spouse,
  ]);

  const handleFormDataChange = useCallback((field, value) => {
    // Handle special "no selection" values
    let finalValue = value;
    if (value === 'no_spouse') {
      finalValue = '';
    }
    
    if (field === 'calculator_name' && onNameChange) {
      onNameChange(value);
    }
    setFormData(prev => ({ ...prev, [field]: finalValue }));
  }, [onNameChange]);

  // Helper function to load financial data for a given client ID
  const loadClientFinancialData = useCallback(async (clientId) => {
    if (!clientId) {
      setFormData(prev => ({
        ...prev,
        client_income: 0,
        liquid_assets: 0, // Updated
        illiquid_assets: 0, // Added
        total_debt: 0,
      }));
      return;
    }

    setIsFetchingData(true);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      let fetchedLiquidAssets = 0;
      let fetchedIlliquidAssets = 0;
      let fetchedDebt = 0;
      try {
        const statements = await NetWorthStatement.filter({ client_ids: [client.id] }, '-statement_date', 1);
        if (statements && statements.length > 0) {
          const latestStatementId = statements[0].id;
          const [assets, liabilities] = await Promise.all([
            Asset.filter({ statement_id: latestStatementId }),
            Liability.filter({ statement_id: latestStatementId })
          ]);
          
          (assets || []).forEach(asset => {
            const value = asset.asset_value || 0;
            if (['Principal Residence', 'Investment Real Estate', 'Other Real Estate'].includes(asset.asset_category)) {
              fetchedIlliquidAssets += value;
            } else {
              fetchedLiquidAssets += value;
            }
          });

          fetchedDebt = (liabilities || []).reduce((sum, liability) => sum + (liability.liability_value || 0), 0);
        }
      } catch (error) {
        console.error("Error fetching net worth data:", error);
      }

      setFormData(prev => ({
        ...prev,
        client_income: client.annual_income || 0,
        liquid_assets: fetchedLiquidAssets,
        illiquid_assets: fetchedIlliquidAssets,
        total_debt: fetchedDebt,
      }));
    }
    setIsFetchingData(false);
  }, [clients]); // Removed setFormData from dependencies as it's a state setter

  // Derive primary client and available spouses
  const primaryClientId = formData.client_ids?.[0];
  const primaryClient = clients.find(c => c.id === primaryClientId);

  const availableSpouses = useMemo(() => {
    if (!primaryClient) return [];

    let householdMembers = [];
    if (primaryClient.primary_client_id) { // If the selected primary client is actually a secondary client
      householdMembers = clients.filter(c => c.primary_client_id === primaryClient.primary_client_id && c.id !== primaryClient.id);
    } else { // If the selected primary client is a true primary client
      householdMembers = clients.filter(c => c.primary_client_id === primaryClient.id && c.id !== primaryClient.id);
    }
    return householdMembers;
  }, [primaryClient, clients]);


  // Effect to update primary client's age, and load financial data and manage spouse options
  useEffect(() => {
    const primaryClientId = formData.client_ids?.[0];

    if (!primaryClientId) {
      handleFormDataChange('client_age', '');
      handleFormDataChange('client_income', 0);
      handleFormDataChange('liquid_assets', 0);
      handleFormDataChange('illiquid_assets', 0);
      handleFormDataChange('total_debt', 0);
      handleFormDataChange('spouse_id', '');
      handleFormDataChange('spouse_age', '');
      handleFormDataChange('spouse_income', 0);
      return;
    }

    const primaryClient = clients.find(c => c.id === primaryClientId);
    if (primaryClient) {
      // Update age based on primary client
      const age = primaryClient.date_of_birth ? differenceInYears(new Date(), new Date(primaryClient.date_of_birth)) : '';
      handleFormDataChange('client_age', age);

      // Keep spouse_id if still valid within the new household, otherwise clear
      const currentSpouseId = formData.spouse_id;
      const newSpouseId = availableSpouses.some(s => s.id === currentSpouseId) ? currentSpouseId : '';
      handleFormDataChange('spouse_id', newSpouseId);

      // Load financial data for primary client
      loadClientFinancialData(primaryClientId);

    } else {
      // Primary client not found (e.g., clients prop not loaded yet)
      handleFormDataChange('client_age', '');
      loadClientFinancialData(null); // Clear financial data
    }
  }, [formData.client_ids, clients, availableSpouses, handleFormDataChange, loadClientFinancialData, formData.spouse_id]); // Added missing dependencies

  // Effect to update spouse data when spouse_id changes
  useEffect(() => {
    const fetchSpouseData = () => {
      if (formData.spouse_id) {
        const spouse = clients.find(c => c.id === formData.spouse_id);
        if (spouse) {
          const age = spouse.date_of_birth ? differenceInYears(new Date(), new Date(spouse.date_of_birth)) : '';
          setFormData(prev => ({ ...prev, spouse_age: age, spouse_income: spouse.annual_income || 0 }));
        } else {
          // Spouse ID selected but spouse object not found, reset spouse data
          setFormData(prev => ({ ...prev, spouse_age: '', spouse_income: 0 }));
        }
      } else {
        setFormData(prev => ({ ...prev, spouse_age: '', spouse_income: 0 }));
      }
    };
    fetchSpouseData();
  }, [formData.spouse_id, clients]); // Dependency on spouse_id and full clients array


  const handleDisplayChange = (field, value) => {
    setDisplayValues(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field) => {
    const rawValue = parseValue(displayValues[field]);
    const parsed = parseFloat(rawValue);
    const finalValue = !isNaN(parsed) ? parsed : 0;
    handleFormDataChange(field, finalValue);
  };

  const handleFocus = (field) => {
    // When focus, remove formatting for easier editing
    setDisplayValues(prev => ({ ...prev, [field]: parseValue(prev[field]) }));
  };

  const handleClearFields = () => {
    // Keep the current selected clients and calculator name, clear other calculable fields
    setFormData({
      ...emptyFormData,
      client_ids: formData.client_ids,
      calculator_name: formData.calculator_name
    });
    setResults(null);
    setProjectionData([]); // Clear projection data
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
        const payload = { formData, results, projectionData, clientName, spouseName };
        const response = await generateInsuranceNeedsPdf(payload);

        if (response && response.data) {
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Insurance Needs Report - ${formData.calculator_name || 'Scenario'}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast.success("PDF report generated successfully!");
        } else {
            toast.error("Failed to generate PDF.");
        }
    } catch (error) {
        console.error("Error exporting PDF:", error);
        toast.error("Failed to generate PDF. Please try again.");
    } finally {
        setIsExporting(false);
    }
  };

  const handleCalculate = () => {
    // PV of an annuity formula for income replacement
    const pv = (rate, nper, pmt) => {
      if (rate === 0) return pmt * nper;
      return pmt * (1 - Math.pow(1 + rate, -nper)) / rate;
    };

    const realReturnRate = ((1 + (formData.investment_return_rate / 100)) / (1 + (formData.inflation_rate / 100))) - 1;

    // Conditionally determine which assets to include in the calculation
    const assetsToConsider = parseFloat(formData.liquid_assets) + (includeIlliquidAssets ? parseFloat(formData.illiquid_assets) : 0);

    // --- Calculation for when CLIENT passes (Overall Current Need) ---
    const clientIncomeToReplace = parseFloat(formData.client_income) * (parseFloat(formData.client_income_recovery_perc) / 100);
    const capitalForClientIncome = pv(realReturnRate, parseFloat(formData.years_of_income_needed), clientIncomeToReplace);

    const totalNeedsClientDies = capitalForClientIncome + parseFloat(formData.total_debt) + parseFloat(formData.final_expenses) + parseFloat(formData.education_fund);
    const totalAssetsClientDies = assetsToConsider + parseFloat(formData.existing_life_insurance_client);
    const insuranceNeedOnClient = Math.max(0, totalNeedsClientDies - totalAssetsClientDies);

    // --- Calculation for when SPOUSE passes (Overall Current Need) ---
    let insuranceNeedOnSpouse = 0;
    if (formData.spouse_id) {
      const spouseIncomeToReplace = parseFloat(formData.spouse_income) * (parseFloat(formData.spouse_income_recovery_perc) / 100);
      const capitalForSpouseIncome = pv(realReturnRate, parseFloat(formData.years_of_income_needed), spouseIncomeToReplace);

      const totalNeedsSpouseDies = capitalForSpouseIncome + parseFloat(formData.total_debt) + parseFloat(formData.final_expenses) + parseFloat(formData.education_fund);
      const totalAssetsSpouseDies = assetsToConsider + parseFloat(formData.existing_life_insurance_spouse);
      insuranceNeedOnSpouse = Math.max(0, totalNeedsSpouseDies - totalAssetsSpouseDies);
    }

    setResults({
      insuranceNeedOnClient,
      insuranceNeedOnSpouse
    });

    // --- New Projection Logic for Client (adapting to outline's columns) ---
    const numericClientAge = parseFloat(formData.client_age);
    const currentYear = new Date().getFullYear();
    let tempProjections = [];

    // Only project if client age is valid and years needed > 0
    if (!isNaN(numericClientAge) && numericClientAge > 0 && parseFloat(formData.years_of_income_needed) > 0) {
      const projectionDuration = parseFloat(formData.years_of_income_needed) + 5; // Project a few years beyond income need to show decline

      for (let yearOffset = 0; yearOffset <= projectionDuration; yearOffset++) {
        const projectedYear = currentYear + yearOffset;
        const projectedAge = numericClientAge + yearOffset;

        // Income Replacement (PV of remaining income stream from projected year)
        const remainingYearsIncomeForProjection = Math.max(0, parseFloat(formData.years_of_income_needed) - yearOffset);
        // Inflate the annual income amount to the projected year of death
        const annualIncomeAmountInflated = (parseFloat(formData.client_income) * (parseFloat(formData.client_income_recovery_perc) / 100)) * Math.pow(1 + (parseFloat(formData.inflation_rate) / 100), yearOffset);
        const incomeReplacementProjection = pv(realReturnRate, remainingYearsIncomeForProjection, annualIncomeAmountInflated);

        // Other needs, inflated to the projected year of death
        const debtCoverageProjection = parseFloat(formData.total_debt) * Math.pow(1 + (parseFloat(formData.inflation_rate) / 100), yearOffset);
        const finalExpensesProjection = parseFloat(formData.final_expenses) * Math.pow(1 + (parseFloat(formData.inflation_rate) / 100), yearOffset);
        const educationFundProjection = parseFloat(formData.education_fund) * Math.pow(1 + (parseFloat(formData.inflation_rate) / 100), yearOffset);

        // Total Need for the projected year (sum of these inflated gross needs)
        // Includes education fund, as it's a core need in this calculator
        const totalProjectedNeed = incomeReplacementProjection + debtCoverageProjection + finalExpensesProjection + educationFundProjection;

        // Existing Coverage (based on outline, implies existing life insurance only for this column)
        // Note: This 'existingCoverage' in the table typically refers to existing life insurance policies only.
        // It does NOT include capital assets which are used in the overall `insuranceNeedOnClient` calculation.
        // This means the `gap` shown in the projection table may be higher than the initial `insuranceNeedOnClient` if capital assets are significant.
        const existingCoverageProjection = parseFloat(formData.existing_life_insurance_client);

        // Insurance Gap for the projected year
        const insuranceGapProjection = Math.max(0, totalProjectedNeed - existingCoverageProjection);

        tempProjections.push({
          year: projectedYear,
          age: projectedAge,
          incomeReplacement: incomeReplacementProjection,
          debtCoverage: debtCoverageProjection,
          finalExpenses: finalExpensesProjection,
          educationFund: educationFundProjection,
          totalNeed: totalProjectedNeed,
          existingCoverage: existingCoverageProjection,
          gap: insuranceGapProjection
        });
      }
    }
    setProjectionData(tempProjections);
  };

  const clientName = primaryClient ? primaryClient.first_name : 'Client';
  const spouseName = formData.spouse_id ? clients.find(c => c.id === formData.spouse_id)?.first_name : 'Spouse';

  // Get goals for the selected clients (as per outline)
  const clientGoals = formData.client_ids && formData.client_ids.length > 0
    ? (goals || []).filter(goal => {
      const goalClientIds = goal.client_ids || (goal.client_id ? [goal.client_id] : []);
      return formData.client_ids.some(selectedId => goalClientIds.includes(selectedId));
    })
    : [];

  return (
    <fieldset disabled={isViewer} className="space-y-6">
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              Insurance Needs Analysis
            </CardTitle>
            {!isViewer && (
              <div className="flex gap-2">
                <Button onClick={handleExportPdf} disabled={isExporting || !results} variant="outline">
                  {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  {isExporting ? 'Exporting...' : 'Export PDF'}
                </Button>
                <Button onClick={handleCalculate} className="bg-green-600 hover:bg-green-700">
                  <Calculator className="w-4 h-4 mr-2" />
                  Calculate
                </Button>
                <Button variant="outline" onClick={handleClearFields}>
                  <Undo2 className="w-4 h-4 mr-2" />
                  Clear Fields
                </Button>
              </div>
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
                onSelectionChange={(selectedIds) => {
                  handleFormDataChange('client_ids', selectedIds);
                }}
                disabled={isViewer}
                placeholder="Select clients..."
              />
            </div>
          </div>

          {formData.client_ids && formData.client_ids.length > 0 && (
            <div className="mt-4">
              <Label htmlFor="spouse_id">Select Spouse (Optional)</Label>
              <Select
                value={formData.spouse_id || 'no_spouse'}
                onValueChange={(v) => handleFormDataChange("spouse_id", v)}
                disabled={!formData.client_ids || formData.client_ids.length === 0 || availableSpouses.length === 0 || isViewer}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select spouse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_spouse">No Spouse</SelectItem>
                  {availableSpouses.map(spouse => (
                    <SelectItem key={spouse.id} value={spouse.id}>
                      {spouse.first_name} {spouse.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader><CardTitle>Shared Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Liquid Assets (from last NWS)</Label>
              <Input
                value={displayValues.liquid_assets || ''}
                disabled
                className="bg-slate-100"
              />
            </div>
             <div>
              <Label>Illiquid Assets (from last NWS)</Label>
              <Input
                value={displayValues.illiquid_assets || ''}
                disabled
                className="bg-slate-100"
              />
            </div>
            <div>
              <Label>Total Debt (from last NWS)</Label>
              <Input
                value={displayValues.total_debt || ''}
                onChange={(e) => handleDisplayChange('total_debt', e.target.value)}
                onBlur={() => handleBlur('total_debt')}
                onFocus={() => handleFocus('total_debt')}
              />
            </div>
            <div>
              <Label>Final Expenses Estimate</Label>
              <Input
                value={displayValues.final_expenses || ''}
                onChange={(e) => handleDisplayChange('final_expenses', e.target.value)}
                onBlur={() => handleBlur('final_expenses')}
                onFocus={() => handleFocus('final_expenses')}
              />
            </div>
            <div>
              <Label>Education Fund Goal</Label>
              <Input
                value={displayValues.education_fund || ''}
                onChange={(e) => handleDisplayChange('education_fund', e.target.value)}
                onBlur={() => handleBlur('education_fund')}
                onFocus={() => handleFocus('education_fund')}
              />
            </div>
             <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="include-illiquid"
                checked={includeIlliquidAssets}
                onCheckedChange={setIncludeIlliquidAssets}
                disabled={isViewer}
              />
              <Label htmlFor="include-illiquid">Include Illiquid Assets in Calculation</Label>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader><CardTitle>Assumptions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Years of Income Needed</Label>
              <Input type="number" value={formData.years_of_income_needed} onChange={(e) => handleFormDataChange('years_of_income_needed', e.target.value)} />
            </div>
            <div>
              <Label>Investment Rate of Return (%)</Label>
              <Input type="number" value={formData.investment_return_rate} onChange={(e) => handleFormDataChange('investment_return_rate', e.target.value)} />
            </div>
            <div>
              <Label>Inflation Rate (%)</Label>
              <Input type="number" value={formData.inflation_rate} onChange={(e) => handleFormDataChange('inflation_rate', e.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client Section */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader><CardTitle>{clientName}'s Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Age</Label><Input type="number" value={formData.client_age || ''} onChange={(e) => handleFormDataChange('client_age', e.target.value)} /></div>
              <div>
                <Label>Annual Income</Label>
                <Input
                  value={displayValues.client_income || ''}
                  onChange={(e) => handleDisplayChange('client_income', e.target.value)}
                  onBlur={() => handleBlur('client_income')}
                  onFocus={() => handleFocus('client_income')}
                />
              </div>
            </div>
            <div>
              <Label>Income Recovery (%)</Label>
              <Input type="number" value={formData.client_income_recovery_perc} onChange={(e) => handleFormDataChange('client_income_recovery_perc', e.target.value)} />
            </div>
            <div>
              <Label>Existing Life Insurance</Label>
              <Input
                value={displayValues.existing_life_insurance_client || ''}
                onChange={(e) => handleDisplayChange('existing_life_insurance_client', e.target.value)}
                onBlur={() => handleBlur('existing_life_insurance_client')}
                onFocus={() => handleFocus('existing_life_insurance_client')}
              />
            </div>
            {results && (
              <div className="pt-4 text-center">
                <Label className="text-lg">Overall Insurance Need (Time 0)</Label>
                <div className="text-3xl font-bold text-green-600">{formatCurrency(results.insuranceNeedOnClient)}</div>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Spouse Section */}
        <Card className={`border-none shadow-lg bg-white/80 backdrop-blur-sm ${!formData.spouse_id && 'opacity-50'}`}>
          <CardHeader><CardTitle>{spouseName}'s Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Age</Label><Input type="number" value={formData.spouse_age || ''} onChange={(e) => handleFormDataChange('spouse_age', e.target.value)} disabled={!formData.spouse_id} /></div>
              <div>
                <Label>Annual Income</Label>
                <Input
                  value={displayValues.spouse_income || ''}
                  onChange={(e) => handleDisplayChange('spouse_income', e.target.value)}
                  onBlur={() => handleBlur('spouse_income')}
                  onFocus={() => handleFocus('spouse_income')}
                  disabled={!formData.spouse_id}
                />
              </div>
            </div>
            <div>
              <Label>Income Recovery (%)</Label>
              <Input type="number" value={formData.spouse_income_recovery_perc} onChange={(e) => handleFormDataChange('spouse_income_recovery_perc', e.target.value)} disabled={!formData.spouse_id} />
            </div>
            <div>
              <Label>Existing Life Insurance</Label>
              <Input
                value={displayValues.existing_life_insurance_spouse || ''}
                onChange={(e) => handleDisplayChange('existing_life_insurance_spouse', e.target.value)}
                onBlur={() => handleBlur('existing_life_insurance_spouse')}
                onFocus={() => handleFocus('existing_life_insurance_spouse')}
                disabled={!formData.spouse_id}
              />
            </div>
            {results && formData.spouse_id && (
              <div className="pt-4 text-center">
                <Label className="text-lg">Overall Insurance Need (Time 0)</Label>
                <div className="text-3xl font-bold text-green-600">{formatCurrency(results.insuranceNeedOnSpouse)}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {projectionData.length > 0 && (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader><CardTitle>Projected Insurance Need (for {clientName})</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3">Year</th>
                    <th className="text-left p-3">Age</th>
                    <th className="text-right p-3">Income Replacement</th>
                    <th className="text-right p-3">Debt Coverage</th>
                    <th className="text-right p-3">Final Expenses</th>
                    <th className="text-right p-3">Education Fund</th>
                    <th className="text-right p-3">Total Need</th>
                    <th className="text-right p-3">Existing Coverage</th>
                    <th className="text-right p-3 font-semibold">Insurance Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {projectionData.map((row, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-3 font-medium">{row.year}</td>
                      <td className="p-3 font-medium">{row.age}</td>
                      <td className="p-3 text-right">{formatCurrency(row.incomeReplacement)}</td>
                      <td className="p-3 text-right">{formatCurrency(row.debtCoverage)}</td>
                      <td className="p-3 text-right">{formatCurrency(row.finalExpenses)}</td>
                      <td className="p-3 text-right">{formatCurrency(row.educationFund)}</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(row.totalNeed)}</td>
                      <td className="p-3 text-right">{formatCurrency(row.existingCoverage)}</td>
                      <td className="p-3 text-right font-bold text-red-600">{formatCurrency(row.gap)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </fieldset>
  );
}

export default forwardRef(InsuranceNeedsAnalysisCalculator);
