
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, AlertTriangle, Info, DollarSign, PieChart, Banknote } from "lucide-react";
import AllocationChart from "./AllocationChart";
import RecommendationsTable from "./RecommendationsTable";

const formatCurrency = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return "$0.00";
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
};

export default function RebalancingTool({ clientPortfolios, modelPortfolios, funds, isLoading }) {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState("");
  const [currentTotalValue, setCurrentTotalValue] = useState(0);
  const [currentCashBalance, setCurrentCashBalance] = useState(0);
  const [targetCashBalance, setTargetCashBalance] = useState(0);

  const [compareTarget, setCompareTarget] = useState("model");
  const [selectedModelId, setSelectedModelId] = useState("");
  
  const [currentAllocations, setCurrentAllocations] = useState([]);
  const [targetAllocations, setTargetAllocations] = useState([]);

  const [recommendations, setRecommendations] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [error, setError] = useState("");

  const selectedPortfolio = useMemo(() => {
    return clientPortfolios.find(p => p.id === selectedPortfolioId);
  }, [selectedPortfolioId, clientPortfolios]);

  // Effect to reset and populate form when a new portfolio is selected
  useEffect(() => {
    // Hide recommendations and clear errors when portfolio changes
    setShowRecommendations(false);
    setError("");

    if (selectedPortfolio) {
      const portfolioAllocations = selectedPortfolio.fund_holdings?.map(h => ({
        fund_id: h.fund_id,
        percentage: h.allocation_percentage,
      })) || [];
      setCurrentAllocations(portfolioAllocations);
      setCurrentTotalValue(selectedPortfolio.total_value || 0);
      setCurrentCashBalance(selectedPortfolio.cash_balance || 0);
      setTargetCashBalance(selectedPortfolio.cash_balance || 0);

      // Default to the portfolio's risk level for model selection
      const matchingModel = modelPortfolios.find(m => m.risk_level === selectedPortfolio.risk_level);
      if (matchingModel) {
        setSelectedModelId(matchingModel.id);
        setCompareTarget("model");
      } else {
        setCompareTarget("original");
      }
    } else {
      // Reset when no portfolio is selected
      setCurrentAllocations([]);
      setCurrentTotalValue(0);
      setCurrentCashBalance(0);
      setTargetCashBalance(0);
      setRecommendations([]);
    }
  }, [selectedPortfolio, modelPortfolios]);

  // Effect to set target allocations based on comparison choice
  useEffect(() => {
    // Hide recommendations when comparison target changes
    setShowRecommendations(false);
    setError("");

    if (compareTarget === "model") {
      const model = modelPortfolios.find(m => m.id === selectedModelId);
      const modelAllocations = model?.fund_holdings?.map(h => ({
        fund_id: h.fund_id,
        percentage: h.allocation_percentage,
      })) || [];
      setTargetAllocations(modelAllocations);
    } else { // "original"
      const originalAllocations = selectedPortfolio?.fund_holdings?.map(h => ({
        fund_id: h.fund_id,
        percentage: h.allocation_percentage,
      })) || [];
      setTargetAllocations(originalAllocations);
    }
  }, [compareTarget, selectedModelId, selectedPortfolio, modelPortfolios]);

  const calculateRecommendations = () => {
    // Hide previous recommendations before new calculation
    setShowRecommendations(false);

    if (!selectedPortfolio || currentAllocations.length === 0 || targetAllocations.length === 0) {
      setError("Please select a portfolio and set target allocations.");
      setRecommendations([]);
      setShowRecommendations(false);
      return;
    }

    // Clear any previous errors
    setError("");

    // Ensure all values are valid numbers
    const totalValue = parseFloat(currentTotalValue) || 0;
    const cashBalance = parseFloat(currentCashBalance) || 0;
    const targetCash = parseFloat(targetCashBalance) || 0;

    if (totalValue <= 0) {
      setError("Portfolio value must be greater than zero.");
      setRecommendations([]);
      setShowRecommendations(false);
      return;
    }

    const currentInvestedValue = totalValue - cashBalance;
    const targetInvestedValue = totalValue - targetCash;
    const availableCashForRebalancing = cashBalance - targetCash;

    console.log('Debug values:', {
      totalValue,
      cashBalance,
      targetCash,
      currentInvestedValue,
      targetInvestedValue,
      availableCashForRebalancing
    });

    const newRecommendations = [];
    let totalToBuy = 0;
    let totalToSell = 0;

    // Calculate recommendations for each fund
    const allFundIds = new Set([
      ...currentAllocations.map(a => a.fund_id),
      ...targetAllocations.map(a => a.fund_id)
    ]);

    allFundIds.forEach(fundId => {
      const currentAlloc = currentAllocations.find(a => a.fund_id === fundId);
      const targetAlloc = targetAllocations.find(a => a.fund_id === fundId);

      const currentPercentage = parseFloat(currentAlloc?.percentage) || 0;
      const targetPercentage = parseFloat(targetAlloc?.percentage) || 0;

      const currentValue = (currentPercentage / 100) * currentInvestedValue;
      const targetValue = (targetPercentage / 100) * targetInvestedValue;
      
      const difference = targetValue - currentValue;
      const driftPercentage = currentPercentage - targetPercentage;
      const fund = funds.find(f => f.id === fundId);

      if (Math.abs(difference) > 0.01) { // Only show recommendations for meaningful differences
        newRecommendations.push({
          fund_id: fundId,
          fund_name: fund?.name || 'Unknown Fund',
          fund_code: fund?.fund_code || 'N/A', // Added fund_code here
          category: fund?.category || 'Unknown',
          current_percentage: currentPercentage,
          target_percentage: targetPercentage,
          current_value: currentValue,
          target_value: targetValue,
          difference: difference,
          drift_percentage: driftPercentage,
          action: difference > 0 ? 'BUY' : 'SELL',
          amount: Math.abs(difference)
        });

        if (difference > 0) {
          totalToBuy += difference;
        } else {
          totalToSell += Math.abs(difference);
        }
      }
    });

    console.log('Recommendations:', newRecommendations);
    console.log('Total to buy:', totalToBuy, 'Total to sell:', totalToSell);

    setRecommendations(newRecommendations);
    setShowRecommendations(true);
  };

  const totalCurrentAllocation = useMemo(() => {
    return currentAllocations.reduce((sum, alloc) => sum + (parseFloat(alloc.percentage) || 0), 0);
  }, [currentAllocations]);
  
  const totalTargetAllocation = useMemo(() => {
    return targetAllocations.reduce((sum, alloc) => sum + (parseFloat(alloc.percentage) || 0), 0);
  }, [targetAllocations]);

  const handleCurrentAllocationChange = (fundId, percentage) => {
    setShowRecommendations(false); // Hide recommendations on input change
    const newAllocations = currentAllocations.map(alloc => 
      alloc.fund_id === fundId ? { ...alloc, percentage: parseFloat(percentage) || 0 } : alloc
    );
    setCurrentAllocations(newAllocations);
  };
  
  const handleTargetAllocationChange = (fundId, percentage) => {
    setShowRecommendations(false); // Hide recommendations on input change
    const newAllocations = targetAllocations.map(alloc => 
      alloc.fund_id === fundId ? { ...alloc, percentage: parseFloat(percentage) || 0 } : alloc
    );
    setTargetAllocations(newAllocations);
  };
  
  const getFundName = useCallback((fundId) => funds.find(f => f.id === fundId)?.name || 'Unknown Fund', [funds]);

  const chartData = useMemo(() => {
    if (!selectedPortfolio) return { current: [], target: [] };

    const currentInvestedValue = currentTotalValue - currentCashBalance;
    const targetInvestedValue = currentTotalValue - targetCashBalance;

    const safeCurrentAllocations = Array.isArray(currentAllocations) ? currentAllocations : [];
    const safeTargetAllocations = Array.isArray(targetAllocations) ? targetAllocations : [];

    const currentChartData = safeCurrentAllocations.map(a => ({
      name: getFundName(a.fund_id),
      value: (a.percentage / 100) * currentInvestedValue
    }));
    if (currentCashBalance > 0) {
      currentChartData.push({ name: 'Cash', value: currentCashBalance });
    }

    const targetChartData = safeTargetAllocations.map(a => ({
      name: getFundName(a.fund_id),
      value: (a.percentage / 100) * targetInvestedValue
    }));
    if (targetCashBalance > 0) {
      targetChartData.push({ name: 'Cash', value: targetCashBalance });
    }

    return { current: currentChartData, target: targetChartData };
  }, [currentAllocations, targetAllocations, currentTotalValue, currentCashBalance, targetCashBalance, selectedPortfolio, getFundName]);


  if (isLoading) return <div>Loading...</div>;

  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="text-green-600" />
          Portfolio Rebalancing Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Controls */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label htmlFor="portfolio-select">Select Portfolio to Rebalance</Label>
                  <Select value={selectedPortfolioId} onValueChange={setSelectedPortfolioId}>
                    <SelectTrigger id="portfolio-select">
                      <SelectValue placeholder="Select a portfolio..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientPortfolios.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.account_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPortfolio && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="market-value">Current Market Value</Label>
                         <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              id="market-value"
                              type="number"
                              value={currentTotalValue}
                              onChange={(e) => {setCurrentTotalValue(parseFloat(e.target.value) || 0); setShowRecommendations(false);}}
                              className="pl-7"
                            />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="cash-balance">Current Cash Balance</Label>
                         <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              id="cash-balance"
                              type="number"
                              value={currentCashBalance}
                              onChange={(e) => {setCurrentCashBalance(parseFloat(e.target.value) || 0); setShowRecommendations(false);}}
                              className="pl-7"
                            />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Comparison Target</Label>
                      <RadioGroup value={compareTarget} onValueChange={setCompareTarget} className="mt-2 space-y-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="model" id="model" />
                          <Label htmlFor="model">Compare to Model Portfolio</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="original" id="original" />
                          <Label htmlFor="original">Compare to Original Allocation</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {compareTarget === 'model' && (
                      <div>
                        <Label htmlFor="model-select">Select Model</Label>
                        <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                           <SelectTrigger id="model-select">
                              <SelectValue placeholder="Select a model..." />
                           </SelectTrigger>
                           <SelectContent>
                            {modelPortfolios.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.name} ({m.risk_level})</SelectItem>
                            ))}
                           </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                        <Label htmlFor="target-cash-balance">Target Cash Balance</Label>
                         <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              id="target-cash-balance"
                              type="number"
                              value={targetCashBalance}
                              onChange={(e) => {setTargetCashBalance(parseFloat(e.target.value) || 0); setShowRecommendations(false);}}
                              className="pl-7"
                            />
                        </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Column 2: Allocations */}
          {selectedPortfolio && (
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current Allocations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Current Fund Allocations
                    </div>
                    <Badge variant={Math.abs(totalCurrentAllocation - 100) < 0.01 ? 'default' : 'destructive'}>
                      Total: {totalCurrentAllocation.toFixed(2)}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                  {currentAllocations.map(alloc => {
                    const fund = funds.find(f => f.id === alloc.fund_id);
                    return (
                      <div key={alloc.fund_id} className="p-3 border rounded-lg bg-slate-50/50">
                        <Label className="text-sm font-medium">{fund?.name || 'Unknown Fund'}</Label>
                        <p className="text-xs text-slate-500 mb-2">{fund?.fund_code} • {fund?.category}</p>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`current-${alloc.fund_id}`} className="text-xs flex-shrink-0">Current %</Label>
                          <Input 
                            id={`current-${alloc.fund_id}`} 
                            type="number" 
                            value={alloc.percentage}
                            onChange={(e) => handleCurrentAllocationChange(alloc.fund_id, e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Target Allocations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <PieChart className="w-4 h-4" />
                      Target Fund Allocations
                    </div>
                    <Badge variant={Math.abs(totalTargetAllocation - 100) < 0.01 ? 'default' : 'destructive'}>
                      Total: {totalTargetAllocation.toFixed(2)}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                  {targetAllocations.map(alloc => {
                    const fund = funds.find(f => f.id === alloc.fund_id);
                    return (
                      <div key={alloc.fund_id} className="p-3 border rounded-lg bg-slate-50/50">
                        <Label className="text-sm font-medium">{fund?.name || 'Unknown Fund'}</Label>
                        <p className="text-xs text-slate-500 mb-2">{fund?.fund_code} • {fund?.category}</p>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`target-${alloc.fund_id}`} className="text-xs flex-shrink-0">Target %</Label>
                          <Input 
                            id={`target-${alloc.fund_id}`} 
                            type="number" 
                            value={alloc.percentage}
                            onChange={(e) => handleTargetAllocationChange(alloc.fund_id, e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        
        {/* Generate Recommendations Button */}
        {selectedPortfolio && ( // Only show button if a portfolio is selected
          <div className="flex justify-center mt-6">
            <button
              onClick={calculateRecommendations}
              disabled={!selectedPortfolio || currentAllocations.length === 0 || targetAllocations.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Generate Rebalancing Recommendations
            </button>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50 mt-4">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Results - Only show when recommendations are generated */}
        {showRecommendations && (
          <div className="pt-6 border-t mt-6">
            <h3 className="text-lg font-semibold mb-4 text-center">Rebalancing Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-blue-600" />
                    Allocation Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-center mb-2">Current Allocation</h4>
                      <div className="text-center text-sm text-green-600 font-medium mb-4">
                        {formatCurrency(currentTotalValue)}
                      </div>
                      <AllocationChart data={chartData.current} />
                    </div>
                    <div>
                      <h4 className="font-medium text-center mb-2">Target Allocation</h4>
                      <div className="text-center text-sm text-green-600 font-medium mb-4">
                        {formatCurrency(currentTotalValue)}
                      </div>
                      <AllocationChart data={chartData.target} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Rebalancing Recommendations */}
              <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-green-600" />
                    Rebalancing Recommendations
                  </CardTitle>
                  <div className="text-sm text-slate-600">
                    <div>Comparison Target: <Badge variant="outline">
                      {compareTarget === "model" 
                        ? `${modelPortfolios.find(m => m.id === selectedModelId)?.name || 'Model Portfolio'}`
                        : "Original Allocation"}
                    </Badge></div>
                    <div className="mt-1">Portfolio Value: <span className="text-green-600 font-medium">{formatCurrency(currentTotalValue)}</span></div>
                    <div className="flex gap-4 mt-1">
                      <span className="text-green-600">Total to Buy: {formatCurrency(recommendations.filter(r => r.action === 'BUY').reduce((sum, r) => sum + r.amount, 0))}</span>
                      <span className="text-red-600">Total to Sell: {formatCurrency(recommendations.filter(r => r.action === 'SELL').reduce((sum, r) => sum + r.amount, 0))}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <RecommendationsTable 
                    recommendations={recommendations} 
                    totalToBuy={recommendations.reduce((sum, r) => r.action === 'BUY' ? sum + r.amount : sum, 0)}
                    totalToSell={recommendations.reduce((sum, r) => r.action === 'SELL' ? sum + r.amount : sum, 0)}
                    portfolioName={selectedPortfolio?.account_name || ''}
                    portfolioValue={currentTotalValue}
                  />
                </CardContent>
              </Card>
            </div>

            {recommendations.length > 0 && (
              <Alert className="border-blue-200 bg-blue-50 mt-6">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Summary:</strong> Execute the recommended trades to rebalance your portfolio to match{" "}
                  {compareTarget === "model" 
                    ? `the ${modelPortfolios.find(m => m.id === selectedModelId)?.name || 'selected model'} allocation`
                    : "the original allocation"}. The net change in invested funds is{" "}
                  <span className="font-semibold">
                  {formatCurrency(
                    (recommendations.filter(r => r.action === 'BUY').reduce((sum, r) => sum + r.amount, 0)) -
                    (recommendations.filter(r => r.action === 'SELL').reduce((sum, r) => sum + r.amount, 0))
                  )}
                  </span>. Your target cash balance will be {formatCurrency(targetCashBalance)}.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        {!selectedPortfolio && !showRecommendations && (
          <div className="text-center py-12">
            <Info className="w-8 h-8 mx-auto text-slate-400 mb-3" />
            <p className="text-slate-600">Please select a portfolio to begin rebalancing.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
