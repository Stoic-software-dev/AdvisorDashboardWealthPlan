
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Loader2, Info, HelpCircle } from "lucide-react";

// Helper to format currency
const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '$0';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};

// Add safe stringify helper for robust console logging
const safe = (o) => {
    try {
        // Use Object.keys(o ?? {}).sort() to ensure consistent key order for easier comparison in logs
        // The `o ?? {}` handles cases where `o` itself might be null or undefined.
        return JSON.stringify(o, Object.keys(o ?? {}).sort(), 2);
    } catch {
        // Fallback for objects that cannot be stringified (e.g., circular structures)
        return String(o);
    }
};

// [FI-C] SELECTOR stage - Updated selector functions with comprehensive logging
// These functions are designed to work with a calculator 'instance' object
// which contains various data structures like state_data, mainView, and formData.
const getFixedIncomeStartBalance = (instance, year) => {
    const yearData = instance?.state_data?.projection?.find(p => p.year === year);
    const assetClassData = yearData?.assetClass; // Shorthand for cleaner access

    const sources = {
        fromProjection: assetClassData?.fixedIncome?.startBalance,
        fromProjectionSnake: assetClassData?.fixed_income?.start_balance,
        fromTotals: instance?.state_data?.totals?.assetClass?.fixedIncome, // Example of possible other sources
        fromTotalsBy: instance?.state_data?.totals?.byAssetClass?.fixedIncome, // Example of possible other sources
        fallbackSummary: instance?.mainView?.summary?.assetClass?.fixedIncome, // Example of possible other sources
        fallbackForm: instance?.formData?.fixed_income_start_balance // Example of possible other sources
    };
    console.log("[FI-C] StartBalance selector source/value:", sources); // Changed from console.info, removed safe()
    return sources.fromProjection || sources.fromProjectionSnake || 0;
};

const getFixedIncomeContributions = (instance, year) => {
    const yearData = instance?.state_data?.projection?.find(p => p.year === year);
    const assetClassData = yearData?.assetClass;

    const sources = {
        fromProjectionPeriodic: assetClassData?.fixedIncome?.periodicContribution,
        fromProjectionLump: assetClassData?.fixedIncome?.lumpSumContribution,
        fromProjectionSnakePeriodic: assetClassData?.fixed_income?.periodic_contribution,
        fromProjectionSnakeLump: assetClassData?.fixed_income?.lump_sum_contribution,
        fromTotals: instance?.state_data?.totals?.assetClass?.fixedIncome,
        fromTotalsBy: instance?.state_data?.totals?.byAssetClass?.fixedIncome,
        fallbackSummary: instance?.mainView?.summary?.assetClass?.fixedIncome,
        fallbackForm: instance?.formData?.fixed_income_contributions
    };
    console.log("[FI-C] Contributions selector source/value:", sources); // Changed from console.info, removed safe()

    return (sources.fromProjectionPeriodic || sources.fromProjectionSnakePeriodic || 0) + (sources.fromProjectionLump || sources.fromProjectionSnakeLump || 0);
};

const getFixedIncomeWithdrawals = (instance, year) => {
    const yearData = instance?.state_data?.projection?.find(p => p.year === year);
    const assetClassData = yearData?.assetClass;

    const sources = {
        fromProjectionPeriodic: assetClassData?.fixedIncome?.periodicRedemption,
        fromProjectionLump: assetClassData?.fixedIncome?.lumpSumRedemption,
        fromProjectionSnakePeriodic: assetClassData?.fixed_income?.periodic_redemption,
        fromProjectionSnakeLump: assetClassData?.fixed_income?.lump_sum_redemption,
        fromTotals: instance?.state_data?.totals?.assetClass?.fixedIncome,
        fromTotalsBy: instance?.state_data?.totals?.byAssetClass?.fixedIncome,
        fallbackSummary: instance?.mainView?.summary?.assetClass?.fixedIncome,
        fallbackForm: instance?.formData?.fixed_income_withdrawals
    };
    console.log("[FI-C] Withdrawals selector source/value:", sources); // Changed from console.info, removed safe()

    return (sources.fromProjectionPeriodic || sources.fromProjectionSnakePeriodic || 0) + (sources.fromProjectionLump || sources.fromProjectionSnakeLump || 0);
};

