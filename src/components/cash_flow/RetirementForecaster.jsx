import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Info } from "lucide-react";
import { differenceInYears } from "date-fns";

const formatCurrency = (value) => {
    if (typeof value !== 'number' || isNaN(value)) {
        return "$0";
    }
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export default function RetirementForecaster({ client, incomeItems, expenseItems, totalNetAnnualIncome }) {
    const calculateInitialAge = () => {
        if (!client?.date_of_birth) return 65;
        try {
            const age = differenceInYears(new Date(), new Date(client.date_of_birth));
            return age > 65 ? age : 65;
        } catch {
            return 65;
        }
    };
    
    const [retirementStartAge, setRetirementStartAge] = useState(calculateInitialAge());
    const [lifeExpectancy, setLifeExpectancy] = useState(90);
    const [anticipatedIncomes, setAnticipatedIncomes] = useState([]);
    const [newIncomeSource, setNewIncomeSource] = useState("");
    const [newIncomeAmount, setNewIncomeAmount] = useState("");

    const handleAddAnticipatedIncome = () => {
        if (newIncomeSource.trim() && newIncomeAmount) {
            setAnticipatedIncomes(prev => [
                ...prev,
                { source: newIncomeSource.trim(), amount: parseFloat(newIncomeAmount) }
            ]);
            setNewIncomeSource("");
            setNewIncomeAmount("");
        }
    };

    const handleRemoveAnticipatedIncome = (index) => {
        setAnticipatedIncomes(prev => prev.filter((_, i) => i !== index));
    };

    const forecast = useMemo(() => {
        const annualExpenses = expenseItems.reduce((sum, item) => sum + (item.amount || 0), 0);
        const retirementExpensesToExclude = expenseItems
            .filter(item => item.exclude_from_retirement)
            .reduce((sum, item) => sum + (item.amount || 0), 0);
        
        const estimatedAnnualRetirementNeed = annualExpenses - retirementExpensesToExclude;

        const totalAnticipatedIncome = anticipatedIncomes.reduce((sum, item) => sum + (item.amount || 0), 0);

        const retirementSurplusOrShortfall = totalAnticipatedIncome - estimatedAnnualRetirementNeed;

        const incomeReplacementRatio = totalNetAnnualIncome > 0 
            ? (estimatedAnnualRetirementNeed / totalNetAnnualIncome) * 100
            : 0;

        return {
            estimatedAnnualRetirementNeed,
            totalAnticipatedIncome,
            retirementSurplusOrShortfall,
            incomeReplacementRatio
        };
    }, [expenseItems, anticipatedIncomes, totalNetAnnualIncome]);

    return (
        <Card className="mt-6 border-blue-200 bg-blue-50/50">
            <CardHeader>
                <CardTitle className="text-blue-800">Retirement Forecast</CardTitle>
                <CardDescription>A simple projection based on current data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* --- INPUTS --- */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-slate-800">Assumptions</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="retirement-age">Retirement Age</Label>
                            <Input id="retirement-age" type="number" value={retirementStartAge} onChange={e => setRetirementStartAge(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="life-expectancy">Life Expectancy</Label>
                            <Input id="life-expectancy" type="number" value={lifeExpectancy} onChange={e => setLifeExpectancy(e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* --- ANTICIPATED INCOME --- */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-slate-800">Anticipated Annual Retirement Income</h4>
                    <div className="space-y-2">
                        {anticipatedIncomes.map((income, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-white rounded-md">
                                <span className="text-sm">{income.source}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{formatCurrency(income.amount)}</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => handleRemoveAnticipatedIncome(index)}>
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-end gap-2 p-2 border-t border-slate-200">
                        <div className="flex-grow">
                            <Label htmlFor="new-income-source" className="text-xs">Source</Label>
                            <Input id="new-income-source" placeholder="e.g., CPP, OAS" value={newIncomeSource} onChange={e => setNewIncomeSource(e.target.value)} className="h-8" />
                        </div>
                        <div className="w-32">
                            <Label htmlFor="new-income-amount" className="text-xs">Amount ($)</Label>
                            <Input id="new-income-amount" type="number" placeholder="Annual" value={newIncomeAmount} onChange={e => setNewIncomeAmount(e.target.value)} className="h-8" />
                        </div>
                        <Button size="sm" onClick={handleAddAnticipatedIncome}><Plus className="w-4 h-4" /></Button>
                    </div>
                </div>

                {/* --- OUTPUTS --- */}
                <div className="space-y-4 pt-4 border-t border-blue-200">
                    <h4 className="font-semibold text-slate-800">Forecast Summary</h4>
                    <div className="space-y-3">
                         <div className="flex justify-between items-center">
                            <p className="text-sm text-slate-600">Est. Annual Retirement Need</p>
                            <p className="font-bold text-lg text-blue-800">{formatCurrency(forecast.estimatedAnnualRetirementNeed)}</p>
                        </div>
                         <div className="flex justify-between items-center">
                            <p className="text-sm text-slate-600">Total Anticipated Income</p>
                            <p className="font-semibold text-base text-slate-700">{formatCurrency(forecast.totalAnticipatedIncome)}</p>
                        </div>
                        <div className={`flex justify-between items-center p-3 rounded-lg ${forecast.retirementSurplusOrShortfall >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                            <p className="font-semibold text-sm">{forecast.retirementSurplusOrShortfall >= 0 ? 'Est. Annual Surplus' : 'Est. Annual Shortfall'}</p>
                            <p className={`font-bold text-xl ${forecast.retirementSurplusOrShortfall >= 0 ? 'text-green-800' : 'text-red-800'}`}>{formatCurrency(Math.abs(forecast.retirementSurplusOrShortfall))}</p>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <p className="text-slate-600">Income Replacement Ratio</p>
                            <p className="font-medium text-slate-800">{forecast.incomeReplacementRatio.toFixed(1)}%</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 text-xs text-slate-500 bg-slate-100 rounded-lg">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>All figures are in today's dollars and do not account for inflation, investment returns, or changes in lifestyle. This is a simplified estimate.</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}