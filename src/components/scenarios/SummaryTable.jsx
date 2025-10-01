
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { ListChecks, DollarSign } from 'lucide-react'; // Added DollarSign import

// Fix currency formatting to show proper 2 decimal places
const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export default function SummaryTable({ data, comparisonType = 'main_view' }) {
    if (!data || data.length === 0) return null;

    // Main View Summary Table
    if (comparisonType === 'main_view') {
        return (
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ListChecks className="w-5 h-5 text-indigo-600"/>
                        Scenario Summary
                    </CardTitle>
                    <CardDescription>A side-by-side comparison of key financial outcomes for each scenario.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-bold">Metric</TableHead>
                                {data.map(scenario => (
                                    <TableHead key={scenario.id} className="text-right font-bold">{scenario.name}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">Peak Net Worth</TableCell>
                                {data.map(scenario => (
                                    <TableCell key={scenario.id} className="text-right">{formatCurrency(scenario.peakNetWorth)}</TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Final Estate Value</TableCell>
                                {data.map(scenario => (
                                    <TableCell key={scenario.id} className="text-right">{formatCurrency(scenario.finalEstateValue)}</TableCell>
                                ))}
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        );
    }

    // Capital Assets Summary Table
    if (comparisonType === 'capital_assets') {
        return (
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ListChecks className="w-5 h-5 text-indigo-600"/>
                        Capital Assets Comparison Summary
                    </CardTitle>
                    <CardDescription>A side-by-side comparison of key investment outcomes for each scenario.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-bold">Metric</TableHead>
                                {data.map(scenario => (
                                    <TableHead key={scenario.id} className="text-right font-bold">{scenario.name}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">Final Balance</TableCell>
                                {data.map(scenario => (
                                    <TableCell key={scenario.id} className="text-right">
                                        {formatCurrency(scenario.finalMetrics?.endingBalance)}
                                    </TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Total Growth</TableCell>
                                {data.map(scenario => (
                                    <TableCell key={scenario.id} className="text-right text-green-600">
                                        {formatCurrency(scenario.finalMetrics?.totalGrowth)}
                                    </TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Total Contributions</TableCell>
                                {data.map(scenario => (
                                    <TableCell key={scenario.id} className="text-right text-blue-600">
                                        {formatCurrency(scenario.finalMetrics?.totalContributions)}
                                    </TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Total Redemptions</TableCell>
                                {data.map(scenario => (
                                    <TableCell key={scenario.id} className="text-right text-orange-600">
                                        {formatCurrency(scenario.finalMetrics?.totalRedemptions)}
                                    </TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Total Tax Savings</TableCell>
                                {data.map(scenario => (
                                    <TableCell key={scenario.id} className="text-right text-green-600">
                                        {formatCurrency(scenario.finalMetrics?.totalTaxSavings)}
                                    </TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Total Tax Payable</TableCell>
                                {data.map(scenario => (
                                    <TableCell key={scenario.id} className="text-right text-red-600">
                                        {formatCurrency(scenario.finalMetrics?.totalTaxPayable)}
                                    </TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Total Tax on Growth</TableCell>
                                {data.map(scenario => (
                                    <TableCell key={scenario.id} className="text-right text-red-600">
                                        {formatCurrency(scenario.finalMetrics?.totalTaxOnGrowth)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        );
    }

    // Mortgage/Debt Repayment Summary Table
    if (comparisonType === 'mortgage') {
        return (
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ListChecks className="w-5 h-5 text-indigo-600"/>
                        Debt Repayment Comparison Summary
                    </CardTitle>
                    <CardDescription>A side-by-side comparison of key debt repayment outcomes for each scenario.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-bold">Metric</TableHead>
                                {data.map(scenario => (
                                    <TableHead key={scenario.id} className="text-right font-bold">{scenario.name}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">Total Interest Paid</TableCell>
                                {data.map(scenario => (
                                    <TableCell key={scenario.id} className="text-right text-red-600">
                                        {formatCurrency(scenario.finalMetrics?.totalInterestPaid)}
                                    </TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Total Payments Made</TableCell>
                                {data.map(scenario => (
                                    <TableCell key={scenario.id} className="text-right text-blue-600">
                                        {formatCurrency(scenario.finalMetrics?.totalPaymentsMade)}
                                    </TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Ending Loan Balance</TableCell>
                                {data.map(scenario => (
                                    <TableCell key={scenario.id} className="text-right text-orange-600">
                                        {formatCurrency(scenario.finalMetrics?.endingLoanBalance)}
                                    </TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Years to Pay Off</TableCell>
                                {data.map(scenario => (
                                    <TableCell key={scenario.id} className="text-right text-green-600">
                                        {scenario.finalMetrics?.yearsToPayoff || 'N/A'} years
                                    </TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Payoff Year</TableCell>
                                {data.map(scenario => (
                                    <TableCell key={scenario.id} className="text-right">
                                        {scenario.finalMetrics?.payoffYear || 'N/A'}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        );
    }

    // Fixed Income Summary Table
    if (comparisonType === 'fixed_income') {
        const formatCurrency = (value) => {
            if (value === undefined || value === null || isNaN(value)) return 'N/A';
            return `$${Math.round(value).toLocaleString()}`;
        };

        return (
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-purple-600" />
                        Fixed Income Comparison Summary
                    </CardTitle>
                    <CardDescription>
                        A side-by-side comparison of key income outcomes for each Fixed Income scenario.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Metric</th>
                                    {data.map((scenario) => (
                                        <th key={scenario.id} className="text-left py-3 px-4 font-semibold text-gray-700">
                                            {scenario.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                <tr>
                                    <td className="py-3 px-4 font-medium text-gray-900">Total Lifetime Income</td>
                                    {data.map((scenario) => (
                                        <td key={scenario.id} className="py-3 px-4 text-green-600 font-semibold">
                                            {formatCurrency(scenario.finalMetrics?.totalLifetimeIncome)}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 font-medium text-gray-900">Total After-Tax Income</td>
                                    {data.map((scenario) => (
                                        <td key={scenario.id} className="py-3 px-4 text-blue-600 font-semibold">
                                            {formatCurrency(scenario.finalMetrics?.totalAfterTaxIncome)}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 font-medium text-gray-900">CPP Lifetime Total</td>
                                    {data.map((scenario) => (
                                        <td key={scenario.id} className="py-3 px-4 text-indigo-600 font-semibold">
                                            {formatCurrency(scenario.finalMetrics?.cppLifetimeTotal)}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 font-medium text-gray-900">OAS Lifetime Total</td>
                                    {data.map((scenario) => (
                                        <td key={scenario.id} className="py-3 px-4 text-orange-600 font-semibold">
                                            {formatCurrency(scenario.finalMetrics?.oasLifetimeTotal)}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 font-medium text-gray-900">Average Annual Income</td>
                                    {data.map((scenario) => (
                                        <td key={scenario.id} className="py-3 px-4 text-gray-700">
                                            {formatCurrency(scenario.finalMetrics?.averageAnnualIncome)}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 font-medium text-gray-900">Peak Annual Income</td>
                                    {data.map((scenario) => (
                                        <td key={scenario.id} className="py-3 px-4 text-purple-600">
                                            {formatCurrency(scenario.finalMetrics?.peakAnnualIncome)}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 font-medium text-gray-900">Years of Income</td>
                                    {data.map((scenario) => (
                                        <td key={scenario.id} className="py-3 px-4 text-gray-700">
                                            {scenario.finalMetrics?.yearsOfIncome || 'N/A'}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 font-medium text-gray-900">Total Taxes Paid</td>
                                    {data.map((scenario) => (
                                        <td key={scenario.id} className="py-3 px-4 text-red-600">
                                            {formatCurrency(scenario.finalMetrics?.totalTaxesPaid)}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return null;
}
