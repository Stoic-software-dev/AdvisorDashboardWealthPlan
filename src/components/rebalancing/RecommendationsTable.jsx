
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, Copy, Check } from 'lucide-react';

const formatCurrency = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return "$0.00";
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
};

const formatPercentage = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return "0.00%";
  return `${value.toFixed(2)}%`;
};

export default function RecommendationsTable({ recommendations = [], totalToBuy = 0, totalToSell = 0, portfolioName, portfolioValue }) {
  const [isCopied, setIsCopied] = useState(false);

  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>No recommendations available. Click "Generate Rebalancing Recommendations" to see suggestions.</p>
      </div>
    );
  }

  const handleCopy = () => {
    const netDifference = totalToBuy - totalToSell;
    
    let text = `**Rebalancing Summary for: ${portfolioName}**\n\n`;
    text += `Portfolio Value: ${formatCurrency(portfolioValue)}\n`;
    text += `Total to Buy: ${formatCurrency(totalToBuy)}\n`;
    text += `Total to Sell: ${formatCurrency(totalToSell)}\n`;
    text += `Net Cash Impact: ${formatCurrency(netDifference)}\n\n`;
    text += "--- Recommended Trades ---\n";

    recommendations.forEach(rec => {
      text += `* ${rec.action} ${formatCurrency(rec.amount)} of "${rec.fund_name}" (${rec.fund_code})\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500); // Reset after 2.5 seconds
    });
  };

  const netDifference = totalToBuy - totalToSell;

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-semibold text-slate-800">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Rebalancing Recommendations
        </div>
        <Button variant="outline" size="sm" onClick={handleCopy} disabled={isCopied}>
          {isCopied ? <Check className="w-4 h-4 mr-2 text-green-600" /> : <Copy className="w-4 h-4 mr-2" />}
          {isCopied ? 'Copied!' : 'Copy Text'}
        </Button>
      </div>
      
      <div className="text-sm text-slate-600 space-y-1">
        <p>Comparison Target: Original Allocation</p>
        <p>Portfolio Name: {portfolioName}</p>
        <p>Portfolio Value: {formatCurrency(portfolioValue)}</p>
        <div className="flex gap-4">
          <span className="text-green-600">Total to Buy: {formatCurrency(totalToBuy)}</span>
          <span className="text-red-600">Total to Sell: {formatCurrency(totalToSell)}</span>
        </div>
      </div>

      {/* Recommendations Table */}
      <div className="overflow-hidden border border-slate-200 rounded-lg">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3 text-sm font-medium text-slate-600">Fund</th>
              <th className="text-left p-3 text-sm font-medium text-slate-600">Category</th>
              <th className="text-center p-3 text-sm font-medium text-slate-600">Current %</th>
              <th className="text-center p-3 text-sm font-medium text-slate-600">Target %</th>
              <th className="text-center p-3 text-sm font-medium text-slate-600">Drift</th>
              <th className="text-center p-3 text-sm font-medium text-slate-600">Action</th>
              <th className="text-right p-3 text-sm font-medium text-slate-600">Amount</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.map((rec, index) => (
              <tr key={rec.fund_id || index} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="p-3 text-sm font-medium text-slate-800">
                  {rec.fund_name}
                </td>
                <td className="p-3 text-sm text-slate-600">
                  {rec.category}
                </td>
                <td className="p-3 text-sm text-center text-slate-600">
                  {formatPercentage(rec.current_percentage)}
                </td>
                <td className="p-3 text-sm text-center text-slate-600">
                  {formatPercentage(rec.target_percentage)}
                </td>
                <td className="p-3 text-sm text-center">
                  <span className={rec.drift_percentage > 0 ? "text-red-600" : rec.drift_percentage < 0 ? "text-blue-600" : "text-slate-600"}>
                    {rec.drift_percentage > 0 ? "+" : ""}{formatPercentage(rec.drift_percentage)}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <Badge 
                    variant={rec.action === 'BUY' ? 'default' : 'destructive'}
                    className={rec.action === 'BUY' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                  >
                    {rec.action}
                  </Badge>
                </td>
                <td className="p-3 text-sm text-right font-medium">
                  {formatCurrency(rec.amount || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          Summary: Execute the recommended trades to rebalance your portfolio to match the target allocation. 
          The net difference between buys and sells is {formatCurrency(Math.abs(netDifference))}.
        </AlertDescription>
      </Alert>
    </div>
  );
}
