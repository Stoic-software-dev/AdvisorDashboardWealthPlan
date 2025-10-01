
import React, { useState, useEffect, useImperativeHandle, forwardRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Calculator, User, Undo2, Table, Download, Loader2, Info } from "lucide-react";
import { InvokeLLM } from "@/api/integrations";
import { differenceInYears } from "date-fns";
import { GovernmentBenefitRates, AppSettings } from "@/api/entities";
import {
  Table as ShadcnTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import MultiClientSelector from '../shared/MultiClientSelector';
import GiuseppeAIOptimizer from '../shared/GiuseppeAIOptimizer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { generateFixedIncomePdf } from "@/api/functions";

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

// Utility functions for formatting
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
  goal_id: "",
  current_age: "",
  life_expectancy: 90,
  cpp_start_age: 65,
  cpp_factor: 80,
  oas_start_age: 65,
  oas_factor: 100,
  bridge_start_age: 50,
  bridge_end_age: 64,
  bridge_amount: "",
  bridge_index_rate: 0,
  private_start_age: 58,
  private_end_age: 100,
  private_amount: "",
  private_index_rate: 0,
  other1_name: "Other Income 1",
  other1_start_age: "",
  other1_end_age: "",
  other1_amount: "",
  other1_index_rate: 0,
  other2_name: "Other Income 2",
  other2_start_age: "",
  other2_end_age: "",
  other2_amount: "",
  other2_index_rate: 0,
  marginal_tax_rate: 29.65,
  inflation_rate: 2.5,
  scenario_details: "",
};

