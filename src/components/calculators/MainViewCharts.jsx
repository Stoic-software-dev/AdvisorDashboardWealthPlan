import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const formatCurrencyForAxis = (value) => {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border rounded-lg shadow-lg">
        <p className="font-bold">{`Year: ${label}`}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{`${p.name}: ${formatCurrencyForAxis(p.value)}`}</p>
        ))}
      </div>
    );
  }
  return null;
};

const IncomeChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={400}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="age" />
      <YAxis tickFormatter={formatCurrencyForAxis} />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
      <Bar dataKey="cpp" stackId="a" fill="#8884d8" name="CPP" />
      <Bar dataKey="oas" stackId="a" fill="#82ca9d" name="OAS" />
      <Bar dataKey="bridgePension" stackId="a" fill="#ffc658" name="Bridge Pension" />
      <Bar dataKey="privatePension" stackId="a" fill="#ff8042" name="Private Pension" />
      <Bar dataKey="registeredIncome" stackId="a" fill="#0088FE" name="Registered Income" />
      <Bar dataKey="otherIncome1" stackId="a" fill="#00C49F" name="Other Income 1" />
      <Bar dataKey="otherIncome2" stackId="a" fill="#FFBB28" name="Other Income 2" />
      <Bar dataKey="capitalRedemptions" stackId="a" fill="#FF8042" name="Capital Redemptions" />
    </BarChart>
  </ResponsiveContainer>
);

const AssetsChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={400}>
    <AreaChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="age" />
      <YAxis tickFormatter={formatCurrencyForAxis} />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
      <Area type="monotone" dataKey="registeredEndBalance" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Registered" />
      <Area type="monotone" dataKey="nonRegisteredEndBalance" stackId="1" stroke="#22c55e" fill="#22c55e" name="Non-Registered" />
      <Area type="monotone" dataKey="taxFreeEndBalance" stackId="1" stroke="#a855f7" fill="#a855f7" name="Tax-Free" />
      <Area type="monotone" dataKey="principalResidenceValue" stackId="1" stroke="#f97316" fill="#f97316" name="Principal Residence" />
      <Area type="monotone" dataKey="investmentRealEstateValue" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Investment Real Estate" />
    </AreaChart>
  </ResponsiveContainer>
);

const LiabilitiesChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={400}>
    <AreaChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="age" />
      <YAxis tickFormatter={formatCurrencyForAxis} />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
      <Area type="monotone" dataKey="principalMortgageEnd" stackId="1" stroke="#ef4444" fill="#ef4444" name="Principal Mortgage" />
      <Area type="monotone" dataKey="otherMortgageEnd" stackId="1" stroke="#f97316" fill="#f97316" name="Other Mortgages" />
      <Area type="monotone" dataKey="longTermDebtEnd" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Long-Term Debt" />
      <Area type="monotone" dataKey="shortTermDebtEnd" stackId="1" stroke="#6366f1" fill="#6366f1" name="Short-Term Debt" />
    </AreaChart>
  </ResponsiveContainer>
);

const NetWorthChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={400}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="age" />
      <YAxis tickFormatter={formatCurrencyForAxis} />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
      <Line type="monotone" dataKey="netWorth" stroke="#16a34a" strokeWidth={2} name="Net Worth" />
      <Line type="monotone" dataKey="inflationAdjustedNetWorth" stroke="#8b5cf6" strokeWidth={2} name="Inflation Adjusted Net Worth" />
      <Line type="monotone" dataKey="totalAssets" stroke="#3b82f6" strokeDasharray="5 5" name="Total Assets" />
      <Line type="monotone" dataKey="totalLiabilities" stroke="#ef4444" strokeDasharray="5 5" name="Total Liabilities" />
    </LineChart>
  </ResponsiveContainer>
);

const EstateChart = ({ data }) => (
    <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="age" />
            <YAxis tickFormatter={formatCurrencyForAxis} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="grossEstateValue" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Gross Estate" />
            <Area type="monotone" dataKey="finalEstateValue" stackId="2" stroke="#16a34a" fill="#16a34a" name="Final Estate Value" />
        </AreaChart>
    </ResponsiveContainer>
);


export default function MainViewCharts({ activeTab, projectionData, assetData, liabilityData, netWorthData, estateData }) {
  const renderChart = () => {
    switch (activeTab) {
      case 'income':
        return <IncomeChart data={projectionData} />;
      case 'assets':
        return <AssetsChart data={assetData} />;
      case 'liabilities':
        return <LiabilitiesChart data={liabilityData} />;
      case 'networth':
        return <NetWorthChart data={netWorthData} />;
      case 'estate':
        return <EstateChart data={estateData} />;
      default:
        return <p>No chart available for this view.</p>;
    }
  };

  return <div className="mt-6">{renderChart()}</div>;
}