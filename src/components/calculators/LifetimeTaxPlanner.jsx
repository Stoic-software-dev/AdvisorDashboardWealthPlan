
import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { Calculator, ShieldCheck, DollarSign, BarChart2, TrendingUp, RotateCcw, Table, WandSparkles, Loader2 } from "lucide-react";
import MultiClientSelector from "../shared/MultiClientSelector";
import GiuseppeAIOptimizer from "../shared/GiuseppeAIOptimizer";
import { differenceInYears } from "date-fns";
import { InvokeLLM } from "@/api/integrations";
import { TaxBracket } from "@/api/entities"; // Import TaxBracket entity

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  // Handle '∞' string directly for display purposes
  if (value === '∞') return '∞';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  // Ensure "Infinity" is displayed as "No Limit" or similar for thresholds
  if (num === Infinity) return "No Limit";
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
  client_ids: [],
  calculator_name: "Lifetime Tax Plan",
  current_age: 45,
  retirement_age: 65,
  life_expectancy: 95,
  inflation_rate: 2.5,
  
  // Income
  employment_income: 100000,
  employment_end_age: 65,
  cpp_start_age: 65,
  cpp_annual_amount: 15000,
  oas_start_age: 65,
  oas_annual_amount: 8000,
  
  // Assets
  non_reg_balance: 50000,
  non_reg_growth_rate: 6,
  non_reg_annual_contribution: 5000,
  
  rrsp_balance: 200000,
  rrsp_growth_rate: 6,
  rrsp_annual_contribution: 10000,
  
  tfsa_balance: 75000,
  tfsa_growth_rate: 6,
  tfsa_annual_contribution: 7000,
  
  // Strategy
  withdrawal_order: "non_reg_rrsp_tfsa", // non_reg_rrsp_tfsa, rrsp_non_reg_tfsa
  retirement_annual_spending: 60000,
  province: "ON", // Add province to form data
};