const getFixedIncomeIncome = (instance, year) => {
    const yearData = instance?.state_data?.projection?.find(p => p.year === year);
    const assetClassData = yearData?.assetClass;

    const sources = {
        fromProjection: assetClassData?.fixedIncome?.totalIncome, // Primary source based on new field
        fromProjectionSnake: assetClassData?.fixed_income?.total_income, // Primary source (snake_case)
        // Fallback to withdrawals if total income isn't available,
        // The 'calculated' source reuses the getFixedIncomeWithdrawals logic for consistency.
        calculated: getFixedIncomeWithdrawals(instance, year),
        fromTotals: instance?.state_data?.totals?.assetClass?.fixedIncome,
        fromTotalsBy: instance?.state_data?.totals?.byAssetClass?.fixedIncome,
        fallbackSummary: instance?.mainView?.summary?.assetClass?.fixedIncome,
        fallbackForm: instance?.formData?.fixed_income_income
    };
    console.log("[FI-C] Income selector source/value:", sources); // Changed from console.info, removed safe()

    return sources.fromProjection || sources.fromProjectionSnake || sources.calculated || 0;
};

const getFixedIncomeEndBalance = (instance, year) => {
    const yearData = instance?.state_data?.projection?.find(p => p.year === year);
    const assetClassData = yearData?.assetClass;

    const sources = {
        fromProjection: assetClassData?.fixedIncome?.endBalance,
        fromProjectionSnake: assetClassData?.fixed_income?.end_balance,
        fromTotals: instance?.state_data?.totals?.assetClass?.fixedIncome,
        fromTotalsBy: instance?.state_data?.totals?.byAssetClass?.fixedIncome,
        fallbackSummary: instance?.mainView?.summary?.assetClass?.fixedIncome,
        fallbackForm: instance?.formData?.fixed_income_end_balance
    };
    console.log("[FI-C] EndBalance selector source/value:", sources); // Changed from console.info, removed safe()

    return sources.fromProjection || sources.fromProjectionSnake || 0;
};


