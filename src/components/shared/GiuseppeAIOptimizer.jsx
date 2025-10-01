
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, AlertCircle, Bot } from "lucide-react";
import { InvokeLLM } from "@/api/integrations";
import ReactMarkdown from 'react-markdown';

const GiuseppeAIOptimizer = ({ calculatorName, calculatorData }) => {
  const [analysis, setAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAnalysis('');

    // More detailed and specific prompt based on the calculator type
    let prompt;
    if (calculatorName === 'Portfolio Comparison') {
        prompt = `You are Giuseppe, an expert portfolio analyst. Provide a comprehensive analysis of these two portfolios.

**Current Portfolio:**
\`\`\`json
${JSON.stringify(calculatorData.currentPosition, null, 2)}
\`\`\`

**Target Portfolio:**
\`\`\`json
${JSON.stringify(calculatorData.targetPosition, null, 2)}
\`\`\`

**Your Task:**
1.  **Portfolio Comparison Overview:** Highlight key differences, alignment with risk tolerance (if available), and diversification.
2.  **Strategic Recommendations:** Suggest specific rebalancing steps, considering tax efficiency and risk management.
3.  **Implementation Guidance:** Prioritize changes and discuss potential challenges.

Structure your response clearly using markdown. Ensure your analysis is insightful and tailored to the provided data.`;
    } else {
        prompt = `
        As an expert financial planning AI named Giuseppe, please provide a detailed analysis and optimization suggestions for the following financial scenario from the "${calculatorName}".
        
        **CRITICAL CONTEXT: You are a Canadian financial advisor. All advice, terminology, and recommendations MUST be specific to the Canadian financial system. Use accounts like RRSP, TFSA, RESP, etc. NEVER recommend US accounts like 401(k) or IRA.**

        **Scenario Data:**
        \`\`\`json
        ${JSON.stringify(calculatorData, null, 2)}
        \`\`\`

        **Your Task:**
        1.  **Analyze the current situation:** Summarize the key inputs and projected outcomes. Identify strengths and weaknesses.
        2.  **Provide actionable recommendations:** Offer specific, numbered suggestions to optimize the plan.
        3.  **Projected Impact:** Describe the potential positive impact of your recommendations.
        4.  **Concluding Remarks:** End with a concise, encouraging summary.

        Structure your response clearly using markdown for readability. Ensure your analysis is insightful and tailored to the provided data.
        `;
    }

    if (calculatorName === 'All-In-One Calculator') {
      prompt += `\n\n**Important:** Your entire analysis must adhere to the FP Canada Financial Planning Standards. Frame your recommendations within this regulatory context, mentioning relevant principles where applicable.`;
    }

    try {
      const result = await InvokeLLM({ prompt });
      setAnalysis(result);
    } catch (err) {
      console.error("AI analysis failed:", err);
      setError("Sorry, I couldn't generate an analysis at this time. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [calculatorName, calculatorData]);

  return (
    <Card className="border-none shadow-lg bg-indigo-50/50 backdrop-blur-sm mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-indigo-800">
          <Bot className="w-5 h-5" />
          Giuseppe AI Optimizer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600 mb-4">
          Let Giuseppe, your AI assistant, analyze this scenario to find opportunities for optimization and improvement.
        </p>
        <Button onClick={generateAnalysis} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Generate AI Analysis"
          )}
        </Button>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-100 p-3 rounded-lg">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}

        {analysis && (
          <div className="mt-6 p-4 bg-white/60 rounded-lg shadow-inner">
            <h4 className="text-lg font-semibold text-slate-800 mb-2">Giuseppe's Analysis</h4>
            <ReactMarkdown className="prose prose-sm max-w-none text-slate-700">
              {analysis}
            </ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GiuseppeAIOptimizer;
