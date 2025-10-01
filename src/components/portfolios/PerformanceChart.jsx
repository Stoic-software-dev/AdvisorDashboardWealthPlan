import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from "lucide-react";

export default function PerformanceChart({ portfolios }) {
  // Create chart data by aggregating portfolio performance
  const chartData = [
    { month: 'Jan', ytd: 2.1, oneYear: 8.5 },
    { month: 'Feb', ytd: 3.8, oneYear: 9.2 },
    { month: 'Mar', ytd: 1.5, oneYear: 7.8 },
    { month: 'Apr', ytd: 4.2, oneYear: 10.1 },
    { month: 'May', ytd: 5.7, oneYear: 11.3 },
    { month: 'Jun', ytd: 6.9, oneYear: 12.1 },
    { month: 'Jul', ytd: 8.1, oneYear: 13.2 },
    { month: 'Aug', ytd: 7.3, oneYear: 11.8 },
    { month: 'Sep', ytd: 8.9, oneYear: 12.9 },
    { month: 'Oct', ytd: 9.2, oneYear: 13.1 },
    { month: 'Nov', ytd: 10.1, oneYear: 14.2 },
    { month: 'Dec', ytd: portfolios.length > 0 ? 
      portfolios.reduce((sum, p) => sum + (p.performance_ytd || 0), 0) / portfolios.length : 8.5, 
      oneYear: portfolios.length > 0 ? 
        portfolios.reduce((sum, p) => sum + (p.performance_1yr || 0), 0) / portfolios.length : 12.0 
    }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-medium text-slate-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Portfolio Performance Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="month" 
                stroke="#64748b"
                fontSize={12}
              />
              <YAxis 
                stroke="#64748b"
                fontSize={12}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="ytd" 
                stroke="#3b82f6" 
                strokeWidth={3}
                name="YTD Performance"
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="oneYear" 
                stroke="#10b981" 
                strokeWidth={3}
                name="1-Year Performance"
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Year-to-Date</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>1-Year Performance</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}