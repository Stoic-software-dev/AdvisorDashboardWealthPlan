import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Lightbulb, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { InvokeLLM } from "@/api/integrations";
import ReactMarkdown from 'react-markdown';

export default function GoalRecommendations({ goal, client }) {
  const [recommendations, setRecommendations] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    setRecommendations(null);

    if (!client) {
      setError("Client data is missing. Cannot generate recommendations.");
      setIsLoading(false);
      return;
    }

    const prompt = `
      As a professional financial advisor in Canada, create a set of actionable recommendations for a client. 
      The response should be in Markdown format.

      **Client Profile:**
      - **Name:** ${client.first_name} ${client.last_name}
      - **Annual Income:** $${client.annual_income?.toLocaleString()} CAD
      - **Net Worth:** $${client.net_worth?.toLocaleString()} CAD
      - **Risk Tolerance:** ${client.risk_tolerance}

      **Financial Goal:**
      - **Goal:** ${goal.goal_name} (${goal.goal_type?.replace(/_/g, ' ')})
      - **Description:** ${goal.description}
      - **Target Amount:** $${goal.target_amount?.toLocaleString()} CAD
      - **Current Amount:** $${goal.current_amount?.toLocaleString()} CAD
      - **Target Date:** ${goal.target_date}
      - **Planned Monthly Contribution:** $${goal.monthly_contribution?.toLocaleString()} CAD

      Based on this information, provide:
      1.  A brief **Summary** of the client's current situation regarding this goal.
      2.  A list of 3-5 specific, **Actionable Steps** they can take. For each step, suggest specific Canadian investment vehicles where appropriate (e.g., TFSA, RRSP, specific types of ETFs or mutual funds).
      3.  A short list of potential **Risks or Considerations** they should be aware of.

      Format the entire response in Markdown, using headings, bold text, and lists.
    `;

    try {
      const result = await InvokeLLM({ prompt });
      setRecommendations(result);
    } catch (err) {
      console.error("Error generating recommendations:", err);
      setError("Failed to generate recommendations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Sparkles className="w-5 h-5 text-blue-600" />
            AI-Powered Recommendations
          </CardTitle>
          <Button onClick={generateRecommendations} disabled={isLoading || !client} size="sm">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Plan"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-600 mb-4" />
            <p className="text-slate-600">Analyzing client data and generating recommendations...</p>
          </div>
        )}
        {error && <p className="text-red-500 p-4 bg-red-50 rounded-md">{error}</p>}
        {recommendations && (
          <div className="prose prose-slate max-w-none prose-sm">
            <ReactMarkdown>{recommendations}</ReactMarkdown>
          </div>
        )}
        {!isLoading && !recommendations && !error && (
          <div className="text-center py-8 text-slate-500">
            {!client ? (
              <>
                <AlertTriangle className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
                <p className="font-semibold">Client data not available.</p>
                <p className="text-xs">Recommendations cannot be generated for this goal.</p>
              </>
            ) : (
              <p>Click "Generate Plan" to get personalized recommendations for this goal.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}