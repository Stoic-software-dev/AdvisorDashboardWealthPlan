import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']; // blue, green, amber, red, violet

const AllocationPieChart = ({ allocation }) => {
  if (!allocation) {
    return <div className="text-center text-slate-500">No allocation data.</div>;
  }

  const data = [
    { name: 'Equity', value: allocation.equity || 0 },
    { name: 'Fixed Income', value: allocation.fixed_income || 0 },
    { name: 'Cash', value: allocation.cash || 0 },
    { name: 'Alternatives', value: allocation.alternatives || 0 },
  ].filter(item => item.value > 0); // Only show slices with positive values

  if (data.length === 0) {
    return <div className="text-center text-slate-500">No allocation to display.</div>;
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-white border border-gray-300 rounded shadow-md text-sm">
          <p className="font-semibold">{payload[0].name}: {(payload[0].value * 100).toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          fill="#8884d8"
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Legend 
            align="center" 
            verticalAlign="bottom" 
            layout="horizontal"
            iconType="circle"
            formatter={(value, entry) => `${value} (${(entry.payload.value * 100).toFixed(0)}%)`}
        />
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default AllocationPieChart;