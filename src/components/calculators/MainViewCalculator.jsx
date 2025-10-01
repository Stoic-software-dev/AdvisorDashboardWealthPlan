
import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  User,
  Undo2,
  DollarSign,
  Building,
  CreditCard,
  PieChart,
  Users,
  Calculator,
  List,
  Loader2
} from "lucide-react";
import { CalculatorInstance, FinancialGoal } from "@/api/entities";
import { differenceInYears } from "date-fns";
import MainViewCharts from './MainViewCharts';
import MultiClientSelector from '../shared/MultiClientSelector';
import GiuseppeAIOptimizer from '../shared/GiuseppeAIOptimizer';
import { extractFixedIncomeComparisonData } from './FixedIncomeCalculator';
import { extractRealEstateComparisonData } from './RealEstateCalculator';
import { extractCapitalAssetsComparisonData } from './CapitalAssetsCalculator';
import { extractMortgageComparisonData } from './MortgageCalculator';

// Safe number parsing functions
const safeParseFloat = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

const safeParseInt = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Safe formatting functions
const formatCurrency = (value) => {
  const num = safeParseFloat(value, 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

const formatNumberInput = (value, type) => {
  const num = safeParseFloat(value, 0);
  
  if (type === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  } else if (type === 'percentage') {
    return num.toFixed(2) + '%';
  }
  return String(num);
};

const parseNumberInput = (value, type) => {
  if (value === null || value === undefined || value === '') return 0;
  let cleanedValue = String(value).replace(/[^0-9.-]/g, '');
  if (type === 'percentage') {
    cleanedValue = cleanedValue.replace('%', '');
  }
  return safeParseFloat(cleanedValue, 0);
};

// Safe form data with proper defaults
const emptyFormData = {
  calculator_name: "",
  client_ids: [],
  linked_calculator_ids: [],
  spouse_id: "",
  primary_client_age: 65,
  spouse_age: 65,
  projection_years: 30,
  target_income: 200000,
  inflation_rate: 2,
  average_tax_rate: 25,
  client_mtr: 40,
  spouse_mtr: 40,
  final_year_tax_rate: 50,
};

function MainViewCalculator({ allCalculators, clients = [], goals, portfolios, isLoading, preselectedClientId, initialState, isViewer = false, appSettings, onSave, isSaving, onNameChange, currentInstance }, ref) {
  const [formData, setFormData] = useState({
    ...emptyFormData,
    client_ids: preselectedClientId ? [preselectedClientId] : []
  });

  const [availableGoals, setAvailableGoals] = useState([]);
  // The state for availableCalculators is removed as it's now a useMemo
  const [projectionData, setProjectionData] = useState([]);
  const [incomeStreams, setIncomeStreams] = useState([]);
  const [assetData, setAssetData] = useState([]);
  const [liabilityData, setLiabilityData] = useState([]);
  const [netWorthData, setNetWorthData] = useState([]);
  const [estateData, setEstateData] = useState([]);
  const [activeTab, setActiveTab] = useState("income");
  const [viewMode, setViewMode] = useState("table");
  const [displayValues, setDisplayValues] = useState({});

  const [highlightedRowIndex, setHighlightedRowIndex] = useState(null);
  const [highlightedColumnIndex, setHighlightedColumnIndex] = useState(null);

  const [isRecalculating, setIsRecalculating] = useState(false);
  const [linkedCalculators, setLinkedCalculators] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [useActualBalances, setUseActualBalances] = useState(false);
  const [lastCalculatedFormData, setLastCalculatedFormData] = useState(null);

  // Memoize client lookups for performance
  const primaryClientId = formData.client_ids?.[0];
  const associatedClientId = formData.client_ids?.[1];

  const primaryClient = useMemo(() => clients.find(c => c.id === primaryClientId), [clients, primaryClientId]);
  const associatedClient = useMemo(() => clients.find(c => c.id === associatedClientId), [clients, associatedClientId]);

  const primaryClientCalculatedAge = useMemo(() => {
    if (primaryClient && primaryClient.date_of_birth) {
      return differenceInYears(new Date(), new Date(primaryClient.date_of_birth));
    }
    return null; 
  }, [primaryClient]);

  const associatedClientCalculatedAge = useMemo(() => {
    if (associatedClient && associatedClient.date_of_birth) {
      return differenceInYears(new Date(), new Date(associatedClient.date_of_birth));
    }
    return null;
  }, [associatedClient]);

  // Get available calculators for the selected clients - filtered to only include relevant types for Main View
  const availableCalculators = useMemo(() => {
    if (!formData.client_ids || formData.client_ids.length === 0) {
      return [];
    }

    // Only allow these calculator types in Main View
    const allowedCalculatorTypes = ['capital_assets', 'mortgage', 'real_estate', 'fixed_income'];

    // Assuming 'allCalculators' prop is the source for all calculators
    return (allCalculators || []).filter(calc => {
      // Check if calculator type is allowed
      if (!allowedCalculatorTypes.includes(calc.calculator_type)) {
        return false;
      }
      
      // Check if calculator is associated with any of the selected clients
      const calcClientIds = calc.client_ids || (calc.client_id ? [calc.client_id] : []);
      return formData.client_ids.some(selectedId => calcClientIds.includes(selectedId));
    });
  }, [formData.client_ids, allCalculators]);

  useImperativeHandle(ref, () => ({
    getState: () => ({ formData })
  }));

  // Safe helper functions
  const handleFormDataChange = useCallback((field, value) => {
    const processedValue = (field === 'primary_client_age' || field === 'spouse_age' || field === 'projection_years') 
      ? safeParseInt(value) 
      : (field === 'target_income' || field === 'inflation_rate' || field === 'average_tax_rate' || field === 'client_mtr' || field === 'spouse_mtr' || field === 'final_year_tax_rate')
      ? safeParseFloat(value)
      : value;
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));
  }, []);

  const handleDisplayChange = useCallback((field, value) => {
    setDisplayValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleFocus = useCallback((field) => {
    const currentValue = displayValues[field] || formData[field] || '';
    setDisplayValues(prev => ({ 
      ...prev, 
      [field]: parseNumberInput(currentValue).toString()
    }));
  }, [displayValues, formData]);

  const handleBlur = useCallback((field, type) => {
    const parsedValue = parseNumberInput(displayValues[field], type);
    handleFormDataChange(field, parsedValue);
    setDisplayValues(prev => ({ 
      ...prev, 
      [field]: formatNumberInput(parsedValue, type) 
    }));
  }, [displayValues, handleFormDataChange]);

  const handleActualNetWorthChange = useCallback((yearIndex, value) => {
    setNetWorthData(prev => {
      const updated = [...prev];
      const parsedValue = parseNumberInput(value, 'currency');
      updated[yearIndex] = { 
        ...updated[yearIndex], 
        actualNetWorth: parsedValue === 0 ? null : parsedValue 
      };
      return updated;
    });
  }, []);

  // Enhanced data aggregation function
  const aggregateLinkedCalculatorData = useCallback(async (linkedCalcIds) => {
    if (!linkedCalcIds || linkedCalcIds.length === 0) {
      return { fixedIncome: {}, capitalAssets: {}, realEstate: {}, mortgageDebt: {} };
    }

    let aggregatedData = {
      fixedIncome: {},
      capitalAssets: {},
      realEstate: {},
      mortgageDebt: {}
    };

    const promises = linkedCalcIds.map(id => 
      CalculatorInstance.get(id).catch(e => {
        console.error(`Failed to fetch calculator instance ${id}:`, e);
        return null;
      })
    );
    const allInstances = await Promise.all(promises);

    for (const calcInstance of allInstances) {
      if (!calcInstance) continue;

      try {
        console.log(`[DEBUG] Main View: Processing calculator: ${calcInstance.name} (${calcInstance.calculator_type})`);

        if (calcInstance.calculator_type === 'fixed_income') {
          const extractedData = extractFixedIncomeComparisonData(calcInstance.state_data, clients);
          
          if (extractedData && extractedData.projectionData) {
            extractedData.projectionData.forEach(yearData => {
              const year = safeParseInt(yearData.year);
              if (!aggregatedData.fixedIncome[year]) {
                aggregatedData.fixedIncome[year] = {
                  cppIncome: 0,
                  oasIncome: 0,
                  bridgeIncome: 0,
                  employerPensionIncome: 0,
                  otherIncome1: 0,
                  otherIncome2: 0,
                  totalFixedIncome: 0
                };
              }
              
              aggregatedData.fixedIncome[year].cppIncome += safeParseFloat(yearData.cppIncome, 0);
              aggregatedData.fixedIncome[year].oasIncome += safeParseFloat(yearData.oasIncome, 0);
              aggregatedData.fixedIncome[year].bridgeIncome += safeParseFloat(yearData.bridgeIncome, 0);
              aggregatedData.fixedIncome[year].employerPensionIncome += safeParseFloat(yearData.employerPensionIncome, 0);
              aggregatedData.fixedIncome[year].otherIncome1 += safeParseFloat(yearData.otherIncome1, 0);
              aggregatedData.fixedIncome[year].otherIncome2 += safeParseFloat(yearData.otherIncome2, 0);
              aggregatedData.fixedIncome[year].totalFixedIncome += safeParseFloat(yearData.totalFixedIncome, 0);
            });
          }
        }
        
        if (calcInstance.calculator_type === 'capital_assets') {
          const extractedData = extractCapitalAssetsComparisonData(calcInstance.state_data, clients);
          
          if (extractedData && extractedData.projectionData) {
            const accountType = calcInstance.state_data?.formData?.account_type;
            
            extractedData.projectionData.forEach(yearData => {
              const year = safeParseInt(yearData.year);
              if (!aggregatedData.capitalAssets[year]) {
                aggregatedData.capitalAssets[year] = {
                  registered: { income: 0, moneyIn: 0, moneyOut: 0, endBalance: 0 },
                  nonRegistered: { income: 0, moneyIn: 0, moneyOut: 0, endBalance: 0 },
                  tfsa: { income: 0, moneyIn: 0, moneyOut: 0, endBalance: 0 }
                };
              }
              
              const income = safeParseFloat(yearData.periodicRedemption, 0);
              // FIX: Changed moneyIn calculation to use periodicContribution and lumpSumContribution
              const moneyIn = safeParseFloat(yearData.periodicContribution, 0) + safeParseFloat(yearData.lumpSumContribution, 0);
              const moneyOut = safeParseFloat(yearData.periodicRedemption, 0) + safeParseFloat(yearData.lumpSumRedemption, 0);
              const endBalance = safeParseFloat(yearData.endingBalance, 0);
              
              if (accountType === 'registered') {
                aggregatedData.capitalAssets[year].registered.income += income;
                aggregatedData.capitalAssets[year].registered.moneyIn += moneyIn;
                aggregatedData.capitalAssets[year].registered.moneyOut += moneyOut;
                aggregatedData.capitalAssets[year].registered.endBalance += endBalance;
              } else if (accountType === 'non_registered') {
                aggregatedData.capitalAssets[year].nonRegistered.income += income;
                aggregatedData.capitalAssets[year].nonRegistered.moneyIn += moneyIn;
                aggregatedData.capitalAssets[year].nonRegistered.moneyOut += moneyOut;
                aggregatedData.capitalAssets[year].nonRegistered.endBalance += endBalance;
              } else if (accountType === 'tfsa') {
                aggregatedData.capitalAssets[year].tfsa.income += income;
                aggregatedData.capitalAssets[year].tfsa.moneyIn += moneyIn;
                aggregatedData.capitalAssets[year].tfsa.moneyOut += moneyOut;
                aggregatedData.capitalAssets[year].tfsa.endBalance += endBalance;
              }
            });
          }
        }
        
        if (calcInstance.calculator_type === 'real_estate') {
          const extractedData = extractRealEstateComparisonData(calcInstance.state_data, clients);
          
          if (extractedData && extractedData.projectionData) {
            const isPrincipalResidence = calcInstance.state_data?.formData?.is_principal_residence;
            
            extractedData.projectionData.forEach(yearData => {
              const year = safeParseInt(yearData.year);
              if (!aggregatedData.realEstate[year]) {
                aggregatedData.realEstate[year] = {
                  principalResidenceValue: 0,
                  investmentRealEstateValue: 0,
                  otherRealEstateValue: 0,
                  rentalIncome: 0
                };
              }
              
              const propertyValue = safeParseFloat(yearData.propertyValue, 0);
              const rentalIncome = safeParseFloat(yearData.rentalIncome, 0);
              
              if (isPrincipalResidence) {
                aggregatedData.realEstate[year].principalResidenceValue += propertyValue;
              } else {
                aggregatedData.realEstate[year].investmentRealEstateValue += propertyValue;
                aggregatedData.realEstate[year].rentalIncome += rentalIncome;
              }
            });
          }
        }
        
        if (calcInstance.calculator_type === 'mortgage') {
          const extractedData = extractMortgageComparisonData(calcInstance.state_data, clients);
          
          if (extractedData && extractedData.projectionData) {
            const liabilityType = calcInstance.state_data?.formData?.liability_type || 'principal_mortgage';
            
            extractedData.projectionData.forEach(yearData => {
              const year = safeParseInt(yearData.year);
              if (!aggregatedData.mortgageDebt[year]) {
                aggregatedData.mortgageDebt[year] = {
                  principalMortgage: { beginBalance: 0, endBalance: 0 },
                  otherMortgage: { beginBalance: 0, endBalance: 0 },
                  longTermDebt: { beginBalance: 0, endBalance: 0 },
                  shortTermDebt: { beginBalance: 0, endBalance: 0 }
                };
              }
              
              const beginBalance = safeParseFloat(yearData.openingBalance, 0);
              const endBalance = safeParseFloat(yearData.endingBalance, 0);
              
              if (liabilityType === 'principal_mortgage') {
                aggregatedData.mortgageDebt[year].principalMortgage.beginBalance += beginBalance;
                aggregatedData.mortgageDebt[year].principalMortgage.endBalance += endBalance;
              } else if (liabilityType === 'other_mortgage') {
                aggregatedData.mortgageDebt[year].otherMortgage.beginBalance += beginBalance;
                aggregatedData.mortgageDebt[year].otherMortgage.endBalance += endBalance;
              } else if (liabilityType === 'long_term_debt') {
                aggregatedData.mortgageDebt[year].longTermDebt.beginBalance += beginBalance;
                aggregatedData.mortgageDebt[year].longTermDebt.endBalance += endBalance;
              } else if (liabilityType === 'short_term_debt') {
                aggregatedData.mortgageDebt[year].shortTermDebt.beginBalance += beginBalance;
                aggregatedData.mortgageDebt[year].shortTermDebt.endBalance += endBalance;
              }
            });
          }
        }
        
      } catch (error) {
        console.error(`Error processing linked calculator ${calcInstance.id}:`, error);
      }
    }

    console.log('[DEBUG] Main View: Final aggregated data:', aggregatedData);
    return aggregatedData;
  }, [clients]);

  const serializedFormData = JSON.stringify(formData);

  // Main projection calculation effect with robust error handling
  useEffect(() => {
    // Make sure we have linkedCalculators data before proceeding
    if (!linkedCalculators || linkedCalculators.length === 0 && formData.linked_calculator_ids.length > 0) {
      console.log('[DEBUG] Waiting for linkedCalculators to be fetched...');
      return;
    }

    if (
      !formData.client_ids ||
      formData.client_ids.length === 0 ||
      serializedFormData === lastCalculatedFormData
    ) {
      console.log('[DEBUG] Skipping projection calculation:', {
        noClients: !formData.client_ids || formData.client_ids.length === 0,
        formDataUnchanged: serializedFormData === lastCalculatedFormData,
      });
      if (!formData.client_ids || formData.client_ids.length === 0) {
        setProjectionData([]);
        setIncomeStreams([]);
        setAssetData([]);
        setLiabilityData([]);
        setNetWorthData([]);
        setEstateData([]);
      }
      return;
    }

    const performCalculation = async () => {
      console.log('[DEBUG] ===== STARTING PROJECTION CALCULATION (via useEffect) =====');
      setIsRecalculating(true);

      try {
        const linkedData = await aggregateLinkedCalculatorData(formData.linked_calculator_ids);

        const primaryStartAge = primaryClientCalculatedAge !== null
          ? primaryClientCalculatedAge
          : safeParseInt(formData.primary_client_age, emptyFormData.primary_client_age);

        const associatedStartAge = associatedClientCalculatedAge !== null
          ? associatedClientCalculatedAge
          : safeParseInt(formData.spouse_age, emptyFormData.spouse_age);

        const currentYear = new Date().getFullYear();
        const projectionYears = safeParseInt(formData.projection_years, 30);
        
        const projections = [], assetProjections = [], liabilityProjections = [], netWorthProjections = [], estateProjections = [];

        setIncomeStreams([]);

        for (let yearOffset = 0; yearOffset < projectionYears; yearOffset++) {
          const year = currentYear + yearOffset;
          const primaryAge = primaryStartAge + yearOffset;
          const spouseAge = associatedClient ? associatedStartAge + yearOffset : null;

          // Income projections with safe parsing
          const yearData = { 
            year, 
            primaryAge, 
            spouseAge,
            cpp: 0, oas: 0, bridgePension: 0, privatePension: 0, 
            registeredIncome: 0, nonRegisteredIncome: 0, tfsaIncome: 0, 
            otherIncome1: 0, otherIncome2: 0, totalIncome: 0 
          };

          // Asset projections with safe parsing
          const assetYearData = { 
            year, 
            primaryAge,
            spouseAge,
            registeredMoneyIn: 0, registeredMoneyOut: 0, registeredEndBalance: 0,
            nonRegisteredMoneyIn: 0, nonRegisteredMoneyOut: 0, nonRegisteredEndBalance: 0,
            taxFreeMoneyIn: 0, taxFreeMoneyOut: 0, taxFreeEndBalance: 0,
            principalResidenceValue: 0, investmentRealEstateValue: 0, otherRealEstateValue: 0
          };

          // Liability projections with safe parsing
          const liabilityYearData = { 
            year, 
            primaryAge,
            spouseAge,
            principalMortgageBegin: 0, principalMortgageEnd: 0,
            otherMortgageBegin: 0, otherMortgageEnd: 0,
            longTermDebtBegin: 0, longTermDebtEnd: 0,
            shortTermDebtBegin: 0, shortTermDebtEnd: 0
          };

          // Populate income data with safe parsing
          const fixedIncomeData = linkedData.fixedIncome[year];
          if (fixedIncomeData) {
            yearData.cpp += safeParseFloat(fixedIncomeData.cppIncome, 0);
            yearData.oas += safeParseFloat(fixedIncomeData.oasIncome, 0);
            yearData.bridgePension += safeParseFloat(fixedIncomeData.bridgeIncome, 0);
            yearData.privatePension += safeParseFloat(fixedIncomeData.employerPensionIncome, 0);
            yearData.otherIncome1 += safeParseFloat(fixedIncomeData.otherIncome1, 0);
            yearData.otherIncome2 += safeParseFloat(fixedIncomeData.otherIncome2, 0);
          }

          const capitalAssetsData = linkedData.capitalAssets[year];
          if (capitalAssetsData) {
            yearData.registeredIncome += safeParseFloat(capitalAssetsData.registered.income, 0);
            yearData.nonRegisteredIncome += safeParseFloat(capitalAssetsData.nonRegistered.income, 0);
            yearData.tfsaIncome += safeParseFloat(capitalAssetsData.tfsa.income, 0);
            
            assetYearData.registeredMoneyIn += safeParseFloat(capitalAssetsData.registered.moneyIn, 0);
            assetYearData.registeredMoneyOut += safeParseFloat(capitalAssetsData.registered.moneyOut, 0);
            assetYearData.registeredEndBalance += safeParseFloat(capitalAssetsData.registered.endBalance, 0);
            
            assetYearData.nonRegisteredMoneyIn += safeParseFloat(capitalAssetsData.nonRegistered.moneyIn, 0);
            assetYearData.nonRegisteredMoneyOut += safeParseFloat(capitalAssetsData.nonRegistered.moneyOut, 0);
            assetYearData.nonRegisteredEndBalance += safeParseFloat(capitalAssetsData.nonRegistered.endBalance, 0);
            
            assetYearData.taxFreeMoneyIn += safeParseFloat(capitalAssetsData.tfsa.moneyIn, 0);
            assetYearData.taxFreeMoneyOut += safeParseFloat(capitalAssetsData.tfsa.moneyOut, 0);
            assetYearData.taxFreeEndBalance += safeParseFloat(capitalAssetsData.tfsa.endBalance, 0);
          }

          const realEstateData = linkedData.realEstate[year];
          if (realEstateData) {
            yearData.otherIncome1 += safeParseFloat(realEstateData.rentalIncome, 0);
            assetYearData.principalResidenceValue += safeParseFloat(realEstateData.principalResidenceValue, 0);
            assetYearData.investmentRealEstateValue += safeParseFloat(realEstateData.investmentRealEstateValue, 0);
            assetYearData.otherRealEstateValue += safeParseFloat(realEstateData.otherRealEstateValue, 0);
          }

          // Populate liability data with safe parsing
          const mortgageDebtData = linkedData.mortgageDebt[year];
          if (mortgageDebtData) {
            liabilityYearData.principalMortgageBegin += safeParseFloat(mortgageDebtData.principalMortgage.beginBalance, 0);
            liabilityYearData.principalMortgageEnd += safeParseFloat(mortgageDebtData.principalMortgage.endBalance, 0);
            liabilityYearData.otherMortgageBegin += safeParseFloat(mortgageDebtData.otherMortgage.beginBalance, 0);
            liabilityYearData.otherMortgageEnd += safeParseFloat(mortgageDebtData.otherMortgage.endBalance, 0);
            liabilityYearData.longTermDebtBegin += safeParseFloat(mortgageDebtData.longTermDebt.beginBalance, 0);
            liabilityYearData.longTermDebtEnd += safeParseFloat(mortgageDebtData.longTermDebt.endBalance, 0);
            liabilityYearData.shortTermDebtBegin += safeParseFloat(mortgageDebtData.shortTermDebt.beginBalance, 0);
            liabilityYearData.shortTermDebtEnd += safeParseFloat(mortgageDebtData.shortTermDebt.endBalance, 0);
          }

          // Calculate totals with safe parsing
          yearData.totalIncome = yearData.cpp + yearData.oas + yearData.bridgePension + yearData.privatePension + 
                                yearData.registeredIncome + yearData.nonRegisteredIncome + yearData.tfsaIncome + 
                                yearData.otherIncome1 + yearData.otherIncome2;

          const targetIncomeBase = safeParseFloat(formData.target_income, 0);
          const inflationRate = safeParseFloat(formData.inflation_rate, 0) / 100;
          const averageTaxRate = safeParseFloat(formData.average_tax_rate, 0) / 100;

          yearData.targetIncome = targetIncomeBase * Math.pow(1 + inflationRate, yearOffset);
          yearData.percentOfTargetAchieved = yearData.targetIncome > 0 ? (yearData.totalIncome / yearData.targetIncome) * 100 : 0;
          yearData.shortfallSurplus = yearData.totalIncome - yearData.targetIncome;
          yearData.taxEstimate = yearData.totalIncome * averageTaxRate;
          yearData.afterTaxIncome = yearData.totalIncome - yearData.taxEstimate;

          // Calculate net worth with safe parsing
          const totalAssets = assetYearData.registeredEndBalance + assetYearData.nonRegisteredEndBalance + 
                             assetYearData.taxFreeEndBalance + assetYearData.principalResidenceValue + 
                             assetYearData.investmentRealEstateValue + assetYearData.otherRealEstateValue;
          const totalLiabilities = liabilityYearData.principalMortgageEnd + liabilityYearData.otherMortgageEnd + 
                                  liabilityYearData.longTermDebtEnd + liabilityYearData.shortTermDebtEnd;
          const netWorth = totalAssets - totalLiabilities;

          projections.push(yearData);
          assetProjections.push(assetYearData);
          liabilityProjections.push(liabilityYearData);
          netWorthProjections.push({
            year, primaryAge, spouseAge, totalAssets, totalLiabilities, netWorth,
            inflationAdjustedNetWorth: netWorth / Math.pow(1 + inflationRate, yearOffset),
            actualNetWorth: null
          });

          // Estate calculations with safe parsing
          const estateRegisteredAssetsValue = safeParseFloat(linkedData.capitalAssets[year]?.registered?.endBalance, 0);
          const finalYearTaxRate = safeParseFloat(formData.final_year_tax_rate, 0) / 100;

          const probateEstimate = netWorth > 50000 ? (netWorth - 50000) * 0.015 : 0;
          const finalTaxOnRegisteredAssets = estateRegisteredAssetsValue * finalYearTaxRate;
          estateProjections.push({
            year, primaryAge, spouseAge, grossEstateValue: netWorth, probateEstimate, finalTaxOnRegisteredAssets,
            finalEstateValue: netWorth - probateEstimate - finalTaxOnRegisteredAssets
          });
        }

        setProjectionData(projections);
        setAssetData(assetProjections);
        setLiabilityData(liabilityProjections);
        setNetWorthData(netWorthProjections);
        setEstateData(estateProjections);
        setLastCalculatedFormData(serializedFormData);

        console.log('[DEBUG] ===== PROJECTION CALCULATION COMPLETE (via useEffect) =====');

      } catch (error) {
        console.error("Error during projection calculation:", error);
        // Clear data on error
        setProjectionData([]);
        setIncomeStreams([]);
        setAssetData([]);
        setLiabilityData([]);
        setNetWorthData([]);
        setEstateData([]);
      } finally {
        setIsRecalculating(false);
      }
    };

    performCalculation();
  }, [
    serializedFormData,
    clients,
    aggregateLinkedCalculatorData,
    lastCalculatedFormData,
    primaryClientCalculatedAge,
    associatedClientCalculatedAge,
    associatedClient,
    linkedCalculators,
    formData, 
  ]);

  const loadHouseholdCalculatorsAndGoals = useCallback(async (clientIds) => {
      if (clientIds && clientIds.length > 0) {
          try {
              const goalsPromises = clientIds.map(id => FinancialGoal.filter({ client_ids: [id] }));
              const goalsResults = await Promise.all(goalsPromises);
              setAvailableGoals(Array.from(new Map(goalsResults.flat().filter(Boolean).map(item => [item.id, item])).values()));

              // Removed fetching and setting availableCalculators here, as it's now handled by useMemo
          } catch (error) {
              console.error("Error loading household data:", error);
              setAvailableGoals([]);
          }
      } else {
          setAvailableGoals([]);
      }
  }, []);

  const handleLinkedCalculatorsChange = useCallback((selectedIds) => {
    handleFormDataChange('linked_calculator_ids', selectedIds);
  }, [handleFormDataChange]);

  const handleClearFields = useCallback(() => {
    const currentClientIds = formData.client_ids;
    const currentCalculatorName = formData.calculator_name;
    setFormData({
      ...emptyFormData,
      client_ids: currentClientIds,
      calculator_name: currentCalculatorName
    });
    setLinkedCalculators([]);
    setProjectionData([]);
    setIncomeStreams([]);
    setAssetData([]);
    setLiabilityData([]);
    setNetWorthData([]);
    setEstateData([]);
    setLastCalculatedFormData(null);
    setDisplayValues({
      target_income: formatNumberInput(emptyFormData.target_income, 'currency'),
      inflation_rate: formatNumberInput(emptyFormData.inflation_rate, 'percentage'),
      average_tax_rate: formatNumberInput(emptyFormData.average_tax_rate, 'percentage'),
      client_mtr: formatNumberInput(emptyFormData.client_mtr, 'percentage'),
      spouse_mtr: formatNumberInput(emptyFormData.spouse_mtr, 'percentage'),
      final_year_tax_rate: formatNumberInput(emptyFormData.final_year_tax_rate, 'percentage')
    });
  }, [formData.client_ids, formData.calculator_name]);

  const handleRecalculateProjections = useCallback(async () => {
    console.log('[DEBUG] ===== MANUAL RECALCULATE TRIGGERED =====');
    setIsRecalculating(true);
    setLastCalculatedFormData(null);

    try {
      // Force a re-fetch of linked calculators if their IDs are set
      if (formData.linked_calculator_ids && formData.linked_calculator_ids.length > 0) {
          const instancePromises = formData.linked_calculator_ids.map(id => CalculatorInstance.get(id));
          const freshCalculators = (await Promise.all(instancePromises)).filter(Boolean);
          setLinkedCalculators(freshCalculators);
      } else {
           setLinkedCalculators([]);
      }
      console.log("[DEBUG] Manual recalculation preparation complete, main effect should re-run.");
    } catch (error) {
      console.error("[DEBUG] Error during manual recalculation preparation:", error);
    } finally {
      // setIsRecalculating(false) will be handled by the main useEffect
    }
  }, [formData.linked_calculator_ids]);

  const getClientName = useCallback((clientId) => {
    const client = clients?.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : '';
  }, [clients]);

  const getHouseholdName = useCallback(() => {
    if (!clients || formData.client_ids.length === 0) return 'No clients selected';
    const selectedClientNames = formData.client_ids
      .map(id => {
        const client = clients.find(c => c.id === id);
        return client ? `${client.first_name} ${client.last_name}` : null;
      })
      .filter(Boolean);
    return selectedClientNames.length > 0 ? selectedClientNames.join(' & ') : 'No clients selected';
  }, [clients, formData.client_ids]);

  // Initial state setup with safe parsing
  useEffect(() => {
    let initialData;
    if (initialState?.formData) {
      const clientIds = initialState.formData.client_ids ||
                       (initialState.formData.client_id ? [initialState.formData.client_id] : []) ||
                       (preselectedClientId ? [preselectedClientId] : []);

      // Safely parse all numeric fields from initialState
      initialData = {
        ...emptyFormData,
        calculator_name: initialState.formData.calculator_name || emptyFormData.calculator_name,
        client_ids: clientIds,
        linked_calculator_ids: initialState.formData.linked_calculator_ids || [],
        spouse_id: initialState.formData.spouse_id || "",
        primary_client_age: safeParseInt(initialState.formData.primary_client_age, emptyFormData.primary_client_age),
        spouse_age: safeParseInt(initialState.formData.spouse_age, emptyFormData.spouse_age),
        projection_years: safeParseInt(initialState.formData.projection_years, emptyFormData.projection_years),
        target_income: safeParseFloat(initialState.formData.target_income, emptyFormData.target_income),
        inflation_rate: safeParseFloat(initialState.formData.inflation_rate, emptyFormData.inflation_rate),
        average_tax_rate: safeParseFloat(initialState.formData.average_tax_rate, emptyFormData.average_tax_rate),
        client_mtr: safeParseFloat(initialState.formData.client_mtr, emptyFormData.client_mtr),
        spouse_mtr: safeParseFloat(initialState.formData.spouse_mtr, emptyFormData.spouse_mtr),
        final_year_tax_rate: safeParseFloat(initialState.formData.final_year_tax_rate, emptyFormData.final_year_tax_rate),
      };
    } else {
      initialData = {
        ...emptyFormData,
        client_ids: preselectedClientId ? [preselectedClientId] : [],
      };
    }

    // Set inflation rate from appSettings if not already set or overridden by initialState
    if ((initialData.inflation_rate === emptyFormData.inflation_rate || initialData.inflation_rate === null || initialData.inflation_rate === undefined) && appSettings?.preferred_inflation_rate !== undefined) {
        initialData.inflation_rate = safeParseFloat(appSettings.preferred_inflation_rate, emptyFormData.inflation_rate);
    }

    setFormData(initialData);

    // Set display values with safe formatting
    setDisplayValues({
      target_income: formatNumberInput(initialData.target_income, 'currency'),
      inflation_rate: formatNumberInput(initialData.inflation_rate, 'percentage'),
      average_tax_rate: formatNumberInput(initialData.average_tax_rate, 'percentage'),
      client_mtr: formatNumberInput(initialData.client_mtr, 'percentage'),
      spouse_mtr: formatNumberInput(initialData.spouse_mtr, 'percentage'),
      final_year_tax_rate: formatNumberInput(initialData.final_year_tax_rate, 'percentage')
    });
  }, [initialState, preselectedClientId, appSettings]);

  // New useEffect to fetch full calculator instances when IDs change
  useEffect(() => {
    const fetchFullInstances = async (linkedCalculatorIds) => {
        console.log('[DEBUG] fetchFullInstances called with linked_calculator_ids:', linkedCalculatorIds);

        if (!linkedCalculatorIds || linkedCalculatorIds.length === 0) {
            console.log('[DEBUG] No linked calculator IDs, clearing linkedCalculators');
            setLinkedCalculators([]);
            return;
        }

        setIsLoadingData(true);
        console.log('[DEBUG] Fetching full data for linked calculators:', linkedCalculatorIds);
        try {
            const instances = await Promise.all(
                linkedCalculatorIds.map(id => CalculatorInstance.get(id).catch(e => {
                    console.warn(`Could not fetch instance ${id}:`, e);
                    return null;
                }))
            );
            const validInstances = instances.filter(Boolean);

            console.log("[FI-0] fetched IDs:", linkedCalculatorIds);
            console.log("[FI-1] fetched instances:", validInstances.map(i => ({
                id: i.id,
                name: i.name,
                type: i.calculator_type,
                has_state_data: !!i.state_data && Object.keys(i.state_data).length > 0
            })));

            setLinkedCalculators(validInstances);
        } catch (error) {
            console.error("[DEBUG] Error fetching full calculator instances:", error);
            setLinkedCalculators([]);
        } finally {
            setIsLoadingData(false);
        }
    };

    fetchFullInstances(formData.linked_calculator_ids);
  }, [formData.linked_calculator_ids]);

  // Auto-set primary_client_age based on client DOB with safe parsing
  useEffect(() => {
    const primaryClientId = formData.client_ids?.[0];
    const associatedClientId = formData.client_ids?.[1];

    // Primary Client Age
    if (primaryClientId && clients && clients.length > 0) {
      const client = clients.find(c => c.id === primaryClientId);
      if (client && client.date_of_birth) {
        const calculatedAge = differenceInYears(new Date(), new Date(client.date_of_birth));
        // Only update if current stored value is different from calculated, to avoid unnecessary state updates
        if (safeParseInt(formData.primary_client_age) !== calculatedAge) { 
          handleFormDataChange('primary_client_age', calculatedAge);
        }
      } else {
        // Reset to default if client not found or no DOB, but only if it's not already the default
        if (safeParseInt(formData.primary_client_age) !== emptyFormData.primary_client_age) { 
          handleFormDataChange('primary_client_age', emptyFormData.primary_client_age);
        }
      }
    } else {
      // Reset to default if no primary client selected, but only if it's not already the default
      if (safeParseInt(formData.primary_client_age) !== emptyFormData.primary_client_age) { 
        handleFormDataChange('primary_client_age', emptyFormData.primary_client_age);
      }
    }

    // Associated Client Age (Spouse)
    if (associatedClientId && clients && clients.length > 0) {
      const spouse = clients.find(c => c.id === associatedClientId);
      if (spouse && spouse.date_of_birth) {
        const calculatedAge = differenceInYears(new Date(), new Date(spouse.date_of_birth));
        if (safeParseInt(formData.spouse_age) !== calculatedAge) {
          handleFormDataChange('spouse_age', calculatedAge);
        }
      } else {
        if (safeParseInt(formData.spouse_age) !== emptyFormData.spouse_age) {
          handleFormDataChange('spouse_age', emptyFormData.spouse_age);
        }
      }
    } else {
      if (safeParseInt(formData.spouse_age) !== emptyFormData.spouse_age) {
        handleFormDataChange('spouse_age', emptyFormData.spouse_age);
      }
    }

    loadHouseholdCalculatorsAndGoals(formData.client_ids);
  }, [formData.client_ids, clients, handleFormDataChange, loadHouseholdCalculatorsAndGoals, formData.primary_client_age, formData.spouse_age]);


  const handleRowHighlight = (rowIndex) => {
    if (highlightedRowIndex === rowIndex) {
      setHighlightedRowIndex(null);
    } else {
      setHighlightedRowIndex(rowIndex);
    }
  };

  const handleColumnHighlight = (columnIndex) => {
    if (highlightedColumnIndex === columnIndex) {
      setHighlightedColumnIndex(null);
    } else {
      setHighlightedColumnIndex(columnIndex);
    }
  };

  const getCellHighlightClass = (rowIndex, columnIndex) => {
    if (highlightedRowIndex === rowIndex || highlightedColumnIndex === columnIndex) {
      return 'bg-green-100 dark:bg-green-900/50';
    }
    return '';
  };

  // Get goals for the selected clients
  const clientGoals = useMemo(() => {
    return formData.client_ids && formData.client_ids.length > 0
      ? (goals || []).filter(goal => {
          const goalClientIds = goal.client_ids || (goal.client_id ? [goal.client_id] : []);
          return formData.client_ids.some(selectedId => goalClientIds.includes(selectedId));
        })
      : [];
  }, [goals, formData.client_ids]);

  const renderIncomeTab = () => {
    // Extract custom income names from fixed income calculators
    const getCustomIncomeNames = () => {
      let otherIncome1Name = "Other Income 1";
      let otherIncome2Name = "Other Income 2";

      const linkedFixedIncomeCalculators = linkedCalculators.filter(calc =>
        calc.calculator_type === 'fixed_income'
      );

      if (linkedFixedIncomeCalculators.length > 0) {
        const firstFixedIncomeCalc = linkedFixedIncomeCalculators[0];
        if (firstFixedIncomeCalc.state_data && firstFixedIncomeCalc.state_data.formData) {
          const formData = firstFixedIncomeCalc.state_data.formData;
          if (formData.other1_name && formData.other1_name.trim() !== '') {
            otherIncome1Name = formData.other1_name;
          }
          if (formData.other2_name && formData.other2_name.trim() !== '') {
            otherIncome2Name = formData.other2_name;
          }
        }
      }

      return { otherIncome1Name, otherIncome2Name };
    };

    const { otherIncome1Name, otherIncome2Name } = getCustomIncomeNames();
    const spouseHeader = associatedClient ? `${associatedClient.first_name || 'Spouse'} Age` : null;
    const offset = associatedClient ? 1 : 0;

    return (
      <div className="space-y-4">
        {projectionData.length > 0 && (
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent>
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left p-3 font-semibold border-r cursor-pointer" onDoubleClick={() => handleColumnHighlight(0)}>Year</th>
                      <th className="text-left p-3 font-semibold border-r cursor-pointer" onDoubleClick={() => handleColumnHighlight(1)}>{primaryClient?.first_name ? `${primaryClient.first_name} Age` : 'Primary Age'}</th>
                      {associatedClient && (
                        <th className="text-left p-3 font-semibold border-r cursor-pointer" onDoubleClick={() => handleColumnHighlight(2)}>{spouseHeader}</th>
                      )}
                      <th className="text-right p-3 font-semibold border-r cursor-pointer" onDoubleClick={() => handleColumnHighlight(2 + offset)}>CPP</th>
                      <th className="text-right p-3 font-semibold border-r cursor-pointer" onDoubleClick={() => handleColumnHighlight(3 + offset)}>OAS</th>
                      <th className="text-right p-3 font-semibold border-r cursor-pointer" onDoubleClick={() => handleColumnHighlight(4 + offset)}>Bridge Pension</th>
                      <th className="text-right p-3 font-semibold border-r cursor-pointer" onDoubleClick={() => handleColumnHighlight(5 + offset)}>Private Pension</th>
                      <th className="text-right p-3 font-semibold border-r cursor-pointer" onDoubleClick={() => handleColumnHighlight(6 + offset)}>Registered Income</th>
                      <th className="text-right p-3 font-semibold border-r cursor-pointer" onDoubleClick={() => handleColumnHighlight(7 + offset)}>Non-Registered Income</th>
                      <th className="text-right p-3 font-semibold border-r cursor-pointer" onDoubleClick={() => handleColumnHighlight(8 + offset)}>TFSA Income</th>
                      <th className="text-right p-3 font-semibold border-r cursor-pointer" onDoubleClick={() => handleColumnHighlight(9 + offset)}>{otherIncome1Name}</th>
                      <th className="text-right p-3 font-semibold border-r cursor-pointer" onDoubleClick={() => handleColumnHighlight(10 + offset)}>{otherIncome2Name}</th>
                      <th className="text-right p-3 font-semibold border-r bg-blue-50 text-blue-800 cursor-pointer" onDoubleClick={() => handleColumnHighlight(11 + offset)}>Total Income</th>
                      <th className="text-right p-3 font-semibold border-r bg-orange-50 text-orange-800 cursor-pointer" onDoubleClick={() => handleColumnHighlight(12 + offset)}>Target Income</th>
                      <th className="text-right p-3 font-semibold border-r bg-purple-50 text-purple-800 cursor-pointer" onDoubleClick={() => handleColumnHighlight(13 + offset)}>% of Target Achieved</th>
                      <th className="text-right p-3 font-semibold border-r bg-yellow-50 text-yellow-800 cursor-pointer" onDoubleClick={() => handleColumnHighlight(14 + offset)}>Shortfall/Surplus</th>
                      <th className="text-right p-3 font-semibold border-r bg-red-50 text-red-800 cursor-pointer" onDoubleClick={() => handleColumnHighlight(15 + offset)}>Tax Estimate</th>
                      <th className="text-right p-3 font-semibold bg-green-50 text-green-800 cursor-pointer" onDoubleClick={() => handleColumnHighlight(16 + offset)}>After-Tax Income</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectionData.map((row, index) => (
                      <tr key={index} className="border-b hover:bg-slate-50">
                        <td className={`p-3 font-medium border-r cursor-pointer ${getCellHighlightClass(index, 0)}`} onDoubleClick={() => handleRowHighlight(index)}>{row.year}</td>
                        <td className={`p-3 font-medium border-r ${getCellHighlightClass(index, 1)}`}>{row.primaryAge}</td>
                        {associatedClient && (
                          <td className={`p-3 font-medium border-r ${getCellHighlightClass(index, 2)}`}>{row.spouseAge !== null ? row.spouseAge : '-'}</td>
                        )}
                        <td className={`p-3 text-right border-r ${getCellHighlightClass(index, 2 + offset)}`}>{formatCurrency(row.cpp)}</td>
                        <td className={`p-3 text-right border-r ${getCellHighlightClass(index, 3 + offset)}`}>{formatCurrency(row.oas)}</td>
                        <td className={`p-3 text-right border-r ${getCellHighlightClass(index, 4 + offset)}`}>{formatCurrency(row.bridgePension)}</td>
                        <td className={`p-3 text-right border-r ${getCellHighlightClass(index, 5 + offset)}`}>{formatCurrency(row.privatePension)}</td>
                        <td className={`p-3 text-right border-r ${getCellHighlightClass(index, 6 + offset)}`}>{formatCurrency(row.registeredIncome)}</td>
                        <td className={`p-3 text-right border-r ${getCellHighlightClass(index, 7 + offset)}`}>{formatCurrency(row.nonRegisteredIncome)}</td>
                        <td className={`p-3 text-right border-r ${getCellHighlightClass(index, 8 + offset)}`}>{formatCurrency(row.tfsaIncome)}</td>
                        <td className={`p-3 text-right border-r ${getCellHighlightClass(index, 9 + offset)}`}>{formatCurrency(row.otherIncome1)}</td>
                        <td className={`p-3 text-right border-r ${getCellHighlightClass(index, 10 + offset)}`}>{formatCurrency(row.otherIncome2)}</td>
                        <td className={`p-3 text-right font-bold border-r text-blue-800 ${getCellHighlightClass(index, 11 + offset) || 'bg-blue-50'}`}>{formatCurrency(row.totalIncome)}</td>
                        <td className={`p-3 text-right border-r text-orange-800 ${getCellHighlightClass(index, 12 + offset) || 'bg-orange-50'}`}>{formatCurrency(row.targetIncome)}</td>
                        <td className={`p-3 text-right border-r text-purple-800 ${getCellHighlightClass(index, 13 + offset) || 'bg-purple-50'}`}>{safeParseFloat(row.percentOfTargetAchieved, 0).toFixed(1)}%</td>
                        <td className={`p-3 text-right font-semibold ${row.shortfallSurplus >= 0 ? 'text-green-700' : 'text-red-700'} border-r ${getCellHighlightClass(index, 14 + offset) || 'bg-yellow-50'}`}>{formatCurrency(row.shortfallSurplus)}</td>
                        <td className={`p-3 text-right border-r text-red-800 ${getCellHighlightClass(index, 15 + offset) || 'bg-red-50'}`}>{formatCurrency(row.taxEstimate)}</td>
                        <td className={`p-3 text-right font-bold text-green-800 ${getCellHighlightClass(index, 16 + offset) || 'bg-green-50'}`}>{formatCurrency(row.afterTaxIncome)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderAssetsTab = () => {
    const spouseHeader = associatedClient ? `${associatedClient.first_name || 'Spouse'} Age` : null;
    const offset = associatedClient ? 1 : 0;
    return (
      <div className="space-y-4">
        {assetData.length > 0 && (
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent>
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left p-3 font-semibold border-r cursor-pointer" rowSpan="2" onDoubleClick={() => handleColumnHighlight(0)}>Year</th>
                      <th className="text-left p-3 font-semibold border-r cursor-pointer" rowSpan="2" onDoubleClick={() => handleColumnHighlight(1)}>{primaryClient?.first_name ? `${primaryClient.first_name} Age` : 'Primary Age'}</th>
                      {associatedClient && (
                        <th className="text-left p-3 font-semibold border-r cursor-pointer" rowSpan="2" onDoubleClick={() => handleColumnHighlight(2)}>{spouseHeader}</th>
                      )}
                      <th className="text-center p-3 font-semibold border-r bg-blue-50 text-blue-800" colSpan="3">Registered Assets</th>
                      <th className="text-center p-3 font-semibold border-r bg-green-50 text-green-800" colSpan="3">Non-Registered Assets</th>
                      <th className="text-center p-3 font-semibold border-r bg-purple-50 text-purple-800" colSpan="3">Tax-Free Assets</th>
                      <th className="text-center p-3 font-semibold bg-orange-50 text-orange-800" colSpan="3">Real Estate Assets</th>
                    </tr>
                    <tr>
                      <th className="text-right p-2 font-medium border-r text-xs bg-blue-50 text-blue-700 cursor-pointer" onDoubleClick={() => handleColumnHighlight(2 + offset)}>Money In</th>
                      <th className="text-right p-2 font-medium border-r text-xs bg-blue-50 text-blue-700 cursor-pointer" onDoubleClick={() => handleColumnHighlight(3 + offset)}>Money Out</th>
                      <th className="text-right p-2 font-medium border-r text-xs bg-blue-50 text-blue-700 cursor-pointer" onDoubleClick={() => handleColumnHighlight(4 + offset)}>End Balance</th>
                      <th className="text-right p-2 font-medium border-r text-xs bg-green-50 text-green-700 cursor-pointer" onDoubleClick={() => handleColumnHighlight(5 + offset)}>Money In</th>
                      <th className="text-right p-2 font-medium border-r text-xs bg-green-50 text-green-700 cursor-pointer" onDoubleClick={() => handleColumnHighlight(6 + offset)}>Money Out</th>
                      <th className="text-right p-2 font-medium border-r text-xs bg-green-50 text-green-700 cursor-pointer" onDoubleClick={() => handleColumnHighlight(7 + offset)}>End Balance</th>
                      <th className="text-right p-2 font-medium border-r text-xs bg-purple-50 text-purple-700 cursor-pointer" onDoubleClick={() => handleColumnHighlight(8 + offset)}>Money In</th>
                      <th className="text-right p-2 font-medium border-r text-xs bg-purple-50 text-purple-700 cursor-pointer" onDoubleClick={() => handleColumnHighlight(9 + offset)}>Money Out</th>
                      <th className="text-right p-2 font-medium border-r text-xs bg-purple-50 text-purple-700 cursor-pointer" onDoubleClick={() => handleColumnHighlight(10 + offset)}>End Balance</th>
                      <th className="text-right p-2 font-medium border-r text-xs bg-orange-50 text-orange-700 cursor-pointer" onDoubleClick={() => handleColumnHighlight(11 + offset)}>Principal Residence</th>
                      <th className="text-right p-2 font-medium border-r text-xs bg-orange-50 text-orange-700 cursor-pointer" onDoubleClick={() => handleColumnHighlight(12 + offset)}>Investment Real Estate</th>
                      <th className="text-right p-2 font-medium text-xs bg-orange-50 text-orange-700 cursor-pointer" onDoubleClick={() => handleColumnHighlight(13 + offset)}>Other Real Estate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetData.map((row, index) => (
                      <tr key={index} className="border-b hover:bg-slate-50">
                        <td className={`p-3 font-medium border-r cursor-pointer ${getCellHighlightClass(index, 0)}`} onDoubleClick={() => handleRowHighlight(index)}>{row.year}</td>
                        <td className={`p-3 font-medium border-r ${getCellHighlightClass(index, 1)}`}>{row.primaryAge}</td>
                        {associatedClient && (
                          <td className={`p-3 font-medium border-r ${getCellHighlightClass(index, 2)}`}>{row.spouseAge !== null ? row.spouseAge : '-'}</td>
                        )}
                        <td className={`p-3 text-right border-r text-blue-800 ${getCellHighlightClass(index, 2 + offset) || 'bg-blue-50/30'}`}>{formatCurrency(row.registeredMoneyIn)}</td>
                        <td className={`p-3 text-right border-r text-blue-800 ${getCellHighlightClass(index, 3 + offset) || 'bg-blue-50/30'}`}>{formatCurrency(row.registeredMoneyOut)}</td>
                        <td className={`p-3 text-right border-r text-blue-800 font-semibold ${getCellHighlightClass(index, 4 + offset) || 'bg-blue-50/30'}`}>{formatCurrency(row.registeredEndBalance)}</td>
                        <td className={`p-3 text-right border-r text-green-800 ${getCellHighlightClass(index, 5 + offset) || 'bg-green-50/30'}`}>{formatCurrency(row.nonRegisteredMoneyIn)}</td>
                        <td className={`p-3 text-right border-r text-green-800 ${getCellHighlightClass(index, 6 + offset) || 'bg-green-50/30'}`}>{formatCurrency(row.nonRegisteredMoneyOut)}</td>
                        <td className={`p-3 text-right border-r text-green-800 font-semibold ${getCellHighlightClass(index, 7 + offset) || 'bg-green-50/30'}`}>{formatCurrency(row.nonRegisteredEndBalance)}</td>
                        <td className={`p-3 text-right border-r text-purple-800 ${getCellHighlightClass(index, 8 + offset) || 'bg-purple-50/30'}`}>{formatCurrency(row.taxFreeMoneyIn)}</td>
                        <td className={`p-3 text-right border-r text-purple-800 ${getCellHighlightClass(index, 9 + offset) || 'bg-purple-50/30'}`}>{formatCurrency(row.taxFreeMoneyOut)}</td>
                        <td className={`p-3 text-right border-r text-purple-800 font-semibold ${getCellHighlightClass(index, 10 + offset) || 'bg-purple-50/30'}`}>{formatCurrency(row.taxFreeEndBalance)}</td>
                        <td className={`p-3 text-right border-r text-orange-800 font-semibold ${getCellHighlightClass(index, 11 + offset) || 'bg-orange-50/30'}`}>{formatCurrency(row.principalResidenceValue)}</td>
                        <td className={`p-3 text-right border-r text-orange-800 font-semibold ${getCellHighlightClass(index, 12 + offset) || 'bg-orange-50/30'}`}>{formatCurrency(row.investmentRealEstateValue)}</td>
                        <td className={`p-3 text-right text-orange-800 font-semibold ${getCellHighlightClass(index, 13 + offset) || 'bg-orange-50/30'}`}>{formatCurrency(row.otherRealEstateValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderLiabilitiesTab = () => {
    const spouseHeader = associatedClient ? `${associatedClient.first_name || 'Spouse'} Age` : null;
    const offset = associatedClient ? 1 : 0;
    return (
      <div className="space-y-4">
        {liabilityData.length > 0 && (
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent>
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left p-3 font-semibold border-r cursor-pointer" rowSpan="2" onDoubleClick={() => handleColumnHighlight(0)}>Year</th>
                      <th className="text-left p-3 font-semibold border-r cursor-pointer" rowSpan="2" onDoubleClick={() => handleColumnHighlight(1)}>{primaryClient?.first_name ? `${primaryClient.first_name} Age` : 'Primary Age'}</th>
                      {associatedClient && (
                        <th className="text-left p-3 font-semibold border-r cursor-pointer" rowSpan="2" onDoubleClick={() => handleColumnHighlight(2)}>{spouseHeader}</th>
                      )}
                      <th className="text-center p-3 font-semibold border-r bg-red-50 text-red-800" colSpan="2">Principal Mortgage</th>
                      <th className="text-center p-3 font-semibold border-r bg-orange-50 text-orange-800" colSpan="2">Other Mortgages</th>
                      <th className="text-center p-3 font-semibold border-r bg-yellow-50 text-yellow-800" colSpan="2">Long-Term Debt</th>
                      <th className="text-center p-3 font-semibold bg-indigo-50 text-indigo-800" colSpan="2">Short-Term Debt</th>
                    </tr>
                    <tr>
                      <th className="text-right p-2 font-medium border-r text-xs bg-red-50 text-red-700 cursor-pointer" onDoubleClick={() => handleColumnHighlight(2 + offset)}>Beginning Balance</th>
                      <th className="text-right p-2 font-medium border-r text-xs bg-red-50 text-red-700 cursor-pointer" onDoubleClick={() => handleColumnHighlight(3 + offset)}>End Balance</th>
                      <th className="text-right p-2 font-medium border-r text-xs bg-orange-50 text-orange-700 cursor-pointer" onDoubleClick={() => handleColumnHighlight(4 + offset)}>Beginning Balance</th>
                      <th className="text-right p-2 font-medium border-r text-xs bg-orange-50 text-orange-700 cursor-pointer" onDoubleClick={() => handleColumnHighlight(5 + offset)}>End Balance</th>
                      <th className="text-right p-2 font-medium border-r text-xs bg-yellow-50 text-yellow-700 cursor-pointer" onDoubleClick={() => handleColumnHighlight(6 + offset)}>Beginning Balance</th>
                      <th className="text-right p-2 font-medium border-r text-xs bg-yellow-50 text-yellow-700 cursor-pointer" onDoubleClick={() => handleColumnHighlight(7 + offset)}>End Balance</th>
                      <th className="text-right p-2 font-medium border-r text-xs bg-indigo-50 text-indigo-700 cursor-pointer" onDoubleClick={() => handleColumnHighlight(8 + offset)}>Beginning Balance</th>
                      <th className="text-right p-2 font-medium text-xs bg-indigo-50 text-indigo-700 cursor-pointer" onDoubleClick={() => handleColumnHighlight(9 + offset)}>End Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liabilityData.map((row, index) => (
                      <tr key={index} className="border-b hover:bg-slate-50">
                        <td className={`p-3 font-medium border-r cursor-pointer ${getCellHighlightClass(index, 0)}`} onDoubleClick={() => handleRowHighlight(index)}>{row.year}</td>
                        <td className={`p-3 font-medium border-r ${getCellHighlightClass(index, 1)}`}>{row.primaryAge}</td>
                        {associatedClient && (
                          <td className={`p-3 font-medium border-r ${getCellHighlightClass(index, 2)}`}>{row.spouseAge !== null ? row.spouseAge : '-'}</td>
                        )}
                        <td className={`p-3 text-right border-r text-red-800 ${getCellHighlightClass(index, 2 + offset) || 'bg-red-50/30'}`}>{formatCurrency(row.principalMortgageBegin)}</td>
                        <td className={`p-3 text-right border-r text-red-800 font-semibold ${getCellHighlightClass(index, 3 + offset) || 'bg-red-50/30'}`}>{formatCurrency(row.principalMortgageEnd)}</td>
                        <td className={`p-3 text-right border-r text-orange-800 ${getCellHighlightClass(index, 4 + offset) || 'bg-orange-50/30'}`}>{formatCurrency(row.otherMortgageBegin)}</td>
                        <td className={`p-3 text-right border-r text-orange-800 font-semibold ${getCellHighlightClass(index, 5 + offset) || 'bg-orange-50/30'}`}>{formatCurrency(row.otherMortgageEnd)}</td>
                        <td className={`p-3 text-right border-r text-yellow-800 ${getCellHighlightClass(index, 6 + offset) || 'bg-yellow-50/30'}`}>{formatCurrency(row.longTermDebtBegin)}</td>
                        <td className={`p-3 text-right border-r text-yellow-800 font-semibold ${getCellHighlightClass(index, 7 + offset) || 'bg-yellow-50/30'}`}>{formatCurrency(row.longTermDebtEnd)}</td>
                        <td className={`p-3 text-right border-r text-indigo-800 ${getCellHighlightClass(index, 8 + offset) || 'bg-indigo-50/30'}`}>{formatCurrency(row.shortTermDebtBegin)}</td>
                        <td className={`p-3 text-right text-indigo-800 font-semibold ${getCellHighlightClass(index, 9 + offset) || 'bg-indigo-50/30'}`}>{formatCurrency(row.shortTermDebtEnd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderNetWorthTab = () => {
    const spouseHeader = associatedClient ? `${associatedClient.first_name || 'Spouse'} Age` : null;
    const offset = associatedClient ? 1 : 0;
    return (
      <div className="space-y-4">
        {netWorthData.length > 0 && (
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent>
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left p-3 font-semibold border-r cursor-pointer" onDoubleClick={() => handleColumnHighlight(0)}>Year</th>
                      <th className="text-left p-3 font-semibold border-r cursor-pointer" onDoubleClick={() => handleColumnHighlight(1)}>{primaryClient?.first_name ? `${primaryClient.first_name} Age` : 'Primary Age'}</th>
                      {associatedClient && (
                        <th className="text-left p-3 font-semibold border-r cursor-pointer" onDoubleClick={() => handleColumnHighlight(2)}>{spouseHeader}</th>
                      )}
                      <th className="text-right p-3 font-semibold border-r bg-blue-50 text-blue-800 cursor-pointer" onDoubleClick={() => handleColumnHighlight(2 + offset)}>Total Assets</th>
                      <th className="text-right p-3 font-semibold border-r bg-red-50 text-red-800 cursor-pointer" onDoubleClick={() => handleColumnHighlight(3 + offset)}>Total Liabilities</th>
                      <th className="text-right p-3 font-semibold border-r bg-green-50 text-green-800 cursor-pointer" onDoubleClick={() => handleColumnHighlight(4 + offset)}>Net Worth</th>
                      <th className="text-right p-3 font-semibold border-r bg-purple-50 text-purple-800 cursor-pointer" onDoubleClick={() => handleColumnHighlight(5 + offset)}>Inflation Adjusted Net Worth</th>
                      <th className="text-right p-3 font-semibold bg-orange-50 text-orange-800 cursor-pointer" onDoubleClick={() => handleColumnHighlight(6 + offset)}>Actual Net Worth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {netWorthData.map((row, index) => (
                      <tr key={index} className="border-b hover:bg-slate-50">
                        <td className={`p-3 font-medium border-r cursor-pointer ${getCellHighlightClass(index, 0)}`} onDoubleClick={() => handleRowHighlight(index)}>{row.year}</td>
                        <td className={`p-3 font-medium border-r ${getCellHighlightClass(index, 1)}`}>{row.primaryAge}</td>
                        {associatedClient && (
                          <td className={`p-3 font-medium border-r ${getCellHighlightClass(index, 2)}`}>{row.spouseAge !== null ? row.spouseAge : '-'}</td>
                        )}
                        <td className={`p-3 text-right border-r text-blue-800 font-semibold ${getCellHighlightClass(index, 2 + offset) || 'bg-blue-50/30'}`}>{formatCurrency(row.totalAssets)}</td>
                        <td className={`p-3 text-right border-r text-red-800 font-semibold ${getCellHighlightClass(index, 3 + offset) || 'bg-red-50/30'}`}>{formatCurrency(row.totalLiabilities)}</td>
                        <td className={`p-3 text-right border-r text-green-800 font-bold ${getCellHighlightClass(index, 4 + offset) || 'bg-green-50/30'}`}>{formatCurrency(row.netWorth)}</td>
                        <td className={`p-3 text-right border-r text-purple-800 font-semibold ${getCellHighlightClass(index, 5 + offset) || 'bg-purple-50/30'}`}>{formatCurrency(row.inflationAdjustedNetWorth)}</td>
                        <td className={`p-3 text-right text-orange-800 ${getCellHighlightClass(index, 6 + offset) || 'bg-orange-50/30'}`}>
                          {isViewer ? (
                            <span className="font-semibold">{row.actualNetWorth !== null ? formatCurrency(row.actualNetWorth) : '-'}</span>
                          ) : (
                            <input 
                              type="text" 
                              className="w-full text-right bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-orange-300 rounded px-2 py-1 font-semibold" 
                              placeholder="Optional" 
                              value={row.actualNetWorth !== null ? formatCurrency(row.actualNetWorth) : ''} 
                              onChange={(e) => handleActualNetWorthChange(index, e.target.value)} 
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderEstateTab = () => {
    const spouseHeader = associatedClient ? `${associatedClient.first_name || 'Spouse'} Age` : null;
    const offset = associatedClient ? 1 : 0;
    return (
      <div className="space-y-4">
        {estateData.length > 0 && (
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
             <CardHeader>
              <CardTitle>Estate Projection</CardTitle>
              <CardDescription>Estimates potential taxes and the final value of the estate over time.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-3 font-semibold border-r cursor-pointer" onDoubleClick={() => handleColumnHighlight(0)}>Year</th>
                    <th className="text-left p-3 font-semibold border-r cursor-pointer" onDoubleClick={() => handleColumnHighlight(1)}>{primaryClient?.first_name ? `${primaryClient.first_name} Age` : 'Primary Age'}</th>
                    {associatedClient && (
                      <th className="text-left p-3 font-semibold border-r cursor-pointer" onDoubleClick={() => handleColumnHighlight(2)}>{spouseHeader}</th>
                    )}
                    <th className="text-right p-3 font-semibold border-r bg-blue-50 text-blue-800 cursor-pointer" onDoubleClick={() => handleColumnHighlight(2 + offset)}>Gross Estate Value</th>
                    <th className="text-right p-3 font-semibold border-r bg-red-50 text-red-800 cursor-pointer" onDoubleClick={() => handleColumnHighlight(3 + offset)}>Probate Estimate</th>
                    <th className="text-right p-3 font-semibold border-r bg-orange-50 text-orange-800 cursor-pointer" onDoubleClick={() => handleColumnHighlight(4 + offset)}>Final Tax on Registered Assets</th>
                    <th className="text-right p-3 font-semibold bg-green-50 text-green-800 cursor-pointer" onDoubleClick={() => handleColumnHighlight(5 + offset)}>Final Estate Value (After-Tax)</th>
                  </tr>
                </thead>
                <tbody>
                  {estateData.map((row, index) => (
                    <tr key={index} className="border-b hover:bg-slate-50">
                      <td className={`p-3 font-medium border-r cursor-pointer ${getCellHighlightClass(index, 0)}`} onDoubleClick={() => handleRowHighlight(index)}>{row.year}</td>
                      <td className={`p-3 font-medium border-r ${getCellHighlightClass(index, 1)}`}>{row.primaryAge}</td>
                      {associatedClient && (
                        <td className={`p-3 font-medium border-r ${getCellHighlightClass(index, 2)}`}>{row.spouseAge !== null ? row.spouseAge : '-'}</td>
                      )}
                      <td className={`p-3 text-right border-r text-blue-800 font-semibold ${getCellHighlightClass(index, 2 + offset) || 'bg-blue-50/30'}`}>{formatCurrency(row.grossEstateValue)}</td>
                      <td className={`p-3 text-right border-r text-red-800 font-semibold ${getCellHighlightClass(index, 3 + offset) || 'bg-red-50/30'}`}>{formatCurrency(row.probateEstimate)}</td>
                      <td className={`p-3 text-right border-r text-orange-800 font-semibold ${getCellHighlightClass(index, 4 + offset) || 'bg-orange-50/30'}`}>{formatCurrency(row.finalTaxOnRegisteredAssets)}</td>
                      <td className={`p-3 text-right border-r text-green-800 font-bold ${getCellHighlightClass(index, 5 + offset) || 'bg-green-50/30'}`}>{formatCurrency(row.finalEstateValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-600" />
                Integrated Financial Projection
              </CardTitle>
              {!isViewer && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleRecalculateProjections}
                    disabled={isRecalculating || isLoadingData || formData.client_ids.length === 0 || !formData.primary_client_age}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isRecalculating || isLoadingData ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Recalculating...
                      </>
                    ) : (
                      <>
                        <Calculator className="w-4 h-4 mr-2" />
                        Recalculate Projections
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleClearFields}>
                    <Undo2 className="w-4 h-4 mr-2" />
                    Clear Fields
                  </Button>
                </div>
              )}
            </div>
          <CardDescription>Comprehensive household financial projection combining multiple income sources and assets.</CardDescription>
        </CardHeader>
      </Card>

      {/* This div constrains the width of the data entry cards */}
      <div className="max-w-5xl mx-auto space-y-6">
        <fieldset disabled={isViewer} className="space-y-6">
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Household Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <Label htmlFor="calculator_name">Calculator Name</Label>
                  <Input
                    id="calculator_name"
                    value={formData.calculator_name}
                    onChange={(e) => handleFormDataChange('calculator_name', e.target.value)}
                    placeholder="Enter calculator name"
                    disabled={isViewer}
                  />
                </div>
                <div className="min-w-0">
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">Associated Clients</Label>
                  <MultiClientSelector
                    clients={clients}
                    selectedClientIds={formData.client_ids}
                    onSelectionChange={(selectedIds) => {
                      handleFormDataChange('client_ids', selectedIds);
                      handleFormDataChange('goal_id', '');
                    }}
                    disabled={isViewer}
                    placeholder="Select clients..."
                  />
                </div>
              </div>

              {formData.client_ids && formData.client_ids.length > 0 && (
                <div className="mt-4 min-w-0">
                  <Label htmlFor="goal_id">Linked Goal (Optional)</Label>
                  <Select
                    value={formData.goal_id || ''}
                    onValueChange={(value) => handleFormDataChange('goal_id', value)}
                    disabled={isViewer}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a goal (optional)" />
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
              )}
              {formData.client_ids.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-600 mt-4">
                  <Users className="w-4 h-4" />
                  <span>Calculating for: <strong>{getHouseholdName()}</strong></span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Basic Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Basic Parameters</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <Label htmlFor="primary_client_age">Primary Client Age</Label>
                    <Input
                      id="primary_client_age"
                      type="number"
                      value={formData.primary_client_age}
                      onChange={(e) => handleFormDataChange('primary_client_age', e.target.value)}
                      placeholder="65"
                      disabled={formData.client_ids.length > 0 || isViewer}
                    />
                  </div>
                  <div>
                    <Label htmlFor="projection_years">Projection Years</Label>
                    <Input
                      id="projection_years"
                      type="number"
                      value={formData.projection_years}
                      onChange={(e) => handleFormDataChange('projection_years', e.target.value)}
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="target_income">Target Income (Today's $)</Label>
                    <Input
                      id="target_income"
                      type="text"
                      value={displayValues.target_income || ''}
                      onChange={(e) => handleDisplayChange('target_income', e.target.value)}
                      onBlur={() => handleBlur('target_income', 'currency')}
                      onFocus={() => handleFocus('target_income')}
                      placeholder="$200,000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="inflation_rate">Inflation Rate (%)</Label>
                    <Input
                      id="inflation_rate"
                      type="text"
                      value={displayValues.inflation_rate || ''}
                      onChange={(e) => handleDisplayChange('inflation_rate', e.target.value)}
                      onBlur={() => handleBlur('inflation_rate', 'percentage')}
                      onFocus={() => handleFocus('inflation_rate')}
                      placeholder="2.00%"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1">
                      <Label htmlFor="average_tax_rate">Average Tax Rate (%)</Label>
                      <Input
                        id="average_tax_rate"
                        type="text"
                        value={displayValues.average_tax_rate || ''}
                        onChange={(e) => handleDisplayChange('average_tax_rate', e.target.value)}
                        onBlur={() => handleBlur('average_tax_rate', 'percentage')}
                        onFocus={() => handleFocus('average_tax_rate')}
                        placeholder="25.00%"
                      />
                  </div>
                  <div className="md:col-span-1">
                      <Label htmlFor="client_mtr">Client MTR (%)</Label>
                      <Input
                        id="client_mtr"
                        type="text"
                        value={displayValues.client_mtr || ''}
                        onChange={(e) => handleDisplayChange('client_mtr', e.target.value)}
                        onBlur={() => handleBlur('client_mtr', 'percentage')}
                        onFocus={() => handleFocus('client_mtr')}
                        placeholder="40.00%"
                      />
                  </div>
                  <div className="md:col-span-1">
                      <Label htmlFor="spouse_mtr">Spouse MTR (%)</Label>
                      <Input
                        id="spouse_mtr"
                        type="text"
                        value={displayValues.spouse_mtr || ''}
                        onChange={(e) => handleDisplayChange('spouse_mtr', e.target.value)}
                        onBlur={() => handleBlur('spouse_mtr', 'percentage')}
                        onFocus={() => handleFocus('spouse_mtr')}
                        disabled={!associatedClient}
                        placeholder="40.00%"
                      />
                  </div>
                  <div className="md:col-span-1">
                      <Label htmlFor="final_year_tax_rate">Final Year Tax Rate (%)</Label>
                      <Input
                        id="final_year_tax_rate"
                        type="text"
                        value={displayValues.final_year_tax_rate || ''}
                        onChange={(e) => handleDisplayChange('final_year_tax_rate', e.target.value)}
                        onBlur={() => handleBlur('final_year_tax_rate', 'percentage')}
                        onFocus={() => handleFocus('final_year_tax_rate')}
                        placeholder="50.00%"
                      />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {formData.client_ids.length > 0 && availableCalculators.length > 0 && (
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader><CardTitle>Select Calculators to Include</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableCalculators.map(calc => (
                    <div key={calc.id} className="flex items-center space-x-2 p-3 border rounded-lg min-w-0">
                      <input
                        type="checkbox"
                        id={`calc_${calc.id}`}
                        checked={formData.linked_calculator_ids.includes(calc.id)}
                        onChange={(e) => handleLinkedCalculatorsChange(
                          e.target.checked
                            ? [...formData.linked_calculator_ids, calc.id]
                            : formData.linked_calculator_ids.filter(id => id !== calc.id)
                        )}
                        className="rounded flex-shrink-0"
                      />
                      <label htmlFor={`calc_${calc.id}`} className="flex-1 min-w-0">
                        <div className="font-medium truncate">{calc.name}</div>
                        <div className="text-sm text-slate-500 capitalize truncate">
                          {calc.calculator_type.replace('_', ' ')} ({getClientName(calc.client_id)})
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {projectionData.length === 0 && formData.client_ids.length > 0 && formData.linked_calculator_ids.length === 0 && (
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="text-center py-12">
                <Calculator className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No Calculators Selected</h3>
                <p className="text-slate-500">Select one or more calculators above to generate comprehensive financial projections.</p>
              </CardContent>
            </Card>
          )}
        </fieldset>
      </div>

      {/* The results table is outside the max-width div to allow it to be wider */}
      <fieldset disabled={isViewer}>
        {projectionData.length > 0 && (
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Financial Projections</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  onClick={() => setViewMode('table')}
                  size="sm"
                >
                  Table
                </Button>
                <Button
                  variant={viewMode === 'chart' ? 'default' : 'outline'}
                  onClick={() => setViewMode('chart')}
                  size="sm"
                >
                  Chart
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start rounded-none bg-slate-100 p-0">
                  <TabsTrigger value="income" className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />Income & Tax
                  </TabsTrigger>
                  <TabsTrigger value="assets" className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />Assets
                  </TabsTrigger>
                  <TabsTrigger value="liabilities" className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />Liabilities
                  </TabsTrigger>
                  <TabsTrigger value="networth" className="flex items-center gap-2">
                    <PieChart className="w-4 h-4" />Net Worth
                  </TabsTrigger>
                  <TabsTrigger value="estate" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />Estate
                  </TabsTrigger>
                </TabsList>

                <div className="p-4">
                  {viewMode === 'table' ? (
                    <>
                      <TabsContent value="income" className="mt-0 p-0">{renderIncomeTab()}</TabsContent>
                      <TabsContent value="assets" className="mt-0 p-0">{renderAssetsTab()}</TabsContent>
                      <TabsContent value="liabilities" className="mt-0 p-0">{renderLiabilitiesTab()}</TabsContent>
                      <TabsContent value="networth" className="mt-0 p-0">{renderNetWorthTab()}</TabsContent>
                      <TabsContent value="estate" className="mt-0 p-0">{renderEstateTab()}</TabsContent>
                    </>
                  ) : (
                    <div className="p-0">
                      <MainViewCharts
                        activeTab={activeTab}
                        projectionData={projectionData}
                        assetData={assetData}
                        liabilityData={liabilityData}
                        netWorthData={netWorthData}
                        estateData={estateData}
                      />
                    </div>
                  )}
                </div>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </fieldset>

      {/* Giuseppe AI Optimizer moved below the table */}
      <div className="max-w-5xl mx-auto space-y-6">
        <fieldset disabled={isViewer}>
          <GiuseppeAIOptimizer
            calculatorName="Main View Calculator"
            calculatorData={{
              inputs: formData,
              incomeItems: incomeStreams,
              expenseItems: [],
              lumpSums: {},
              summary: null,
              projection: projectionData,
              netWorthData: netWorthData,
            }}
          />
        </fieldset>
      </div>
    </div>
  );
}

export default forwardRef(MainViewCalculator);
