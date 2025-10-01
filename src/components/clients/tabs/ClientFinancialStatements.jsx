
import React, { useState, useEffect, useCallback } from "react";
import { NetWorthStatement, Asset, Liability } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Scale, TrendingUp, PieChart as PieChartIcon, MoreHorizontal, Trash2, Copy, Loader2, Edit, Eye, Users } from "lucide-react";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import CreateStatementModal from "../../financial_statements/CreateStatementModal";
import AssetsTable from "../../financial_statements/AssetsTable";
import LiabilitiesTable from "../../financial_statements/LiabilitiesTable";
import AddAssetModal from "../../financial_statements/AddAssetModal";
import AddLiabilityModal from "../../financial_statements/AddLiabilityModal";
import DeleteStatementDialog from "../../financial_statements/DeleteStatementDialog";
import GiuseppeAIOptimizer from '@/components/shared/GiuseppeAIOptimizer';

const DETAILED_PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF'];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + Math.sin(-midAngle * RADIAN) * radius;

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold pointer-events-none">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};


export default function ClientFinancialStatements({ client, allClients }) {
  const [statements, setStatements] = useState([]);
  const [assets, setAssets] = useState({});
  const [liabilities, setLiabilities] = useState({});
  const [progressionData, setProgressionData] = useState([]);

  const [selectedStatement, setSelectedStatement] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showLiabilityModal, setShowLiabilityModal] = useState(false);

  const [editingAsset, setEditingAsset] = useState(null);
  const [editingLiability, setEditingLiability] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [householdClients, setHouseholdClients] = useState([]);

  // New state for delete functionality
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [statementToDelete, setStatementToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // New state for editing statement
  const [editingStatement, setEditingStatement] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const loadFinancialData = useCallback(async () => {
    if (!client?.id) return; // Ensure client ID is available
    setIsLoading(true);
    try {
      let statementData;
      try {
        // 1. Get all statements for the client, sorted by date for the progression chart (ascending)
        // Attempt to use $in filter for client_ids array field
        statementData = await NetWorthStatement.filter({
          client_ids: { $in: [client.id] }
        });
      } catch (sdkError) {
        // Fallback if $in filter is not supported or fails (e.g., older SDK versions or backend config)
        console.warn("SDK filter with $in failed, falling back to client-side filtering:", sdkError);
        const allStatements = await NetWorthStatement.list(); // Fetch all statements
        statementData = allStatements.filter(statement =>
          statement.client_ids && Array.isArray(statement.client_ids) && statement.client_ids.includes(client.id)
        );
      }

      const validStatements = (Array.isArray(statementData) ? statementData : [])
        .sort((a, b) => new Date(a.statement_date) - new Date(b.statement_date)); // Sort ascending for progression data

      // For display in the selector, we want newest first, so we reverse a copy
      setStatements([...validStatements].reverse());

      // 2. Fetch assets and liabilities for ALL statements to build progression data
      const allDetails = await Promise.all(
        validStatements.map(async (stmt) => {
          const [stmtAssets, stmtLiabilities] = await Promise.all([
            Asset.filter({ statement_id: stmt.id }),
            Liability.filter({ statement_id: stmt.id })
          ]);
          const totalAssets = (stmtAssets || []).reduce((sum, a) => sum + (a.asset_value || 0), 0);
          const totalLiabilities = (stmtLiabilities || []).reduce((sum, l) => sum + (l.liability_value || 0), 0);

          return {
            statementId: stmt.id,
            statementDate: stmt.statement_date,
            assets: stmtAssets || [],
            liabilities: stmtLiabilities || [],
            netWorth: totalAssets - totalLiabilities
          };
        })
      );

      // 3. Populate state for individual statement details (assets/liabilities by statement ID)
      const assetsByStatement = {};
      const liabilitiesByStatement = {};
      allDetails.forEach(detail => {
        assetsByStatement[detail.statementId] = detail.assets;
        liabilitiesByStatement[detail.statementId] = detail.liabilities;
      });
      setAssets(assetsByStatement);
      setLiabilities(liabilitiesByStatement);

      // 4. Create progression data for the line chart
      const progression = allDetails.map(detail => ({
        date: format(new Date(detail.statementDate), "MMM yyyy"),
        "Net Worth": detail.netWorth,
      }));
      setProgressionData(progression);

      // 5. Set the initially selected statement to the most recent one (from the ascending sorted list)
      if (validStatements.length > 0) {
        setSelectedStatement([...validStatements].reverse()[0]);
      } else {
        setSelectedStatement(null);
      }
    } catch (error) {
      console.error("Error loading financial data:", error);
      setStatements([]);
      setProgressionData([]);
      setAssets({});
      setLiabilities({});
      setSelectedStatement(null);
    }
    setIsLoading(false);
  }, [client?.id]); // Added client?.id as a dependency

  useEffect(() => {
    if (client) {
      loadFinancialData();

      // Determine household members when client or allClients list changes
      if (allClients && allClients.length > 0) {
        const primaryId = client.primary_client_id || client.id;
        const primary = allClients.find(c => c.id === primaryId);

        if (primary) {
          const members = allClients.filter(c => c.id === primaryId || c.primary_client_id === primaryId);
          setHouseholdClients(members);
        } else {
          setHouseholdClients([client]); // Fallback to just the current client
        }
      } else {
        setHouseholdClients([client]);
      }
    }
  }, [client, allClients, loadFinancialData]); // Added loadFinancialData to dependencies

  const getJointClientNames = (statement) => {
    if (!statement.client_ids || statement.client_ids.length <= 1) {
      return [];
    }

    // Get all clients associated with this statement, excluding the current client
    const jointClientIds = statement.client_ids.filter(id => id !== client.id);
    return jointClientIds.map(clientId => {
      const jointClient = allClients.find(c => c.id === clientId);
      return jointClient ? `${jointClient.first_name} ${jointClient.last_name}` : 'Unknown Client';
    });
  };

  const refreshStatementDetails = async (statementId) => {
    // This function is for refreshing a single statement's assets/liabilities,
    // then triggering a full reload of all financial data to update charts.
    try {
      const [assetData, liabilityData] = await Promise.all([
        Asset.filter({ statement_id: statementId }),
        Liability.filter({ statement_id: statementId })
      ]);
      setAssets(prev => ({ ...prev, [statementId]: Array.isArray(assetData) ? assetData : [] }));
      setLiabilities(prev => ({ ...prev, [statementId]: Array.isArray(liabilityData) ? liabilityData : [] }));
      // Reload all data to update progression chart with latest values
      await loadFinancialData();
    } catch (error) {
      console.error("Error refreshing statement details:", error);
    }
  };


  const handleCreateStatement = async (statementData) => {
    try {
      await NetWorthStatement.create(statementData);
      await loadFinancialData(); // Reload all data and select the newest (which should be the one just created)
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating statement:", error);
    }
  };

  const handleEditStatement = async (statementData) => {
    try {
      await NetWorthStatement.update(editingStatement.id, statementData);
      await loadFinancialData();
      setShowEditModal(false);
      setEditingStatement(null);
    } catch (error) {
      console.error("Error updating statement:", error);
    }
  };

  const handleSaveAsset = async (data) => {
    try {
      if (editingAsset) {
        await Asset.update(editingAsset.id, data);
      } else {
        await Asset.create({ ...data, statement_id: selectedStatement.id });
      }
      await refreshStatementDetails(selectedStatement.id); // Refresh data
      setShowAssetModal(false);
      setEditingAsset(null);
    } catch (error) {
      console.error("Error saving asset:", error);
    }
  };

  const handleSaveLiability = async (data) => {
    try {
      if (editingLiability) {
        await Liability.update(editingLiability.id, data);
      } else {
        await Liability.create({ ...data, statement_id: selectedStatement.id });
      }
      await refreshStatementDetails(selectedStatement.id); // Refresh data
      setShowLiabilityModal(false);
      setEditingLiability(null);
    } catch (error) {
      console.error("Error saving liability:", error);
    }
  };

  const handleDeleteAsset = async (assetId) => {
    if(window.confirm("Are you sure you want to delete this asset?")) {
      await Asset.delete(assetId);
      await refreshStatementDetails(selectedStatement.id);
    }
  };

  const handleDeleteLiability = async (liabilityId) => {
    if(window.confirm("Are you sure you want to delete this liability?")) {
      await Liability.delete(liabilityId);
      await refreshStatementDetails(selectedStatement.id);
    }
  };

  const handleDeleteStatement = (statement) => {
    setStatementToDelete(statement);
    setShowDeleteDialog(true);
  };

  const handleConfirmDeleteStatement = async () => {
    if (!statementToDelete) return;

    setIsDeleting(true);
    try {
      // First delete all assets associated with this statement
      const statementAssets = assets[statementToDelete.id] || [];
      const assetDeletePromises = statementAssets.map(asset => Asset.delete(asset.id));
      await Promise.all(assetDeletePromises);

      // Then delete all liabilities associated with this statement
      const statementLiabilities = liabilities[statementToDelete.id] || [];
      const liabilityDeletePromises = statementLiabilities.map(liability => Liability.delete(liability.id));
      await Promise.all(liabilityDeletePromises);

      // Finally delete the statement itself
      await NetWorthStatement.delete(statementToDelete.id);

      // Reload all data
      await loadFinancialData();

      setShowDeleteDialog(false);
      setStatementToDelete(null);
    } catch (error) {
      console.error("Error deleting statement:", error);
      alert("Failed to delete statement. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicateStatement = async (statementToDuplicate) => {
    setIsDuplicating(true);
    try {
      // 1. Create new statement with a new name and date
      const newStatement = await NetWorthStatement.create({
        name: `Copy of ${statementToDuplicate.name}`,
        statement_date: new Date().toISOString().split('T')[0],
        client_ids: Array.isArray(statementToDuplicate.client_ids) ? [...statementToDuplicate.client_ids] : [client.id], // Ensure client_ids is an array
        status: 'draft',
        notes: statementToDuplicate.notes || ''
      });

      // 2. Fetch original assets and liabilities
      const [originalAssets, originalLiabilities] = await Promise.all([
        Asset.filter({ statement_id: statementToDuplicate.id }),
        Liability.filter({ statement_id: statementToDuplicate.id })
      ]);

      // 3. Create new assets linked to the new statement
      if (originalAssets && originalAssets.length > 0) {
        const newAssetsData = originalAssets.map(({ id, created_date, updated_date, statement_id, ...rest }) => ({
          ...rest,
          statement_id: newStatement.id
        }));
        await Promise.all(newAssetsData.map(asset => Asset.create(asset)));
      }

      // 4. Create new liabilities linked to the new statement
      if (originalLiabilities && originalLiabilities.length > 0) {
        const newLiabilitiesData = originalLiabilities.map(({ id, created_date, updated_date, statement_id, ...rest }) => ({
          ...rest,
          statement_id: newStatement.id
        }));
        await Promise.all(newLiabilitiesData.map(liability => Liability.create(liability)));
      }

      // 5. Reload all data, which will auto-select the new statement
      await loadFinancialData();

    } catch (error) {
      console.error("Error duplicating statement:", error);
      alert("Failed to duplicate statement. Please try again.");
    } finally {
      setIsDuplicating(false);
    }
  };

  const currentAssets = selectedStatement ? (assets[selectedStatement.id] || []) : [];
  const currentLiabilities = selectedStatement ? (liabilities[selectedStatement.id] || []) : [];

  const totalAssets = currentAssets.reduce((sum, asset) => sum + (asset.asset_value || 0), 0);
  const totalLiabilities = currentLiabilities.reduce((sum, liab) => sum + (liab.liability_value || 0), 0);
  const netWorth = totalAssets - totalLiabilities;

  const assetPieData = currentAssets
    .map(asset => ({ name: asset.asset_name, value: asset.asset_value || 0 }))
    .filter(d => d.value > 0);

  const liabilityPieData = currentLiabilities
    .map(liab => ({ name: liab.liability_name, value: liab.liability_value || 0 }))
    .filter(d => d.value > 0);


  return (
    <div className="space-y-6">

      {/* Net Worth Progression Chart */}
      {progressionData.length > 1 && (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Net Worth Progression
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={progressionData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="Net Worth" stroke="#16a34a" strokeWidth={2} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statement Selector */}
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-green-600" />
            Net Worth Statements
          </CardTitle>
          <Button onClick={() => setShowCreateModal(true)} size="sm" disabled={isDuplicating}>
            <Plus className="w-4 h-4 mr-2" />
            Create Statement
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {isLoading ? <p>Loading statements...</p> : statements.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
                <Scale className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No statements found for this client.</p>
                <p className="text-sm mt-2">Click "Create Statement" to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statements.map(stmt => (
                <Card
                  key={stmt.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedStatement?.id === stmt.id
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedStatement(stmt)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-slate-900 mb-1">
                          {stmt.name}
                        </CardTitle>
                        <CardDescription className="text-slate-600 mb-2">
                          {format(new Date(stmt.statement_date), "MMMM d, yyyy")}
                        </CardDescription>

                        {/* Joint Statement Indicator with Client Names */}
                        {stmt.client_ids && stmt.client_ids.length > 1 && (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-sm text-blue-600">
                              <Users className="w-4 h-4" />
                              <span className="font-medium">Joint Statement ({stmt.client_ids.length} clients)</span>
                            </div>
                            {getJointClientNames(stmt).length > 0 && (
                              <div className="text-sm text-slate-600 ml-6">
                                with {getJointClientNames(stmt).join(', ')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 ml-2" disabled={isDuplicating}>
                            {isDuplicating && selectedStatement?.id === stmt.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <MoreHorizontal className="w-4 h-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicateStatement(stmt); }}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate Statement
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingStatement(stmt); setShowEditModal(true); }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Statement
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteStatement(stmt); }}>
                            <Trash2 className="w-4 h-4 mr-2 text-red-600" />
                            <span className="text-red-600">Delete Statement</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStatement && (
        <div className="space-y-6">
          {/* Statement Summary and Pie Chart */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
             <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-green-600" />
                {selectedStatement.name} - Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid md:grid-cols-3 gap-6 items-center">
              {/* Assets Pie Chart */}
              <div className="flex flex-col items-center">
                <h3 className="font-semibold text-lg text-green-600 mb-2">Assets Breakdown</h3>
                <div className="h-64 w-full">
                  {assetPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={assetPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderCustomizedLabel}
                          outerRadius={100}
                          dataKey="value"
                        >
                          {assetPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={DETAILED_PIE_COLORS[index % DETAILED_PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`$${value.toLocaleString()}`, name]} />
                        <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={8} wrapperStyle={{fontSize: "12px", lineHeight: "1.5"}}/>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500">No assets to display.</div>
                  )}
                </div>
              </div>

              {/* Financial Numbers */}
              <div className="space-y-4 border-x-0 md:border-x md:px-6">
                  <div className="flex justify-between items-center">
                      <p className="text-sm text-slate-500 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span>Total Assets</p>
                      <p className="text-lg font-semibold text-green-600">${totalAssets.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center">
                      <p className="text-sm text-slate-500 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span>Total Liabilities</p>
                      <p className="text-lg font-semibold text-red-600">${totalLiabilities.toLocaleString()}</p>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                      <p className="text-base font-semibold text-slate-800">Total Net Worth</p>
                      <p className="text-2xl font-bold text-slate-900">${netWorth.toLocaleString()}</p>
                  </div>
              </div>

              {/* Liabilities Pie Chart */}
              <div className="flex flex-col items-center">
                <h3 className="font-semibold text-lg text-red-600 mb-2">Liabilities Breakdown</h3>
                <div className="h-64 w-full">
                  {liabilityPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={liabilityPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderCustomizedLabel}
                          outerRadius={100}
                          dataKey="value"
                        >
                          {liabilityPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={DETAILED_PIE_COLORS[index % DETAILED_PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`$${value.toLocaleString()}`, name]} />
                        <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={8} wrapperStyle={{fontSize: "12px", lineHeight: "1.5"}}/>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500">No liabilities to display.</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <AssetsTable
            assets={currentAssets}
            householdClients={householdClients}
            onAdd={() => { setEditingAsset(null); setShowAssetModal(true); }}
            onEdit={(asset) => { setEditingAsset(asset); setShowAssetModal(true); }}
            onDelete={handleDeleteAsset}
          />

          <LiabilitiesTable
            liabilities={currentLiabilities}
            householdClients={householdClients}
            onAdd={() => { setEditingLiability(null); setShowLiabilityModal(true); }}
            onEdit={(liability) => { setEditingLiability(liability); setShowLiabilityModal(true); }}
            onDelete={handleDeleteLiability}
          />

          <div className="mt-6">
            <GiuseppeAIOptimizer
              title="Net Worth Optimizer"
              description="Analyze this net worth statement to identify opportunities for improvement, such as debt consolidation, asset reallocation, or savings strategies."
              contextData={{
                statement: selectedStatement,
                assets: currentAssets,
                liabilities: currentLiabilities,
                summary: {
                  totalAssets,
                  totalLiabilities,
                  netWorth,
                }
              }}
            />
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateStatementModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateStatement}
          clients={allClients}
          preselectedClientId={client.id}
          isEditing={false}
        />
      )}

      {showEditModal && (
        <CreateStatementModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingStatement(null);
          }}
          onSubmit={handleEditStatement}
          clients={allClients}
          preselectedClientId={client.id}
          isEditing={true}
          statement={editingStatement}
        />
      )}

      {showAssetModal && selectedStatement && (
        <AddAssetModal
          isOpen={showAssetModal}
          onClose={() => { setShowAssetModal(false); setEditingAsset(null); }}
          onSubmit={handleSaveAsset}
          asset={editingAsset}
          householdClients={householdClients}
        />
      )}

      {showLiabilityModal && selectedStatement && (
        <AddLiabilityModal
          isOpen={showLiabilityModal}
          onClose={() => { setShowLiabilityModal(false); setEditingLiability(null); }}
          onSubmit={handleSaveLiability}
          liability={editingLiability}
          householdClients={householdClients}
        />
      )}

      <DeleteStatementDialog
        statement={statementToDelete}
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setStatementToDelete(null);
        }}
        onConfirm={handleConfirmDeleteStatement}
        isDeleting={isDeleting}
      />
    </div>
  );
}
