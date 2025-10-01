import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NetWorthStatement, Asset, Liability, CashFlowStatement, IncomeItem, ExpenseItem } from "@/api/entities";
import { Percent, Loader2, AlertCircle } from "lucide-react";
import { Badge } from '@/components/ui/badge';

const predefinedGoals = {
  liquidAssetsToEquity: { goal: 0.10, moreIsBetter: true }, // >10%
  liquidAssetsToIncome: { goal: 0.25, moreIsBetter: true }, // >25% (3 months)
  debtToIncome: { goal: 0.43, moreIsBetter: false }, // <43%
  debtToEquity: { goal: 1.5, moreIsBetter: false }, // <150%
  ltv: { goal: 0.80, moreIsBetter: false }, // <80%
  emergencyFund: { goal: 3, moreIsBetter: true }, // >3 months
};

const RatioCard = ({ title, description, value, goal, moreIsBetter, unit = '%' }) => {
  let status = 'neutral';
  let statusText = 'On Track';

  if (value !== null && !isNaN(value)) {
    if (moreIsBetter) {
      if (value >= goal) {
        status = 'success';
        statusText = 'Good';
      } else if (value >= goal * 0.75) {
        status = 'warning';
        statusText = 'Needs Attention';
      } else {
        status = 'danger';
        statusText = 'At Risk';
      }
    } else {
      if (value <= goal) {
        status = 'success';
        statusText = 'Good';
      } else if (value <= goal * 1.25) {
        status = 'warning';
        statusText = 'Needs Attention';
      } else {
        status = 'danger';
        statusText = 'At Risk';
      }
    }
  } else {
    status = 'muted';
    statusText = 'N/A';
  }

  const badgeVariants = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
    neutral: 'bg-blue-100 text-blue-800 border-blue-200',
    muted: 'bg-slate-100 text-slate-800 border-slate-200',
  };
  
  const formatValue = (val) => {
    if (val === null || isNaN(val)) return "N/A";
    if (unit === '%') return `${(val * 100).toFixed(2)}%`;
    if (unit === 'x') return `${val.toFixed(2)}x`;
    return val.toFixed(2);
  };

  const formatGoal = () => {
    const operator = moreIsBetter ? '>' : '<';
    if (unit === '%') return `${operator} ${(goal * 100).toFixed(0)}%`;
    if (unit === 'x') return `${operator} ${goal.toFixed(2)}x`;
    return `${operator} ${goal.toFixed(2)}`;
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between">
        <p className="text-sm text-slate-500 mb-4">{description}</p>
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs text-slate-500">Current</span>
            <span className="text-2xl font-bold text-slate-800">{formatValue(value)}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-500">Goal</span>
            <span className="font-semibold text-slate-600">{formatGoal()}</span>
          </div>
        </div>
      </CardContent>
      <div className="p-4 border-t mt-4">
        <Badge variant="outline" className={`w-full justify-center ${badgeVariants[status]}`}>{statusText}</Badge>
      </div>
    </Card>
  );
};


