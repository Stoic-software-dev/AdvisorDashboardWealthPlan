
import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Home, Calculator, User, Target, DollarSign, Calendar, TrendingDown, Undo2, Table, Download, Loader2 } from "lucide-react";
import { differenceInYears } from "date-fns";
import ClientCombobox from '../shared/ClientCombobox';
import MultiClientSelector from '../shared/MultiClientSelector';
import GiuseppeAIOptimizer from '../shared/GiuseppeAIOptimizer';
import { NetWorthStatement, Liability } from "@/api/entities";
import { useToast } from "@/components/ui/use-toast"; // Corrected import for toast
import { generateMortgagePdf } from "@/api/functions";

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

const emptyFormData = {
  calculator_name: "",
  scenario_details: "",
  client_ids: [],
  goal_id: "",
  current_age: "",
  liability_type: "principal_mortgage",
  ownership_percentage: 0,
  loan_balance: 0,
  interest_rate: 0,
  amortization_years: 30,
  payment_frequency: "monthly",
  planned_extra_payment: 0,
  property_tax_annual: 0,
  insurance_annual: 0,
  maintenance_annual: 0
};

const defaultFormData = {
  client_id: "",
  current_age: 65,
  liability_type: "principal_mortgage",
  ownership_percentage: 50,
  loan_balance: 450000,
  interest_rate: 4.00,
  amortization_years: 30,
  payment_frequency: "monthly",
  planned_extra_payment: 0,
  property_tax_annual: 4000,
  insurance_annual: 1200,
  maintenance_annual: 2400
};

