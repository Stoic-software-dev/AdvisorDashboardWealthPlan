import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF5733', '#33FF57', '#3357FF'];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
  if (percent < 0.03) return null; // Don't render label for very tiny slices
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-sm font-bold pointer-events-none drop-shadow-sm">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function PortfolioAllocationPieChartModal({ isOpen, onClose, portfolio, funds }) {
  if (!portfolio || !portfolio.fund_holdings || portfolio.fund_holdings.length === 0) {
    return null;
  }

  const chartData = portfolio.fund_holdings.map((holding, index) => {
    const fundDetails = funds.find(f => f.id === holding.fund_id);
    return {
      name: fundDetails ? fundDetails.name : `Unknown Fund`,
      shortName: fundDetails ? `${fundDetails.name} (${fundDetails.fund_code})` : `Unknown Fund (ID: ${holding.fund_id})`,
      value: holding.allocation_percentage,
      color: COLORS[index % COLORS.length],
      fundCode: fundDetails ? fundDetails.fund_code : 'N/A',
      category: fundDetails ? fundDetails.category : 'Unknown',
      mer: fundDetails ? fundDetails.mer : null
    };
  });

  const formatCurrency = (value) => {
    if (!value) return "$0";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">
            Fund Allocation - {portfolio.account_name}
          </DialogTitle>
          <p className="text-center text-sm text-slate-500">
            Total Value: {formatCurrency(portfolio.total_value)} • {portfolio.account_type?.toUpperCase()}
          </p>
        </DialogHeader>
        
        {/* Pie Chart in Center */}
        <div className="flex justify-center py-6">
          <div className="h-80 w-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={140}
                  innerRadius={50}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="white"
                  strokeWidth={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => [
                    `${value.toFixed(2)}%`, 
                    props.payload.shortName
                  ]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fund Details Below Chart */}
        <div className="space-y-3 max-h-48 overflow-y-auto">
          <h4 className="font-semibold text-center text-slate-800 border-b pb-2">Fund Holdings</h4>
          {chartData.map((fund, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: fund.color }}
                />
                <div>
                  <p className="font-medium text-sm text-slate-900">{fund.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{fund.fundCode}</Badge>
                    {fund.category && <span className="text-xs text-slate-500">{fund.category}</span>}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-900">{fund.value.toFixed(2)}%</p>
                {fund.mer && (
                  <p className="text-xs text-slate-500">MER: {(fund.mer * 100).toFixed(2)}%</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}