function FixedIncomeCalculator({ clients, goals, isLoading, preselectedClientId, initialState, onNameChange, isViewer = false }, ref) {
  const [formData, setFormData] = useState({
    ...emptyFormData,
    client_ids: preselectedClientId ? [preselectedClientId] : []
  });
  
  const [results, setResults] = useState(null);
  const [projectionData, setProjectionData] = useState([]);
  const [displayValues, setDisplayValues] = useState({});

  const [govBenefitMax, setGovBenefitMax] = useState({ 
    max_cpp_annual: 17478.36, 
    max_oas_annual: 8814.24,
    max_oas_annual_75_plus: 9695.66,
    year: new Date().getFullYear()
  });

  const [taxBrackets, setTaxBrackets] = useState(ONTARIO_TAX_BRACKETS_2024);
  const [isFetchingTaxRates, setIsFetchingTaxRates] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const [highlight, setHighlight] = useState({ type: null, index: null, cell: null });

  // Expose state and functions to parent via ref
  useImperativeHandle(ref, () => ({
    getState: () => ({ 
      formData, 
      projectionData, 
      results 
    })
  }));

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

  const handleFormDataChange = useCallback((field, value) => {
    if (field === 'calculator_name' && onNameChange) {
      onNameChange(value);
    }
    try {
      setFormData(prev => ({
        ...prev,
        [field]: value === null || value === undefined || value === "null" ? "" : value
      }));
    } catch (error) {
      console.error("Error updating form data:", error);
    }
  }, [onNameChange]);

  // Initialize state from props - FIXED VERSION
  useEffect(() => {
    if (initialState && typeof initialState === 'object') {
      console.log('DEBUG: FixedIncomeCalculator initializing from saved state:', initialState);
      
      if (initialState.formData) {
        const clientIds = initialState.formData.client_ids || 
                         (initialState.formData.client_id ? [initialState.formData.client_id] : []) ||
                         (preselectedClientId ? [preselectedClientId] : []);
        
        const safeFormData = {
          ...emptyFormData,
          ...initialState.formData,
          client_ids: clientIds,
        };
        
        console.log('DEBUG: Setting formData from saved state:', safeFormData);
        setFormData(safeFormData);
      }
      
      if (initialState.projectionData) {
        console.log('DEBUG: Setting projectionData from saved state');
        setProjectionData(initialState.projectionData);
      }
      
      if (initialState.results) {
        console.log('DEBUG: Setting results from saved state');
        setResults(initialState.results);
      }
    } else if (preselectedClientId) {
      console.log('DEBUG: No saved state, using preselected client:', preselectedClientId);
      setFormData(prev => ({
        ...prev,
        client_ids: [preselectedClientId],
      }));
    }
  }, [initialState, preselectedClientId]);

  // Auto-set current_age based on client's DoB with safety checks
  useEffect(() => {
    const primaryClientId = formData.client_ids?.[0];
    if (primaryClientId && clients && Array.isArray(clients) && clients.length > 0) {
      try {
        const client = clients.find(c => c && c.id === primaryClientId);
        if (client && client.date_of_birth) {
          const age = differenceInYears(new Date(), new Date(client.date_of_birth));
          if (!isNaN(age) && age >= 0 && age <= 120) {
            handleFormDataChange('current_age', age);
          } else {
            handleFormDataChange('current_age', emptyFormData.current_age);
          }
        } else {
          handleFormDataChange('current_age', emptyFormData.current_age);
        }
      } catch (error) {
        console.error("Error setting age from client:", error);
        handleFormDataChange('current_age', emptyFormData.current_age);
      }
    } else {
      handleFormDataChange('current_age', emptyFormData.current_age);
    }
  }, [formData.client_ids, clients, handleFormDataChange]);

  // Effect to keep displayValues in sync with formData
  useEffect(() => {
    try {
      setDisplayValues({
        current_age: formData.current_age || '',
        life_expectancy: formData.life_expectancy || '',
        bridge_amount: formData.bridge_amount !== undefined && formData.bridge_amount !== null ? formatCurrency(formData.bridge_amount) : '',
        bridge_index_rate: formData.bridge_index_rate !== undefined && formData.bridge_index_rate !== null ? formatPercentage(formData.bridge_index_rate) : '',
        private_amount: formData.private_amount !== undefined && formData.private_amount !== null ? formatCurrency(formData.private_amount) : '',
        private_index_rate: formData.private_index_rate !== undefined && formData.private_index_rate !== null ? formatPercentage(formData.private_index_rate) : '',
        other1_amount: formData.other1_amount !== undefined && formData.other1_amount !== null ? formatCurrency(formData.other1_amount) : '',
        other1_index_rate: formData.other1_index_rate !== undefined && formData.other1_index_rate !== null ? formatPercentage(formData.other1_index_rate) : '',
        other2_amount: formData.other2_amount !== undefined && formData.other2_amount !== null ? formatCurrency(formData.other2_amount) : '',
        other2_index_rate: formData.other2_index_rate !== undefined && formData.other2_index_rate !== null ? formatPercentage(formData.other2_index_rate) : '',
        marginal_tax_rate: formData.marginal_tax_rate !== undefined && formData.marginal_tax_rate !== null ? formatPercentage(formData.marginal_tax_rate) : '',
        inflation_rate: formData.inflation_rate !== undefined && formData.inflation_rate !== null ? formatPercentage(formData.inflation_rate) : ''
      });
    } catch (error) {
      console.error("Error updating display values:", error);
    }
  }, [formData]);

  // Get goals for the selected clients - with additional safety checks
  const clientGoals = useMemo(() => {
    try {
      if (!formData.client_ids || formData.client_ids.length === 0 || !goals || !Array.isArray(goals)) {
        return [];
      }
      return goals.filter(goal => {
        if (!goal || !goal.id) return false;
        const goalClientIds = goal.client_ids || (goal.client_id ? [goal.client_id] : []);
        return formData.client_ids.some(selectedId => goalClientIds.includes(selectedId));
      });
    } catch (error) {
      console.error("Error filtering client goals:", error);
      return [];
    }
  }, [formData.client_ids, goals]);

  useEffect(() => {
    // Ensure goal_id is valid for the current clients, otherwise clear it.
    if (formData.goal_id && !clientGoals.some(g => g && g.id === formData.goal_id)) {
      handleFormDataChange('goal_id', '');
    }
  }, [formData.client_ids, formData.goal_id, clientGoals, handleFormDataChange]);

  // Load global settings from entities with error handling
  useEffect(() => {
    const loadGlobalSettings = async () => {
      try {
        const [ratesData, appSettingsData] = await Promise.allSettled([
          GovernmentBenefitRates.list('-year', 1),
          AppSettings.list()
        ]);

        if (ratesData.status === 'fulfilled' && ratesData.value && ratesData.value.length > 0) {
          const rates = ratesData.value[0];
          setGovBenefitMax({
            max_cpp_annual: rates.max_cpp_annual || 17478.36,
            max_oas_annual: rates.max_oas_annual || 8814.24,
            max_oas_annual_75_plus: rates.max_oas_annual_75_plus || (rates.max_oas_annual * 1.1) || 9695.66,
            year: rates.year || new Date().getFullYear()
          });
        } else if (ratesData.status === 'rejected') {
          console.error("Failed to load GovernmentBenefitRates:", ratesData.reason);
        }

        if (appSettingsData.status === 'fulfilled' && appSettingsData.value && appSettingsData.value.length > 0) {
          const settings = appSettingsData.value[0];
          if (settings.preferred_inflation_rate !== undefined && settings.preferred_inflation_rate !== null) {
            if (formData.inflation_rate === emptyFormData.inflation_rate || formData.inflation_rate === null || formData.inflation_rate === '') {
              handleFormDataChange('inflation_rate', settings.preferred_inflation_rate);
            }
          }
        } else if (appSettingsData.status === 'rejected') {
          console.error("Failed to load AppSettings:", appSettingsData.reason);
        }
      } catch (error) {
        console.error("Error loading global settings (outer catch):", error);
      }
    };

    loadGlobalSettings();
  }, [formData.inflation_rate, handleFormDataChange]);

  const handleDisplayChange = (field, value) => {
    try {
      setDisplayValues(prev => ({ ...prev, [field]: value }));
    } catch (error) {
      console.error("Error updating display values:", error);
    }
  };

  const handleBlur = (field, type) => {
    try {
      const rawValue = parseValue(displayValues[field]);
      const parsed = parseFloat(rawValue);
      const finalValue = !isNaN(parsed) ? parsed : (rawValue === '' ? '' : 0);

      handleFormDataChange(field, finalValue);

      if (type === 'currency') setDisplayValues(prev => ({ ...prev, [field]: formatCurrency(finalValue) }));
      if (type === 'percentage') setDisplayValues(prev => ({ ...prev, [field]: formatPercentage(finalValue) }));
    } catch (error) {
      console.error("Error handling blur:", error);
    }
  };

  const handleFocus = (field) => {
    try {
      setDisplayValues(prev => ({ ...prev, [field]: parseValue(prev[field]) }));
    } catch (error) {
      console.error("Error handling focus:", error);
    }
  };

  const handleClearFields = () => {
    try {
      setFormData({
        ...emptyFormData,
        client_ids: formData.client_ids
      });
      setResults(null);
      setProjectionData([]);
    } catch (error) {
      console.error("Error clearing fields:", error);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
        const payload = { formData, results, projectionData };
        const response = await generateFixedIncomePdf(payload);

        if (response && response.data) {
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Fixed Income Report - ${formData.calculator_name || 'Scenario'}.pdf`;
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
                variant: "destructive",
                title: "Error",
                description: "Failed to generate PDF.",
            });
        }
    } catch (error) {
        console.error("Error exporting PDF:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to generate PDF. Please try again.",
        });
    } finally {
        setIsExporting(false);
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
                  label: { type: "string", description: "A descriptive label for the bracket (e.g., '20.05% (Income up to $51,446)')" }
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
        if (!formattedBrackets.some(b => b.value === formData.marginal_tax_rate)) {
          // If current marginal_tax_rate is not in the new list, default to the first one
          setFormData(prev => ({ ...prev, marginal_tax_rate: formattedBrackets[0].value }));
        }
      } else {
        console.warn("InvokeLLM returned incomplete tax bracket data.", response);
        toast({
          variant: "destructive",
          title: "Warning",
          description: "Could not fetch the latest tax rates completely. Using existing values.",
        });
      }
    }
    catch (error) {
      console.error("Failed to fetch current tax rates:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch the latest tax rates. Using default values.",
      });
    }
    finally {
      setIsFetchingTaxRates(false);
    }
  };

  const calculateFixedIncome = useCallback(() => {
    try {
      const numericCurrentAge = parseFloat(formData.current_age);
      const numericLifeExpectancy = parseFloat(formData.life_expectancy);
      
      console.log('[DEBUG] FixedIncome: Starting calculation with ages - Current:', numericCurrentAge, 'Life Expectancy:', numericLifeExpectancy);
      
      // If life expectancy is invalid, bail out
      if (isNaN(numericLifeExpectancy) || numericLifeExpectancy <= 0) {
        console.log('[DEBUG] FixedIncome: Invalid life expectancy:', numericLifeExpectancy);
        setResults(null);
        setProjectionData([]);
        return;
      }

      // Determine the starting age - either from form, derived from client, or use a reasonable default
      let startingAge = numericCurrentAge;
      
      // If current age is not valid, try to derive from client
      if (isNaN(startingAge) || startingAge <= 0) {
        const primaryClientId = formData.client_ids?.[0];
        if (primaryClientId && clients && clients.length > 0) {
          const client = clients.find(c => c && c.id === primaryClientId);
          if (client && client.date_of_birth) {
            try {
              const derivedAge = differenceInYears(new Date(), new Date(client.date_of_birth));
              if (!isNaN(derivedAge) && derivedAge > 0) {
                startingAge = derivedAge;
                console.log('[DEBUG] FixedIncome: Derived starting age from client:', startingAge);
              }
            } catch (error) {
              console.error("[DEBUG] FixedIncome: Error deriving age from client's date of birth:", error);
            }
          }
        }
        
        // If still no valid age, use a reasonable default for projection
        if (isNaN(startingAge) || startingAge <= 0) {
          startingAge = 50; // Default starting age for projections
          console.log('[DEBUG] FixedIncome: Using default starting age:', startingAge);
        }
      }

      // Final validation - make sure starting age is less than life expectancy
      if (startingAge >= numericLifeExpectancy) {
        console.log('[DEBUG] FixedIncome: Starting age must be less than life expectancy - Starting:', startingAge, 'Life Expectancy:', numericLifeExpectancy);
        setResults(null);
        setProjectionData([]);
        return;
      }

      console.log('[DEBUG] FixedIncome: Proceeding with calculation - Starting Age:', startingAge, 'Life Expectancy:', numericLifeExpectancy);

      let projections = [];
      
      const maxCPP = govBenefitMax.max_cpp_annual;

      // Calculate CPP adjustment factor based on start age
      const cppMonthsDiff = (formData.cpp_start_age - 65) * 12;
      let cppAdjustment = 0;
      if (cppMonthsDiff < 0) {
        cppAdjustment = cppMonthsDiff * 0.006;
      } else {
        cppAdjustment = cppMonthsDiff * 0.007;
      }
      const cppAgeFactor = 1 + cppAdjustment;

      // Calculate OAS adjustment factor (can only be deferred, not taken early)
      const oasMonthsDiff = Math.max(0, (formData.oas_start_age - 65) * 12);
      const oasAdjustment = Math.min(oasMonthsDiff * 0.006, 0.36);
      const oasAgeFactor = 1 + oasAdjustment;

      const currentYear = new Date().getFullYear();

      for (let age = startingAge; age <= numericLifeExpectancy; age++) {
        const year = currentYear + (age - startingAge);
        const yearOffset = age - startingAge;
        
        let cppAmount = 0;
        if (age >= formData.cpp_start_age) {
          cppAmount = maxCPP * cppAgeFactor * (formData.cpp_factor / 100) * Math.pow(1 + (formData.inflation_rate / 100), yearOffset);
        }

        let oasAmount = 0;
        if (age >= formData.oas_start_age) {
          const baseMaxOAS = age >= 75 
            ? govBenefitMax.max_oas_annual_75_plus
            : govBenefitMax.max_oas_annual;

          oasAmount = baseMaxOAS * oasAgeFactor * (formData.oas_factor / 100) * Math.pow(1 + (formData.inflation_rate / 100), yearOffset);
        }

        let bridgeAmount = 0;
        const parsedBridgeAmount = parseFloat(formData.bridge_amount);
        if (age >= formData.bridge_start_age && age <= formData.bridge_end_age && !isNaN(parsedBridgeAmount) && parsedBridgeAmount > 0) {
          bridgeAmount = parsedBridgeAmount * Math.pow(1 + (formData.bridge_index_rate / 100), yearOffset);
        }

        let privateAmount = 0;
        const parsedPrivateAmount = parseFloat(formData.private_amount);
        if (age >= formData.private_start_age && age <= formData.private_end_age && !isNaN(parsedPrivateAmount) && parsedPrivateAmount > 0) {
          privateAmount = parsedPrivateAmount * Math.pow(1 + (formData.private_index_rate / 100), yearOffset);
        }

        let other1Amount = 0;
        const parsedOther1Amount = parseFloat(formData.other1_amount);
        if (age >= formData.other1_start_age && age <= formData.other1_end_age && !isNaN(parsedOther1Amount) && parsedOther1Amount > 0) {
          other1Amount = parsedOther1Amount * Math.pow(1 + (formData.other1_index_rate / 100), yearOffset);
        }

        let other2Amount = 0;
        const parsedOther2Amount = parseFloat(formData.other2_amount);
        if (age >= formData.other2_start_age && age <= formData.other2_end_age && !isNaN(parsedOther2Amount) && parsedOther2Amount > 0) {
          other2Amount = parsedOther2Amount * Math.pow(1 + (formData.other2_index_rate / 100), yearOffset);
        }

        const totalIncome = cppAmount + oasAmount + bridgeAmount + privateAmount + other1Amount + other2Amount;
        const taxEstimate = totalIncome * (formData.marginal_tax_rate / 100);
        const afterTaxIncome = totalIncome - taxEstimate;
        const inflationAdjusted = afterTaxIncome / Math.pow(1 + (formData.inflation_rate / 100), yearOffset);

        projections.push({
          year,
          age,
          cpp: Math.round(cppAmount),
          oas: Math.round(oasAmount),
          employerPension: Math.round(privateAmount),
          bridgeBenefit: Math.round(bridgeAmount),
          other1: Math.round(other1Amount),
          other2: Math.round(other2Amount),
          totalIncome: Math.round(totalIncome),
          inflationAdjustedIncome: Math.round(inflationAdjusted)
        });
      }

      const totalYears = projections.length;
      const totalLifetimeIncome = projections.reduce((sum, p) => sum + p.totalIncome, 0); 
      const totalTaxesPaid = projections.reduce((sum, p) => sum + (p.totalIncome * (formData.marginal_tax_rate / 100)), 0);

      setResults({
        totalYears,
        avgAnnualIncome: totalYears > 0 ? Math.round(totalLifetimeIncome / totalYears) : 0,
        totalLifetimeIncome: Math.round(totalLifetimeIncome),
        totalTaxesPaid: Math.round(totalTaxesPaid),
      });

      setProjectionData(projections);
    } catch (error) {
      console.error("Error calculating fixed income:", error);
      setResults(null);
      setProjectionData([]);
    }
  }, [formData, govBenefitMax, clients]);

  useEffect(() => {
    calculateFixedIncome();
  }, [calculateFixedIncome]);

  const getClientNames = (client_ids) => {
    try {
      if (!clients || !Array.isArray(clients) || !client_ids || client_ids.length === 0) return '';
      const selectedClients = clients.filter(c => c && client_ids.includes(c.id));
      return selectedClients.map(c => `${c.first_name} ${c.last_name}`).join(', ');
    } catch (error) {
      console.error("Error getting client names:", error);
      return '';
    }
  };

  return (
    <fieldset disabled={isViewer} className="space-y-6">
      {/* Header with Client Linking */}
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              Fixed Income Calculator
            </CardTitle>
            {!isViewer && (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleExportPdf} disabled={isExporting || !results}>
                  {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  {isExporting ? 'Exporting...' : 'Export PDF'}
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
                value={formData.calculator_name || ''}
                onChange={(e) => handleFormDataChange('calculator_name', e.target.value)}
                placeholder="Enter calculator name (e.g., 'Retirement Plan A')"
                disabled={isViewer}
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Associated Clients</Label>
              <MultiClientSelector
                clients={clients || []}
                selectedClientIds={formData.client_ids || []}
                onSelectionChange={(selectedIds) => {
                  handleFormDataChange('client_ids', selectedIds || []);
                  if (formData.goal_id && !clientGoals.some(g => g && g.id === formData.goal_id)) {
                    handleFormDataChange('goal_id', '');
                  }
                }}
                disabled={isViewer}
                placeholder="Select clients..."
              />
            </div>
          </div>

          {formData.client_ids && formData.client_ids.length > 0 && (
            <div>
              <Label htmlFor="goal_id">Linked Goal (Optional)</Label>
              <Select 
                value={formData.goal_id || 'no_goal'} 
                onValueChange={(value) => {
                  const finalValue = value === 'no_goal' ? '' : value;
                  handleFormDataChange('goal_id', finalValue);
                }}
                disabled={isViewer}
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
          
          <div>
            <Label htmlFor="scenario_details">Scenario Details</Label>
            <Input
              id="scenario_details"
              value={formData.scenario_details || ''}
              onChange={(e) => handleFormDataChange('scenario_details', e.target.value)}
              placeholder="Enter a short description for this scenario..."
              disabled={isViewer}
            />
          </div>

          {formData.client_ids && formData.client_ids.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <User className="w-4 h-4" />
              <span>Calculating for: <strong>{getClientNames(formData.client_ids)}</strong></span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Input Parameters - Full Width Layout */}
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Income Planning Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Basic Information Row */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="current_age">Current Age</Label>
                <Input 
                  id="current_age" 
                  type="number" 
                  value={formData.current_age || ''} 
                  onChange={(e) => handleFormDataChange("current_age", e.target.value === '' ? '' : parseInt(e.target.value, 10))} 
                  placeholder="50"
                  disabled={formData.client_ids && formData.client_ids.length > 0 || isViewer}
                  readOnly={formData.client_ids && formData.client_ids.length > 0}
                />
              </div>
              <div>
                <Label htmlFor="life_expectancy">Life Expectancy</Label>
                <Input 
                  id="life_expectancy" 
                  type="number" 
                  value={formData.life_expectancy || ''} 
                  onChange={(e) => handleFormDataChange("life_expectancy", e.target.value === '' ? '' : parseInt(e.target.value, 10))} 
                  placeholder="90"
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
                  value={formData.marginal_tax_rate ? String(formData.marginal_tax_rate) : String(taxBrackets[0]?.value || '')} 
                  onValueChange={(value) => {
                    const numValue = parseFloat(value);
                    handleFormDataChange("marginal_tax_rate", !isNaN(numValue) ? numValue : 0);
                  }}
                  disabled={isViewer}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tax bracket..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(taxBrackets || []).map(bracket => (
                      <SelectItem key={String(bracket.value)} value={String(bracket.value)}>
                        {bracket.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="inflation_rate">Inflation Rate (%)</Label>
                <Input 
                  type="text" 
                  value={displayValues.inflation_rate || ''} 
                  onChange={(e) => handleDisplayChange("inflation_rate", e.target.value)} 
                  onBlur={() => handleBlur("inflation_rate", "percentage")} 
                  onFocus={() => handleFocus("inflation_rate")} 
                  placeholder="2.50%"
                  disabled={isViewer}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Government Benefits Row */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-800 border-b pb-2">Government Benefits</h3>
              <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1 rounded-lg">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="cursor-help">
                      <p>
                        Max CPP ({govBenefitMax.year}): {formatCurrency(govBenefitMax.max_cpp_annual)}
                      </p>
                      <p>
                        Max OAS ({govBenefitMax.year}): {formatCurrency(govBenefitMax.max_oas_annual)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Max OAS (75+): {formatCurrency(govBenefitMax.max_oas_annual_75_plus)}</p>
                      <p className="text-slate-400">Rates from Application Settings</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-green-700">CPP</h4>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Start Age (60-70)</Label>
                    <Input 
                      type="number" 
                      min="60" max="70"
                      value={formData.cpp_start_age} 
                      onChange={(e) => handleFormDataChange("cpp_start_age", e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      disabled={isViewer}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Factor % of Max</Label>
                    <Input 
                      type="number" 
                      value={formData.cpp_factor} 
                      onChange={(e) => handleFormDataChange("cpp_factor", e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      disabled={isViewer}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-green-700">OAS</h4>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Start Age (65-70)</Label>
                    <Input 
                      type="number" 
                      min="65" max="70"
                      value={formData.oas_start_age} 
                      onChange={(e) => handleFormDataChange("oas_start_age", e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      disabled={isViewer}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Factor % of Max</Label>
                    <Input 
                      type="number" 
                      value={formData.oas_factor} 
                      onChange={(e) => handleFormDataChange("oas_factor", e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      disabled={isViewer}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Pension Income Sources Row */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Pension & Other Income Sources</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Private Pension */}
              <div className="space-y-3">
                <h4 className="font-semibold text-purple-700">Private Pension</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Start Age</Label>
                    <Input 
                      type="number" 
                      value={formData.private_start_age} 
                      onChange={(e) => handleFormDataChange("private_start_age", e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      disabled={isViewer}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">End Age</Label>
                    <Input 
                      type="number" 
                      value={formData.private_end_age} 
                      onChange={(e) => handleFormDataChange("private_end_age", e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      disabled={isViewer}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Annual Amount</Label>
                    <Input 
                      type="text" 
                      value={displayValues.private_amount || ''} 
                      onChange={(e) => handleDisplayChange("private_amount", e.target.value)} 
                      onBlur={() => handleBlur("private_amount", "currency")} 
                      onFocus={() => handleFocus("private_amount")} 
                      placeholder="$0"
                      disabled={isViewer}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Index Rate %</Label>
                    <Input 
                      type="text" 
                      value={displayValues.private_index_rate || ''} 
                      onChange={(e) => handleDisplayChange("private_index_rate", e.target.value)} 
                      onBlur={() => handleBlur("private_index_rate", "percentage")} 
                      onFocus={() => handleFocus("private_index_rate")} 
                      placeholder="0.00%"
                      disabled={isViewer}
                    />
                  </div>
                </div>
              </div>

              {/* Bridge Pension */}
              <div className="space-y-3">
                <h4 className="font-semibold text-blue-700">Bridge Pension</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Start Age</Label>
                    <Input 
                      type="number" 
                      value={formData.bridge_start_age} 
                      onChange={(e) => handleFormDataChange("bridge_start_age", e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      disabled={isViewer}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">End Age</Label>
                    <Input 
                      type="number" 
                      value={formData.bridge_end_age} 
                      onChange={(e) => handleFormDataChange("bridge_end_age", e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      disabled={isViewer}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Annual Amount</Label>
                    <Input 
                      type="text" 
                      value={displayValues.bridge_amount || ''} 
                      onChange={(e) => handleDisplayChange("bridge_amount", e.target.value)} 
                      onBlur={() => handleBlur("bridge_amount", "currency")} 
                      onFocus={() => handleFocus("bridge_amount")} 
                      placeholder="$0"
                      disabled={isViewer}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Index Rate %</Label>
                    <Input 
                      type="text" 
                      value={displayValues.bridge_index_rate || ''} 
                      onChange={(e) => handleDisplayChange("bridge_index_rate", e.target.value)} 
                      onBlur={() => handleBlur("bridge_index_rate", "percentage")} 
                      onFocus={() => handleFocus("bridge_index_rate")} 
                      placeholder="0.00%"
                      disabled={isViewer}
                    />
                  </div>
                </div>
              </div>

              {/* Other Income 1 */}
              <div className="space-y-3">
                 <Input
                    type="text"
                    value={formData.other1_name}
                    onChange={(e) => handleFormDataChange("other1_name", e.target.value)}
                    placeholder="Other Income 1"
                    className="font-semibold text-green-700 border-b border-green-200 focus-visible:ring-1 focus-visible:ring-green-500 rounded-none p-1 h-auto"
                    disabled={isViewer}
                  />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Start Age</Label>
                    <Input 
                      type="number" 
                      value={formData.other1_start_age} 
                      onChange={(e) => handleFormDataChange("other1_start_age", e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      disabled={isViewer}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">End Age</Label>
                    <Input 
                      type="number" 
                      value={formData.other1_end_age} 
                      onChange={(e) => handleFormDataChange("other1_end_age", e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      disabled={isViewer}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Annual Amount</Label>
                    <Input 
                      type="text" 
                      value={displayValues.other1_amount || ''} 
                      onChange={(e) => handleDisplayChange("other1_amount", e.target.value)} 
                      onBlur={() => handleBlur("other1_amount", "currency")} 
                      onFocus={() => handleFocus("other1_amount")} 
                      placeholder="$0"
                      disabled={isViewer}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Index Rate %</Label>
                    <Input 
                      type="text" 
                      value={displayValues.other1_index_rate || ''} 
                      onChange={(e) => handleDisplayChange("other1_index_rate", e.target.value)} 
                      onBlur={() => handleBlur("other1_index_rate", "percentage")} 
                      onFocus={() => handleFocus("other1_index_rate")} 
                      placeholder="0.00%"
                      disabled={isViewer}
                    />
                  </div>
                </div>
              </div>
              
              {/* Other Income 2 */}
              <div className="space-y-3">
                 <Input
                    type="text"
                    value={formData.other2_name}
                    onChange={(e) => handleFormDataChange("other2_name", e.target.value)}
                    placeholder="Other Income 2"
                    className="font-semibold text-orange-700 border-b border-orange-200 focus-visible:ring-1 focus-visible:ring-orange-500 rounded-none p-1 h-auto"
                    disabled={isViewer}
                  />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Start Age</Label>
                    <Input 
                      type="number" 
                      value={formData.other2_start_age} 
                      onChange={(e) => handleFormDataChange("other2_start_age", e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      disabled={isViewer}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">End Age</Label>
                    <Input 
                      type="number" 
                      value={formData.other2_end_age} 
                      onChange={(e) => handleFormDataChange("other2_end_age", e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      disabled={isViewer}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Annual Amount</Label>
                    <Input 
                      type="text" 
                      value={displayValues.other2_amount || ''} 
                      onChange={(e) => handleDisplayChange("other2_amount", e.target.value)} 
                      onBlur={() => handleBlur("other2_amount", "currency")} 
                      onFocus={() => handleFocus("other2_amount")} 
                      placeholder="$0"
                      disabled={isViewer}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Index Rate %</Label>
                    <Input 
                      type="text" 
                      value={displayValues.other2_index_rate || ''} 
                      onChange={(e) => handleDisplayChange("other2_index_rate", e.target.value)} 
                      onBlur={() => handleBlur("other2_index_rate", "percentage")} 
                      onFocus={() => handleFocus("other2_index_rate")} 
                      placeholder="0.00%"
                      disabled={isViewer}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {results && (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-green-600" />
              Fixed Income Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(results.avgAnnualIncome)}</div>
                <div className="text-sm text-slate-500">Avg. Annual Income</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(results.totalLifetimeIncome)}</div>
                <div className="text-sm text-slate-500">Total Lifetime Income</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(results.totalTaxesPaid)}</div>
                <div className="text-sm text-slate-500">Total Taxes Paid</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{results.totalYears}</div>
                <div className="text-sm text-slate-500">Years of Income</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {results && projectionData.length > 0 && (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Income Projections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-y-auto">
              <div className="overflow-x-auto">
                <ShadcnTable className="w-full text-sm">
                  <TableHeader className="bg-slate-50 sticky top-0">
                    <TableRow className="border-b border-slate-300 dark:border-slate-600">
                      {['Year', 'Age', 'CPP Income', 'OAS Income', 'Bridge Pension', 'Private Pension', formData.other1_name || 'Other Income 1', formData.other2_name || 'Other Income 2', 'Total Annual Income', 'Inflation Adjusted'].map((header, colIndex) => (
                        <TableHead
                          key={colIndex}
                          onDoubleClick={() => handleHighlight('col', colIndex)}
                          className={`py-3 px-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer transition-colors ${colIndex >=2 && colIndex <= 9 ? 'text-right' : ''} ${getHighlightClass(null, colIndex)}`}
                        >
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                    {projectionData.map((row, rowIndex) => (
                      <TableRow key={rowIndex} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${getHighlightClass(rowIndex, null)}`}>
                        <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 0 })} className={`py-3 px-4 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer transition-colors ${getHighlightClass(rowIndex, 0)}`}>{row.year}</TableCell>
                        <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 1 })} className={`py-3 px-4 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer transition-colors ${getHighlightClass(rowIndex, 1)}`}>{row.age}</TableCell>
                        <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 2 })} className={`py-3 px-4 text-sm text-green-600 dark:text-green-400 whitespace-nowrap text-right cursor-pointer transition-colors ${getHighlightClass(rowIndex, 2)}`}>{formatCurrency(row.cpp)}</TableCell>
                        <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 3 })} className={`py-3 px-4 text-sm text-green-600 dark:text-green-400 whitespace-nowrap text-right cursor-pointer transition-colors ${getHighlightClass(rowIndex, 3)}`}>{formatCurrency(row.oas)}</TableCell>
                        <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 4 })} className={`py-3 px-4 text-sm text-blue-600 dark:text-blue-400 whitespace-nowrap text-right cursor-pointer transition-colors ${getHighlightClass(rowIndex, 4)}`}>{formatCurrency(row.bridgeBenefit)}</TableCell>
                        <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 5 })} className={`py-3 px-4 text-sm text-slate-900 dark:text-slate-100 whitespace-nowrap text-right cursor-pointer transition-colors ${getHighlightClass(rowIndex, 5)}`}>{formatCurrency(row.employerPension)}</TableCell>
                        <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 6 })} className={`py-3 px-4 text-sm text-slate-900 dark:text-slate-100 whitespace-nowrap text-right cursor-pointer transition-colors ${getHighlightClass(rowIndex, 6)}`}>{formatCurrency(row.other1)}</TableCell>
                        <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 7 })} className={`py-3 px-4 text-sm text-slate-900 dark:text-slate-100 whitespace-nowrap text-right cursor-pointer transition-colors ${getHighlightClass(rowIndex, 7)}`}>{formatCurrency(row.other2)}</TableCell>
                        <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 8 })} className={`py-3 px-4 text-sm text-slate-900 dark:text-slate-100 whitespace-nowrap text-right font-semibold cursor-pointer transition-colors ${getHighlightClass(rowIndex, 8)}`}>{formatCurrency(row.totalIncome)}</TableCell>
                        <TableCell onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 9 })} className={`py-3 px-4 text-sm text-slate-600 dark:text-slate-100 whitespace-nowrap text-right cursor-pointer transition-colors ${getHighlightClass(rowIndex, 9)}`}>{formatCurrency(row.inflationAdjustedIncome)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </ShadcnTable>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <GiuseppeAIOptimizer
        calculatorName="Fixed Income Calculator"
        calculatorData={{
          inputs: formData,
          summary: results,
          projection: projectionData,
        }}
      />
    </fieldset>
  );
}