function MortgageCalculator({ clients, goals, portfolios, isLoading, preselectedClientId, initialState, isViewer = false, onNameChange }, ref) {
  const [formData, setFormData] = useState({
    ...emptyFormData,
    client_ids: preselectedClientId ? [preselectedClientId] : []
  });

  const [results, setResults] = useState(null);
  const [amortizationSchedule, setAmortizationSchedule] = useState([]);
  const [displayValues, setDisplayValues] = useState({});
  const [viewMode, setViewMode] = useState("chart");
  const [manualPayments, setManualPayments] = useState({});
  const [refinanceData, setRefinanceData] = useState({});
  const [highlight, setHighlight] = useState({ type: null, index: null, cell: null });
  const [netWorthLiabilities, setNetWorthLiabilities] = useState([]);
  const [loadingLiabilities, setLoadingLiabilities] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast(); // Initialize toast hook

  useImperativeHandle(ref, () => ({
    getState: () => ({
      formData,
      manualPayments,
      refinanceData
    })
  }));

  useEffect(() => {
    if (initialState && typeof initialState === 'object') {
      console.log('DEBUG: MortgageCalculator initializing from saved state:', initialState);
      
      if (initialState.formData) {
        let clientIds = initialState.formData.client_ids;
        if (!clientIds && initialState.formData.client_id) {
          clientIds = [initialState.formData.client_id];
        } else if (!clientIds && preselectedClientId) {
          clientIds = [preselectedClientId];
        } else if (!clientIds) {
          clientIds = [];
        }

        const safeFormData = {
          ...emptyFormData,
          ...initialState.formData,
          client_ids: clientIds,
        };
        
        console.log('DEBUG: Setting formData from saved state:', safeFormData);
        setFormData(safeFormData);
      }
      
      if (initialState.manualPayments) {
        console.log('DEBUG: Setting manualPayments from saved state:', initialState.manualPayments);
        setManualPayments(initialState.manualPayments);
      }
      
      if (initialState.refinanceData) {
        console.log('DEBUG: Setting refinanceData from saved state:', initialState.refinanceData);
        setRefinanceData(initialState.refinanceData);
      }
      
      if (initialState.amortizationSchedule) {
        console.log('DEBUG: Setting amortizationSchedule from saved state');
        setAmortizationSchedule(initialState.amortizationSchedule);
      }
    } else if (preselectedClientId) {
      console.log('DEBUG: No saved state, using preselected client:', preselectedClientId);
      setFormData(prev => ({
        ...prev,
        client_ids: [preselectedClientId],
      }));
    }
  }, [initialState, preselectedClientId]);

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
    setFormData(prev => ({
      ...prev,
      [field]: value === null || value === undefined || value === "null" ? "" : value
    }));
  }, [onNameChange]);

  useEffect(() => {
    const primaryClientId = formData.client_ids?.[0];
    if (primaryClientId && clients) {
      const client = clients.find(c => c.id === primaryClientId);
      if (client && client.date_of_birth) {
        const age = differenceInYears(new Date(), new Date(client.date_of_birth));
        handleFormDataChange('current_age', age);
      } else {
        handleFormDataChange('current_age', emptyFormData.current_age);
      }
      loadNetWorthLiabilities(primaryClientId);
    } else {
      setNetWorthLiabilities([]);
      handleFormDataChange('current_age', emptyFormData.current_age);
    }
  }, [formData.client_ids, clients, handleFormDataChange]);

  const loadNetWorthLiabilities = async (clientId) => {
    if (!clientId) return;

    setLoadingLiabilities(true);
    try {
      const statements = await NetWorthStatement.filter({ client_ids: [clientId] }, '-statement_date', 1);

      if (statements && statements.length > 0) {
        const latestStatement = statements[0];
        const liabilities = await Liability.filter({ statement_id: latestStatement.id });

        const debtLiabilities = (liabilities || []).filter(liability =>
          ['Principal Mortgage', 'Long-Term Debt', 'Short-Term Debt', 'Other Liability'].includes(liability.liability_category)
        );

        setNetWorthLiabilities(debtLiabilities);
      } else {
        setNetWorthLiabilities([]);
      }
    } catch (error) {
      console.error("Error loading Net Worth liabilities:", error);
      setNetWorthLiabilities([]);
    } finally {
      setLoadingLiabilities(false);
    }
  };

  const handleLiabilitySelection = (liabilityId) => {
    if (!liabilityId || liabilityId === 'none' || liabilityId === 'no_liabilities') {
      setFormData(prev => ({
        ...prev,
        loan_balance: emptyFormData.loan_balance,
        liability_type: emptyFormData.liability_type
      }));
      setDisplayValues(prev => ({ ...prev, loan_balance: formatCurrency(emptyFormData.loan_balance) }));
      return;
    }

    const selectedLiability = netWorthLiabilities.find(liability => liability.id === liabilityId);
    if (selectedLiability) {
      const newLoanBalance = selectedLiability.liability_value || 0;

      let liabilityType = 'principal_mortgage';
      switch (selectedLiability.liability_category) {
        case 'Principal Mortgage':
          liabilityType = 'principal_mortgage';
          break;
        case 'Long-Term Debt':
          liabilityType = 'long_term_debt';
          break;
        case 'Short-Term Debt':
          liabilityType = 'short_term_debt';
          break;
        case 'Other Liability':
          liabilityType = 'other_mortgage';
          break;
        default:
          liabilityType = 'principal_mortgage';
      }

      setFormData(prev => ({
        ...prev,
        loan_balance: newLoanBalance,
        liability_type: liabilityType
      }));
      setDisplayValues(prev => ({ ...prev, loan_balance: formatCurrency(newLoanBalance) }));
    }
  };

  useEffect(() => {
    setDisplayValues({
      ownership_percentage: formatPercentage(formData.ownership_percentage),
      loan_balance: formatCurrency(formData.loan_balance),
      interest_rate: formatPercentage(formData.interest_rate),
      planned_extra_payment: formatCurrency(formData.planned_extra_payment),
      property_tax_annual: formatCurrency(formData.property_tax_annual),
      insurance_annual: formatCurrency(formData.insurance_annual),
      maintenance_annual: formatCurrency(formData.maintenance_annual)
    });
  }, [formData]);

  const clientGoals = formData.client_ids && formData.client_ids.length > 0
    ? (goals || []).filter(goal => {
        const goalClientIds = goal.client_ids || (goal.client_id ? [goal.client_id] : []);
        return formData.client_ids.some(selectedId => goalClientIds.includes(selectedId));
      })
    : [];

  const handleDisplayChange = (field, value) => {
    setDisplayValues(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field, type) => {
    const rawValue = parseValue(displayValues[field]);
    const parsed = parseFloat(rawValue);
    let finalValue;

    if (isNaN(parsed) || rawValue === '') {
      switch (field) {
        case 'ownership_percentage':
          finalValue = emptyFormData.ownership_percentage;
          break;
        case 'loan_balance':
          finalValue = emptyFormData.loan_balance;
          break;
        case 'interest_rate':
          finalValue = emptyFormData.interest_rate;
          break;
        case 'planned_extra_payment':
          finalValue = emptyFormData.planned_extra_payment;
          break;
        case 'property_tax_annual':
          finalValue = emptyFormData.property_tax_annual;
          break;
        case 'insurance_annual':
          finalValue = emptyFormData.insurance_annual;
          break;
        case 'maintenance_annual':
          finalValue = emptyFormData.maintenance_annual;
          break;
        default:
          finalValue = 0;
      }
    } else {
      finalValue = parsed;
    }

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
      client_ids: preselectedClientId ? [preselectedClientId] : []
    });
    setResults(null);
    setAmortizationSchedule([]);
    setManualPayments({});
    setRefinanceData({});
    setHighlight({ type: null, index: null, cell: null });
    setNetWorthLiabilities([]);
    setLoadingLiabilities(false);
  };

  const handleManualPaymentChange = (year, value) => {
    setManualPayments(prev => {
      const newPayments = { ...prev };
      const parsedValue = parseFloat(value);

      if (isNaN(parsedValue) || value === '') {
        delete newPayments[year];
      } else {
        newPayments[year] = parsedValue;
      }

      return newPayments;
    });
  };

  const handleRefinanceChange = (year, field, value) => {
    setRefinanceData(prev => {
      const newData = { ...prev };
      const yearData = { ...(newData[year] || {}) };
      
      yearData[field] = value;

      if ((yearData.new_balance === undefined || yearData.new_balance === '') &&
          (yearData.new_rate === undefined || yearData.new_rate === '')) {
        delete newData[year];
      } else {
        newData[year] = yearData;
      }

      return newData;
    });
  };

  const calculateDebtRepayment = useCallback(() => {
    const numericLoanBalance = parseFloat(formData.loan_balance);
    const numericCurrentAge = parseFloat(formData.current_age);

    if (!numericLoanBalance || !numericCurrentAge) {
      setResults(null);
      setAmortizationSchedule([{
        year: new Date().getFullYear(),
        age: numericCurrentAge || 0,
        openingBalance: 0,
        interestRate: 0,
        periodicPayment: 0,
        payment: 0,
        manualPayment: 0,
        refinanceAmount: 0,
        interest: 0,
        principal: 0,
        closingBalance: 0
      }]);
      return;
    }

    const numericInterestRate = parseFloat(formData.interest_rate);
    const numericAmortizationYears = parseFloat(formData.amortization_years);
    const numericPlannedExtra = parseFloat(formData.planned_extra_payment);

    const monthlyRate = numericInterestRate / 100 / 12;
    const totalMonths = numericAmortizationYears * 12;

    let regularPayment = 0;
    if (monthlyRate > 0) {
      regularPayment = numericLoanBalance *
        (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
        (Math.pow(1 + monthlyRate, totalMonths) - 1);
    } else {
      regularPayment = numericLoanBalance / totalMonths;
    }

    let balance = numericLoanBalance;
    let schedule = [];
    let totalInterestAccrued = 0;
    let currentYear = new Date().getFullYear();
    let currentInterestRate = numericInterestRate;
    let currentRegularPayment = regularPayment;

    for (let year = 0; year <= 50 && balance > 0.01; year++) {
      const age = numericCurrentAge + year;
      const beginningBalanceOfPeriod = balance;

      const refinance = refinanceData[year];
      if (refinance) {
        const newBalanceInput = refinance.new_balance;
        const newRateInput = refinance.new_rate;

        const newBalance = parseFloat(newBalanceInput);
        if (!isNaN(newBalance)) {
          balance = newBalance;
        }
        
        const newRate = parseFloat(newRateInput);
        if (!isNaN(newRate)) {
          currentInterestRate = newRate;
          
          const newMonthlyRate = currentInterestRate / 100 / 12;
          const remainingMonths = Math.max(0, (numericAmortizationYears - year) * 12);

          if (newMonthlyRate > 0 && remainingMonths > 0) {
            currentRegularPayment = balance *
              (newMonthlyRate * Math.pow(1 + newMonthlyRate, remainingMonths)) /
              (Math.pow(1 + newMonthlyRate, remainingMonths) - 1);
          } else if (remainingMonths > 0) {
            currentRegularPayment = balance / remainingMonths;
          } else {
            currentRegularPayment = 0;
          }
        }
      }

      const annualInterestForYear = balance > 0 ? balance * (currentInterestRate / 100) : 0;

      const plannedExtraAnnual = numericPlannedExtra * 12;
      const manualPayment = manualPayments[year] || 0;
      const totalAnnualPayment = (currentRegularPayment * 12) + plannedExtraAnnual + manualPayment;

      let principalPaidThisYear = totalAnnualPayment - annualInterestForYear;
      let interestPaidThisYear = annualInterestForYear;

      if (principalPaidThisYear > balance) {
        principalPaidThisYear = balance;
        interestPaidThisYear = balance * (currentInterestRate / 100);
        balance = 0;
      } else {
        balance = balance - principalPaidThisYear;
      }

      totalInterestAccrued += interestPaidThisYear;

      schedule.push({
        year: currentYear + year,
        age,
        openingBalance: Math.round(beginningBalanceOfPeriod),
        interestRate: currentInterestRate,
        periodicPayment: Math.round(currentRegularPayment),
        payment: Math.round(totalAnnualPayment),
        manualPayment: Math.round(manualPayment),
        refinanceAmount: refinance?.new_balance ? Math.round(parseFloat(refinance.new_balance)) : 0,
        interest: Math.round(interestPaidThisYear),
        principal: Math.round(principalPaidThisYear),
        closingBalance: Math.round(balance)
      });

      if (balance <= 0.01) break;
    }

    const finalResults = {
      regularPayment: Math.round(currentRegularPayment),
      annualPayment: Math.round(currentRegularPayment * 12),
      totalInterest: Math.round(totalInterestAccrued),
      totalPayments: Math.round(numericLoanBalance + totalInterestAccrued),
      payoffYear: schedule[schedule.length - 1]?.year || currentYear,
      yearsToPayoff: schedule.length
    };

    setResults(finalResults);
    setAmortizationSchedule(schedule);
  }, [formData, manualPayments, refinanceData, setResults, setAmortizationSchedule]);

  useEffect(() => {
    calculateDebtRepayment();
  }, [calculateDebtRepayment]);

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
        const payload = { formData, results, amortizationSchedule };
        const response = await generateMortgagePdf(payload);

        if (response && response.data) {
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Debt Repayment Report - ${formData.calculator_name || 'Scenario'}.pdf`;
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

  const numericPlannedExtra = parseFloat(formData.planned_extra_payment || '0');

  return (
    <fieldset disabled={isViewer} className="space-y-6">
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-blue-600" />
              Debt Repayment Calculator
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
                  const primaryClientId = selectedIds?.[0];
                  if (!primaryClientId || !clientGoals.some(g => g.id === formData.goal_id)) {
                    handleFormDataChange('goal_id', '');
                  }
                }}
                disabled={isViewer}
                placeholder="Select clients..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="scenario_details">Scenario Details</Label>
                <Input
                    id="scenario_details"
                    value={formData.scenario_details || ''}
                    onChange={(e) => handleFormDataChange('scenario_details', e.target.value)}
                    placeholder="E.g., Base Case, Aggressive Paydown"
                    disabled={isViewer}
                />
            </div>
            <div>
                <Label htmlFor="goal_id">Linked Goal (Optional)</Label>
                <Select
                  value={formData.goal_id || 'no_goal'}
                  onValueChange={(value) => handleFormDataChange('goal_id', value === 'no_goal' ? '' : value)}
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
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Debt Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div>
                <Label htmlFor="current_age">Current Age</Label>
                <Input
                  id="current_age"
                  type="number"
                  value={formData.current_age}
                  onChange={(e) => handleFormDataChange("current_age", e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  placeholder={String(emptyFormData.current_age)}
                  disabled={formData.client_ids.length > 0 || isViewer}
                  readOnly={formData.client_ids.length > 0}
                />
              </div>
              <div>
                <Label htmlFor="ownership_percentage">% Owned</Label>
                <Input
                  id="ownership_percentage"
                  type="text"
                  value={displayValues.ownership_percentage}
                  onChange={(e) => handleDisplayChange("ownership_percentage", e.target.value)}
                  onBlur={() => handleBlur("ownership_percentage", "percentage")}
                  onFocus={() => handleFocus("ownership_percentage")}
                  placeholder={formatPercentage(emptyFormData.ownership_percentage)}
                />
              </div>
              <div>
                <Label htmlFor="loan_balance">Loan Balance</Label>
                <Input
                  id="loan_balance"
                  type="text"
                  value={displayValues.loan_balance}
                  onChange={(e) => handleDisplayChange("loan_balance", e.target.value)}
                  onBlur={() => handleBlur("loan_balance", "currency")}
                  onFocus={() => handleFocus("loan_balance")}
                  placeholder={formatCurrency(emptyFormData.loan_balance)}
                />
              </div>
              <div>
                <Label htmlFor="interest_rate">Interest Rate</Label>
                <Input
                  id="interest_rate"
                  type="text"
                  value={displayValues.interest_rate}
                  onChange={(e) => handleDisplayChange("interest_rate", e.target.value)}
                  onBlur={() => handleBlur("interest_rate", "percentage")}
                  onFocus={() => handleFocus("interest_rate")}
                  placeholder={formatPercentage(emptyFormData.interest_rate)}
                />
              </div>
              <div>
                <Label htmlFor="amortization_years">Amortization (Years)</Label>
                <Input
                  id="amortization_years"
                  type="number"
                  value={formData.amortization_years}
                  onChange={(e) => handleFormDataChange("amortization_years", e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  placeholder={String(emptyFormData.amortization_years)}
                />
              </div>
              <div>
                <Label htmlFor="payment_frequency">Payment Frequency</Label>
                <Select value={formData.payment_frequency} onValueChange={(v) => handleFormDataChange("payment_frequency", v)} disabled={isViewer}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Additional Parameters</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="liability_type">Liability Type</Label>
                <Select value={formData.liability_type} onValueChange={(v) => handleFormDataChange("liability_type", v)} disabled={isViewer}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="principal_mortgage">Principal Mortgage</SelectItem>
                    <SelectItem value="other_mortgage">Other Mortgage</SelectItem>
                    <SelectItem value="long_term_debt">Long-Term Debt</SelectItem>
                    <SelectItem value="short_term_debt">Short-Term Debt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.client_ids.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">Select from Net Worth Statement</Label>
                  <Select onValueChange={handleLiabilitySelection} disabled={loadingLiabilities || isViewer}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingLiabilities ? "Loading liabilities..." : "Choose a liability or enter manually"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Manual Entry</SelectItem>
                      {netWorthLiabilities.length > 0 ? (
                        netWorthLiabilities.map(liability => (
                          <SelectItem key={liability.id} value={liability.id}>
                            {liability.liability_name} - {formatCurrency(liability.liability_value)} ({liability.liability_category})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no_liabilities" disabled>
                          No debt liabilities found for selected primary client
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="planned_extra_payment">Extra Payment (Monthly)</Label>
                <Input
                  id="planned_extra_payment"
                  type="text"
                  value={displayValues.planned_extra_payment}
                  onChange={(e) => handleDisplayChange("planned_extra_payment", e.target.value)}
                  onBlur={() => handleBlur("planned_extra_payment", "currency")}
                  onFocus={() => handleFocus("planned_extra_payment")}
                  placeholder={formatCurrency(emptyFormData.planned_extra_payment)}
                />
              </div>
              <div>
                <Label htmlFor="property_tax_annual">Property Tax (Annual)</Label>
                <Input
                  id="property_tax_annual"
                  type="text"
                  value={displayValues.property_tax_annual}
                  onChange={(e) => handleDisplayChange("property_tax_annual", e.target.value)}
                  onBlur={() => handleBlur("property_tax_annual", "currency")}
                  onFocus={() => handleFocus("property_tax_annual")}
                  placeholder={formatCurrency(emptyFormData.property_tax_annual)}
                />
              </div>
              <div>
                <Label htmlFor="insurance_annual">Insurance (Annual)</Label>
                <Input
                  id="insurance_annual"
                  type="text"
                  value={displayValues.insurance_annual}
                  onChange={(e) => handleDisplayChange("insurance_annual", e.target.value)}
                  onBlur={() => handleBlur("insurance_annual", "currency")}
                  onFocus={() => handleFocus("insurance_annual")}
                  placeholder={formatCurrency(emptyFormData.insurance_annual)}
                />
              </div>
              <div>
                <Label htmlFor="maintenance_annual">Maintenance (Annual)</Label>
                <Input
                  id="maintenance_annual"
                  type="text"
                  value={displayValues.maintenance_annual}
                  onChange={(e) => handleDisplayChange("maintenance_annual", e.target.value)}
                  onBlur={() => handleBlur("maintenance_annual", "currency")}
                  onFocus={() => handleFocus("maintenance_annual")}
                  placeholder={formatCurrency(emptyFormData.maintenance_annual)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {results && (
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-green-600" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    ${results.regularPayment.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-500">Monthly Payment</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {results.yearsToPayoff} years
                  </div>
                  <div className="text-sm text-slate-500">Time to Pay Off</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    ${results.totalInterest.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-500">Total Interest</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    ${results.totalPayments.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-500">Total Payments</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {amortizationSchedule.length > 0 && (
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Repayment Schedule</CardTitle>
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
                    <LineChart data={amortizationSchedule}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={(value) => `$${(value / 1000)}K`} />
                      <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Balance']} />
                      <Legend />
                      <Line type="monotone" dataKey="closingBalance" stroke="#059669" strokeWidth={2} name="Remaining Balance" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr className="border-b border-slate-300 dark:border-slate-600">
                        {['Year', 'Age', 'Balance Start', 'Interest Rate', 'Periodic Payment', 'Annual Payment', 'Manual Payment', 'Refinance', 'Interest Paid', 'Principal Paid', 'Balance End', 'Year #'].map((header, colIndex) => (
                          <th
                            key={colIndex}
                            onDoubleClick={() => handleHighlight('col', colIndex)}
                            className={`py-3 px-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider sticky top-0 bg-slate-50 dark:bg-slate-800 cursor-pointer transition-colors ${getHighlightClass(null, colIndex)}`}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                      {amortizationSchedule.map((row, rowIndex) => (
                        <tr key={rowIndex} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${getHighlightClass(rowIndex, null)} ${row.closingBalance < 0 ? 'bg-red-50 dark:bg-red-900/30' : ''}`}>
                          <td onDoubleClick={() => handleHighlight('row', rowIndex)} className={`py-2 px-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer transition-colors text-center`}>{row.year}</td>
                          <td className="py-2 px-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap text-center">{row.age}</td>
                          <td className={`py-2 px-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer transition-colors text-right`}>{formatCurrency(row.openingBalance)}</td>
                          <td onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 3 })} className={`py-2 px-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer transition-colors text-right ${getHighlightClass(rowIndex, 3)}`}>{formatPercentage(row.interestRate)}</td>
                          <td onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 4 })} className={`py-2 px-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer transition-colors text-right ${getHighlightClass(rowIndex, 4)}`}>{formatCurrency(row.periodicPayment)}</td>
                          <td onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 5 })} className={`py-2 px-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer transition-colors text-right ${getHighlightClass(rowIndex, 5)}`}>{formatCurrency(row.payment)}</td>
                          <td className="p-1">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                              <Input
                                type="number"
                                placeholder="0"
                                className="text-right h-8 text-sm pl-7"
                                value={manualPayments[rowIndex] || ''}
                                onChange={(e) => handleManualPaymentChange(rowIndex, e.target.value)}
                                disabled={isViewer}
                              />
                            </div>
                          </td>
                          <td className="p-1">
                            <div className="flex flex-col gap-1">
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                                <Input
                                  type="number"
                                  placeholder="New Balance"
                                  className="text-right h-8 text-xs pl-6"
                                  value={refinanceData[rowIndex]?.new_balance || ''}
                                  onChange={(e) => handleRefinanceChange(rowIndex, 'new_balance', e.target.value)}
                                  disabled={isViewer}
                                />
                              </div>
                              <div className="relative">
                                <Input
                                  type="number"
                                  placeholder="New Rate"
                                  className="text-right h-8 text-xs pr-6"
                                  value={refinanceData[rowIndex]?.new_rate || ''}
                                  onChange={(e) => handleRefinanceChange(rowIndex, 'new_rate', e.target.value)}
                                  disabled={isViewer}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                              </div>
                            </div>
                          </td>
                          <td onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 8 })} className={`py-2 px-2 text-sm text-red-600 dark:text-red-400 whitespace-nowrap cursor-pointer transition-colors text-right ${getHighlightClass(rowIndex, 8)}`}>{formatCurrency(row.interest)}</td>
                          <td onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 9 })} className={`py-2 px-2 text-sm text-green-600 dark:text-green-400 whitespace-nowrap cursor-pointer transition-colors text-right ${getHighlightClass(rowIndex, 9)}`}>{formatCurrency(row.principal)}</td>
                          <td onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 10 })} className={`py-2 px-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer transition-colors text-right font-semibold ${row.closingBalance < 0 ? 'text-red-600' : ''} ${getHighlightClass(rowIndex, 10)}`}>{formatCurrency(row.closingBalance)}</td>
                          <td onDoubleClick={() => handleHighlight('cell', null, { row: rowIndex, col: 11 })} className={`py-2 px-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer transition-colors text-center ${getHighlightClass(rowIndex, 11)}`}>{rowIndex + 1}</td>
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
        calculatorName="Debt Repayment Calculator"
        calculatorData={{
          inputs: formData,
          paymentSummary: results,
          amortizationSchedule: amortizationSchedule,
          manualPayments: manualPayments,
          refinanceData: refinanceData,
        }}
      />
    </fieldset>
  );
}

