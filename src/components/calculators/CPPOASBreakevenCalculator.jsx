
import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  Users,
  DollarSign,
  Percent,
  Calculator,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Loader2
} from "lucide-react";
import { differenceInYears } from "date-fns";
import MultiClientSelector from '../shared/MultiClientSelector';
import GiuseppeAIOptimizer from '../shared/GiuseppeAIOptimizer';
import { GovernmentBenefitRates } from "@/api/entities"; // Added import
// Removed: import { InvokeLLM } from "@/api/integrations"; // No longer needed
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from 'recharts';

// Safe number parsing and formatting functions
const safeParseFloat = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

const formatCurrency = (value) => {
  const num = safeParseFloat(value, 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

const formatPercentage = (value) => {
  const num = safeParseFloat(value, 0);
  return `${num.toFixed(2)}%`;
};

const parseNumberInput = (value, type = 'number') => {
  if (value === null || value === undefined || value === '') return 0;
  let cleanedValue = String(value).replace(/[^0-9.-]/g, '');
  if (type === 'percentage') {
    cleanedValue = cleanedValue.replace('%', '');
  }
  return safeParseFloat(cleanedValue, 0);
};

const emptyFormData = {
  calculator_name: '',
  client_ids: [],
  goal_id: '',
  current_age: '',
  life_expectancy: 85,
  
  // Current CPP/OAS maximums (will be fetched via AI)
  cpp_maximum_annual: 0,
  oas_maximum_annual: 0,
  
  // Estimated percentages client will receive
  estimated_cpp_percentage: 100,
  estimated_oas_percentage: 100,
  
  // Scenario 1 - Early claiming
  scenario1_name: 'Early Claiming',
  cpp_start_age_1: 60,
  oas_start_age_1: 65,
  
  // Scenario 2 - Delayed claiming
  scenario2_name: 'Delayed Claiming',
  cpp_start_age_2: 70,
  oas_start_age_2: 70,
  
  // Advanced options
  annual_discount_rate: 3.0,
  include_inflation: true,
  inflation_rate: 2.0
};

function CPPOASBreakevenCalculator({ 
  clients = [], 
  goals, 
  portfolios, 
  isLoading, 
  preselectedClientId, 
  initialState, 
  isViewer = false, 
  currentInstance,
  onSave,
  isSaving,
  onNameChange // Added onNameChange prop
}, ref) {
  const [formData, setFormData] = useState({
    ...emptyFormData,
    client_ids: preselectedClientId ? [preselectedClientId] : []
  });
  
  const [displayValues, setDisplayValues] = useState({});
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [lastDataFetch, setLastDataFetch] = useState(null);
  const [breakEvenResults, setBreakEvenResults] = useState(null);
  const [chartData, setChartData] = useState([]);

  // Load initial state if provided
  useEffect(() => {
    if (initialState?.formData) {
      const loadedData = { ...emptyFormData, ...initialState.formData };
      setFormData(loadedData);
      
      // Create display values for formatted fields
      const newDisplayValues = {};
      ['cpp_maximum_annual', 'oas_maximum_annual', 'estimated_cpp_percentage', 'estimated_oas_percentage', 'annual_discount_rate', 'inflation_rate'].forEach(field => {
        if (loadedData[field] !== undefined && loadedData[field] !== '') {
          if (field.includes('percentage') || field.includes('rate')) {
            newDisplayValues[field] = formatPercentage(loadedData[field]);
          } else {
            newDisplayValues[field] = formatCurrency(loadedData[field]);
          }
        }
      });
      setDisplayValues(newDisplayValues);
    }
  }, [initialState]);

  // Update client age when client selection changes
  useEffect(() => {
    if (formData.client_ids.length > 0) {
      const primaryClient = clients.find(c => c.id === formData.client_ids[0]);
      if (primaryClient?.date_of_birth) {
        const age = differenceInYears(new Date(), new Date(primaryClient.date_of_birth));
        setFormData(prev => ({ ...prev, current_age: age }));
      }
    }
  }, [formData.client_ids, clients]);

  const handleFormDataChange = (field, value) => {
    if (field === 'calculator_name' && onNameChange) {
      onNameChange(value);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDisplayChange = (field, value) => {
    setDisplayValues(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field, type) => {
    const rawValue = parseNumberInput(displayValues[field], type);
    handleFormDataChange(field, rawValue);
    
    // Update display value with proper formatting
    if (type === 'percentage') {
      setDisplayValues(prev => ({ ...prev, [field]: formatPercentage(rawValue) }));
    } else if (type === 'currency') {
      setDisplayValues(prev => ({ ...prev, [field]: formatCurrency(rawValue) }));
    }
  };

  const handleFocus = (field) => {
    const rawValue = formData[field];
    setDisplayValues(prev => ({ ...prev, [field]: String(rawValue || '') }));
  };

  const fetchCurrentRates = useCallback(async () => {
    setIsFetchingRates(true);
    const defaultCppMax = 17478.36; // Approx. 2024 max CPP (65)
    const defaultOasMax = 8814.24; // Approx. 2024 max OAS (65)

    try {
      // Fetch from local GovernmentBenefitRates entity instead of internet
      const rates = await GovernmentBenefitRates.list('-year', 1);
      
      if (rates && rates.length > 0) {
        const latestRates = rates[0];
        
        setFormData(prev => ({
          ...prev,
          cpp_maximum_annual: latestRates.max_cpp_annual || defaultCppMax,
          oas_maximum_annual: latestRates.max_oas_annual || defaultOasMax
        }));
        
        setDisplayValues(prev => ({
          ...prev,
          cpp_maximum_annual: formatCurrency(latestRates.max_cpp_annual || defaultCppMax),
          oas_maximum_annual: formatCurrency(latestRates.max_oas_annual || defaultOasMax)
        }));
        
        setLastDataFetch(new Date());
      } else {
        // Fallback to default values if no rates found
        console.warn('No government benefit rates found in settings, using default values.');
        setFormData(prev => ({
          ...prev,
          cpp_maximum_annual: defaultCppMax,
          oas_maximum_annual: defaultOasMax
        }));
        
        setDisplayValues(prev => ({
          ...prev,
          cpp_maximum_annual: formatCurrency(defaultCppMax),
          oas_maximum_annual: formatCurrency(defaultOasMax)
        }));
      }
    } catch (error) {
      console.error('Error fetching CPP/OAS rates from local settings:', error);
      // Use fallback values in case of error
      setFormData(prev => ({
        ...prev,
        cpp_maximum_annual: defaultCppMax,
        oas_maximum_annual: defaultOasMax
      }));
      
      setDisplayValues(prev => ({
        ...prev,
        cpp_maximum_annual: formatCurrency(defaultCppMax),
        oas_maximum_annual: formatCurrency(defaultOasMax)
      }));
    } finally {
      setIsFetchingRates(false);
    }
  }, []);

  // Fetch current CPP/OAS rates when component loads
  useEffect(() => {
    if (formData.client_ids.length > 0 && formData.cpp_maximum_annual === 0) {
      fetchCurrentRates();
    }
  }, [formData.client_ids, formData.cpp_maximum_annual, fetchCurrentRates]);

  const calculateCPPAmount = (startAge, estimatedPercentage, maximumAnnual) => {
    // CPP reduction/increase factors
    // 0.6% reduction per month before 65, 0.7% increase per month after 65
    let adjustmentFactor = 1.0;
    
    if (startAge < 65) {
      const monthsEarly = (65 - startAge) * 12;
      adjustmentFactor = 1.0 - (monthsEarly * 0.006);
    } else if (startAge > 65) {
      const monthsLate = (startAge - 65) * 12;
      adjustmentFactor = 1.0 + (monthsLate * 0.007);
    }
    
    // Cap the adjustment factor
    adjustmentFactor = Math.max(0.36, Math.min(1.42, adjustmentFactor));
    
    return maximumAnnual * (estimatedPercentage / 100) * adjustmentFactor;
  };

  const calculateOASAmount = (startAge, estimatedPercentage, maximumAnnual) => {
    // OAS can only be deferred, 0.6% increase per month after 65
    let adjustmentFactor = 1.0;
    
    if (startAge > 65) {
      const monthsLate = (startAge - 65) * 12;
      adjustmentFactor = 1.0 + (monthsLate * 0.006);
    }
    
    // Cap at 136% (70 years old)
    adjustmentFactor = Math.min(1.36, adjustmentFactor);
    
    return maximumAnnual * (estimatedPercentage / 100) * adjustmentFactor;
  };

  const calculateBreakEven = useCallback(() => {
    const currentAge = safeParseFloat(formData.current_age);
    const lifeExpectancy = safeParseFloat(formData.life_expectancy, 85);
    const discountRate = safeParseFloat(formData.annual_discount_rate, 3) / 100;
    const inflationRate = formData.include_inflation ? safeParseFloat(formData.inflation_rate, 2) / 100 : 0;
    
    // Calculate annual amounts for each scenario
    const cpp1 = calculateCPPAmount(
      formData.cpp_start_age_1,
      formData.estimated_cpp_percentage,
      formData.cpp_maximum_annual
    );
    
    const oas1 = calculateOASAmount(
      formData.oas_start_age_1,
      formData.estimated_oas_percentage,
      formData.oas_maximum_annual
    );
    
    const cpp2 = calculateCPPAmount(
      formData.cpp_start_age_2,
      formData.estimated_cpp_percentage,
      formData.cpp_maximum_annual
    );
    
    const oas2 = calculateOASAmount(
      formData.oas_start_age_2,
      formData.estimated_oas_percentage,
      formData.oas_maximum_annual
    );

    // Calculate lifetime values and find break-even points
    const chartDataPoints = [];
    let cppBreakEvenAge = null;
    let oasBreakEvenAge = null;
    let totalBreakEvenAge = null;

    for (let age = Math.max(currentAge, 60); age <= lifeExpectancy + 10; age++) {
      const yearsFromNow = age - currentAge;
      // Discount factor for present value (not used in current cumulative calculation, but good to keep if needed)
      // const discountFactor = Math.pow(1 + discountRate, -yearsFromNow);
      
      // Calculate cumulative values up to this age
      let cppTotal1 = 0, oasTotal1 = 0, cppTotal2 = 0, oasTotal2 = 0;
      
      for (let paymentAge = Math.max(currentAge, 60); paymentAge <= age; paymentAge++) {
        const paymentYearsFromNow = paymentAge - currentAge;
        const paymentDiscountFactor = Math.pow(1 + discountRate, -paymentYearsFromNow);
        const paymentInflationFactor = Math.pow(1 + inflationRate, paymentYearsFromNow);
        
        // Scenario 1
        if (paymentAge >= formData.cpp_start_age_1) {
          cppTotal1 += (cpp1 * paymentInflationFactor) * paymentDiscountFactor;
        }
        if (paymentAge >= formData.oas_start_age_1) {
          oasTotal1 += (oas1 * paymentInflationFactor) * paymentDiscountFactor;
        }
        
        // Scenario 2
        if (paymentAge >= formData.cpp_start_age_2) {
          cppTotal2 += (cpp2 * paymentInflationFactor) * paymentDiscountFactor;
        }
        if (paymentAge >= formData.oas_start_age_2) {
          oasTotal2 += (oas2 * paymentInflationFactor) * paymentDiscountFactor;
        }
      }
      
      // Check for break-even points
      if (!cppBreakEvenAge && cppTotal2 >= cppTotal1 && cppTotal1 > 0) {
        cppBreakEvenAge = age;
      }
      
      if (!oasBreakEvenAge && oasTotal2 >= oasTotal1 && oasTotal1 > 0) {
        oasBreakEvenAge = age;
      }
      
      if (!totalBreakEvenAge && (cppTotal2 + oasTotal2) >= (cppTotal1 + oasTotal1) && (cppTotal1 + oasTotal1) > 0) {
        totalBreakEvenAge = age;
      }
      
      chartDataPoints.push({
        age,
        scenario1_cpp: cppTotal1,
        scenario1_oas: oasTotal1,
        scenario1_total: cppTotal1 + oasTotal1,
        scenario2_cpp: cppTotal2,
        scenario2_oas: oasTotal2,
        scenario2_total: cppTotal2 + oasTotal2,
        annual_cpp1: age >= formData.cpp_start_age_1 ? cpp1 * Math.pow(1 + inflationRate, age - formData.cpp_start_age_1) : 0,
        annual_oas1: age >= formData.oas_start_age_1 ? oas1 * Math.pow(1 + inflationRate, age - formData.oas_start_age_1) : 0,
        annual_cpp2: age >= formData.cpp_start_age_2 ? cpp2 * Math.pow(1 + inflationRate, age - formData.cpp_start_age_2) : 0,
        annual_oas2: age >= formData.oas_start_age_2 ? oas2 * Math.pow(1 + inflationRate, age - formData.oas_start_age_2) : 0,
      });
    }

    setBreakEvenResults({
      scenario1: {
        name: formData.scenario1_name,
        cpp_start_age: formData.cpp_start_age_1,
        oas_start_age: formData.oas_start_age_1,
        annual_cpp: cpp1,
        annual_oas: oas1,
        annual_total: cpp1 + oas1
      },
      scenario2: {
        name: formData.scenario2_name,
        cpp_start_age: formData.cpp_start_age_2,
        oas_start_age: formData.oas_start_age_2,
        annual_cpp: cpp2,
        annual_oas: oas2,
        annual_total: cpp2 + oas2
      },
      breakEvenPoints: {
        cpp: cppBreakEvenAge,
        oas: oasBreakEvenAge,
        total: totalBreakEvenAge
      }
    });

    setChartData(chartDataPoints);
  }, [formData]);

  // Calculate break-even when relevant data changes
  useEffect(() => {
    if (formData.current_age && formData.cpp_maximum_annual > 0 && formData.oas_maximum_annual > 0) {
      calculateBreakEven();
    }
  }, [
    formData.current_age,
    formData.cpp_maximum_annual,
    formData.oas_maximum_annual,
    calculateBreakEven
  ]);

  const handleClearFields = () => {
    setFormData({
      ...emptyFormData,
      client_ids: formData.client_ids, // Keep selected clients
      current_age: formData.client_ids.length > 0 ? formData.current_age : '' // Keep current age only if client is selected
    });
    setDisplayValues({});
    setBreakEvenResults(null);
    setChartData([]);
  };

  // Get filtered goals based on selected clients
  const clientGoals = goals?.filter(goal => 
    goal.client_ids?.some(id => formData.client_ids.includes(id))
  ) || [];

  // Expose methods for parent component
  useImperativeHandle(ref, () => ({
    getState: () => ({
      formData,
      breakEvenResults,
      chartData
    }),
    clearFields: handleClearFields
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              CPP & OAS Breakeven Analysis
            </CardTitle>
            {!isViewer && (
              <div className="flex gap-2">
                {onSave && (
                  <Button 
                    onClick={() => onSave()}
                    disabled={isSaving || formData.client_ids.length === 0}
                    className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-[var(--color-accent-foreground)]"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                )}
                <Button variant="outline" onClick={handleClearFields}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Clear Fields
                </Button>
              </div>
            )}
          </div>
          <p className="text-slate-600">
            Compare different CPP and OAS claiming strategies to optimize your retirement income.
          </p>
        </CardHeader>
      </Card>

      {/* Input Cards - Constrained Width */}
      <div className="max-w-5xl mx-auto space-y-6">
        <fieldset disabled={isViewer} className="space-y-6">
          {/* Basic Setup */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Basic Setup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="calculator_name">Calculator Name</Label>
                    <Input
                      id="calculator_name"
                      value={formData.calculator_name}
                      onChange={(e) => handleFormDataChange('calculator_name', e.target.value)}
                      placeholder="CPP/OAS Breakeven Analysis"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-2 block">Associated Clients</Label>
                    <MultiClientSelector
                      clients={clients}
                      selectedClientIds={formData.client_ids}
                      onSelectionChange={(selectedIds) => {
                        handleFormDataChange('client_ids', selectedIds);
                        handleFormDataChange('goal_id', '');
                      }}
                      placeholder="Select clients..."
                    />
                  </div>

                  {formData.client_ids.length > 0 && clientGoals.length > 0 && (
                    <div>
                      <Label htmlFor="goal_id">Linked Goal (Optional)</Label>
                      <Select
                        value={formData.goal_id || 'no_goal'}
                        onValueChange={(value) => handleFormDataChange('goal_id', value === 'no_goal' ? '' : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a goal (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no_goal">No goal selected</SelectItem>
                          {clientGoals.map((goal) => (
                            <SelectItem key={goal.id} value={goal.id}>
                              {goal.goal_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="current_age">Current Age</Label>
                    <Input
                      id="current_age"
                      type="number"
                      value={formData.current_age}
                      onChange={(e) => handleFormDataChange('current_age', e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      placeholder="65"
                      disabled={formData.client_ids.length > 0}
                      readOnly={formData.client_ids.length > 0}
                    />
                  </div>

                  <div>
                    <Label htmlFor="life_expectancy">Life Expectancy</Label>
                    <Input
                      id="life_expectancy"
                      type="number"
                      value={formData.life_expectancy}
                      onChange={(e) => handleFormDataChange('life_expectancy', e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      placeholder="85"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current CPP/OAS Rates */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Current CPP & OAS Maximum Amounts
                </CardTitle>
                <Button onClick={fetchCurrentRates} disabled={isFetchingRates} variant="outline" size="sm">
                  {isFetchingRates ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Load from Settings
                    </>
                  )}
                </Button>
              </div>
              {lastDataFetch && (
                <p className="text-sm text-slate-600">
                  Last updated: {lastDataFetch.toLocaleDateString()} at {lastDataFetch.toLocaleTimeString()}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <Label htmlFor="cpp_maximum_annual">CPP Maximum Annual ($)</Label>
                  <Input
                    id="cpp_maximum_annual"
                    value={displayValues.cpp_maximum_annual || ''}
                    onChange={(e) => handleDisplayChange('cpp_maximum_annual', e.target.value)}
                    onBlur={() => handleBlur('cpp_maximum_annual', 'currency')}
                    onFocus={() => handleFocus('cpp_maximum_annual')}
                    placeholder="$17,000"
                  />
                </div>

                <div>
                  <Label htmlFor="oas_maximum_annual">OAS Maximum Annual ($)</Label>
                  <Input
                    id="oas_maximum_annual"
                    value={displayValues.oas_maximum_annual || ''}
                    onChange={(e) => handleDisplayChange('oas_maximum_annual', e.target.value)}
                    onBlur={() => handleBlur('oas_maximum_annual', 'currency')}
                    onFocus={() => handleFocus('oas_maximum_annual')}
                    placeholder="$7,500"
                  />
                </div>

                <div>
                  <Label htmlFor="estimated_cpp_percentage">Estimated CPP % (%)</Label>
                  <Input
                    id="estimated_cpp_percentage"
                    value={displayValues.estimated_cpp_percentage || ''}
                    onChange={(e) => handleDisplayChange('estimated_cpp_percentage', e.target.value)}
                    onBlur={() => handleBlur('estimated_cpp_percentage', 'percentage')}
                    onFocus={() => handleFocus('estimated_cpp_percentage')}
                    placeholder="100.00%"
                  />
                </div>

                <div>
                  <Label htmlFor="estimated_oas_percentage">Estimated OAS % (%)</Label>
                  <Input
                    id="estimated_oas_percentage"
                    value={displayValues.estimated_oas_percentage || ''}
                    onChange={(e) => handleDisplayChange('estimated_oas_percentage', e.target.value)}
                    onBlur={() => handleBlur('estimated_oas_percentage', 'percentage')}
                    onFocus={() => handleFocus('estimated_oas_percentage')}
                    placeholder="100.00%"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scenarios */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scenario 1 */}
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg text-blue-600">Scenario 1</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="scenario1_name">Scenario Name</Label>
                    <Input
                      id="scenario1_name"
                      value={formData.scenario1_name}
                      onChange={(e) => handleFormDataChange('scenario1_name', e.target.value)}
                      placeholder="Early Claiming"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cpp_start_age_1">CPP Start Age</Label>
                    <Select
                      value={String(formData.cpp_start_age_1)}
                      onValueChange={(value) => handleFormDataChange('cpp_start_age_1', parseInt(value, 10))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 11 }, (_, i) => i + 60).map(age => (
                          <SelectItem key={age} value={String(age)}>{age}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="oas_start_age_1">OAS Start Age</Label>
                    <Select
                      value={String(formData.oas_start_age_1)}
                      onValueChange={(value) => handleFormDataChange('oas_start_age_1', parseInt(value, 10))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 6 }, (_, i) => i + 65).map(age => (
                          <SelectItem key={age} value={String(age)}>{age}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scenario 2 */}
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg text-green-600">Scenario 2</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="scenario2_name">Scenario Name</Label>
                    <Input
                      id="scenario2_name"
                      value={formData.scenario2_name}
                      onChange={(e) => handleFormDataChange('scenario2_name', e.target.value)}
                      placeholder="Delayed Claiming"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cpp_start_age_2">CPP Start Age</Label>
                    <Select
                      value={String(formData.cpp_start_age_2)}
                      onValueChange={(value) => handleFormDataChange('cpp_start_age_2', parseInt(value, 10))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 11 }, (_, i) => i + 60).map(age => (
                          <SelectItem key={age} value={String(age)}>{age}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="oas_start_age_2">OAS Start Age</Label>
                    <Select
                      value={String(formData.oas_start_age_2)}
                      onValueChange={(value) => handleFormDataChange('oas_start_age_2', parseInt(value, 10))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 6 }, (_, i) => i + 65).map(age => (
                          <SelectItem key={age} value={String(age)}>{age}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Advanced Options */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-purple-600" />
                Advanced Options
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="annual_discount_rate">Annual Discount Rate (%)</Label>
                  <Input
                    id="annual_discount_rate"
                    value={displayValues.annual_discount_rate || ''}
                    onChange={(e) => handleDisplayChange('annual_discount_rate', e.target.value)}
                    onBlur={() => handleBlur('annual_discount_rate', 'percentage')}
                    onFocus={() => handleFocus('annual_discount_rate')}
                    placeholder="3.00%"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="include_inflation"
                    checked={formData.include_inflation}
                    onChange={(e) => handleFormDataChange('include_inflation', e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <Label htmlFor="include_inflation">Include Inflation Adjustment</Label>
                </div>

                {formData.include_inflation && (
                  <div>
                    <Label htmlFor="inflation_rate">Inflation Rate (%)</Label>
                    <Input
                      id="inflation_rate"
                      value={displayValues.inflation_rate || ''}
                      onChange={(e) => handleDisplayChange('inflation_rate', e.target.value)}
                      onBlur={() => handleBlur('inflation_rate', 'percentage')}
                      onFocus={() => handleFocus('inflation_rate')}
                      placeholder="2.00%"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </fieldset>
      </div>

      {/* Results - Full Width */}
      {breakEvenResults && (
        <div className="space-y-6">
          {/* Break-Even Summary */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Break-Even Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Scenario Comparison */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Annual Benefits Comparison</h3>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2">{breakEvenResults.scenario1.name}</h4>
                      <div className="text-sm space-y-1">
                        <p>CPP starts at {breakEvenResults.scenario1.cpp_start_age}: <span className="font-semibold">{formatCurrency(breakEvenResults.scenario1.annual_cpp)}</span></p>
                        <p>OAS starts at {breakEvenResults.scenario1.oas_start_age}: <span className="font-semibold">{formatCurrency(breakEvenResults.scenario1.annual_oas)}</span></p>
                        <p className="pt-2 border-t border-blue-300">Total Annual: <span className="font-bold text-lg">{formatCurrency(breakEvenResults.scenario1.annual_total)}</span></p>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                      <h4 className="font-medium text-green-900 mb-2">{breakEvenResults.scenario2.name}</h4>
                      <div className="text-sm space-y-1">
                        <p>CPP starts at {breakEvenResults.scenario2.cpp_start_age}: <span className="font-semibold">{formatCurrency(breakEvenResults.scenario2.annual_cpp)}</span></p>
                        <p>OAS starts at {breakEvenResults.scenario2.oas_start_age}: <span className="font-semibold">{formatCurrency(breakEvenResults.scenario2.annual_oas)}</span></p>
                        <p className="pt-2 border-t border-green-300">Total Annual: <span className="font-bold text-lg">{formatCurrency(breakEvenResults.scenario2.annual_total)}</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Break-Even Points */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Break-Even Points</h3>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="text-sm space-y-2">
                        <div className="flex justify-between items-center">
                          <span>CPP Break-Even Age:</span>
                          <span className="font-bold text-lg">
                            {breakEvenResults.breakEvenPoints.cpp ? `${breakEvenResults.breakEvenPoints.cpp} years` : 'Never'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>OAS Break-Even Age:</span>
                          <span className="font-bold text-lg">
                            {breakEvenResults.breakEvenPoints.oas ? `${breakEvenResults.breakEvenPoints.oas} years` : 'Never'}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span>Total Break-Even Age:</span>
                          <span className="font-bold text-xl text-blue-600">
                            {breakEvenResults.breakEvenPoints.total ? `${breakEvenResults.breakEvenPoints.total} years` : 'Never'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-amber-800">
                          <p className="font-medium">Interpretation:</p>
                          <p>If you live beyond the break-even age, {breakEvenResults.scenario2.name.toLowerCase()} provides higher lifetime benefits.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Cumulative Lifetime Benefits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.slice(0, 50)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="age" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value, name) => [formatCurrency(value), name]} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="scenario1_total" 
                      stroke="#3b82f6" 
                      strokeWidth={2} 
                      name={`${breakEvenResults.scenario1.name} Total`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="scenario2_total" 
                      stroke="#10b981" 
                      strokeWidth={2} 
                      name={`${breakEvenResults.scenario2.name} Total`}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Giuseppe AI Optimizer */}
      <div className="max-w-5xl mx-auto">
        <fieldset disabled={isViewer}>
          <GiuseppeAIOptimizer
            calculatorName="CPP & OAS Breakeven Calculator"
            calculatorData={{
              inputs: formData,
              results: breakEvenResults,
              chartData: chartData
            }}
          />
        </fieldset>
      </div>
    </div>
  );
}

export default forwardRef(CPPOASBreakevenCalculator);
