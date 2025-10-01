
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, PieChart, Repeat, User, Users, TrendingUp, Plus, Link as LinkIcon } from 'lucide-react';
import { Client } from '@/api/entities';
import { RiskAssessment } from '@/api/entities';
import { Portfolio } from '@/api/entities';
import ClientCombobox from '../components/shared/ClientCombobox';
import MultiClientSelector from '../components/shared/MultiClientSelector';
import RiskQuestionnaire from '../components/risk_assessment/RiskQuestionnaire';
import AllocationPieChart from '../components/risk_assessment/AllocationPieChart';
import RiskProfileVisualizer from '../components/risk_assessment/RiskProfileVisualizer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const AssessmentResults = ({ result, onRestart, linkedPortfolio }) => (
  <Card className="shadow-lg">
    <CardHeader className="text-center">
      <CardTitle className="text-2xl">Assessment Complete</CardTitle>
      <CardDescription>
        The risk profile has been determined for the selected client(s).
      </CardDescription>
    </CardHeader>
    <CardContent className="p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="flex flex-col items-center justify-center space-y-6">
            <div>
              <p className="text-slate-600 mb-1 text-center">Total Risk Score</p>
              <p className="text-6xl font-bold text-slate-800 text-center">{result.risk_score}</p>
            </div>
            <div className="w-full max-w-sm">
                <p className="text-slate-600 mb-2 text-center">Resulting Risk Profile</p>
                <div className="inline-block w-full px-6 py-2 rounded-full bg-blue-100 text-blue-800 text-xl font-semibold text-center mb-2">
                    {result.risk_profile}
                </div>
                <RiskProfileVisualizer profile={result.risk_profile} />
            </div>

            {/* Display Client Names */}
            <div className="w-full text-center">
                <p className="text-slate-600 mb-2">Assessment for:</p>
                <div className="flex flex-wrap justify-center gap-2">
                    {result.clientNames.map((name, index) => (
                        <Badge key={index} variant="outline" className="text-sm">
                            {name}
                        </Badge>
                    ))}
                </div>
            </div>
        </div>

        <div className="flex flex-col items-center space-y-4">
            <div>
                <p className="text-slate-600 mb-4 text-center font-medium">Recommended Asset Allocation</p>
                <AllocationPieChart allocation={result.recommended_allocation} />
            </div>
            
            <div className="text-center space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="font-semibold text-blue-700">Equity</p>
                        <p className="text-2xl font-bold text-blue-800">
                            {(result.recommended_allocation.equity * 100).toFixed(0)}%
                        </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                        <p className="font-semibold text-green-700">Fixed Income</p>
                        <p className="text-2xl font-bold text-green-800">
                            {(result.recommended_allocation.fixed_income * 100).toFixed(0)}%
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Portfolio Integration Section */}
      <div className="text-center space-y-4">
        <h4 className="text-lg font-semibold text-slate-800">Portfolio Integration</h4>
        
        {linkedPortfolio ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg max-w-md mx-auto">
            <p className="text-green-800 font-medium mb-2 flex items-center justify-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Successfully linked to portfolio:
            </p>
            <p className="text-lg font-semibold text-green-900">
              {linkedPortfolio.account_name} ({linkedPortfolio.account_number})
            </p>
            <p className="text-sm text-green-700 mt-2">You can now view this assessment from the client's portfolio tab.</p>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg max-w-md mx-auto">
             <p className="text-slate-600">This assessment was not linked to a specific portfolio.</p>
          </div>
        )}
        
        <Button onClick={onRestart} className="mt-4">
          <Repeat className="w-4 h-4 mr-2" />
          Start New Assessment
        </Button>
      </div>
    </CardContent>
  </Card>
);


