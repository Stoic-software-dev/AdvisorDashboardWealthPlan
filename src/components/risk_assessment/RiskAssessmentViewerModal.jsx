
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, Building, Hash, Bot, Loader2, RotateCcw, Save, X, FileText } from 'lucide-react';
import AllocationPieChart from './AllocationPieChart';
import RiskProfileVisualizer from './RiskProfileVisualizer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { InvokeLLM } from '@/api/integrations';
import { Portfolio, RiskAssessment } from '@/api/entities';

const accountTypeLabels = {
  'rrsp': 'RRSP',
  'rrif': 'RRIF',
  'tfsa': 'TFSA',
  'resp': 'RESP',
  'lira': 'LIRA',
  'lif': 'LIF',
  'taxable': 'Non-Registered',
  'corporate': 'Corporate',
  'trust': 'Trust',
  'other': 'Other'
};

const accountTypeColors = {
  'rrsp': "bg-blue-100 text-blue-800 border-blue-200",
  'rrif': "bg-indigo-100 text-indigo-800 border-indigo-200",
  'tfsa': "bg-green-100 text-green-800 border-green-200",
  'resp': "bg-purple-100 text-purple-800 border-purple-200",
  'lira': "bg-cyan-100 text-cyan-800 border-cyan-200",
  'lif': "bg-teal-100 text-teal-800 border-teal-200",
  'taxable': "bg-orange-100 text-orange-800 border-orange-200",
  'corporate': "bg-red-100 text-red-800 border-red-200",
  'trust': "bg-slate-100 text-slate-800 border-slate-200",
  'other': "bg-gray-100 text-gray-800 border-gray-200"
};

