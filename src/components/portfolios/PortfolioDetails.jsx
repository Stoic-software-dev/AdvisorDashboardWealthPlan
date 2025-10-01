
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  PieChart, 
  Edit, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Wallet,
  Target,
  Hash, // Added Hash icon
} from "lucide-react";
import { format } from "date-fns";

const accountTypeColors = {
  'rrsp': "bg-blue-100 text-blue-800 border-blue-200",
  'rrif': "bg-indigo-100 text-indigo-800 border-indigo-200",
  'tfsa': "bg-green-100 text-green-800 border-green-200",
  'resp': "bg-purple-100 text-purple-800 border-purple-200",
  'lira': "bg-cyan-100 text-cyan-800 border-cyan-200",
  'lif': "bg-teal-100 text-teal-800 border-teal-200",
  'taxable': "bg-orange-100 text-orange-800 border-orange-200",
  'corporate': "bg-red-100 text-red-800 border-red-200",
  'trust': "bg-slate-100 text-slate-800 border-slate-200",
  'other': "bg-gray-100 text-gray-800 border-gray-200"
};

const accountTypeLabels = {
  'rrsp': 'RRSP (Registered Retirement Savings Plan)',
  'rrif': 'RRIF (Registered Retirement Income Fund)',
  'tfsa': 'TFSA (Tax-Free Savings Account)',
  'resp': 'RESP (Registered Education Savings Plan)',
  'lira': 'LIRA (Locked-in Retirement Account)',
  'lif': 'LIF (Life Income Fund)',
  'taxable': 'Non-Registered Investment Account',
  'corporate': 'Corporate Investment Account',
  'trust': 'Trust Account',
  'other': 'Other Account Type'
};

export default function PortfolioDetails({ portfolio, clientName, onEdit }) {
  const investedAmount = (portfolio.total_value || 0) - (portfolio.cash_balance || 0);
  const cashPercentage = portfolio.total_value ? ((portfolio.cash_balance || 0) / portfolio.total_value * 100) : 0;
  const investedPercentage = 100 - cashPercentage;

  const performanceColor = (performance) => {
    if (performance > 0) return "text-green-600";
    if (performance < 0) return "text-red-600";
    return "text-slate-600";
  };

  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-600" />
            Portfolio Details
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Portfolio Header */}
        <div className="text-center">
          <h3 className="text-xl font-bold text-slate-900 mb-1">
            {portfolio.account_name}
          </h3>
          <p className="text-slate-600 mb-1">{clientName}</p>
          {portfolio.account_number && (
            <p className="text-sm text-slate-500 mb-2 flex items-center justify-center gap-1.5">
              <Hash className="w-3 h-3" />
              Account: {portfolio.account_number}
            </p>
          )}
          <Badge 
            variant="outline" 
            className={`${accountTypeColors[portfolio.account_type]} mb-3`}
          >
            {accountTypeLabels[portfolio.account_type]}
          </Badge>
        </div>

        <Separator />

        {/* Key Metrics */}
        <div className="space-y-4">
          <h4 className="font-semibold text-slate-900">Account Value</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="w-4 h-4 text-slate-400" />
                <span className="text-sm">Total Value</span>
              </div>
              <span className="text-xl font-bold text-slate-900">
                ${portfolio.total_value?.toLocaleString() || '0'} CAD
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wallet className="w-4 h-4 text-slate-400" />
                <span className="text-sm">Cash Balance</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-slate-700">
                  ${portfolio.cash_balance?.toLocaleString() || '0'} CAD
                </span>
                <span className="text-xs text-slate-500 ml-2">
                  ({cashPercentage.toFixed(1)}%)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className="w-4 h-4 text-slate-400" />
                <span className="text-sm">Invested Amount</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-slate-700">
                  ${investedAmount.toLocaleString()} CAD
                </span>
                <span className="text-xs text-slate-500 ml-2">
                  ({investedPercentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Performance Metrics */}
        <div className="space-y-4">
          <h4 className="font-semibold text-slate-900">Performance</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                <span className="text-sm">Year-to-Date</span>
              </div>
              <div className={`flex items-center gap-1 font-semibold ${performanceColor(portfolio.performance_ytd)}`}>
                {portfolio.performance_ytd > 0 && <TrendingUp className="w-4 h-4" />}
                {portfolio.performance_ytd < 0 && <TrendingDown className="w-4 h-4" />}
                <span>
                  {portfolio.performance_ytd > 0 ? '+' : ''}{portfolio.performance_ytd?.toFixed(2) || '0.00'}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                <span className="text-sm">1-Year Return</span>
              </div>
              <div className={`flex items-center gap-1 font-semibold ${performanceColor(portfolio.performance_1yr)}`}>
                {portfolio.performance_1yr > 0 && <TrendingUp className="w-4 h-4" />}
                {portfolio.performance_1yr < 0 && <TrendingDown className="w-4 h-4" />}
                <span>
                  {portfolio.performance_1yr > 0 ? '+' : ''}{portfolio.performance_1yr?.toFixed(2) || '0.00'}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Asset Allocation Visualization */}
        <div className="space-y-4">
          <h4 className="font-semibold text-slate-900">Asset Allocation</h4>
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Invested ({investedPercentage.toFixed(1)}%)</span>
                <span className="font-medium">${investedAmount.toLocaleString()} CAD</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${investedPercentage}%` }}
                ></div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Cash ({cashPercentage.toFixed(1)}%)</span>
                <span className="font-medium">${portfolio.cash_balance?.toLocaleString() || '0'} CAD</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${cashPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Last Updated */}
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <Calendar className="w-4 h-4" />
          <span>
            Last updated: {portfolio.last_updated ? format(new Date(portfolio.last_updated), "PPP") : 'Never'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
