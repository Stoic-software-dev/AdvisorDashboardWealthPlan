
import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Home, Calculator, User, Undo2, Table, TrendingUp, Download, Loader2 } from "lucide-react";
import { differenceInYears } from "date-fns";
import { InvokeLLM } from "@/api/integrations";
import { NetWorthStatement, Asset } from "@/api/entities";
import MultiClientSelector from '../shared/MultiClientSelector';
import GiuseppeAIOptimizer from '../shared/GiuseppeAIOptimizer';

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

// Utility functions for formatting and parsing
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

// MODIFIED emptyFormData to add calculator_name and client_ids, keeping other fields for functionality
const emptyFormData = {
  calculator_name: "", // ADDED
  client_ids: [], // CHANGED from client_id
  goal_id: "",
  current_age: "",
  property_name: "Principal Residence 1",
  ownership_percentage: 0,
  start_value: 0,
  growth_rate: 0,
  acb: 0,
  is_principal_residence: true,
  gross_rent: 0,
  rent_index_rate: 0,
  rental_expenses: 0,
  expenses_index_rate: 0,
  marginal_tax_rate: 0,
  capital_gains_inclusion_rate: 50,
  mortgage_outstanding: 0,
  time_period: 50,
  disposition_year: ""
};

// MODIFIED defaultFormData for consistency with new emptyFormData
const defaultFormData = {
  calculator_name: "Real Estate Property", // Added default name
  client_ids: [], // Changed from client_id
  goal_id: "",
  current_age: 65,
  property_name: "Principal Residence 1",
  ownership_percentage: 50,
  start_value: 500000,
  growth_rate: 2.00,
  acb: 0,
  is_principal_residence: true,
  gross_rent: 0,
  rent_index_rate: 2.00,
  rental_expenses: 0,
  expenses_index_rate: 2.00,
  marginal_tax_rate: 20.05,
  capital_gains_inclusion_rate: 50,
  mortgage_outstanding: 0,
  time_period: 50,
  disposition_year: ""
};