export const extractMortgageComparisonData = (stateData, clients = []) => {
  if (!stateData || !stateData.formData) {
    return null;
  }

  const { formData, manualPayments = {}, refinanceData = {} } = stateData;

  const getClientName = (clientId) => {
    if (!clients || !Array.isArray(clients)) return '';
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : '';
  };

  const numericLoanBalance = parseFloat(formData.loan_balance) || 0;
  const numericCurrentAge = parseFloat(formData.current_age) || 0;
  const numericInterestRate = parseFloat(formData.interest_rate) || 0;
  const numericAmortizationYears = parseFloat(formData.amortization_years) || 30;
  const numericPlannedExtra = parseFloat(formData.planned_extra_payment) || 0;

  if (numericLoanBalance === 0) {
    return null;
  }

  const monthlyRate = numericInterestRate / 100 / 12;
  const totalMonths = numericAmortizationYears * 12;

  let regularPayment = 0;
  if (monthlyRate > 0) {
    regularPayment = numericLoanBalance *
      (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
      (Math.pow(1 + monthlyRate, totalMonths) - 1);
  } else {
    regularPayment = numericLoanBalance / totalMonths;
  }

  let balance = numericLoanBalance;
  let totalInterestAccrued = 0;
  let totalPaymentsMade = 0;
  let currentYear = new Date().getFullYear();

  let currentInterestRate = numericInterestRate;
  let currentRegularPayment = regularPayment;

  const projectionData = [];

  for (let year = 0; year <= 50 && balance > 0.01; year++) {
    const age = numericCurrentAge + year;
    const beginningBalanceOfPeriod = balance;

    const refinance = refinanceData[year];
    if (refinance) {
      const newBalanceInput = refinance.new_balance;
      const newRateInput = refinance.new_rate;

      const newBalance = parseFloat(newBalanceInput);
      if (!isNaN(newBalance)) {
        balance = newBalance;
      }
      
      const newRate = parseFloat(newRateInput);
      if (!isNaN(newRate)) {
        currentInterestRate = newRate;
        const newMonthlyRate = currentInterestRate / 100 / 12;
        const remainingMonths = Math.max(0, (numericAmortizationYears - year) * 12);

        if (newMonthlyRate > 0 && remainingMonths > 0) {
          currentRegularPayment = balance *
            (newMonthlyRate * Math.pow(1 + newMonthlyRate, remainingMonths)) /
            (Math.pow(1 + newMonthlyRate, remainingMonths) - 1);
        } else if (remainingMonths > 0) {
          currentRegularPayment = balance / remainingMonths;
        } else {
          currentRegularPayment = 0;
        }
      }
    }

    const annualInterestForYear = balance > 0 ? balance * (currentInterestRate / 100) : 0;

    const plannedExtraAnnual = numericPlannedExtra * 12;
    const manualPayment = manualPayments[year] || 0;
    const totalAnnualPayment = (currentRegularPayment * 12) + plannedExtraAnnual + manualPayment;

    let principalPaidThisYear = totalAnnualPayment - annualInterestForYear;
    let interestPaidThisYear = annualInterestForYear;

    if (principalPaidThisYear > balance) {
      principalPaidThisYear = balance;
      interestPaidThisYear = balance * (currentInterestRate / 100);
      balance = 0;
    } else {
      balance = balance - principalPaidThisYear;
    }

    totalInterestAccrued += interestPaidThisYear;
    totalPaymentsMade += totalAnnualPayment;

    const remainingAmortizationYears = balance > 0 ? Math.max(0, numericAmortizationYears - year) : 0;

    projectionData.push({
      year: currentYear + year,
      age,
      openingBalance: Math.round(beginningBalanceOfPeriod),
      interestRate: currentInterestRate,
      periodicPayment: Math.round(currentRegularPayment),
      payment: Math.round(totalAnnualPayment),
      manualPayment: Math.round(manualPayment),
      refinanceAmount: refinance?.new_balance ? Math.round(parseFloat(refinance.new_balance)) : 0,
      interest: Math.round(interestPaidThisYear),
      principal: Math.round(principalPaidThisYear),
      closingBalance: Math.round(balance),
      remainingAmortization: remainingAmortizationYears,
      cumulativeTotalInterest: Math.round(totalInterestAccrued),
      cumulativeTotalPayments: Math.round(totalPaymentsMade),
      endingBalance: Math.round(balance)
    });

    if (balance <= 0.01) break;
  }

  let comparisonName = formData.calculator_name || 'Debt Repayment';
  if (formData.scenario_details) {
    comparisonName = `${comparisonName} - ${formData.scenario_details}`;
  }

  const clientIds = formData.client_ids || (formData.client_id ? [formData.client_id] : []);
  
  if (clientIds && clientIds.length > 0) {
    const clientNames = clientIds.map(id => getClientName(id)).filter(name => name !== '');
    if (clientNames.length > 0) {
      comparisonName = `${comparisonName} (${clientNames.join(', ')})`;
    }
  }

  return {
    name: comparisonName,
    projectionData,
    finalMetrics: {
      totalInterestPaid: Math.round(totalInterestAccrued),
      totalPaymentsMade: Math.round(totalPaymentsMade),
      endingLoanBalance: Math.round(balance),
      remainingAmortization: balance > 0 ? Math.max(0, numericAmortizationYears - projectionData.length) : 0,
      yearsToPayoff: projectionData.length,
      payoffYear: projectionData[projectionData.length - 1]?.year || currentYear
    }
  };
};

export default forwardRef(MortgageCalculator);
