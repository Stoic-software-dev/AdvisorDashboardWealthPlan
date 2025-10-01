
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { InvokeLLM } from '@/api/integrations';
import ReactMarkdown from 'react-markdown';

export default function ScenarioAIAnalysis({ data, comparisonType }) {
    const [analysis, setAnalysis] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const generateAnalysis = async () => {
        if (!data || data.length === 0) return;
        
        setIsAnalyzing(true);
        try {
            let scenarioSummary = [];
            let analysisContext = "";

            if (comparisonType === 'main_view') {
                analysisContext = "This is a comparison of comprehensive financial plans (Main View).";
                scenarioSummary = data.map(scenario => ({
                    'Scenario Name': scenario.name,
                    'Peak Net Worth': `$${Math.round(scenario.peakNetWorth || 0).toLocaleString()}`,
                    'Final Estate Value': `$${Math.round(scenario.finalEstateValue || 0).toLocaleString()}`,
                    'Details': `Net worth data available for ${scenario.netWorthData?.length || 0} years. Projection data available for ${scenario.projectionData?.length || 0} years.`
                }));
            } else if (comparisonType === 'capital_assets') {
                analysisContext = "This is a comparison of investment account projections (Capital Assets).";
                scenarioSummary = data.map(scenario => ({
                    'Scenario Name': scenario.name,
                    'Ending Balance': `$${(scenario.finalMetrics?.endingBalance || 0).toLocaleString()}`,
                    'Total Growth': `$${(scenario.finalMetrics?.totalGrowth || 0).toLocaleString()}`,
                    'Total Tax Payable': `$${(scenario.finalMetrics?.totalTaxPayable || 0).toLocaleString()}`,
                    'Total Tax Savings': `$${(scenario.finalMetrics?.totalTaxSavings || 0).toLocaleString()}`,
                }));
            } else if (comparisonType === 'fixed_income') {
                analysisContext = "This is a comparison of fixed income and pension planning scenarios.";
                scenarioSummary = data.map(scenario => ({
                    'Scenario Name': scenario.name,
                    'Total Lifetime Income': `$${(scenario.finalMetrics?.totalLifetimeIncome || 0).toLocaleString()}`,
                    'Average Annual Income': `$${(scenario.finalMetrics?.averageAnnualIncome || 0).toLocaleString()}`,
                    'Peak Annual Income': `$${(scenario.finalMetrics?.peakAnnualIncome || 0).toLocaleString()}`,
                    'Years of Income': `${scenario.finalMetrics?.yearsOfIncome || 0} years`,
                    'Total After-Tax Income': `$${(scenario.finalMetrics?.totalAfterTaxIncome || 0).toLocaleString()}`,
                }));
            } else if (comparisonType === 'mortgage') {
                analysisContext = "This is a comparison of debt repayment strategies.";
                scenarioSummary = data.map(scenario => ({
                    'Scenario Name': scenario.name,
                    'Years to Pay Off': `${scenario.finalMetrics?.yearsToPayoff || 'N/A'} years`,
                    'Total Interest Paid': `$${(scenario.finalMetrics?.totalInterestPaid || 0).toLocaleString()}`,
                    'Total Payments Made': `$${(scenario.finalMetrics?.totalPaymentsMade || 0).toLocaleString()}`,
                    'Payoff Year': scenario.finalMetrics?.payoffYear || 'N/A'
                }));
            }

            const prompt = `As Giuseppe, an expert financial advisor AI, please analyze the following financial scenario comparison and provide professional insights.
${analysisContext}

SCENARIO DATA SUMMARY:
${JSON.stringify(scenarioSummary, null, 2)}

Please provide a comprehensive analysis including:

1.  **Key Differences**: Highlight the most significant differences between scenarios based on the provided data.
2.  **Strengths & Weaknesses**: Identify what each scenario appears to do well and any potential concerns.
3.  **Recommendations**: Based on the data, which scenario appears most favorable and why? For investment scenarios, consider efficiency (e.g., growth vs. tax). For debt scenarios, consider cost vs. speed.
4.  **Client Considerations**: What important factors should the client think about when choosing between these options?

Format your response in clear, professional language suitable for client presentation. Use bullet points and headings for readability.`;

            const response = await InvokeLLM({
                prompt: prompt,
                add_context_from_internet: false
            });

            setAnalysis(response);
        } catch (error) {
            console.error('Error generating analysis:', error);
            setAnalysis('**Analysis Error**: Unable to generate scenario analysis at this time. Please try again later.');
        }
        setIsAnalyzing(false);
    };

    const clearAnalysis = () => {
        setAnalysis('');
    };

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-green-600" />
                    Giuseppe AI Analysis
                </CardTitle>
                <CardDescription>
                    Get professional insights and recommendations on your scenario comparison from Giuseppe, your AI financial advisor.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-3 mb-4">
                    <Button
                        onClick={generateAnalysis}
                        disabled={isAnalyzing || !data || data.length === 0}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {isAnalyzing ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        {analysis ? 'Regenerate Analysis' : 'Analyze Scenarios'}
                    </Button>
                    
                    {analysis && (
                        <Button
                            onClick={clearAnalysis}
                            variant="outline"
                            className="border-slate-300"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Clear Analysis
                        </Button>
                    )}
                </div>

                {analysis && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
                        <div className="prose prose-sm max-w-none">
                            <ReactMarkdown>{analysis}</ReactMarkdown>
                        </div>
                    </div>
                )}

                {!analysis && !isAnalyzing && (
                    <div className="text-center py-8 text-slate-500">
                        <Bot className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="font-medium">Ready to analyze your scenarios</p>
                        <p className="text-sm">Click "Analyze Scenarios" to get Giuseppe's professional insights on the comparison.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
