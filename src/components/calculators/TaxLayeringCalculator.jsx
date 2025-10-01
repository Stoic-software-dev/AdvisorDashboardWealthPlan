
import React, { useState, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { User, Users, Target, Calculator, Undo2, Loader2, Link2, Layers, Info, RefreshCw, Download, AlertCircle, CheckCircle, TrendingUp, Settings, Table, RotateCcw, Save, FileText, PlusCircle, Trash2, Goal, Plus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import MultiClientSelector from '../shared/MultiClientSelector';
import MultiCalculatorSelector from '../shared/MultiCalculatorSelector';
import { Client, CalculatorInstance, TaxBracket, GovernmentBenefitRates } from "@/api/entities";
import { differenceInYears } from "date-fns";
import { extractFixedIncomeComparisonData } from './FixedIncomeCalculator';
import { extractCapitalAssetsComparisonData } from './CapitalAssetsCalculator';
import GiuseppeAIOptimizer from '../shared/GiuseppeAIOptimizer';
import { generateTaxLayeringPdf } from "@/api/functions";

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
};

const formatPercentage = (value) => {
  if (value === null || value === undefined || value === '') return '0.00%';
  const num = parseFloat(value);
  if (isNaN(num)) return '0.00%';
  return `${num.toFixed(2)}%`;
};

// Helper function to calculate total progressive tax based on a single combined bracket array
// Assumes taxRates is an array of objects { min_income, max_income, rate } where rate is percentage
const calculateTotalTax = (income, taxBrackets) => { // Renamed param to taxBrackets
  let tax = 0;
  // Ensure brackets are sorted by min_income
  const sortedBrackets = [...taxBrackets].sort((a, b) => a.min_income - b.min_income);

  for (const bracket of sortedBrackets) {
    const bracketMin = bracket.min_income || 0;
    const bracketMax = bracket.max_income === null ? Infinity : bracket.max_income; // Use 'max_income'
    const bracketRate = bracket.rate / 100; // 'rate' is percentage in TaxBracket entity, convert to decimal

    if (income > bracketMin) {
      // Calculate the portion of income that falls into this specific bracket
      const taxableInBracket = Math.min(income, bracketMax) - bracketMin;
      if (taxableInBracket > 0) {
        tax += taxableInBracket * bracketRate;
      }
    }
  }
  return tax;
};

// Helper function to calculate OAS clawback
const calculateOASClawback = (netIncome, oasAmount, threshold, rate) => {
  if (netIncome <= threshold) {
    return 0;
  }
  const excessIncome = netIncome - threshold;
  const clawback = excessIncome * (rate / 100); // Corrected calculation: rate is percentage, convert to decimal
  return Math.min(clawback, oasAmount);
};

// Simple function to calculate marginal tax rate for a given income
// Assumes taxRates is an array of objects { min_income, max_income, rate } where rate is percentage
const getMarginalTaxRate = (income, taxBrackets) => { // Renamed param to taxBrackets
    if (!taxBrackets || taxBrackets.length === 0) return 0;

    // Ensure brackets are sorted by min_income
    const sortedTaxRates = [...taxBrackets].sort((a, b) => a.min_income - b.min_income);

    for (const bracket of sortedTaxRates) {
        const minIncome = bracket.min_income || 0;
        const maxIncome = bracket.max_income === null ? Infinity : bracket.max_income;

        if (income >= minIncome && income < maxIncome) {
            return bracket.rate; // Return as percentage
        }
    }
    // If income is higher than or equal to the min_income of the last bracket, return the rate of the last bracket
    if (sortedTaxRates.length > 0) {
        const lastBracket = sortedTaxRates[sortedTaxRates.length - 1];
        if (income >= (lastBracket.min_income || 0)) {
            return lastBracket.rate; // Return as percentage
        }
    }
    return 0;
};


const emptyFormData = {
  calculator_name: "Tax Layering Analysis",
  client_ids: [],
  spouse_id: "",
  province: "ON",
  projection_years: 40,
  // inflation_rate removed
  base_target_income: 100000,
  target_income_inflation_rate: 2.0,
  linked_fixed_income_calc_ids: [],
  linked_capital_assets_calc_ids: [],
  goal_id: "", // NEW
  base_age: 40, // NEW
  marginal_tax_rate: 0 // NEW
};

// Helper to parse string inputs into numbers, allowing only digits and a single decimal point
const parseInput = (value) => {
  if (typeof value !== 'string') return value;
  // Allow only digits and a single decimal point
  return value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
};

const TaxLayeringCalculator = forwardRef(({ clients = [], goals, portfolios, isLoading, preselectedClientId, initialState, isViewer = false, onNameChange, onSave, onNewScenario, currentInstance, allInstances, isSaving }, ref) => {
  const [formData, setFormData] = useState({ ...emptyFormData, client_ids: preselectedClientId ? [preselectedClientId] : [] });
  const [displayValues, setDisplayValues] = useState({});
  const [projectionData, setProjectionData] = useState([]);
  
  // NEW: Simple taxRates state, replacing taxBrackets and liveTaxData
  const [taxBrackets, setTaxBrackets] = useState([]); // Renamed from taxRates
  const [govRates, setGovRates] = useState({
    oas_clawback_threshold: 90997,
    oas_clawback_rate: 0.15,
  }); // New state for government rates

  const [manualOverrides, setManualOverrides] = useState({});
  const [displayManualOverrides, setDisplayManualOverrides] = useState({});
  const [availableCalculators, setAvailableCalculators] = useState([]);
  const [isLoadingCalculators, setIsLoadingCalculators] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [taxRateFetchError, setTaxRateFetchError] = useState(null);
  const [lastTaxRateUpdate, setLastTaxRateUpdate] = useState(null);
  const [isExporting, setIsExporting] = useState(false); // New state for export loading

  // targetIncomes and displayTargetIncomes for year-by-year overrides remain state
  const [targetIncomes, setTargetIncomes] = useState({});
  const [displayTargetIncomes, setDisplayTargetIncomes] = useState({});
  // baseTargetIncome and targetInflationRate moved to formData

  // Add highlight state
  const [highlight, setHighlight] = useState({ type: null, index: null, cell: null });

  // Memoize client lookups for performance
  const primaryClient = useMemo(() => {
    const primaryClientId = formData.client_ids?.[0];
    return clients.find(c => c.id === primaryClientId);
  }, [clients, formData.client_ids]);

  const associatedClient = useMemo(() => {
    const associatedClientId = formData.client_ids?.[1];
    return clients.find(c => c.id === associatedClientId);
  }, [clients, formData.client_ids]);

  const associatedClientAge = useMemo(() => {
    if (associatedClient && associatedClient.date_of_birth) {
      return differenceInYears(new Date(), new Date(associatedClient.date_of_birth));
    }
    return null;
  }, [associatedClient]);

  const clientGoals = useMemo(() => {
      if (!goals || !formData.client_ids || formData.client_ids.length === 0) {
          return [];
      }
      // Filter goals for the primary client only (or all selected clients if desired)
      return goals.filter(goal => formData.client_ids.includes(goal.client_id));
  }, [goals, formData.client_ids]);


  useImperativeHandle(ref, () => ({
    getState: () => ({
      calculatorName: formData.calculator_name,
      associatedClientIds: formData.client_ids,
      formData,
      manualOverrides,
      targetIncomes,
      baseTargetIncome: formData.base_target_income, // Updated
      targetInflationRate: formData.target_income_inflation_rate, // Updated
      goalId: formData.goal_id, // NEW
      baseAge: formData.base_age, // NEW
      marginalTaxRate: formData.marginal_tax_rate // NEW
    })
  }));

  const handleFieldChange = (field, value) => { // Renamed from handleInputChange
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'calculator_name' && onNameChange) {
      onNameChange(value);
    }
  };

  const handleDisplayChange = (field, value) => { // Renamed from handleGenericDisplayChange
    setDisplayValues(prev => ({
        ...prev,
        [field]: value
    }));
  };

  const handleFocus = (field, actualValue) => { // Renamed from handleGenericFocus
    setDisplayValues(prev => ({
        ...prev,
        [field]: parseInput(String(actualValue))
    }));
  };

  const handleBlur = (field, type = 'float', setter, defaultValue) => { // Renamed from handleGenericBlur
    const rawValue = parseInput(displayValues[field]);
    let parsedValue;

    if (type === 'integer') {
      parsedValue = parseInt(rawValue, 10);
    } else {
      parsedValue = parseFloat(rawValue);
    }

    if (isNaN(parsedValue) || parsedValue < 0) {
      parsedValue = defaultValue;
    }

    setter(parsedValue); // Directly update formData via handleFieldChange
    setDisplayValues(prev => ({
        ...prev,
        [field]: type === 'integer' ? String(parsedValue) : (field.includes('income') || type === 'currency' ? formatCurrency(parsedValue) : (type === 'percentage' ? formatPercentage(parsedValue) : String(parsedValue)))
    }));
  };

  useEffect(() => {
      setDisplayValues(prev => ({
          ...prev,
          projection_years: String(formData.projection_years),
          base_target_income: formatCurrency(formData.base_target_income),
          target_income_inflation_rate: formatPercentage(formData.target_income_inflation_rate),
      }));
  }, [
      formData.projection_years,
      formData.base_target_income,
      formData.target_income_inflation_rate,
  ]);

  useEffect(() => {
    if (initialState?.formData) {
      const clientIds = initialState.formData.client_ids || (initialState.formData.client_id ? [initialState.formData.client_id] : []);
      const mappedInitialState = {
        ...emptyFormData,
        ...initialState.formData,
        client_ids: clientIds.length > 0 ? clientIds : (preselectedClientId ? [preselectedClientId] : []),
        projection_years: initialState.formData.projection_years || initialState.formData.time_horizon || emptyFormData.projection_years,
        base_target_income: initialState.formData.base_target_income !== undefined ? initialState.formData.base_target_income : emptyFormData.base_target_income,
        target_income_inflation_rate: initialState.formData.target_income_inflation_rate !== undefined ? initialState.formData.target_income_inflation_rate : emptyFormData.target_income_inflation_rate,
        linked_fixed_income_calc_ids: Array.isArray(initialState.formData.linked_fixed_income_calc_ids) ? initialState.formData.linked_fixed_income_calc_ids : (initialState.formData.linked_fixed_income_calc_id ? [initialState.formData.linked_fixed_income_calc_id] : []),
        linked_capital_assets_calc_ids: Array.isArray(initialState.formData.linked_capital_assets_calc_ids) ? initialState.formData.linked_capital_assets_calc_ids : (initialState.formData.linked_capital_assets_calc_id ? [initialState.formData.linked_capital_assets_calc_id] : []),
        goal_id: initialState.formData.goal_id || emptyFormData.goal_id, // NEW
        base_age: initialState.formData.base_age || emptyFormData.base_age, // NEW
        marginal_tax_rate: initialState.formData.marginal_tax_rate !== undefined ? initialState.formData.marginal_tax_rate : emptyFormData.marginal_tax_rate, // NEW
      };
      setFormData(mappedInitialState);

      const loadedOverrides = initialState.manualOverrides || {};
      setManualOverrides(loadedOverrides);
      const formattedOverrides = {};
      for (const year in loadedOverrides) {
        formattedOverrides[year] = {};
        for (const field in loadedOverrides[year]) {
          formattedOverrides[year][field] = formatCurrency(loadedOverrides[year][field]);
        }
      }
      setDisplayManualOverrides(formattedOverrides);

      setTargetIncomes(initialState.targetIncomes || {});
      const loadedDisplayTargetIncomes = {};
      if (initialState?.targetIncomes) {
          for (const year in initialState.targetIncomes) {
              loadedDisplayTargetIncomes[year] = formatCurrency(initialState.targetIncomes[year]);
          }
      }
      setDisplayTargetIncomes(loadedDisplayTargetIncomes);

    } else if (preselectedClientId) {
      setFormData({ ...emptyFormData, client_ids: [preselectedClientId] });
      setTargetIncomes({});
      setDisplayTargetIncomes({});
    }
  }, [initialState, preselectedClientId, setDisplayTargetIncomes]);

  const handleManualOverrideDisplayChange = (year, field, value) => {
    setDisplayManualOverrides(prev => ({
      ...prev,
      [year]: {
        ...(prev[year] || {}),
        [field]: value
      }
    }));
  };

  const handleManualOverrideFocus = (year, field) => {
    const currentOverride = manualOverrides[year]?.[field];
    handleManualOverrideDisplayChange(
      year,
      field,
      currentOverride !== undefined ? String(currentOverride) : ''
    );
  };

  const handleManualOverrideBlur = (year, field) => {
    const displayValue = displayManualOverrides[year]?.[field];
    const parsedValue = parseFloat(parseInput(String(displayValue)));

    if (!isNaN(parsedValue) && parsedValue >= 0) {
      setManualOverrides(prev => ({
        ...prev,
        [year]: {
          ...(prev[year] || {}),
          [field]: parsedValue
        }
      }));
      handleManualOverrideDisplayChange(year, field, formatCurrency(parsedValue));
    } else {
      const newOverrides = { ...manualOverrides };
      if (newOverrides[year]) {
        delete newOverrides[year][field];
        if (Object.keys(newOverrides[year]).length === 0) {
          delete newOverrides[year];
        }
      }
      setManualOverrides(newOverrides);

      const newDisplayOverrides = { ...displayManualOverrides };
      if (newDisplayOverrides[year]) {
        delete newDisplayOverrides[year][field];
        if (Object.keys(newDisplayOverrides[year]).length === 0) {
          delete newDisplayOverrides[year];
        }
      }
      setDisplayManualOverrides(newDisplayOverrides);
    }
  };

  const handleTargetIncomeChange = (year, value) => {
    const parsedValue = parseFloat(parseInput(value));
    setTargetIncomes(prev => {
      const newTargets = { ...prev };
      if (!isNaN(parsedValue) && parsedValue >= 0) {
        newTargets[year] = parsedValue;
      } else {
        delete newTargets[year];
      }
      return newTargets;
    });
    setDisplayTargetIncomes(prev => {
      const newDisplay = { ...prev };
      if (!isNaN(parsedValue) && parsedValue >= 0) {
        newDisplay[year] = formatCurrency(parsedValue);
      } else {
        delete newDisplay[year];
      }
      return newDisplay;
    });
  };

  const populateTargetIncomes = () => {
    const currentProjectionYears = parseInt(formData.projection_years, 10);
    if (isNaN(formData.base_target_income) || formData.base_target_income <= 0 || isNaN(currentProjectionYears) || currentProjectionYears <= 0) {
      toast({
        title: "Input Error",
        description: "Please enter a valid base target income and projection years.",
        variant: "destructive",
      });
      return;
    }

    const newTargetIncomes = {};
    const startYear = new Date().getFullYear();
    const targetInflationFactor = 1 + (formData.target_income_inflation_rate / 100);

    for (let i = 0; i < currentProjectionYears; i++) {
      const yearKey = startYear + i;
      const inflatedTarget = formData.base_target_income * Math.pow(targetInflationFactor, i);
      newTargetIncomes[yearKey] = Math.round(inflatedTarget);
    }

    setTargetIncomes(newTargetIncomes);
    toast({
      title: "Success",
      description: "Target incomes generated successfully!",
    });
  };

  const loadTaxRates = useCallback(async () => {
    setIsFetchingRates(true);
    setTaxRateFetchError(null);
    try {
        const currentYear = new Date().getFullYear();
        let fetchedTaxBrackets = [];
        let fetchedGovRates = {
          oas_clawback_threshold: 90997,
          oas_clawback_rate: 0.15,
        };
        let currentLastTaxRateUpdate = null;

        const fetchDataWithFallback = async (entity, filter, errorMessage) => {
            let data = await entity.filter(filter);
            if (data.length === 0) {
                const prevYearFilter = { ...filter, year: filter.year - 1 };
                data = await entity.filter(prevYearFilter);
                if (data.length > 0) {
                    toast({
                      title: "Warning",
                      description: `${errorMessage} (Using ${filter.year - 1} data)`,
                      variant: "warning",
                    });
                    setTaxRateFetchError(prev => (prev ? prev + '\n' : '') + `${errorMessage} (Using ${filter.year - 1} data)`);
                } else {
                    toast({
                      title: "Error",
                      description: `${errorMessage} (No data found for ${filter.year} or ${filter.year - 1})`,
                      variant: "destructive",
                    });
                    setTaxRateFetchError(prev => (prev ? prev + '\n' : '') + `${errorMessage} (No data found for ${filter.year} or ${filter.year - 1})`);
                }
            }
            return data;
        };

        // Fetch Tax Brackets
        const taxBracketResp = await fetchDataWithFallback(TaxBracket, { year: currentYear, province: formData.province }, `Could not find ${currentYear} ${formData.province} tax rates.`);
        if (taxBracketResp && taxBracketResp.length > 0 && taxBracketResp[0].brackets) {
          fetchedTaxBrackets = taxBracketResp[0].brackets;
          if (taxBracketResp[0].updated_date) currentLastTaxRateUpdate = new Date(taxBracketResp[0].updated_date);
        } else {
            setTaxRateFetchError(prev => (prev ? prev + '\n' : '') + `No valid bracket data found for ${formData.province}.`);
        }

        // Fetch Government Benefit Rates for OAS clawback
        const govRatesData = await fetchDataWithFallback(GovernmentBenefitRates, { year: currentYear }, `Could not find ${currentYear} Government benefit rates.`);
        if (govRatesData && govRatesData.length > 0) {
            fetchedGovRates.oas_clawback_threshold = govRatesData[0].oas_clawback_threshold || fetchedGovRates.oas_clawback_threshold;
            fetchedGovRates.oas_clawback_rate = govRatesData[0].oas_clawback_rate || fetchedGovRates.oas_clawback_rate;
            // Add other government rates if needed, e.g., fetchedGovRates.max_cpp_annual = govRatesData[0].max_cpp_annual;
            if (govRatesData[0]?.updated_date && (!currentLastTaxRateUpdate || new Date(govRatesData[0].updated_date) > currentLastTaxRateUpdate)) {
                currentLastTaxRateUpdate = new Date(govRatesData[0].updated_date);
            }
        }

        setTaxBrackets(fetchedTaxBrackets); // Update taxBrackets
        setGovRates(fetchedGovRates); // Update govRates
        setLastTaxRateUpdate(currentLastTaxRateUpdate || new Date());

        if (!taxRateFetchError) {
             toast({
               title: "Success",
               description: `Tax rates loaded successfully for ${currentYear} and ${formData.province}.`,
             });
        }

    } catch (error) {
        console.error("Error loading tax data from application settings:", error);
        setTaxRateFetchError(`Failed to load tax rates due to an unexpected error: ${error.message}`);
        setTaxBrackets([]); // Ensure it's an empty array on error
        setGovRates({
          oas_clawback_threshold: 90997,
          oas_clawback_rate: 0.15,
        }); // Set default or empty gov rates on error
        setLastTaxRateUpdate(null);
    } finally {
        setIsFetchingRates(false);
    }
  }, [formData.province, taxRateFetchError]);

  useEffect(() => {
      loadTaxRates();
  }, [loadTaxRates]);

  useEffect(() => {
    const loadAvailableCalculators = async () => {
      if (!formData.client_ids || formData.client_ids.length === 0) {
        setAvailableCalculators([]);
        return;
      }

      try {
        setIsLoadingCalculators(true);
        const allInstances = await CalculatorInstance.list();

        const clientCalculators = (allInstances || []).filter(instance => {
          if (!instance) return false;

          const instanceClientIds = instance.client_ids ||
            (instance.client_id ? [instance.client_id] : []);

          return formData.client_ids.some && formData.client_ids.some(selectedId =>
            instanceClientIds.includes && instanceClientIds.includes(selectedId)
          );
        });

        setAvailableCalculators(clientCalculators);
      } catch (error) {
        console.error("Error fetching calculators:", error);
        setAvailableCalculators([]);
      } finally {
        setIsLoadingCalculators(false);
      }
    };

    loadAvailableCalculators();
  }, [formData.client_ids]);

  const runProjection = useCallback(async () => { // Renamed from calculateProjections
    if (!formData.client_ids || formData.client_ids.length === 0) {
      setProjectionData([]);
      return;
    }

    // Only run if tax rates and gov rates are loaded
    if (taxBrackets.length === 0 || govRates.oas_clawback_threshold === undefined) {
      // console.log("Waiting for tax rates to load before running projection...");
      return;
    }

    try {
      setIsCalculating(true);

      const primaryClientForCalc = clients && clients.length > 0 ?
        clients.find(c => c && c.id === formData.client_ids[0]) : null;

      const associatedClientForCalc = clients && clients.length > 1 ?
        clients.find(c => c && c.id === formData.client_ids[1]) : null;


      if (!primaryClientForCalc) {
        console.warn("No primary client found for age calculation.");
        setProjectionData([]);
        setIsCalculating(false);
        return;
      }

      const baseAge = primaryClientForCalc.date_of_birth ?
        differenceInYears(new Date(), new Date(primaryClientForCalc.date_of_birth)) : (formData.base_age || 40); // Use formData.base_age if available

      const baseAssociatedAge = associatedClientForCalc && associatedClientForCalc.date_of_birth ?
        differenceInYears(new Date(), new Date(associatedClientForCalc.date_of_birth)) : null;

      let aggregatedFixedIncomeData = {};
      for (const calcId of formData.linked_fixed_income_calc_ids || []) {
        try {
          const calcInstances = await CalculatorInstance.filter({ id: calcId });
          if (calcInstances && calcInstances.length > 0) {
            const calcInstance = calcInstances[0];
            const extracted = extractFixedIncomeComparisonData(calcInstance.state_data, clients);

            if (extracted && extracted.projectionData) {
              extracted.projectionData.forEach(yearData => {
                if (!aggregatedFixedIncomeData[yearData.year]) {
                  aggregatedFixedIncomeData[yearData.year] = {
                    cpp: 0, oas: 0, bridge: 0, pension: 0, other_income: 0
                  };
                }
                aggregatedFixedIncomeData[yearData.year].cpp += yearData.cppIncome || 0;
                aggregatedFixedIncomeData[yearData.year].oas += yearData.oasIncome || 0;
                aggregatedFixedIncomeData[yearData.year].bridge += yearData.bridgeIncome || 0;
                aggregatedFixedIncomeData[yearData.year].pension += yearData.employerPensionIncome || 0;
                aggregatedFixedIncomeData[yearData.year].other_income += (yearData.otherIncome1 || 0) + (yearData.otherIncome2 || 0);
              });
            }
          }
        } catch (e) {
          console.error(`Error fetching fixed income data for calc ID ${calcId}:`, e);
        }
      }

      let aggregatedCapitalAssetsData = {};
      const linkedRedemptions = {
          registered: {},
          nonregistered: {},
          tfsa: {}
      };

      const startYear = new Date().getFullYear();
      const projectionYears = parseInt(formData.projection_years, 10) || 0;
      if (projectionYears <= 0) {
        setProjectionData([]);
        setIsCalculating(false);
        return;
      }

      for (const calcId of formData.linked_capital_assets_calc_ids || []) {
        try {
          const calcInstances = await CalculatorInstance.filter({ id: calcId });
          if (calcInstances && calcInstances.length > 0) {
            const calcInstance = calcInstances[0];
            const extracted = extractCapitalAssetsComparisonData(calcInstance.state_data, clients);

            if (extracted && extracted.projectionData) {
              const accountType = calcInstance.state_data?.formData?.account_type;

              extracted.projectionData.forEach((yearData, yearOffset) => {
                const year = yearData.year;
                const endingBalance = yearData.endingBalance || 0;

                if (!aggregatedCapitalAssetsData[year]) {
                  aggregatedCapitalAssetsData[year] = {
                    registered: 0,
                    nonregistered: 0,
                    tfsa: 0
                  };
                }

                if (accountType === 'registered') {
                  aggregatedCapitalAssetsData[year].registered += endingBalance;
                } else if (accountType === 'non_registered') {
                  aggregatedCapitalAssetsData[year].nonregistered += endingBalance;
                } else if (accountType === 'tfsa') {
                  aggregatedCapitalAssetsData[year].tfsa += endingBalance;
                }

                const periodicRedemption = yearData.periodicRedemption || 0;
                if (periodicRedemption > 0 && yearOffset >= 0 && yearOffset < projectionYears) {
                    if (accountType === 'registered') {
                        linkedRedemptions.registered[yearOffset] = (linkedRedemptions.registered[yearOffset] || 0) + periodicRedemption;
                    }
                    else if (accountType === 'non_registered') {
                        linkedRedemptions.nonregistered[yearOffset] = (linkedRedemptions.nonregistered[yearOffset] || 0) + periodicRedemption;
                    }
                    else if (accountType === 'tfsa') {
                        linkedRedemptions.tfsa[yearOffset] = (linkedRedemptions.tfsa[yearOffset] || 0) + periodicRedemption;
                    }
                }
              });
            }
          }
        } catch (e) {
          console.error(`Error fetching capital assets data for calc ID ${calcId}:`, e);
        }
      }

      let proj = [];
      let cumulativeIncome = 0;
      let cumulativeTax = 0;
      const targetIncomeInflationFactor = 1 + (formData.target_income_inflation_rate / 100);

      for (let i = 0; i < projectionYears; i++) {
        const year = startYear + i;
        const age = baseAge + i;
        const associatedAge = baseAssociatedAge !== null ? baseAssociatedAge + i : null;

        const fixedIncomeForYear = aggregatedFixedIncomeData[year] || {};
        const capitalAssetsForYear = aggregatedCapitalAssetsData[year] || { registered: 0, nonregistered: 0, tfsa: 0 };

        const oasClawbackThreshold = govRates.oas_clawback_threshold; // Use from govRates
        const oasClawbackRate = govRates.oas_clawback_rate; // Use from govRates

        const manualData = manualOverrides[year] || {};

        const cpp = manualData.cpp !== undefined && manualData.cpp !== null ? manualData.cpp : (fixedIncomeForYear.cpp || 0);
        const oas = manualData.oas !== undefined && manualData.oas !== null ? manualData.oas : (fixedIncomeForYear.oas || 0);
        const bridge = manualData.bridge !== undefined && manualData.bridge !== null ? manualData.bridge : (fixedIncomeForYear.bridge || 0);
        const pension = manualData.pension !== undefined && manualData.pension !== null ? manualData.pension : (fixedIncomeForYear.pension || 0);
        const otherIncome = manualData.other_income !== undefined && manualData.other_income !== null ? manualData.other_income : (fixedIncomeForYear.other_income || 0);

        const totalFixedIncome = cpp + oas + bridge + pension + otherIncome;

        const defaultRegisteredWithdrawal = linkedRedemptions.registered[i] || 0;
        const defaultNonregisteredWithdrawal = linkedRedemptions.nonregistered[i] || 0;
        const defaultTfsaWithdrawal = linkedRedemptions.tfsa[i] || 0;

        const registeredWithdrawal = manualData.registered_withdrawal !== undefined && manualData.registered_withdrawal !== null ?
          manualData.registered_withdrawal : defaultRegisteredWithdrawal;
        const nonregisteredWithdrawal = manualData.nonregistered_withdrawal !== undefined && manualData.nonregistered_withdrawal !== null ?
          manualData.nonregistered_withdrawal : defaultNonregisteredWithdrawal;
        const tfsaWithdrawal = manualData.tfsa_withdrawal !== undefined && manualData.tfsa_withdrawal !== null ?
          manualData.tfsa_withdrawal : defaultTfsaWithdrawal;

        const totalVariableIncome = registeredWithdrawal + nonregisteredWithdrawal + tfsaWithdrawal;
        const totalIncome = totalFixedIncome + totalVariableIncome;
        const taxableIncome = totalFixedIncome + registeredWithdrawal + (nonregisteredWithdrawal * 0.5);


        // Use the new tax calculation functions with the new `taxBrackets` state
        const regularTax = calculateTotalTax(taxableIncome, taxBrackets);

        const oasClawback = calculateOASClawback(taxableIncome, oas, oasClawbackThreshold, oasClawbackRate);

        const totalTax = regularTax + oasClawback;
        const afterTaxIncome = totalIncome - totalTax; // NEW

        const allowableIncomeBeforeClawback = taxableIncome - oasClawbackThreshold;

        cumulativeIncome += totalIncome;
        cumulativeTax += totalTax;

        // Use the new getMarginalTaxRate
        const currentMarginalRate = getMarginalTaxRate(taxableIncome, taxBrackets); // As percentage

        // Find next threshold logic
        let nextMTRThreshold = null;
        let nextMTR = null;
        let marginalIncomeRequired = 0;

        // Ensure brackets are sorted by min_income
        const sortedTaxRates = [...taxBrackets].sort((a, b) => a.min_income - b.min_income);

        for (const bracket of sortedTaxRates) {
            // Find the first bracket whose min_income is strictly greater than taxableIncome
            if (bracket.min_income > taxableIncome) {
                nextMTRThreshold = bracket.min_income;
                nextMTR = bracket.rate; // This is the rate of the next bracket (as percentage)
                marginalIncomeRequired = bracket.min_income - taxableIncome;
                break;
            }
        }
        // If no next threshold found (e.g., already in the highest bracket), set marginal income required to 0 and next MTR to current MTR
        if (nextMTRThreshold === null) {
            marginalIncomeRequired = 0;
            nextMTR = currentMarginalRate;
            nextMTRThreshold = taxableIncome;
        }

        // Previous MTR Threshold logic
        let previousMTRThreshold = 0;
        let marginalDeductionRequired = 0;
        let previousMTR = 0; // Default to 0 for income below first bracket

        // Find the bracket *before* the current taxable income falls into
        let foundCurrentBracket = false;
        for (let k = 0; k < sortedTaxRates.length; k++) {
            const bracket = sortedTaxRates[k];
            const minIncome = bracket.min_income || 0;
            const maxIncome = bracket.max_income === null ? Infinity : bracket.max_income;

            if (taxableIncome >= minIncome && taxableIncome < maxIncome) {
                foundCurrentBracket = true;
                if (k > 0) { // If not the first bracket
                    const prevBracket = sortedTaxRates[k - 1];
                    previousMTRThreshold = prevBracket.max_income || 0; // Upper limit of the previous bracket
                    marginalDeductionRequired = Math.max(0, taxableIncome - previousMTRThreshold);
                    previousMTR = prevBracket.rate;
                } else { // In the first bracket
                    previousMTRThreshold = 0;
                    marginalDeductionRequired = Math.max(0, taxableIncome - previousMTRThreshold); // How much income is in this bracket
                    previousMTR = bracket.rate; // MTR of the first bracket
                }
                break;
            }
        }

        // If taxableIncome is above the last bracket, previousMTRThreshold would be the max_income of the second to last bracket
        // and previousMTR would be the rate of the second to last bracket.
        if (!foundCurrentBracket && sortedTaxRates.length > 0 && taxableIncome >= sortedTaxRates[sortedTaxRates.length - 1].min_income) {
            // Income is in the highest bracket
            const lastBracketIndex = sortedTaxRates.length - 1;
            if (lastBracketIndex > 0) {
                const prevBracket = sortedTaxRates[lastBracketIndex - 1];
                previousMTRThreshold = prevBracket.max_income || 0;
                marginalDeductionRequired = Math.max(0, taxableIncome - previousMTRThreshold);
                previousMTR = prevBracket.rate;
            } else { // Only one bracket exists
                previousMTRThreshold = 0;
                marginalDeductionRequired = Math.max(0, taxableIncome - previousMTRThreshold);
                previousMTR = sortedTaxRates[0].rate;
            }
        }

        let targetIncome = targetIncomes[year];
        if (targetIncome === undefined || targetIncome === null || targetIncome === '') {
          targetIncome = formData.base_target_income * Math.pow(targetIncomeInflationFactor, i);
        }
        targetIncome = Math.round(targetIncome);

        const percentageOfTarget = targetIncome > 0 ? (totalIncome / targetIncome) * 100 : 0;

        const yearData = {
          year,
          age,
          associatedAge,
          cpp,
          oas,
          bridge,
          pension,
          other_income: otherIncome,
          total_fixed_income: totalFixedIncome,
          mtr_fixed: currentMarginalRate,
          next_mtr_threshold: nextMTRThreshold,
          marginal_income_required: marginalIncomeRequired,
          next_mtr: nextMTR,
          previous_mtr_threshold: previousMTRThreshold,
          marginal_deduction_required: marginalDeductionRequired,
          previous_mtr: previousMTR,
          registered_withdrawal: registeredWithdrawal,
          nonregistered_withdrawal: nonregisteredWithdrawal,
          tfsa_withdrawal: tfsaWithdrawal,
          total_variable_income: totalVariableIncome,
          total_income: totalIncome,
          taxable_income: taxableIncome,
          total_tax: totalTax,
          after_tax_income: afterTaxIncome,
          average_tax_rate: totalIncome > 0 ? (totalTax / totalIncome) * 100 : 0, // NEW: Calculate average tax rate
          cumulative_income: cumulativeIncome,
          cumulative_tax: cumulativeTax,
          oas_clawback_tax: oasClawback,
          allowable_income_before_clawback: allowableIncomeBeforeClawback,
          available_registered: capitalAssetsForYear.registered || 0,
          available_nonregistered: capitalAssetsForYear.nonregistered || 0,
          available_tfsa: capitalAssetsForYear.tfsa || 0,
          target_income: targetIncome,
          percentage_of_target: percentageOfTarget,
          shortfall_surplus: totalIncome - targetIncome
        };

        proj.push(yearData);
      }

      setProjectionData(proj);
    } catch (error) {
      console.error("Error calculating projections:", error);
      setProjectionData([]);
    } finally {
      setIsCalculating(false);
    }
  }, [
    formData.client_ids, formData.projection_years,
    formData.base_target_income, formData.target_income_inflation_rate, formData.base_age,
    formData.linked_fixed_income_calc_ids, formData.linked_capital_assets_calc_ids,
    manualOverrides, taxBrackets, govRates, clients,
    targetIncomes
  ]);

  useEffect(() => {
    if (taxBrackets.length > 0 && govRates.oas_clawback_threshold !== undefined) {
        runProjection();
    }
  }, [runProjection, taxBrackets, govRates]);

  const handleClearFields = () => {
    setFormData({
      ...emptyFormData,
      client_ids: formData.client_ids,
      calculator_name: "Tax Layering Analysis",
      base_target_income: emptyFormData.base_target_income,
      target_income_inflation_rate: emptyFormData.target_income_inflation_rate,
      goal_id: emptyFormData.goal_id,
      base_age: emptyFormData.base_age,
      marginal_tax_rate: emptyFormData.marginal_tax_rate,
    });
    setProjectionData([]);
    setManualOverrides({});
    setDisplayManualOverrides({});
    setTargetIncomes({});
    setDisplayTargetIncomes({});
  };

  const summaryMetrics = useMemo(() => {
    if (projectionData.length === 0) {
      return {
        totalLifetimeGrossIncome: 0,
        totalLifetimeTaxPaid: 0,
        overallEffectiveTaxRate: 0,
        totalLifetimeOASClawback: 0
      };
    }

    const totalLifetimeGrossIncome = projectionData.reduce((acc, p) => acc + (p.total_income || 0), 0);
    const totalLifetimeTaxPaid = projectionData.reduce((acc, p) => acc + (p.total_tax || 0), 0);
    const totalLifetimeOASClawback = projectionData.reduce((acc, p) => acc + (p.oas_clawback_tax || 0), 0);

    const overallEffectiveTaxRate = totalLifetimeGrossIncome > 0
        ? (totalLifetimeTaxPaid / totalLifetimeGrossIncome) * 100
        : 0;

    return {
        totalLifetimeGrossIncome,
        totalLifetimeTaxPaid,
        overallEffectiveTaxRate,
        totalLifetimeOASClawback
    };
  }, [projectionData]);

  const handleHighlight = (type, index, cell = null) => {
    if (highlight.type === type) {
      if (type === 'cell' && highlight.cell?.row === cell?.row && highlight.cell?.col === cell?.col) {
        setHighlight({ type: null, index: null, cell: null });
        return;
      }
      if ((type === 'row' || type === 'col') && highlight.index === index) {
        setHighlight({ type: null, index: null, cell: null });
        return;
      }
    }
    setHighlight({ type, index, cell });
  };

  const getHighlightClass = (rowIndex, colIndex) => {
    let classes = '';
    if (highlight.type === 'row' && highlight.index === rowIndex) {
      classes += 'bg-green-100 dark:bg-green-900/50 ';
    }
    if (highlight.type === 'col' && highlight.index === colIndex) {
      classes += 'bg-green-100 dark:bg-green-900/50 ';
    }
    if (highlight.type === 'cell' && highlight.cell?.row === rowIndex && highlight.cell?.col === colIndex) {
      classes += 'bg-green-100 dark:bg-green-900/50 ';
    }
    return classes.trim();
  };

  const getColumnIndex = (baseIndex) => {
    return associatedClient ? baseIndex + 1 : baseIndex;
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
        const payload = { formData, projectionData };
        const response = await generateTaxLayeringPdf(payload);

        if (response && response.data) {
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Retirement Income Report - ${formData.calculator_name || 'Scenario'}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast({
              title: "Success",
              description: "PDF report generated successfully!",
            });
        } else {
            toast({
              title: "Error",
              description: "Failed to generate PDF.",
              variant: "destructive",
            });
        }
    } catch (error) {
        console.error("Error exporting PDF:", error);
        toast({
          title: "Error",
          description: "Failed to generate PDF. Please try again.",
          variant: "destructive",
        });
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <TooltipProvider>
      <fieldset disabled={isViewer}>
        <Card className="w-full h-full border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl font-bold text-slate-800">
                  <Layers className="w-6 h-6 text-teal-600" />
                  Retirement Income Planner
                </CardTitle>
                <CardDescription>Strategically plan retirement income withdrawals to optimize tax efficiency.</CardDescription>
              </div>
              {!isViewer && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleExportPdf} disabled={isExporting || projectionData.length === 0}>
                    {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    {isExporting ? 'Exporting...' : 'Export PDF'}
                  </Button>
                  <Button onClick={onSave} disabled={isSaving}>
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Scenario
                  </Button>
                  <Button variant="secondary" onClick={onNewScenario}>
                      <PlusCircle className="w-4 h-4 mr-2" /> New Scenario
                  </Button>
                  <Button variant="outline" onClick={handleClearFields}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Clear Fields
                  </Button>
                </div>
              )}
            </div>
            {currentInstance && (
              <div className="text-right">
                <p className="text-sm text-slate-500">Current Instance</p>
                <p className="font-medium text-slate-900 truncate max-w-48">{currentInstance.name}</p>
              </div>
            )}
          </CardHeader>
        </Card>
      </fieldset>

      <div className="max-w-5xl mx-auto space-y-6 p-6">
          <fieldset disabled={isViewer} className="space-y-6">
              <Card className="border-none shadow-lg bg-white">
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg lg:text-xl font-semibold text-slate-900">
                          <Settings className="w-5 h-5 text-indigo-600" />
                          Parameters
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      {/* New simple tax rate status display */}
                      <div className="mb-6 p-4 rounded-lg border">
                          <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                  {isFetchingRates ? (
                                      <Loader2 className="w-5 h-5 animate-spin text-blue-600 flex-shrink-0" />
                                  ) : taxRateFetchError ? (
                                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                  ) : (
                                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                  )}
                                  <div>
                                      <p className="font-semibold">Tax Rates Status</p>
                                      {isFetchingRates ? (
                                          <p className="text-sm text-gray-600">Loading tax rates...</p>
                                      ) : taxRateFetchError ? (
                                          <>
                                              <p className="text-sm text-red-600 whitespace-pre-wrap">{taxRateFetchError}</p>
                                              <p className="text-xs text-muted-foreground mt-1">Please ensure tax rates are set in Application Settings or click "Update Tax Rates" to re-fetch.</p>
                                          </>
                                      ) : (
                                          <>
                                              <p className="text-sm text-green-600">
                                                  {taxBrackets.length} tax brackets loaded for {new Date().getFullYear()} and {formData.province}.
                                              </p>
                                              {lastTaxRateUpdate && (<p className="text-xs text-muted-foreground">Last updated: {lastTaxRateUpdate.toLocaleDateString()}</p>)}
                                              <p className="text-xs text-muted-foreground">OAS clawback threshold: {formatCurrency(govRates.oas_clawback_threshold)}</p>
                                          </>
                                      )}
                                  </div>
                              </div>
                              <Button onClick={loadTaxRates} disabled={isFetchingRates} variant="outline" size="sm" className="ml-4 flex-shrink-0">
                                  {isFetchingRates ? (<Loader2 className="w-4 h-4 animate-spin" />) : (<RefreshCw className="w-4 h-4" />)}
                                  <span className="sr-only sm:not-sr-only sm:ml-2">Refresh Rates</span>
                              </Button>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <Label htmlFor="calculator_name">Calculator Name</Label>
                              <Input
                                id="calculator_name"
                                value={formData.calculator_name}
                                onChange={(e) => handleFieldChange('calculator_name', e.target.value)}
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
                                  handleFieldChange('client_ids', selectedIds);
                                }}
                                disabled={isViewer}
                                placeholder="Select clients..."
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <Label htmlFor="goal_id">Linked Goal (Optional)</Label>
                              <Select
                                value={formData.goal_id || 'no_goal'}
                                onValueChange={(value) => handleFieldChange('goal_id', value === 'no_goal' ? '' : value)}
                                disabled={isViewer || !formData.client_ids || formData.client_ids.length === 0}
                              >
                                  <SelectTrigger>
                                      <SelectValue placeholder="Select a goal..." />
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
                          <div>
                              <Label htmlFor="province">Province</Label>
                              <Select
                                value={formData.province}
                                onValueChange={(value) => handleFieldChange('province', value)}
                                disabled={isViewer}
                              >
                                  <SelectTrigger>
                                      <SelectValue placeholder="Select province" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="ON">Ontario</SelectItem>
                                      <SelectItem value="BC">British Columbia</SelectItem>
                                      <SelectItem value="AB">Alberta</SelectItem>
                                      <SelectItem value="QC">Quebec</SelectItem>
                                      <SelectItem value="MB">Manitoba</SelectItem>
                                      <SelectItem value="SK">Saskatchewan</SelectItem>
                                      <SelectItem value="NS">Nova Scotia</SelectItem>
                                      <SelectItem value="NB">New Brunswick</SelectItem>
                                      <SelectItem value="NL">Newfoundland and Labrador</SelectItem>
                                      <SelectItem value="PE">Prince Edward Island</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
                          <div>
                              <Label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                  <Link2 className="w-4 h-4" />
                                  Link Fixed Income Calcs
                              </Label>
                              {isLoadingCalculators ? (
                                  <div className="flex items-center justify-center h-10 border rounded-md"><Loader2 className="w-4 h-4 animate-spin" /></div>
                              ) : (
                                  <MultiCalculatorSelector calculators={availableCalculators.filter(c => c.calculator_type === 'fixed_income')} selectedCalculatorIds={formData.linked_fixed_income_calc_ids} onSelectionChange={(calcIds) => handleFieldChange('linked_fixed_income_calc_ids', calcIds)} placeholder="Select fixed income calculators..." disabled={isViewer} />
                              )}
                          </div>

                          <div>
                              <Label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                  <Link2 className="w-4 h-4" />
                                  Link Capital Assets Calc
                              </Label>
                              {isLoadingCalculators ? (
                                  <div className="flex items-center justify-center h-10 border rounded-md"><Loader2 className="w-4 h-4 animate-spin" /></div>
                              ) : (
                                  <MultiCalculatorSelector calculators={availableCalculators.filter(c => c.calculator_type === 'capital_assets' || c.calculator_type === 'main_view')} selectedCalculatorIds={formData.linked_capital_assets_calc_ids} onSelectionChange={(calcIds) => handleFieldChange('linked_capital_assets_calc_ids', calcIds)} placeholder="Select capital/main view calculators..." disabled={isViewer} />
                              )}
                          </div>
                      </div>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2">
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <Button onClick={loadTaxRates} disabled={isFetchingRates} variant="outline" size="sm" className="flex items-center gap-2">
                                  {isFetchingRates ? (<Loader2 className="w-4 h-4 animate-spin" />) : (<RefreshCw className="w-4 h-4" />)}
                                  Update Tax Rates
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                              <p>Fetch latest tax brackets and OAS clawback rates from application settings.</p>
                              {lastTaxRateUpdate && (<p className="text-xs text-muted-foreground">Last updated: {lastTaxRateUpdate.toLocaleDateString()}</p>)}
                          </TooltipContent>
                      </Tooltip>
                      <Button onClick={populateTargetIncomes} variant="outline" className="flex items-center gap-2" disabled={isViewer}>
                          <TrendingUp className="w-4 h-4" />
                          Generate Target Incomes
                      </Button>
                  </CardFooter>
              </Card>

              {/* Assumptions */}
              <Card className="border-none shadow-lg bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg lg:text-xl font-semibold text-slate-900">
                    <Calculator className="w-5 h-5 text-indigo-600" />
                    Assumptions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <Label htmlFor="base_target_income">Base Target Income (Year 1)</Label>
                      <Input
                        id="base_target_income"
                        type="text"
                        value={displayValues.base_target_income || ''}
                        onChange={(e) => handleDisplayChange('base_target_income', e.target.value)}
                        onBlur={() => handleBlur('base_target_income', 'currency', (val) => handleFieldChange('base_target_income', val), emptyFormData.base_target_income)}
                        onFocus={() => handleFocus('base_target_income', formData.base_target_income)}
                        disabled={isViewer}
                      />
                    </div>
                    <div>
                      <Label htmlFor="target_income_inflation_rate">Target Income Inflation Rate (%)</Label>
                      <Input
                        id="target_income_inflation_rate"
                        type="text"
                        value={displayValues.target_income_inflation_rate || ''}
                        onChange={(e) => handleDisplayChange('target_income_inflation_rate', e.target.value)}
                        onBlur={() => handleBlur('target_income_inflation_rate', 'float', (val) => handleFieldChange('target_income_inflation_rate', val), emptyFormData.target_income_inflation_rate)}
                        onFocus={() => handleFocus('target_income_inflation_rate', formData.target_income_inflation_rate)}
                        disabled={isViewer}
                      />
                    </div>
                    <div>
                      <Label htmlFor="projection_years">Projection Years</Label>
                      <Input
                        id="projection_years"
                        type="text"
                        value={displayValues.projection_years || ''}
                        onChange={(e) => handleDisplayChange('projection_years', e.target.value)}
                        onBlur={() => handleBlur('projection_years', 'integer', (val) => handleFieldChange('projection_years', val), emptyFormData.projection_years)}
                        onFocus={() => handleFocus('projection_years', formData.projection_years)}
                        disabled={isViewer} min="1" max="50"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-white">
                  <CardHeader>
                      <CardTitle className="text-lg font-semibold text-slate-800">Lifetime Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 text-center">
                              <p className="text-sm font-medium text-blue-800">Lifetime Gross Income</p>
                              <p className="text-2xl font-bold text-blue-900">{formatCurrency(summaryMetrics.totalLifetimeGrossIncome)}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-center">
                              <p className="text-sm font-medium text-red-800">Lifetime Tax Paid</p>
                              <p className="text-2xl font-bold text-red-900">{formatCurrency(summaryMetrics.totalLifetimeTaxPaid)}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-green-50 border border-green-100 text-center">
                              <p className="text-sm font-medium text-green-800">Effective Tax Rate</p>
                              <p className="text-2xl font-bold text-green-900">{formatPercentage(summaryMetrics.overallEffectiveTaxRate)}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-orange-50 border border-orange-100 text-center">
                              <p className="text-sm font-medium text-orange-800">Total OAS Clawback</p>
                              <p className="text-2xl font-bold text-orange-900">{formatCurrency(summaryMetrics.totalLifetimeOASClawback)}</p>
                          </div>
                      </div>
                  </CardContent>
              </Card>
          </fieldset>
      </div>

      <fieldset disabled={isViewer}>
          <Card className="mt-6 border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
              <Table className="w-5 h-5 text-indigo-600" />
              Retirement Income Planning Analysis
            </CardTitle>
            <CardDescription className="mt-2">
              Manually adjust withdrawal amounts to optimize your tax strategy.
              <strong> Focus on the withdrawal columns to layer different income types effectively.</strong>
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isCalculating || isFetchingRates ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">
                  {isFetchingRates ? 'Fetching tax rates from settings...' : 'Calculating projections...'}
                </span>
              </div>
            ) : projectionData.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                No projection data. Please select clients and enter target income.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr className="border-b border-slate-300 dark:border-slate-600">
                      <th
                        onDoubleClick={() => handleHighlight('col', 0)}
                        className={`py-3 px-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 cursor-pointer transition-colors ${getHighlightClass(null, 0)}`}
                      >
                        Year
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', 1)}
                        className={`py-3 px-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, 1)}`}
                      >
                        {primaryClient?.first_name || 'Primary'} Age
                      </th>
                      {associatedClient && (
                        <th
                          onDoubleClick={() => handleHighlight('col', 2)}
                          className={`py-3 px-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, 2)}`}
                        >
                          {associatedClient.first_name || 'Associated'} Age
                        </th>
                      )}
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(2))}
                        className={`w-32 py-3 px-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(2))}`}
                      >
                        CPP
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(3))}
                        className={`w-32 py-3 px-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(3))}`}
                      >
                        OAS
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(4))}
                        className={`w-32 py-3 px-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(4))}`}
                      >
                        Bridge
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(5))}
                        className={`w-32 py-3 px-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(5))}`}
                      >
                        Pension
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(6))}
                        className={`w-32 py-3 px-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(6))}`}
                      >
                        Other Income
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(7))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-blue-700 dark:text-slate-300 uppercase tracking-wider bg-blue-50 dark:bg-blue-900 cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(7))}`}
                      >
                        Total Fixed
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(8))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-green-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(8))}`}
                      >
                        MTR (Taxable Income)
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(9))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-green-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(9))}`}
                      >
                        Next MTR Threshold
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(10))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-green-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(10))}`}
                      >
                        Marginal Income Required
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(11))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-green-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(11))}`}
                      >
                        Next MTR
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(12))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-orange-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(12))}`}
                      >
                        Previous MTR Threshold
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(13))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-orange-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(13))}`}
                      >
                        Marginal Deduction Required
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(14))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-orange-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(14))}`}
                      >
                        Previous MTR
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(15))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-purple-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(15))}`}
                      >
                        Registered Withdrawal
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(16))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-purple-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(16))}`}
                      >
                        Non-Registered Withdrawal
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(17))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-purple-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(17))}`}
                      >
                        TFSA Withdrawal
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(18))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-purple-700 dark:text-slate-300 uppercase tracking-wider bg-purple-50 dark:bg-purple-900 cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(18))}`}
                      >
                        Total Variable
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(19))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-orange-700 dark:text-slate-300 uppercase tracking-wider bg-orange-50 dark:bg-orange-900 cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(19))}`}
                      >
                        Total Income
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(20))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-orange-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(20))}`}
                      >
                        Taxable Income
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(21))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(21))}`}
                      >
                        Total Tax
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(22))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(22))}`}
                      >
                        After Tax Income
                      </th>
                      <th // NEW AVERAGE TAX RATE COLUMN HEADER
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(23))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(23))}`}
                      >
                        Average Tax Rate
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(24))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(24))}`}
                      >
                        Cumulative Income
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(25))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(25))}`}
                      >
                        Cumulative Tax
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(26))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(26))}`}
                      >
                        OAS Clawback Tax
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(27))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-green-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(27))}`}
                      >
                        Allowable Income Before Clawback
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(28))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(28))}`}
                      >
                        Available Registered
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(29))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(29))}`}
                      >
                        Available Non-Registered
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(30))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(30))}`}
                      >
                        Available TFSA
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(31))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-blue-700 dark:text-slate-300 uppercase tracking-wider bg-blue-50 dark:bg-blue-900 cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(31))}`}
                      >
                        Target Income
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(32))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-blue-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(32))}`}
                      >
                        % of Target
                      </th>
                      <th
                        onDoubleClick={() => handleHighlight('col', getColumnIndex(33))}
                        className={`py-3 px-2 text-right text-xs font-semibold text-orange-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, getColumnIndex(33))}`}
                      >
                        Shortfall/Surplus
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                    {projectionData.map((projection, rowIndex) => (
                      <tr key={projection.year}
                        className={`${rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${getHighlightClass(rowIndex, null)}`}
                      >
                        <td
                          onDoubleClick={() => handleHighlight('row', rowIndex)}
                          className={`py-2 px-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap sticky left-0 bg-white dark:bg-slate-900 z-10 cursor-pointer transition-colors ${getHighlightClass(rowIndex, 0)}`}
                        >
                          {projection.year}
                        </td>
                        <td className={`py-2 px-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap transition-colors ${getHighlightClass(rowIndex, 1)}`}>
                          {projection.age}
                        </td>
                        {associatedClient && (
                          <td className={`py-2 px-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap transition-colors ${getHighlightClass(rowIndex, 2)}`}>
                            {projection.associatedAge !== null ? projection.associatedAge : 'N/A'}
                          </td>
                        )}

                        <td className={`py-2 px-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(2))}`}>
                          <Input
                            type="text"
                            className="text-right p-1 h-8 bg-white border-gray-200 focus:bg-yellow-50 focus:border-yellow-400 transition-colors w-32"
                            placeholder={formatCurrency(projection.cpp)}
                            value={displayManualOverrides[projection.year]?.cpp ?? ''}
                            onChange={(e) => handleManualOverrideDisplayChange(projection.year, 'cpp', e.target.value)}
                            onFocus={() => handleManualOverrideFocus(projection.year, 'cpp')}
                            onBlur={() => handleManualOverrideBlur(projection.year, 'cpp')}
                            disabled={isViewer}
                          />
                        </td>
                        <td className={`py-2 px-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(3))}`}>
                          <Input
                            type="text"
                            className="text-right p-1 h-8 bg-white border-gray-200 focus:bg-yellow-50 focus:border-yellow-400 transition-colors w-32"
                            placeholder={formatCurrency(projection.oas)}
                            value={displayManualOverrides[projection.year]?.oas ?? ''}
                            onChange={(e) => handleManualOverrideDisplayChange(projection.year, 'oas', e.target.value)}
                            onFocus={() => handleManualOverrideFocus(projection.year, 'oas')}
                            onBlur={() => handleManualOverrideBlur(projection.year, 'oas')}
                            disabled={isViewer}
                          />
                        </td>
                        <td className={`py-2 px-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(4))}`}>
                          <Input
                            type="text"
                            className="text-right p-1 h-8 bg-white border-gray-200 focus:bg-yellow-50 focus:border-yellow-400 transition-colors w-32"
                            placeholder={formatCurrency(projection.bridge)}
                            value={displayManualOverrides[projection.year]?.bridge ?? ''}
                            onChange={(e) => handleManualOverrideDisplayChange(projection.year, 'bridge', e.target.value)}
                            onFocus={() => handleManualOverrideFocus(projection.year, 'bridge')}
                            onBlur={() => handleManualOverrideBlur(projection.year, 'bridge')}
                            disabled={isViewer}
                          />
                        </td>
                        <td className={`py-2 px-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(5))}`}>
                          <Input
                            type="text"
                            className="text-right p-1 h-8 bg-white border-gray-200 focus:bg-yellow-50 focus:border-yellow-400 transition-colors w-32"
                            placeholder={formatCurrency(projection.pension)}
                            value={displayManualOverrides[projection.year]?.pension ?? ''}
                            onChange={(e) => handleManualOverrideDisplayChange(projection.year, 'pension', e.target.value)}
                            onFocus={() => handleManualOverrideFocus(projection.year, 'pension')}
                            onBlur={() => handleManualOverrideBlur(projection.year, 'pension')}
                            disabled={isViewer}
                          />
                        </td>
                        <td className={`py-2 px-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(6))}`}>
                          <Input
                            type="text"
                            className="text-right p-1 h-8 bg-white border-gray-200 focus:bg-yellow-50 focus:border-yellow-400 transition-colors w-32"
                            placeholder={formatCurrency(projection.other_income)}
                            value={displayManualOverrides[projection.year]?.other_income ?? ''}
                            onChange={(e) => handleManualOverrideDisplayChange(projection.year, 'other_income', e.target.value)}
                            onFocus={() => handleManualOverrideFocus(projection.year, 'other_income')}
                            onBlur={() => handleManualOverrideBlur(projection.year, 'other_income')}
                            disabled={isViewer}
                          />
                        </td>

                        <td className={`py-2 px-2 text-sm text-blue-700 dark:text-slate-300 whitespace-nowrap text-right font-semibold bg-blue-50 ${getHighlightClass(rowIndex, getColumnIndex(7))}`}>{formatCurrency(projection.total_fixed_income)}</td>

                        <td className={`py-2 px-2 text-sm text-green-700 dark:text-slate-300 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(8))}`}>{formatPercentage(projection.mtr_fixed)}</td>
                        <td className={`py-2 px-2 text-sm text-green-700 dark:text-slate-300 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(9))}`}>{projection.next_mtr_threshold !== null ? formatCurrency(projection.next_mtr_threshold) : 'N/A'}</td>
                        <td className={`py-2 px-2 text-sm text-green-700 dark:text-slate-300 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(10))}`}>
                          <span className="font-semibold text-green-700">{formatCurrency(projection.marginal_income_required)}</span>
                        </td>
                        <td className={`py-2 px-2 text-sm text-green-700 dark:text-slate-300 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(11))}`}>{projection.next_mtr !== null ? formatPercentage(projection.next_mtr) : 'N/A'}</td>
                        
                        <td className={`py-2 px-2 text-sm text-orange-700 dark:text-slate-300 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(12))}`}>{formatCurrency(projection.previous_mtr_threshold)}</td>
                        <td className={`py-2 px-2 text-sm text-orange-700 dark:text-slate-300 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(13))}`}>
                          <span className="font-semibold text-orange-700">{formatCurrency(projection.marginal_deduction_required)}</span>
                        </td>
                        <td className={`py-2 px-2 text-sm text-orange-700 dark:text-slate-300 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(14))}`}>{formatPercentage(projection.previous_mtr)}</td>

                        <td className={`py-2 px-2 text-sm text-purple-700 dark:text-slate-300 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(15))}`}>
                          <Input
                            type="text"
                            className="text-right p-1 h-8 bg-white border-purple-200 focus:bg-purple-100 focus:border-purple-400 transition-colors font-semibold text-purple-800 w-32"
                            placeholder={formatCurrency(projection.registered_withdrawal)}
                            value={displayManualOverrides[projection.year]?.registered_withdrawal ?? ''}
                            onChange={(e) => handleManualOverrideDisplayChange(projection.year, 'registered_withdrawal', e.target.value)}
                            onFocus={() => handleManualOverrideFocus(projection.year, 'registered_withdrawal')}
                            onBlur={() => handleManualOverrideBlur(projection.year, 'registered_withdrawal')}
                            disabled={isViewer}
                            title={`Registered Withdrawal for ${projection.year} - Enter amount to override calculated value`}
                          />
                        </td>
                        <td className={`py-2 px-2 text-sm text-purple-700 dark:text-slate-300 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(16))}`}>
                          <Input
                            type="text"
                            className="text-right p-1 h-8 bg-white border-purple-200 focus:bg-purple-100 focus:border-purple-400 transition-colors font-semibold text-purple-800 w-32"
                            placeholder={formatCurrency(projection.nonregistered_withdrawal)}
                            value={displayManualOverrides[projection.year]?.nonregistered_withdrawal ?? ''}
                            onChange={(e) => handleManualOverrideDisplayChange(projection.year, 'nonregistered_withdrawal', e.target.value)}
                            onFocus={() => handleManualOverrideFocus(projection.year, 'nonregistered_withdrawal')}
                            onBlur={() => handleManualOverrideBlur(projection.year, 'nonregistered_withdrawal')}
                            disabled={isViewer}
                            title={`Non-Registered Withdrawal for ${projection.year} - Enter amount to override calculated value`}
                          />
                        </td>
                        <td className={`py-2 px-2 text-sm text-purple-700 dark:text-slate-300 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(17))}`}>
                          <Input
                            type="text"
                            className="text-right p-1 h-8 bg-white border-purple-200 focus:bg-purple-100 focus:border-purple-400 transition-colors font-semibold text-purple-800 w-32"
                            placeholder={formatCurrency(projection.tfsa_withdrawal)}
                            value={displayManualOverrides[projection.year]?.tfsa_withdrawal ?? ''}
                            onChange={(e) => handleManualOverrideDisplayChange(projection.year, 'tfsa_withdrawal', e.target.value)}
                            onFocus={() => handleManualOverrideFocus(projection.year, 'tfsa_withdrawal')}
                            onBlur={() => handleManualOverrideBlur(projection.year, 'tfsa_withdrawal')}
                            disabled={isViewer}
                            title={`Tax-Free Withdrawal for ${projection.year} - Enter amount to override calculated value`}
                          />
                        </td>

                        <td className={`py-2 px-2 text-sm text-purple-700 dark:text-slate-300 whitespace-nowrap text-right font-semibold bg-purple-50 ${getHighlightClass(rowIndex, getColumnIndex(18))}`}>{formatCurrency(projection.total_variable_income)}</td>
                        <td className={`py-2 px-2 text-sm text-orange-700 dark:text-slate-300 whitespace-nowrap text-right font-semibold bg-orange-50 ${getHighlightClass(rowIndex, getColumnIndex(19))}`}>{formatCurrency(projection.total_income)}</td>

                        <td className={`py-2 px-2 text-sm text-orange-700 dark:text-slate-300 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(20))}`}>{formatCurrency(projection.taxable_income)}</td>
                        <td className={`py-2 px-2 text-sm text-red-700 dark:text-red-400 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(21))}`}>{formatCurrency(projection.total_tax)}</td>
                        <td className={`py-2 px-2 text-sm text-green-700 dark:text-green-400 whitespace-nowrap text-right font-semibold transition-colors ${getHighlightClass(rowIndex, getColumnIndex(22))}`}>{formatCurrency(projection.after_tax_income)}</td>
                        <td className={`py-2 px-2 text-sm text-blue-700 dark:text-blue-400 whitespace-nowrap text-right font-semibold transition-colors ${getHighlightClass(rowIndex, getColumnIndex(23))}`}>{formatPercentage(projection.average_tax_rate)}</td>
                        <td className={`py-2 px-2 text-sm text-gray-700 dark:text-slate-300 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(24))}`}>{formatCurrency(projection.cumulative_income)}</td>
                        <td className={`py-2 px-2 text-sm text-red-700 dark:text-red-400 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(25))}`}>{formatCurrency(projection.cumulative_tax)}</td>
                        <td className={`py-2 px-2 text-sm text-red-700 dark:text-red-400 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(26))}`}>{formatCurrency(projection.oas_clawback_tax)}</td>
                        <td className={`py-2 px-2 text-sm whitespace-nowrap text-right font-semibold transition-colors ${getHighlightClass(rowIndex, getColumnIndex(27))} ${
                          projection.allowable_income_before_clawback > 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {formatCurrency(projection.allowable_income_before_clawback)}
                        </td>

                        <td className={`py-2 px-2 text-sm text-gray-700 dark:text-slate-300 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(28))}`}>
                          {formatCurrency(projection.available_registered)}
                        </td>
                        <td className={`py-2 px-2 text-sm text-gray-700 dark:text-slate-300 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(29))}`}>
                          {formatCurrency(projection.available_nonregistered)}
                        </td>
                        <td className={`py-2 px-2 text-sm text-gray-700 dark:text-slate-300 whitespace-nowrap text-right transition-colors ${getHighlightClass(rowIndex, getColumnIndex(30))}`}>
                          {formatCurrency(projection.available_tfsa)}
                        </td>

                        <td className={`py-2 px-2 text-sm text-blue-700 dark:text-slate-300 whitespace-nowrap text-right bg-blue-50 ${getHighlightClass(rowIndex, getColumnIndex(31))}`}>
                          <Input
                            type="text"
                            className="w-32 text-right p-1 h-8 bg-white border-blue-200 focus:bg-blue-100 focus:border-blue-400 transition-colors"
                            value={displayTargetIncomes[projection.year] !== undefined ? displayTargetIncomes[projection.year] : formatCurrency(projection.target_income)}
                            onChange={(e) => {
                              setDisplayTargetIncomes(prev => ({
                                ...prev,
                                [projection.year]: e.target.value
                              }));
                            }}
                            onBlur={(e) => {
                              handleTargetIncomeChange(projection.year, e.target.value);
                            }}
                            onFocus={() => {
                              setDisplayTargetIncomes(prev => ({
                                ...prev,
                                [projection.year]: String(targetIncomes[projection.year] !== undefined ? targetIncomes[projection.year] : projection.target_income)
                              }));
                            }}
                            disabled={isViewer}
                            title={`Target Income for ${projection.year} - Enter amount to override calculated value`}
                          />
                        </td>
                        <td className={`py-2 px-2 text-sm text-blue-700 dark:text-slate-300 whitespace-nowrap text-right font-medium transition-colors ${getHighlightClass(rowIndex, getColumnIndex(32))}`}>
                          <span className={`font-medium ${projection.percentage_of_target >= 100 ? 'text-green-600' : projection.percentage_of_target >= 90 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {formatPercentage(projection.percentage_of_target)}
                          </span>
                        </td>
                        <td className={`py-2 px-2 text-sm whitespace-nowrap text-right font-bold transition-colors ${getHighlightClass(rowIndex, getColumnIndex(33))} ${
                          projection.shortfall_surplus >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatCurrency(projection.shortfall_surplus)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Tax Layering Strategy Tips
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Registered Withdrawals:</strong> Fully taxable - use when in lower tax brackets</li>
                <li>• <strong>Non-Registered Withdrawals:</strong> 50% taxable capital gains - good for tax efficiency</li>
                <li>• <strong>Tax-Free Withdrawals:</strong> TFSA - use to top up income without affecting taxes</li>
                <li>• Watch the <strong>Next MTR Threshold</strong> and <strong>Marginal Income Required</strong> to optimize layering</li>
                <li>• Monitor <strong>OAS Clawback</strong> - keep taxable income below threshold when possible</li>
                <li>• Reduce taxable income by <strong>Marginal Deduction Required</strong> to drop to the <strong>Previous MTR</strong>.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </fieldset>

      <div className="max-w-5xl mx-auto p-6">
          <fieldset disabled={isViewer}>
              <GiuseppeAIOptimizer
                  calculatorName="Retirement Income Planning Analysis"
                  calculatorData={{
                      formData,
                      projectionData: projectionData,
                      manualOverrides,
                      totalProjectedIncome: projectionData.reduce((sum, year) => sum + (year.total_income || 0), 0),
                      totalProjectedTax: projectionData.reduce((sum, year) => sum + (year.total_tax || 0), 0),
                      averageEffectiveTaxRate: projectionData.length > 0 ?
                        (projectionData.reduce((sum, year) => sum + (year.total_tax || 0), 0) /
                         projectionData.reduce((sum, year) => sum + (year.total_income || 0), 0) * 100) : 0
                  }}
                  disabled={isViewer}
              />
          </fieldset>
      </div>
    </TooltipProvider>
  );
});

export default TaxLayeringCalculator;
