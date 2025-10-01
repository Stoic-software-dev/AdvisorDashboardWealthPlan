
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, PieChart, Calculator, DollarSign, Home } from 'lucide-react'; // Added Home icon

// A simple color palette for the charts
const COLORS = ['#4f46e5', '#10b981', '#f97316', '#3b82f6', '#ec4899', '#8b5cf6'];

const formatCurrency = (value) => `$${Math.round(value / 1000)}k`;

export default function ComparisonCharts({ data, comparisonType = 'main_view' }) {
    if (!data || data.length === 0) return null;

    // Main View Charts
    if (comparisonType === 'main_view') {
        const hasIncomeData = data.some(scenario => scenario.projectionData && scenario.projectionData.length > 0);
        const hasNetWorthData = data.some(scenario => scenario.netWorthData && scenario.netWorthData.length > 0);

        return (
            <div className="grid grid-cols-1 gap-8">
                {hasIncomeData && (
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-600" />
                                Projected Income vs. Target Income
                            </CardTitle>
                            <CardDescription>
                                Comparing the projected total income against the target income goal for each scenario.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="age" 
                                        type="number" 
                                        domain={['dataMin', 'dataMax']} 
                                        allowDuplicatedCategory={false}
                                        label={{ value: 'Age', position: 'insideBottom', offset: -10 }}
                                    />
                                    <YAxis tickFormatter={formatCurrency} />
                                    <Tooltip formatter={(value) => `$${Math.round(value).toLocaleString()}`}/>
                                    <Legend />
                                    {data.map((scenario, index) => [
                                        <Line 
                                            key={`${scenario.id}-income`} 
                                            type="monotone" 
                                            data={scenario.projectionData} 
                                            dataKey="totalIncome" 
                                            name={`Income (${scenario.name})`} 
                                            stroke={COLORS[index % COLORS.length]} 
                                            dot={false} 
                                        />,
                                        <Line 
                                            key={`${scenario.id}-target`} 
                                            type="monotone" 
                                            data={scenario.projectionData} 
                                            dataKey="targetIncome" 
                                            name={`Target (${scenario.name})`} 
                                            stroke={COLORS[index % COLORS.length]} 
                                            strokeDasharray="5 5"
                                            dot={false} 
                                        />
                                    ])}
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                {hasNetWorthData && (
                     <Card className="shadow-lg">
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2">
                                 <PieChart className="w-5 h-5 text-green-600"/>
                                 Projected Net Worth Comparison
                             </CardTitle>
                             <CardDescription>
                                 A comparison of the projected net worth growth for each scenario over time.
                             </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="age" 
                                        type="number" 
                                        domain={['dataMin', 'dataMax']}
                                        allowDuplicatedCategory={false}
                                        label={{ value: 'Age', position: 'insideBottom', offset: -10 }}
                                    />
                                    <YAxis tickFormatter={formatCurrency} />
                                    <Tooltip formatter={(value) => `$${Math.round(value).toLocaleString()}`}/>
                                    <Legend />
                                    {data.map((scenario, index) => (
                                        <Line 
                                            key={scenario.id} 
                                            type="monotone" 
                                            data={scenario.netWorthData} 
                                            dataKey="netWorth" 
                                            name={scenario.name} 
                                            stroke={COLORS[index % COLORS.length]} 
                                            dot={false}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    }

    // Capital Assets Charts
    if (comparisonType === 'capital_assets') {
        return (
            <div className="grid grid-cols-1 gap-8">
                {/* Ending Balance Over Time */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-blue-600" />
                            Account Balance Growth Comparison
                        </CardTitle>
                        <CardDescription>
                            Comparing the projected account balance growth over time for each scenario.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="age" 
                                    type="number" 
                                    domain={['dataMin', 'dataMax']}
                                    allowDuplicatedCategory={false}
                                    label={{ value: 'Age', position: 'insideBottom', offset: -10 }}
                                />
                                <YAxis tickFormatter={formatCurrency} />
                                <Tooltip formatter={(value) => `$${Math.round(value).toLocaleString()}`}/>
                                <Legend />
                                {data.map((scenario, index) => (
                                    <Line 
                                        key={scenario.id} 
                                        type="monotone" 
                                        data={scenario.projectionData} 
                                        dataKey="endingBalance" 
                                        name={scenario.name} 
                                        stroke={COLORS[index % COLORS.length]} 
                                        dot={false}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Cumulative Growth Comparison */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            Cumulative Growth Comparison
                        </CardTitle>
                        <CardDescription>
                            Total investment growth accumulated over time for each scenario.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="age" 
                                    type="number" 
                                    domain={['dataMin', 'dataMax']}
                                    allowDuplicatedCategory={false}
                                    label={{ value: 'Age', position: 'insideBottom', offset: -10 }}
                                />
                                <YAxis tickFormatter={formatCurrency} />
                                <Tooltip formatter={(value) => `$${Math.round(value).toLocaleString()}`}/>
                                <Legend />
                                {data.map((scenario, index) => (
                                    <Line 
                                        key={scenario.id} 
                                        type="monotone" 
                                        data={scenario.projectionData} 
                                        dataKey="cumulativeTotalGrowth" 
                                        name={scenario.name} 
                                        stroke={COLORS[index % COLORS.length]} 
                                        dot={false}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Tax Impact Comparison */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-red-600" />
                            Tax Impact Comparison
                        </CardTitle>
                        <CardDescription>
                            Cumulative tax savings and tax on growth for each scenario.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="age" 
                                    type="number" 
                                    domain={['dataMin', 'dataMax']}
                                    allowDuplicatedCategory={false}
                                    label={{ value: 'Age', position: 'insideBottom', offset: -10 }}
                                />
                                <YAxis tickFormatter={formatCurrency} />
                                <Tooltip formatter={(value) => `$${Math.round(value).toLocaleString()}`}/>
                                <Legend />
                                {data.map((scenario, index) => [
                                    <Line 
                                        key={`${scenario.id}-savings`} 
                                        type="monotone" 
                                        data={scenario.projectionData} 
                                        dataKey="cumulativeTotalTaxSavings" 
                                        name={`Tax Savings (${scenario.name})`} 
                                        stroke={COLORS[index % COLORS.length]} 
                                        strokeDasharray="5 5"
                                        dot={false} 
                                    />,
                                    <Line 
                                        key={`${scenario.id}-tax`} 
                                        type="monotone" 
                                        data={scenario.projectionData} 
                                        dataKey="cumulativeTotalTaxOnGrowth" 
                                        name={`Tax on Growth (${scenario.name})`} 
                                        stroke={COLORS[index % COLORS.length]} 
                                        dot={false} 
                                    />
                                ])}
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Mortgage/Debt Repayment Charts
    if (comparisonType === 'mortgage') {
        return (
            <div className="grid grid-cols-1 gap-8">
                {/* Remaining Balance Over Time */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Home className="w-5 h-5 text-red-600" />
                            Loan Balance Reduction Comparison
                        </CardTitle>
                        <CardDescription>
                            Comparing the loan balance reduction over time for each debt repayment scenario.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="age" 
                                    type="number" 
                                    domain={['dataMin', 'dataMax']}
                                    allowDuplicatedCategory={false}
                                    label={{ value: 'Age', position: 'insideBottom', offset: -10 }}
                                />
                                <YAxis tickFormatter={formatCurrency} />
                                <Tooltip formatter={(value) => `$${Math.round(value).toLocaleString()}`}/>
                                <Legend />
                                {data.map((scenario, index) => (
                                    <Line 
                                        key={scenario.id} 
                                        type="monotone" 
                                        data={scenario.projectionData} 
                                        dataKey="closingBalance" 
                                        name={scenario.name} 
                                        stroke={COLORS[index % COLORS.length]} 
                                        dot={false}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Cumulative Interest Paid Comparison */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-orange-600" />
                            Cumulative Interest Paid Comparison
                        </CardTitle>
                        <CardDescription>
                            Total interest paid over time for each debt repayment scenario.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="age" 
                                    type="number" 
                                    domain={['dataMin', 'dataMax']}
                                    allowDuplicatedCategory={false}
                                    label={{ value: 'Age', position: 'insideBottom', offset: -10 }}
                                />
                                <YAxis tickFormatter={formatCurrency} />
                                <Tooltip formatter={(value) => `$${Math.round(value).toLocaleString()}`}/>
                                <Legend />
                                {data.map((scenario, index) => (
                                    <Line 
                                        key={scenario.id} 
                                        type="monotone" 
                                        data={scenario.projectionData} 
                                        dataKey="cumulativeTotalInterest" 
                                        name={scenario.name} 
                                        stroke={COLORS[index % COLORS.length]} 
                                        dot={false}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Total Payments Made Comparison */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            Cumulative Total Payments Comparison
                        </CardTitle>
                        <CardDescription>
                            Total payments made (principal + interest + extra) over time for each scenario.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="age" 
                                    type="number" 
                                    domain={['dataMin', 'dataMax']}
                                    allowDuplicatedCategory={false}
                                    label={{ value: 'Age', position: 'insideBottom', offset: -10 }}
                                />
                                <YAxis tickFormatter={formatCurrency} />
                                <Tooltip formatter={(value) => `$${Math.round(value).toLocaleString()}`}/>
                                <Legend />
                                {data.map((scenario, index) => (
                                    <Line 
                                        key={scenario.id} 
                                        type="monotone" 
                                        data={scenario.projectionData} 
                                        dataKey="cumulativeTotalPayments" 
                                        name={scenario.name} 
                                        stroke={COLORS[index % COLORS.length]} 
                                        dot={false}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Fixed Income Charts
    if (comparisonType === 'fixed_income') {
        return (
            <div className="grid grid-cols-1 gap-8">
                {/* Total Annual Income Over Time */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-purple-600" />
                            Annual Income Comparison
                        </CardTitle>
                        <CardDescription>
                            Comparing total annual income over time for each Fixed Income scenario.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="age" 
                                    type="number" 
                                    domain={['dataMin', 'dataMax']}
                                    allowDuplicatedCategory={false}
                                    label={{ value: 'Age', position: 'insideBottom', offset: -10 }}
                                />
                                <YAxis tickFormatter={formatCurrency} />
                                <Tooltip formatter={(value) => `$${Math.round(value).toLocaleString()}`}/>
                                <Legend />
                                {data.map((scenario, index) => (
                                    <Line 
                                        key={scenario.id} 
                                        type="monotone" 
                                        data={scenario.projectionData} 
                                        dataKey="totalAnnualIncome" 
                                        name={scenario.name} 
                                        stroke={COLORS[index % COLORS.length]} 
                                        dot={false}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Cumulative Income Comparison */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            Cumulative Income Comparison
                        </CardTitle>
                        <CardDescription>
                            Total cumulative income over time for each Fixed Income scenario.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="age" 
                                    type="number" 
                                    domain={['dataMin', 'dataMax']}
                                    allowDuplicatedCategory={false}
                                    label={{ value: 'Age', position: 'insideBottom', offset: -10 }}
                                />
                                <YAxis tickFormatter={formatCurrency} />
                                <Tooltip formatter={(value) => `$${Math.round(value).toLocaleString()}`}/>
                                <Legend />
                                {data.map((scenario, index) => (
                                    <Line 
                                        key={scenario.id} 
                                        type="monotone" 
                                        data={scenario.projectionData} 
                                        dataKey="cumulativeIncome" 
                                        name={scenario.name} 
                                        stroke={COLORS[index % COLORS.length]} 
                                        dot={false}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Income Sources Breakdown - All Scenarios */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChart className="w-5 h-5 text-blue-600" />
                            Income Sources Breakdown - All Scenarios
                        </CardTitle>
                        <CardDescription>
                            Breakdown of income sources over time for all scenarios.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={500}>
                            <LineChart margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="age" 
                                    type="number"
                                    domain={['dataMin', 'dataMax']}
                                    allowDuplicatedCategory={false}
                                    label={{ value: 'Age', position: 'insideBottom', offset: -10 }} 
                                />
                                <YAxis tickFormatter={formatCurrency} />
                                <Tooltip formatter={(value) => `$${Math.round(value).toLocaleString()}`}/>
                                <Legend />
                                {data.map((scenario, scenarioIndex) => {
                                    // Check which income sources have non-zero values for this scenario
                                    const hasNonZeroCPP = scenario.projectionData.some(row => (row.cppIncome || 0) > 0);
                                    const hasNonZeroOAS = scenario.projectionData.some(row => (row.oasIncome || 0) > 0);
                                    const hasNonZeroEmployerPension = scenario.projectionData.some(row => (row.employerPensionIncome || 0) > 0);
                                    const hasNonZeroBridge = scenario.projectionData.some(row => (row.bridgeIncome || 0) > 0);
                                    const hasNonZeroOther1 = scenario.projectionData.some(row => (row.otherIncome1 || 0) > 0);
                                    const hasNonZeroOther2 = scenario.projectionData.some(row => (row.otherIncome2 || 0) > 0);

                                    const lines = [];
                                    
                                    if (hasNonZeroCPP) {
                                        lines.push(
                                            <Line 
                                                key={`${scenario.id}-cpp`}
                                                type="monotone" 
                                                data={scenario.projectionData} 
                                                dataKey="cppIncome" 
                                                name={`CPP (${scenario.name})`} 
                                                stroke={COLORS[scenarioIndex % COLORS.length]} 
                                                strokeDasharray="5 5"
                                                dot={false} 
                                            />
                                        );
                                    }

                                    if (hasNonZeroOAS) {
                                        lines.push(
                                            <Line 
                                                key={`${scenario.id}-oas`}
                                                type="monotone" 
                                                data={scenario.projectionData} 
                                                dataKey="oasIncome" 
                                                name={`OAS (${scenario.name})`} 
                                                stroke={COLORS[scenarioIndex % COLORS.length]} 
                                                strokeDasharray="10 5"
                                                dot={false} 
                                            />
                                        );
                                    }

                                    if (hasNonZeroEmployerPension) {
                                        lines.push(
                                            <Line 
                                                key={`${scenario.id}-employer`}
                                                type="monotone" 
                                                data={scenario.projectionData} 
                                                dataKey="employerPensionIncome" 
                                                name={`Employer Pension (${scenario.name})`} 
                                                stroke={COLORS[scenarioIndex % COLORS.length]} 
                                                strokeDasharray="2 2"
                                                dot={false} 
                                            />
                                        );
                                    }

                                    if (hasNonZeroBridge) {
                                        lines.push(
                                            <Line 
                                                key={`${scenario.id}-bridge`}
                                                type="monotone" 
                                                data={scenario.projectionData} 
                                                dataKey="bridgeIncome" 
                                                name={`Bridge Pension (${scenario.name})`} 
                                                stroke={COLORS[scenarioIndex % COLORS.length]} 
                                                strokeDasharray="15 5"
                                                dot={false} 
                                            />
                                        );
                                    }

                                    if (hasNonZeroOther1) {
                                        lines.push(
                                            <Line 
                                                key={`${scenario.id}-other1`}
                                                type="monotone" 
                                                data={scenario.projectionData} 
                                                dataKey="otherIncome1" 
                                                name={`Other Income 1 (${scenario.name})`} 
                                                stroke={COLORS[scenarioIndex % COLORS.length]} 
                                                strokeDasharray="8 2"
                                                dot={false} 
                                            />
                                        );
                                    }

                                    if (hasNonZeroOther2) {
                                        lines.push(
                                            <Line 
                                                key={`${scenario.id}-other2`}
                                                type="monotone" 
                                                data={scenario.projectionData} 
                                                dataKey="otherIncome2" 
                                                name={`Other Income 2 (${scenario.name})`} 
                                                stroke={COLORS[scenarioIndex % COLORS.length]} 
                                                strokeDasharray="12 3"
                                                dot={false} 
                                            />
                                        );
                                    }

                                    return lines;
                                })}
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return null;
}