export default forwardRef(FixedIncomeCalculator);

export const extractFixedIncomeComparisonData = (stateData, clients = []) => {
  console.log('[DEBUG] FixedIncome: Starting extraction. Received stateData keys:', Object.keys(stateData || {}));

  if (!stateData || !stateData.formData) {
    console.error('[DEBUG] FixedIncome: Extraction failed. The saved instance state is missing the required `formData` object.');
    return null;
  }

  const { formData } = stateData;
  console.log('[DEBUG] FixedIncome: Found formData. Proceeding with recalculation.', formData);
  
  return calculateFromFormData(formData, clients);
};

const buildComparisonResult = (formData, projectionData, clients) => {
  const totalLifetimeIncome = projectionData.reduce((sum, row) => sum + row.totalAnnualIncome, 0);
  const totalAfterTaxIncome = projectionData.reduce((sum, row) => sum + row.afterTaxIncome, 0);
  const averageAnnualIncome = projectionData.length > 0 ? totalLifetimeIncome / projectionData.length : 0;
  const peakAnnualIncome = projectionData.length > 0 ? Math.max(...projectionData.map(row => row.totalAnnualIncome)) : 0;
  
  const cppLifetimeTotal = projectionData.reduce((sum, row) => sum + row.cppIncome, 0);
  const oasLifetimeTotal = projectionData.reduce((sum, row) => sum + row.oasIncome, 0);

  const finalMetrics = {
    totalLifetimeIncome: Math.round(totalLifetimeIncome),
    totalAfterTaxIncome: Math.round(totalAfterTaxIncome),
    averageAnnualIncome: Math.round(averageAnnualIncome),
    peakAnnualIncome: Math.round(peakAnnualIncome),
    yearsOfIncome: projectionData.length,
    totalTaxesPaid: Math.round(totalLifetimeIncome - totalAfterTaxIncome),
    cppLifetimeTotal: Math.round(cppLifetimeTotal),
    oasLifetimeTotal: Math.round(oasLifetimeTotal)
  };

  let comparisonName = formData.calculator_name || 'Fixed Income Plan';
  
  const clientIds = formData.client_ids || (formData.client_id ? [formData.client_id] : []);
  if (clientIds && clientIds.length > 0 && clients && clients.length > 0) {
    const clientNames = clientIds.map(id => {
      const client = clients.find(c => c && c.id === id);
      return client ? `${client.first_name} ${client.last_name}` : '';
    }).filter(Boolean);
    if (clientNames.length > 0) {
      comparisonName = `${comparisonName} (${clientNames.join(', ')})`;
    }
  }

  const result = {
    name: comparisonName,
    projectionData,
    finalMetrics
  };

  console.log('[DEBUG] FixedIncome: Successfully built comparison result with CPP/OAS totals from recalculated data.');
  return result;
};


