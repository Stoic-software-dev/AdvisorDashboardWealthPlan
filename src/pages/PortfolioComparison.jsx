
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Plus,
  Trash2,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  Save,
  FileText,
  Target,
  Building,
  Search,
  X,
  Edit,
  Bot
} from 'lucide-react';
import { Client, Portfolio, SuggestedPortfolio, NetWorthStatement, Asset, Fund } from '@/api/entities';
import ClientCombobox from '../components/shared/ClientCombobox';
import MultiClientSelector from '../components/shared/MultiClientSelector';
import GiuseppeAIOptimizer from '../components/shared/GiuseppeAIOptimizer';

// Standard asset categories for comparison - UNIFIED LIST
const UNIFIED_ASSET_TYPES = ['Equities', 'Fixed Income', 'Balanced', 'Cash', 'Real Estate', 'Other'];

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function PortfolioComparison() {
  const [clients, setClients] = useState([]);
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  const [currentPositionType, setCurrentPositionType] = useState('portfolio');
  const [selectedPortfolioId, setSelectedPortfolioId] = useState('');
  const [excludeRealEstate, setExcludeRealEstate] = useState(false);
  const [selectedSuggestedPortfolioId, setSelectedSuggestedPortfolioId] = useState('');
  const [viewMode, setViewMode] = useState('asset_class');

  // Data states
  const [portfolios, setPortfolios] = useState([]);
  const [suggestedPortfolios, setSuggestedPortfolios] = useState([]);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [suggestedPosition, setSuggestedPosition] = useState(null);
  const [funds, setFunds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form states for creating suggested portfolios
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [targetPortfolioMode, setTargetPortfolioMode] = useState('existing');
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioDescription, setNewPortfolioDescription] = useState('');
  const [newPortfolioRiskLevel, setNewPortfolioRiskLevel] = useState('');
  const [assetCategoryTargets, setAssetCategoryTargets] = useState(
    UNIFIED_ASSET_TYPES.map(cat => ({ category_name: cat, target_percentage: 0 }))
  );
  const [detailedHoldings, setDetailedHoldings] = useState([]);

  // Manual entry state - Updated for custom assets
  const [manualAssets, setManualAssets] = useState([
    { id: 1, name: '', type: '', percentage: 0 }
  ]);

  // Add new state for controlling detail visibility
  const [showPositionDetails, setShowPositionDetails] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [assetInvestmentTypes, setAssetInvestmentTypes] = useState({});

  // States for Edit/Delete functionality
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [portfolioToDelete, setPortfolioToDelete] = useState(null);
  const [editingPortfolio, setEditingPortfolio] = useState(null);

  const loadClients = useCallback(async () => {
    try {
      const data = await Client.list();
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }, []);

  const loadFunds = useCallback(async () => {
    try {
      const data = await Fund.list();
      setFunds(data);
    } catch (error) {
      console.error('Error loading funds:', error);
    }
  }, []);

  const loadClientData = useCallback(async () => {
    if (!selectedClientIds || selectedClientIds.length === 0) {
      setPortfolios([]);
      setSuggestedPortfolios([]);
      setSelectedPortfolioId('');
      setSelectedSuggestedPortfolioId('');
      setCurrentPosition(null);
      setSuggestedPosition(null);
      return;
    }
    try {
      // Get portfolios for any of the selected clients
      const portfolioPromises = selectedClientIds.map(clientId =>
        Portfolio.filter({ client_ids: clientId })
      );
      const portfolioResults = await Promise.all(portfolioPromises);
      const allPortfolios = portfolioResults.flat();

      // Get suggested portfolios for the primary client (first selected)
      // This logic might need refinement if suggested portfolios can be associated with multiple clients
      // For now, it uses the first client in the array.
      const suggestedData = await SuggestedPortfolio.filter({ client_id: selectedClientIds[0] });

      setPortfolios(allPortfolios);
      setSuggestedPortfolios(suggestedData);

      // Reset selections if the currently selected ones are no longer valid for the new client selection
      if (selectedPortfolioId && !allPortfolios.some(p => p.id === selectedPortfolioId)) {
        setSelectedPortfolioId('');
      }
      if (selectedSuggestedPortfolioId && !suggestedData.some(s => s.id === selectedSuggestedPortfolioId)) {
        setSelectedSuggestedPortfolioId('');
      }

    } catch (error) {
      console.error('Error loading client data:', error);
    }
  }, [selectedClientIds, selectedPortfolioId, selectedSuggestedPortfolioId]);

  const loadCurrentPositionFromPortfolio = useCallback(async () => {
    if (!selectedPortfolioId || currentPositionType !== 'portfolio') {
      setCurrentPosition(null);
      return;
    }
    try {
      const portfolio = await Portfolio.get(selectedPortfolioId);
      
      // If no portfolio is found for the ID, clear the state and stop.
      if (!portfolio) {
        setCurrentPosition(null);
        return;
      }

      const categoryBreakdown = {};
      const fundHoldings = portfolio.fund_holdings || []; // Ensure fund_holdings is an array

      // Process holdings if they exist
      for (const holding of fundHoldings) {
        const fund = funds.find(f => f.id === holding.fund_id);
        if (fund && fund.broad_asset_category) {
          // Use the original broad_asset_category without mapping
          const category = fund.broad_asset_category;
          categoryBreakdown[category] = (categoryBreakdown[category] || 0) + holding.allocation_percentage;
        }
      }

      // Critical Fix: Always set the current position state if a portfolio object was successfully fetched.
      // This ensures the breakdown card appears, even if the category breakdown is empty.
      setCurrentPosition({
        type: 'portfolio',
        name: portfolio.account_name,
        categoryBreakdown: categoryBreakdown,
        fundHoldings: fundHoldings,
        totalValue: portfolio.total_value
      });

    } catch (error) {
      console.error('Error loading current position from portfolio:', error);
      setCurrentPosition(null);
    }
  }, [selectedPortfolioId, currentPositionType, funds]);

  const loadCurrentPositionFromNetWorth = useCallback(async () => {
    if (!selectedClientIds || selectedClientIds.length === 0 || currentPositionType !== 'networth') {
      setCurrentPosition(null);
      setAssetInvestmentTypes({}); // Clear allocations when position changes
      return;
    }
    try {
      // Get statements for all selected clients
      const statementPromises = selectedClientIds.map(clientId =>
        NetWorthStatement.filter({ client_ids: clientId }, '-statement_date')
      );
      const statementResults = await Promise.all(statementPromises);

      // Get the most recent statement from all clients
      const allStatements = statementResults.flat();
      if (allStatements.length === 0) {
        setCurrentPosition(null);
        return;
      }

      // Sort by date and take the most recent
      const latestStatement = allStatements.sort((a, b) =>
        new Date(b.statement_date) - new Date(a.statement_date)
      )[0];

      const assets = await Asset.filter({ statement_id: latestStatement.id });

      // Pre-populate the local state for investment type allocations
      const initialAllocations = {};
      assets.forEach(asset => {
        initialAllocations[asset.id] = asset.investment_asset_type || '';
      });
      setAssetInvestmentTypes(initialAllocations);
      
      // Filter for assets based on excludeRealEstate flag
      const relevantAssets = assets.filter(asset => {
        const category = asset.asset_category;
        if (excludeRealEstate) {
          // Explicitly exclude real estate categories if flag is true
          return ![
            'Principal Residence',
            'Investment Real Estate',
            'Other Real Estate',
            'Real Estate Assets'
          ].includes(category);
        }
        // If not excluding real estate, include all asset categories
        return true;
      });

      // Group by category - USE ORIGINAL CATEGORIES, NO MAPPING
      const categoryBreakdown = {};
      let totalValue = 0;

      relevantAssets.forEach(asset => {
        const category = asset.asset_category; // Use original category

        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + asset.asset_value;
        totalValue += asset.asset_value;
      });

      // Convert to percentages
      Object.keys(categoryBreakdown).forEach(category => {
        if (totalValue > 0) {
          categoryBreakdown[category] = (categoryBreakdown[category] / totalValue) * 100;
        } else {
          categoryBreakdown[category] = 0;
        }
      });

      setCurrentPosition({
        type: 'networth',
        name: `Net Worth Statement (${latestStatement.statement_date})`,
        categoryBreakdown,
        assets: relevantAssets, // Use filtered assets
        totalValue
      });
    } catch (error) {
      console.error('Error loading current position from net worth:', error);
      setCurrentPosition(null);
    }
  }, [selectedClientIds, currentPositionType, excludeRealEstate]);

  const loadSuggestedPosition = useCallback(async () => {
    if (!selectedSuggestedPortfolioId || targetPortfolioMode !== 'existing') {
      setSuggestedPosition(null);
      return;
    }
    try {
      const suggested = await SuggestedPortfolio.get(selectedSuggestedPortfolioId);
      if (suggested) {
        const categoryBreakdown = {};
        suggested.asset_category_targets?.forEach(target => {
          // Suggested portfolios use the new investment asset types, so no mapping needed
          categoryBreakdown[target.category_name] = (categoryBreakdown[target.category_name] || 0) + target.target_percentage;
        });

        setSuggestedPosition({
          ...suggested,
          categoryBreakdown
        });
      }
    } catch (error) {
      console.error('Error loading suggested position:', error);
      setSuggestedPosition(null);
    }
  }, [selectedSuggestedPortfolioId, targetPortfolioMode]);

  useEffect(() => {
    loadClients();
    loadFunds();
  }, [loadClients, loadFunds]);

  useEffect(() => {
    loadClientData();
  }, [loadClientData]);

  useEffect(() => {
    if (currentPositionType === 'portfolio') {
      loadCurrentPositionFromPortfolio();
    }
  }, [selectedPortfolioId, currentPositionType, funds, loadCurrentPositionFromPortfolio]);

  useEffect(() => {
    if (currentPositionType === 'networth') {
      loadCurrentPositionFromNetWorth();
    }
  }, [selectedClientIds, currentPositionType, excludeRealEstate, loadCurrentPositionFromNetWorth]);
  
  useEffect(() => {
    // Only load suggested position if targetPortfolioMode is 'existing'
    if (targetPortfolioMode === 'existing') {
      loadSuggestedPosition();
    } else {
      setSuggestedPosition(null);
    }
  }, [loadSuggestedPosition, targetPortfolioMode]);

  const handleEditPortfolio = (portfolio) => {
    setEditingPortfolio(portfolio);
    setNewPortfolioName(portfolio.name);
    setNewPortfolioDescription(portfolio.description || '');
    setNewPortfolioRiskLevel(portfolio.risk_level);
    
    // Pre-populate asset category targets
    const existingTargets = portfolio.asset_category_targets || [];
    const populatedTargets = UNIFIED_ASSET_TYPES.map(cat => {
      const existing = existingTargets.find(t => t.category_name === cat);
      return {
        category_name: cat,
        target_percentage: existing ? existing.target_percentage : 0
      };
    });
    setAssetCategoryTargets(populatedTargets);
    // Ensure detailed holdings have temporary IDs for React keys
    const holdingsWithIds = (portfolio.detailed_holdings || []).map((h, index) => ({
      id: h.id || Date.now() + index, // Add temporary ID if missing
      ...h,
      // Recalculate effective total percentage to ensure consistency if target percentages have changed
      effective_total_percentage: (h.percentage_of_category / 100) * (populatedTargets.find(t => t.category_name === h.allocated_to_category)?.target_percentage || 0)
    }));
    setDetailedHoldings(holdingsWithIds);
    setShowCreateForm(true);
  };

  const handleDeletePortfolio = (portfolio) => {
    setPortfolioToDelete(portfolio);
    setShowDeleteDialog(true);
  };

  const confirmDeletePortfolio = async () => {
    if (!portfolioToDelete) return;
    
    try {
      await SuggestedPortfolio.delete(portfolioToDelete.id);
      setSuggestedPortfolios(prev => prev.filter(p => p.id !== portfolioToDelete.id));
      if (selectedSuggestedPortfolioId === portfolioToDelete.id) {
        setSelectedSuggestedPortfolioId('');
      }
      setShowDeleteDialog(false);
      setPortfolioToDelete(null);
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      alert('Failed to delete portfolio');
    }
  };

  const handleCreateSuggestedPortfolio = async () => {
    if (!selectedClientIds || selectedClientIds.length === 0 || !newPortfolioName || !newPortfolioRiskLevel) {
      alert('Please fill in all required fields and select at least one client.');
      return;
    }

    // Validate that percentages add up to 100
    const totalPercentage = assetCategoryTargets.reduce((sum, target) => sum + target.target_percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      alert('Asset category percentages must add up to 100%');
      return;
    }

    try {
      // Remove temporary 'id' field from detailedHoldings before sending to API
      const holdingsToSave = detailedHoldings.map(({ id, ...rest }) => rest);

      const portfolioData = {
        client_id: selectedClientIds[0],
        name: newPortfolioName,
        description: newPortfolioDescription,
        risk_level: newPortfolioRiskLevel,
        asset_category_targets: assetCategoryTargets.filter(target => target.target_percentage > 0),
        detailed_holdings: holdingsToSave
      };

      let savedPortfolio;
      if (editingPortfolio) {
        savedPortfolio = await SuggestedPortfolio.update(editingPortfolio.id, portfolioData);
        setSuggestedPortfolios(prev => prev.map(p => p.id === editingPortfolio.id ? savedPortfolio : p));
      } else {
        savedPortfolio = await SuggestedPortfolio.create(portfolioData);
        setSuggestedPortfolios(prev => [...prev, savedPortfolio]);
      }

      setSelectedSuggestedPortfolioId(savedPortfolio.id);
      setShowCreateForm(false);

      // Reset form
      setEditingPortfolio(null);
      setNewPortfolioName('');
      setNewPortfolioDescription('');
      setNewPortfolioRiskLevel('');
      setAssetCategoryTargets(UNIFIED_ASSET_TYPES.map(cat => ({ category_name: cat, target_percentage: 0 })));
      setDetailedHoldings([]);
    } catch (error) {
      console.error('Error saving portfolio:', error);
      alert('Failed to save portfolio');
    }
  };

  const updateAssetCategoryTarget = (category, percentage) => {
    setAssetCategoryTargets(prev => {
      const updatedTargets = prev.map(target =>
        target.category_name === category
          ? { ...target, target_percentage: Math.max(0, Math.min(100, percentage)) }
          : target
      );

      // Recalculate effective_total_percentage for detailed holdings impacted by this category change
      setDetailedHoldings(prevHoldings => prevHoldings.map(holding => {
        if (holding.allocated_to_category === category) {
          const newCategoryTarget = updatedTargets.find(t => t.category_name === category);
          return {
            ...holding,
            effective_total_percentage: (holding.percentage_of_category / 100) * (newCategoryTarget?.target_percentage || 0)
          };
        }
        return holding;
      }));

      return updatedTargets;
    });
  };

  const handleAssetInvestmentTypeChange = async (assetId, newType) => {
    // Optimistically update the UI
    setAssetInvestmentTypes(prev => ({ ...prev, [assetId]: newType }));
    try {
      await Asset.update(assetId, { investment_asset_type: newType });
    } catch (error) {
      console.error("Failed to update asset investment type:", error);
      // Revert on failure
      setAssetInvestmentTypes(prev => {
        const reverted = { ...prev };
        const originalAsset = currentPosition?.assets?.find(a => a.id === assetId);
        reverted[assetId] = originalAsset?.investment_asset_type || '';
        return reverted;
      });
      alert("Failed to save allocation. Please try again.");
    }
  };

  const updateManualAsset = (id, field, value) => {
    setManualAssets(prev =>
      prev.map(asset =>
        asset.id === id
          ? { ...asset, [field]: value }
          : asset
      )
    );
  };

  const addManualAsset = () => {
    const newId = Math.max(...manualAssets.map(a => a.id), 0) + 1;
    setManualAssets(prev => [
      ...prev,
      { id: newId, name: '', type: '', percentage: 0 }
    ]);
  };

  const removeManualAsset = (id) => {
    if (manualAssets.length > 1) {
      setManualAssets(prev => prev.filter(asset => asset.id !== id));
    }
  };

  const addDetailedHolding = (category) => {
    setDetailedHoldings(prev => [
      ...prev,
      {
        id: Date.now(), // temporary unique id for mapping
        allocated_to_category: category,
        fund_id: '',
        manual_fund_name: '',
        manual_fund_type: '',
        percentage_of_category: 0,
        effective_total_percentage: 0
      }
    ]);
  };

  const updateDetailedHolding = (id, field, value) => {
    setDetailedHoldings(prev => {
      const updated = prev.map(h => {
        if (h.id === id) {
          const newHolding = { ...h, [field]: value };
          // If a fund is selected, clear manual name
          if (field === 'fund_id' && value) {
            newHolding.manual_fund_name = '';
          }
          // If manual fund name is entered, clear fund_id
          if (field === 'manual_fund_name' && value) {
            newHolding.fund_id = '';
          }

          // Calculate effective total percentage
          const currentCategoryTarget = assetCategoryTargets.find(
            target => target.category_name === newHolding.allocated_to_category
          );
          if (currentCategoryTarget) {
            newHolding.effective_total_percentage =
              (newHolding.percentage_of_category / 100) * currentCategoryTarget.target_percentage;
          } else {
            newHolding.effective_total_percentage = 0;
          }
          return newHolding;
        }
        return h;
      });
      return updated;
    });
  };

  const removeDetailedHolding = (id) => {
    setDetailedHoldings(prev => prev.filter(h => h.id !== id));
  };


  // Add function to toggle category expansion
  const toggleCategoryExpansion = (category) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Enhanced function to get detailed fund breakdown by category
  const getFundBreakdownByCategory = () => {
    if (!currentPosition || currentPosition.type !== 'portfolio' || !currentPosition.fundHoldings) {
      return {};
    }

    const categoryBreakdown = {};

    currentPosition.fundHoldings.forEach(holding => {
      const fund = funds.find(f => f.id === holding.fund_id);
      if (fund && fund.broad_asset_category) {
        const category = fund.broad_asset_category; // Use original category

        if (!categoryBreakdown[category]) {
          categoryBreakdown[category] = [];
        }

        categoryBreakdown[category].push({
          fund: fund,
          allocation: holding.allocation_percentage,
          holding: holding
        });
      }
    });

    return categoryBreakdown;
  };

  // Generate chart data for current position
  const getCurrentPositionChartData = () => {
    if (!currentPosition || !currentPosition.categoryBreakdown) return [];

    return Object.entries(currentPosition.categoryBreakdown)
      .filter(([_, value]) => value > 0)
      .map(([category, percentage]) => ({
        name: category,
        value: percentage
      }));
  };

  const renderCurrentPositionBreakdown = () => {
    if (!currentPosition) {
      return (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Current Position Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Please select clients and a current position to see the breakdown.</p>
          </CardContent>
        </Card>
      );
    }

    const chartData = getCurrentPositionChartData();
    const fundBreakdown = getFundBreakdownByCategory();

    // Create a color map based on the main chart's data order for consistency
    const dynamicCategoryColorMap = chartData.reduce((acc, entry, index) => {
        acc[entry.name] = COLORS[index % COLORS.length];
        return acc;
    }, {});
    
    return (
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Position Breakdown</CardTitle>
            {/* Show button for both portfolios with holdings AND net worth statements with assets */}
            {((currentPosition.type === 'portfolio' && currentPosition.fundHoldings && currentPosition.fundHoldings.length > 0) ||
              (currentPosition.type === 'networth' && currentPosition.assets && currentPosition.assets.length > 0)) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPositionDetails(!showPositionDetails)}
              >
                {showPositionDetails ? 'Hide Details' : 'Show Details'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Allocation Breakdown</h4>
                <div className="space-y-2">
                  {chartData.map((item, index) => (
                    <div key={item.name} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
                {currentPosition.totalValue && (
                  <div className="mt-4 pt-3 border-t">
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total Value:</span>
                      <span>${currentPosition.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
             <div className="text-center py-4 text-gray-500">
               <p>No asset category breakdown is available to display a chart.</p>
               {((currentPosition.type === 'portfolio' && currentPosition.fundHoldings && currentPosition.fundHoldings.length > 0) ||
                 (currentPosition.type === 'networth' && currentPosition.assets && currentPosition.assets.length > 0)) && (
                 <p className="text-sm">Click 'Show Details' to see detailed holdings.</p>
               )}
             </div>
          )}

          {/* Detailed Breakdown Section - Updated for both portfolios and net worth */}
          {showPositionDetails && (
            <div className={`mt-8 pt-6 ${chartData.length > 0 ? 'border-t' : ''}`}>
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Building className="w-4 h-4" />
                {currentPosition.type === 'portfolio' ? 'Detailed Holdings Breakdown' : 'Detailed Asset Breakdown'}
              </h4>
              
              {currentPosition.type === 'portfolio' ? (
                // Portfolio holdings view
                currentPosition.fundHoldings && currentPosition.fundHoldings.length > 0 ? (
                  <div className="space-y-3">
                    {currentPosition.fundHoldings.map((holding, index) => {
                      const fund = funds.find(f => f.id === holding.fund_id);
                      if (!fund) return null;

                      return (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/50">
                          <div>
                            <div className="font-medium text-sm">{fund.name}</div>
                            <div className="text-xs text-slate-500">
                              {fund.fund_code} • {fund.fund_family}
                            </div>
                            {fund.broad_asset_category && (
                               <Badge variant="outline" className="mt-1 text-xs">
                                  {fund.broad_asset_category}
                               </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{holding.allocation_percentage.toFixed(1)}%</div>
                             {currentPosition.totalValue && (
                              <div className="text-xs text-slate-500">
                                ${((currentPosition.totalValue * holding.allocation_percentage) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No fund holdings are defined for this portfolio.</p>
                    <p className="text-sm">You can add holdings by editing the portfolio in the client's profile.</p>
                  </div>
                )
              ) : (
                // Net worth assets view - REVISED with Two Charts
                currentPosition.assets && currentPosition.assets.length > 0 ? (
                  <div className="space-y-8">
                    {/* Asset List */}
                    <div className="space-y-6 max-h-[400px] overflow-y-auto">
                      {Object.entries(
                        currentPosition.assets.reduce((acc, asset) => {
                          const category = asset.asset_category; // Use original category
                          if (!acc[category]) {
                            acc[category] = [];
                          }
                          acc[category].push(asset);
                          return acc;
                        }, {})
                      ).map(([category, assets]) => (
                        <div key={category}>
                          <h5 className="font-semibold text-sm mb-3 text-slate-700 border-b pb-1">
                            {category}
                          </h5>
                          <div className="space-y-2">
                            {assets.map((asset, index) => (
                              <div key={index} className="flex items-start justify-between p-2 border rounded bg-slate-50/30 gap-2">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{asset.asset_name}</div>
                                  {asset.notes && (
                                    <div className="text-xs text-slate-500 mt-1">{asset.notes}</div>
                                  )}
                                  {/* Allocation Dropdown */}
                                  <Select
                                    value={assetInvestmentTypes[asset.id] || ''}
                                    onValueChange={(value) => handleAssetInvestmentTypeChange(asset.id, value)}
                                  >
                                    <SelectTrigger className="h-7 text-xs mt-2 w-full sm:w-[150px]">
                                      <SelectValue placeholder="Allocate Type..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {UNIFIED_ASSET_TYPES.map(type => (
                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="font-medium">${asset.asset_value.toLocaleString()}</div>
                                  {currentPosition.totalValue > 0 && (
                                    <div className="text-xs text-slate-500">
                                      {((asset.asset_value / currentPosition.totalValue) * 100).toFixed(1)}%
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Two Pie Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                      {/* Individual Assets Pie Chart */}
                      <div>
                        <h5 className="font-semibold text-center mb-4">Detailed Asset Distribution</h5>
                        <ResponsiveContainer width="100%" height={400}>
                          <PieChart>
                            <Pie
                              data={currentPosition.assets.map(asset => ({...asset, name: asset.asset_name, value: asset.asset_value }))}
                              cx="50%"
                              cy="50%"
                              outerRadius={120}
                              fill="#8884d8"
                              dataKey="value"
                              nameKey="name"
                              labelLine={false}
                              label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                            >
                              {currentPosition.assets.map((asset, index) => {
                                const broadCategory = asset.asset_category; // Use original category
                                return (
                                  <Cell key={`cell-detail-${index}`} fill={dynamicCategoryColorMap[broadCategory] || COLORS[index % COLORS.length]} />
                                );
                              })}
                            </Pie>
                            <Tooltip formatter={(value, name) => [`$${value.toLocaleString()}`, name]} />
                            <Legend
                              layout="vertical"
                              align="right"
                              verticalAlign="middle"
                              wrapperStyle={{ fontSize: '12px', lineHeight: '1.5' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Investment Type Allocation Pie Chart */}
                      <div>
                        <h5 className="font-semibold text-center mb-4">Investment Type Allocation</h5>
                        {(() => {
                          // Calculate aggregated investment type data
                          const investmentTypeBreakdown = {};
                          let totalAllocatedValue = 0;

                          currentPosition.assets.forEach(asset => {
                            const investmentType = assetInvestmentTypes[asset.id];
                            if (investmentType) { // Only consider assets that have been allocated an investment type
                              investmentTypeBreakdown[investmentType] = (investmentTypeBreakdown[investmentType] || 0) + asset.asset_value;
                              totalAllocatedValue += asset.asset_value;
                            }
                          });

                          const investmentTypeData = Object.entries(investmentTypeBreakdown).map(([type, value]) => ({
                            name: type,
                            value: value,
                            percentage: totalAllocatedValue > 0 ? (value / totalAllocatedValue) * 100 : 0
                          }));

                          return investmentTypeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={400}>
                              <PieChart>
                                <Pie
                                  data={investmentTypeData}
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={120}
                                  fill="#82ca9d"
                                  dataKey="value"
                                  nameKey="name"
                                  labelLine={false}
                                  label={({ name, percentage }) => percentage > 5 ? `${name}: ${percentage.toFixed(0)}%` : ''}
                                >
                                  {investmentTypeData.map((entry, index) => (
                                    <Cell key={`cell-investment-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value, name) => [`$${value.toLocaleString()}`, name]} />
                                <Legend
                                  layout="vertical"
                                  align="right"
                                  verticalAlign="middle"
                                  wrapperStyle={{ fontSize: '12px', lineHeight: '1.5' }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-[400px] flex items-center justify-center text-slate-500">
                              <div className="text-center">
                                <PieChartIcon className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                                <p>No investment type allocations yet.</p>
                                <p className="text-sm">Use the dropdowns above to allocate assets to investment types.</p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No assets are available for this net worth statement.</p>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderManualAllocationMode = () => {
    const totalManualPercentage = manualAssets.reduce((sum, asset) => sum + asset.percentage, 0);

    // Generate chart data from manual assets
    const chartData = manualAssets
      .filter(asset => asset.percentage > 0 && asset.name.trim() !== '')
      .map(asset => ({
        name: asset.name,
        value: asset.percentage
      }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Investment Asset Allocation</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={addManualAsset}
                className="flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Asset
              </Button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {manualAssets.map(asset => (
                <div key={asset.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Asset name (e.g., Canadian Equities, Corporate Bonds)"
                      value={asset.name}
                      onChange={(e) => updateManualAsset(asset.id, 'name', e.target.value)}
                      className="text-sm"
                    />
                    <Select
                      value={asset.type}
                      onValueChange={(value) => updateManualAsset(asset.id, 'type', value)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select asset type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIFIED_ASSET_TYPES.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={asset.percentage}
                      onChange={(e) => updateManualAsset(
                        asset.id,
                        'percentage',
                        parseFloat(e.target.value) || 0
                      )}
                      className="w-20 text-sm"
                    />
                    <span className="text-sm">%</span>
                  </div>
                  {manualAssets.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeManualAsset(asset.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t mt-4">
              <Badge variant={totalManualPercentage === 100 ? "default" : "destructive"}>
                Total: {totalManualPercentage.toFixed(1)}%
              </Badge>
              {totalManualPercentage !== 100 && (
                <p className="text-sm text-gray-500 mt-1">
                  {totalManualPercentage > 100
                    ? `Over allocated by ${(totalManualPercentage - 100).toFixed(1)}%`
                    : `Remaining: ${(100 - totalManualPercentage).toFixed(1)}%`
                  }
                </p>
              )}
            </div>
          </div>

          {chartData.length > 0 && (
            <div>
              <h4 className="font-semibold mb-4">Target Allocation Preview</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="mt-4 space-y-1">
                {chartData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length]} }
                    />
                    <span className="flex-1">{item.name}</span>
                    <span className="font-medium">{item.value.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderComparisonChart = () => {
    if (!currentPosition) return null;

    let currentData = [];
    let suggestedData = [];

    // Data for Current Position - MODIFIED
    // If it's a net worth statement, aggregate by the selected investment asset types
    if (currentPosition.type === 'networth' && currentPosition.assets) {
        const investmentTypeBreakdown = {};
        let totalValue = 0;

        currentPosition.assets.forEach(asset => {
            const investmentType = assetInvestmentTypes[asset.id];
            if (investmentType) { // Only consider assets that have been allocated an investment type
                investmentTypeBreakdown[investmentType] = (investmentTypeBreakdown[investmentType] || 0) + asset.asset_value;
                totalValue += asset.asset_value;
            }
        });
        
        currentData = Object.entries(investmentTypeBreakdown)
            .map(([name, value]) => ({ 
                name, 
                value: totalValue > 0 ? (value / totalValue) * 100 : 0
            }))
            .filter(d => d.value > 0);

    } else if (currentPosition.categoryBreakdown) {
        // Fallback for portfolios or if net worth assets are not available
        currentData = Object.entries(currentPosition.categoryBreakdown)
            .map(([name, value]) => ({ name, value }))
            .filter(d => d.value > 0);
    }

    // Data for Suggested/Target Position
    if (targetPortfolioMode === 'manual') {
      const aggregatedManualData = manualAssets
        .filter(asset => asset.percentage > 0 && asset.name.trim() !== '')
        .reduce((acc, asset) => {
          const key = (asset.type && asset.type.trim() !== '') ? asset.type.trim() : asset.name.trim();
          acc[key] = (acc[key] || 0) + asset.percentage;
          return acc;
        }, {});
      suggestedData = Object.entries(aggregatedManualData).map(([name, value]) => ({ name, value }));
    } else if (suggestedPosition && suggestedPosition.categoryBreakdown) {
      suggestedData = Object.entries(suggestedPosition.categoryBreakdown)
        .map(([name, value]) => ({ name, value }))
        .filter(d => d.value > 0);
    }

    if (currentData.length === 0 && suggestedData.length === 0) return null;

    // Create a consistent color map for all categories across both charts
    const allCategories = new Set([
      ...currentData.map(d => d.name),
      ...suggestedData.map(d => d.name)
    ]);
    const colorMap = Array.from(allCategories).reduce((acc, category, index) => {
        acc[category] = COLORS[index % COLORS.length];
        return acc;
    }, {});

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Current Position Pie Chart */}
        <div>
          <h4 className="text-lg font-semibold text-center mb-4 text-slate-700">Current Allocation</h4>
          {currentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={currentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => percent > 0.05 ? `${name}: ${(percent * 100).toFixed(1)}%` : ''}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {currentData.map((entry) => (
                    <Cell key={`cell-current-${entry.name}`} fill={colorMap[entry.name]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
             <div className="h-[300px] flex items-center justify-center text-slate-500">No data to display.</div>
          )}
        </div>

        {/* Target Portfolio Pie Chart */}
        <div>
          <h4 className="text-lg font-semibold text-center mb-4 text-slate-700">Target Allocation</h4>
          {suggestedData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={suggestedData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => percent > 0.05 ? `${name}: ${(percent * 100).toFixed(1)}%` : ''}
                  outerRadius={100}
                  fill="#82ca9d"
                  dataKey="value"
                  nameKey="name"
                >
                  {suggestedData.map((entry) => (
                    <Cell key={`cell-suggested-${entry.name}`} fill={colorMap[entry.name]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500">No data to display.</div>
          )}
        </div>
      </div>
    );
  };

  const renderDetailedAssetDistributionChart = () => {
    const currentDetailedData = (currentPosition?.type === 'networth' && currentPosition.assets)
      ? currentPosition.assets.map(asset => ({
          name: asset.asset_name,
          value: asset.asset_value,
          category: asset.asset_category // Use original category, no mapping
        }))
      : [];

    const targetDetailedData = (targetPortfolioMode === 'manual')
      ? manualAssets.filter(asset => asset.percentage > 0 && asset.name.trim() !== '').map(asset => ({
          name: asset.name,
          value: asset.percentage,
          category: asset.type || 'Uncategorized'
        }))
      : [];

    if (currentDetailedData.length === 0 && targetDetailedData.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>Detailed asset distribution is only available when comparing a Net Worth statement with a Manual Entry target.</p>
        </div>
      );
    }
    
    // Create a color map based on the main chart's data order for consistency for current assets
    const broadChartData = getCurrentPositionChartData();
    const dynamicCategoryColorMap = broadChartData.reduce((acc, entry, index) => {
        acc[entry.name] = COLORS[index % COLORS.length];
        return acc;
    }, {});


    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Current Detailed Asset Pie Chart */}
        <div>
          <h4 className="text-lg font-semibold text-center mb-4 text-slate-700">Current Detailed Assets</h4>
          {currentDetailedData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={currentDetailedData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => (percent * 100) > 3 ? `${(percent * 100).toFixed(0)}%` : ''}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {currentDetailedData.map((entry, index) => {
                    const broadCategory = entry.category; // Use original category
                    return (
                      <Cell key={`cell-current-detailed-${index}`} fill={dynamicCategoryColorMap[broadCategory] || COLORS[index % COLORS.length]} />
                    );
                  })}
                </Pie>
                <Tooltip formatter={(value, name) => [`$${value.toLocaleString()}`, name]} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px' }}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500">No detailed current assets.</div>
          )}
        </div>

        {/* Target Detailed Asset Pie Chart */}
        <div>
          <h4 className="text-lg font-semibold text-center mb-4 text-slate-700">Target Detailed Assets</h4>
          {targetDetailedData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={targetDetailedData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => (percent * 100) > 3 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                  outerRadius={100}
                  fill="#82ca9d"
                  dataKey="value"
                  nameKey="name"
                >
                  {targetDetailedData.map((entry, index) => (
                    <Cell key={`cell-target-detailed-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value.toFixed(1)}%`, name]} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px' }}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500">No detailed target assets.</div>
          )}
        </div>
      </div>
    );
  };


  const renderFundComparison = () => {
    // This view is only relevant for 'existing' suggested portfolios with detailed holdings
    if (targetPortfolioMode !== 'existing' || !suggestedPosition?.detailed_holdings || suggestedPosition.detailed_holdings.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No specific fund details available for the target portfolio.</p>
          <p className="text-sm">
            {targetPortfolioMode === 'manual' && 'Manual entry mode does not support specific fund comparison.'}
            {targetPortfolioMode === 'create' && 'Create a suggested portfolio with detailed holdings to see this view.'}
            {targetPortfolioMode === 'existing' && 'The selected existing portfolio is defined by asset categories only.'}
          </p>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <h4 className="font-semibold">Target Fund Holdings</h4>
        <div className="grid gap-4">
          {suggestedPosition.detailed_holdings.map((holding, index) => {
            const fund = holding.fund_id ? funds.find(f => f.id === holding.fund_id) : null;
            return (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-medium">
                      {fund ? fund.name : holding.manual_fund_name}
                    </h5>
                    {fund && <p className="text-sm text-gray-600">{fund.fund_code}</p>}
                    {holding.manual_fund_type && (
                      <p className="text-sm text-gray-600">{holding.manual_fund_type}</p>
                    )}
                    <Badge variant="outline" className="mt-1">
                      {holding.allocated_to_category}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{holding.effective_total_percentage.toFixed(1)}%</div>
                    <div className="text-sm text-gray-500">
                      {holding.percentage_of_category.toFixed(1)}% of {holding.allocated_to_category}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const totalTargetPercentage = assetCategoryTargets.reduce((sum, target) => sum + target.target_percentage, 0);

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Portfolio Comparison</h1>
          <p className="text-slate-600">Compare client portfolios with suggested investment strategies.</p>
        </div>

        {/* Selection Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Portfolio Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client Selection - Now uses MultiClientSelector */}
            <div>
              <Label className="text-base font-medium mb-3 block">Select Clients</Label>
              <MultiClientSelector
                clients={clients}
                selectedClientIds={selectedClientIds}
                onChange={setSelectedClientIds}
                placeholder="Choose clients to analyze..."
              />
            </div>

            {selectedClientIds.length > 0 && (
              <>
                {/* Current Position Selection */}
                <div className="space-y-4">
                  <Label className="font-semibold">Current Position</Label>
                  <Tabs value={currentPositionType} onValueChange={setCurrentPositionType}>
                    <TabsList>
                      <TabsTrigger value="portfolio">Existing Portfolio</TabsTrigger>
                      <TabsTrigger value="networth">Net Worth Statement</TabsTrigger>
                    </TabsList>
                    <TabsContent value="portfolio" className="space-y-4">
                      {portfolios.length > 0 ? (
                        <Select value={selectedPortfolioId} onValueChange={setSelectedPortfolioId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a portfolio..." />
                          </SelectTrigger>
                          <SelectContent>
                            {portfolios.map(portfolio => (
                              <SelectItem key={portfolio.id} value={portfolio.id}>
                                {portfolio.account_name} - {portfolio.account_type?.toUpperCase()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-gray-500">No portfolios found for selected clients.</p>
                      )}
                    </TabsContent>
                    <TabsContent value="networth" className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="exclude-real-estate"
                          checked={excludeRealEstate}
                          onCheckedChange={setExcludeRealEstate}
                        />
                        <Label htmlFor="exclude-real-estate">
                          Exclude Real Estate Assets
                        </Label>
                      </div>
                      <p className="text-sm text-gray-600">
                        Uses capital assets from the most recent Net Worth Statement.
                      </p>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Target Portfolio Selection */}
                <div className="space-y-4">
                  <Label className="font-semibold">Target Portfolio</Label>
                  <Tabs value={targetPortfolioMode} onValueChange={setTargetPortfolioMode}>
                    <TabsList>
                      <TabsTrigger value="existing">Existing Suggestion</TabsTrigger>
                      <TabsTrigger value="create">Create New</TabsTrigger>
                      <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                    </TabsList>

                    <TabsContent value="existing" className="space-y-4">
                      {suggestedPortfolios.length > 0 ? (
                        <div className="space-y-3">
                          <Select value={selectedSuggestedPortfolioId} onValueChange={setSelectedSuggestedPortfolioId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a target portfolio..." />
                            </SelectTrigger>
                            <SelectContent>
                              {suggestedPortfolios.map(suggested => (
                                <SelectItem key={suggested.id} value={suggested.id}>
                                  {suggested.name} ({suggested.risk_level})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Portfolio Management Buttons */}
                          {selectedSuggestedPortfolioId && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const portfolio = suggestedPortfolios.find(p => p.id === selectedSuggestedPortfolioId);
                                  if (portfolio) handleEditPortfolio(portfolio);
                                }}
                                className="flex items-center gap-2"
                              >
                                <Edit className="w-4 h-4" />
                                Edit Portfolio
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const portfolio = suggestedPortfolios.find(p => p.id === selectedSuggestedPortfolioId);
                                  if (portfolio) handleDeletePortfolio(portfolio);
                                }}
                                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:border-red-300"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete Portfolio
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500">No suggested portfolios found. Create one in the "Create New" tab.</p>
                      )}
                    </TabsContent>

                    <TabsContent value="create" className="space-y-4">
                      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
                        <DialogTrigger asChild>
                          <Button onClick={() => {
                            setEditingPortfolio(null);
                            // Reset form fields when opening for creation
                            setNewPortfolioName('');
                            setNewPortfolioDescription('');
                            setNewPortfolioRiskLevel('');
                            setAssetCategoryTargets(UNIFIED_ASSET_TYPES.map(cat => ({ category_name: cat, target_percentage: 0 })));
                            setDetailedHoldings([]);
                          }}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create New Suggested Portfolio
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>
                              {editingPortfolio ? 'Edit Suggested Portfolio' : 'Create Suggested Portfolio'}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6 pt-4">
                             {/* Basic Info */}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div>
                                 <Label>Portfolio Name *</Label>
                                 <Input
                                   value={newPortfolioName}
                                   onChange={(e) => setNewPortfolioName(e.target.value)}
                                   placeholder="e.g., Retirement Growth Strategy"
                                 />
                               </div>
                               <div>
                                 <Label>Risk Level *</Label>
                                 <Select value={newPortfolioRiskLevel} onValueChange={setNewPortfolioRiskLevel}>
                                   <SelectTrigger>
                                     <SelectValue placeholder="Select risk level..." />
                                   </SelectTrigger>
                                   <SelectContent>
                                     <SelectItem value="conservative">Conservative</SelectItem>
                                     <SelectItem value="moderate">Moderate</SelectItem>
                                     <SelectItem value="aggressive">Aggressive</SelectItem>
                                     <SelectItem value="balanced">Balanced</SelectItem>
                                   </SelectContent>
                                 </Select>
                               </div>
                             </div>
                             <div>
                               <Label>Description</Label>
                               <Textarea
                                 value={newPortfolioDescription}
                                 onChange={(e) => setNewPortfolioDescription(e.target.value)}
                                 placeholder="Describe the investment strategy..."
                                 rows={3}
                               />
                             </div>

                             {/* Asset Category Targets */}
                             <div>
                               <div className="flex items-center justify-between mb-4">
                                 <h4 className="font-semibold">Step 1: Investment Asset Allocation</h4>
                                 <Badge variant={totalTargetPercentage === 100 ? "default" : "destructive"}>
                                   Total: {totalTargetPercentage.toFixed(1)}%
                                 </Badge>
                               </div>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {assetCategoryTargets.map(target => (
                                   <div key={target.category_name} className="flex items-center gap-3">
                                     <Label className="flex-1 text-sm">{target.category_name}</Label>
                                     <div className="flex items-center gap-1">
                                       <Input
                                         type="number"
                                         min="0"
                                         max="100"
                                         step="0.1"
                                         value={target.target_percentage}
                                         onChange={(e) => updateAssetCategoryTarget(
                                           target.category_name,
                                           parseFloat(e.target.value) || 0
                                         )}
                                         className="w-20"
                                       />
                                       <span className="text-sm">%</span>
                                     </div>
                                   </div>
                                 ))}
                               </div>
                             </div>
                             
                             <Separator />

                            {/* Detailed Holdings */}
                            <div>
                               <h4 className="font-semibold mb-4">Step 2: Detailed Holdings (Optional)</h4>
                               <div className="space-y-4">
                                {assetCategoryTargets.filter(t => t.target_percentage > 0).map(target => (
                                  <div key={target.category_name} className="p-4 border rounded-lg bg-slate-50/50">
                                    <div className="flex justify-between items-center mb-3">
                                      <h5 className="font-medium text-slate-800">{target.category_name} ({target.target_percentage.toFixed(1)}% of total)</h5>
                                      <Button size="sm" variant="outline" onClick={() => addDetailedHolding(target.category_name)}>
                                        <Plus className="w-3 h-3 mr-1.5" /> Add Holding
                                      </Button>
                                    </div>
                                    <div className="space-y-3">
                                      {detailedHoldings.filter(h => h.allocated_to_category === target.category_name).map(holding => (
                                        <div key={holding.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center p-3 border rounded bg-white">
                                          <div className="md:col-span-2 space-y-2">
                                            <Select
                                              value={holding.fund_id || ''}
                                              onValueChange={(val) => updateDetailedHolding(holding.id, 'fund_id', val)}
                                              disabled={!!holding.manual_fund_name}
                                            >
                                              <SelectTrigger><SelectValue placeholder="Select from Fund Library..." /></SelectTrigger>
                                              <SelectContent>
                                                {funds.map(fund => <SelectItem key={fund.id} value={fund.id}>{fund.name} ({fund.fund_code})</SelectItem>)}
                                              </SelectContent>
                                            </Select>
                                            <Input 
                                              placeholder="Or enter manual fund name"
                                              value={holding.manual_fund_name}
                                              onChange={(e) => updateDetailedHolding(holding.id, 'manual_fund_name', e.target.value)}
                                              disabled={!!holding.fund_id}
                                            />
                                          </div>
                                          <div className="flex items-center gap-2 justify-end">
                                            <Input
                                              type="number"
                                              min="0"
                                              max="100"
                                              step="0.1"
                                              value={holding.percentage_of_category}
                                              onChange={(e) => updateDetailedHolding(holding.id, 'percentage_of_category', parseFloat(e.target.value) || 0)}
                                              className="w-24"
                                              placeholder="% of category"
                                            />
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => removeDetailedHolding(holding.id)}>
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                               </div>
                            </div>


                             <div className="flex justify-end gap-3 pt-4 border-t">
                               <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                                 Cancel
                               </Button>
                               <Button onClick={handleCreateSuggestedPortfolio}>
                                 <Save className="w-4 h-4 mr-2" />
                                 {editingPortfolio ? 'Save Changes' : 'Create Portfolio'}
                               </Button>
                             </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TabsContent>

                    <TabsContent value="manual" className="space-y-4">
                      {renderManualAllocationMode()}
                    </TabsContent>
                  </Tabs>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Current Position Breakdown */}
        {renderCurrentPositionBreakdown()}

        {/* Comparison View */}
        {currentPosition && (targetPortfolioMode === 'manual' || (targetPortfolioMode === 'existing' && suggestedPosition)) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Portfolio Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={viewMode} onValueChange={setViewMode}>
                <TabsList className="mb-4">
                  <TabsTrigger value="asset_class" className="flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4" />
                    Asset Class View
                  </TabsTrigger>
                   <TabsTrigger value="detailed_assets" className="flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4" />
                    Detailed Asset Distribution
                  </TabsTrigger>
                  <TabsTrigger value="specific_funds" className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Specific Funds
                  </TabsTrigger>
                </TabsList>

                {/* Common comparison details for both views */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="font-semibold text-blue-600">Current Position</h4>
                    <p className="text-sm text-gray-600">{currentPosition.name}</p>
                    {currentPosition.totalValue && (
                      <p className="text-sm font-medium">
                        Total Value: ${currentPosition.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-600">Target Portfolio</h4>
                    <p className="text-sm text-gray-600">
                      {targetPortfolioMode === 'manual' ? 'Manual Entry' : suggestedPosition?.name}
                    </p>
                    {targetPortfolioMode !== 'manual' && suggestedPosition && (
                      <Badge variant="outline">{suggestedPosition.risk_level}</Badge>
                    )}
                  </div>
                </div>
                <Separator className="my-4" />

                <TabsContent value="asset_class" className="mt-0">
                  {renderComparisonChart()}
                </TabsContent>
                
                <TabsContent value="detailed_assets" className="mt-0">
                  {renderDetailedAssetDistributionChart()}
                </TabsContent>

                <TabsContent value="specific_funds" className="mt-0">
                  {renderFundComparison()}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Giuseppe AI Portfolio Analysis */}
        {currentPosition && (targetPortfolioMode === 'manual' || (targetPortfolioMode === 'existing' && suggestedPosition)) && (
          <GiuseppeAIOptimizer
            calculatorName="Portfolio Comparison"
            calculatorData={{
              currentPosition: {
                name: currentPosition.name || 'N/A',
                totalValue: currentPosition.totalValue || 0,
                type: currentPosition.type,
                breakdown: currentPosition.type === 'networth'
                  ? (() => {
                    const investmentTypeBreakdown = {};
                    let totalValue = 0;
                    (currentPosition.assets || []).forEach(asset => {
                      const investmentType = assetInvestmentTypes[asset.id];
                      if (investmentType) {
                        investmentTypeBreakdown[investmentType] = (investmentTypeBreakdown[investmentType] || 0) + (asset.asset_value || 0);
                        totalValue += (asset.asset_value || 0);
                      }
                    });
                    
                    const breakdownPercentages = {};
                    Object.entries(investmentTypeBreakdown).forEach(([type, value]) => {
                        breakdownPercentages[type] = totalValue > 0 ? (value / totalValue * 100).toFixed(1) + '%' : '0.0%';
                    });
                    return breakdownPercentages;
                  })()
                  : currentPosition.categoryBreakdown,
                holdings: currentPosition.type === 'networth'
                  ? (currentPosition.assets || []).map(asset => ({
                      name: asset.asset_name || 'Unnamed Asset',
                      value: asset.asset_value || 0,
                      allocatedTo: assetInvestmentTypes[asset.id] || 'Unallocated'
                    }))
                  : (currentPosition.fundHoldings || []).map(h => {
                      const fund = funds.find(f => f.id === h.fund_id);
                      return {
                        name: fund?.name || 'Unknown Fund',
                        percentage: h.allocation_percentage || 0
                      };
                    })
              },
              targetPosition: targetPortfolioMode === 'manual'
                ? {
                    type: 'Manual Entry',
                    allocation: (manualAssets || []).map(a => ({ name: a.name, type: a.type, percentage: a.percentage || 0 }))
                  }
                : {
                    name: suggestedPosition?.name || 'N/A',
                    riskLevel: suggestedPosition?.risk_level || 'N/A',
                    breakdown: suggestedPosition?.categoryBreakdown || {},
                    holdings: (suggestedPosition?.detailed_holdings || []).map(h => {
                        const fund = funds.find(f => f.id === h.fund_id);
                        return {
                          name: fund?.name || h.manual_fund_name || 'Manual Holding',
                          effectiveTotalPercentage: h.effective_total_percentage || 0
                        };
                      })
                  }
            }}
            buttonText="Analyze Portfolios with Giuseppe"
            loadingText="Giuseppe is analyzing your portfolios..."
            className="w-full mt-6"
          />
        )}

        {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Portfolio</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete "{portfolioToDelete?.name}"?</p>
            <p className="text-sm text-gray-600 mt-2">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeletePortfolio}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
