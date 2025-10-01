
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { Calculator, TrendingUp, DollarSign, Home, Building, CreditCard, RotateCcw, ArrowLeftRight } from "lucide-react";
import MultiClientSelector from "../shared/MultiClientSelector";
import GiuseppeAIOptimizer from "../shared/GiuseppeAIOptimizer";

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
  scenario_type: "investment_comparison",
  time_horizon: 20,
  inflation_rate: 2.5,
  
  // Option A - Generic Investment/Strategy
  option_a_name: "Option A",
  option_a_initial_amount: 0,
  option_a_monthly_contribution: 0,
  option_a_annual_return: 7,
  option_a_mer: 0,
  option_a_tax_treatment: "non_registered",
  
  // Option B - Generic Investment/Strategy  
  option_b_name: "Option B",
  option_b_initial_amount: 0,
  option_b_monthly_contribution: 0,
  option_b_annual_return: 5,
  option_b_mer: 0,
  option_b_tax_treatment: "non_registered",
  
  // Debt-specific fields (for invest vs debt scenarios)
  debt_balance: 0,
  debt_interest_rate: 4,
  debt_monthly_payment: 0,
  debt_amortization_years: 25,
  extra_payment_amount: 0,
  
  // Real Estate specific fields (for own vs rent)
  home_purchase_price: 0,
  down_payment_percentage: 20,
  mortgage_interest_rate: 4.5,
  mortgage_amortization: 25,
  annual_property_taxes: 0,
  annual_insurance: 0,
  annual_maintenance_percentage: 1,
  home_appreciation_rate: 3,
  closing_costs: 0,
  
  // Rent specific fields
  monthly_rent: 0,
  annual_rent_increase: 2,
  tenant_insurance: 0,
  
  // Tax rates
  marginal_tax_rate: 35,
  capital_gains_tax_rate: 17.5
};