const LifetimeTaxPlanner = forwardRef(({ initialState, clients, goals, portfolios, isLoading, preselectedClientId, isViewer = false, onNameChange }, ref) => {
  const [formData, setFormData] = useState(emptyFormData);
  const [displayValues, setDisplayValues] = useState({});
  const [results, setResults] = useState(null);
  const [projectionData, setProjectionData] = useState([]);
  const [viewMode, setViewMode] = useState("summary");

  // New states for tax brackets from entity
  const [taxBrackets, setTaxBrackets] = useState([]);
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [taxRateFetchError, setTaxRateFetchError] = useState(null);

  useEffect(() => {
    // Sync display values when formData changes
    setDisplayValues({
      inflation_rate: formatPercentage(formData.inflation_rate),
      employment_income: formatCurrency(formData.employment_income),
      cpp_annual_amount: formatCurrency(formData.cpp_annual_amount),
      oas_annual_amount: formatCurrency(formData.oas_annual_amount),
      non_reg_balance: formatCurrency(formData.non_reg_balance),
      non_reg_growth_rate: formatPercentage(formData.non_reg_growth_rate),
      non_reg_annual_contribution: formatCurrency(formData.non_reg_annual_contribution),
      rrsp_balance: formatCurrency(formData.rrsp_balance),
      rrsp_growth_rate: formatPercentage(formData.rrsp_growth_rate),
      rrsp_annual_contribution: formatCurrency(formData.rrsp_annual_contribution),
      tfsa_balance: formatCurrency(formData.tfsa_balance),
      tfsa_growth_rate: formatPercentage(formData.tfsa_growth_rate),
      tfsa_annual_contribution: formatCurrency(formData.tfsa_annual_contribution),
      retirement_annual_spending: formatCurrency(formData.retirement_annual_spending),
    });
  }, [formData]);

  const handleUpdateTaxRates = useCallback(async (province) => {
    setIsFetchingRates(true);
    setTaxRateFetchError(null);
    try {
        const currentYear = new Date().getFullYear();
        const storedBrackets = await TaxBracket.filter({ year: currentYear, province: province });

        if (storedBrackets && storedBrackets.length > 0) {
            setTaxBrackets(storedBrackets[0].brackets);
        } else {
            // Fallback to previous year if current year not found
            const lastYearBrackets = await TaxBracket.filter({ year: currentYear - 1, province: province });
            if (lastYearBrackets && lastYearBrackets.length > 0) {
                setTaxBrackets(lastYearBrackets[0].brackets);
                setTaxRateFetchError(`Could not find ${currentYear} rates for ${province}. Using ${currentYear - 1} data.`);
            } else {
                setTaxBrackets([]);
                setTaxRateFetchError(`No tax data found for ${province}. Please set rates in Advisor Settings.`);
            }
        }
    } catch (error) {
        console.error("Failed to fetch tax rates from database:", error);
        setTaxRateFetchError(`Failed to fetch tax rates. Please check settings.`);
        setTaxBrackets([]);
    } finally {
        setIsFetchingRates(false);
    }
  }, []); // Dependencies are empty because state setters are stable, and TaxBracket is an imported entity

  useEffect(() => {
    if (initialState?.formData) {
      setFormData({ ...emptyFormData, ...initialState.formData });
      if (initialState.results) {
        setResults(initialState.results);
        setProjectionData(initialState.projectionData || []);
      }
      // If initial state includes custom tax brackets, load them
      if (initialState.taxBrackets) {
        setTaxBrackets(initialState.taxBrackets);
      } else {
        // Fetch brackets if not in initial state
        handleUpdateTaxRates(initialState.formData.province || 'ON');
      }
    } else {
      // Fetch for default province on initial load
      handleUpdateTaxRates('ON');
    }
  }, [initialState, handleUpdateTaxRates]);

  const handleFormDataChange = useCallback((field, value) => {
    if (field === 'calculator_name' && onNameChange) {
        onNameChange(value);
    }
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, [onNameChange]);

  useEffect(() => {
    const primaryClientId = formData.client_ids?.[0];
    if (primaryClientId && clients) {
      const client = clients.find(c => c.id === primaryClientId);
      if (client && client.date_of_birth) {
        const age = differenceInYears(new Date(), new Date(client.date_of_birth));
        handleFormDataChange('current_age', age);
      }
    }
  }, [formData.client_ids, clients, handleFormDataChange]);
  
  useEffect(() => {
    // When province changes, fetch new tax brackets
    if(formData.province) {
        handleUpdateTaxRates(formData.province);
    }
  }, [formData.province, handleUpdateTaxRates]);

  useImperativeHandle(ref, () => ({
    getState: () => ({
      formData,
      results,
      projectionData,
      taxBrackets,
    })
  }));

  const handleDisplayChange = (field, value) => {
    setDisplayValues(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field, type) => {
    const rawValue = parseValue(displayValues[field]);
    const finalValue = parseFloat(rawValue) || 0;
    handleFormDataChange(field, finalValue);
  };

  const handleFocus = (field) => {
    setDisplayValues(prev => ({ ...prev, [field]: parseValue(prev[field]) }));
  };
  
  const calculateTaxes = (taxableIncome) => {
    let totalTax = 0;
    let lastThreshold = 0;

    for (const bracket of taxBrackets) {
        if (taxableIncome > lastThreshold) {
            const incomeInBracket = Math.min(taxableIncome - lastThreshold, (bracket.max_income || Infinity) - lastThreshold);
            totalTax += incomeInBracket * (bracket.rate / 100);
        }
        lastThreshold = bracket.max_income || Infinity;
        if (lastThreshold === Infinity) break;
    }
    
    return { totalTax };
  };

  const runSimulation = () => {
    let nonReg = parseFloat(formData.non_reg_balance) || 0;
    let rrsp = parseFloat(formData.rrsp_balance) || 0;
    let tfsa = parseFloat(formData.tfsa_balance) || 0;
    
    let cumulativeTaxes = 0;
    const projection = [];

    for (let age = formData.current_age; age <= formData.life_expectancy; age++) {
      // 1. Determine Income for the year
      let employmentIncome = age < formData.employment_end_age ? (formData.employment_income * Math.pow(1 + formData.inflation_rate / 100, age - formData.current_age)) : 0;
      let cppIncome = age >= formData.cpp_start_age ? (formData.cpp_annual_amount * Math.pow(1 + formData.inflation_rate / 100, age - formData.current_age)) : 0;
      let oasIncome = age >= formData.oas_start_age ? (formData.oas_annual_amount * Math.pow(1 + formData.inflation_rate / 100, age - formData.current_age)) : 0;
      
      // 2. Contributions & Growth (Pre-withdrawal)
      let nonRegContribution = age < formData.retirement_age ? formData.non_reg_annual_contribution : 0;
      let rrspContribution = age < formData.retirement_age ? formData.rrsp_annual_contribution : 0;
      let tfsaContribution = age < formData.retirement_age ? formData.tfsa_annual_contribution : 0;

      nonReg += nonRegContribution;
      rrsp += rrspContribution;
      tfsa += tfsaContribution;

      nonReg *= (1 + formData.non_reg_growth_rate / 100);
      rrsp *= (1 + formData.rrsp_growth_rate / 100);
      tfsa *= (1 + formData.tfsa_growth_rate / 100);
      
      // 3. Determine cash needs & withdrawals
      let totalIncomeBeforeWithdrawals = employmentIncome + cppIncome + oasIncome;
      let spendingNeeds = age >= formData.retirement_age ? (formData.retirement_annual_spending * Math.pow(1 + formData.inflation_rate / 100, age - formData.current_age)) : 0;
      let cashShortfall = Math.max(0, spendingNeeds - totalIncomeBeforeWithdrawals);
      
      let nonRegWithdrawal = 0;
      let rrspWithdrawal = 0;
      let tfsaWithdrawal = 0;
      let tempShortfall = cashShortfall;

      const withdrawalOrder = formData.withdrawal_order.split('_');
      for(const type of withdrawalOrder) {
          if (tempShortfall <= 0) break;
          if (type === 'non_reg' && nonReg > 0) {
              const withdrawal = Math.min(tempShortfall, nonReg);
              nonRegWithdrawal += withdrawal;
              nonReg -= withdrawal;
              tempShortfall -= withdrawal;
          } else if (type === 'rrsp' && rrsp > 0) {
              const withdrawal = Math.min(tempShortfall, rrsp);
              rrspWithdrawal += withdrawal;
              rrsp -= withdrawal;
              tempShortfall -= withdrawal;
          } else if (type === 'tfsa' && tfsa > 0) {
              const withdrawal = Math.min(tempShortfall, tfsa);
              tfsaWithdrawal += withdrawal;
              tfsa -= withdrawal;
              tempShortfall -= withdrawal;
          }
      }
      
      // 4. Calculate Taxable Income & Taxes
      // Assuming 50% of non-reg gain portion is taxable. For simplification, assuming fixed 25% of withdrawal is taxable capital gain (50% gain, 50% inclusion rate)
      let taxableCapitalGain = nonRegWithdrawal * 0.25; 
      let taxableIncome = employmentIncome + cppIncome + oasIncome + rrspWithdrawal + taxableCapitalGain - rrspContribution;
      
      const taxes = calculateTaxes(taxableIncome);
      cumulativeTaxes += taxes.totalTax;
      
      projection.push({
        age,
        totalIncome: totalIncomeBeforeWithdrawals + rrspWithdrawal + nonRegWithdrawal + tfsaWithdrawal, // Total cash inflow for the year
        taxableIncome,
        taxPaid: taxes.totalTax,
        nonRegBalance: nonReg,
        rrspBalance: rrsp,
        tfsaBalance: tfsa,
        netWorth: nonReg + rrsp + tfsa
      });
    }
    
    setProjectionData(projection);
    setResults({
        totalLifetimeTaxes: cumulativeTaxes,
        finalNetWorth: projection[projection.length-1]?.netWorth || 0,
    });
  };

  return (
    <fieldset disabled={isViewer} className="space-y-6">
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Lifetime Tax Minimization Planner
          </CardTitle>
          <CardDescription>
            Simulate and compare different income, contribution, and withdrawal strategies to minimize lifetime taxes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                  <Label htmlFor="calculator_name">Plan Name</Label>
                  <Input id="calculator_name" value={formData.calculator_name} onChange={(e) => handleFormDataChange('calculator_name', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                  <Label>Associated Client(s)</Label>
                  <MultiClientSelector
                      clients={clients}
                      selectedClientIds={formData.client_ids}
                      onSelectionChange={(ids) => handleFormDataChange('client_ids', ids)}
                      disabled={isViewer}
                  />
              </div>
          </div>
        </CardContent>
      </Card>
      
      <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger className="text-lg font-semibold">Step 1: Define Timeline & Assumptions</AccordionTrigger>
          <AccordionContent>
            <Card className="border-none pt-4">
              <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div>
                      <Label>Current Age</Label>
                      <Input type="number" value={formData.current_age} onChange={e => handleFormDataChange('current_age', parseInt(e.target.value))} />
                  </div>
                  <div>
                      <Label>Retirement Age</Label>
                      <Input type="number" value={formData.retirement_age} onChange={e => handleFormDataChange('retirement_age', parseInt(e.target.value))} />
                  </div>
                  <div>
                      <Label>Life Expectancy</Label>
                      <Input type="number" value={formData.life_expectancy} onChange={e => handleFormDataChange('life_expectancy', parseInt(e.target.value))} />
                  </div>
                  <div>
                      <Label>Inflation Rate (%)</Label>
                      <Input value={displayValues.inflation_rate} onFocus={e=>handleFocus('inflation_rate')} onBlur={e=>handleBlur('inflation_rate')} onChange={e=>handleDisplayChange('inflation_rate', e.target.value)} />
                  </div>
                   <div>
                      <Label htmlFor="province">Province</Label>
                      <Select
                          value={formData.province}
                          onValueChange={(value) => handleFormDataChange('province', value)}
                      >
                          <SelectTrigger><SelectValue placeholder="Select Province" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ON">Ontario</SelectItem>
                            <SelectItem value="BC">British Columbia</SelectItem>
                            <SelectItem value="AB">Alberta</SelectItem>
                            <SelectItem value="QC">Quebec</SelectItem>
                            <SelectItem value="MB">Manitoba</SelectItem>
                            <SelectItem value="SK">Saskatchewan</SelectItem>
                            <SelectItem value="NS">Nova Scotia</SelectItem>
                            <SelectItem value="NB">New Brunswick</SelectItem>
                            <SelectItem value="NL">Newfoundland & Labrador</SelectItem>
                            <SelectItem value="PE">Prince Edward Island</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="item-2">
          <AccordionTrigger className="text-lg font-semibold">Step 2: Project Income Sources</AccordionTrigger>
          <AccordionContent>
            <Card className="border-none pt-4">
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div className="space-y-2">
                      <Label>Annual Employment Income</Label>
                      <Input value={displayValues.employment_income} onFocus={e=>handleFocus('employment_income')} onBlur={e=>handleBlur('employment_income')} onChange={e=>handleDisplayChange('employment_income', e.target.value)} />
                  </div>
                   <div>
                      <Label>Employment End Age</Label>
                      <Input type="number" value={formData.employment_end_age} onChange={e => handleFormDataChange('employment_end_age', parseInt(e.target.value))} />
                  </div>
                   <div className="space-y-2">
                      <Label>Annual CPP Benefit (at start age)</Label>
                      <Input value={displayValues.cpp_annual_amount} onFocus={e=>handleFocus('cpp_annual_amount')} onBlur={e=>handleBlur('cpp_annual_amount')} onChange={e=>handleDisplayChange('cpp_annual_amount', e.target.value)} />
                  </div>
                   <div>
                      <Label>CPP Start Age</Label>
                      <Input type="number" value={formData.cpp_start_age} onChange={e => handleFormDataChange('cpp_start_age', parseInt(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                      <Label>Annual OAS Benefit (at start age)</Label>
                      <Input value={displayValues.oas_annual_amount} onFocus={e=>handleFocus('oas_annual_amount')} onBlur={e=>handleBlur('oas_annual_amount')} onChange={e=>handleDisplayChange('oas_annual_amount', e.target.value)} />
                  </div>
                   <div>
                      <Label>OAS Start Age</Label>
                      <Input type="number" value={formData.oas_start_age} onChange={e => handleFormDataChange('oas_start_age', parseInt(e.target.value))} />
                  </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="item-3">
          <AccordionTrigger className="text-lg font-semibold">Step 3: Define Assets & Strategy</AccordionTrigger>
          <AccordionContent>
            <Card className="border-none pt-4">
              <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Non-Registered */}
                <div className="space-y-2 p-4 rounded-lg bg-red-50">
                    <h4 className="font-semibold text-red-800">Non-Registered</h4>
                    <Label>Current Balance</Label>
                    <Input value={displayValues.non_reg_balance} onFocus={e=>handleFocus('non_reg_balance')} onBlur={e=>handleBlur('non_reg_balance')} onChange={e=>handleDisplayChange('non_reg_balance', e.target.value)} />
                    <Label>Annual Growth Rate (%)</Label>
                    <Input value={displayValues.non_reg_growth_rate} onFocus={e=>handleFocus('non_reg_growth_rate')} onBlur={e=>handleBlur('non_reg_growth_rate')} onChange={e=>handleDisplayChange('non_reg_growth_rate', e.target.value)} />
                    <Label>Annual Contribution</Label>
                    <Input value={displayValues.non_reg_annual_contribution} onFocus={e=>handleFocus('non_reg_annual_contribution')} onBlur={e=>handleBlur('non_reg_annual_contribution')} onChange={e=>handleDisplayChange('non_reg_annual_contribution', e.target.value)} />
                </div>
                {/* RRSP */}
                <div className="space-y-2 p-4 rounded-lg bg-blue-50">
                    <h4 className="font-semibold text-blue-800">RRSP / RRIF</h4>
                    <Label>Current Balance</Label>
                    <Input value={displayValues.rrsp_balance} onFocus={e=>handleFocus('rrsp_balance')} onBlur={e=>handleBlur('rrsp_balance')} onChange={e=>handleDisplayChange('rrsp_balance', e.target.value)} />
                    <Label>Annual Growth Rate (%)</Label>
                    <Input value={displayValues.rrsp_growth_rate} onFocus={e=>handleFocus('rrsp_growth_rate')} onBlur={e=>handleBlur('rrsp_growth_rate')} onChange={e=>handleDisplayChange('rrsp_growth_rate', e.target.value)} />
                    <Label>Annual Contribution</Label>
                    <Input value={displayValues.rrsp_annual_contribution} onFocus={e=>handleFocus('rrsp_annual_contribution')} onBlur={e=>handleBlur('rrsp_annual_contribution')} onChange={e=>handleDisplayChange('rrsp_annual_contribution', e.target.value)} />
                </div>
                {/* TFSA */}
                <div className="space-y-2 p-4 rounded-lg bg-green-50">
                    <h4 className="font-semibold text-green-800">TFSA</h4>
                    <Label>Current Balance</Label>
                    <Input value={displayValues.tfsa_balance} onFocus={e=>handleFocus('tfsa_balance')} onBlur={e=>handleBlur('tfsa_balance')} onChange={e=>handleDisplayChange('tfsa_balance', e.target.value)} />
                    <Label>Annual Growth Rate (%)</Label>
                    <Input value={displayValues.tfsa_growth_rate} onFocus={e=>handleFocus('tfsa_growth_rate')} onBlur={e=>handleBlur('tfsa_growth_rate')} onChange={e=>handleDisplayChange('tfsa_growth_rate', e.target.value)} />
                    <Label>Annual Contribution</Label>
                    <Input value={displayValues.tfsa_annual_contribution} onFocus={e=>handleFocus('tfsa_annual_contribution')} onBlur={e=>handleBlur('tfsa_annual_contribution')} onChange={e=>handleDisplayChange('tfsa_annual_contribution', e.target.value)} />
                </div>
              </CardContent>
              <CardContent>
                <Separator className="my-4"/>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label>Retirement Withdrawal Order</Label>
                        <Select value={formData.withdrawal_order} onValueChange={v => handleFormDataChange('withdrawal_order', v)}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="non_reg_rrsp_tfsa">Non-Registered → RRSP/RRIF → TFSA</SelectItem>
                                <SelectItem value="rrsp_non_reg_tfsa">RRSP/RRIF → Non-Registered → TFSA</SelectItem>
                                <SelectItem value="non_reg_tfsa_rrsp">Non-Registered → TFSA → RRSP/RRIF</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Desired Annual Retirement Spending (Today's Dollars)</Label>
                        <Input value={displayValues.retirement_annual_spending} onFocus={e=>handleFocus('retirement_annual_spending')} onBlur={e=>handleBlur('retirement_annual_spending')} onChange={e=>handleDisplayChange('retirement_annual_spending', e.target.value)} />
                    </div>
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-4">
          <AccordionTrigger className="text-lg font-semibold">Step 4: Review Tax Rates</AccordionTrigger>
          <AccordionContent>
            <Card className="border-none pt-4">
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  The following combined Federal & Provincial tax brackets for {formData.province} are being used for this calculation. These are managed in the Application Settings.
                </p>
                {isFetchingRates && <p className="flex items-center text-sm text-blue-600"><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Fetching rates...</p>}
                {taxRateFetchError && (
                  <p className="text-sm text-red-500 mt-2">Notice: {taxRateFetchError}</p>
                )}
                <div className="pt-4">
                  <h5 className="font-semibold mb-2">Current {formData.province} Combined Brackets:</h5>
                  <ul className="list-disc list-inside text-sm">
                    {taxBrackets.map((b, i) => (
                      <li key={`on-${i}`}>Up to {formatCurrency(b.max_income || '∞')}: {formatPercentage(b.rate)}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => {
            setFormData(emptyFormData);
            setResults(null);
            setProjectionData([]);
            setTaxRateFetchError(null); // Clear error message
            // The useEffect for formData.province will handle fetching new brackets
        }}><RotateCcw className="w-4 h-4 mr-2"/>Reset</Button>
        <Button onClick={runSimulation} className="bg-indigo-600 hover:bg-indigo-700 text-white"><Calculator className="w-4 h-4 mr-2"/>Run Simulation</Button>
      </div>

      {results && (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
                <CardTitle>Simulation Results</CardTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center pt-4">
                    <div className="bg-red-100 p-4 rounded-lg">
                        <p className="text-sm font-medium text-red-800">Total Lifetime Taxes Paid</p>
                        <p className="text-3xl font-bold text-red-900">{formatCurrency(results.totalLifetimeTaxes)}</p>
                    </div>
                    <div className="bg-green-100 p-4 rounded-lg">
                        <p className="text-sm font-medium text-green-800">Net Worth at Life Expectancy</p>
                        <p className="text-3xl font-bold text-green-900">{formatCurrency(results.finalNetWorth)}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs value={viewMode} onValueChange={setViewMode}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="summary"><BarChart2 className="w-4 h-4 mr-2"/>Charts</TabsTrigger>
                        <TabsTrigger value="table"><Table className="w-4 h-4 mr-2"/>Data Table</TabsTrigger>
                    </TabsList>
                    <TabsContent value="summary" className="pt-4">
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={projectionData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="age" name="Age"/>
                                    <YAxis tickFormatter={(val) => formatCurrency(val).replace('$', '').replace(/,000$/, 'K').replace(/,000,000$/, 'M')}/>
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                    <Legend />
                                    <Area type="monotone" dataKey="nonRegBalance" stackId="1" stroke="#ef4444" fill="#ef4444" name="Non-Reg"/>
                                    <Area type="monotone" dataKey="rrspBalance" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="RRSP/RRIF"/>
                                    <Area type="monotone" dataKey="tfsaBalance" stackId="1" stroke="#22c55e" fill="#22c55e" name="TFSA"/>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </TabsContent>
                    <TabsContent value="table">
                        <div className="max-h-[500px] overflow-y-auto">
                           <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-slate-50">
                                    <tr>
                                        {['Age', 'Total Income', 'Taxable Income', 'Tax Paid', 'Non-Reg', 'RRSP/RRIF', 'TFSA', 'Net Worth'].map(h => <th key={h} className="p-2 text-left font-semibold">{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {projectionData.map(row => (
                                        <tr key={row.age} className="border-b">
                                            <td className="p-2">{row.age}</td>
                                            <td className="p-2">{formatCurrency(row.totalIncome)}</td>
                                            <td className="p-2">{formatCurrency(row.taxableIncome)}</td>
                                            <td className="p-2 text-red-600">{formatCurrency(row.taxPaid)}</td>
                                            <td className="p-2">{formatCurrency(row.nonRegBalance)}</td>
                                            <td className="p-2">{formatCurrency(row.rrspBalance)}</td>
                                            <td className="p-2">{formatCurrency(row.tfsaBalance)}</td>
                                            <td className="p-2 font-semibold">{formatCurrency(row.netWorth)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                           </table>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
      )}

      <GiuseppeAIOptimizer
        calculatorName="Lifetime Tax Minimization Planner"
        calculatorData={{
          inputs: formData,
          results: results,
          projection: projectionData,
          taxBrackets: taxBrackets,
        }}
      />
    </fieldset>
  );
});

export default LifetimeTaxPlanner;