// Changed prop name from clientId to preselectedClientId
function RealEstateCalculator({ clients, goals, portfolios, isLoading, preselectedClientId, initialState, isViewer = false, onNameChange }, ref) {
  const [formData, setFormData] = useState({
    ...emptyFormData,
    client_ids: preselectedClientId ? [preselectedClientId] : [] // Use preselectedClientId for initial state
  });

  const [results, setResults] = useState(null);
  const [projectionData, setProjectionData] = useState([]);
  const [displayValues, setDisplayValues] = useState({});
  const [viewMode, setViewMode] = useState("chart");
  const [taxBrackets, setTaxBrackets] = useState(ONTARIO_TAX_BRACKETS_2024);
  const [isFetchingTaxRates, setIsFetchingTaxRates] = useState(false);
  const [saleProceeds, setSaleProceeds] = useState({});
  const [displaySaleProceeds, setDisplaySaleProceeds] = useState({});
  const [manualPurchases, setManualPurchases] = useState({});
  const [displayManualPurchases, setDisplayManualPurchases] = useState({});
  const [manualMortgage, setManualMortgage] = useState({});
  const [displayManualMortgage, setDisplayManualMortgage] = useState({});

  // New state for Net Worth Statement assets
  const [netWorthAssets, setNetWorthAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const [highlight, setHighlight] = useState({ type: null, index: null, cell: null });

  useImperativeHandle(ref, () => ({
    getState: () => ({
      formData,
      saleProceeds,
      manualPurchases,
      manualMortgage,
    })
  }));

  useEffect(() => {
    if (initialState?.formData) {
      // Handle both old client_id format and new client_ids format
      const clientIds = initialState.formData.client_ids ||
                       (initialState.formData.client_id ? [initialState.formData.client_id] : []) ||
                       (preselectedClientId ? [preselectedClientId] : []);
      
      const safeFormData = {
        ...emptyFormData,
        ...initialState.formData,
        client_ids: clientIds,
      };
      setFormData(safeFormData);

      const savedSaleProceeds = initialState.saleProceeds || {};
      const savedManualPurchases = initialState.manualPurchases || {};
      const savedManualMortgage = initialState.manualMortgage || {};

      setSaleProceeds(savedSaleProceeds);
      setManualPurchases(savedManualPurchases);
      setManualMortgage(savedManualMortgage);

      const initialDisplaySP = {};
      Object.keys(savedSaleProceeds).forEach(key => { initialDisplaySP[key] = formatCurrency(savedSaleProceeds[key]); });
      setDisplaySaleProceeds(initialDisplaySP);

      const initialDisplayMP = {};
      Object.keys(savedManualPurchases).forEach(key => { initialDisplayMP[key] = formatCurrency(savedManualPurchases[key]); });
      setDisplayManualPurchases(initialDisplayMP);

      const initialDisplayMM = {};
      Object.keys(savedManualMortgage).forEach(key => { initialDisplayMM[key] = formatCurrency(savedManualMortgage[key]); });
      setDisplayManualMortgage(initialDisplayMM);

      // Trigger onNameChange for initial load if a calculator_name exists
      if (initialState.formData.calculator_name && onNameChange) {
        onNameChange(initialState.formData.calculator_name);
      }

    } else {
      setFormData({
        ...emptyFormData,
        client_ids: preselectedClientId ? [preselectedClientId] : [] // Use preselectedClientId here for default
      });
      setResults(null); // Clear results
      setProjectionData([]); // Clear projection data
      setSaleProceeds({});
      setDisplaySaleProceeds({});
      setManualPurchases({});
      setDisplayManualPurchases({});
      setManualMortgage({});
      setDisplayManualMortgage({});
      setDisplayValues({}); // Recalculated by useEffect on formData change
    }
  }, [initialState, preselectedClientId, onNameChange]);

  const handleFormDataChange = useCallback((field, value) => {
    if (field === 'calculator_name' && onNameChange) {
      onNameChange(value);
    }
    setFormData(prev => ({
      ...prev,
      [field]: value === null || value === undefined || value === "null" ? "" : value
    }));
  }, [onNameChange]);

  // Auto-set current age based on primary client
  useEffect(() => {
    const primaryClientId = formData.client_ids?.[0]; // Get the first client ID
    if (primaryClientId && clients) {
      const client = clients.find(c => c.id === primaryClientId);
      if (client && client.date_of_birth) {
        const age = differenceInYears(new Date(), new Date(client.date_of_birth));
        handleFormDataChange('current_age', age);
      } else {
        handleFormDataChange('current_age', emptyFormData.current_age); // Reset to empty or default
      }
    } else {
      handleFormDataChange('current_age', emptyFormData.current_age); // Reset if no client selected
    }
  }, [formData.client_ids, clients, handleFormDataChange]);

  // Effect to keep displayValues in sync with formData
  useEffect(() => {
    setDisplayValues({
      ownership_percentage: formatPercentage(formData.ownership_percentage),
      start_value: formatCurrency(formData.start_value),
      growth_rate: formatPercentage(formData.growth_rate),
      acb: formatCurrency(formData.acb),
      gross_rent: formatCurrency(formData.gross_rent),
      rent_index_rate: formatPercentage(formData.rent_index_rate),
      rental_expenses: formatCurrency(formData.rental_expenses),
      expenses_index_rate: formatPercentage(formData.expenses_index_rate),
      mortgage_outstanding: formatCurrency(formData.mortgage_outstanding),
      capital_gains_inclusion_rate: formatPercentage(formData.capital_gains_inclusion_rate)
    });
  }, [formData]);

  // Get goals for the selected clients
  const clientGoals = formData.client_ids && formData.client_ids.length > 0
    ? (goals || []).filter(goal => {
        // Goals can have client_id (single) or client_ids (array)
        const goalClientIds = goal.client_ids || (goal.client_id ? [goal.client_id] : []);
        // Check if any of the selected form client_ids are in the goal's associated client_ids
        return formData.client_ids.some(selectedId => goalClientIds.includes(selectedId));
      })
    : [];

  // New useEffect to load Net Worth Statement assets when client changes
  useEffect(() => {
    const primaryClientId = formData.client_ids?.[0];
    if (primaryClientId) {
      loadNetWorthAssets(primaryClientId);
    } else {
      setNetWorthAssets([]);
    }
  }, [formData.client_ids]); // Use formData.client_ids to trigger when primary client changes

  const loadNetWorthAssets = async (clientId) => {
    if (!clientId) return;

    setLoadingAssets(true);
    try {
      // Get the most recent Net Worth Statement for this client
      // Assuming NetWorthStatement.filter takes client_ids, sort field, and limit
      const statements = await NetWorthStatement.filter({ client_ids: [clientId] }, '-statement_date', 1);

      if (statements && statements.length > 0) {
        const latestStatement = statements[0];

        // Get assets from the latest statement
        const assets = await Asset.filter({ statement_id: latestStatement.id });

        // Filter for real estate assets only
        const realEstateAssets = (assets || []).filter(asset =>
          ['Principal Residence', 'Investment Real Estate', 'Other Real Estate'].includes(asset.asset_category)
        );

        setNetWorthAssets(realEstateAssets);
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

  const handleAssetSelection = (assetId) => {
    if (!assetId || assetId === 'none') {
      return;
    }

    const selectedAsset = netWorthAssets.find(asset => asset.id === assetId);
    if (selectedAsset) {
      const newValue = selectedAsset.asset_value || 0;
      handleFormDataChange('start_value', newValue); // Use existing handler

      // Also set the property name if available
      if (selectedAsset.asset_name) {
        handleFormDataChange('property_name', selectedAsset.asset_name);
      }

      // Set as principal residence if it's categorized as such
      if (selectedAsset.asset_category === 'Principal Residence') {
        handleFormDataChange('is_principal_residence', true);
      } else {
        handleFormDataChange('is_principal_residence', false);
      }
    }
  };

  const handleDisplayChange = (field, value) => {
    setDisplayValues(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field, type) => {
    const rawValue = parseValue(displayValues[field]);
    const parsed = parseFloat(rawValue);
    const finalValue = !isNaN(parsed) ? parsed : (rawValue === '' ? '' : 0);

    handleFormDataChange(field, finalValue);

    if (type === 'currency') setDisplayValues(prev => ({ ...prev, [field]: formatCurrency(finalValue) }));
    if (type === 'percentage') setDisplayValues(prev => ({ ...prev, [field]: formatPercentage(finalValue) }));
  };

  const handleFocus = (field) => {
    setDisplayValues(prev => ({ ...prev, [field]: parseValue(prev[field]) }));
  };

  const handleClearFields = () => {
    setFormData({
      ...emptyFormData,
      client_ids: preselectedClientId ? [preselectedClientId] : [] // Use preselectedClientId here
    });
    setResults(null);
    setProjectionData([]);
    setSaleProceeds({});
    setDisplaySaleProceeds({});
    setManualPurchases({});
    setDisplayManualPurchases({});
    setManualMortgage({});
    setDisplayManualMortgage({});
    setDisplayValues({}); // Recalculated by useEffect on formData change
    if (onNameChange) { // Reset name for external control
      onNameChange("");
    }
  };

  const handleSaleProceedsChange = (yearIndex, value) => {
    setSaleProceeds(prev => {
      const newProceeds = { ...prev };
      const parsedValue = parseFloat(parseValue(String(value))); // Ensure value is a string before parsing
      if (!isNaN(parsedValue) && parsedValue > 0) {
        newProceeds[yearIndex] = parsedValue;
      } else {
        delete newProceeds[yearIndex];
      }
      return newProceeds;
    });
  };

  const handleSaleProceedsDisplayChange = (yearIndex, value) => {
    setDisplaySaleProceeds(prev => ({ ...prev, [yearIndex]: value }));
  };

  const handleSaleProceedsBlur = (yearIndex) => {
    const rawValue = parseValue(displaySaleProceeds[yearIndex]);
    const parsed = parseFloat(rawValue);
    const finalValue = !isNaN(parsed) && parsed > 0 ? parsed : null;

    handleSaleProceedsChange(yearIndex, finalValue);

    setDisplaySaleProceeds(prev => ({ ...prev, [yearIndex]: finalValue ? formatCurrency(finalValue) : '' }));
  };

  const handleSaleProceedsFocus = (yearIndex) => {
    setDisplaySaleProceeds(prev => ({ ...prev, [yearIndex]: parseValue(prev[yearIndex]) }));
  };

  const handleManualPurchaseChange = (yearIndex, value) => {
    setManualPurchases(prev => {
      const newPurchases = { ...prev };
      const parsedValue = parseFloat(parseValue(String(value)));
      if (!isNaN(parsedValue)) {
        newPurchases[yearIndex] = parsedValue;
      } else {
        delete newPurchases[yearIndex];
      }
      return newPurchases;
    });
  };

  const handleManualPurchaseDisplayChange = (yearIndex, value) => {
    setDisplayManualPurchases(prev => ({ ...prev, [yearIndex]: value }));
  };

  const handleManualPurchaseBlur = (yearIndex) => {
    const rawValue = parseValue(displayManualPurchases[yearIndex]);
    const parsed = parseFloat(rawValue);
    const finalValue = !isNaN(parsed) ? parsed : null;

    handleManualPurchaseChange(yearIndex, finalValue);
    setDisplayManualPurchases(prev => ({ ...prev, [yearIndex]: finalValue ? formatCurrency(finalValue) : '' }));
  };

  const handleManualPurchaseFocus = (yearIndex) => {
    setDisplayManualPurchases(prev => ({ ...prev, [yearIndex]: parseValue(prev[yearIndex]) }));
  };

  const handleManualMortgageChange = (yearIndex, value) => {
    setManualMortgage(prev => {
      const newMortgages = { ...prev };
      const parsedValue = parseFloat(parseValue(String(value)));
      if (!isNaN(parsedValue)) {
        newMortgages[yearIndex] = parsedValue;
      } else {
        delete newMortgages[yearIndex];
      }
      return newMortgages;
    });
  };

  const handleManualMortgageDisplayChange = (yearIndex, value) => {
    setDisplayManualMortgage(prev => ({ ...prev, [yearIndex]: value }));
  };

  const handleManualMortgageBlur = (yearIndex) => {
    const rawValue = parseValue(displayManualMortgage[yearIndex]);
    const parsed = parseFloat(rawValue);
    const finalValue = !isNaN(parsed) ? parsed : null;

    handleManualMortgageChange(yearIndex, finalValue);
    setDisplayManualMortgage(prev => ({ ...prev, [yearIndex]: finalValue ? formatCurrency(finalValue) : '' }));
  };

  const handleManualMortgageFocus = (yearIndex) => {
    setDisplayManualMortgage(prev => ({ ...prev, [yearIndex]: parseValue(prev[yearIndex]) }));
  };

  // Highlight functions
  const handleHighlight = (type, index, cell = null) => {
    if (isViewer) return; // Disable highlighting in viewer mode
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

  const fetchCurrentTaxRates = async () => {
    setIsFetchingTaxRates(true);
    try {
      const currentYear = new Date().getFullYear();
      const response = await InvokeLLM({
        prompt: `What are the current combined federal and Ontario marginal tax rates for ${currentYear}? Provide the tax brackets with income thresholds and corresponding rates.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            tax_brackets: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  rate: { type: "number", description: "Tax rate as percentage" },
                  threshold: { type: "number", description: "Income threshold for this bracket" },
                  label: { type: "string", description: "Descriptive label for the bracket" }
                }
              }
            },
            year: { type: "number", description: "Tax year these rates apply to" }
          },
          required: ["tax_brackets", "year"]
        }
      });

      if (response.tax_brackets && response.tax_brackets.length > 0) {
        const formattedBrackets = response.tax_brackets.map(bracket => ({
          label: bracket.label || `${bracket.rate.toFixed(2)}% (Income ${bracket.threshold ? `up to $${bracket.threshold.toLocaleString()}` : 'threshold not specified'})`,
          value: bracket.rate
        }));
        setTaxBrackets(formattedBrackets);
      } else {
        console.warn("InvokeLLM returned incomplete tax bracket data.", response);
        alert("Could not fetch the latest tax rates completely. Using existing values.");
      }
    } catch (error) {
      console.error("Failed to fetch current tax rates:", error);
      alert("Could not fetch the latest tax rates. Using default values.");
    }
    setIsFetchingTaxRates(false);
  };

  const calculateRealEstate = useCallback(() => {
    // Convert to numeric values, treating empty strings as 0 where appropriate
    const numericStartValue = parseFloat(formData.start_value);
    const numericCurrentAge = parseFloat(formData.current_age);
    const numericTimePeriod = parseFloat(formData.time_period);

    // Condition to display a single row if essential inputs are missing/invalid
    if (
      (isNaN(numericStartValue) && formData.start_value !== 0) || // Check if start_value is NaN and not legitimately 0
      isNaN(numericCurrentAge) ||
      isNaN(numericTimePeriod) || numericTimePeriod <= 0
    ) {
        setProjectionData([]);
        return;
    }

    const actualNumericStartValue = numericStartValue || 0; // Use 0 if input was valid but parsed to NaN for empty string etc.
    const actualNumericCurrentAge = numericCurrentAge || 0;
    const actualNumericTimePeriod = numericTimePeriod || 0;

    const numericGrowthRate = parseFloat(formData.growth_rate) || 0;
    const numericACB = parseFloat(formData.acb) || 0;
    const numericGrossRent = parseFloat(formData.gross_rent) || 0;
    const numericRentIndexRate = parseFloat(formData.rent_index_rate) || 0;
    const numericRentalExpenses = parseFloat(formData.rental_expenses) || 0;
    const numericExpensesIndexRate = parseFloat(formData.expenses_index_rate) || 0;
    const numericMarginalTaxRate = parseFloat(formData.marginal_tax_rate) || 0;
    const numericCapitalGainsRate = parseFloat(formData.capital_gains_inclusion_rate) || 50;
    const initialNumericMortgageOutstanding = parseFloat(formData.mortgage_outstanding) || 0;
    const numericOwnershipPercentage = parseFloat(formData.ownership_percentage) || 100;

    let projections = [];
    let runningValue = actualNumericStartValue; // This will track the property value for the start of the next year
    const currentYear = new Date().getFullYear();
    const initialPurchaseValue = numericACB || actualNumericStartValue;

    let propertyHasBeenSold = false; // Flag to ensure no further growth/income after sale

    // Loop for projection years (Year 0 to Time Period)
    for (let yearIndex = 0; yearIndex <= actualNumericTimePeriod; yearIndex++) {
      const year = currentYear + yearIndex;
      const age = actualNumericCurrentAge + yearIndex;

      const startingValueForThisYear = (yearIndex === 0) ? actualNumericStartValue : runningValue;

      // Determine values for current year, allowing manual overrides from any year
      const growthRateForYear = numericGrowthRate;

      let purchaseForYear = (yearIndex === 0) ? initialPurchaseValue : (projections[yearIndex - 1]?.purchase ?? initialPurchaseValue);
      if (manualPurchases[yearIndex] !== undefined && manualPurchases[yearIndex] !== null) {
          purchaseForYear = manualPurchases[yearIndex];
      }

      let mortgageForYear = (yearIndex === 0) ? initialNumericMortgageOutstanding : (projections[yearIndex - 1]?.mortgageOutstanding ?? initialNumericMortgageOutstanding);
      if (manualMortgage[yearIndex] !== undefined && manualMortgage[yearIndex] !== null) {
          mortgageForYear = manualMortgage[yearIndex];
      }

      const saleProceedsForYear = saleProceeds[yearIndex] || 0;
      const isDisposition = saleProceedsForYear > 0;

      const indexedGrossRent = numericGrossRent * Math.pow(1 + numericRentIndexRate / 100, yearIndex);
      const indexedRentalExpenses = numericRentalExpenses * Math.pow(1 + numericExpensesIndexRate / 100, yearIndex);
      const netRent = indexedGrossRent - indexedRentalExpenses;
      const taxOnRent = netRent > 0 ? netRent * (numericMarginalTaxRate / 100) : 0;

      let endValueForThisYear = startingValueForThisYear;
      let annualGrowth = 0;
      let capitalGainLoss = 0;
      let taxableGain = 0;
      let taxPayableOnGain = 0;
      let equityRealized = 0;

      if (!propertyHasBeenSold) {
          annualGrowth = startingValueForThisYear * (growthRateForYear / 100);
          endValueForThisYear += annualGrowth;

          if (isDisposition) {
              capitalGainLoss = saleProceedsForYear - purchaseForYear;
              if (!formData.is_principal_residence) {
                  taxableGain = capitalGainLoss * (numericCapitalGainsRate / 100);
                  taxPayableOnGain = taxableGain * (numericMarginalTaxRate / 100);
              }
              equityRealized = saleProceedsForYear - mortgageForYear;
              endValueForThisYear = 0; // Property is sold
              propertyHasBeenSold = true;
          }
      } else {
          endValueForThisYear = 0; // Stays 0 after being sold
      }

      runningValue = endValueForThisYear;

      projections.push({
          year,
          age,
          startingValue: Math.round(startingValueForThisYear),
          growthRate: growthRateForYear,
          grossRent: propertyHasBeenSold && !isDisposition ? 0 : Math.round(indexedGrossRent),
          rentalExpenses: propertyHasBeenSold && !isDisposition ? 0 : Math.round(indexedRentalExpenses),
          netRent: propertyHasBeenSold && !isDisposition ? 0 : Math.round(netRent),
          saleProceeds: Math.round(saleProceedsForYear),
          purchase: Math.round(purchaseForYear),
          capitalGainLoss: Math.round(capitalGainLoss),
          taxableGain: Math.round(taxableGain),
          marginalTaxRate: numericMarginalTaxRate,
          taxPayableOnRent: propertyHasBeenSold && !isDisposition ? 0 : Math.round(taxOnRent),
          taxPayableOnGain: Math.round(taxPayableOnGain),
          endValue: Math.round(endValueForThisYear),
          gainLossDisposal: Math.round(capitalGainLoss),
          mortgageOutstanding: Math.round(mortgageForYear),
          equityRealized: Math.round(equityRealized),
      });

      // If the property is sold and we're not in the disposition year, stop further projections.
      // This logic is implicitly handled by zeroing values, but we could break if needed.
    }

    // --- Final Summary Calculations ---
    let totalAppreciation = 0;
    let cumulativeRentalIncome = 0;
    let cumulativeTaxPaid = 0;
    let finalEquityResult = 0;
    let finalValueResult = 0;
    let effectiveYearsForReturn = 0;
    let valueForAnnualizedReturn = 0;

    // Find the first sale event to determine total appreciation and effective time period
    let firstSaleEvent = null;
    for (let i = 0; i < projections.length; i++) {
        if (projections[i].saleProceeds > 0 && projections[i].equityRealized > 0) { // Check saleProceeds and equityRealized to confirm a disposition
            firstSaleEvent = projections[i];
            break;
        }
    }

    if (firstSaleEvent) {
        totalAppreciation = firstSaleEvent.saleProceeds - actualNumericStartValue;
        finalValueResult = 0; // Property is sold, so its "final" value in the projection is 0
        finalEquityResult = 0; // Equity realized at sale, then 0 for the future
        effectiveYearsForReturn = firstSaleEvent.year - currentYear;
        valueForAnnualizedReturn = firstSaleEvent.saleProceeds;
    } else {
        // If no sale, use the last projected year's values
        const lastProjection = projections[projections.length - 1];
        totalAppreciation = lastProjection.endValue - actualNumericStartValue;
        finalValueResult = lastProjection.endValue;
        // Recalculate equity based on endValue if no disposition occurred, preserving original summary functionality
        finalEquityResult = Math.round((lastProjection.endValue - initialNumericMortgageOutstanding) * (numericOwnershipPercentage / 100));
        effectiveYearsForReturn = actualNumericTimePeriod;
        valueForAnnualizedReturn = lastProjection.endValue;
    }

    // Accumulate rental income and tax up to (and including) the year of sale, or for the full period
    for (let i = 0; i < projections.length; i++) {
        const p = projections[i];
        if (firstSaleEvent && p.year > firstSaleEvent.year) {
            break; // Stop accumulating after the year of the first sale
        }

        // Only accumulate rent/tax if property was held (startingValue > 0), or for year 0 (initial state)
        if (p.startingValue > 0 || (i === 0 && actualNumericStartValue > 0)) {
             cumulativeRentalIncome += p.netRent;
             cumulativeTaxPaid += p.taxPayableOnRent;
        }

        // Capital gains tax is a one-time event for the sale year
        if (p.saleProceeds > 0 && p.taxPayableOnGain > 0) { // Check saleProceeds for actual disposition
            cumulativeTaxPaid += p.taxPayableOnGain;
        }
    }

    let annualizedReturn = 0;
    if (actualNumericStartValue > 0 && effectiveYearsForReturn > 0) {
        annualizedReturn = Math.pow(valueForAnnualizedReturn / actualNumericStartValue, 1 / effectiveYearsForReturn) - 1;
    }

    setResults({
      finalValue: finalValueResult,
      totalAppreciation: Math.round(totalAppreciation),
      totalRentalIncome: Math.round(cumulativeRentalIncome),
      totalTaxPaid: Math.round(cumulativeTaxPaid),
      finalEquity: finalEquityResult,
      annualizedReturn: annualizedReturn
    });

    setProjectionData(projections);
  }, [formData, saleProceeds, manualPurchases, manualMortgage]);

  useEffect(() => {
    calculateRealEstate();
  }, [calculateRealEstate]);

  const getClientName = (client_ids) => {
    if (!clients || !client_ids || client_ids.length === 0) return '';
    if (client_ids.length > 1) return 'Multiple Clients';
    const client = clients.find(c => c.id === client_ids[0]);
    return client ? `${client.first_name} ${client.last_name}` : '';
  };

  const rentalIncomeProjection = generateRealEstateIncomeStream({ formData }, formData.calculator_name);

  return (
    <fieldset disabled={isViewer} className="space-y-6">
      {/* Header with Client Linking */}
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-orange-600" />
              Real Estate Calculator
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
             {/* Added Calculator Name Field */}
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
            {/* MultiClientSelector */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Associated Clients</Label>
              <MultiClientSelector
                clients={clients}
                selectedClientIds={formData.client_ids}
                onSelectionChange={(selectedIds) => {
                  handleFormDataChange('client_ids', selectedIds);
                  // Clear goal when clients change
                  handleFormDataChange('goal_id', '');
                }}
                disabled={isViewer}
                placeholder="Select clients..."
              />
            </div>
          </div>

          {formData.client_ids && formData.client_ids.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <User className="w-4 h-4" />
              <span>Calculating for: <strong>{getClientName(formData.client_ids)}</strong></span>
            </div>
          )}

          {formData.client_ids && formData.client_ids.length > 0 && (
            <div>
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
        </CardContent>
      </Card>

      {/* Input Parameters - Full Width Layout */}
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Real Estate Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information Row */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Client and Property Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div>
                <Label htmlFor="current_age">Current Age</Label>
                <Input
                  id="current_age"
                  type="number"
                  value={formData.current_age || ''}
                  onChange={(e) => handleFormDataChange("current_age", e.target.value)}
                  placeholder="65"
                  disabled={!!formData.client_ids.length || isViewer} // Disabled if any client_ids exist
                  readOnly={!!formData.client_ids.length} // ReadOnly if any client_ids exist
                />
              </div>
              <div>
                <Label htmlFor="property_name">Property Name</Label>
                <Input
                  id="property_name"
                  value={formData.property_name}
                  onChange={(e) => handleFormDataChange("property_name", e.target.value)}
                  placeholder="Principal Residence 1"
                />
              </div>
              <div>
                <Label htmlFor="ownership_percentage">% Owned</Label>
                <Input
                  id="ownership_percentage"
                  type="text"
                  value={displayValues.ownership_percentage || ''}
                  onChange={(e) => handleDisplayChange("ownership_percentage", e.target.value)}
                  onBlur={() => handleBlur("ownership_percentage", "percentage")}
                  onFocus={() => handleFocus("ownership_percentage")}
                  placeholder="50.00%"
                />
              </div>

              {/* Net Worth Statement Asset Selection - Fixed condition */}
              {formData.client_ids.length > 0 && ( // Changed condition to client_ids.length
                <div className="md:col-span-2"> {/* Span 2 columns if in a grid with 6 columns per row */}
                  <Label htmlFor="net_worth_asset" className="text-sm font-medium text-slate-700">
                    Select from Net Worth Statement
                  </Label>
                  <Select onValueChange={handleAssetSelection} disabled={loadingAssets || isViewer}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={loadingAssets ? "Loading assets..." : "Choose an asset or enter manually"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Manual Entry</SelectItem>
                      {netWorthAssets.length > 0 ? (
                        netWorthAssets.map(asset => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.asset_name} - {formatCurrency(asset.asset_value)} ({asset.asset_category})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no_assets" disabled>
                          No real estate assets found in Net Worth Statement
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="start_value">Start Value</Label>
                <Input
                  id="start_value"
                  type="text"
                  value={displayValues.start_value || ''}
                  onChange={(e) => handleDisplayChange("start_value", e.target.value)}
                  onBlur={() => handleBlur("start_value", "currency")}
                  onFocus={() => handleFocus("start_value")}
                  placeholder="$500,000"
                  disabled={isViewer} // Disable in viewer mode
                />
              </div>
              <div>
                <Label htmlFor="growth_rate">Growth Rate</Label>
                <Input
                  id="growth_rate"
                  type="text"
                  value={displayValues.growth_rate || ''}
                  onChange={(e) => handleDisplayChange("growth_rate", e.target.value)}
                  onBlur={() => handleBlur("growth_rate", "percentage")}
                  onFocus={() => handleFocus("growth_rate")}
                  placeholder="2.00%"
                />
              </div>
              <div>
                <Label htmlFor="time_period">Time Period (Years)</Label>
                <Input
                  id="time_period"
                  type="number"
                  value={formData.time_period || ''}
                  onChange={(e) => handleFormDataChange("time_period", e.target.value)}
                  placeholder="50"
                />
              </div>
            </div>
          </div>

          {/* Financial Details Row */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Financial Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-7 gap-4 items-end">
              <div>
                <Label htmlFor="acb">ACB (Adjusted Cost Base)</Label>
                <Input
                  id="acb"
                  type="text"
                  value={displayValues.acb || ''}
                  onChange={(e) => handleDisplayChange("acb", e.target.value)}
                  onBlur={() => handleBlur("acb", "currency")}
                  onFocus={() => handleFocus("acb")}
                  placeholder="$0"
                />
              </div>
              <div>
                <Label htmlFor="gross_rent">Gross Rent (Annual)</Label>
                <Input
                  id="gross_rent"
                  type="text"
                  value={displayValues.gross_rent || ''}
                  onChange={(e) => handleDisplayChange("gross_rent", e.target.value)}
                  onBlur={() => handleBlur("gross_rent", "currency")}
                  onFocus={() => handleFocus("gross_rent")}
                  placeholder="$0"
                />
              </div>
              <div>
                <Label htmlFor="rent_index_rate">Rent Index Rate</Label>
                <Input
                  id="rent_index_rate"
                  type="text"
                  value={displayValues.rent_index_rate || ''}
                  onChange={(e) => handleDisplayChange("rent_index_rate", e.target.value)}
                  onBlur={() => handleBlur("rent_index_rate", "percentage")}
                  onFocus={() => handleFocus("rent_index_rate")}
                  placeholder="0.00%"
                />
              </div>
              <div>
                <Label htmlFor="rental_expenses">Rental Expenses (Annual)</Label>
                <Input
                  id="rental_expenses"
                  type="text"
                  value={displayValues.rental_expenses || ''}
                  onChange={(e) => handleDisplayChange("rental_expenses", e.target.value)}
                  onBlur={() => handleBlur("rental_expenses", "currency")}
                  onFocus={() => handleFocus("rental_expenses")}
                  placeholder="$0"
                />
              </div>
              <div>
                <Label htmlFor="expenses_index_rate">Expenses Index Rate</Label>
                <Input
                  id="expenses_index_rate"
                  type="text"
                  value={displayValues.expenses_index_rate || ''}
                  onChange={(e) => handleDisplayChange("expenses_index_rate", e.target.value)}
                  onBlur={() => handleBlur("expenses_index_rate", "percentage")}
                  onFocus={() => handleFocus("expenses_index_rate")}
                  placeholder="0.00%"
                />
              </div>
              <div>
                <Label htmlFor="mortgage_outstanding">Mortgage Outstanding</Label>
                <Input
                  id="mortgage_outstanding"
                  type="text"
                  value={displayValues.mortgage_outstanding || ''}
                  onChange={(e) => handleDisplayChange("mortgage_outstanding", e.target.value)}
                  onBlur={() => handleBlur("mortgage_outstanding", "currency")}
                  onFocus={() => handleFocus("mortgage_outstanding")}
                  placeholder="$0"
                />
              </div>
              <div>
                <Label htmlFor="capital_gains_inclusion_rate">Capital Gains Inclusion Rate</Label>
                <Input
                  id="capital_gains_inclusion_rate"
                  type="text"
                  value={displayValues.capital_gains_inclusion_rate || ''}
                  onChange={(e) => handleDisplayChange("capital_gains_inclusion_rate", e.target.value)}
                  onBlur={() => handleBlur("capital_gains_inclusion_rate", "percentage")}
                  onFocus={() => handleFocus("capital_gains_inclusion_rate")}
                  placeholder="50.00%"
                />
              </div>
            </div>
          </div>

          {/* Tax Information Row */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Tax Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
                  value={formData.marginal_tax_rate ? String(formData.marginal_tax_rate) : ""}
                  onValueChange={(v) => handleFormDataChange("marginal_tax_rate", parseFloat(v))}
                  disabled={isViewer}
                >
                  <SelectTrigger id="marginal_tax_rate">
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
              <div className="flex items-center space-x-2 pb-1">
                <Switch
                  id="is_principal_residence"
                  checked={formData.is_principal_residence}
                  onCheckedChange={(value) => handleFormDataChange("is_principal_residence", value)}
                />
                <Label htmlFor="is_principal_residence" className="text-sm">
                  Principal Residence (Tax-Free)
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results and Schedule */}
      <div className="space-y-6">
        {/* Key Results */}
        {results && (
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-green-600" />
                Real Estate Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(results.finalValue)}
                  </div>
                  <div className="text-sm text-slate-500">Final Property Value</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(results.totalAppreciation)}
                  </div>
                  <div className="text-sm text-slate-500">Total Appreciation</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(results.totalRentalIncome)}
                  </div>
                  <div className="text-sm text-slate-500">Total Net Rental Income</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(results.totalTaxPaid)}
                  </div>
                  <div className="text-sm text-slate-500">Total Tax Paid</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-600">
                    {formatCurrency(results.finalEquity)}
                  </div>
                  <div className="text-sm text-slate-500">Final Equity</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-indigo-600">
                    {(results.annualizedReturn * 100).toFixed(2)}%
                  </div>
                  <div className="text-sm text-slate-500">Annualized Return</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Projection Schedule */}
        {projectionData.length > 0 && (
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Real Estate Projection</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "chart" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("chart")}
                >
                  Chart
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                >
                  <Table className="w-4 h-4 mr-2" />
                  Table
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === "chart" ? (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={projectionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={(value) => `$${(value / 1000)}K`} />
                      <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Value']} />
                      <Legend />
                      <Line type="monotone" dataKey="endValue" stroke="#059669" strokeWidth={2} name="Property Value" />
                      <Line type="monotone" dataKey="equityRealized" stroke="#3b82f6" strokeWidth={2} name="Equity Realized" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th colSpan="2" className="p-2 border font-semibold">Start</th>
                        <th colSpan="2" className="p-2 border font-semibold">Growth</th>
                        <th colSpan="3" className="p-2 border font-semibold">Rental Income</th>
                        <th colSpan="4" className="p-2 border font-semibold">Capital Gains</th>
                        <th colSpan="3" className="p-2 border font-semibold">Tax</th>
                        <th colSpan="4" className="p-2 border font-semibold">Disposition</th>
                        <th colSpan="2" className="p-2 border font-semibold">End</th>
                      </tr>
                      <tr>
                        {/* Apply highlighting to actual column headers */}
                        <th className={`text-left p-2 border cursor-pointer transition-colors ${getHighlightClass(null, 0)}`} onDoubleClick={() => handleHighlight('col', 0)}>Year</th>
                        <th className={`text-left p-2 border cursor-pointer transition-colors ${getHighlightClass(null, 1)}`} onDoubleClick={() => handleHighlight('col', 1)}>Age</th>
                        <th className={`text-right p-2 border cursor-pointer transition-colors ${getHighlightClass(null, 2)}`} onDoubleClick={() => handleHighlight('col', 2)}>Starting Value</th>
                        <th className={`text-right p-2 border cursor-pointer transition-colors ${getHighlightClass(null, 3)}`} onDoubleClick={() => handleHighlight('col', 3)}>Growth Rate</th>
                        <th className={`text-right p-2 border cursor-pointer transition-colors ${getHighlightClass(null, 4)}`} onDoubleClick={() => handleHighlight('col', 4)}>Gross Rent</th>
                        <th className={`text-right p-2 border cursor-pointer transition-colors ${getHighlightClass(null, 5)}`} onDoubleClick={() => handleHighlight('col', 5)}>Expenses</th>
                        <th className={`text-right p-2 border font-medium cursor-pointer transition-colors ${getHighlightClass(null, 6)}`} onDoubleClick={() => handleHighlight('col', 6)}>Net Rent</th>
                        <th className={`text-right p-2 border w-36 cursor-pointer transition-colors ${getHighlightClass(null, 7)}`} onDoubleClick={() => handleHighlight('col', 7)}>Sale Proceeds</th>
                        <th className={`text-right p-2 border w-36 cursor-pointer transition-colors ${getHighlightClass(null, 8)}`} onDoubleClick={() => handleHighlight('col', 8)}>Purchase</th>
                        <th className={`text-right p-2 border cursor-pointer transition-colors ${getHighlightClass(null, 9)}`} onDoubleClick={() => handleHighlight('col', 9)}>Capital Gain/Loss</th>
                        <th className={`text-right p-2 border cursor-pointer transition-colors ${getHighlightClass(null, 10)}`} onDoubleClick={() => handleHighlight('col', 10)}>Taxable Gain</th>
                        <th className={`text-right p-2 border cursor-pointer transition-colors ${getHighlightClass(null, 11)}`} onDoubleClick={() => handleHighlight('col', 11)}>MTR</th>
                        <th className={`text-right p-2 border cursor-pointer transition-colors ${getHighlightClass(null, 12)}`} onDoubleClick={() => handleHighlight('col', 12)}>Tax Payable on Rent</th>
                        <th className={`text-right p-2 border cursor-pointer transition-colors ${getHighlightClass(null, 13)}`} onDoubleClick={() => handleHighlight('col', 13)}>Tax Payable on Gain</th>
                        <th className={`p-2 border text-right font-semibold cursor-pointer transition-colors ${getHighlightClass(null, 14)}`} onDoubleClick={() => handleHighlight('col', 14)}>End Value</th>
                        <th className={`text-right p-2 border cursor-pointer transition-colors ${getHighlightClass(null, 15)}`} onDoubleClick={() => handleHighlight('col', 15)}>(Gain)/Loss Disposal</th>
                        <th className={`text-right p-2 border w-36 cursor-pointer transition-colors ${getHighlightClass(null, 16)}`} onDoubleClick={() => handleHighlight('col', 16)}>Mortgage</th>
                        <th className={`text-right p-2 border cursor-pointer transition-colors ${getHighlightClass(null, 17)}`} onDoubleClick={() => handleHighlight('col', 17)}>Equity Realized</th>
                        <th className={`text-left p-2 border cursor-pointer transition-colors ${getHighlightClass(null, 18)}`} onDoubleClick={() => handleHighlight('col', 18)}>Age</th>
                        <th className={`text-left p-2 border cursor-pointer transition-colors ${getHighlightClass(null, 19)}`} onDoubleClick={() => handleHighlight('col', 19)}>Year</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectionData.map((row, index) => (
                        <tr key={index} className={`border-b hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${getHighlightClass(index, null)}`} onDoubleClick={() => handleHighlight('row', index)}>
                          <td className={`p-2 border text-center font-medium cursor-pointer transition-colors ${getHighlightClass(index, 0)}`} onDoubleClick={(e) => { e.stopPropagation(); handleHighlight('cell', null, { row: index, col: 0 });}}>{row.year}</td>
                          <td className={`p-2 border text-center cursor-pointer transition-colors ${getHighlightClass(index, 1)}`} onDoubleClick={(e) => { e.stopPropagation(); handleHighlight('cell', null, { row: index, col: 1 });}}>{row.age}</td>
                          <td className={`p-2 border text-right cursor-pointer transition-colors ${getHighlightClass(index, 2)}`} onDoubleClick={(e) => { e.stopPropagation(); handleHighlight('cell', null, { row: index, col: 2 });}}>{formatCurrency(row.startingValue)}</td>
                          <td className={`p-2 border text-right cursor-pointer transition-colors ${getHighlightClass(index, 3)}`} onDoubleClick={(e) => { e.stopPropagation(); handleHighlight('cell', null, { row: index, col: 3 });}}>
                            {row.growthRate.toFixed(2)}%
                          </td>
                          <td className={`p-2 border text-right cursor-pointer transition-colors ${getHighlightClass(index, 4)}`} onDoubleClick={(e) => { e.stopPropagation(); handleHighlight('cell', null, { row: index, col: 4 });}}>{formatCurrency(row.grossRent)}</td>
                          <td className={`p-2 border text-right cursor-pointer transition-colors ${getHighlightClass(index, 5)}`} onDoubleClick={(e) => { e.stopPropagation(); handleHighlight('cell', null, { row: index, col: 5 });}}>{formatCurrency(row.rentalExpenses)}</td>
                          <td className={`p-2 border text-right font-medium cursor-pointer transition-colors ${getHighlightClass(index, 6)}`} onDoubleClick={(e) => { e.stopPropagation(); handleHighlight('cell', null, { row: index, col: 6 });}}>{formatCurrency(row.netRent)}</td>
                          <td className={`p-1 border w-36 ${getHighlightClass(index, 7)}`} onDoubleClick={(e) => { e.stopPropagation(); handleHighlight('cell', null, { row: index, col: 7 });}}>
                            <Input
                              type="text"
                              placeholder="$0"
                              className="text-right h-8"
                              value={displaySaleProceeds[index] || ''}
                              onChange={(e) => handleSaleProceedsDisplayChange(index, e.target.value)}
                              onBlur={() => handleSaleProceedsBlur(index)}
                              onFocus={() => handleSaleProceedsFocus(index)}
                              disabled={isViewer}
                            />
                          </td>
                          <td className={`p-1 border w-36 ${getHighlightClass(index, 8)}`} onDoubleClick={(e) => { e.stopPropagation(); handleHighlight('cell', null, { row: index, col: 8 });}}>
                            <Input
                              type="text"
                              placeholder="$0"
                              className="text-right h-8"
                              value={displayManualPurchases[index] || ''}
                              onChange={(e) => handleManualPurchaseDisplayChange(index, e.target.value)}
                              onBlur={() => handleManualPurchaseBlur(index)}
                              onFocus={() => handleManualPurchaseFocus(index)}
                              disabled={isViewer}
                            />
                          </td>
                          <td className={`p-2 border text-right cursor-pointer transition-colors ${getHighlightClass(index, 9)}`} onDoubleClick={(e) => { e.stopPropagation(); handleHighlight('cell', null, { row: index, col: 9 });}}>{formatCurrency(row.capitalGainLoss)}</td>
                          <td className={`p-2 border text-right cursor-pointer transition-colors ${getHighlightClass(index, 10)}`} onDoubleClick={(e) => { e.stopPropagation(); handleHighlight('cell', null, { row: index, col: 10 });}}>{formatCurrency(row.taxableGain)}</td>
                          <td className={`p-2 border text-right cursor-pointer transition-colors ${getHighlightClass(index, 11)}`} onDoubleClick={(e) => { e.stopPropagation(); handleHighlight('cell', null, { row: index, col: 11 });}}>{row.marginalTaxRate.toFixed(2)}%</td>
                          <td className={`p-2 border text-right text-red-600 cursor-pointer transition-colors ${getHighlightClass(index, 12)}`} onDoubleClick={(e) => { e.stopPropagation(); handleHighlight('cell', null, { row: index, col: 12 });}}>{formatCurrency(row.taxPayableOnRent)}</td>
                          <td className={`p-2 border text-right text-red-600 cursor-pointer transition-colors ${getHighlightClass(index, 13)}`} onDoubleClick={(e) => { e.stopPropagation(); handleHighlight('cell', null, { row: index, col: 13 });}}>{formatCurrency(row.taxPayableOnGain)}</td>
                          <td className={`p-2 border text-right font-semibold cursor-pointer transition-colors ${getHighlightClass(index, 14)}`} onDoubleClick={(e) => { e.stopPropagation(); handleHighlight('cell', null, { row: index, col: 14 });}}>{formatCurrency(row.endValue)}</td>
                          <td className={`p-2 border text-right cursor-pointer transition-colors ${getHighlightClass(index, 15)}`} onDoubleClick={(e) => { e.stopPropagation(); handleHighlight('cell', null, { row: index, col: 15 });}}>{formatCurrency(row.gainLossDisposal)}</td>
                          <td className={`p-1 border w-36 ${getHighlightClass(index, 16)}`} onDoubleClick={(e) => { e.stopPropagation(); handleHighlight('cell', null, { row: index, col: 16 });}}>
                             <Input
                              type="text"
                              placeholder="$0"
                              className="text-right h-8"
                              value={displayManualMortgage[index] || ''}
                              onChange={(e) => handleManualMortgageDisplayChange(index, e.target.value)}
                              onBlur={() => handleManualMortgageBlur(index)}
                              onFocus={() => handleManualMortgageFocus(index)}
                              disabled={isViewer}
                            />
                          </td>
                          <td className={`p-2 border text-right font-semibold text-blue-600 cursor-pointer transition-colors ${getHighlightClass(index, 17)}`} onDoubleClick={(e) => { e.stopPropagation(); handleHighlight('cell', null, { row: index, col: 17 });}}>{formatCurrency(row.equityRealized)}</td>
                          <td className={`p-2 border text-center cursor-pointer transition-colors ${getHighlightClass(index, 18)}`} onDoubleClick={(e) => { e.stopPropagation(); handleHighlight('cell', null, { row: index, col: 18 });}}>{row.age}</td>
                          <td className={`p-2 border text-center font-medium cursor-pointer transition-colors ${getHighlightClass(index, 19)}`} onDoubleClick={(e) => { e.stopPropagation(); handleHighlight('cell', null, { row: index, col: 19 });}}>{row.year}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <GiuseppeAIOptimizer
        calculatorName="Real Estate Calculator"
        calculatorData={{
          inputs: formData,
          summary: results,
          projection: projectionData,
          rentalIncomeProjection: rentalIncomeProjection,
        }}
      />
    </fieldset>
  );
}

export default forwardRef(RealEstateCalculator);

export const generateRealEstateIncomeStream = (state_data, instanceName) => {
    if (!state_data || !state_data.formData) return null;

    const { formData } = state_data;
    const annualIncomeByYear = {};

    const timePeriod = parseInt(formData.time_period, 10);
    if (isNaN(timePeriod) || timePeriod <= 0) return null;

    const currentYear = new Date().getFullYear();

    const baseGrossRent = parseFloat(formData.gross_rent) || 0;
    const baseRentalExpenses = parseFloat(formData.rental_expenses) || 0;
    const rentIndexRate = parseFloat(formData.rent_index_rate) / 100 || 0;
    const expensesIndexRate = parseFloat(formData.expenses_index_rate) / 100 || 0;

    // Only generate income stream if there's potential for net income or expenses
    if (baseGrossRent <= 0 && baseRentalExpenses <= 0) return null;

    for (let yearOffset = 1; yearOffset <= timePeriod; yearOffset++) { // yearOffset 1 for next year, up to timePeriod
        const year = currentYear + yearOffset;

        // Exponent should be yearOffset, as it represents the number of times indexing has occurred.
        // For yearOffset=1, it means income for next year (indexed once based on current year).
        const indexedGrossRent = baseGrossRent * Math.pow(1 + rentIndexRate, yearOffset);
        const indexedRentalExpenses = baseRentalExpenses * Math.pow(1 + expensesIndexRate, yearOffset);

        const netIncome = indexedGrossRent - indexedRentalExpenses;

        if (netIncome > 0) { // Only add positive net income to the stream
            annualIncomeByYear[year] = Math.round(netIncome);
        }
    }

    if (Object.keys(annualIncomeByYear).length === 0) return null;

    return {
        id: `real_estate_${formData.client_ids?.[0] || 'manual'}_${Date.now()}`,
        source: instanceName || 'Real Estate Income',
        calculatorType: 'real_estate',
        client_ids: formData.client_ids, // Changed to client_ids
        includeInMainView: true,
        inflationAdjusted: false,
        annualIncomeByYear,
        notes: "Net rental income from real estate properties."
    };
};

export const extractRealEstateComparisonData = (stateData, clients = []) => {
  if (!stateData || !stateData.formData) {
    return null;
  }

  const { formData, saleProceeds = {}, manualPurchases = {}, manualMortgage = {} } = stateData;

  const numericStartValue = parseFloat(formData.start_value) || 0;
  const numericCurrentAge = parseFloat(formData.current_age) || 0;
  const numericTimePeriod = parseFloat(formData.time_period) || 50;

  if (numericTimePeriod <= 0) return null;

  const numericGrowthRate = parseFloat(formData.growth_rate) || 0;
  const numericACB = parseFloat(formData.acb) || 0;
  const numericGrossRent = parseFloat(formData.gross_rent) || 0;
  const numericRentIndexRate = parseFloat(formData.rent_index_rate) || 0;
  const numericRentalExpenses = parseFloat(formData.rental_expenses) || 0;
  const numericExpensesIndexRate = parseFloat(formData.expenses_index_rate) || 0;
  const numericMarginalTaxRate = parseFloat(formData.marginal_tax_rate) || 0;
  const numericCapitalGainsRate = parseFloat(formData.capital_gains_inclusion_rate) || 50;
  const initialNumericMortgageOutstanding = parseFloat(formData.mortgage_outstanding) || 0;
  const numericOwnershipPercentage = parseFloat(formData.ownership_percentage) || 100;

  let projections = [];
  let runningValue = numericStartValue;
  const currentYear = new Date().getFullYear();
  const initialPurchaseValue = numericACB || numericStartValue;
  let propertyHasBeenSold = false;

  for (let yearIndex = 0; yearIndex <= numericTimePeriod; yearIndex++) {
    const year = currentYear + yearIndex;
    const age = numericCurrentAge + yearIndex;
    const startingValueForThisYear = (yearIndex === 0) ? numericStartValue : runningValue;
    const purchaseForYear = manualPurchases[yearIndex] !== undefined ? manualPurchases[yearIndex] : ((yearIndex === 0) ? initialPurchaseValue : (projections[yearIndex - 1]?.purchase ?? initialPurchaseValue));
    const mortgageForYear = manualMortgage[yearIndex] !== undefined ? manualMortgage[yearIndex] : ((yearIndex === 0) ? initialNumericMortgageOutstanding : (projections[yearIndex - 1]?.mortgageOutstanding ?? initialNumericMortgageOutstanding));
    const saleProceedsForYear = saleProceeds[yearIndex] || 0;
    const isDisposition = saleProceedsForYear > 0;
    const indexedGrossRent = numericGrossRent * Math.pow(1 + numericRentIndexRate / 100, yearIndex);
    const indexedRentalExpenses = numericRentalExpenses * Math.pow(1 + numericExpensesIndexRate / 100, yearIndex);
    const netRent = indexedGrossRent - indexedRentalExpenses;

    let endValueForThisYear = startingValueForThisYear;
    let annualGrowth = 0;

    if (!propertyHasBeenSold) {
        annualGrowth = startingValueForThisYear * (numericGrowthRate / 100);
        endValueForThisYear += annualGrowth;

        if (isDisposition) {
            endValueForThisYear = 0;
            propertyHasBeenSold = true;
        }
    } else {
        endValueForThisYear = 0;
    }
    
    runningValue = endValueForThisYear;

    projections.push({
      year,
      age,
      propertyValue: Math.round(endValueForThisYear),
      rentalIncome: propertyHasBeenSold && !isDisposition ? 0 : Math.round(netRent),
      purchase: Math.round(purchaseForYear),
      mortgageOutstanding: Math.round(mortgageForYear),
    });
  }

  let comparisonName = formData.calculator_name || 'Real Estate';
  if (formData.client_ids && formData.client_ids.length > 0 && clients && clients.length > 0) {
      const clientNames = formData.client_ids.map(id => {
          const client = clients.find(c => c.id === id);
          return client ? `${client.first_name} ${client.last_name}` : '';
      }).filter(Boolean);
      if (clientNames.length > 0) {
          comparisonName = `${comparisonName} (${clientNames.join(', ')})`;
      }
  }

  return {
    name: comparisonName,
    projectionData: projections,
    finalMetrics: {}, // Can be populated with summary data if needed later
  };
};