export default function RiskAssessmentTool() {
  const [clients, setClients] = useState([]);
  const [primaryClientId, setPrimaryClientId] = useState(null);
  const [jointClientIds, setJointClientIds] = useState([]);
  const [clientPortfolios, setClientPortfolios] = useState([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(null);
  const [allSelectedClientIds, setAllSelectedClientIds] = useState([]);

  const [assessmentResult, setAssessmentResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    const loadClients = async () => {
      try {
        const clientData = await Client.list();
        setClients(clientData || []);
      } catch (error) {
        console.error("Failed to load clients:", error);
      }
      setIsLoading(false);
    };
    loadClients();
  }, []);

  const handleClientSelection = async (clientId) => {
    setPrimaryClientId(clientId);
    setJointClientIds([]);
    const allIds = [clientId];
    setAllSelectedClientIds(allIds);
    await loadPortfoliosForClients(allIds);
  };
  
  const handleJointClientSelection = async (selectedIds) => {
    const newJointClientIds = selectedIds.filter(id => id !== primaryClientId);
    setJointClientIds(newJointClientIds);
    const allIds = [primaryClientId, ...newJointClientIds];
    setAllSelectedClientIds(allIds);
    await loadPortfoliosForClients(allIds);
  };

  const loadPortfoliosForClients = async (clientIds) => {
    if (!clientIds || clientIds.length === 0) {
      setClientPortfolios([]);
      setSelectedPortfolioId(null);
      return;
    }
    
    try {
      const allPortfolios = await Portfolio.list();
      
      const relevantPortfolios = allPortfolios.filter(portfolio => {
        // More robust check: handles both client_ids (array) and older client_id (string)
        // Convert client_id (singular) to an array for consistent processing if client_ids (plural) is missing
        const portfolioClientIds = Array.isArray(portfolio.client_ids)
          ? portfolio.client_ids
          : (portfolio.client_id ? [portfolio.client_id] : []);

        const hasMatchingClient = portfolioClientIds.some(portfolioClientId => clientIds.includes(portfolioClientId));
        return hasMatchingClient;
      });
      
      setClientPortfolios(relevantPortfolios || []);
      setSelectedPortfolioId(null); // Reset portfolio selection when client changes
    } catch (error) {
      console.error("Failed to load portfolios:", error);
      setClientPortfolios([]);
    }
  };

  const getAllocationFromProfile = (profile) => {
    switch (profile) {
      case 'Conservative':
        return { equity: 0.20, fixed_income: 0.80, cash: 0, alternatives: 0 };
      case 'Moderately Conservative':
        return { equity: 0.40, fixed_income: 0.60, cash: 0, alternatives: 0 };
      case 'Moderate':
        return { equity: 0.60, fixed_income: 0.40, cash: 0, alternatives: 0 };
      case 'Growth':
        return { equity: 0.80, fixed_income: 0.20, cash: 0, alternatives: 0 };
      case 'Aggressive':
        return { equity: 1.00, fixed_income: 0.00, cash: 0, alternatives: 0 };
      default:
        return { equity: 0.60, fixed_income: 0.40, cash: 0, alternatives: 0 };
    }
  };

  const getProfileFromScore = (score) => {
    // Updated scoring ranges for 12 questions (12-48 total points)
    if (score <= 18) return 'Conservative';           // 12-18 points
    if (score <= 24) return 'Moderately Conservative'; // 19-24 points  
    if (score <= 30) return 'Moderate';               // 25-30 points
    if (score <= 36) return 'Growth';                 // 31-36 points
    return 'Aggressive';                              // 37-48 points
  };
  
  const handleQuestionnaireComplete = async (answers, score) => {
    if (allSelectedClientIds.length === 0) return;
    
    setIsSubmitting(true);
    
    const profile = getProfileFromScore(score);
    const allocation = getAllocationFromProfile(profile);

    try {
      const newAssessment = await RiskAssessment.create({
        client_ids: allSelectedClientIds,
        assessment_date: new Date().toISOString(),
        answers: answers,
        risk_score: score,
        risk_profile: profile,
        recommended_allocation: allocation,
        linked_portfolio_id: selectedPortfolioId,
        notes: "Initial assessment based on questionnaire."
      });
      
      const clientNames = allSelectedClientIds.map(id => {
          const client = clients.find(c => c.id === id);
          return client ? `${client.first_name} ${client.last_name}` : 'Unknown';
      });

      setAssessmentResult({
        ...newAssessment,
        clientNames: clientNames,
      });

    } catch (error) {
      console.error("Failed to save risk assessment:", error);
      alert("There was an error saving the assessment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestart = () => {
    setPrimaryClientId(null);
    setJointClientIds([]);
    setAllSelectedClientIds([]);
    setClientPortfolios([]);
    setSelectedPortfolioId(null);
    setAssessmentResult(null);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      );
    }
    
    if (assessmentResult) {
      const linkedPortfolio = clientPortfolios.find(p => p.id === assessmentResult.linked_portfolio_id);
      return <AssessmentResults result={assessmentResult} onRestart={handleRestart} linkedPortfolio={linkedPortfolio} />;
    }

    if (!primaryClientId) {
      return (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Step 1: Select a Primary Client</CardTitle>
            <CardDescription>Choose the main client for this risk assessment.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-8 gap-4">
            <User className="w-16 h-16 text-slate-300 mb-4" />
            <ClientCombobox
              clients={clients}
              value={primaryClientId}
              onChange={(value) => handleClientSelection(value)}
              placeholder="Select a client..."
              className="w-full max-w-sm"
            />
          </CardContent>
        </Card>
      );
    }

    return (
      <>
        {/* Client & Portfolio Selection */}
        <Card className="shadow-lg mb-8">
            <CardHeader>
                <CardTitle>Step 1: Confirm Clients & Link Portfolio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <Label className="font-semibold">Primary Client</Label>
                    <p className="p-3 bg-slate-100 rounded-md">{clients.find(c => c.id === primaryClientId)?.first_name} {clients.find(c => c.id === primaryClientId)?.last_name}</p>
                </div>
                <div>
                    <Label htmlFor="joint-clients" className="font-semibold">Joint Clients (Optional)</Label>
                    <MultiClientSelector
                        clients={clients.filter(c => c.id !== primaryClientId)}
                        selectedClientIds={jointClientIds}
                        onSelectionChange={handleJointClientSelection}
                        placeholder="Add joint clients..."
                    />
                </div>
                <div>
                    <Label htmlFor="link-portfolio" className="font-semibold">Link to Portfolio (Optional)</Label>
                    <Select value={selectedPortfolioId || ""} onValueChange={setSelectedPortfolioId}>
                        <SelectTrigger id="link-portfolio">
                            <SelectValue placeholder="Select a portfolio to link..." />
                        </SelectTrigger>
                        <SelectContent>
                            {/* Option to not link */}
                            <SelectItem value="none">Don't link to a portfolio</SelectItem> 
                            {clientPortfolios.length > 0 ? clientPortfolios.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.account_name} ({p.account_number || 'No account #'}) - {p.account_type.toUpperCase()}
                                </SelectItem>
                            )) : (
                                <SelectItem value="no_portfolios_found" disabled>No portfolios found for selected client(s).</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                    {clientPortfolios.length === 0 && allSelectedClientIds.length > 0 && (
                        <p className="text-sm text-slate-500 mt-2">
                            No portfolios found for the selected client(s). You can still complete the assessment without linking to a portfolio.
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
        
        {/* Questionnaire */}
        <RiskQuestionnaire onComplete={handleQuestionnaireComplete} isSubmitting={isSubmitting} />
      </>
    );
  };

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-green-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Risk Assessment Tool</h1>
            <p className="text-slate-600">Assess client risk tolerance and generate recommended asset allocations.</p>
          </div>
          {primaryClientId && !assessmentResult && (
             <Button variant="outline" onClick={handleRestart}>
                <Repeat className="w-4 h-4 mr-2" />
                Start Over
            </Button>
          )}
        </header>

        {renderContent()}
      </div>
    </div>
  );
}