const calculateFromFormData = (formData, clients) => {
  let numericCurrentAge = parseFloat(formData.current_age) || 0;
  const numericLifeExpectancy = parseFloat(formData.life_expectancy) || 90;

  console.log('[DEBUG] FixedIncome: Initial ages parsed - Current Age:', numericCurrentAge, 'Life Expectancy:', numericLifeExpectancy);

  // Handle both single 'client_id' and array 'client_ids' for backward compatibility
  const clientIds = formData.client_ids || (formData.client_id ? [formData.client_id] : []);

  // If age is invalid from formData, try to derive it from the client record
  if ((isNaN(numericCurrentAge) || numericCurrentAge <= 0) && clientIds.length > 0 && clients && clients.length > 0) {
    const primaryClientId = clientIds[0];
    const client = clients.find(c => c && c.id === primaryClientId);
    if (client && client.date_of_birth) {
        try {
            const age = differenceInYears(new Date(), new Date(client.date_of_birth));
            if (!isNaN(age) && age > 0) {
                numericCurrentAge = age;
                console.log(`[DEBUG] FixedIncome: Derived age ${age} from client record.`);
            }
        } catch (e) {
            console.error("[DEBUG] FixedIncome: Error deriving age from client's date of birth.", e);
        }
    }
  }
  
  // If still no valid age, use a reasonable default
  if (isNaN(numericCurrentAge) || numericCurrentAge <= 0) {
    numericCurrentAge = 50;
    console.log('[DEBUG] FixedIncome: Using default starting age:', numericCurrentAge);
  }
  
  console.log('[DEBUG] FixedIncome: Final ages - Current Age:', numericCurrentAge, 'Life Expectancy:', numericLifeExpectancy);
  
  if (numericLifeExpectancy <= numericCurrentAge) {
    console.error('[DEBUG] FixedIncome: Life expectancy must be greater than current age - Current:', numericCurrentAge, 'Life Expectancy:', numericLifeExpectancy);
    return null;
  }

  console.log('[DEBUG] FixedIncome: Recalculating from age', numericCurrentAge, 'to', numericLifeExpectancy);

  const govBenefitMax = { 
    max_cpp_annual: 17478.36, 
    max_oas_annual: 8814.24,
    max_oas_annual_75_plus: 9695.66,
  };

  const projectionData = [];
  const currentYear = new Date().getFullYear();

  const maxCPP = govBenefitMax.max_cpp_annual;

  const cppStartAge = parseFloat(formData.cpp_start_age || 65);
  const oasStartAge = parseFloat(formData.oas_start_age || 65);

  const cppMonthsDiff = (cppStartAge - 65) * 12;
  let cppAdjustment = 0;
  if (cppMonthsDiff < 0) {
    cppAdjustment = cppMonthsDiff * 0.006;
  } else {
    cppAdjustment = cppMonthsDiff * 0.007;
  }
  const cppAgeFactor = 1 + cppAdjustment;

  const oasMonthsDiff = Math.max(0, (oasStartAge - 65) * 12);
  const oasAdjustment = Math.min(oasMonthsDiff * 0.006, 0.36);
  const oasAgeFactor = 1 + oasAdjustment;

  for (let age = numericCurrentAge; age <= numericLifeExpectancy; age++) {
    const yearOffset = age - numericCurrentAge;
    
    let cpp = 0;
    if (age >= cppStartAge) {
      cpp = maxCPP * cppAgeFactor * (parseFloat(formData.cpp_factor || 80) / 100) * Math.pow(1 + (parseFloat(formData.inflation_rate || 2.5) / 100), yearOffset);
    }

    let oas = 0;
    if (age >= oasStartAge) {
      const baseMaxOAS = age >= 75 ? govBenefitMax.max_oas_annual_75_plus : govBenefitMax.max_oas_annual;
      oas = baseMaxOAS * oasAgeFactor * (parseFloat(formData.oas_factor || 100) / 100) * Math.pow(1 + (parseFloat(formData.inflation_rate || 2.5) / 100), yearOffset);
    }

    let bridgeBenefit = 0;
    const bridgeAmount = parseFloat(formData.bridge_amount || 0);
    if (age >= parseFloat(formData.bridge_start_age || 0) && age <= parseFloat(formData.bridge_end_age || 0) && bridgeAmount > 0) {
      bridgeBenefit = bridgeAmount * Math.pow(1 + (parseFloat(formData.bridge_index_rate || 0) / 100), yearOffset);
    }
    
    let employerPension = 0;
    const privateAmount = parseFloat(formData.private_amount || 0);
    if (age >= parseFloat(formData.private_start_age || 0) && age <= parseFloat(formData.private_end_age || 0) && privateAmount > 0) {
        employerPension = privateAmount * Math.pow(1 + (parseFloat(formData.private_index_rate || 0) / 100), yearOffset);
    }

    let other1 = 0;
    const other1Amount = parseFloat(formData.other1_amount || 0);
    if (age >= parseFloat(formData.other1_start_age || 0) && age <= parseFloat(formData.other1_end_age || 0) && other1Amount > 0) {
        other1 = other1Amount * Math.pow(1 + (parseFloat(formData.other1_index_rate || 0) / 100), yearOffset);
    }

    let other2 = 0;
    const other2Amount = parseFloat(formData.other2_amount || 0);
    if (age >= parseFloat(formData.other2_start_age || 0) && age <= parseFloat(formData.other2_end_age || 0) && other2Amount > 0) {
        other2 = other2Amount * Math.pow(1 + (parseFloat(formData.other2_index_rate || 0) / 100), yearOffset);
    }

    const totalAnnualIncome = cpp + oas + bridgeBenefit + employerPension + other1 + other2;
    const afterTaxIncome = totalAnnualIncome * (1 - (parseFloat(formData.marginal_tax_rate || 0) / 100));

    projectionData.push({
      year: currentYear + yearOffset,
      age,
      cppIncome: Math.round(cpp),
      oasIncome: Math.round(oas),
      bridgeIncome: Math.round(bridgeBenefit),
      employerPensionIncome: Math.round(employerPension),
      otherIncome1: Math.round(other1),
      otherIncome2: Math.round(other2),
      totalAnnualIncome: Math.round(totalAnnualIncome),
      afterTaxIncome: Math.round(afterTaxIncome),
      cumulativeIncome: 0
    });
  }
  
  if (projectionData.length === 0) {
    console.error('[DEBUG] FixedIncome: Recalculation resulted in zero projection rows.');
    return null;
  }
  
  let cumulativeTotal = 0;
  projectionData.forEach(row => {
    cumulativeTotal += row.totalAnnualIncome;
    row.cumulativeIncome = cumulativeTotal;
  });

  return buildComparisonResult(formData, projectionData, clients);
}


