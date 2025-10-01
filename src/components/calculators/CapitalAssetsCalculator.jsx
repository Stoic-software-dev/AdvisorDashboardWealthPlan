
import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, BarChart as RechartsBarChart, Bar, AreaChart, Area, ComposedChart } from 'recharts';
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";


import { TrendingUp, Calculator, User, Target, Table as LucideTable, BarChart as LucideBarChart, Plus, Minus, Shuffle, Pencil, Info, Users, Settings, Trash2, Undo2, FileDown, ChevronDown, ChevronUp, HelpCircle, Loader2, Download, Save, RotateCcw, Edit, RefreshCcw, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import ContributionPeriodModal from './ContributionPeriodModal';
import RedemptionPeriodModal from './RedemptionPeriodModal';
import ReturnPeriodModal from './ReturnPeriodModal';

import { FinancialGoal, Portfolio, AppSettings, NetWorthStatement, Asset, TaxBracket, Fund } from "@/api/entities";
import { differenceInYears } from "date-fns";
import MultiClientSelector from '../shared/MultiClientSelector';
import GiuseppeAIOptimizer from '../shared/GiuseppeAIOptimizer';
import { generateCapitalAssetsPdf } from '@/api/functions';

const INFLATION_RATE = 2.5;

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

// Export function to extract comparison data from capital assets calculator state
export const extractCapitalAssetsComparisonData = (stateData, clients = [], allFunds = []) => {
  if (!stateData || !stateData.formData) {
    return null;
  }

  const { formData, actualBalances = {}, lumpSums = {}, manualYear0Ror = null, useActualBalances = false } = stateData;

  const getClientName = (clientId) => {
    if (!clients || !Array.isArray(clients)) return '';
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : '';
  };

  const numericInitialAmount = parseFloat(formData.initial_investment) || 0;
  const timePeriod = parseInt(formData.projection_years, 10) || 0;
  const startYear = parseInt(formData.start_calendar_year, 10) || new Date().getFullYear();
  const marginalTaxRate = (parseFloat(formData.marginal_tax_rate) || 0) / 100;
  const capitalGainsTaxRate = (parseFloat(formData.capital_gains_tax_rate) || 0) / 100;
  
  // Determine effective MER for comparison data, respecting the apply_mer toggle
  let effectiveMERPercentage = 0;
  if (formData.apply_mer) {
    effectiveMERPercentage = parseFloat(formData.mer_manual) || 0;
    if (formData.portfolio_id && allFunds.length > 0 && stateData.portfolios) { // Ensure portfolios are present in stateData
      const portfolio = stateData.portfolios.find(p => p.id === formData.portfolio_id);
      if (portfolio && portfolio.fund_holdings && portfolio.fund_holdings.length > 0) {
        let totalWeightedMER = 0;
        let totalAllocation = 0;
        let hasValidMER = false;

        portfolio.fund_holdings.forEach(holding => {
          const fund = allFunds.find(f => f.id === holding.fund_id);
          // Check for fund.mer !== undefined to ensure 'mer' property exists before using it
          if (fund && fund.mer !== undefined && holding.allocation_percentage !== undefined) {
            totalWeightedMER += (holding.allocation_percentage / 100) * fund.mer;
            totalAllocation += holding.allocation_percentage / 100;
            hasValidMER = true;
          }
        });
        if (hasValidMER && totalAllocation > 0) {
          effectiveMERPercentage = (totalWeightedMER / totalAllocation) * 100;
        }
      }
    }
  }
  const effectiveMER = effectiveMERPercentage / 100;

  const currentAge = parseInt(formData.current_age, 10) || 0; // Added currentAge for use here

  const periods = formData.periods || [];
  const redemption_periods = formData.redemption_periods || [];
  const return_periods = formData.return_periods || [];

  // Local helper for return calculation, similar to component's getReturnForYear
  const getReturnForYearLocal = (year) => {
    // Check if this is Year 0 and we have a manual override from the stateData
    if (year === 0 && manualYear0Ror !== null && manualYear0Ror !== undefined && manualYear0Ror !== '') {
      const parsedManualRate = parseFloat(manualYear0Ror);
      return isNaN(parsedManualRate) ? 0 : parsedManualRate / 100;
    }

    if (!return_periods || !Array.isArray(return_periods)) return 0.05;
    const period = return_periods.find(p => year >= p.start_year && (p.end_year === 0 ? true : year <= p.end_year));
    
    if (!period) return 0.05;

    return (parseFloat(period.return_rate) || 0) / 100;
  };

  const projectionData = [];
  let cumulativeContributionsDuringProjection = 0;
  let cumulativeRedemptionsDuringProjection = 0;
  let cumulativeTaxPaidOnGrowth = 0;
  let cumulativeTaxSavingsFromContributions = 0;
  let cumulativeNetGrowth = 0;
  let cumulativeEstimatedFees = 0;

  // Get the RoR for Year 1 to use as a baseline for prorating Year 0 fees.
  const year1RoR = getReturnForYearLocal(1);

  for (let i = 0; i <= timePeriod; i++) {
    const beginningBalance = (i === 0) ? numericInitialAmount : projectionData[i - 1].balanceAfterFees;
    
    let balanceBeforeContributionsRedemptions = beginningBalance;

    const currentContributionPeriod = periods.find(p => i >= p.start_year && (p.end_year === 0 ? true : i <= p.end_year));
    const currentRedemptionPeriod = redemption_periods.find(p => i >= p.start_year && (p.end_year === 0 ? true : i <= p.end_year));
    
    let periodicContribution = 0;
    if (currentContributionPeriod) {
        periodicContribution = parseFloat(currentContributionPeriod.annual_contribution) || 0;
        if (currentContributionPeriod.indexing_rate_type !== 'none' && i > currentContributionPeriod.start_year) {
            const rate = INFLATION_RATE / 100;
            periodicContribution *= Math.pow(1 + rate, i - currentContributionPeriod.start_year);
        }
    }

    let periodicRedemption = 0;
    if (currentRedemptionPeriod) {
        const redemptionType = currentRedemptionPeriod.redemption_type || 'fixed_amount';

        if (redemptionType === 'fixed_amount') {
            periodicRedemption = parseFloat(currentRedemptionPeriod.annual_redemption) || 0;
            if (currentRedemptionPeriod.indexing_rate_type !== 'none' && i > currentRedemptionPeriod.start_year) {
                const rate = INFLATION_RATE / 100;
                periodicRedemption *= Math.pow(1 + rate, i - currentRedemptionPeriod.start_year);
            }
        } else {
            const percentageRate = (parseFloat(currentRedemptionPeriod.percentage_of_initial_rate) || 0) / 100;
            if (redemptionType === 'percentage_of_initial') {
                periodicRedemption = numericInitialAmount * percentageRate;
            } else if (redemptionType === 'percentage_of_current') {
                periodicRedemption = beginningBalance * percentageRate;
            }
        }
    }
    
    const lumpSumContribution = lumpSums[i]?.contribution || 0;
    const lumpSumRedemption = lumpSums[i]?.redemption || 0;

    const totalContributionForYear = periodicContribution + lumpSumContribution;
    const totalRedemptionForYear = periodicRedemption + lumpSumRedemption;

    let balanceForGrowth = balanceBeforeContributionsRedemptions + lumpSumContribution - lumpSumRedemption;
    if (i > 0) {
        if (currentContributionPeriod?.contribution_timing === 'beginning') balanceForGrowth += periodicContribution;
        if (currentRedemptionPeriod?.redemption_timing === 'beginning') {
            const actualBeginningRedemption = Math.min(balanceForGrowth, periodicRedemption);
            balanceForGrowth -= actualBeginningRedemption;
        }
    }
    
    const ror = getReturnForYearLocal(i);
    
    const grossGrowth = balanceForGrowth * ror;
    const netGrowth = grossGrowth;

    let taxSavings = 0;
    let taxPaidThisYear = 0;

    if (formData.account_type === 'registered') {
        taxSavings = totalContributionForYear * marginalTaxRate;
        taxPaidThisYear = totalRedemptionForYear * marginalTaxRate;
    } else if (formData.account_type === 'non_registered' && netGrowth > 0) {
        const potentialTax = netGrowth * capitalGainsTaxRate;
        if (!formData.defer_tax_on_growth) {
            taxPaidThisYear = potentialTax;
        }
    }
    
    let balanceAfterGrowth = balanceForGrowth + netGrowth;

    if (i > 0) {
        if (currentContributionPeriod?.contribution_timing === 'end') balanceAfterGrowth += periodicContribution;
        if (currentRedemptionPeriod?.redemption_timing === 'end') {
            const actualEndRedemption = Math.min(balanceAfterGrowth, periodicRedemption);
            balanceAfterGrowth -= actualEndRedemption;
        }
    }
    
    let endingBalanceBeforeMERAndActualOverride = balanceAfterGrowth;

    if (formData.account_type === 'non_registered' && netGrowth > 0 && !formData.defer_tax_on_growth) {
        endingBalanceBeforeMERAndActualOverride -= taxPaidThisYear;
    }

    // Handle actual balances override if enabled
    let variancePercent = 0;
    let varianceDollar = 0;
    let actualRoR = null;
    const actualBalance = actualBalances[i];

    let balanceUsedForFeeAndFinalCalculation = endingBalanceBeforeMERAndActualOverride;

    if (useActualBalances && actualBalance !== undefined && actualBalance !== null && !isNaN(actualBalance)) {
        varianceDollar = actualBalance - endingBalanceBeforeMERAndActualOverride;
        variancePercent = endingBalanceBeforeMERAndActualOverride !== 0 ? (varianceDollar / endingBalanceBeforeMERAndActualOverride) * 100 : 0;
        
        const numerator = actualBalance - beginningBalance - totalContributionForYear + totalRedemptionForYear;
        if (beginningBalance !== 0) {
          actualRoR = numerator / beginningBalance;
        }

        balanceUsedForFeeAndFinalCalculation = actualBalance;
    }

    const averageAnnualBalanceForFees = (beginningBalance + balanceUsedForFeeAndFinalCalculation) / 2;
    
    let estimatedFees = formData.apply_mer ? (averageAnnualBalanceForFees * effectiveMER) : 0;
    let proratedMERPercentage = effectiveMERPercentage;

    // Prorate fees and MER for Year 0 if there's a manual RoR override
    if (i === 0 && manualYear0Ror !== null && manualYear0Ror !== undefined && manualYear0Ror !== '') {
        const manualRoR_decimal = parseFloat(manualYear0Ror) / 100;
        
        // Only prorate if we have a positive baseline RoR for the following year
        if (year1RoR > 0) {
            const ratio = Math.max(0, manualRoR_decimal / year1RoR);
            estimatedFees *= ratio;
            proratedMERPercentage *= ratio;
        } else if (manualRoR_decimal === 0) {
             // If year1RoR is 0 and manualRoR is 0, fees should also be 0 for Year 0.
             estimatedFees = 0;
             proratedMERPercentage = 0;
        }
    }

    const balanceAfterFees = Math.max(0, balanceUsedForFeeAndFinalCalculation - estimatedFees);

    if (i > 0) {
        cumulativeContributionsDuringProjection += totalContributionForYear;
    }
    cumulativeRedemptionsDuringProjection += totalRedemptionForYear;
    cumulativeTaxPaidOnGrowth += taxPaidThisYear;
    cumulativeTaxSavingsFromContributions += taxSavings;
    cumulativeNetGrowth += netGrowth;
    cumulativeEstimatedFees += estimatedFees;

    projectionData.push({
      year: startYear + i,
      age: currentAge + i,
      beginningBalance: beginningBalance,
      periodicContribution: periodicContribution,
      lumpSumContribution: lumpSumContribution,
      taxSavings: taxSavings,
      periodicRedemption: periodicRedemption,
      lumpSumRedemption: lumpSumRedemption,
      ror,
      growth: netGrowth,
      taxOnGrowth: taxPaidThisYear,
      projectedBalance: endingBalanceBeforeMERAndActualOverride, // Renamed from endingBalance
      averageAnnualBalance: averageAnnualBalanceForFees,
      mer: proratedMERPercentage,
      estimatedFees: estimatedFees,
      balanceAfterFees: balanceAfterFees,
      cumulativeTotalGrowth: cumulativeNetGrowth,
      cumulativeTotalTaxSavings: cumulativeTaxSavingsFromContributions,
      cumulativeTotalTaxOnGrowth: cumulativeTaxPaidOnGrowth,
      cumulativeEstimatedFees: cumulativeEstimatedFees,
      variancePercent,
      varianceDollar,
      actualRoR,
    });
  }

  let comparisonName = formData.calculator_name || 'Capital Assets';
  const clientIds = formData.client_ids || (formData.client_id ? [formData.client_id] : []);
  if (clientIds && clientIds.length > 0) {
    const clientNames = clientIds.map(id => getClientName(id)).filter(Boolean);
    if (clientNames.length > 0) {
      comparisonName = `${comparisonName} (${clientNames.join(', ')})`;
    }
  }

  const finalEndingBalance = projectionData.length > 0 ? projectionData[projectionData.length - 1].balanceAfterFees : numericInitialAmount;
  const totalContributionsFinal = numericInitialAmount + cumulativeContributionsDuringProjection;
  const totalRedemptionsFinal = cumulativeRedemptionsDuringProjection;
  const totalGrowthFinal = finalEndingBalance + totalRedemptionsFinal + cumulativeEstimatedFees - totalContributionsFinal;
  
  const totalTaxPayableFinal = cumulativeTaxPaidOnGrowth;
  const totalTaxSavingsFinal = cumulativeTaxSavingsFromContributions;
  
  // Calculate average Gross RoR and MER for the netReturnPercentage calculation in export
  let averageGrossRoR = 0;
  let averageMER = 0;
  if (projectionData.length > 0) {
    // Exclude year 0 as it's an initial balance, not a growth year
    const relevantProjections = projectionData.filter((_, index) => index > 0);
    if (relevantProjections.length > 0) {
      const totalRoR = relevantProjections.reduce((sum, row) => sum + (row.ror || 0), 0);
      averageGrossRoR = (totalRoR / relevantProjections.length) * 100;
      
      if (formData.apply_mer) {
        const totalMER = relevantProjections.reduce((sum, row) => sum + (row.mer || 0), 0);
        averageMER = totalMER / relevantProjections.length;
      }
    }
  }

  return {
    name: comparisonName,
    projectionData,
    finalMetrics: {
      endingBalance: finalEndingBalance,
      totalGrowth: totalGrowthFinal,
      totalContributions: totalContributionsFinal,
      totalRedemptions: totalRedemptionsFinal,
      totalTaxPayable: totalTaxPayableFinal,
      totalTaxOnGrowth: totalTaxPayableFinal,
      totalTaxSavings: totalTaxSavingsFinal,
      totalEstimatedFees: formData.apply_mer ? cumulativeEstimatedFees : 0,
      netReturnPercentage: averageGrossRoR - averageMER
    }
  };
};

const emptyFormData = {
  calculator_name: "",
  client_ids: [],
  goal_id: "",
  portfolio_id: "",
  initial_investment: 0,
  projection_years: 25,
  start_calendar_year: new Date().getFullYear(),
  mer_manual: 0,
  apply_mer: false, // Added apply_mer field
  province: "",
  annual_income: 75000,
  marginal_tax_rate: 0,
  capital_gains_tax_rate: 0,
  enable_monte_carlo: false,
  monte_carlo_runs: 1000,
  account_type: "non_registered",
  defer_tax_on_growth: false,
  periods: [],
  return_periods: [],
  redemption_periods: [],
  current_age: "",
  scenario_details: "",
};

function CapitalAssetsCalculator({ clients = [], goals, portfolios, isLoading, preselectedClientId, initialState, isViewer = false, currentInstance, onNameChange }, ref) {
  const [formData, setFormData] = useState({
    ...emptyFormData,
    start_calendar_year: new Date().getFullYear(),
    client_ids: preselectedClientId ? [preselectedClientId] : []
  });

  const [results, setResults] = useState(null);
  const [projectionData, setProjectionData] = useState([]);
  const [viewMode, setViewMode] = useState("table");
  const [actualBalances, setActualBalances] = useState({});
  const [lumpSums, setLumpSums] = useState({});
  const [displayLumpSums, setDisplayLumpSums] = useState({}); // New state for formatted lump sums
  const [highlight, setHighlight] = useState({ type: null, index: null, cell: null });
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [editingContributionIndex, setEditingContributionIndex] = useState(-1);
  const [editingRedemptionIndex, setEditingRedemptionIndex] = useState(-1);
  const [editingReturnIndex, setEditingReturnIndex] = useState(-1);
  const [displayValues, setDisplayValues] = useState({});
  const [appSettings, setAppSettings] = useState({ preferred_inflation_rate: INFLATION_RATE });
  const [netWorthAssets, setNetWorthAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [manualYear0Ror, setManualYear0Ror] = useState(null);
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [monteCarloResult, setMonteCarloResult] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [assetSelectionMode, setAssetSelectionMode] = useState('manual');
  const [selectedAggregatedCategoryId, setSelectedAggregatedCategoryId] = useState(null); // New state for aggregated categories

  const [taxRates, setTaxRates] = useState([]);
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [taxRateError, setTaxRateError] = useState(null);
  const [taxRateLastUpdated, setTaxRateLastUpdated] = useState(null);
  const [useActualBalances, setUseActualBalances] = useState(false);

  const [linkedPortfolio, setLinkedPortfolio] = useState(null);
  const [calculatedMER, setCalculatedMER] = useState(0); // FIX: Correctly initialize state with useState

  const [funds, setFunds] = useState([]);

  useEffect(() => {
    const loadFunds = async () => {
      try {
        const fundsData = await Fund.list();
        setFunds(fundsData || []);
      } catch (error) {
        console.error("Error loading funds:", error);
        setFunds([]);
      }
    };
    loadFunds();
  }, []);

  const aggregatedAssets = useMemo(() => {
    if (!netWorthAssets || netWorthAssets.length === 0) return [];

    const categories = {
      registered: { name: 'All Registered Assets', value: 0, id: 'agg_registered' },
      non_registered: { name: 'All Non-Registered Assets', value: 0, id: 'agg_non_registered' },
      tax_free: { name: 'All Tax-Free Assets', value: 0, id: 'agg_tax_free' },
      real_estate: { name: 'All Real Estate Assets', value: 0, id: 'agg_real_estate' },
    };

    netWorthAssets.forEach(asset => {
      const value = asset.asset_value || 0;
      switch (asset.asset_category) {
        case 'Capital Registered':
          categories.registered.value += value;
          break;
        case 'Capital Non-Registered':
          categories.non_registered.value += value;
          break;
        case 'Capital Tax-Free':
          categories.tax_free.value += value;
          break;
        case 'Principal Residence':
        case 'Investment Real Estate':
        case 'Other Real Estate':
          categories.real_estate.value += value;
          break;
        default:
          break;
      }
    });

    return Object.values(categories).filter(cat => cat.value > 0);
  }, [netWorthAssets]);

  const handleFormDataChange = useCallback((field, value) => {
    if (field === 'calculator_name' && onNameChange) {
      onNameChange(value);
    }

    let finalValue = value;
    if (value === 'no_goal' || value === 'no_portfolio') {
      finalValue = '';
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: finalValue === null || finalValue === undefined || finalValue === "null" ? "" : finalValue,
      // Ensure array fields remain arrays
      periods: Array.isArray(prev.periods) ? prev.periods : [],
      redemption_periods: Array.isArray(prev.redemption_periods) ? prev.redemption_periods : [],
      return_periods: Array.isArray(prev.return_periods) ? prev.return_periods : [],
    }));
  }, [onNameChange]);

  // Initialize state from props - FIXED VERSION
  useEffect(() => {
    if (initialState && typeof initialState === 'object') {
      console.log('DEBUG: CapitalAssetsCalculator initializing from saved state:', initialState);
      
      // Load formData from saved state
      if (initialState.formData) {
        const clientIds = initialState.formData.client_ids || 
                         (initialState.formData.client_id ? [initialState.formData.client_id] : []) ||
                         (preselectedClientId ? [preselectedClientId] : []);
        
        const safeFormData = {
          ...emptyFormData,
          ...initialState.formData,
          client_ids: clientIds,
          start_calendar_year: initialState.formData.start_calendar_year || new Date().getFullYear(),
          // Ensure array fields are correctly initialized from initialState or fallback to empty array
          periods: Array.isArray(initialState.formData?.periods) ? initialState.formData.periods : [],
          redemption_periods: Array.isArray(initialState.formData?.redemption_periods) ? initialState.formData.redemption_periods : [],
          return_periods: Array.isArray(initialState.formData?.return_periods) ? initialState.formData.return_periods : [],
          province: "Combined Rates", // Keep default if not overridden
          // Ensure mer_manual is always parsed to a number with a fallback, even if initialState.formData.mer_manual is null/undefined/non-numeric string
          mer_manual: initialState.formData?.mer_manual !== undefined ? (parseFloat(initialState.formData.mer_manual) || 0) : (parseFloat(initialState.formData?.mer) || 0),
          apply_mer: initialState.formData?.apply_mer !== undefined ? initialState.formData.apply_mer : false, // Load apply_mer
        };
        
        console.log('DEBUG: Setting formData from saved state:', safeFormData);
        setFormData(safeFormData);
      }
      
      // Load other saved state variables, falling back to defaults if not present
      const savedLumpSums = initialState.lumpSums || {};
      console.log('DEBUG: Setting lumpSums from saved state:', savedLumpSums);
      setLumpSums(savedLumpSums);
      
      // Initialize display values for lumpSums
      const newDisplayLumpSums = {};
      Object.keys(savedLumpSums).forEach(year => {
        if (savedLumpSums[year].contribution !== undefined && savedLumpSums[year].contribution !== null) {
          const val = parseFloat(savedLumpSums[year].contribution);
          newDisplayLumpSums[`${year}_contribution`] = val === 0 ? '' : formatCurrency(val);
        }
        if (savedLumpSums[year].redemption !== undefined && savedLumpSums[year].redemption !== null) {
          const val = parseFloat(savedLumpSums[year].redemption);
          newDisplayLumpSums[`${year}_redemption`] = val === 0 ? '' : formatCurrency(val);
        }
      });
      setDisplayLumpSums(newDisplayLumpSums);
      
      // projectionData and results are derived, they should not be loaded directly
      // and will be recalculated by other effects when formData changes.
      
      const savedActualBalances = initialState.actualBalances || {};
      console.log('DEBUG: Setting actualBalances from saved state:', savedActualBalances);
      setActualBalances(savedActualBalances);
      
      const savedUseActualBalances = typeof initialState.useActualBalances === 'boolean' ? initialState.useActualBalances : false;
      console.log('DEBUG: Setting useActualBalances from saved state:', savedUseActualBalances);
      setUseActualBalances(savedUseActualBalances);
      
      // Correctly handle manualYear0Ror (using the correct state name)
      const savedManualYear0Ror = initialState.manualYear0Ror;
      // Re-evaluate year0Period based on the loaded formData (if available, otherwise emptyFormData)
      const currentFormData = initialState.formData || emptyFormData;
      const year0Period = Array.isArray(currentFormData.return_periods) ? currentFormData.return_periods.find(p => p.start_year <= 0 && (p.end_year === 0 ? true : p.end_year >= 0)) : null;

      if (savedManualYear0Ror !== null && savedManualYear0Ror !== undefined) {
        console.log('DEBUG: Setting manualYear0Ror from saved state:', savedManualYear0Ror);
        setManualYear0Ror(savedManualYear0Ror);
      } else if (year0Period && year0Period.return_type === 'fixed') {
        console.log('DEBUG: Setting manualYear0Ror from year0Period:', year0Period.return_rate);
        setManualYear0Ror(year0Period.return_rate);
      } else {
        console.log('DEBUG: Clearing manualYear0Ror');
        setManualYear0Ror(null);
      }

      // Also ensure other UI-related states are loaded
      setSelectedAssetIds(initialState.selectedAssetIds || []);
      setAssetSelectionMode(initialState.assetSelectionMode || 'manual');
      setSelectedAggregatedCategoryId(initialState.selectedAggregatedCategoryId || null);

      // Set display values based on the loaded safeFormData (or fall back to emptyFormData values)
      const displayData = initialState.formData || emptyFormData;
      setDisplayValues({
        initial_investment: formatCurrency(displayData.initial_investment),
        mer_manual: formatPercentage(displayData.mer_manual !== undefined ? (parseFloat(displayData.mer_manual) || 0) : (parseFloat(displayData.mer) || 0)),
        annual_income: formatCurrency(displayData.annual_income),
      });

    } else if (preselectedClientId) {
      // Only set preselected client if no saved state
      console.log('DEBUG: No saved state, using preselected client:', preselectedClientId);
      const newFormData = {
        ...emptyFormData,
        client_ids: [preselectedClientId],
        province: "Combined Rates",
        start_calendar_year: new Date().getFullYear(),
        apply_mer: false, // Default for new calculators
      };
      setFormData(newFormData);
      setActualBalances({});
      setLumpSums({});
      setDisplayLumpSums({}); // Clear display lump sums
      setUseActualBalances(false);
      setSelectedAssetIds([]);
      setAssetSelectionMode('manual');
      setSelectedAggregatedCategoryId(null); // Clear aggregated category ID
      
      // Handle manualYear0Ror for new calculation
      const year0Period = newFormData.return_periods?.find(p => p.start_year <= 0 && (p.end_year === 0 ? true : p.end_year >= 0));
      if (year0Period && year0Period.return_type === 'fixed') {
        setManualYear0Ror(newFormData.return_periods[0].return_rate);
      } else {
        setManualYear0Ror(null);
      }

      setDisplayValues({
        initial_investment: formatCurrency(newFormData.initial_investment),
        mer_manual: formatPercentage(newFormData.mer_manual),
        annual_income: formatCurrency(newFormData.annual_income),
      });
    } else {
      // Truly new calculator, no initialState and no preselectedClientId
      console.log('DEBUG: No saved state or preselected client, initializing with empty form data.');
      const newFormData = { // Using newFormData here for consistency with the block above
        ...emptyFormData,
        client_ids: [],
        province: "Combined Rates",
        start_calendar_year: new Date().getFullYear(),
        apply_mer: false,
      };
      setFormData(newFormData);
      setActualBalances({});
      setLumpSums({});
      setDisplayLumpSums({}); // Clear display lump sums
      setUseActualBalances(false);
      setSelectedAssetIds([]);
      setAssetSelectionMode('manual');
      setSelectedAggregatedCategoryId(null);
      
      const year0Period = newFormData.return_periods?.find(p => p.start_year <= 0 && (p.end_year === 0 ? true : p.end_year >= 0));
      if (year0Period && year0Period.return_type === 'fixed') {
        setManualYear0Ror(newFormData.return_periods[0].return_rate);
      } else {
        setManualYear0Ror(null);
      }

      setDisplayValues({
        initial_investment: formatCurrency(newFormData.initial_investment),
        mer_manual: formatPercentage(newFormData.mer_manual),
        annual_income: formatCurrency(newFormData.annual_income),
      });
    }
    setTaxRates([]);
    setIsFetchingRates(false);
    setTaxRateError(null);
    setTaxRateLastUpdated(null);
  }, [initialState, preselectedClientId]);

  useEffect(() => {
    if (currentInstance) {
      setFormData(prev => ({
        ...prev,
        calculator_name: currentInstance.name !== undefined ? currentInstance.name : prev.calculator_name,
        client_ids: currentInstance.client_ids !== undefined ? currentInstance.client_ids : prev.client_ids,
        goal_id: currentInstance.linked_goal_id !== undefined ? currentInstance.linked_goal_id : prev.goal_id,
        portfolio_id: currentInstance.linked_portfolio_id !== undefined ? currentInstance.linked_portfolio_id : prev.portfolio_id,
        // FIX: Ensure mer_manual is always parsed to a number with a fallback when loading from currentInstance
        mer_manual: currentInstance.mer_manual !== undefined ? (parseFloat(currentInstance.mer_manual) || 0) : (parseFloat(prev.mer_manual) || 0),
        apply_mer: currentInstance.apply_mer !== undefined ? currentInstance.apply_mer : false,
      }));
    }
  }, [currentInstance]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await AppSettings.list();
        if (settings && settings.length > 0 && settings[0].preferred_inflation_rate !== undefined) {
          setAppSettings(settings[0]);
        }
      } catch (error) {
        console.error("Failed to load app settings:", error);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const primaryClientId = formData.client_ids?.[0];
    if (primaryClientId && clients && clients.length > 0) {
      const client = clients.find(c => c.id === primaryClientId);
      if (client && client.date_of_birth) {
        const ageAtCurrentDate = differenceInYears(new Date(), new Date(client.date_of_birth));
        const yearDifference = (parseInt(formData.start_calendar_year, 10) || new Date().getFullYear()) - new Date().getFullYear();
        handleFormDataChange('current_age', ageAtCurrentDate + yearDifference);
      } else {
        handleFormDataChange('current_age', "");
      }
      loadNetWorthAssets(primaryClientId);
    } else {
      setNetWorthAssets([]);
      handleFormDataChange('current_age', "");
    }
  }, [formData.client_ids, clients, formData.start_calendar_year, handleFormDataChange]);

  useEffect(() => {
    if (formData.portfolio_id && portfolios && funds.length > 0) {
      const portfolio = portfolios.find(p => p.id === formData.portfolio_id);
      setLinkedPortfolio(portfolio);
      
      console.log("Portfolio found:", portfolio);
      
      if (portfolio && portfolio.fund_holdings && portfolio.fund_holdings.length > 0) {
        let totalWeightedMER = 0;
        let totalAllocation = 0;
        let hasValidMER = false;

        portfolio.fund_holdings.forEach(holding => {
          const fund = funds.find(f => f.id === holding.fund_id);
          if (fund && fund.mer !== undefined && holding.allocation_percentage !== undefined) {
            totalWeightedMER += (holding.allocation_percentage / 100) * fund.mer;
            totalAllocation += holding.allocation_percentage / 100;
            hasValidMER = true;
          }
        });

        if (hasValidMER && totalAllocation > 0) {
          const weightedAverageMER = (totalWeightedMER / totalAllocation) * 100;
          setCalculatedMER(weightedAverageMER);
          
          console.log(`Calculated weighted average MER: ${weightedAverageMER}%`);
          
          setFormData(prev => ({
            ...prev,
            mer_manual: weightedAverageMER.toFixed(2)
          }));
          setDisplayValues(prev => ({ ...prev, mer_manual: formatPercentage(weightedAverageMER.toFixed(2)) }));
        } else {
          setCalculatedMER(0);
          console.log("No funds with MER data found or total allocation is 0");
        }
      } else {
        setCalculatedMER(0);
        console.log("Portfolio has no fund holdings");
      }
    } else {
      setLinkedPortfolio(null);
      setCalculatedMER(0);
      if (formData.portfolio_id && portfolios && funds.length === 0) {
        console.log("Funds not yet loaded, waiting...");
      }
    }
  }, [formData.portfolio_id, portfolios, funds]);


  const selectedAssetsValue = useMemo(() => {
    if (selectedAssetIds.length === 0) return 0;
    
    return selectedAssetIds.reduce((total, assetId) => {
      const asset = netWorthAssets.find(a => a.id === assetId);
      return total + (asset?.asset_value || 0);
    }, 0);
  }, [selectedAssetIds, netWorthAssets]);

  useEffect(() => {
    if (assetSelectionMode === 'multiple' && selectedAssetIds.length > 0) {
      const totalValue = selectedAssetsValue;
      setFormData(prev => ({ ...prev, initial_investment: totalValue }));
      setDisplayValues(prev => ({ ...prev, initial_investment: formatCurrency(totalValue) }));
    } else if (assetSelectionMode === 'multiple' && selectedAssetIds.length === 0) {
      setFormData(prev => ({ ...prev, initial_investment: 0 }));
      setDisplayValues(prev => ({ ...prev, initial_investment: formatCurrency(0) }));
    }
  }, [selectedAssetsValue, assetSelectionMode, selectedAssetIds.length, setFormData, setDisplayValues]);

  const calculateMarginalTaxRate = useCallback((income, brackets) => {
    if (!brackets || brackets.length === 0) return 0;
    
    const sortedBrackets = [...brackets].sort((a, b) => (a.min_income || 0) - (b.min_income || 0));

    for (const bracket of sortedBrackets) {
      const minIncome = bracket.min_income || 0;
      const maxIncome = bracket.max_income;
      
      if (income >= minIncome && (maxIncome === null || income <= maxIncome)) {
        return bracket.rate;
      }
    }
    
    return sortedBrackets[sortedBrackets.length - 1]?.rate || 0;
  }, []);

  const loadNetWorthAssets = async (clientId) => {
    if (!clientId) return;
    
    setLoadingAssets(true);
    try {
      const statements = await NetWorthStatement.filter({ client_ids: [clientId] }, '-statement_date', 1);
      
      if (statements && statements.length > 0) {
        const latestStatement = statements[0];
        const assets = await Asset.filter({ statement_id: latestStatement.id });
        
        const allAssets = (assets || []).filter(asset => 
          ['Capital Registered', 'Capital Non-Registered', 'Capital Tax-Free', 'Principal Residence', 'Investment Real Estate', 'Other Real Estate'].includes(asset.asset_category)
        );
        
        setNetWorthAssets(allAssets);
      } else {
        setNetWorthAssets([]);
      }
    } catch (error) {
      console.error("Error loading Net Worth assets:", error);
      setNetWorthAssets([]);
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleAssetSelection = (value) => {
    if (!value || value === 'manual_entry') {
      setAssetSelectionMode('manual');
      setSelectedAssetIds([]);
      setSelectedAggregatedCategoryId(null); // Clear aggregated selection
      return;
    }

    if (value === 'multiple_selection') {
      setAssetSelectionMode('multiple');
      setSelectedAssetIds([]);
      setSelectedAggregatedCategoryId(null); // Clear aggregated selection
      return;
    }

    const selectedCategory = aggregatedAssets.find(cat => cat.id === value);
    if (selectedCategory) {
      setAssetSelectionMode('aggregated');
      setSelectedAssetIds([]);
      setSelectedAggregatedCategoryId(selectedCategory.id); // Store the ID
      const newValue = selectedCategory.value || 0;
      setFormData(prev => ({ ...prev, initial_investment: newValue }));
      setDisplayValues(prev => ({ ...prev, initial_investment: formatCurrency(newValue) }));
      return;
    }

    const selectedAsset = netWorthAssets.find(asset => asset.id === value);
    if (selectedAsset) {
      setAssetSelectionMode('single');
      setSelectedAssetIds([value]);
      setSelectedAggregatedCategoryId(null); // Clear aggregated selection
      const newValue = selectedAsset.asset_value || 0;
      setFormData(prev => ({ ...prev, initial_investment: newValue }));
      setDisplayValues(prev => ({ ...prev, initial_investment: formatCurrency(newValue) }));
    }
  };

  const handleIndividualAssetToggle = (assetId) => {
    setSelectedAssetIds(prev => {
      const newSelection = prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId];
      return newSelection;
    });
  };

  const handleDisplayChange = (field, value) => {
    setDisplayValues(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field, type) => {
    const rawValue = parseValue(displayValues[field]);
    const parsed = parseFloat(rawValue);
    const finalValue = !isNaN(parsed) ? parsed : (rawValue === '' ? '' : 0);
    
    if (field === 'mer_manual') {
      handleFormDataChange('mer_manual', finalValue);
    } else if (field !== 'annual_income') {
      handleFormDataChange(field, finalValue);
    }

    if (type === 'currency') setDisplayValues(prev => ({ ...prev, [field]: formatCurrency(finalValue) }));
    if (type === 'percentage') setDisplayValues(prev => ({ ...prev, [field]: formatPercentage(finalValue) }));
  };

  const handleFocus = (field) => {
    setDisplayValues(prev => ({ ...prev, [field]: parseValue(prev[field]) }));
  };

  const handleEditContribution = (index) => {
    setEditingContributionIndex(index);
    setShowContributionModal(true);
  };
  
  const handleRemoveContribution = (index) => {
    setFormData(prev => ({ ...prev, periods: (prev.periods || []).filter((_, i) => i !== index) }));
  };
  
  const handleSaveContribution = (periodData) => {
    if (editingContributionIndex > -1) {
      setFormData(prev => ({
        ...prev,
        periods: (prev.periods || []).map((p, i) => i === editingContributionIndex ? periodData : p)
      }));
    } else {
      setFormData(prev => ({ ...prev, periods: [...(prev.periods || []), { ...periodData, id: Date.now() }] }));
    }
    setEditingContributionIndex(-1);
    setShowContributionModal(false);
  };

  const handleEditRedemption = (index) => {
    setEditingRedemptionIndex(index);
    setShowRedemptionModal(true);
  };

  const handleRemoveRedemption = (index) => {
    setFormData(prev => ({ ...prev, redemption_periods: (prev.redemption_periods || []).filter((_, i) => i !== index) }));
  };

  const handleSaveRedemption = (periodData) => {
    if (editingRedemptionIndex > -1) {
      setFormData(prev => ({
        ...prev,
        redemption_periods: (prev.redemption_periods || []).map((p, i) => i === editingRedemptionIndex ? periodData : p)
      }));
    } else {
      setFormData(prev => ({ ...prev, redemption_periods: [...(prev.redemption_periods || []), { ...periodData, id: Date.now() }] }));
    }
    setEditingRedemptionIndex(-1);
    setShowRedemptionModal(false);
  };

  const handleEditReturn = (index) => {
    setEditingReturnIndex(index);
    setShowReturnModal(true);
  };

  const handleRemoveReturn = (index) => {
    setFormData(prev => ({ ...prev, return_periods: (prev.return_periods || []).filter((_, i) => i !== index) }));
  };

  const handleSaveReturn = (periodData) => {
    if (editingReturnIndex > -1) {
      setFormData(prev => ({
        ...prev,
        return_periods: (prev.return_periods || []).map((p, i) => i === editingReturnIndex ? periodData : p)
      }));
    } else {
      setFormData(prev => ({ ...prev, return_periods: [...(prev.return_periods || []), { ...periodData, id: Date.now() }] }));
    }
    setEditingReturnIndex(-1);
    setShowReturnModal(false);
  };

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
    if (highlight.type === 'row' && highlight.index === rowIndex) {
      return 'bg-green-100 dark:bg-green-900/50';
    }
    if (highlight.type === 'col' && highlight.index === colIndex) {
      return 'bg-green-100 dark:bg-green-900/50';
    }
    if (highlight.type === 'cell' && highlight.cell?.row === rowIndex && highlight.cell?.col === colIndex) {
      return 'bg-green-100 dark:bg-green-900/50';
    }
    return '';
  };
  
  const handleActualBalanceChange = (year, value) => {
    setActualBalances(prev => {
      const newBalances = { ...prev };
      
      // If value is empty, null, or undefined, remove the entry entirely
      if (value === '' || value === null || value === undefined || isNaN(parseFloat(value))) {
        delete newBalances[year];
      } else {
        // Otherwise, set the parsed float value
        newBalances[year] = parseFloat(value);
      }
      
      return newBalances;
    });
  };
  
  const handleLumpSumChange = (year, type, value) => {
    const numericValue = parseFloat(value.toString().replace(/[^0-9.-]+/g, "")) || 0;
    
    setLumpSums(prev => {
      const newLumpSums = { ...prev };
      if (numericValue === 0) {
        if (newLumpSums[year]) {
          delete newLumpSums[year][type];
          if (Object.keys(newLumpSums[year]).length === 0) {
            delete newLumpSums[year];
          }
        }
      } else {
        if (!newLumpSums[year]) newLumpSums[year] = {};
        newLumpSums[year][type] = numericValue;
      }
      return newLumpSums;
    });
  };

  const handleLumpSumDisplayChange = (year, type, value) => {
    setDisplayLumpSums(prev => ({
      ...prev,
      [`${year}_${type}`]: value
    }));
  };

  const handleLumpSumFocus = (year, type) => {
    const rawValue = lumpSums[year]?.[type];
    setDisplayLumpSums(prev => ({
      ...prev,
      [`${year}_${type}`]: rawValue === undefined || rawValue === null ? '' : rawValue.toString()
    }));
  };

  const handleLumpSumBlur = (year, type) => {
    const rawValue = displayLumpSums[`${year}_${type}`] || '';
    const numericValue = parseFloat(rawValue.toString().replace(/[^0-9.-]+/g, "")) || 0;
    
    handleLumpSumChange(year, type, numericValue);
    
    // Format for display (empty string if 0, otherwise formatted currency)
    setDisplayLumpSums(prev => ({
      ...prev,
      [`${year}_${type}`]: numericValue === 0 ? '' : formatCurrency(numericValue)
    }));
  };

  const getMonteCarloReturn = useCallback((year, scenarioSeed = null) => {
    if (year === 0 && manualYear0Ror !== null && manualYear0Ror !== undefined && manualYear0Ror !== '') {
      const parsedManualRate = parseFloat(manualYear0Ror);
      return isNaN(parsedManualRate) ? 0 : parsedManualRate / 100;
    }

    // FIX: Ensure return_periods is an array
    const return_periods = Array.isArray(formData.return_periods) ? formData.return_periods : [];

    const period = return_periods.find(p => year >= p.start_year && (p.end_year === 0 ? true : year <= p.end_year));
    
    if (!period) return 0.05;

    const meanReturn = parseFloat(period.return_rate) || 7;
    const stdDev = parseFloat(period.standard_deviation) || 15;

    let baseReturn = meanReturn / 100;

    const isRandomRun = scenarioSeed !== null; 

    if (period.return_type === 'monte_carlo' && period.use_randomized_returns && isRandomRun) {
      const seed = scenarioSeed + year * 1000; 
      
      let s1 = (1664525 * seed + 1013904223) % Math.pow(2, 32);
      let s2 = (1664525 * (seed + 1) + 1013904223) % Math.pow(2, 32);

      const random1 = s1 / Math.pow(2, 32);
      const random2 = s2 / Math.pow(2, 32);
      
      const z0 = Math.sqrt(-2 * Math.log(Math.max(random1, 1e-10))) * Math.cos(2 * Math.PI * random2);
      
      const randomMultiplier = Math.max(-3, Math.min(3, z0));
      const randomReturn = baseReturn + (randomMultiplier * (stdDev / 100));
      
      return Math.max(-0.95, Math.min(2.0, randomReturn));
    }

    return baseReturn;
  }, [formData.return_periods, manualYear0Ror]);

  useEffect(() => {
    if (formData.calculator_name) {
        return;
    }

    let newName = '';
    if (formData.portfolio_id && portfolios) {
      const portfolio = portfolios.find(p => p.id === formData.portfolio_id);
      if (portfolio) {
        newName = portfolio.account_name;
      }
    } else if (formData.goal_id && goals) {
      const goal = goals.find(g => g.id === formData.goal_id);
      if (goal) {
        newName = goal.goal_name;
      }
    }

    if (newName) {
      handleFormDataChange('calculator_name', newName);
    }
  }, [formData.portfolio_id, formData.goal_id, portfolios, goals, formData.calculator_name, handleFormDataChange]);

  const calculateSingleProjection = useCallback((scenarioSeed = null) => {
    const numericInitialAmount = parseFloat(formData.initial_investment) || 0;
    const timePeriod = parseInt(formData.projection_years, 10) || 0;
    const startYear = parseInt(formData.start_calendar_year, 10) || new Date().getFullYear();
    const marginalTaxRate = (parseFloat(formData.marginal_tax_rate) || 0) / 100;
    const capitalGainsTaxRate = (parseFloat(formData.capital_gains_tax_rate) || 0) / 100;
    
    // Conditionally apply MER based on formData.apply_mer
    const effectiveMERPercentage = formData.apply_mer
      ? (calculatedMER > 0 && linkedPortfolio ? calculatedMER : (parseFloat(formData.mer_manual) || 0))
      : 0;
    const effectiveMER = effectiveMERPercentage / 100;

    let proj = [];

    // Get the RoR for Year 1 to use as a baseline for prorating Year 0 fees.
    const year1RoR = getMonteCarloReturn(1, scenarioSeed);

    // FIX: Ensure these are always arrays before use
    const periods = Array.isArray(formData.periods) ? formData.periods : [];
    const redemption_periods = Array.isArray(formData.redemption_periods) ? formData.redemption_periods : [];

    for (let i = 0; i <= timePeriod; i++) {
        const beginningBalance = (i === 0) ? numericInitialAmount : proj[i - 1].balanceAfterFees;
        
        let balanceBeforeContributionsRedemptions = beginningBalance;

        const currentContributionPeriod = periods.find(p => i >= p.start_year && (p.end_year === 0 ? true : i <= p.end_year));
        const currentRedemptionPeriod = redemption_periods.find(p => i >= p.start_year && (p.end_year === 0 ? true : i <= p.end_year));
        
        let periodicContribution = 0;
        if (currentContributionPeriod) {
            periodicContribution = parseFloat(currentContributionPeriod.annual_contribution) || 0;
            if (currentContributionPeriod.indexing_rate_type !== 'none' && i > currentContributionPeriod.start_year) {
                const rate = appSettings.preferred_inflation_rate === undefined ? INFLATION_RATE / 100 : (currentContributionPeriod.indexing_rate_type === 'inflation' ? appSettings.preferred_inflation_rate / 100 : (parseFloat(currentContributionPeriod.annual_index_rate) || 0) / 100);
                periodicContribution *= Math.pow(1 + rate, i - currentContributionPeriod.start_year);
            }
        }

        let periodicRedemption = 0;
        if (currentRedemptionPeriod) {
            const redemptionType = currentRedemptionPeriod.redemption_type || 'fixed_amount';

            if (redemptionType === 'fixed_amount') {
                periodicRedemption = parseFloat(currentRedemptionPeriod.annual_redemption) || 0;
                if (currentRedemptionPeriod.indexing_rate_type !== 'none' && i > currentRedemptionPeriod.start_year) {
                    const rate = appSettings.preferred_inflation_rate === undefined ? INFLATION_RATE / 100 : (currentRedemptionPeriod.indexing_rate_type === 'inflation' ? appSettings.preferred_inflation_rate / 100 : (parseFloat(currentRedemptionPeriod.custom_indexing_rate) || 0) / 100);
                    periodicRedemption *= Math.pow(1 + rate, i - currentRedemptionPeriod.start_year);
                }
            } else {
                const percentageRate = (parseFloat(currentRedemptionPeriod.percentage_of_initial_rate) || 0) / 100;
                if (redemptionType === 'percentage_of_initial') {
                    periodicRedemption = numericInitialAmount * percentageRate;
                } else if (redemptionType === 'percentage_of_current') {
                    periodicRedemption = beginningBalance * percentageRate;
                }
            }
        }
        
        const lumpSumContribution = lumpSums[i]?.contribution || 0;
        const lumpSumRedemption = lumpSums[i]?.redemption || 0;

        const totalContributionForYear = periodicContribution + lumpSumContribution;
        const totalRedemptionForYear = periodicRedemption + lumpSumRedemption;

        let balanceForGrowth = balanceBeforeContributionsRedemptions + lumpSumContribution - lumpSumRedemption;
        if (i > 0) {
            if (currentContributionPeriod?.contribution_timing === 'beginning') balanceForGrowth += periodicContribution;
            if (currentRedemptionPeriod?.redemption_timing === 'beginning') {
                const actualBeginningRedemption = Math.min(balanceForGrowth, periodicRedemption);
                balanceForGrowth -= actualBeginningRedemption;
            }
        }
        
        const ror = getMonteCarloReturn(i, scenarioSeed);
        
        const grossGrowth = balanceForGrowth * ror;
        const netGrowth = grossGrowth;

        let taxSavings = 0;
        let taxPayableForColumn = 0;

        if (formData.account_type === 'registered') {
            taxSavings = totalContributionForYear * marginalTaxRate;
            taxPayableForColumn = totalRedemptionForYear * marginalTaxRate;
        } else if (formData.account_type === 'non_registered' && netGrowth > 0) {
            const potentialTaxOnGrowth = netGrowth * capitalGainsTaxRate;
            if (!formData.defer_tax_on_growth) {
                taxPayableForColumn = potentialTaxOnGrowth;
            }
        }
        
        let balanceAfterGrowth = balanceForGrowth + netGrowth;

        if (i > 0) {
            if (currentContributionPeriod?.contribution_timing === 'end') balanceAfterGrowth += periodicContribution;
            if (currentRedemptionPeriod?.redemption_timing === 'end') {
                const actualEndRedemption = Math.min(balanceAfterGrowth, periodicRedemption);
                balanceAfterGrowth -= actualEndRedemption;
            }
        }
        
        let endingBalanceBeforeActualOverride = balanceAfterGrowth;

        if (formData.account_type === 'non_registered' && netGrowth > 0 && !formData.defer_tax_on_growth) {
            endingBalanceBeforeActualOverride -= taxPayableForColumn;
        }
        
        // Handle actual balances override if enabled
        let variancePercent = 0;
        let varianceDollar = 0;
        let actualRoR = null;
        const actualBalance = actualBalances[i];

        let balanceUsedForFeeAndFinalCalculation = endingBalanceBeforeActualOverride;

        // Only use actual balance if useActualBalances is true AND we have a valid actual balance for this year
        if (useActualBalances && actualBalance !== undefined && actualBalance !== null && !isNaN(actualBalance)) {
            varianceDollar = actualBalance - endingBalanceBeforeActualOverride;
            variancePercent = endingBalanceBeforeActualOverride !== 0 ? (varianceDollar / endingBalanceBeforeActualOverride) * 100 : 0;
            
            const numerator = actualBalance - beginningBalance - totalContributionForYear + totalRedemptionForYear;
            if (beginningBalance !== 0) {
              actualRoR = numerator / beginningBalance;
            }

            balanceUsedForFeeAndFinalCalculation = actualBalance;
        }

        const averageAnnualBalanceForFees = (beginningBalance + balanceUsedForFeeAndFinalCalculation) / 2;
        
        let estimatedFees = formData.apply_mer ? (averageAnnualBalanceForFees * effectiveMER) : 0;
        let proratedMERPercentage = effectiveMERPercentage;

        // Prorate fees and MER for Year 0 if there's a manual RoR override
        if (i === 0 && manualYear0Ror !== null && manualYear0Ror !== undefined && manualYear0Ror !== '') {
            const manualRoR_decimal = parseFloat(manualYear0Ror) / 100;
            
            // Only prorate if we have a positive baseline RoR for the following year
            if (year1RoR > 0) {
                const ratio = Math.max(0, manualRoR_decimal / year1RoR);
                estimatedFees *= ratio;
                proratedMERPercentage *= ratio;
            } else if (manualRoR_decimal === 0) {
                 // If year1RoR is 0 and manualRoR is 0, fees should also be 0 for Year 0.
                 estimatedFees = 0;
                 proratedMERPercentage = 0;
            }
        }
        
        const balanceAfterFees = Math.max(0, balanceUsedForFeeAndFinalCalculation - estimatedFees);

        proj.push({
            year: startYear + i,
            age: (parseInt(formData.current_age, 10) || 0) + i,
            beginningBalance,
            periodicContribution,
            lumpSumContribution,
            taxSavings,
            periodicRedemption,
            lumpSumRedemption,
            ror,
            growth: netGrowth,
            taxOnGrowth: taxPayableForColumn,
            
            projectedBalance: endingBalanceBeforeActualOverride,
            averageAnnualBalance: averageAnnualBalanceForFees,
            mer: proratedMERPercentage,
            estimatedFees,
            balanceAfterFees: balanceAfterFees,
            
            variancePercent,
            varianceDollar,
            actualRoR,
        });
    }
    return proj;
  }, [formData, actualBalances, lumpSums, appSettings, getMonteCarloReturn, useActualBalances, calculatedMER, linkedPortfolio, manualYear0Ror]);


  const runMonteCarloSimulation = useCallback(async () => {
    if (!formData.enable_monte_carlo) return;

    setIsSimulating(true);
    setMonteCarloResult(null);
    
    await new Promise(resolve => setTimeout(resolve, 0));

    const runs = parseInt(formData.monte_carlo_runs, 10) || 1000;
    const timePeriod = parseInt(formData.projection_years, 10) || 0;
    const startYear = parseInt(formData.start_calendar_year, 10) || new Date().getFullYear();
    const allProjections = [];

    for (let i = 0; i < runs; i++) {
      const seed = Math.random() * 1000000; 
      const projection = calculateSingleProjection(seed);
      allProjections.push(projection);
    }
    
    const finalBalances = allProjections.map(p => p[p.length - 1].balanceAfterFees).sort((a, b) => a - b);
    
    const getPercentile = (p) => {
      const index = Math.floor(runs * p);
      return finalBalances[index];
    };

    const chartData = [];
    for (let yearIndex = 0; yearIndex <= timePeriod; yearIndex++) {
      const yearBalances = allProjections.map(p => p[yearIndex].balanceAfterFees).sort((a, b) => a - b);
      
      const getYearPercentile = (p) => {
          const index = Math.floor(runs * p);
          return yearBalances[index];
      }
      
      const sum = yearBalances.reduce((a, b) => a + b, 0);
      const mean = sum / runs;

      chartData.push({
        year: startYear + yearIndex,
        p10: getYearPercentile(0.10),
        p25: getYearPercentile(0.25),
        p50: getYearPercentile(0.50),
        p75: getYearPercentile(0.75),
        p90: getYearPercentile(0.90),
        mean: mean,
      });
    }

    setMonteCarloResult({
      numRuns: runs,
      percentiles: {
        p10: getPercentile(0.10),
        p25: getPercentile(0.25),
        p50: getPercentile(0.50),
        p75: getPercentile(0.75),
        p90: getPercentile(0.90),
      },
      chartData: chartData,
    });

    setIsSimulating(false);
  }, [formData, calculateSingleProjection]);

  useEffect(() => {
    let proj = calculateSingleProjection();
    setProjectionData(proj);

    setMonteCarloResult(null);

    const computeResult = {
        projection: proj,
        totals: {
            assetClass: { fixedIncome: null, fixed_income: null },
            byAssetClass: { fixedIncome: null }
        }
    };

    console.log("===== [FI-A] COMPUTE DIAGNOSTICS (Capital Assets Calculator) =====");
    const safe = (o) => {
        try { return JSON.stringify(o, Object.keys(o ?? {}).sort(), 2); }
        catch { return String(o); }
    };
    
    console.log("[FI-A] computeResult.totals keys:", Object.keys(computeResult?.totals ?? {}));
    console.log("[FI-A] computeResult.totals.assetClass:", safe(computeResult?.totals?.assetClass ?? computeResult?.totals?.byAssetClass));

    const activeYear = new Date().getFullYear();
    const projectionForYear = computeResult?.projection?.find(p => p.year === activeYear);

    if (projectionForYear) {
        console.log(`[FI-A] Data for year ${activeYear}:`);
        console.log("[FI-A] computeResult.projection[year].assetClass:", safe(projectionForYear?.assetClass));
        console.log("[FI-A] computeResult.projection[year].registered:", safe(projectionForYear?.registered));
    } else {
        console.log(`[FI-A] No projection data found for year ${activeYear}.`);
    }

  }, [formData, actualBalances, lumpSums, appSettings, manualYear0Ror, useActualBalances, calculateSingleProjection]);

  const clientGoals = formData.client_ids && formData.client_ids.length > 0
    ? (goals || []).filter(goal => {
        const goalClientIds = goal.client_ids || (goal.client_id ? [goal.client_id] : []);
        return formData.client_ids.some(selectedId => goalClientIds.includes(selectedId));
      })
    : [];
    
  const clientPortfolios = formData.client_ids && formData.client_ids.length > 0
    ? (portfolios || []).filter(portfolio => {
        const portfolioClientIds = portfolio.client_ids || (portfolio.client_id ? [portfolio.client_id] : []);
        return formData.client_ids.some(selectedId => portfolioClientIds.includes(selectedId));
      })
    : [];

  const numericInitialAmount = parseFloat(formData.initial_investment) || 0;
  
  const summary = useMemo(() => {
    let totalContributionsCalculated = numericInitialAmount;
    let totalRedemptionsCalculated = 0;
    let totalGrossGrowthCalculated = 0;
    let totalTaxPayableCalculated = 0;
    let totalTaxSavingsCalculated = 0;
    let totalEstimatedFeesCalculated = 0;
    let averageGrossRoR = 0;
    let averageMER = 0;

    if (projectionData.length > 0) {
      const relevantProjections = projectionData.filter((_, index) => index > 0); 
      if (relevantProjections.length > 0) {
        const totalRoR = relevantProjections.reduce((sum, row) => sum + (row.ror || 0), 0);
        averageGrossRoR = (totalRoR / relevantProjections.length) * 100;

        if (formData.apply_mer) { // Only calculate averageMER if MER is applied
          const totalMER = relevantProjections.reduce((sum, row) => sum + (row.mer || 0), 0);
          averageMER = totalMER / relevantProjections.length;
        }
      }

      projectionData.forEach((row, index) => {
        if (index > 0) {
          totalContributionsCalculated += row.periodicContribution + (lumpSums[index]?.contribution || 0);
        }
        totalRedemptionsCalculated += row.periodicRedemption + (lumpSums[index]?.redemption || 0);
        totalGrossGrowthCalculated += row.growth;
        totalTaxPayableCalculated += row.taxOnGrowth;
        totalTaxSavingsCalculated += row.taxSavings; 
        totalEstimatedFeesCalculated += row.estimatedFees; // This will be 0 if apply_mer is false due to calculateSingleProjection
      });
    }

    const finalValue = projectionData.length > 0 ? projectionData[projectionData.length - 1].balanceAfterFees : numericInitialAmount;

    const actualNetGrowth = finalValue - totalContributionsCalculated + totalRedemptionsCalculated + totalEstimatedFeesCalculated;

    return {
      endingBalance: finalValue,
      totalContributions: totalContributionsCalculated,
      totalRedemptions: totalRedemptionsCalculated,
      totalGrowth: actualNetGrowth,
      totalTaxPayable: totalTaxPayableCalculated,
      totalTaxOnGrowth: totalTaxPayableCalculated,
      totalTaxSavings: totalTaxSavingsCalculated,
      totalEstimatedFees: totalEstimatedFeesCalculated,
      netReturnPercentage: averageGrossRoR - averageMER,
    };
  }, [projectionData, numericInitialAmount, lumpSums, formData.apply_mer]);

  // Move useImperativeHandle AFTER summary is defined
  useImperativeHandle(ref, () => ({
    getState: () => ({
      formData,
      actualBalances,
      lumpSums,
      manualYear0Ror,
      useActualBalances,
      selectedAssetIds, // Include selected assets in state
      assetSelectionMode, // Include selection mode in state
      projection: projectionData,
      totals: {
        assetClass: { fixedIncome: null, fixed_income: null },
        byAssetClass: { fixedIncome: null }
      }
    })
  }));

  const handleClearFields = () => {
    setFormData({
      ...emptyFormData,
      start_calendar_year: new Date().getFullYear(),
      client_ids: preselectedClientId ? [preselectedClientId] : [],
      province: "Combined Rates",
      apply_mer: false, // Reset apply_mer
    });
    setActualBalances({});
    setLumpSums({});
    setDisplayLumpSums({}); // Clear display lump sums
    setManualYear0Ror(null);
    setUseActualBalances(false);
    setSelectedAssetIds([]);
    setAssetSelectionMode('manual');
    setSelectedAggregatedCategoryId(null); // Clear aggregated category ID
    setDisplayValues({
      initial_investment: formatCurrency(emptyFormData.initial_investment),
      mer_manual: formatPercentage(emptyFormData.mer_manual),
      annual_income: formatCurrency(emptyFormData.annual_income),
    });
    setResults(null);
    setProjectionData([]);
    setIsSimulating(false);
    setMonteCarloResult(null);
    setTaxRates([]);
    setIsFetchingRates(false);
    setTaxRateError(null);
    setTaxRateLastUpdated(null);
    setLinkedPortfolio(null);
    setCalculatedMER(0);
  };

  const handleUpdateTaxRates = async () => {
    setIsFetchingRates(true);
    setTaxRateError(null);
    try {
      const currentYear = new Date().getFullYear();
      
      const ontarioBrackets = await TaxBracket.filter({ year: currentYear, province: "ON" });
      
      let storedBrackets = ontarioBrackets;
      if (!storedBrackets || storedBrackets.length === 0) {
        storedBrackets = await TaxBracket.filter({ year: currentYear, province: "Ontario" });
      }

      if (storedBrackets && storedBrackets.length > 0 && storedBrackets[0].brackets) {
        const data = storedBrackets[0];
        setTaxRates(data.brackets);
        setTaxRateLastUpdated(new Date());
        
        const income = parseFloat(formData.annual_income) || 0;
        const marginalRate = calculateMarginalTaxRate(income, data.brackets);
        const capitalGainsRate = marginalRate * 0.5;

        setFormData(prev => ({
          ...prev,
          province: "Combined Rates",
          marginal_tax_rate: marginalRate,
          capital_gains_tax_rate: capitalGainsRate,
        }));

      } else {
        setTaxRates([]);
        setTaxRateError(`No Ontario tax brackets found for ${currentYear}. Please ensure you have Ontario tax brackets configured in Application Settings.`);
        setFormData(prev => ({
          ...prev,
          marginal_tax_rate: 0,
          capital_gains_tax_rate: 0,
          province: "Combined Rates"
        }));
      }
    } catch (error) {
      console.error("Error fetching tax rates:", error);
      setTaxRateError("Failed to load Ontario tax rates from Application Settings.");
      setTaxRates([]);
      setFormData(prev => ({
        ...prev,
        marginal_tax_rate: 0,
        capital_gains_tax_rate: 0,
        province: "Combined Rates"
      }));
    } finally {
      setIsFetchingRates(false);
    }
  };

  const handleIncomeChange = (value) => {
    setFormData(prev => ({
      ...prev,
      annual_income: value
    }));

    if (taxRates.length > 0) {
      const income = parseFloat(value) || 0;
      const marginalRate = calculateMarginalTaxRate(income, taxRates);
      const capitalGainsRate = marginalRate * 0.5;
      
      setFormData(prev => ({
        ...prev,
        marginal_tax_rate: marginalRate,
        capital_gains_tax_rate: capitalGainsRate
      }));
    }
    setDisplayValues(prev => ({ ...prev, annual_income: formatCurrency(value) }));
  };

  const handleSave = async (calculatorRef, calculatorInstance) => {
    if (!calculatorRef || !calculatorRef.current || !calculatorInstance) {
      console.warn("handleSave: calculatorRef or calculatorInstance not available.");
      return;
    }

    try {
      const state_data = calculatorRef.current.getState();
      
      console.log("===== [FI-B] STORE/WRITE DIAGNOSTICS (Capital Assets Calculator) =====");
      const safe = (o) => {
          try { return JSON.stringify(o, Object.keys(o ?? {}).sort(), 2); }
          catch { return String(o); }
      };

      console.log("[FI-B] state_data.totals.assetClass:", safe(state_data?.totals?.assetClass ?? state_data?.totals?.byAssetClass));
      
      const activeYear = new Date().getFullYear();
      const projectionForYear = state_data?.projection?.find(p => p.year === activeYear);

      if (projectionForYear) {
          console.log(`[FI-B] State data projection for year ${activeYear}:`);
          console.log("[FI-B] state_data.projection[year].assetClass:", safe(projectionForYear?.assetClass));

          console.log("[FI-B] flags", {
              hasFixedIncomeTotals: Boolean(state_data?.totals?.assetClass?.fixedIncome ?? state_data?.totals?.byAssetClass?.fixedIncome),
              hasFixedIncomeProjection: Boolean(projectionForYear?.assetClass?.fixedIncome),
              incorrectlyUsingRegistered: Boolean(projectionForYear?.registered && !projectionForYear?.assetClass)
          });
      } else {
           console.log(`[FI-B] No state data projection found for year ${activeYear}.`);
      }
      
    } catch (error) {
      console.error("Error in handleSave diagnostics:", error);
    } finally {
    }
  };

  const handleExportPdf = useCallback(async () => {
    setIsExporting(true);
    try {
      if (!ref.current || !ref.current.getState) {
        toast.error("Calculator is not ready.", {
          description: "Cannot export PDF.",
        });
        setIsExporting(false);
        return;
      }
      
      const currentCalculatorState = ref.current.getState();

      if (!currentCalculatorState.projection || currentCalculatorState.projection.length === 0) {
        toast.error("Please run the projection to generate data before exporting to PDF.");
        setIsExporting(false);
        return;
      }

      console.log('Projection data structure:', currentCalculatorState.projection[0]);

      const payload = {
          calculatorState: {
              calculator_name: currentCalculatorState.formData.calculator_name || 'Capital Assets Scenario',
              scenario_details: currentCalculatorState.formData.scenario_details || '',
              client_ids: currentCalculatorState.formData.client_ids || [],
              currentValue: parseFloat(currentCalculatorState.formData.initial_investment) || 0,
              annualContribution: currentCalculatorState.formData.periods.reduce((sum, p) => sum + (parseFloat(p.annual_contribution) || 0), 0),
              yearsToGrow: parseInt(currentCalculatorState.formData.projection_years, 10) || 0,
              startCalendarYear: parseInt(currentCalculatorState.formData.start_calendar_year, 10) || new Date().getFullYear(),
              rateOfReturn: currentCalculatorState.formData.return_periods[0] ? parseFloat(currentCalculatorState.formData.return_periods[0].return_rate) : 0, 
              lumpSums: Object.entries(currentCalculatorState.lumpSums || {}).map(([year, values]) => ({ 
                year: parseInt(year, 10), 
                amount: values.contribution || 0 
              })),
              account_type: currentCalculatorState.formData.account_type,
              marginal_tax_rate: parseFloat(currentCalculatorState.formData.marginal_tax_rate) || 0,
              capital_gains_tax_rate: parseFloat(currentCalculatorState.formData.capital_gains_tax_rate) || 0,
              mer_manual: parseFloat(currentCalculatorState.formData.mer_manual) || 0,
              apply_mer: currentCalculatorState.formData.apply_mer,
              effectiveMER: calculatedMER > 0 && currentCalculatorState.formData.apply_mer ? calculatedMER : (parseFloat(currentCalculatorState.formData.mer_manual) || 0),
              defer_tax_on_growth: currentCalculatorState.formData.defer_tax_on_growth,
              enable_monte_carlo: currentCalculatorState.formData.enable_monte_carlo,
              monte_carlo_runs: currentCalculatorState.formData.monte_carlo_runs,
              useActualBalances: currentCalculatorState.useActualBalances,
              periods: currentCalculatorState.formData.periods,
              redemption_periods: currentCalculatorState.formData.redemption_periods,
              return_periods: currentCalculatorState.formData.return_periods,
              manualYear0Ror: currentCalculatorState.manualYear0Ror,
          },
          projectionData: currentCalculatorState.projection.map((p, index) => ({
              year: p.year,
              age: p.age,
              start_balance: p.beginningBalance || 0,
              contribution: p.periodicContribution || 0,
              growth: p.growth || 0,
              redemption: p.periodicRedemption || 0,
              balance_before_fees: p.projectedBalance || 0, // Use projectedBalance
              averageAnnualBalance: p.averageAnnualBalance || 0,
              mer_applied: p.mer || 0,
              estimatedFees: p.estimatedFees || 0,
              end_balance: p.balanceAfterFees || 0,
              actual_year_end_balance: currentCalculatorState.useActualBalances
                ? (currentCalculatorState.actualBalances[index] || null)
                : null,
          })),
          summary: summary,
          monteCarloResult: monteCarloResult,
          appSettings: appSettings,
          clients: clients,
          goals: goals,
          portfolios: portfolios,
      };

      console.log('Payload being sent to PDF function:', payload);

      const response = await generateCapitalAssetsPdf(payload);

      if (response && response.data) {
          const blob = new Blob([response.data], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Capital Assets Report - ${currentCalculatorState.formData.calculator_name || 'Scenario'}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
          toast.success("PDF report generated successfully!");
      } else {
          toast.error("Failed to generate PDF.", {
            description: "Response data was empty or invalid.",
          });
      }

    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to generate PDF.", { 
        description: "Please try again.",
      });
    } finally {
      setIsExporting(false);
    }
  }, [ref, summary, monteCarloResult, appSettings, clients, goals, portfolios, calculatedMER]);


  return (
    <>
      <div className="w-full space-y-6 p-6">
        <div className="mb-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 lg:w-8 lg:h-8 text-green-600 flex-shrink-0" />
                <span className="truncate">Capital Assets Calculator</span>
              </h1>
              <p className="text-slate-600 text-sm lg:text-base">Configure the client linking and basic parameters for the calculation.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Button
                variant="outline"
                onClick={handleExportPdf}
                disabled={isExporting || projectionData.length === 0}
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearFields}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear Fields
              </Button>
              {currentInstance && (
                <div className="text-right">
                  <p className="text-sm text-slate-500">Current Instance</p>
                  <p className="font-medium text-slate-900 truncate max-w-48">{currentInstance.name}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <Card className="border-none shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg lg:text-xl font-semibold text-slate-900">
              <Calculator className="w-5 h-5 text-green-600" />
              Calculator Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="min-w-0">
                <Label htmlFor="calculator_name" className="text-sm font-medium text-slate-700 mb-2 block">Calculator Name</Label>
                <Input
                  id="calculator_name"
                  value={formData.calculator_name}
                  onChange={(e) => handleFormDataChange('calculator_name', e.target.value)}
                  placeholder="Enter calculator name"
                  disabled={isViewer}
                  className="w-full"
                />
              </div>
              <div className="min-w-0">
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Associated Clients</Label>
                <MultiClientSelector
                  clients={clients}
                  selectedClientIds={formData.client_ids}
                  onSelectionChange={(selectedIds) => {
                    handleFormDataChange('client_ids', selectedIds);
                    handleFormDataChange('goal_id', null);
                    handleFormDataChange('portfolio_id', null);
                  }}
                  disabled={isViewer}
                  placeholder="Select clients..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="min-w-0">
                <Label htmlFor="goal_id" className="text-sm font-medium text-slate-700 mb-2 block">Linked Goal (Optional)</Label>
                <Select 
                  value={formData.goal_id || 'no_goal'} 
                  onValueChange={(value) => handleFormDataChange('goal_id', value)}
                  disabled={isViewer || !formData.client_ids || formData.client_ids.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={!formData.client_ids || formData.client_ids.length === 0 ? "Select clients first" : "Select a goal (optional)"} />
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
              <div className="min-w-0">
                <Label htmlFor="portfolio_id" className="text-sm font-medium text-slate-700 mb-2 block">Linked Portfolio (Optional)</Label>
                <Select 
                  value={formData.portfolio_id || 'no_portfolio'} 
                  onValueChange={(value) => handleFormDataChange('portfolio_id', value)}
                  disabled={isViewer || !formData.client_ids || formData.client_ids.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={!formData.client_ids || formData.client_ids.length === 0 ? "Select clients first" : "Select a portfolio (optional)"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_portfolio">No portfolio selected</SelectItem>
                    {clientPortfolios.map((portfolio) => (
                      <SelectItem key={portfolio.id} value={portfolio.id}>
                        {portfolio.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="scenario_details" className="text-sm font-medium text-slate-700 mb-2 block">Scenario Details</Label>
              <Input
                id="scenario_details"
                value={formData.scenario_details || ''}
                onChange={(e) => handleFormDataChange('scenario_details', e.target.value)}
                placeholder="Enter a short description for this scenario..."
                disabled={isViewer}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg lg:text-xl font-semibold text-slate-900">Basic Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
              <div className="min-w-0">
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Current Age</Label>
                <Input value={formData.current_age || "Auto"} disabled className="bg-slate-50 text-slate-500 w-full"/>
              </div>
              <div className="min-w-0">
                <Label htmlFor="initial_investment" className="text-sm font-medium text-slate-700 mb-2 block">Initial Amount ($)</Label>
                <Input
                  id="initial_investment"
                  value={displayValues.initial_investment || ''}
                  onChange={(e) => {
                    if (assetSelectionMode === 'manual') {
                      handleDisplayChange("initial_investment", e.target.value);
                    }
                  }}
                  onBlur={() => {
                    if (assetSelectionMode === 'manual') {
                      handleBlur("initial_investment", "currency");
                    }
                  }}
                  onFocus={() => {
                    if (assetSelectionMode === 'manual') {
                      handleFocus("initial_investment");
                    }
                  }}
                  placeholder="$10,000.00"
                  disabled={isViewer || assetSelectionMode !== 'manual'}
                  className="w-full"
                />
                {assetSelectionMode !== 'manual' && (
                  <p className="text-xs text-slate-500 mt-1">
                    Value calculated from selected assets
                  </p>
                )}
              </div>
              <div className="min-w-0">
                <Label htmlFor="start_calendar_year" className="text-sm font-medium text-slate-700 mb-2 block">Start Calendar Year</Label>
                <Input
                  id="start_calendar_year"
                  type="number"
                  value={formData.start_calendar_year || ''}
                  onChange={(e) => handleFormDataChange("start_calendar_year", parseInt(e.target.value, 10) || new Date().getFullYear())}
                  placeholder={new Date().getFullYear()}
                  disabled={isViewer}
                  className="w-full"
                />
              </div>
              <div className="min-w-0">
                <Label htmlFor="projection_years" className="text-sm font-medium text-slate-700 mb-2 block">Time Period (Years)</Label>
                <Input
                  id="projection_years"
                  type="number"
                  value={formData.projection_years || ''}
                  onChange={(e) => handleFormDataChange("projection_years", parseInt(e.target.value) || 0)}
                  placeholder="25"
                  disabled={isViewer}
                  className="w-full"
                />
              </div>
              <div className="min-w-0">
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Account Type</Label>
                <Select value={formData.account_type} onValueChange={(value) => handleFormDataChange("account_type", value)} disabled={isViewer}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non_registered">Non-Registered</SelectItem>
                    <SelectItem value="registered">Registered (RRSP/RRIF)</SelectItem>
                    <SelectItem value="tfsa">Tax-Free (TFSA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              {formData.client_ids && formData.client_ids.length > 0 && (
                <div className="min-w-0">
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">Asset Selection Method</Label>
                  <Select 
                    value={
                      assetSelectionMode === 'manual'
                        ? 'manual_entry'
                        : assetSelectionMode === 'multiple'
                          ? 'multiple_selection'
                          : assetSelectionMode === 'single' && selectedAssetIds.length > 0
                            ? selectedAssetIds[0]
                            : assetSelectionMode === 'aggregated' && selectedAggregatedCategoryId
                              ? selectedAggregatedCategoryId
                              : '' // Fallback if no specific asset/category ID is active
                    }
                    onValueChange={handleAssetSelection} 
                    disabled={loadingAssets || isViewer}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={loadingAssets ? "Loading assets..." : "Choose how to set initial amount"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual_entry">Manual Entry</SelectItem>
                      <SelectItem value="multiple_selection">Select Multiple Individual Assets</SelectItem>
                      
                      <Separator className="my-2" />
                      <div className="px-2 py-1 text-xs text-slate-500 font-medium">Aggregated Categories</div>
                      {aggregatedAssets.length > 0 ? aggregatedAssets.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name} - {formatCurrency(category.value)}
                        </SelectItem>
                      )) : <SelectItem value="no_agg_assets" disabled>No aggregated assets available</SelectItem>}
                      
                      <Separator className="my-2" />
                      <div className="px-2 py-1 incessantly text-xs text-slate-500 font-medium">Individual Assets</div>
                      {netWorthAssets.length > 0 ? netWorthAssets.map(asset => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.asset_name} - {formatCurrency(asset.asset_value)}
                        </SelectItem>
                      )) : <SelectItem value="no_individual_assets" disabled>No individual assets available</SelectItem>}

                      {netWorthAssets.length === 0 && aggregatedAssets.length === 0 && (
                        <SelectItem value="no_assets" disabled>
                          No assets found in Net Worth Statement
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {assetSelectionMode === 'multiple' && netWorthAssets.length > 0 && (
                <div className="border rounded-lg p-4 bg-slate-50">
                  <div className="flex justify-between items-center mb-3">
                    <Label className="text-sm font-medium text-slate-700">Select Assets to Include</Label>
                    <div className="text-sm text-slate-600">
                      Selected: {selectedAssetIds.length} assets, Total: {formatCurrency(selectedAssetsValue)}
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {netWorthAssets.map(asset => (
                      <div key={asset.id} className="flex items-center justify-between p-2 bg-white rounded border hover:bg-slate-50">
                        <div className="flex items-center space-x-3">
                          <Checkbox 
                            checked={selectedAssetIds.includes(asset.id)}
                            onCheckedChange={() => handleIndividualAssetToggle(asset.id)}
                            disabled={isViewer}
                          />
                          <div>
                            <div className="font-medium text-slate-900">{asset.asset_name}</div>
                            <div className="text-xs text-slate-500">{asset.asset_category}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-slate-900">{formatCurrency(asset.asset_value)}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedAssetIds.length > 0 && (
                    <div className="mt-3 pt-3 border-t bg-white p-3 rounded">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-slate-900">Total Selected Value:</span>
                        <span className="font-bold text-lg text-green-600">{formatCurrency(selectedAssetsValue)}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        This amount will be used as the initial investment
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center space-x-2 justify-start lg:justify-end">
                <Switch
                  id="use-actual"
                  checked={useActualBalances}
                  onCheckedChange={(checked) => setUseActualBalances(checked)}
                  disabled={isViewer}
                />
                <Label htmlFor="use-actual" className="text-sm whitespace-nowrap">Use Actual End-Year Balances</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg lg:text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-green-600" />
                Tax Information
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="province">Province</Label>
                <Input
                  id="province"
                  value="Combined Rates"
                  disabled
                  className="bg-slate-100 text-slate-600 font-medium"
                />
              </div>
              <div className="min-w-0">
                <Label htmlFor="annual_income" className="text-sm font-medium text-slate-700 mb-2 block">Annual Income ($)</Label>
                <Input
                  id="annual_income"
                  type="text"
                  value={displayValues.annual_income || ''}
                  onChange={(e) => handleDisplayChange("annual_income", e.target.value)}
                  onBlur={(e) => handleIncomeChange(parseValue(e.target.value))}
                  onFocus={() => handleFocus("annual_income")}
                  placeholder="$75,000"
                  disabled={isViewer}
                  className="w-full"
                />
              </div>
              <div className="min-w-0">
                <Label htmlFor="marginal_tax_rate" className="text-sm font-medium text-slate-700 mb-2 block">Marginal Tax Rate (%)</Label>
                <Input
                  id="marginal_tax_rate"
                  type="text"
                  value={formatPercentage(formData.marginal_tax_rate)}
                  disabled={true}
                  className="w-full font-semibold bg-slate-100"
                />
              </div>
              <div className="min-w-0">
                <Label htmlFor="capital_gains_tax_rate" className="text-sm font-medium text-slate-700 mb-2 block">Capital Gains Tax Rate (%)</Label>
                <Input
                  id="capital_gains_tax_rate"
                  type="text"
                  value={formatPercentage(formData.capital_gains_tax_rate)}
                  disabled={true}
                  className="w-full font-semibold bg-slate-100"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
              <Button
                onClick={handleUpdateTaxRates}
                disabled={isFetchingRates || isViewer}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 shrink-0"
              >
                {isFetchingRates ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Update Tax Rates from App Settings
              </Button>
              {taxRateLastUpdated && !taxRateError && (
                <div className="flex items-center gap-1 text-sm text-green-600 min-w-0">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate">Last updated: {taxRateLastUpdated.toLocaleDateString()} {taxRateLastUpdated.toLocaleTimeString()} | Marginal: {formatPercentage(formData.marginal_tax_rate)} | Capital Gains: {formatPercentage(formData.capital_gains_tax_rate)}</span>
                </div>
              )}
              {taxRateError && (
                <div className="text-sm text-red-600 flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="truncate">{taxRateError}</span>
                </div>
              )}
              {formData.account_type === 'non_registered' && (
                <div className="flex items-center space-x-2 ml-auto">
                  <Switch
                    id="defer-tax"
                    checked={formData.defer_tax_on_growth}
                    onCheckedChange={(checked) => handleFormDataChange("defer_tax_on_growth", checked)}
                    disabled={isViewer}
                  />
                  <Label htmlFor="defer-tax" className="text-sm whitespace-nowrap">Defer Tax on Growth</Label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg lg:text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Info className="w-5 h-5 text-green-600" />
                Management Expense Ratio (MER)
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Switch
                  id="apply-mer"
                  checked={formData.apply_mer}
                  onCheckedChange={(checked) => handleFormDataChange("apply_mer", checked)}
                  disabled={isViewer}
                />
                <Label htmlFor="apply-mer" className="text-sm font-medium">Apply MER</Label>
              </div>
            </div>
          </CardHeader>
          <CardContent className={`space-y-4 transition-opacity ${!formData.apply_mer ? 'opacity-50' : ''}`}>
            <div>
              <Label htmlFor="mer_manual" className="text-sm font-medium text-slate-700 mb-2 block">Management Expense Ratio (MER) %</Label>
              <Input
                id="mer_manual"
                type="text"
                step="0.001"
                value={displayValues.mer_manual || ''}
                onChange={(e) => handleDisplayChange("mer_manual", e.target.value)}
                onBlur={() => handleBlur("mer_manual", "percentage")}
                onFocus={() => handleFocus("mer_manual")}
                placeholder="0.000"
                disabled={isViewer || !formData.apply_mer}
                className="w-full"
              />
              {linkedPortfolio && calculatedMER > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Auto-populated from linked portfolio: {linkedPortfolio.account_name} (Weighted Average MER: {calculatedMER.toFixed(2)}%)
                </p>
              )}
              {linkedPortfolio && calculatedMER === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠ Linked portfolio "{linkedPortfolio.account_name}" has no fund holdings with MER data
                </p>
              )}
              {!linkedPortfolio && (
                <p className="text-xs text-slate-500 mt-1">
                  Link to a portfolio above to auto-populate MER from fund holdings
                </p>
              )}
            </div>
            <p className="text-xs text-slate-500">
              The Management Expense Ratio (MER) is applied as an annual fee deducted from the portfolio balance.
            </p>
          </CardContent>
        </Card>


        <Card className="border-none shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg lg:text-xl font-semibold text-slate-900">
              <Shuffle className="w-5 h-5 text-green-600" />
              Monte Carlo Simulation Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Switch
                id="enable_monte_carlo"
                checked={formData.enable_monte_carlo}
                onCheckedChange={(checked) => {
                  handleFormDataChange("enable_monte_carlo", checked);
                  if (!checked) {
                    setMonteCarloResult(null);
                  }
                }}
                disabled={isViewer}
              />
              <Label htmlFor="enable_monte_carlo" className="text-sm">Enable Monte Carlo Simulation</Label>
            </div>

            {formData.enable_monte_carlo && (
              <div className="space-y-4">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label htmlFor="monte_carlo_runs" className="text-sm font-medium text-slate-700 mb-2 block">Number of Simulations</Label>
                    <Input
                      id="monte_carlo_runs"
                      type="number"
                      min="100"
                      max="10000"
                      step="100"
                      value={formData.monte_carlo_runs || ''}
                      onChange={(e) => handleFormDataChange("monte_carlo_runs", parseInt(e.target.value) || 1000)}
                      className="mt-1"
                      disabled={isViewer || isSimulating}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      More simulations provide greater accuracy but take longer to compute (100-10,000 recommended)
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button 
                      onClick={runMonteCarloSimulation} 
                      disabled={isSimulating || isViewer || !formData.monte_carlo_runs || parseFloat(formData.monte_carlo_runs) < 100 || projectionData.length === 0}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSimulating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Shuffle className="w-4 h-4 mr-2" />
                          Run Simulation
                        </>
                      )}
                    </Button>
                    {monteCarloResult && (
                      <Button variant="outline" size="sm" onClick={() => { setMonteCarloResult(null); }}>
                        Clear Results
                      </Button>
                    )}
                  </div>
                </div>

                {monteCarloResult && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Simulation Results ({monteCarloResult.numRuns.toLocaleString()} scenarios)
                    </h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-lg">
                      <div className="text-center">
                        <div className="text-sm text-slate-600">Worst Case (10%)</div>
                        <div className="text-lg font-semibold text-red-600">
                          {formatCurrency(monteCarloResult.percentiles.p10)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-slate-600">25th Percentile</div>
                        <div className="text-lg font-semibold text-orange-600">
                          {formatCurrency(monteCarloResult.percentiles.p25)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-slate-600">Median (50%)</div>
                        <div className="text-lg font-semibold text-blue-600">
                          {formatCurrency(monteCarloResult.percentiles.p50)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-slate-600">75th Percentile</div>
                        <div className="text-lg font-semibold text-green-600">
                          {formatCurrency(monteCarloResult.percentiles.p75)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-slate-600">Best Case (90%)</div>
                        <div className="text-lg font-semibold text-emerald-600">
                          {formatCurrency(monteCarloResult.percentiles.p90)}
                        </div>
                      </div>
                    </div>

                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={monteCarloResult.chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="year" 
                            label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
                          />
                          <YAxis 
                            tickFormatter={(value) => `$${(value / 1000)}K`}
                            label={{ value: 'Portfolio Value', angle: -90, position: 'insideLeft' }}
                          />
                          <RechartsTooltip 
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0]?.payload;
                                if (data) {
                                  return (
                                    <div className="bg-white p-3 border rounded shadow-lg">
                                      <p className="font-semibold">{`Year ${label}`}</p>
                                      <p style={{ color: '#10b981' }}>
                                        {`Best Case (90%): ${formatCurrency(data.p90)}`}
                                      </p>
                                      <p style={{ color: '#22c55e' }}>
                                        {`75th Percentile: ${formatCurrency(data.p75)}`}
                                      </p>
                                      <p style={{ color: '#3b82f6' }}>
                                        {`Median (50%): ${formatCurrency(data.p50)}`}
                                      </p>
                                      <p style={{ color: '#f59e0b' }}>
                                        {`25th Percentile: ${formatCurrency(data.p25)}`}
                                      </p>
                                      <p style={{ color: '#dc2626' }}>
                                        {`Worst Case (10%): ${formatCurrency(data.p10)}`}
                                      </p>
                                      <p style={{ color: '#991b1b' }} className="font-semibold border-t pt-1 mt-1">
                                        {`Mean Average: ${formatCurrency(data.mean)}`}
                                      </p>
                                    </div>
                                  );
                                }
                              }
                              return null;
                            }}
                          />
                          <Legend />
                          
                          <Area
                            dataKey="p90"
                            stroke="none"
                            fill="#dbeafe"
                            fillOpacity={0.3}
                            name="90%-10% Range"
                          />
                          <Area
                            dataKey="p10"
                            stroke="none"
                            fill="#ffffff"
                            fillOpacity={1}
                          />
                          
                          <Area
                            dataKey="p75"
                            fill="#a7f3d0"
                            fillOpacity={0.4}
                            name="75%-25% Range"
                          />
                          <Area
                            dataKey="p25"
                            stroke="none"
                            fill="#ffffff"
                            fillOpacity={1}
                          />
                          
                          <Line
                            type="monotone"
                            dataKey="p90"
                            stroke="#10b981"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            name="Best Case (90%)"
                          />
                          
                          <Line
                            type="monotone"
                            dataKey="p75"
                            stroke="#22c55e"
                            strokeWidth={2}
                            dot={false}
                            name="75th Percentile"
                          />
                          
                          <Line
                            type="monotone"
                            dataKey="p50"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={false}
                            name="Median (50%)"
                          />
                          
                          <Line
                            type="monotone"
                            dataKey="mean"
                            stroke="#dc2626"
                            strokeWidth={4}
                            strokeDasharray="8 4"
                            dot={false}
                            name="Mean Average"
                          />
                          
                          <Line
                            type="monotone"
                            dataKey="p25"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            dot={false}
                            name="25th Percentile"
                          />
                          
                          <Line
                            type="monotone"
                            dataKey="p10"
                            stroke="#dc2626"
                            strokeWidth={2}
                            strokeDasharray="3 3"
                            dot={false}
                            name="Worst Case (10%)"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h5 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        How to Read This Chart
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p><span className="inline-block w-4 h-3 bg-blue-200 mr-2"></span><strong>Light Blue Area:</strong> 80% of outcomes fall within this range</p>
                            <p><span className="inline-block w-4 h-3 bg-green-200 mr-2"></span><strong>Green Area:</strong> 50% of outcomes fall within this range</p>
                            <p><span className="inline-block w-4 h-1 bg-blue-600 mr-2"></span><strong>Blue Line:</strong> Median outcome (50/50 chance)</p>
                          </div>
                          <div>
                            <p><span className="inline-block w-4 h-1 bg-red-600 border-dashed mr-2" style={{borderStyle: 'dashed', borderWidth: '1px 0'}}></span><strong>Red Dashed:</strong> Mean average of all scenarios</p>
                            <p><span className="inline-block w-4 h-1 bg-green-500 border-dashed mr-2" style={{borderStyle: 'dashed', borderWidth: '1px 0'}}></span><strong>Green Dashed:</strong> Best case (90th percentile)</p>
                            <p><span className="inline-block w-4 h-1 bg-red-600 border-dotted mr-2" style={{borderStyle: 'dotted', borderWidth: '1px 0'}}></span><strong>Red Dotted:</strong> Worst case (10th percentile)</p>
                          </div>
                        </div>
                        <p className="flex items-center gap-1">
                          <Info className="w-3 h-3 flex-shrink-0" />
                          The graph starts from the current year, and Year 0 values represent the initial investment before any annual changes.
                        </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

          <Card className="border-none shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900">Period Definitions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-slate-900">Contribution Periods</h3>
                    <Button variant="outline" size="sm" onClick={() => { setEditingContributionIndex(-1); setShowContributionModal(true); }} disabled={isViewer}>
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.periods && formData.periods.length > 0 ? (
                      formData.periods.map((period, index) => (
                        <Card key={period.id} className="bg-green-50 border-green-200">
                          <CardContent className="p-3 flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-green-800">Period {index + 1}</p>
                              <p className="text-xs text-green-700">Years {period.start_year}-{period.end_year === 0 ? 'End' : period.end_year}</p>
                              <p className="text-xs text-green-700">{formatCurrency(period.annual_contribution)}/year ({period.contribution_timing})</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-700 hover:bg-green-100" onClick={() => handleEditContribution(index)} disabled={isViewer}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-700 hover:bg-green-100" onClick={() => handleRemoveContribution(index)} disabled={isViewer}>
                                <Minus className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="p-4 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">No contribution periods defined</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-slate-900">Redemption Periods</h3>
                    <Button variant="outline" size="sm" onClick={() => { setEditingRedemptionIndex(-1); setShowRedemptionModal(true); }} disabled={isViewer}>
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.redemption_periods && formData.redemption_periods.length > 0 ? (
                      formData.redemption_periods.map((period, index) => (
                        <Card key={period.id} className="bg-red-50 border-red-200">
                          <CardContent className="p-3 flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-red-800">Redemption {index + 1}</p>
                              <p className="text-xs text-red-700">Years {period.start_year}-{period.end_year === 0 ? 'End' : period.end_year}</p>
                              <p className="text-xs text-red-700">
                                  {period.redemption_type === 'fixed_amount' || !period.redemption_type
                                      ? `${formatCurrency(period.annual_redemption)}/year (${period.redemption_timing})`
                                      : period.redemption_type === 'percentage_of_initial'
                                          ? `${formatPercentage(period.percentage_of_initial_rate)} of Initial`
                                          : period.redemption_type === 'percentage_of_current'
                                              ? `${formatPercentage(period.percentage_of_current_rate)} of Current`
                                              : ''
                                  }
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-700 hover:bg-red-100" onClick={() => handleEditRedemption(index)} disabled={isViewer}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-700 hover:bg-red-100" onClick={() => handleRemoveRedemption(index)} disabled={isViewer}>
                                <Minus className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="p-4 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">No redemption periods defined</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-slate-900">Return Periods</h3>
                    <Button variant="outline" size="sm" onClick={() => { setEditingReturnIndex(-1); setShowReturnModal(true); }} disabled={isViewer}>
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.return_periods && formData.return_periods.length > 0 ? (
                      formData.return_periods.map((period, index) => (
                        <Card key={period.id} className="bg-purple-50 border-purple-200">
                          <CardContent className="p-3 flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-purple-800">Return {index + 1}</p>
                              <p className="text-xs text-purple-700">Years {period.start_year}-{period.end_year === 0 ? 'End' : period.end_year}</p>
                              <p className="text-xs text-purple-700">{formatPercentage(period.return_rate)}</p>
                              {period.return_type === 'monte_carlo' && (
                                  <p className="text-xs text-purple-700">
                                      Monte Carlo: {formatPercentage(period.standard_deviation)} Std Dev {period.use_randomized_returns ? '(Randomized)' : ''}
                                  </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-purple-700 hover:bg-purple-100" onClick={() => handleEditReturn(index)} disabled={isViewer}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-purple-700 hover:bg-purple-100" onClick={() => handleRemoveReturn(index)} disabled={isViewer}>
                                <Minus className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="p-4 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">No return periods defined</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {summary && (
            <Card className="border-none shadow-lg bg-white">
              <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-800">Projection Summary</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
                      <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                              {formatCurrency(summary.endingBalance)}
                          </div>
                          <div className="text-sm text-slate-600">Final Value</div>
                      </div>
                      <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                              {formatCurrency(summary.totalContributions)}
                          </div>
                          <div className="text-sm text-slate-600">Total Contributions</div>
                      </div>
                      <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                              {formatCurrency(summary.totalRedemptions)}
                          </div>
                          <div className="text-sm text-slate-600">Total Redemptions</div>
                      </div>
                      <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                              {formatCurrency(summary.totalGrowth)}
                          </div>
                          <div className="text-sm text-slate-600">Total Net Growth</div>
                      </div>
                      <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                              {summary.netReturnPercentage.toFixed(2)}%
                          </div>
                          <div className="text-sm text-slate-600">Net Return %</div>
                      </div>
                      <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                              {formatCurrency(summary.totalEstimatedFees)}
                          </div>
                          <div className="text-sm text-slate-600">Total Fees</div>
                      </div>
                      <div className="text-center">
                          <div className="text-2xl font-bold text-red-700">
                              {formatCurrency(summary.totalTaxPayable)}
                          </div>
                          <div className="text-sm text-slate-600">Total Tax Payable</div>
                      </div>
                  </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-lg bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-semibold text-slate-900">Projection Details</CardTitle>
              {projectionData.length > 0 && (
                  <div className="flex rounded-md overflow-hidden border">
                  <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('table')} className="rounded-none border-0"><LucideTable className="w-4 h-4 mr-2" />Table</Button>
                  <Button variant={viewMode === 'chart' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('chart')} className="rounded-none border-0"><LucideBarChart className="w-4 h-4 mr-2" />Graph</Button>
                  </div>
              )}
            </CardHeader>
            <CardContent>
              {projectionData.length > 0 ? (
                  <div>
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Highlighting Tip:</span> Double-click on column headers to highlight a column. Double-click on a row's first cell to highlight the row. Double-click on any other cell to highlight just that cell.
                        </p>
                        {monteCarloResult && (
                          <div className="mt-1 text-blue-600">
                            <strong>Monte Carlo:</strong> Graph shows percentile bands and mean/median projection.
                          </div>
                        )}
                      </div>

                      {viewMode === 'table' ? (
                          <div className="overflow-x-auto">
                              <Table>
                                  <TableHeader className="bg-slate-50 dark:bg-slate-800">
                                      <TableRow>
                                          {['Year', 'Age', 'Beginning Balance', 'Periodic Contribution', 'Lump Sum Contribution', 'Tax Savings', 'Periodic Redemption', 'Lump Sum Redemption', 'Gross RoR', 'Gross Growth', 'MER (%)', 'Est. Fees', 'Tax Payable', 'Projected Balance', 'Actual End-Year Balance', 'Variance %', 'Variance $', 'Actual RoR (Approx.)', 'RoR Variance'].map((header, colIndex) => (
                                              <TableHead key={colIndex} onDoubleClick={() => handleHighlight('col', colIndex)} className={`py-3 px-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer transition-colors ${getHighlightClass(null, colIndex)} ${header === 'Actual End-Year Balance' ? 'min-w-[200px]' : ''}`}>
                                                  {header}
                                              </TableHead>
                                          ))}
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                                      {projectionData.map((row, rowIndex) => (
                                          <TableRow key={rowIndex} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${getHighlightClass(rowIndex, null)} ${row.balanceAfterFees <= 0 ? 'bg-red-100 dark:bg-red-900/40' : ''}`}>
                                              <TableCell onDoubleClick={() => handleHighlight('row', rowIndex)} className={`py-2 px-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer transition-colors text-center ${getHighlightClass(rowIndex, 0)}`}>{row.year}</TableCell>
                                              <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 1 })} className={`py-2 px-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap text-center ${getHighlightClass(rowIndex, 1)}`}>{row.age}</TableCell>
                                              <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 2 })} className={`py-2 px-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer transition-colors text-right ${getHighlightClass(rowIndex, 2)}`}>{formatCurrency(row.beginningBalance)}</TableCell>
                                              <TableCell className="p-1">
                                                <div className="relative" onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 3 })}>
                                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                                                  <Input type="text" placeholder="0" className="text-right h-8 text-sm pl-7 font-semibold text-green-600" value={formatCurrency(row.periodicContribution)} readOnly disabled />
                                                </div>
                                              </TableCell>
                                              <TableCell className="p-1 min-w-[140px]">
                                                <div className="relative" onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 4 })}>
                                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                                                  <Input
                                                    type="text"
                                                    placeholder="0"
                                                    className="text-right h-8 text-sm pl-7 w-full font-semibold text-green-600"
                                                    value={displayLumpSums[`${rowIndex}_contribution`] || ''}
                                                    onChange={(e) => handleLumpSumDisplayChange(rowIndex, 'contribution', e.target.value)}
                                                    onFocus={() => handleLumpSumFocus(rowIndex, 'contribution')}
                                                    onBlur={() => handleLumpSumBlur(rowIndex, 'contribution')}
                                                    disabled={isViewer}
                                                  />
                                                </div>
                                              </TableCell>
                                              <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 5 })} className={`py-2 px-2 text-sm font-semibold text-green-600 dark:text-green-400 whitespace-nowrap text-center ${getHighlightClass(rowIndex, 5)}`}>{row.taxSavings ? formatCurrency(row.taxSavings) : '-'}</TableCell>
                                              <TableCell className="p-1">
                                                <div className="relative" onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 6 })}>
                                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                                                  <Input type="text" placeholder="0" className="text-right h-8 text-sm pl-7 font-semibold text-red-600" value={formatCurrency(row.periodicRedemption)} readOnly disabled />
                                                </div>
                                              </TableCell>
                                              <TableCell className="p-1 min-w-[140px]">
                                                <div className="relative" onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 7 })}>
                                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                                                  <Input
                                                    type="text"
                                                    placeholder="0"
                                                    className="text-right h-8 text-sm pl-7 w-full font-semibold text-red-600"
                                                    value={displayLumpSums[`${rowIndex}_redemption`] || ''}
                                                    onChange={(e) => handleLumpSumDisplayChange(rowIndex, 'redemption', e.target.value)}
                                                    onFocus={() => handleLumpSumFocus(rowIndex, 'redemption')}
                                                    onBlur={() => handleLumpSumBlur(rowIndex, 'redemption')}
                                                    disabled={isViewer}
                                                  />
                                                </div>
                                              </TableCell>
                                              {rowIndex === 0 ? (
                                                <TableCell className="p-1">
                                                  <div className="relative w-24" onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 8 })}>
                                                    <Input
                                                      type="number"
                                                      step="0.01"
                                                      className="text-right h-8 text-sm pr-7 bg-green-100 dark:bg-green-900/50 w-full"
                                                      value={manualYear0Ror === null || manualYear0Ror === undefined ? '' : manualYear0Ror}
                                                      onChange={(e) => {
                                                        const value = e.target.value;
                                                        setManualYear0Ror(value === '' ? null : parseFloat(value));
                                                      }}
                                                      placeholder="Auto"
                                                      disabled={isViewer}
                                                    />
                                                    <span className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-500 pointer-events-none">%</span>
                                                  </div>
                                                </TableCell>
                                              ) : (
                                                <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 8 })} className={`py-2 px-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer transition-colors text-right ${getHighlightClass(rowIndex, 8)}`}>{formatPercentage(row.ror * 100)}</TableCell>
                                              )}
                                              <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 9 })} className={`py-2 px-2 text-sm text-green-600 dark:text-green-400 whitespace-nowrap cursor-pointer transition-colors text-right ${getHighlightClass(rowIndex, 9)}`}>{formatCurrency(row.growth)}</TableCell>
                                              <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 10 })} className={`py-2 px-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer transition-colors text-right ${getHighlightClass(rowIndex, 10)}`}>{!formData.apply_mer ? '-' : formatPercentage(row.mer)}</TableCell>
                                              <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 11 })} className={`py-2 px-2 text-sm font-semibold text-red-600 dark:text-red-400 whitespace-nowrap cursor-pointer transition-colors text-right ${getHighlightClass(rowIndex, 11)}`}>{!formData.apply_mer ? '-' : formatCurrency(row.estimatedFees)}</TableCell>
                                              <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 12 })} className={`py-2 px-2 text-sm font-semibold text-red-600 dark:text-red-400 whitespace-nowrap cursor-pointer transition-colors text-right ${row.taxOnGrowth ? 'text-red-600' : 'text-slate-700'} ${getHighlightClass(rowIndex, 12)}`}>{row.taxOnGrowth ? formatCurrency(row.taxOnGrowth) : '-'}</TableCell>
                                              <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 13 })} className={`py-2 px-2 text-sm whitespace-nowrap cursor-pointer transition-colors text-right font-semibold ${row.projectedBalance <= 0 ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'} ${getHighlightClass(rowIndex, 13)}`}>{formatCurrency(row.projectedBalance)}</TableCell>
                                              <TableCell className="p-1 min-w-[200px]">
                                                <div className="relative" onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 14 })}>
                                                  <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500 pointer-events-none">$</span>
                                                  <Input
                                                    type="number"
                                                    placeholder="Actual"
                                                    className="text-right h-8 text-sm pl-6 w-full"
                                                    value={actualBalances[rowIndex] || ''}
                                                    onChange={(e) => handleActualBalanceChange(rowIndex, e.target.value)}
                                                    disabled={!useActualBalances || isViewer}
                                                  />
                                                </div>
                                              </TableCell>
                                              <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 15 })} className={`py-2 px-2 text-sm whitespace-nowrap text-right ${row.variancePercent > 0 ? 'text-green-600' : row.variancePercent < 0 ? 'text-red-600' : ''} ${getHighlightClass(rowIndex, 15)}`}>
                                                  {row.variancePercent !== 0 ? `${row.variancePercent.toFixed(2)}%` : '-'}
                                              </TableCell>
                                              <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 16 })} className={`py-2 px-2 text-sm whitespace-nowrap text-right ${row.varianceDollar > 0 ? 'text-green-600' : row.varianceDollar < 0 ? 'text-red-600' : ''} ${getHighlightClass(rowIndex, 16)}`}>
                                                  {row.varianceDollar !== 0 ? formatCurrency(row.varianceDollar) : '-'}
                                              </TableCell>
                                              <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 17 })} className={`py-2 px-2 text-sm whitespace-nowrap text-right ${useActualBalances && row.actualRoR !== null ? (row.actualRoR < 0 ? 'text-red-600 font-semibold' : 'text-slate-700 font-semibold') : ''} ${getHighlightClass(rowIndex, 17)}`}>
                                                {useActualBalances && row.actualRoR !== null ? formatPercentage(row.actualRoR * 100) : '-'}
                                              </TableCell>
                                              <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 18 })} className={`py-2 px-2 text-sm whitespace-nowrap text-right ${useActualBalances && row.actualRoR !== null ? ((row.actualRoR - row.ror) < 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold') : ''} ${getHighlightClass(rowIndex, 18)}`}>
                                                {useActualBalances && row.actualRoR !== null ? formatPercentage((row.actualRoR - row.ror) * 100) : '-'}
                                              </TableCell>
                                          </TableRow>
                                      ))}
                                  </TableBody>
                              </Table>
                          </div>
                      ) : (
                          <div className="h-96">
                              <ResponsiveContainer width="100%" height="100%">
                                {monteCarloResult && monteCarloResult.chartData ? (
                                    <ComposedChart data={monteCarloResult.chartData}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis 
                                        dataKey="year" 
                                        label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
                                      />
                                      <YAxis 
                                        tickFormatter={(value) => `$${(value / 1000)}K`}
                                        label={{ value: 'Portfolio Value', angle: -90, position: 'insideLeft' }}
                                      />
                                      <RechartsTooltip 
                                        content={({ active, payload, label }) => {
                                          if (active && payload && payload.length) {
                                            const data = payload[0]?.payload;
                                            if (data) {
                                              return (
                                                <div className="bg-white p-3 border rounded shadow-lg">
                                                  <p className="font-semibold">{`Year ${label}`}</p>
                                                  <p style={{ color: '#10b981' }}>
                                                    {`Best Case (90%): ${formatCurrency(data.p90)}`}
                                                  </p>
                                                  <p style={{ color: '#22c55e' }}>
                                                    {`75th Percentile: ${formatCurrency(data.p75)}`}
                                                  </p>
                                                  <p style={{ color: '#3b82f6' }}>
                                                    {`Median (50%): ${formatCurrency(data.p50)}`}
                                                  </p>
                                                  <p style={{ color: '#f59e0b' }}>
                                                    {`25th Percentile: ${formatCurrency(data.p25)}`}
                                                  </p>
                                                  <p style={{ color: '#dc2626' }}>
                                                    {`Worst Case (10%): ${formatCurrency(data.p10)}`}
                                                  </p>
                                                  <p style={{ color: '#991b1b' }} className="font-semibold border-t pt-1 mt-1">
                                                    {`Mean Average: ${formatCurrency(data.mean)}`}
                                                  </p>
                                                </div>
                                              );
                                            }
                                          }
                                          return null;
                                        }}
                                      />
                                      <Legend />
                                      
                                      <Area
                                        dataKey="p90"
                                        stroke="none"
                                        fill="#dbeafe"
                                        fillOpacity={0.3}
                                        name="90%-10% Range"
                                      />
                                      <Area
                                        dataKey="p10"
                                        stroke="none"
                                        fill="#ffffff"
                                        fillOpacity={1}
                                      />
                                      
                                      <Area
                                        dataKey="p75"
                                        fill="#a7f3d0"
                                        fillOpacity={0.4}
                                        name="75%-25% Range"
                                      />
                                      <Area
                                        dataKey="p25"
                                        stroke="none"
                                        fill="#ffffff"
                                        fillOpacity={1}
                                      />
                                      
                                      <Line
                                        type="monotone"
                                        dataKey="p90"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={false}
                                        name="Best Case (90%)"
                                      />
                                      
                                      <Line
                                        type="monotone"
                                        dataKey="p75"
                                        stroke="#22c55e"
                                        strokeWidth={2}
                                        dot={false}
                                        name="75th Percentile"
                                      />
                                      
                                      <Line
                                        type="monotone"
                                        dataKey="p50"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        dot={false}
                                        name="Median (50%)"
                                      />
                                      
                                      <Line
                                        type="monotone"
                                        dataKey="mean"
                                        stroke="#dc2626"
                                        strokeWidth={4}
                                        strokeDasharray="8 4"
                                        dot={false}
                                        name="Mean Average"
                                      />
                                      
                                      <Line
                                        type="monotone"
                                        dataKey="p25"
                                        stroke="#f59e0b"
                                        strokeWidth={2}
                                        dot={false}
                                        name="25th Percentile"
                                      />
                                      
                                      <Line
                                        type="monotone"
                                        dataKey="p10"
                                        stroke="#dc2626"
                                        strokeWidth={2}
                                        strokeDasharray="3 3"
                                        dot={false}
                                        name="Worst Case (10%)"
                                      />
                                    </ComposedChart>
                                ) : (
                                    <LineChart data={projectionData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="year" allowDuplicatedCategory={false} type="number" domain={['dataMin', 'dataMax']} />
                                        <YAxis tickFormatter={(value) => formatCurrency(value)} />
                                        <RechartsTooltip formatter={(value) => [formatCurrency(value), "Balance"]} />
                                        <Legend />
                                        <Line
                                          type="monotone"
                                          dataKey="balanceAfterFees"
                                          data={projectionData}
                                          stroke="#16a34a"
                                          strokeWidth={2}
                                          name="Projected Balance (After Fees)"
                                          dot={{ fill: "#16a34a", strokeWidth: 2, r: 4 }}
                                          isAnimationActive={false}
                                        />
                                    </LineChart>
                                )}
                              </ResponsiveContainer>
                          </div>
                      )}
                  </div>
              ) : null}
            </CardContent>
          </Card>
        
          <GiuseppeAIOptimizer
            calculatorName="Capital Assets Calculator"
            calculatorData={{
              inputs: formData,
              manualFirstYearRor: manualYear0Ror,
              summary: summary,
              projection: projectionData,
            }}
          />
      </div>

      <ContributionPeriodModal
        isOpen={showContributionModal}
        onClose={() => setShowContributionModal(false)}
        onSave={handleSaveContribution}
        period={editingContributionIndex > -1 ? formData.periods[editingContributionIndex] : null}
        maxYear={Number(formData.projection_years) || 0}
        inflationRate={appSettings.preferred_inflation_rate}
      />

      <RedemptionPeriodModal
        isOpen={showRedemptionModal}
        onClose={() => setShowRedemptionModal(false)}
        onSave={handleSaveRedemption}
        period={editingRedemptionIndex > -1 ? formData.redemption_periods[editingRedemptionIndex] : null}
        maxYear={Number(formData.projection_years) || 0}
        inflationRate={appSettings.preferred_inflation_rate}
      />

      <ReturnPeriodModal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        onSave={handleSaveReturn}
        period={editingReturnIndex > -1 ? formData.return_periods[editingReturnIndex] : null}
        maxYear={Number(formData.projection_years) || 0}
      />
    </>
  );
}

export default forwardRef(CapitalAssetsCalculator);