export default function RiskAssessmentViewerModal({ isOpen, onClose, assessment, clientNames, portfolio, onUpdate }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [generatedStatement, setGeneratedStatement] = useState('');
  const [advisorNotes, setAdvisorNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  if (!isOpen || !assessment) return null;

  // Ensure clientNames is always an array
  const clientNamesArray = Array.isArray(clientNames) ? clientNames : (typeof clientNames === 'string' ? [clientNames] : []);
  
  useEffect(() => {
    if (portfolio?.expectations_statement) {
      setGeneratedStatement(portfolio.expectations_statement);
    }
    if (assessment?.notes) {
      setAdvisorNotes(assessment.notes);
    } else {
      setAdvisorNotes('');
    }
  }, [portfolio, assessment]);

  const formatStatementWithBoldHeadings = (text) => {
    // Split text by lines and process each line
    return text.split('\n').map((line, index) => {
      // Check if line is all caps (likely a heading)
      if (line.trim() && line === line.toUpperCase() && line.length > 5) {
        return (
          <div key={index} className="font-bold text-slate-900 mt-4 mb-2 first:mt-0">
            {line}
          </div>
        );
      } else if (line.trim()) {
        return (
          <div key={index} className="mb-3">
            {line}
          </div>
        );
      } else {
        return <div key={index} className="mb-2"></div>;
      }
    });
  };
  
  const handleGenerateStatement = async () => {
    if (!portfolio || !assessment) return;
    setIsGenerating(true);

    const prompt = `
You are a professional financial advisor's assistant. Your task is to generate a concise "Statement of Expectations" for a client's investment portfolio based on their risk assessment.

**Instructions:**
1. Write in a professional, clear, and encouraging tone.
2. The statement should be 2-3 paragraphs long.
3. **Do not use any markdown formatting, especially asterisks for bolding.** Use plain text only.
4. Structure the statement with clear headings for each section. Use uppercase for headings, for example: "INVESTMENT OBJECTIVE".
5. The statement must be tailored to the specific details provided below.

**Client and Portfolio Information:**
- Client Name(s): ${clientNamesArray.join(' & ')}
- Portfolio Name: ${portfolio.account_name}
- Portfolio Type: ${accountTypeLabels[portfolio.account_type] || portfolio.account_type}
- Risk Profile: ${assessment.risk_profile}
- Risk Score: ${assessment.risk_score} out of 20

**Recommended Asset Allocation:**
- Equity: ${Math.round(assessment.recommended_allocation.equity * 100)}%
- Fixed Income: ${Math.round(assessment.recommended_allocation.fixed_income * 100)}%
- Cash: ${Math.round(assessment.recommended_allocation.cash * 100)}%
${assessment.recommended_allocation.alternatives ? `- Alternatives: ${Math.round(assessment.recommended_allocation.alternatives * 100)}%` : ''}

${additionalNotes ? `**Additional Notes to Include:**\n${additionalNotes}\n` : ''}

Generate a professional Statement of Expectations that explains the investment objective, expected returns, risk considerations, and time horizon appropriate for this ${assessment.risk_profile} risk profile.
`;

    try {
      const response = await InvokeLLM({ prompt });
      setGeneratedStatement(response);
      
    } catch (error) {
      console.error('Error generating expectations statement:', error);
      alert('Failed to generate expectations statement. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveStatement = async () => {
    if (!portfolio || !generatedStatement) return;
    setIsSaving(true);

    try {
      // Update the portfolio with the generated expectations statement
      await Portfolio.update(portfolio.id, {
        ...portfolio,
        expectations_statement: generatedStatement
      });

      // Call onUpdate to refresh the portfolio data
      if (onUpdate) {
        await onUpdate();
      }

      alert('Expectations statement saved successfully!');
      
    } catch (error) {
      console.error('Error saving expectations statement:', error);
      alert('Failed to save expectations statement. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetStatement = () => {
    setGeneratedStatement(portfolio?.expectations_statement || '');
    setAdditionalNotes('');
  };

  const handleSaveNotes = async () => {
    if (!assessment) return;
    setIsSavingNotes(true);
    try {
      await RiskAssessment.update(assessment.id, {
        ...assessment,
        notes: advisorNotes
      });
      if (onUpdate) {
        await onUpdate();
      }
      alert('Advisor notes saved successfully!');
    } catch (error) {
      console.error('Error saving advisor notes:', error);
      alert('Failed to save advisor notes. Please try again.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
              Risk Assessment Details
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <DialogDescription>
            <div className="space-y-1">
              <div>Showing assessment results for {clientNamesArray.join(' & ')}</div>
              {portfolio && (
                <div className="flex items-center gap-2 mt-2">
                  <Building className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-700">{portfolio.account_name}</span>
                  <Badge variant="outline" className={accountTypeColors[portfolio.account_type] || "bg-gray-100 text-gray-800"}>
                    {accountTypeLabels[portfolio.account_type] || portfolio.account_type?.toUpperCase()}
                  </Badge>
                  {portfolio.account_number && (
                    <span className="flex items-center gap-1 text-sm text-slate-500">
                      <Hash className="w-3 h-3" />
                      {portfolio.account_number}
                    </span>
                  )}
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div>
                <p className="text-slate-500 text-sm text-center">Total Risk Score</p>
                <p className="text-5xl font-bold text-slate-800 text-center">{assessment.risk_score}/20</p>
              </div>
              <div className="w-full max-w-xs">
                  <p className="text-slate-500 text-sm mb-2 text-center">Resulting Risk Profile</p>
                  <div className="inline-block w-full py-2 rounded-full bg-blue-100 text-blue-800 text-lg font-semibold text-center mb-2">
                      {assessment.risk_profile}
                  </div>
                  <RiskProfileVisualizer profile={assessment.risk_profile} />
              </div>
            </div>

            <div className="flex flex-col items-center">
              <p className="text-slate-500 font-medium mb-2">Recommended Allocation</p>
              <AllocationPieChart allocation={assessment.recommended_allocation} />
            </div>
          </div>
          <Separator />
          
          {/* Expectations Statement Section */}
          {portfolio && (
            <>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Expectations Statement</h4>
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={handleResetStatement}
                      variant="outline"
                      size="sm"
                      disabled={isGenerating || isSaving}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                    <Button 
                      onClick={handleGenerateStatement}
                      disabled={isGenerating || isSaving}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Bot className="w-4 h-4 mr-2" />
                          Generate with AI
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Additional Notes Input */}
                <div className="mb-4">
                  <Label htmlFor="additional-notes" className="text-sm font-medium text-slate-700 mb-2 block">
                    Additional Notes (Optional)
                  </Label>
                  <Textarea
                    id="additional-notes"
                    placeholder="Add any specific notes or requirements to include in the expectations statement..."
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    className="h-20 resize-none"
                    disabled={isGenerating}
                  />
                </div>

                {/* Generated Statement Display */}
                {generatedStatement ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-slate-50 rounded-lg border max-h-80 overflow-y-auto">
                      <div className="text-sm text-slate-700 leading-relaxed">
                        {formatStatementWithBoldHeadings(generatedStatement)}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleSaveStatement}
                        disabled={isSaving || isGenerating}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Statement
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-lg border text-center">
                    <p className="text-sm text-slate-500 mb-2">No expectations statement generated yet.</p>
                    <p className="text-xs text-slate-400">Add optional notes above and click "Generate with AI" to create a professional statement based on this risk assessment.</p>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}
          
          <div>
            <h4 className="font-semibold mb-2">Assessment Date</h4>
            <p className="text-sm text-slate-600">{new Date(assessment.assessment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <Separator />

          {/* Advisor Notes Section */}
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                Advisor Notes (Internal)
            </h4>
            <Textarea
              placeholder="Add internal notes about this assessment..."
              value={advisorNotes}
              onChange={(e) => setAdvisorNotes(e.target.value)}
              className="h-24"
            />
            <div className="flex justify-end mt-2">
              <Button
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                {isSavingNotes ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Notes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
