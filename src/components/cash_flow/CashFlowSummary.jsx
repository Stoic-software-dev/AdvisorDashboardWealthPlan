
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Scale } from "lucide-react"; // Added Scale from outline
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import RetirementForecaster from './RetirementForecaster';
import { InvokeLLM } from "@/api/integrations";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF'];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// Updated formatCurrency function as per outline
const formatCurrency = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const estimateTaxes = async (grossIncome, province) => {
  if (!grossIncome || grossIncome <= 0) return 0;
  
  try {
    const response = await InvokeLLM({
      prompt: `Calculate the estimated total tax (federal + provincial) for a Canadian resident in ${province || 'Ontario'} with gross annual income of $${grossIncome}. 
      
      Consider:
      - Federal basic personal amount
      - Provincial basic personal amount  
      - Federal and provincial tax brackets
      - CPP and EI contributions
      
      Return only the estimated total annual tax amount as a number, no explanation.`,
      response_json_schema: {
        type: "object",
        properties: {
          estimated_tax: { type: "number" }
        }
      }
    });
    
    return response.estimated_tax || grossIncome * 0.25; // 25% fallback
  } catch (error) {
    console.error("Tax estimation error:", error);
    return grossIncome * 0.25; // 25% fallback
  }
};

// Retained original props for CashFlowSummary component to preserve functionality
export default function CashFlowSummary({ incomeItems, expenseItems, client, isMonthlyView = false }) {
  const [estimatedTaxes, setEstimatedTaxes] = React.useState(0);
  const [isCalculatingTax, setIsCalculatingTax] = React.useState(false);

  const totalGrossIncome = incomeItems
    .filter(item => item.type === 'gross')
    .reduce((sum, item) => sum + (item.amount || 0), 0);
    
  const totalNetIncome = incomeItems
    .filter(item => item.type === 'net')
    .reduce((sum, item) => sum + (item.amount || 0), 0);

  const totalExpenses = expenseItems.reduce((sum, item) => sum + (item.amount || 0), 0);

  React.useEffect(() => {
    if (totalGrossIncome > 0) {
      setIsCalculatingTax(true);
      estimateTaxes(totalGrossIncome, client?.province).then(taxes => {
        setEstimatedTaxes(taxes);
        setIsCalculatingTax(false);
      });
    } else {
      setEstimatedTaxes(0);
    }
  }, [totalGrossIncome, client?.province]);

  const totalNetAnnualIncome = totalNetIncome + (totalGrossIncome - estimatedTaxes);
  const netCashFlow = totalNetAnnualIncome - totalExpenses;

  // Prepare data for charts
  const expenseCategories = [
    "Mortgage / Rent",
    "Property Taxes", 
    "Utilities",
    "Insurance",
    "Groceries",
    "Transportation",
    "Childcare / Education",
    "Medical / Dental / Extended Health",
    "Travel / Entertainment",
    "Subscriptions / Memberships",
    "Miscellaneous"
  ];

  const expensePieData = expenseCategories
    .map(category => {
      const categoryTotal = expenseItems
        .filter(item => item.category === category)
        .reduce((sum, item) => sum + (item.amount || 0), 0);
      return { name: category, value: categoryTotal };
    })
    .filter(item => item.value > 0);

  const incomeCategories = [
    "Employment Income",
    "Self-Employment Income",
    "Pension Income", 
    "Investment Income",
    "Rental Income",
    "RRSP/LIF/RRIF/TFSA Withdrawals",
    "Other"
  ];

  const incomePieData = incomeCategories
    .map(category => {
      const categoryTotal = incomeItems
        .filter(item => item.category === category)
        .reduce((sum, item) => sum + (item.amount || 0), 0);
      return { name: category, value: categoryTotal };
    })
    .filter(item => item.value > 0);

  const barChartData = [
    {
      name: 'Cash Flow',
      'Total Income': totalNetAnnualIncome,
      'Total Expenses': totalExpenses,
      'Net Cash Flow': netCashFlow
    }
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-green-700 text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-800">
              {formatCurrency(isMonthlyView ? totalNetAnnualIncome / 12 : totalNetAnnualIncome)}
            </p>
            {totalGrossIncome > 0 && (
              <div className="mt-2 text-xs text-green-600">
                <p>Gross: {formatCurrency(isMonthlyView ? totalGrossIncome / 12 : totalGrossIncome)}</p>
                <p>Est. Taxes: {isCalculatingTax ? 'Calculating...' : formatCurrency(isMonthlyView ? estimatedTaxes / 12 : estimatedTaxes)}</p>
                <p>Net: {formatCurrency(isMonthlyView ? totalNetIncome / 12 : totalNetIncome)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-700 text-sm font-medium flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-800">
              {formatCurrency(isMonthlyView ? totalExpenses / 12 : totalExpenses)}
            </p>
          </CardContent>
        </Card>

        <Card className={`${netCashFlow >= 0 ? 'border-blue-200 bg-blue-50/50' : 'border-orange-200 bg-orange-50/50'}`}>
          <CardHeader className="pb-3">
            <CardTitle className={`text-sm font-medium flex items-center gap-2 ${netCashFlow >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
              <DollarSign className="w-4 h-4" />
              Net Cash Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
              {formatCurrency(isMonthlyView ? netCashFlow / 12 : netCashFlow)}
            </p>
            <Badge variant={netCashFlow >= 0 ? 'default' : 'destructive'} className="mt-2">
              {netCashFlow >= 0 ? 'Surplus' : 'Deficit'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Breakdown */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-green-600">Income Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {incomePieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incomePieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {incomePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(isMonthlyView ? value / 12 : value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">
                  No income data to display
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-red-600">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {expensePieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensePieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {expensePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(isMonthlyView ? value / 12 : value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">
                  No expense data to display
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart Overview */}
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Cash Flow Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => formatCurrency(isMonthlyView ? value / 12 : value)} />
                <Legend />
                <Bar dataKey="Total Income" fill="#16a34a" />
                <Bar dataKey="Total Expenses" fill="#dc2626" />
                <Bar dataKey="Net Cash Flow" fill={netCashFlow >= 0 ? "#2563eb" : "#ea580c"} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Retirement Forecaster */}
      <RetirementForecaster 
        client={client}
        incomeItems={incomeItems}
        expenseItems={expenseItems}
        totalNetAnnualIncome={totalNetAnnualIncome}
      />
    </div>
  );
}