export default function ClientRatios({ client }) {
  const [financialData, setFinancialData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      if (!client) return;

      setIsLoading(true);
      setError(null);
      try {
        // Fetch latest Net Worth statement
        const nwStatements = await NetWorthStatement.filter({ client_ids: client.id }, "-statement_date", 1);
        if (!nwStatements || nwStatements.length === 0) {
          throw new Error("No Net Worth Statement found for this client. Please create one first.");
        }
        const latestNwStatement = nwStatements[0];

        const [assets, liabilities] = await Promise.all([
          Asset.filter({ statement_id: latestNwStatement.id }),
          Liability.filter({ statement_id: latestNwStatement.id })
        ]);

        // Fetch latest Cash Flow statement
        const cfStatements = await CashFlowStatement.filter({ client_id: client.id }, "-statement_date", 1);
        let incomeItems = [], expenseItems = [];
        if (cfStatements && cfStatements.length > 0) {
          const latestCfStatement = cfStatements[0];
          [incomeItems, expenseItems] = await Promise.all([
            IncomeItem.filter({ statement_id: latestCfStatement.id }),
            ExpenseItem.filter({ statement_id: latestCfStatement.id })
          ]);
        }

        // --- Calculations ---
        const totalAssets = (assets || []).reduce((sum, a) => sum + (a.asset_value || 0), 0);
        const totalDebt = (liabilities || []).reduce((sum, l) => sum + (l.liability_value || 0), 0);
        const totalEquity = totalAssets - totalDebt;

        const liquidAssets = (assets || [])
          .filter(a => ['Capital Registered', 'Capital Non-Registered', 'Capital Tax-Free'].includes(a.asset_category))
          .reduce((sum, a) => sum + (a.asset_value || 0), 0);

        const annualIncome = client.annual_income || (incomeItems || []).reduce((sum, i) => sum + (i.amount || 0), 0) * 12;

        const principalResidence = (assets || []).find(a => a.asset_category === 'Principal Residence');
        const principalMortgage = (liabilities || []).find(l => l.liability_category === 'Principal Mortgage');

        const monthlyExpenses = (expenseItems || []).reduce((sum, e) => sum + (e.amount || 0), 0);

        setFinancialData({
          liquidAssetsToEquity: totalEquity > 0 ? liquidAssets / totalEquity : null,
          liquidAssetsToIncome: annualIncome > 0 ? liquidAssets / annualIncome : null,
          debtToIncome: annualIncome > 0 ? totalDebt / annualIncome : null,
          debtToEquity: totalEquity > 0 ? totalDebt / totalEquity : null,
          ltv: principalResidence && principalResidence.asset_value > 0 ? (principalMortgage?.liability_value || 0) / principalResidence.asset_value : null,
          emergencyFund: monthlyExpenses > 0 ? liquidAssets / monthlyExpenses : null,
        });

      } catch (err) {
        console.error("Error loading financial ratio data:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [client]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-500">
        <Loader2 className="w-6 h-6 mr-2 animate-spin" />
        <span>Calculating financial ratios...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            Error Loading Ratios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-800">{error}</p>
          <p className="text-sm text-red-600 mt-2">Please ensure the client has at least one Net Worth Statement with assets and liabilities to calculate ratios.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="w-5 h-5 text-green-600" />
          Financial Ratios
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <RatioCard
            title="Liquid Assets to Equity"
            description="Measures how much of your net worth is easily accessible. Higher is better for flexibility."
            value={financialData.liquidAssetsToEquity}
            {...predefinedGoals.liquidAssetsToEquity}
          />
          <RatioCard
            title="Debt-to-Equity Ratio"
            description="Shows the proportion of debt versus equity used to finance assets. Lower is generally safer."
            value={financialData.debtToEquity}
            {...predefinedGoals.debtToEquity}
            unit="x"
          />
          <RatioCard
            title="Emergency Fund"
            description="Indicates how many months of expenses you can cover with liquid assets. A 3-6 month buffer is ideal."
            value={financialData.emergencyFund}
            {...predefinedGoals.emergencyFund}
            unit=" months"
          />
          <RatioCard
            title="Debt-to-Income Ratio"
            description="Percentage of gross income used for debt payments. Lenders use this to assess borrowing capacity."
            value={financialData.debtToIncome}
            {...predefinedGoals.debtToIncome}
          />
          <RatioCard
            title="Mortgage Loan-to-Value (LTV)"
            description="The ratio of your mortgage to the value of your home. Lower LTV indicates more home equity."
            value={financialData.ltv}
            {...predefinedGoals.ltv}
          />
          <RatioCard
            title="Liquid Assets to Income"
            description="Represents the portion of your annual income held in liquid savings. Higher indicates a stronger savings buffer."
            value={financialData.liquidAssetsToIncome}
            {...predefinedGoals.liquidAssetsToIncome}
          />
        </div>
      </CardContent>
    </Card>
  );
}