const MainViewTable = ({ instances, projectionYears, startYear, formData, onInputChange, isLoading, targetIncome, inflationRate, associatedClientName, associatedClientStartAge, primaryClientName }) => {
    // Helper to parse input values
    const parseValue = (value) => {
        // If the input is empty, return null or undefined, otherwise parse it as a float
        // This prevents storing NaN when the input is cleared
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
    };

    // State for interactive highlighting
    const [highlight, setHighlight] = useState({ type: null, index: null, cell: null });

    // Function to handle double-click events for highlighting
    const handleHighlight = (type, index, cell = null) => {
        if (highlight.type === type) {
            // If the same type of highlight is clicked, toggle it off
            if (type === 'cell' && highlight.cell?.row === cell?.row && highlight.cell?.col === cell?.col) {
                setHighlight({ type: null, index: null, cell: null });
                return;
            }
            if ((type === 'row' || type === 'col') && highlight.index === index) {
                setHighlight({ type: null, index: null, cell: null });
                return;
            }
        }
        // Otherwise, set the new highlight
        setHighlight({ type, index, cell });
    };

    // Function to get the appropriate highlight class based on current state
    const getHighlightClass = (rowIndex, colIndex) => {
        let classes = '';
        if (highlight.type === 'row' && highlight.index === rowIndex) {
            classes += ' bg-green-100 dark:bg-green-900/50';
        }
        if (highlight.type === 'col' && highlight.index === colIndex) {
            classes += ' bg-green-100 dark:bg-green-900/50';
        }
        if (highlight.type === 'cell' && highlight.cell?.row === rowIndex && highlight.cell?.col === colIndex) {
            classes += ' bg-green-100 dark:bg-green-900/50';
        }
        return classes;
    };

    const renderHeader = () => {
        // Determine if the associated client age column should be rendered
        const includeAssociatedClientAge = associatedClientStartAge !== null;
        const colOffset = includeAssociatedClientAge ? 1 : 0; // Offset for column indices

        // Define headers for the second row along with their column spans and corresponding field names if applicable
        // This array helps in mapping the correct absolute column index for highlighting
        // Original col count: 31
        // Fixed Income (1 col) is replaced by 5 new columns. Net change +4 columns.
        // New total col count: 35.
        // Adding Associated Client Age adds 1 more column.
        // New total col count: 35 + colOffset (36 if present, 35 if not).
        const secondRowHeaders = [
            { text: 'Year', colSpan: 1 }, // Col 0
            { text: primaryClientName ? `${primaryClientName} Age` : 'Age', colSpan: 1 }, // Col 1 - Personalize Primary Client Age Column Header
        ];

        if (includeAssociatedClientAge) {
            secondRowHeaders.push({ text: `${associatedClientName} Age`, colSpan: 1 }); // Col 2
        }

        secondRowHeaders.push(
            { text: 'FI Start Balance', colSpan: 1 }, // Col 2 + colOffset
            { text: 'FI Contributions', colSpan: 1 }, // Col 3 + colOffset
            { text: 'FI Withdrawals', colSpan: 1 }, // Col 4 + colOffset
            { text: 'FI Income (Total W/D)', colSpan: 1 }, // Col 5 + colOffset
            { text: 'FI End Balance', colSpan: 1 }, // Col 6 + colOffset
            { text: 'Variable Income', colSpan: 1 }, // Col 7 + colOffset
            { text: 'Total Income', colSpan: 1 }, // Col 8 + colOffset
            { text: 'Target Income', colSpan: 1 }, // Col 9 + colOffset
            { text: '% Achieved', colSpan: 1 }, // Col 10 + colOffset
            { text: 'Shortfall/Surplus', colSpan: 1 }, // Col 11 + colOffset
            { text: 'Tax Estimate', colSpan: 1 }, // Col 12 + colOffset
            { text: 'After Tax Income', colSpan: 1 }, // Col 13 + colOffset
            { text: 'Reg. In', colSpan: 1 }, // Col 14 + colOffset
            { text: 'Reg. Out', colSpan: 1 }, // Col 15 + colOffset
            { text: 'Reg. Balance', colSpan: 1 }, // Col 16 + colOffset
            { text: 'TFSA In', colSpan: 1 }, // Col 17 + colOffset
            { text: 'TFSA Out', colSpan: 1 }, // Col 18 + colOffset
            { text: 'TFSA Balance', colSpan: 1 }, // Col 19 + colOffset
            { text: 'Non-Reg In', colSpan: 1 }, // Col 20 + colOffset
            { text: 'Non-Reg Out', colSpan: 1 }, // Col 21 + colOffset
            { text: 'Non-Reg Balance', colSpan: 1 }, // Col 22 + colOffset
            { text: 'Principal Res.', colSpan: 1 }, // Col 23 + colOffset
            { text: 'Invest. RE', colSpan: 1 }, // Col 24 + colOffset
            { text: 'Other RE', colSpan: 1 }, // Col 25 + colOffset
            { text: 'Net Sale Proceeds', colSpan: 1 }, // Col 26 + colOffset
            { text: 'Principal Mort.', colSpan: 1 }, // Col 27 + colOffset
            { text: 'Long-Term Debt', colSpan: 1 }, // Col 28 + colOffset
            { text: 'Short-Term Debt', colSpan: 1 }, // Col 29 + colOffset
            { text: 'Net Worth Proj.', colSpan: 1 }, // Col 30 + colOffset
            { text: 'Inflation Adj.', colSpan: 1 }, // Col 31 + colOffset
            { text: 'Actual', colSpan: 1 }, // Col 32 + colOffset
            { text: 'Probate Est.', colSpan: 1 }, // Col 33 + colOffset
            { text: 'Final Tax Reg.', colSpan: 1 }, // Col 34 + colOffset
        );

        let currentColumnIndex = 0; // To keep track of the absolute column index for highlighting

        return (
            <thead className="bg-slate-100 sticky top-0 z-10">
                <tr>
                    <th colSpan={2 + colOffset} className="p-2 border text-center font-semibold text-sm bg-slate-200">Main View</th>
                    {/* Retirement Income: 8 original columns. Fixed Income (1) replaced by 5 new = 8-1+5 = 12 columns */}
                    <th colSpan="12" className="p-2 border text-center font-semibold text-sm bg-blue-100">Retirement Income</th>
                    <th colSpan="9" className="p-2 border text-center font-semibold text-sm bg-green-100">Assets</th>
                    <th colSpan="4" className="p-2 border text-center font-semibold text-sm bg-orange-100">Real Estate Assets</th>
                    <th colSpan="3" className="p-2 border text-center font-semibold text-sm bg-red-100">Liabilities</th>
                    <th colSpan="3" className="p-2 border text-center font-semibold text-sm bg-purple-100">Net Worth</th>
                    <th colSpan="2" className="p-2 border text-center font-semibold text-sm bg-gray-200">Estate</th>
                </tr>
                <tr>
                    {secondRowHeaders.map((header) => {
                        const colIdx = currentColumnIndex;
                        currentColumnIndex += header.colSpan; // Increment for the next header's index
                        return (
                            <th
                                key={header.text}
                                className={`p-2 border text-xs ${header.text === 'Target Income' || header.text === 'Actual' ? 'w-32' : ''} ${getHighlightClass(null, colIdx)}`}
                                onDoubleClick={() => handleHighlight('col', colIdx)}
                            >
                                {header.text}
                            </th>
                        );
                    })}
                </tr>
            </thead>
        );
    };

    const renderBody = () => {
        const includeAssociatedClientAge = associatedClientStartAge !== null;
        const colOffset = includeAssociatedClientAge ? 1 : 0; // Offset for column indices
        
        // Total columns is now 35 + colOffset
        if (isLoading) {
            return (
                <tbody>
                    <tr>
                        <td colSpan={35 + colOffset} className="text-center p-8">
                            <div className="flex justify-center items-center">
                                <Loader2 className="w-6 h-6 animate-spin mr-2 text-slate-400" />
                                <span className="text-slate-500">Loading projection data...</span>
                            </div>
                        </td>
                    </tr>
                </tbody>
            );
        }

        // Helper to get data for a specific year from the capital_assets instance
        const getRowData = (yearIndex) => {
            const year = startYear + yearIndex;
            const capitalAssetsInstance = instances.find(inst => inst.calculatorType === 'capital_assets');
            // Ensure we get data for the correct year from the projection
            return capitalAssetsInstance?.state_data?.projection?.find(p => p.year === year) || {};
        };

        return (
            <tbody>
                {Array.from({ length: projectionYears + 1 }).map((_, yearIndex) => {
                    const row = getRowData(yearIndex);
                    const currentYear = startYear + yearIndex;

                    // Get Fixed Income instance for this row (assuming capital_assets is where FI data resides)
                    const instance = instances.find(inst => inst.calculatorType === 'capital_assets');
                    
                    // Calculate inflated target income
                    const inflatedTargetIncome = (row.manualTargetIncome !== undefined && row.manualTargetIncome !== null)
                        ? parseFloat(row.manualTargetIncome)
                        : (targetIncome || 0) * Math.pow(1 + ((inflationRate || 0) / 100), yearIndex);
                    
                    const percentAchieved = inflatedTargetIncome > 0 ? (row.totalIncome / inflatedTargetIncome) * 100 : 0;
                    const shortfallSurplus = row.totalIncome - inflatedTargetIncome;

                    // [FI-C] SELECTOR stage - Get all Fixed Income values with logging
                    const fixedIncomeStart = instance ? getFixedIncomeStartBalance(instance, currentYear) : 0;
                    const fixedIncomeContrib = instance ? getFixedIncomeContributions(instance, currentYear) : 0;
                    const fixedIncomeWithdraw = instance ? getFixedIncomeWithdrawals(instance, currentYear) : 0;
                    const fixedIncomeIncome = instance ? getFixedIncomeIncome(instance, currentYear) : 0;
                    const fixedIncomeEndBalance = instance ? getFixedIncomeEndBalance(instance, currentYear) : 0;

                    // [FI-D] RENDER stage logging
                    console.log("[FI-D] Render props (Fixed Income):", safe({ // Changed from console.info, safe() kept
                        year: currentYear, // Including year for context in the log
                        start: fixedIncomeStart,
                        contrib: fixedIncomeContrib,
                        withdraw: fixedIncomeWithdraw,
                        income: fixedIncomeIncome,
                        endBalance: fixedIncomeEndBalance
                    }));
                    
                    // [FI-SUMMARY] Summary line for each year processed
                    console.log("[FI-SUMMARY]", { // Changed from console.info, removed safe()
                      year: currentYear, 
                      endBalance: fixedIncomeEndBalance, 
                      sourcesTried: [
                        "projection.assetClass.fixedIncome.endBalance", 
                        "projection.assetClass.fixed_income.end_balance",
                        "totals.assetClass.fixedIncome",
                        "totals.byAssetClass.fixedIncome",
                        "mainView.summary.assetClass.fixedIncome",
                        "formData.fixed_income_end_balance"
                      ] 
                    });

                    return (
                        <tr key={currentYear} className={`text-sm even:bg-slate-50 hover:bg-slate-100 ${getHighlightClass(yearIndex, null)}`}>
                            {/* Main View - Col 0 & 1 */}
                            <td 
                                className={`p-1 border text-center font-medium ${getHighlightClass(yearIndex, 0)}`}
                                onDoubleClick={() => handleHighlight('row', yearIndex)} // Double click on Year highlights the row
                            >
                                {currentYear}
                            </td>
                            <td 
                                className={`p-1 border text-center ${getHighlightClass(yearIndex, 1)}`}
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 1 })}
                            >
                                {row.age}
                            </td>
                            {includeAssociatedClientAge && (
                                <td 
                                    className={`p-1 border text-center ${getHighlightClass(yearIndex, 2)}`}
                                    onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 2 })}
                                >
                                    {associatedClientStartAge + yearIndex}
                                </td>
                            )}
                            {/* Fixed Income Columns - New Col 2-6 (now 2+colOffset to 6+colOffset) */}
                            <td className={`p-1 border text-right text-sm text-slate-600 dark:text-slate-300 ${getHighlightClass(yearIndex, 2 + colOffset)}`}
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 2 + colOffset })}
                            >
                                {formatCurrency(fixedIncomeStart)}
                            </td>
                            <td className={`p-1 border text-right text-sm text-green-600 dark:text-green-400 ${getHighlightClass(yearIndex, 3 + colOffset)}`}
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 3 + colOffset })}
                            >
                                {formatCurrency(fixedIncomeContrib)}
                            </td>
                            <td className={`p-1 border text-right text-sm text-red-600 dark:text-red-400 ${getHighlightClass(yearIndex, 4 + colOffset)}`}
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 4 + colOffset })}
                            >
                                {formatCurrency(fixedIncomeWithdraw)}
                            </td>
                            <td className={`p-1 border text-right text-sm text-blue-600 dark:text-blue-400 ${getHighlightClass(yearIndex, 5 + colOffset)}`}
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 5 + colOffset })}
                            >
                                {formatCurrency(fixedIncomeIncome)}
                            </td>
                            <td className={`p-1 border text-right text-sm text-slate-700 dark:text-slate-300 font-semibold ${getHighlightClass(yearIndex, 6 + colOffset)}`}
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 6 + colOffset })}
                            >
                                {formatCurrency(fixedIncomeEndBalance)}
                            </td>
                            {/* Retirement Income (continued) - Col 7-13 (shifted by +4 + colOffset) */}
                            {/* Original Fixed Income (col 2) was replaced by the 5 new Fixed Income columns (col 2-6) */}
                            {/* So the following columns are shifted by +4, and now potentially +colOffset */}
                            <td 
                                className={`p-1 border text-right ${getHighlightClass(yearIndex, 7 + colOffset)}`} // Original col 3 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 7 + colOffset })}
                            >
                                {formatCurrency(row.variableIncome)}
                            </td>
                            <td 
                                className={`p-1 border text-right font-semibold bg-blue-50 ${getHighlightClass(yearIndex, 8 + colOffset)}`} // Original col 4 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 8 + colOffset })}
                            >
                                {formatCurrency(row.totalIncome)}
                            </td>
                            <td 
                                className={`p-1 border text-right w-32 ${getHighlightClass(yearIndex, 9 + colOffset)}`} // Original col 5 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 9 + colOffset })}
                            >
                                <Input
                                    type="text"
                                    className="h-7 text-right bg-blue-50"
                                    placeholder={formatCurrency(inflatedTargetIncome)}
                                    value={row.manualTargetIncome !== undefined && row.manualTargetIncome !== null ? row.manualTargetIncome : ''}
                                    onChange={(e) => onInputChange(currentYear, 'manualTargetIncome', parseValue(e.target.value))}
                                    disabled={isLoading}
                                />
                            </td>
                            <td 
                                className={`p-1 border text-right font-semibold ${percentAchieved >= 100 ? 'text-green-600' : 'text-orange-600'} ${getHighlightClass(yearIndex, 10 + colOffset)}`} // Original col 6 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 10 + colOffset })}
                            >
                                {inflatedTargetIncome > 0 ? `${percentAchieved.toFixed(0)}%` : 'N/A'}
                            </td>
                            <td 
                                className={`p-1 border text-right font-semibold ${shortfallSurplus >= 0 ? 'text-green-600' : 'text-red-600'} ${getHighlightClass(yearIndex, 11 + colOffset)}`} // Original col 7 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 11 + colOffset })}
                            >
                                {formatCurrency(shortfallSurplus)}
                            </td>
                            <td 
                                className={`p-1 border text-right ${getHighlightClass(yearIndex, 12 + colOffset)}`} // Original col 8 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 12 + colOffset })}
                            >
                                {formatCurrency(row.taxEstimate)}
                            </td>
                            <td 
                                className={`p-1 border text-right font-semibold bg-blue-50 ${getHighlightClass(yearIndex, 13 + colOffset)}`} // Original col 9 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 13 + colOffset })}
                            >
                                {formatCurrency(row.afterTaxIncome)}
                            </td>
                            
                            {/* Assets - Col 14-22 (shifted by +4 + colOffset) */}
                            <td 
                                className={`p-1 border text-right text-green-600 ${getHighlightClass(yearIndex, 14 + colOffset)}`} // Original col 10 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 14 + colOffset })}
                            >
                                {formatCurrency(row.regIn)}
                            </td>
                            <td 
                                className={`p-1 border text-right text-red-600 ${getHighlightClass(yearIndex, 15 + colOffset)}`} // Original col 11 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 15 + colOffset })}
                            >
                                {formatCurrency(row.regOut)}
                            </td>
                            <td 
                                className={`p-1 border text-right font-semibold bg-green-50 ${getHighlightClass(yearIndex, 16 + colOffset)}`} // Original col 12 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 16 + colOffset })}
                            >
                                {formatCurrency(row.regBalance)}
                            </td>
                            <td 
                                className={`p-1 border text-right text-green-600 ${getHighlightClass(yearIndex, 17 + colOffset)}`} // Original col 13 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 17 + colOffset })}
                            >
                                {formatCurrency(row.tfsaIn)}
                            </td>
                            <td 
                                className={`p-1 border text-right text-red-600 ${getHighlightClass(yearIndex, 18 + colOffset)}`} // Original col 14 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 18 + colOffset })}
                            >
                                {formatCurrency(row.tfsaOut)}
                            </td>
                            <td 
                                className={`p-1 border text-right font-semibold bg-green-50 ${getHighlightClass(yearIndex, 19 + colOffset)}`} // Original col 15 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 19 + colOffset })}
                            >
                                {formatCurrency(row.tfsaBalance)}
                            </td>
                            <td 
                                className={`p-1 border text-right text-green-600 ${getHighlightClass(yearIndex, 20 + colOffset)}`} // Original col 16 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 20 + colOffset })}
                            >
                                {formatCurrency(row.nonRegIn)}
                            </td>
                            <td 
                                className={`p-1 border text-right text-red-600 ${getHighlightClass(yearIndex, 21 + colOffset)}`} // Original col 17 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 21 + colOffset })}
                            >
                                {formatCurrency(row.nonRegOut)}
                            </td>
                            <td 
                                className={`p-1 border text-right font-semibold bg-green-50 ${getHighlightClass(yearIndex, 22 + colOffset)}`} // Original col 18 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 22 + colOffset })}
                            >
                                {formatCurrency(row.nonRegBalance)}
                            </td>

                            {/* Real Estate - Col 23-26 (shifted by +4 + colOffset) */}
                            <td 
                                className={`p-1 border text-right bg-orange-50 ${getHighlightClass(yearIndex, 23 + colOffset)}`} // Original col 19 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 23 + colOffset })}
                            >
                                {formatCurrency(row.principalResidence)}
                            </td>
                            <td 
                                className={`p-1 border text-right bg-orange-50 ${getHighlightClass(yearIndex, 24 + colOffset)}`} // Original col 20 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 24 + colOffset })}
                            >
                                {formatCurrency(row.investmentRE)}
                            </td>
                            <td 
                                className={`p-1 border text-right bg-orange-50 ${getHighlightClass(yearIndex, 25 + colOffset)}`} // Original col 21 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 25 + colOffset })}
                            >
                                {formatCurrency(row.otherRE)}
                            </td>
                            <td 
                                className={`p-1 border text-right ${getHighlightClass(yearIndex, 26 + colOffset)}`} // Original col 22 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 26 + colOffset })}
                            >
                                {formatCurrency(row.netSaleProceeds)}
                            </td>

                            {/* Liabilities - Col 27-29 (shifted by +4 + colOffset) */}
                            <td 
                                className={`p-1 border text-right bg-red-50 ${getHighlightClass(yearIndex, 27 + colOffset)}`} // Original col 23 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 27 + colOffset })}
                            >
                                {formatCurrency(row.principalMortgage)}
                            </td>
                            <td 
                                className={`p-1 border text-right bg-red-50 ${getHighlightClass(yearIndex, 28 + colOffset)}`} // Original col 24 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 28 + colOffset })}
                            >
                                {formatCurrency(row.longTermDebt)}
                            </td>
                            <td 
                                className={`p-1 border text-right bg-red-50 ${getHighlightClass(yearIndex, 29 + colOffset)}`} // Original col 25 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 29 + colOffset })}
                            >
                                {formatCurrency(row.shortTermDebt)}
                            </td>

                            {/* Net Worth - Col 30-32 (shifted by +4 + colOffset) */}
                            <td 
                                className={`p-1 border text-right font-bold bg-purple-50 ${getHighlightClass(yearIndex, 30 + colOffset)}`} // Original col 26 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 30 + colOffset })}
                            >
                                {formatCurrency(row.netWorthProjection)}
                            </td>
                            <td 
                                className={`p-1 border text-right text-slate-600 ${getHighlightClass(yearIndex, 31 + colOffset)}`} // Original col 27 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 31 + colOffset })}
                            >
                                {formatCurrency(row.inflationAdjustedNW)}
                            </td>
                            <td 
                                className={`p-1 border text-right w-32 ${getHighlightClass(yearIndex, 32 + colOffset)}`} // Original col 28 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 32 + colOffset })}
                            >
                                <Input
                                    type="text"
                                    className="h-7 text-right bg-purple-50"
                                    placeholder="$0"
                                    value={row.actualNetWorth !== undefined && row.actualNetWorth !== null ? row.actualNetWorth : ''}
                                    onChange={(e) => onInputChange(currentYear, 'actualNetWorth', parseValue(e.target.value))}
                                    disabled={isLoading}
                                />
                            </td>

                            {/* Estate - Col 33-34 (shifted by +4 + colOffset) */}
                            <td 
                                className={`p-1 border text-right ${getHighlightClass(yearIndex, 33 + colOffset)}`} // Original col 29 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 33 + colOffset })}
                            >
                                {formatCurrency(row.probateEstimate)}
                            </td>
                            <td 
                                className={`p-1 border text-right ${getHighlightClass(yearIndex, 34 + colOffset)}`} // Original col 30 + 4 + colOffset
                                onDoubleClick={() => handleHighlight('cell', null, { row: yearIndex, col: 34 + colOffset })}
                            >
                                {formatCurrency(row.finalTaxOnReg)}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        );
    };
    
    return (
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <div className="relative max-h-[70vh]">
                <table className="w-full border-collapse">
                    {renderHeader()}
                    {renderBody()}
                </table>
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    );
};

export default MainViewTable;