export const generateFixedIncomeIncomeStream = (state_data, instanceName) => {
    try {
        if (!state_data || !state_data.formData) {
            console.warn("generateFixedIncomeIncomeStream: Invalid state_data or formData.", state_data);
            return null;
        }

        const { formData } = state_data;
        const annualIncomeByYear = {};

        const calculationResult = calculateFromFormData(formData, []);
        if (!calculationResult || !calculationResult.projectionData) {
            console.warn("generateFixedIncomeIncomeStream: Failed to generate projection data for income stream.");
            return null;
        }

        calculationResult.projectionData.forEach(row => {
            annualIncomeByYear[row.year] = row.totalAnnualIncome;
        });

        if (Object.keys(annualIncomeByYear).length === 0) {
            console.warn("generateFixedIncomeIncomeStream: No annual income calculated.");
            return null;
        }

        return {
            id: `fixed_${formData.client_ids?.[0] || 'unlinked'}_${Date.now()}`,
            source: instanceName || 'Fixed Income',
            calculatorType: 'fixed_income',
            clientId: formData.client_ids?.[0] || null,
            includeInMainView: true,
            inflationAdjusted: true,
            annualIncomeByYear,
            notes: formData.calculator_name || "Income from fixed income calculator."
        };
    } catch (error) {
        console.error("Error in generateFixedIncomeIncomeStream:", error);
        return null;
    }
};