const CostBenefitCalculator = forwardRef(({ initialState, clients, goals, isLoading, isViewer = false, onNameChange }, ref) => {
  const [formData, setFormData] = useState(emptyFormData);
  const [displayValues, setDisplayValues] = useState({});
  const [results, setResults] = useState(null);
  const [projectionData, setProjectionData] = useState([]);
  const [viewMode, setViewMode] = useState("summary");

  // Update display values whenever formData changes
  useEffect(() => {
    setDisplayValues({
      option_a_initial_amount: formatCurrency(formData.option_a_initial_amount),
      option_a_monthly_contribution: formatCurrency(formData.option_a_monthly_contribution),
      option_a_annual_return: formatPercentage(formData.option_a_annual_return),
      option_a_mer: formatPercentage(formData.option_a_mer),
      option_b_initial_amount: formatCurrency(formData.option_b_initial_amount),
      option_b_monthly_contribution: formatCurrency(formData.option_b_monthly_contribution),
      option_b_annual_return: formatPercentage(formData.option_b_annual_return),
      option_b_mer: formatPercentage(formData.option_b_mer),
      debt_balance: formatCurrency(formData.debt_balance),
      debt_interest_rate: formatPercentage(formData.debt_interest_rate),
      debt_monthly_payment: formatCurrency(formData.debt_monthly_payment),
      extra_payment_amount: formatCurrency(formData.extra_payment_amount),
      home_purchase_price: formatCurrency(formData.home_purchase_price),
      down_payment_percentage: formatPercentage(formData.down_payment_percentage),
      mortgage_interest_rate: formatPercentage(formData.mortgage_interest_rate),
      annual_property_taxes: formatCurrency(formData.annual_property_taxes),
      annual_insurance: formatCurrency(formData.annual_insurance),
      annual_maintenance_percentage: formatPercentage(formData.annual_maintenance_percentage),
      home_appreciation_rate: formatPercentage(formData.home_appreciation_rate),
      closing_costs: formatCurrency(formData.closing_costs),
      monthly_rent: formatCurrency(formData.monthly_rent),
      annual_rent_increase: formatPercentage(formData.annual_rent_increase),
      tenant_insurance: formatCurrency(formData.tenant_insurance),
      inflation_rate: formatPercentage(formData.inflation_rate),
      marginal_tax_rate: formatPercentage(formData.marginal_tax_rate),
      capital_gains_tax_rate: formatPercentage(formData.capital_gains_tax_rate)
    });
  }, [formData]);

  // Load initial state if provided
  useEffect(() => {
    if (initialState?.formData) {
      setFormData(prev => ({ ...prev, ...initialState.formData }));
      if (initialState.results) {
        setResults(initialState.results);
      }
      if (initialState.projectionData) {
        setProjectionData(initialState.projectionData);
      }
    }
  }, [initialState]);

  // Expose getState method for parent component
  useImperativeHandle(ref, () => ({
    getState: () => ({
      formData,
      results,
      projectionData
    })
  }));

  const handleInputChange = (field, value) => {
    if (field === 'calculator_name' && onNameChange) {
      onNameChange(value);
    }
    setFormData(prev => ({
      ...prev,
      [field]: value === null || value === undefined || value === "null" ? "" : value
    }));
  };

  const handleDisplayChange = (field, value) => {
    setDisplayValues(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field, type) => {
    const rawValue = parseValue(displayValues[field]);
    const parsed = parseFloat(rawValue);
    const finalValue = !isNaN(parsed) ? parsed : 0;
    
    handleInputChange(field, finalValue);

    if (type === 'currency') setDisplayValues(prev => ({ ...prev, [field]: formatCurrency(finalValue) }));
    if (type === 'percentage') setDisplayValues(prev => ({ ...prev, [field]: formatPercentage(finalValue) }));
  };

  const handleFocus = (field) => {
    setDisplayValues(prev => ({ ...prev, [field]: parseValue(prev[field]) }));
  };

  const calculateInvestmentOption = (optionPrefix, years) => {
    const initialAmount = parseFloat(formData[`${optionPrefix}_initial_amount`]) || 0;
    const monthlyContribution = parseFloat(formData[`${optionPrefix}_monthly_contribution`]) || 0;
    const annualReturn = (parseFloat(formData[`${optionPrefix}_annual_return`]) || 0) / 100;
    const mer = (parseFloat(formData[`${optionPrefix}_mer`]) || 0) / 100;
    const taxTreatment = formData[`${optionPrefix}_tax_treatment`];
    
    const netReturn = annualReturn - mer;
    const monthlyReturn = netReturn / 12;
    
    let projection = [];
    let balance = initialAmount;
    let totalContributions = initialAmount;
    let totalTaxesPaid = 0;
    
    for (let year = 0; year <= years; year++) {
      const yearStart = balance;
      
      // Add monthly contributions throughout the year
      for (let month = 0; month < 12; month++) {
        if (year > 0 || month > 0) { // Don't add contribution in first month of first year
          balance += monthlyContribution;
          totalContributions += monthlyContribution;
        }
        balance = balance * (1 + monthlyReturn);
      }
      
      // Calculate taxes if non-registered
      let yearlyTax = 0;
      if (taxTreatment === 'non_registered') {
        const growth = balance - yearStart - (monthlyContribution * 12);
        if (growth > 0) {
          yearlyTax = growth * (parseFloat(formData.capital_gains_tax_rate) / 100);
          balance -= yearlyTax;
          totalTaxesPaid += yearlyTax;
        }
      }
      
      projection.push({
        year: new Date().getFullYear() + year,
        balance: Math.round(balance),
        contributions: Math.round(totalContributions),
        taxes: Math.round(totalTaxesPaid)
      });
    }
    
    return {
      projection,
      finalBalance: balance,
      totalContributions,
      totalGrowth: balance - totalContributions,
      totalTaxesPaid
    };
  };

  const calculateDebtPaydown = (years) => {
    const debtBalance = parseFloat(formData.debt_balance) || 0;
    const interestRate = (parseFloat(formData.debt_interest_rate) || 0) / 100;
    const monthlyPayment = parseFloat(formData.debt_monthly_payment) || 0;
    const extraPayment = parseFloat(formData.extra_payment_amount) || 0;
    
    const monthlyRate = interestRate / 12;
    let balance = debtBalance;
    let totalInterestPaid = 0;
    let projection = [];
    
    for (let year = 0; year <= years; year++) {
      const yearStart = balance;
      let yearlyInterest = 0;
      
      for (let month = 0; month < 12 && balance > 0; month++) {
        const interestPayment = balance * monthlyRate;
        const principalPayment = Math.min(balance, (monthlyPayment + extraPayment) - interestPayment);
        
        balance -= principalPayment;
        yearlyInterest += interestPayment;
        totalInterestPaid += interestPayment;
      }
      
      projection.push({
        year: new Date().getFullYear() + year,
        balance: Math.round(Math.max(0, balance)),
        interestPaid: Math.round(totalInterestPaid),
        debtReduction: Math.round(debtBalance - balance)
      });
      
      if (balance <= 0) break;
    }
    
    return {
      projection,
      finalDebtBalance: Math.max(0, balance),
      totalInterestSaved: totalInterestPaid,
      debtReduction: debtBalance - Math.max(0, balance)
    };
  };

  const calculateOwnVsRent = (years) => {
    const purchasePrice = parseFloat(formData.home_purchase_price) || 0;
    const downPaymentPct = (parseFloat(formData.down_payment_percentage) || 0) / 100;
    const mortgageRate = (parseFloat(formData.mortgage_interest_rate) || 0) / 100;
    const amortization = parseFloat(formData.mortgage_amortization) || 25;
    const propertyTaxes = parseFloat(formData.annual_property_taxes) || 0;
    const insurance = parseFloat(formData.annual_insurance) || 0;
    const maintenancePct = (parseFloat(formData.annual_maintenance_percentage) || 0) / 100;
    const appreciationRate = (parseFloat(formData.home_appreciation_rate) || 0) / 100;
    const closingCosts = parseFloat(formData.closing_costs) || 0;
    
    const monthlyRent = parseFloat(formData.monthly_rent) || 0;
    const rentIncrease = (parseFloat(formData.annual_rent_increase) || 0) / 100;
    const tenantInsurance = parseFloat(formData.tenant_insurance) || 0;
    
    const inflationRate = (parseFloat(formData.inflation_rate) || 0) / 100;
    const investmentReturn = 0.07; // Assume 7% for invested savings
    
    // Own scenario calculations
    const downPayment = purchasePrice * downPaymentPct;
    const mortgageAmount = purchasePrice - downPayment;
    const monthlyMortgageRate = mortgageRate / 12;
    const totalPayments = amortization * 12;
    
    let monthlyMortgagePayment = 0;
    if (monthlyMortgageRate > 0) {
      monthlyMortgagePayment = mortgageAmount * 
        (monthlyMortgageRate * Math.pow(1 + monthlyMortgageRate, totalPayments)) /
        (Math.pow(1 + monthlyMortgageRate, totalPayments) - 1);
    } else {
      monthlyMortgagePayment = mortgageAmount / totalPayments;
    }
    
    // Rent scenario calculations
    const initialInvestment = downPayment + closingCosts;
    let rentBalance = initialInvestment;
    
    let ownProjection = [];
    let rentProjection = [];
    let homeValue = purchasePrice;
    let mortgageBalance = mortgageAmount;
    let currentRent = monthlyRent;
    let ownTotalCosts = downPayment + closingCosts;
    let rentTotalCosts = 0;
    
    for (let year = 0; year <= years; year++) {
      // Own scenario
      const yearlyPropertyTax = propertyTaxes * Math.pow(1 + inflationRate, year);
      const yearlyInsurance = insurance * Math.pow(1 + inflationRate, year);
      const yearlyMaintenance = homeValue * maintenancePct;
      
      const yearlyMortgagePayments = monthlyMortgagePayment * 12;
      const yearlyOwnCosts = yearlyMortgagePayments + yearlyPropertyTax + yearlyInsurance + yearlyMaintenance;
      
      // Calculate mortgage balance reduction
      let yearlyPrincipal = 0;
      for (let month = 0; month < 12 && mortgageBalance > 0; month++) {
        const interestPayment = mortgageBalance * monthlyMortgageRate;
        const principalPayment = Math.min(mortgageBalance, monthlyMortgagePayment - interestPayment);
        mortgageBalance -= principalPayment;
        yearlyPrincipal += principalPayment;
      }
      
      homeValue = homeValue * (1 + appreciationRate);
      ownTotalCosts += yearlyOwnCosts;
      
      // Rent scenario
      const yearlyRent = currentRent * 12;
      const yearlyTenantInsurance = tenantInsurance * Math.pow(1 + inflationRate, year);
      const yearlyRentCosts = yearlyRent + yearlyTenantInsurance;
      
      // Calculate monthly savings from renting vs owning
      const monthlySavings = Math.max(0, (yearlyOwnCosts - yearlyRentCosts) / 12);
      
      // Invest the savings
      for (let month = 0; month < 12; month++) {
        rentBalance = rentBalance * (1 + investmentReturn / 12) + monthlySavings;
      }
      
      rentTotalCosts += yearlyRentCosts;
      currentRent = currentRent * (1 + rentIncrease);
      
      ownProjection.push({
        year: new Date().getFullYear() + year,
        homeValue: Math.round(homeValue),
        mortgageBalance: Math.round(Math.max(0, mortgageBalance)),
        equity: Math.round(homeValue - Math.max(0, mortgageBalance)),
        totalCosts: Math.round(ownTotalCosts)
      });
      
      rentProjection.push({
        year: new Date().getFullYear() + year,
        investmentBalance: Math.round(rentBalance),
        totalRentPaid: Math.round(rentTotalCosts),
        netWorth: Math.round(rentBalance)
      });
    }
    
    return {
      ownProjection,
      rentProjection,
      ownNetWorth: homeValue - Math.max(0, mortgageBalance),
      rentNetWorth: rentBalance,
      ownTotalCosts,
      rentTotalCosts
    };
  };

  const runComparison = () => {
    const years = parseInt(formData.time_horizon) || 20;
    let calculatedResults = {};
    let calculatedProjection = [];
    
    if (formData.scenario_type === "investment_comparison") {
      const optionA = calculateInvestmentOption("option_a", years);
      const optionB = calculateInvestmentOption("option_b", years);
      
      calculatedResults = {
        optionA: {
          name: formData.option_a_name,
          finalBalance: optionA.finalBalance,
          totalContributions: optionA.totalContributions,
          totalGrowth: optionA.totalGrowth,
          totalTaxesPaid: optionA.totalTaxesPaid,
          netReturn: ((optionA.finalBalance - optionA.totalContributions) / optionA.totalContributions) * 100
        },
        optionB: {
          name: formData.option_b_name,
          finalBalance: optionB.finalBalance,
          totalContributions: optionB.totalContributions,
          totalGrowth: optionB.totalGrowth,
          totalTaxesPaid: optionB.totalTaxesPaid,
          netReturn: ((optionB.finalBalance - optionB.totalContributions) / optionB.totalContributions) * 100
        },
        advantage: optionA.finalBalance > optionB.finalBalance ? "A" : "B",
        difference: Math.abs(optionA.finalBalance - optionB.finalBalance)
      };
      
      // Combine projections for charting
      calculatedProjection = optionA.projection.map((item, index) => ({
        year: item.year,
        optionA: item.balance,
        optionB: optionB.projection[index]?.balance || 0
      }));
      
    } else if (formData.scenario_type === "invest_vs_debt") {
      const investment = calculateInvestmentOption("option_a", years);
      const debtPaydown = calculateDebtPaydown(years);
      
      calculatedResults = {
        investment: {
          finalBalance: investment.finalBalance,
          totalContributions: investment.totalContributions,
          totalGrowth: investment.totalGrowth,
          totalTaxesPaid: investment.totalTaxesPaid
        },
        debtPaydown: {
          finalDebtBalance: debtPaydown.finalDebtBalance,
          totalInterestSaved: debtPaydown.totalInterestSaved,
          debtReduction: debtPaydown.debtReduction
        },
        netWorthInvestment: investment.finalBalance - (parseFloat(formData.debt_balance) || 0),
        netWorthDebtPaydown: debtPaydown.debtReduction,
        advantage: (investment.finalBalance - (parseFloat(formData.debt_balance) || 0)) > debtPaydown.debtReduction ? "investment" : "debt_paydown"
      };
      
    } else if (formData.scenario_type === "own_vs_rent") {
      const comparison = calculateOwnVsRent(years);
      
      calculatedResults = {
        own: {
          netWorth: comparison.ownNetWorth,
          totalCosts: comparison.ownTotalCosts,
          homeValue: comparison.ownProjection[comparison.ownProjection.length - 1]?.homeValue || 0,
          equity: comparison.ownProjection[comparison.ownProjection.length - 1]?.equity || 0
        },
        rent: {
          netWorth: comparison.rentNetWorth,
          totalCosts: comparison.rentTotalCosts,
          investmentBalance: comparison.rentProjection[comparison.rentProjection.length - 1]?.investmentBalance || 0
        },
        advantage: comparison.ownNetWorth > comparison.rentNetWorth ? "own" : "rent",
        difference: Math.abs(comparison.ownNetWorth - comparison.rentNetWorth)
      };
      
      calculatedProjection = comparison.ownProjection.map((item, index) => ({
        year: item.year,
        ownNetWorth: item.equity,
        rentNetWorth: comparison.rentProjection[index]?.netWorth || 0
      }));
    }
    
    setResults(calculatedResults);
    setProjectionData(calculatedProjection);
  };

  const resetCalculator = () => {
    setFormData({
      ...emptyFormData,
      client_ids: formData.client_ids // Keep client selection
    });
    setResults(null);
    setProjectionData([]);
  };

  const getScenarioTitle = () => {
    switch (formData.scenario_type) {
      case "investment_comparison": return "Investment Comparison";
      case "invest_vs_debt": return "Invest vs. Pay Down Debt";
      case "own_vs_rent": return "Own vs. Rent Analysis";
      default: return "Cost/Benefit Analysis";
    }
  };

  const clientGoals = formData.client_ids && formData.client_ids.length > 0
    ? (goals || []).filter(goal => {
        const goalClientIds = goal.client_ids || (goal.client_id ? [goal.client_id] : []);
        return formData.client_ids.some(selectedId => goalClientIds.includes(selectedId));
      })
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <fieldset disabled={isViewer} className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                Cost/Benefit Calculator
              </CardTitle>
              <Button variant="outline" onClick={resetCalculator}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="calculator_name">Calculator Name</Label>
                <Input
                  id="calculator_name"
                  value={formData.calculator_name}
                  onChange={(e) => handleInputChange('calculator_name', e.target.value)}
                  placeholder="Enter calculator name"
                  disabled={isViewer}
                />
              </div>
              <div>
                <Label>Associated Clients</Label>
                <MultiClientSelector
                  clients={clients}
                  selectedClientIds={formData.client_ids}
                  onSelectionChange={(selectedIds) => handleInputChange('client_ids', selectedIds)}
                  disabled={isViewer}
                  placeholder="Select clients..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="scenario_type">Comparison Type</Label>
                <Select value={formData.scenario_type} onValueChange={(v) => handleInputChange("scenario_type", v)} disabled={isViewer}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="investment_comparison">Investment Comparison</SelectItem>
                    <SelectItem value="invest_vs_debt">Invest vs. Pay Down Debt</SelectItem>
                    <SelectItem value="own_vs_rent">Own vs. Rent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="time_horizon">Time Horizon (Years)</Label>
                <Input
                  id="time_horizon"
                  type="number"
                  value={formData.time_horizon}
                  onChange={(e) => handleInputChange("time_horizon", parseInt(e.target.value) || 0)}
                  placeholder="20"
                  disabled={isViewer}
                />
              </div>
              <div>
                <Label htmlFor="inflation_rate">Inflation Rate</Label>
                <Input
                  id="inflation_rate"
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
          </CardContent>
        </Card>

        {/* Dynamic Input Sections */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>{getScenarioTitle()} - Input Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="option-a" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="option-a">
                  {formData.scenario_type === "investment_comparison" ? formData.option_a_name || "Option A" :
                   formData.scenario_type === "invest_vs_debt" ? "Investment Option" :
                   "Own Home"}
                </TabsTrigger>
                <TabsTrigger value="option-b">
                  {formData.scenario_type === "investment_comparison" ? formData.option_b_name || "Option B" :
                   formData.scenario_type === "invest_vs_debt" ? "Pay Down Debt" :
                   "Rent Home"}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="option-a" className="space-y-6">
                {formData.scenario_type === "investment_comparison" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="option_a_name">Option A Name</Label>
                      <Input
                        id="option_a_name"
                        value={formData.option_a_name}
                        onChange={(e) => handleInputChange('option_a_name', e.target.value)}
                        placeholder="Stock Portfolio"
                        disabled={isViewer}
                      />
                    </div>
                    <div>
                      <Label htmlFor="option_a_initial_amount">Initial Investment</Label>
                      <Input
                        id="option_a_initial_amount"
                        type="text"
                        value={displayValues.option_a_initial_amount || ''}
                        onChange={(e) => handleDisplayChange("option_a_initial_amount", e.target.value)}
                        onBlur={() => handleBlur("option_a_initial_amount", "currency")}
                        onFocus={() => handleFocus("option_a_initial_amount")}
                        placeholder="$100,000"
                        disabled={isViewer}
                      />
                    </div>
                    <div>
                      <Label htmlFor="option_a_monthly_contribution">Monthly Contribution</Label>
                      <Input
                        id="option_a_monthly_contribution"
                        type="text"
                        value={displayValues.option_a_monthly_contribution || ''}
                        onChange={(e) => handleDisplayChange("option_a_monthly_contribution", e.target.value)}
                        onBlur={() => handleBlur("option_a_monthly_contribution", "currency")}
                        onFocus={() => handleFocus("option_a_monthly_contribution")}
                        placeholder="$1,000"
                        disabled={isViewer}
                      />
                    </div>
                    <div>
                      <Label htmlFor="option_a_annual_return">Expected Annual Return</Label>
                      <Input
                        id="option_a_annual_return"
                        type="text"
                        value={displayValues.option_a_annual_return || ''}
                        onChange={(e) => handleDisplayChange("option_a_annual_return", e.target.value)}
                        onBlur={() => handleBlur("option_a_annual_return", "percentage")}
                        onFocus={() => handleFocus("option_a_annual_return")}
                        placeholder="7.00%"
                        disabled={isViewer}
                      />
                    </div>
                    <div>
                      <Label htmlFor="option_a_mer">Management Fee (MER)</Label>
                      <Input
                        id="option_a_mer"
                        type="text"
                        value={displayValues.option_a_mer || ''}
                        onChange={(e) => handleDisplayChange("option_a_mer", e.target.value)}
                        onBlur={() => handleBlur("option_a_mer", "percentage")}
                        onFocus={() => handleFocus("option_a_mer")}
                        placeholder="0.50%"
                        disabled={isViewer}
                      />
                    </div>
                    <div>
                      <Label htmlFor="option_a_tax_treatment">Tax Treatment</Label>
                      <Select value={formData.option_a_tax_treatment} onValueChange={(v) => handleInputChange("option_a_tax_treatment", v)} disabled={isViewer}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="non_registered">Non-Registered</SelectItem>
                          <SelectItem value="registered">Registered (RRSP)</SelectItem>
                          <SelectItem value="tfsa">Tax-Free (TFSA)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {formData.scenario_type === "invest_vs_debt" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="option_a_initial_amount">Initial Investment</Label>
                      <Input
                        id="option_a_initial_amount"
                        type="text"
                        value={displayValues.option_a_initial_amount || ''}
                        onChange={(e) => handleDisplayChange("option_a_initial_amount", e.target.value)}
                        onBlur={() => handleBlur("option_a_initial_amount", "currency")}
                        onFocus={() => handleFocus("option_a_initial_amount")}
                        placeholder="$50,000"
                        disabled={isViewer}
                      />
                    </div>
                    <div>
                      <Label htmlFor="option_a_monthly_contribution">Monthly Investment</Label>
                      <Input
                        id="option_a_monthly_contribution"
                        type="text"
                        value={displayValues.option_a_monthly_contribution || ''}
                        onChange={(e) => handleDisplayChange("option_a_monthly_contribution", e.target.value)}
                        onBlur={() => handleBlur("option_a_monthly_contribution", "currency")}
                        onFocus={() => handleFocus("option_a_monthly_contribution")}
                        placeholder="$500"
                        disabled={isViewer}
                      />
                    </div>
                    <div>
                      <Label htmlFor="option_a_annual_return">Expected Annual Return</Label>
                      <Input
                        id="option_a_annual_return"
                        type="text"
                        value={displayValues.option_a_annual_return || ''}
                        onChange={(e) => handleDisplayChange("option_a_annual_return", e.target.value)}
                        onBlur={() => handleBlur("option_a_annual_return", "percentage")}
                        onFocus={() => handleFocus("option_a_annual_return")}
                        placeholder="7.00%"
                        disabled={isViewer}
                      />
                    </div>
                    <div>
                      <Label htmlFor="option_a_tax_treatment">Tax Treatment</Label>
                      <Select value={formData.option_a_tax_treatment} onValueChange={(v) => handleInputChange("option_a_tax_treatment", v)} disabled={isViewer}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="non_registered">Non-Registered</SelectItem>
                          <SelectItem value="registered">Registered (RRSP)</SelectItem>
                          <SelectItem value="tfsa">Tax-Free (TFSA)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {formData.scenario_type === "own_vs_rent" && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Home Purchase Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="home_purchase_price">Home Purchase Price</Label>
                        <Input
                          id="home_purchase_price"
                          type="text"
                          value={displayValues.home_purchase_price || ''}
                          onChange={(e) => handleDisplayChange("home_purchase_price", e.target.value)}
                          onBlur={() => handleBlur("home_purchase_price", "currency")}
                          onFocus={() => handleFocus("home_purchase_price")}
                          placeholder="$500,000"
                          disabled={isViewer}
                        />
                      </div>
                      <div>
                        <Label htmlFor="down_payment_percentage">Down Payment %</Label>
                        <Input
                          id="down_payment_percentage"
                          type="text"
                          value={displayValues.down_payment_percentage || ''}
                          onChange={(e) => handleDisplayChange("down_payment_percentage", e.target.value)}
                          onBlur={() => handleBlur("down_payment_percentage", "percentage")}
                          onFocus={() => handleFocus("down_payment_percentage")}
                          placeholder="20.00%"
                          disabled={isViewer}
                        />
                      </div>
                      <div>
                        <Label htmlFor="mortgage_interest_rate">Mortgage Interest Rate</Label>
                        <Input
                          id="mortgage_interest_rate"
                          type="text"
                          value={displayValues.mortgage_interest_rate || ''}
                          onChange={(e) => handleDisplayChange("mortgage_interest_rate", e.target.value)}
                          onBlur={() => handleBlur("mortgage_interest_rate", "percentage")}
                          onFocus={() => handleFocus("mortgage_interest_rate")}
                          placeholder="4.50%"
                          disabled={isViewer}
                        />
                      </div>
                      <div>
                        <Label htmlFor="mortgage_amortization">Amortization (Years)</Label>
                        <Input
                          id="mortgage_amortization"
                          type="number"
                          value={formData.mortgage_amortization}
                          onChange={(e) => handleInputChange("mortgage_amortization", parseInt(e.target.value) || 0)}
                          placeholder="25"
                          disabled={isViewer}
                        />
                      </div>
                      <div>
                        <Label htmlFor="annual_property_taxes">Annual Property Taxes</Label>
                        <Input
                          id="annual_property_taxes"
                          type="text"
                          value={displayValues.annual_property_taxes || ''}
                          onChange={(e) => handleDisplayChange("annual_property_taxes", e.target.value)}
                          onBlur={() => handleBlur("annual_property_taxes", "currency")}
                          onFocus={() => handleFocus("annual_property_taxes")}
                          placeholder="$6,000"
                          disabled={isViewer}
                        />
                      </div>
                      <div>
                        <Label htmlFor="annual_insurance">Annual Home Insurance</Label>
                        <Input
                          id="annual_insurance"
                          type="text"
                          value={displayValues.annual_insurance || ''}
                          onChange={(e) => handleDisplayChange("annual_insurance", e.target.value)}
                          onBlur={() => handleBlur("annual_insurance", "currency")}
                          onFocus={() => handleFocus("annual_insurance")}
                          placeholder="$1,200"
                          disabled={isViewer}
                        />
                      </div>
                      <div>
                        <Label htmlFor="annual_maintenance_percentage">Annual Maintenance (% of Home Value)</Label>
                        <Input
                          id="annual_maintenance_percentage"
                          type="text"
                          value={displayValues.annual_maintenance_percentage || ''}
                          onChange={(e) => handleDisplayChange("annual_maintenance_percentage", e.target.value)}
                          onBlur={() => handleBlur("annual_maintenance_percentage", "percentage")}
                          onFocus={() => handleFocus("annual_maintenance_percentage")}
                          placeholder="1.00%"
                          disabled={isViewer}
                        />
                      </div>
                      <div>
                        <Label htmlFor="home_appreciation_rate">Home Appreciation Rate</Label>
                        <Input
                          id="home_appreciation_rate"
                          type="text"
                          value={displayValues.home_appreciation_rate || ''}
                          onChange={(e) => handleDisplayChange("home_appreciation_rate", e.target.value)}
                          onBlur={() => handleBlur("home_appreciation_rate", "percentage")}
                          onFocus={() => handleFocus("home_appreciation_rate")}
                          placeholder="3.00%"
                          disabled={isViewer}
                        />
                      </div>
                      <div>
                        <Label htmlFor="closing_costs">Closing Costs</Label>
                        <Input
                          id="closing_costs"
                          type="text"
                          value={displayValues.closing_costs || ''}
                          onChange={(e) => handleDisplayChange("closing_costs", e.target.value)}
                          onBlur={() => handleBlur("closing_costs", "currency")}
                          onFocus={() => handleFocus("closing_costs")}
                          placeholder="$7,500"
                          disabled={isViewer}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="option-b" className="space-y-6">
                {formData.scenario_type === "investment_comparison" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="option_b_name">Option B Name</Label>
                      <Input
                        id="option_b_name"
                        value={formData.option_b_name}
                        onChange={(e) => handleInputChange('option_b_name', e.target.value)}
                        placeholder="Real Estate"
                        disabled={isViewer}
                      />
                    </div>
                    <div>
                      <Label htmlFor="option_b_initial_amount">Initial Investment</Label>
                      <Input
                        id="option_b_initial_amount"
                        type="text"
                        value={displayValues.option_b_initial_amount || ''}
                        onChange={(e) => handleDisplayChange("option_b_initial_amount", e.target.value)}
                        onBlur={() => handleBlur("option_b_initial_amount", "currency")}
                        onFocus={() => handleFocus("option_b_initial_amount")}
                        placeholder="$100,000"
                        disabled={isViewer}
                      />
                    </div>
                    <div>
                      <Label htmlFor="option_b_monthly_contribution">Monthly Contribution</Label>
                      <Input
                        id="option_b_monthly_contribution"
                        type="text"
                        value={displayValues.option_b_monthly_contribution || ''}
                        onChange={(e) => handleDisplayChange("option_b_monthly_contribution", e.target.value)}
                        onBlur={() => handleBlur("option_b_monthly_contribution", "currency")}
                        onFocus={() => handleFocus("option_b_monthly_contribution")}
                        placeholder="$1,000"
                        disabled={isViewer}
                      />
                    </div>
                    <div>
                      <Label htmlFor="option_b_annual_return">Expected Annual Return</Label>
                      <Input
                        id="option_b_annual_return"
                        type="text"
                        value={displayValues.option_b_annual_return || ''}
                        onChange={(e) => handleDisplayChange("option_b_annual_return", e.target.value)}
                        onBlur={() => handleBlur("option_b_annual_return", "percentage")}
                        onFocus={() => handleFocus("option_b_annual_return")}
                        placeholder="5.00%"
                        disabled={isViewer}
                      />
                    </div>
                    <div>
                      <Label htmlFor="option_b_mer">Management Fee (MER)</Label>
                      <Input
                        id="option_b_mer"
                        type="text"
                        value={displayValues.option_b_mer || ''}
                        onChange={(e) => handleDisplayChange("option_b_mer", e.target.value)}
                        onBlur={() => handleBlur("option_b_mer", "percentage")}
                        onFocus={() => handleFocus("option_b_mer")}
                        placeholder="0.25%"
                        disabled={isViewer}
                      />
                    </div>
                    <div>
                      <Label htmlFor="option_b_tax_treatment">Tax Treatment</Label>
                      <Select value={formData.option_b_tax_treatment} onValueChange={(v) => handleInputChange("option_b_tax_treatment", v)} disabled={isViewer}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="non_registered">Non-Registered</SelectItem>
                          <SelectItem value="registered">Registered (RRSP)</SelectItem>
                          <SelectItem value="tfsa">Tax-Free (TFSA)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {formData.scenario_type === "invest_vs_debt" && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Debt Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="debt_balance">Current Debt Balance</Label>
                        <Input
                          id="debt_balance"
                          type="text"
                          value={displayValues.debt_balance || ''}
                          onChange={(e) => handleDisplayChange("debt_balance", e.target.value)}
                          onBlur={() => handleBlur("debt_balance", "currency")}
                          onFocus={() => handleFocus("debt_balance")}
                          placeholder="$200,000"
                          disabled={isViewer}
                        />
                      </div>
                      <div>
                        <Label htmlFor="debt_interest_rate">Debt Interest Rate</Label>
                        <Input
                          id="debt_interest_rate"
                          type="text"
                          value={displayValues.debt_interest_rate || ''}
                          onChange={(e) => handleDisplayChange("debt_interest_rate", e.target.value)}
                          onBlur={() => handleBlur("debt_interest_rate", "percentage")}
                          onFocus={() => handleFocus("debt_interest_rate")}
                          placeholder="4.00%"
                          disabled={isViewer}
                        />
                      </div>
                      <div>
                        <Label htmlFor="debt_monthly_payment">Regular Monthly Payment</Label>
                        <Input
                          id="debt_monthly_payment"
                          type="text"
                          value={displayValues.debt_monthly_payment || ''}
                          onChange={(e) => handleDisplayChange("debt_monthly_payment", e.target.value)}
                          onBlur={() => handleBlur("debt_monthly_payment", "currency")}
                          onFocus={() => handleFocus("debt_monthly_payment")}
                          placeholder="$1,200"
                          disabled={isViewer}
                        />
                      </div>
                      <div>
                        <Label htmlFor="extra_payment_amount">Extra Monthly Payment</Label>
                        <Input
                          id="extra_payment_amount"
                          type="text"
                          value={displayValues.extra_payment_amount || ''}
                          onChange={(e) => handleDisplayChange("extra_payment_amount", e.target.value)}
                          onBlur={() => handleBlur("extra_payment_amount", "currency")}
                          onFocus={() => handleFocus("extra_payment_amount")}
                          placeholder="$500"
                          disabled={isViewer}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {formData.scenario_type === "own_vs_rent" && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Rental Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="monthly_rent">Monthly Rent</Label>
                        <Input
                          id="monthly_rent"
                          type="text"
                          value={displayValues.monthly_rent || ''}
                          onChange={(e) => handleDisplayChange("monthly_rent", e.target.value)}
                          onBlur={() => handleBlur("monthly_rent", "currency")}
                          onFocus={() => handleFocus("monthly_rent")}
                          placeholder="$2,000"
                          disabled={isViewer}
                        />
                      </div>
                      <div>
                        <Label htmlFor="annual_rent_increase">Annual Rent Increase</Label>
                        <Input
                          id="annual_rent_increase"
                          type="text"
                          value={displayValues.annual_rent_increase || ''}
                          onChange={(e) => handleDisplayChange("annual_rent_increase", e.target.value)}
                          onBlur={() => handleBlur("annual_rent_increase", "percentage")}
                          onFocus={() => handleFocus("annual_rent_increase")}
                          placeholder="2.00%"
                          disabled={isViewer}
                        />
                      </div>
                      <div>
                        <Label htmlFor="tenant_insurance">Annual Tenant Insurance</Label>
                        <Input
                          id="tenant_insurance"
                          type="text"
                          value={displayValues.tenant_insurance || ''}
                          onChange={(e) => handleDisplayChange("tenant_insurance", e.target.value)}
                          onBlur={() => handleBlur("tenant_insurance", "currency")}
                          onFocus={() => handleFocus("tenant_insurance")}
                          placeholder="$300"
                          disabled={isViewer}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Tax Settings */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Tax Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="marginal_tax_rate">Marginal Tax Rate</Label>
                <Input
                  id="marginal_tax_rate"
                  type="text"
                  value={displayValues.marginal_tax_rate || ''}
                  onChange={(e) => handleDisplayChange("marginal_tax_rate", e.target.value)}
                  onBlur={() => handleBlur("marginal_tax_rate", "percentage")}
                  onFocus={() => handleFocus("marginal_tax_rate")}
                  placeholder="35.00%"
                  disabled={isViewer}
                />
              </div>
              <div>
                <Label htmlFor="capital_gains_tax_rate">Capital Gains Tax Rate</Label>
                <Input
                  id="capital_gains_tax_rate"
                  type="text"
                  value={displayValues.capital_gains_tax_rate || ''}
                  onChange={(e) => handleDisplayChange("capital_gains_tax_rate", e.target.value)}
                  onBlur={() => handleBlur("capital_gains_tax_rate", "percentage")}
                  onFocus={() => handleFocus("capital_gains_tax_rate")}
                  placeholder="17.50%"
                  disabled={isViewer}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calculate Button */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <Button onClick={runComparison} className="w-full bg-blue-600 hover:bg-blue-700" disabled={isViewer}>
              <Calculator className="w-4 h-4 mr-2" />
              Run Comparison Analysis
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <Card className="border-none shadow-lg bg-gradient-to-r from-blue-50 to-green-50">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <TrendingUp className="w-5 h-5" />
                  Comparison Results
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "summary" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("summary")}
                  >
                    Summary
                  </Button>
                  <Button
                    variant={viewMode === "chart" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("chart")}
                  >
                    Chart
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === "summary" && (
                <div className="space-y-6">
                  {formData.scenario_type === "investment_comparison" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white/60 p-4 rounded-lg">
                        <h4 className="font-semibold text-lg mb-3">{results.optionA.name}</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Final Balance:</span>
                            <span className="font-bold">{formatCurrency(results.optionA.finalBalance)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Contributions:</span>
                            <span>{formatCurrency(results.optionA.totalContributions)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Growth:</span>
                            <span className="text-green-600">{formatCurrency(results.optionA.totalGrowth)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Taxes Paid:</span>
                            <span className="text-red-600">{formatCurrency(results.optionA.totalTaxesPaid)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Net Return:</span>
                            <span className="font-bold">{formatPercentage(results.optionA.netReturn)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/60 p-4 rounded-lg">
                        <h4 className="font-semibold text-lg mb-3">{results.optionB.name}</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Final Balance:</span>
                            <span className="font-bold">{formatCurrency(results.optionB.finalBalance)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Contributions:</span>
                            <span>{formatCurrency(results.optionB.totalContributions)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Growth:</span>
                            <span className="text-green-600">{formatCurrency(results.optionB.totalGrowth)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Taxes Paid:</span>
                            <span className="text-red-600">{formatCurrency(results.optionB.totalTaxesPaid)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Net Return:</span>
                            <span className="font-bold">{formatPercentage(results.optionB.netReturn)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {formData.scenario_type === "invest_vs_debt" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white/60 p-4 rounded-lg">
                        <h4 className="font-semibold text-lg mb-3">Investment Option</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Investment Balance:</span>
                            <span className="font-bold">{formatCurrency(results.investment.finalBalance)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Contributions:</span>
                            <span>{formatCurrency(results.investment.totalContributions)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Investment Growth:</span>
                            <span className="text-green-600">{formatCurrency(results.investment.totalGrowth)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Net Worth (after debt):</span>
                            <span className="font-bold">{formatCurrency(results.netWorthInvestment)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/60 p-4 rounded-lg">
                        <h4 className="font-semibold text-lg mb-3">Debt Paydown Option</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Remaining Debt:</span>
                            <span className="font-bold">{formatCurrency(results.debtPaydown.finalDebtBalance)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Debt Reduction:</span>
                            <span className="text-green-600">{formatCurrency(results.debtPaydown.debtReduction)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Interest Saved:</span>
                            <span className="text-green-600">{formatCurrency(results.debtPaydown.totalInterestSaved)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Net Worth Improvement:</span>
                            <span className="font-bold">{formatCurrency(results.netWorthDebtPaydown)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {formData.scenario_type === "own_vs_rent" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white/60 p-4 rounded-lg">
                        <h4 className="font-semibold text-lg mb-3">Own Home</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Home Value:</span>
                            <span className="font-bold">{formatCurrency(results.own.homeValue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Home Equity:</span>
                            <span className="text-green-600">{formatCurrency(results.own.equity)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Costs:</span>
                            <span className="text-red-600">{formatCurrency(results.own.totalCosts)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Net Worth:</span>
                            <span className="font-bold">{formatCurrency(results.own.netWorth)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/60 p-4 rounded-lg">
                        <h4 className="font-semibold text-lg mb-3">Rent Home</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Investment Balance:</span>
                            <span className="font-bold">{formatCurrency(results.rent.investmentBalance)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Rent Paid:</span>
                            <span className="text-red-600">{formatCurrency(results.rent.totalCosts)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Net Worth:</span>
                            <span className="font-bold">{formatCurrency(results.rent.netWorth)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Recommendation */}
                  <div className="bg-white/80 p-4 rounded-lg border-2 border-blue-200">
                    <h4 className="font-semibold text-lg mb-3 text-blue-800">Recommendation</h4>
                    <p className="text-slate-700">
                      {formData.scenario_type === "investment_comparison" && 
                        `Based on the analysis, ${results.advantage === "A" ? results.optionA.name : results.optionB.name} 
                         appears to be the better option, with a difference of ${formatCurrency(results.difference)} 
                         after ${formData.time_horizon} years.`
                      }
                      {formData.scenario_type === "invest_vs_debt" && 
                        `Based on the analysis, ${results.advantage === "investment" ? "investing" : "paying down debt"} 
                         appears to be the better strategy for building net worth.`
                      }
                      {formData.scenario_type === "own_vs_rent" && 
                        `Based on the analysis, ${results.advantage === "own" ? "owning" : "renting"} 
                         a home appears to be the better financial choice, with a difference of ${formatCurrency(results.difference)} 
                         in net worth after ${formData.time_horizon} years.`
                      }
                    </p>
                  </div>
                </div>
              )}
              
              {viewMode === "chart" && projectionData.length > 0 && (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={projectionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip formatter={(value) => [formatCurrency(value), '']} />
                      <Legend />
                      {formData.scenario_type === "investment_comparison" && (
                        <>
                          <Line 
                            type="monotone" 
                            dataKey="optionA" 
                            stroke="#3b82f6" 
                            strokeWidth={2} 
                            name={results.optionA.name}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="optionB" 
                            stroke="#ef4444" 
                            strokeWidth={2} 
                            name={results.optionB.name}
                          />
                        </>
                      )}
                      {formData.scenario_type === "own_vs_rent" && (
                        <>
                          <Line 
                            type="monotone" 
                            dataKey="ownNetWorth" 
                            stroke="#10b981" 
                            strokeWidth={2} 
                            name="Own Home Net Worth"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="rentNetWorth" 
                            stroke="#f59e0b" 
                            strokeWidth={2} 
                            name="Rent + Invest Net Worth"
                          />
                        </>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <GiuseppeAIOptimizer
          calculatorName="Cost/Benefit Calculator"
          calculatorData={{
            inputs: formData,
            results: results,
            projectionData: projectionData
          }}
        />
      </fieldset>
    </div>
  );
});

CostBenefitCalculator.displayName = "CostBenefitCalculator";

export default CostBenefitCalculator;
