
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, Calculator, User, Target, PieChart, DollarSign, Calendar } from "lucide-react";

export default function RetirementCalculator({ clients, goals, portfolios, isLoading, preselectedClientId }) {
  // Form state
  const [formData, setFormData] = useState({
    // Client linking
    client_id: preselectedClientId || "",
    goal_id: "",
    portfolio_id: "",
    
    // Current situation
    current_age: 35,
    current_savings: 50000,
    annual_income: 75000,
    
    // Retirement parameters
    retirement_age: 65,
    life_expectancy: 85,
    replacement_ratio: 70, // percentage of current income needed
    
    // Contribution parameters
    monthly_contribution: 500,
    employer_match: 3, // percentage
    contribution_increase: 2, // annual increase percentage
    
    // Investment assumptions
    pre_retirement_return: 7, // annual percentage
    post_retirement_return: 5, // annual percentage
    inflation_rate: 2.5,
    
    // Government benefits (Canadian)
    cpp_monthly: 1200, // CPP at 65
    oas_monthly: 650,   // OAS at 65
    gis_monthly: 0      // GIS if applicable
  });

  const [results, setResults] = useState(null);
  const [chartData, setChartData] = useState([]);

  // Filtered data based on selected client
  const [availableGoals, setAvailableGoals] = useState([]);
  const [availablePortfolios, setAvailablePortfolios] = useState([]);

  useEffect(() => {
    if (formData.client_id) {
      setAvailableGoals(goals.filter(g => g.client_id === formData.client_id && 
        (g.goal_type === 'retirement' || g.goal_type === 'other')));
      setAvailablePortfolios(portfolios.filter(p => p.client_id === formData.client_id));
    } else {
      setAvailableGoals([]);
      setAvailablePortfolios([]);
    }
  }, [formData.client_id, goals, portfolios]);

  // Auto-populate from selected goal
  useEffect(() => {
    if (formData.goal_id) {
      const goal = goals.find(g => g.id === formData.goal_id);
      if (goal) {
        setFormData(prev => ({
          ...prev,
          current_savings: goal.current_amount || prev.current_savings,
          monthly_contribution: goal.monthly_contribution || prev.monthly_contribution
        }));
      }
    }
  }, [formData.goal_id, goals]);

  // Auto-populate from selected portfolio
  useEffect(() => {
    if (formData.portfolio_id) {
      const portfolio = portfolios.find(p => p.id === formData.portfolio_id);
      if (portfolio) {
        setFormData(prev => ({
          ...prev,
          current_savings: portfolio.total_value || prev.current_savings
        }));
      }
    }
  }, [formData.portfolio_id, portfolios]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: parseFloat(value) || value
    }));
  };

  const calculateRetirement = () => {
    const {
      current_age,
      current_savings,
      annual_income,
      retirement_age,
      life_expectancy,
      replacement_ratio,
      monthly_contribution,
      employer_match,
      contribution_increase,
      pre_retirement_return,
      post_retirement_return,
      inflation_rate,
      cpp_monthly,
      oas_monthly,
      gis_monthly
    } = formData;

    const yearsToRetirement = retirement_age - current_age;
    const yearsInRetirement = life_expectancy - retirement_age;
    const annualContribution = monthly_contribution * 12;
    const employerContribution = (annual_income * employer_match) / 100;
    
    // Calculate savings at retirement
    let projectedSavings = current_savings;
    let chartDataPoints = [];
    
    // Accumulation phase
    for (let year = 0; year <= yearsToRetirement; year++) {
      const currentAge = current_age + year;
      const yearlyContribution = annualContribution * Math.pow(1 + contribution_increase / 100, year);
      const totalYearlyContribution = yearlyContribution + employerContribution;
      
      if (year > 0) {
        projectedSavings = projectedSavings * (1 + pre_retirement_return / 100) + totalYearlyContribution;
      }
      
      chartDataPoints.push({
        age: currentAge,
        savings: Math.round(projectedSavings),
        contributions: Math.round(totalYearlyContribution),
        phase: 'Accumulation'
      });
    }

    // Calculate required income in retirement (adjusted for inflation)
    const requiredAnnualIncome = (annual_income * replacement_ratio / 100) * Math.pow(1 + inflation_rate / 100, yearsToRetirement);
    const govBenefitsAnnual = (cpp_monthly + oas_monthly + gis_monthly) * 12;
    const requiredFromSavings = requiredAnnualIncome - govBenefitsAnnual;

    // Withdrawal phase
    let remainingSavings = projectedSavings;
    const annualWithdrawal = requiredFromSavings;
    
    for (let year = 1; year <= yearsInRetirement; year++) {
      const currentAge = retirement_age + year;
      remainingSavings = (remainingSavings - annualWithdrawal) * (1 + post_retirement_return / 100);
      
      chartDataPoints.push({
        age: currentAge,
        savings: Math.max(0, Math.round(remainingSavings)),
        contributions: 0,
        phase: 'Withdrawal'
      });
    }

    // Calculate sustainability
    const isSustainable = remainingSavings > 0;
    const monthlyDeficitSurplus = isSustainable 
      ? (remainingSavings / yearsInRetirement / 12)
      : -(Math.abs(remainingSavings) / yearsInRetirement / 12);

    setResults({
      projectedSavingsAtRetirement: projectedSavings,
      requiredAnnualIncome,
      govBenefitsAnnual,
      requiredFromSavings,
      isSustainable,
      monthlyDeficitSurplus,
      totalContributions: annualContribution * yearsToRetirement,
      totalEmployerMatch: employerContribution * yearsToRetirement,
      finalBalance: remainingSavings
    });

    setChartData(chartDataPoints);
  };

  useEffect(() => {
    calculateRetirement();
  }, [formData]);

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : '';
  };

  return (
    <div className="space-y-6">
      {/* Header with Client Linking */}
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            Retirement Projection Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="client_id">Link to Client (Optional)</Label>
              <Select 
                value={formData.client_id} 
                onValueChange={(v) => handleInputChange("client_id", v)}
                disabled={!!preselectedClientId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No client selected</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.first_name} {client.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.client_id && (
              <>
                <div>
                  <Label htmlFor="goal_id">Link to Retirement Goal (Optional)</Label>
                  <Select value={formData.goal_id} onValueChange={(v) => handleInputChange("goal_id", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select goal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>No goal selected</SelectItem>
                      {availableGoals.map(goal => (
                        <SelectItem key={goal.id} value={goal.id}>
                          {goal.goal_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="portfolio_id">Link to Portfolio (Optional)</Label>
                  <Select value={formData.portfolio_id} onValueChange={(v) => handleInputChange("portfolio_id", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select portfolio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>No portfolio selected</SelectItem>
                      {availablePortfolios.map(portfolio => (
                        <SelectItem key={portfolio.id} value={portfolio.id}>
                          {portfolio.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {formData.client_id && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <User className="w-4 h-4" />
              <span>Calculating for: <strong>{getClientName(formData.client_id)}</strong></span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Input Parameters */}
        <div className="lg:col-span-1 space-y-6">
          {/* Personal Information */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="current_age">Current Age</Label>
                  <Input
                    id="current_age"
                    type="number"
                    value={formData.current_age}
                    onChange={(e) => handleInputChange("current_age", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="retirement_age">Retirement Age</Label>
                  <Input
                    id="retirement_age"
                    type="number"
                    value={formData.retirement_age}
                    onChange={(e) => handleInputChange("retirement_age", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="life_expectancy">Life Expectancy</Label>
                <Input
                  id="life_expectancy"
                  type="number"
                  value={formData.life_expectancy}
                  onChange={(e) => handleInputChange("life_expectancy", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="annual_income">Annual Income</Label>
                <Input
                  id="annual_income"
                  type="number"
                  value={formData.annual_income}
                  onChange={(e) => handleInputChange("annual_income", e.target.value)}
                  placeholder="75000"
                />
              </div>
              <div>
                <Label htmlFor="replacement_ratio">Income Replacement % in Retirement</Label>
                <Input
                  id="replacement_ratio"
                  type="number"
                  value={formData.replacement_ratio}
                  onChange={(e) => handleInputChange("replacement_ratio", e.target.value)}
                  placeholder="70"
                />
              </div>
            </CardContent>
          </Card>

          {/* Current Savings & Contributions */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Current Situation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="current_savings">Current Retirement Savings</Label>
                <Input
                  id="current_savings"
                  type="number"
                  value={formData.current_savings}
                  onChange={(e) => handleInputChange("current_savings", e.target.value)}
                  placeholder="50000"
                />
              </div>
              <div>
                <Label htmlFor="monthly_contribution">Monthly Contribution</Label>
                <Input
                  id="monthly_contribution"
                  type="number"
                  value={formData.monthly_contribution}
                  onChange={(e) => handleInputChange("monthly_contribution", e.target.value)}
                  placeholder="500"
                />
              </div>
              <div>
                <Label htmlFor="employer_match">Employer Match %</Label>
                <Input
                  id="employer_match"
                  type="number"
                  value={formData.employer_match}
                  onChange={(e) => handleInputChange("employer_match", e.target.value)}
                  placeholder="3"
                />
              </div>
              <div>
                <Label htmlFor="contribution_increase">Annual Contribution Increase %</Label>
                <Input
                  id="contribution_increase"
                  type="number"
                  value={formData.contribution_increase}
                  onChange={(e) => handleInputChange("contribution_increase", e.target.value)}
                  placeholder="2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Investment & Economic Assumptions */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Investment Assumptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="pre_retirement_return">Pre-Retirement Return %</Label>
                <Input
                  id="pre_retirement_return"
                  type="number"
                  step="0.1"
                  value={formData.pre_retirement_return}
                  onChange={(e) => handleInputChange("pre_retirement_return", e.target.value)}
                  placeholder="7"
                />
              </div>
              <div>
                <Label htmlFor="post_retirement_return">Post-Retirement Return %</Label>
                <Input
                  id="post_retirement_return"
                  type="number"
                  step="0.1"
                  value={formData.post_retirement_return}
                  onChange={(e) => handleInputChange("post_retirement_return", e.target.value)}
                  placeholder="5"
                />
              </div>
              <div>
                <Label htmlFor="inflation_rate">Inflation Rate %</Label>
                <Input
                  id="inflation_rate"
                  type="number"
                  step="0.1"
                  value={formData.inflation_rate}
                  onChange={(e) => handleInputChange("inflation_rate", e.target.value)}
                  placeholder="2.5"
                />
              </div>
            </CardContent>
          </Card>

          {/* Government Benefits */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Government Benefits (Monthly)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cpp_monthly">CPP/QPP</Label>
                <Input
                  id="cpp_monthly"
                  type="number"
                  value={formData.cpp_monthly}
                  onChange={(e) => handleInputChange("cpp_monthly", e.target.value)}
                  placeholder="1200"
                />
              </div>
              <div>
                <Label htmlFor="oas_monthly">OAS</Label>
                <Input
                  id="oas_monthly"
                  type="number"
                  value={formData.oas_monthly}
                  onChange={(e) => handleInputChange("oas_monthly", e.target.value)}
                  placeholder="650"
                />
              </div>
              <div>
                <Label htmlFor="gis_monthly">GIS (if applicable)</Label>
                <Input
                  id="gis_monthly"
                  type="number"
                  value={formData.gis_monthly}
                  onChange={(e) => handleInputChange("gis_monthly", e.target.value)}
                  placeholder="0"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results and Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Results */}
          {results && (
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Retirement Projection Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      ${results.projectedSavingsAtRetirement.toLocaleString()}
                    </div>
                    <div className="text-sm text-slate-500">Projected Savings at Retirement</div>
                  </div>
                  
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${results.isSustainable ? 'text-green-600' : 'text-red-600'}`}>
                      {results.isSustainable ? 'Sustainable' : 'Shortfall'}
                    </div>
                    <div className="text-sm text-slate-500">Retirement Plan Status</div>
                  </div>
                  
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${results.monthlyDeficitSurplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs(results.monthlyDeficitSurplus).toLocaleString()}/mo
                    </div>
                    <div className="text-sm text-slate-500">
                      {results.monthlyDeficitSurplus >= 0 ? 'Monthly Surplus' : 'Monthly Shortfall'}
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Required Annual Income:</span>
                      <span className="font-semibold">${results.requiredAnnualIncome.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Government Benefits:</span>
                      <span className="font-semibold">${results.govBenefitsAnnual.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Required from Savings:</span>
                      <span className="font-semibold">${results.requiredFromSavings.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Personal Contributions:</span>
                      <span className="font-semibold">${results.totalContributions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Employer Match:</span>
                      <span className="font-semibold">${results.totalEmployerMatch.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Final Balance:</span>
                      <span className={`font-semibold ${results.finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${Math.abs(results.finalBalance).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Projection Chart */}
          {chartData.length > 0 && (
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Savings Projection Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="age" 
                        label={{ value: 'Age', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `$${(value / 1000)}K`}
                        label={{ value: 'Savings ($)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        formatter={(value, name) => [`$${value.toLocaleString()}`, name]}
                        labelFormatter={(age) => `Age: ${age}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="savings"
                        stroke="#2563eb"
                        fill="#2563eb"
                        fillOpacity={0.2}
                        name="Retirement Savings"
                      />
                      {/* Add retirement age line */}
                      <Line
                        type="monotone"
                        dataKey={() => null}
                        stroke="#ef4444"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
