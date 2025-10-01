
import React, { useState, useEffect, useCallback } from "react";
import { Portfolio, FinancialGoal, Fund, ModelPortfolio, RiskAssessment, CalculatorInstance } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit,
  Building,
  FileText,
  PieChart as PieChartIcon,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Calculator, // Added Calculator icon
} from "lucide-react";
import ReactMarkdown from "react-markdown";

import PortfolioForm from "../../portfolios/PortfolioForm";
import DeletePortfolioDialog from "../../portfolios/DeletePortfolioDialog";
import PortfolioAllocationPieChartModal from "../../portfolios/PortfolioAllocationPieChartModal";
import RebalancingTool from "../../rebalancing/RebalancingTool"; 
import RiskAssessmentViewerModal from "../../risk_assessment/RiskAssessmentViewerModal";

const formatCurrency = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return "$0";
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercentage = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return "N/A";
  return `${value.toFixed(2)}%`;
};

const riskColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

const PortfolioItem = ({
  portfolio,
  goals,
  funds,
  onEdit,
  onDelete,
  onShowPieChart,
  isSelected,
  onToggleDetails,
  associatedClientNames,
  linkedAssessment, // New prop
  linkedCalculator, // New prop
  onViewAssessment, // New prop
}) => {

  const getGoalName = (goalId) => {
    const goal = goals.find(g => g.id === goalId);
    return goal?.goal_name || "No associated goal";
  };

  const getFundDetails = (fundId) => {
    return funds.find(f => f.id === fundId);
  };

  // Calculate weighted average MER
  const calculateWeightedAverageMER = () => {
    if (!portfolio.fund_holdings || portfolio.fund_holdings.length === 0) {
      return null;
    }

    let totalWeightedMER = 0;
    let totalAllocation = 0;
    let hasValidMER = false;

    portfolio.fund_holdings.forEach(holding => {
      const fund = getFundDetails(holding.fund_id);
      if (fund && fund.mer && holding.allocation_percentage) {
        totalWeightedMER += (holding.allocation_percentage / 100) * fund.mer;
        totalAllocation += holding.allocation_percentage / 100;
        hasValidMER = true;
      }
    });

    if (!hasValidMER || totalAllocation === 0) {
      return null;
    }

    // Normalize by total allocation in case allocations don't sum to 100%
    return totalWeightedMER / totalAllocation;
  };

  const weightedAverageMER = calculateWeightedAverageMER();

  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
      <CardHeader className="cursor-pointer" onClick={() => onToggleDetails(portfolio.id)}>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex-shrink-0 pt-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-blue-600"
                onClick={(e) => {
                  e.stopPropagation(); 
                  onShowPieChart(portfolio);
                }}
                disabled={!portfolio.fund_holdings || portfolio.fund_holdings.length === 0}
              >
                <PieChartIcon className="w-5 h-5" />
              </Button>
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                {portfolio.account_name}
                <Badge variant="outline" className="text-xs font-normal">
                  {portfolio.account_type?.toUpperCase()}
                </Badge>
                {linkedAssessment && (
                  <Badge 
                    variant="default" 
                    className="bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewAssessment(linkedAssessment, portfolio);
                    }}
                  >
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    Risk Profile Linked
                  </Badge>
                )}
                {linkedCalculator && (
                  <Badge
                    variant="default"
                    className="bg-purple-100 text-purple-800 hover:bg-purple-200 cursor-pointer text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Potentially open calculator viewer in the future
                      const clientId = portfolio.client_ids?.[0] || portfolio.client_id; // Fallback to single client_id if array not present
                      if (clientId && linkedCalculator.id) {
                        window.location.href = `/ClientCalculatorInstance?clientId=${clientId}&calculatorId=${linkedCalculator.id}`;
                      } else {
                        console.warn("Missing client ID or calculator ID for navigation to calculator instance page.");
                      }
                    }}
                  >
                    <Calculator className="w-3 h-3 mr-1" />
                    {linkedCalculator.name}
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                {portfolio.account_number && `Account: ${portfolio.account_number} • `}
                Goal: {getGoalName(portfolio.goal_id)}
                {associatedClientNames && (
                  <span className="block text-xs text-slate-400 mt-0.5">
                    Shared with: {associatedClientNames}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(portfolio.total_value)}
              </p>
              {(portfolio.performance_ytd || portfolio.performance_1yr) && (
                <div className="flex gap-4 text-sm text-slate-500">
                  {portfolio.performance_ytd && (
                    <span>YTD: {formatPercentage(portfolio.performance_ytd)}</span>
                  )}
                  {portfolio.performance_1yr && (
                    <span>1Y: {formatPercentage(portfolio.performance_1yr)}</span>
                  )}
                </div>
              )}
            </div>
            {isSelected ?
              <ChevronUp className="w-5 h-5 text-slate-400" /> :
              <ChevronDown className="w-5 h-5 text-slate-400" />
            }
          </div>
        </div>
      </CardHeader>

      {isSelected && (
        <CardContent className="border-t pt-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Portfolio Details */}
            <div>
              <h4 className="font-semibold mb-3">Portfolio Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Risk Level:</span>
                  <Badge variant="secondary" className="capitalize">
                    {portfolio.risk_level}
                  </Badge>
                </div>
                {weightedAverageMER !== null && (
                  <div className="flex justify-between">
                    <span>Weighted Average MER:</span>
                    <span className="font-medium">{formatPercentage(weightedAverageMER * 100)}</span>
                  </div>
                )}
                {portfolio.cash_balance && (
                  <div className="flex justify-between">
                    <span>Cash Balance:</span>
                    <span>{formatCurrency(portfolio.cash_balance)}</span>
                  </div>
                )}
                {portfolio.inception_date && (
                  <div className="flex justify-between">
                    <span>Inception Date:</span>
                    <span>{new Date(portfolio.inception_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Show linked risk assessment info instead of expectations statement */}
              {linkedAssessment && (
                <div className="mt-4">
                  <h5 className="font-medium mb-2">Linked Risk Assessment</h5>
                  <div className="text-sm text-slate-600 bg-blue-50 p-3 rounded space-y-2">
                    <div className="flex justify-between">
                      <span>Risk Profile:</span>
                      <Badge variant="secondary">{linkedAssessment.risk_profile}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Risk Score:</span>
                      <span>{linkedAssessment.risk_score}/20</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Assessment Date:</span>
                      <span>{new Date(linkedAssessment.assessment_date).toLocaleDateString()}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => onViewAssessment(linkedAssessment, portfolio)}
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      View Full Assessment
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Fund Holdings */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Fund Holdings</h4>
              </div>

              {portfolio.fund_holdings && portfolio.fund_holdings.length > 0 ? (
                <div className="space-y-3">
                  {portfolio.fund_holdings.map((holding, index) => {
                    const fund = getFundDetails(holding.fund_id);
                    return (
                      <Card key={index} className="bg-slate-50 border-none">
                        <CardContent className="p-3">
                          {fund ? (
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{fund.name}</p>
                                  <div className="flex gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">{fund.fund_code}</Badge>
                                    <Badge variant="secondary" className="text-xs">{fund.fund_family}</Badge>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-green-600">
                                    {holding.allocation_percentage}%
                                  </p>
                                </div>
                              </div>

                              {fund.category && (
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <Building className="w-3 h-3" />
                                  <span>{fund.category}</span>
                                  {fund.mer && (
                                    <>
                                      <span>•</span>
                                      <span>MER: {formatPercentage(fund.mer * 100)}</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm text-slate-500">
                              <p>Fund not found (ID: {holding.fund_id})</p>
                              <p className="font-semibold">{holding.allocation_percentage}%</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No fund holdings specified</p>
              )}
            </div>
          </div>
        </CardContent>
      )}
      <CardFooter className="flex justify-end gap-2 border-t pt-4 bg-slate-50/50">
        <Button variant="outline" size="sm" onClick={() => onEdit(portfolio)}>
          <Edit className="w-3 h-3 mr-1" /> Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onDelete(portfolio.id)}>
          <Trash2 className="w-3 h-3 mr-1" /> Delete
        </Button>
      </CardFooter>
    </Card>
  );
};

export default function ClientPortfolios({ client, allClients }) {
  const [portfolios, setPortfolios] = useState([]);
  const [goals, setGoals] = useState([]);
  const [funds, setFunds] = useState([]);
  const [models, setModels] = useState([]); 
  const [riskAssessments, setRiskAssessments] = useState([]); 
  const [calculatorInstances, setCalculatorInstances] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState(null); 
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingPortfolio, setDeletingPortfolio] = useState(null);
  const [showPieChartModal, setShowPieChartModal] = useState(false);
  const [pieChartPortfolio, setPieChartPortfolio] = useState(null); 
  const [showHouseholdItems, setShowHouseholdItems] = useState(false);
  
  // Refactored state for assessment viewer modal
  const [viewingAssessment, setViewingAssessment] = useState(null); // { assessment, portfolio }

  // useCallback is used on all data loading functions to stabilize them
  // and prevent infinite loops when used as useEffect dependencies.

  const getHouseholdMemberIds = useCallback((currentClient, clients) => {
    if (!currentClient || !clients) return []; // Return empty array if no client or clients to prevent errors
    const householdHeadId = currentClient.primary_client_id || currentClient.id;
    const householdMembers = clients.filter(c => 
      c.id === householdHeadId || (c.primary_client_id === householdHeadId && c.id !== householdHeadId)
    );
    return householdMembers.map(c => c.id);
  }, []);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const householdIds = getHouseholdMemberIds(client, allClients);

      // Fetch all data in parallel
      const [allPortfolios, allGoals, allRiskAssessments, allCalculatorInstances, allFunds, allModels] = await Promise.all([
        Portfolio.list().catch(() => []),
        FinancialGoal.list().catch(() => []),
        RiskAssessment.list().catch(() => []),
        CalculatorInstance.list().catch(() => []),
        Fund.list().catch(() => []),
        ModelPortfolio.list().catch(() => [])
      ]);

      // Filter data based on household
      const householdPortfolios = allPortfolios.filter(p => {
        const portfolioClientIds = p.client_ids || (p.client_id ? [p.client_id] : []);
        if (showHouseholdItems) {
          return portfolioClientIds.some(id => householdIds.includes(id));
        }
        // If showHouseholdItems is false, filter by current client.id
        // Ensure client.id exists before filtering.
        return client?.id && portfolioClientIds.includes(client.id);
      }).sort((a, b) => (b.total_value || 0) - (a.total_value || 0));

      const householdGoals = allGoals.filter(g => {
        const goalClientIds = g.client_ids || (g.client_id ? [g.client_id] : []);
        return goalClientIds.some(id => householdIds.includes(id));
      });
      
      const householdRiskAssessments = allRiskAssessments.filter(ra => {
        const assessmentClientIds = ra.client_ids || (ra.client_id ? [ra.client_id] : []);
        return assessmentClientIds.some(id => householdIds.includes(id));
      });

      // Debug logging - let's see what we have
      console.log("Debug - All calculator instances:", allCalculatorInstances);
      console.log("Debug - Portfolio data:", householdPortfolios.map(p => ({
        name: p.account_name,
        calculator_instance_id: p.calculator_instance_id,
        linkedCalc: allCalculatorInstances.find(ci => String(ci.id) === String(p.calculator_instance_id))
      })));

      // Keep ALL calculator instances in state for linking, regardless of household filter
      setPortfolios(householdPortfolios);
      setGoals(householdGoals);
      setRiskAssessments(householdRiskAssessments);
      setCalculatorInstances(allCalculatorInstances); // Use all instances
      setFunds(allFunds);
      setModels(allModels);

    } catch (error) {
      console.error("Error loading data:", error);
      // Optionally reset states to empty arrays or previous values on error
      setPortfolios([]);
      setGoals([]);
      setRiskAssessments([]);
      setCalculatorInstances([]);
      setFunds([]);
      setModels([]);
    } finally {
      setIsLoading(false);
    }
  }, [client, allClients, getHouseholdMemberIds, showHouseholdItems]); // Dependencies updated

  useEffect(() => {
    if (client) { 
      loadAllData();
    }
  }, [client, allClients, getHouseholdMemberIds, showHouseholdItems, loadAllData]); // Dependencies updated

  const getClientNamesFromIds = useCallback((clientIds) => {
    if (!clientIds || !allClients) return 'N/A';
    const names = clientIds
      .map(id => {
        const foundClient = allClients.find(c => c.id === id);
        return foundClient ? `${foundClient.first_name} ${foundClient.last_name}` : 'Unknown Client';
      })
      .filter(name => name !== 'Unknown Client'); 

    return names.length > 0 ? names.join(', ') : 'No associated client';
  }, [allClients]);

  const handleCreatePortfolio = () => {
    setEditingPortfolio(null);
    setShowForm(true);
  };

  const handleEditPortfolio = (portfolio) => {
    setEditingPortfolio(portfolio);
    setShowForm(true);
  };

  const handleSavePortfolio = async (portfolioData) => {
    try {
      const { calculator_instance_id, ...restOfData } = portfolioData;

      const dataToSave = {
        ...restOfData,
        client_ids: [...new Set(portfolioData.client_ids || [])],
        calculator_instance_id: calculator_instance_id || null // Explicitly include the calculator_instance_id
      };
      
      // Remove client_id if it's a leftover from a previous prop structure, 
      // as we now primarily use client_ids array.
      delete dataToSave.client_id;
      
      if (editingPortfolio) {
        await Portfolio.update(editingPortfolio.id, dataToSave);
      } else {
        await Portfolio.create(dataToSave);
      }
      setShowForm(false);
      setEditingPortfolio(null);
      loadAllData();
    } catch (error) {
      console.error("Error saving portfolio:", error);
      alert("Failed to save portfolio. Check console for details.");
    }
  };

  const handleDeletePortfolio = (portfolioId) => {
    const portfolioToDelete = portfolios.find(p => p.id === portfolioId);
    if (portfolioToDelete) {
      setDeletingPortfolio(portfolioToDelete);
      setShowDeleteDialog(true);
    }
  };

  const confirmDeletePortfolio = async () => {
    if (!deletingPortfolio) return;
    try {
      await Portfolio.delete(deletingPortfolio.id);
      await loadAllData(); 
      setShowDeleteDialog(false);
      setDeletingPortfolio(null);
      if (selectedPortfolio && selectedPortfolio.id === deletingPortfolio.id) {
        setSelectedPortfolio(null);
      }
    } catch (error) {
      console.error("Failed to delete portfolio:", error);
      alert("Failed to delete portfolio.");
    }
  };

  const handleToggleDetails = (portfolioId) => {
    const targetPortfolio = portfolios.find(p => p.id === portfolioId);
    if (targetPortfolio) {
      setSelectedPortfolio(selectedPortfolio?.id === portfolioId ? null : targetPortfolio);
    }
  };

  const handleShowPieChart = (portfolio) => {
    setPieChartPortfolio(portfolio);
    setShowPieChartModal(true);
  };

  const handleViewAssessment = (assessment, portfolio) => {
    setViewingAssessment({ assessment, portfolio });
  };

  const handleCloseAssessmentViewer = () => {
    setViewingAssessment(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p>Loading portfolios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="portfolios" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="portfolios"><TrendingUp className="w-4 h-4 mr-2" />Portfolios</TabsTrigger>
            <TabsTrigger value="rebalancing"><RefreshCw className="w-4 h-4 mr-2" />Rebalancing Tool</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="show-household-portfolios"
                checked={showHouseholdItems}
                onChange={(e) => setShowHouseholdItems(e.target.checked)}
                className="rounded border-slate-300 text-green-600 focus:ring-green-500"
              />
              <label htmlFor="show-household-portfolios" className="text-sm text-slate-600">
                Show household items
              </label>
            </div>
            <Button onClick={handleCreatePortfolio}>
              <Plus className="w-4 h-4 mr-2" />
              Add Portfolio
            </Button>
          </div>
        </div>
        <TabsContent value="portfolios">
          {portfolios.length === 0 ? (
            <div className="text-center py-12 px-6 bg-slate-50/80 rounded-lg shadow-inner">
              <Building className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold text-slate-800">No Portfolios Found</h3>
              <p className="text-slate-500 mt-2 mb-6">This client doesn't have any investment portfolios set up yet.</p>
              <Button onClick={handleCreatePortfolio}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Portfolio
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {portfolios.map((portfolio) => {
                const portfolioClientIds = portfolio.client_ids || (portfolio.client_id ? [portfolio.client_id] : []);
                const clientNames = getClientNamesFromIds(portfolioClientIds);
                const linkedAssessment = riskAssessments.find(ra => ra.linked_portfolio_id === portfolio.id);
                const linkedCalculator = calculatorInstances.find(ci => String(ci.id) === String(portfolio.calculator_instance_id));
                
                // Debug logging for this specific portfolio
                console.log(`Debug - Portfolio "${portfolio.account_name}":`, {
                  calculator_instance_id: portfolio.calculator_instance_id,
                  linkedCalculator: linkedCalculator,
                  allCalculatorIds: calculatorInstances.map(c => c.id)
                });

                return (
                  <PortfolioItem
                    key={portfolio.id}
                    portfolio={portfolio}
                    goals={goals}
                    funds={funds}
                    onEdit={handleEditPortfolio}
                    onDelete={(portfolioId) => handleDeletePortfolio(portfolioId)}
                    onShowPieChart={handleShowPieChart}
                    isSelected={selectedPortfolio?.id === portfolio.id}
                    onToggleDetails={(portfolioId) => handleToggleDetails(portfolioId)}
                    associatedClientNames={clientNames}
                    linkedAssessment={linkedAssessment}
                    linkedCalculator={linkedCalculator}
                    onViewAssessment={handleViewAssessment}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>
        <TabsContent value="rebalancing">
          <RebalancingTool
            clientPortfolios={portfolios}
            modelPortfolios={models}
            funds={funds}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      {showForm && (
        <PortfolioForm
          portfolio={editingPortfolio}
          goals={goals}
          models={models}
          funds={funds}
          onSave={handleSavePortfolio}
          onCancel={() => {
            setShowForm(false);
            setEditingPortfolio(null);
          }}
          allClients={allClients}
          preselectedClientId={client.id}
        />
      )}

      {showDeleteDialog && (
        <DeletePortfolioDialog
          portfolio={deletingPortfolio}
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={confirmDeletePortfolio}
        />
      )}

      {showPieChartModal && pieChartPortfolio && (
        <PortfolioAllocationPieChartModal
          isOpen={showPieChartModal}
          onClose={() => setShowPieChartModal(false)}
          portfolio={pieChartPortfolio}
          funds={funds}
        />
      )}

      {viewingAssessment && (
        <RiskAssessmentViewerModal
          isOpen={!!viewingAssessment}
          onClose={handleCloseAssessmentViewer}
          assessment={viewingAssessment.assessment}
          portfolio={viewingAssessment.portfolio}
          clientNames={getClientNamesFromIds(viewingAssessment.assessment.client_ids)}
          onUpdate={loadAllData}
        />
      )}
    </div>
  );
}
