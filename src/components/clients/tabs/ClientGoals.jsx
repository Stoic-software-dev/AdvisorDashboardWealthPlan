
import React, { useState, useEffect } from "react";
import { FinancialGoal, CalculatorInstance, Portfolio } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Target } from "lucide-react";
import GoalForm from "../../goals/GoalForm";
import GoalCard from "../../goals/GoalCard";
import CalculatorViewerModal from "../../calculators/CalculatorViewerModal";
import PortfolioViewerModal from "../../portfolios/PortfolioViewerModal";

export default function ClientGoals({ client, allClients }) {
  const [goals, setGoals] = useState([]);
  const [calculatorInstances, setCalculatorInstances] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  const [showCalcViewer, setShowCalcViewer] = useState(false);
  const [calcToView, setCalcToView] = useState(null);
  const [showPortfolioViewer, setShowPortfolioViewer] = useState(false);
  const [portfolioToView, setPortfolioToView] = useState(null);
  const [showHouseholdItems, setShowHouseholdItems] = useState(false);

  useEffect(() => {
    if (client) {
      loadGoals();
      loadCalculatorInstances();
      loadPortfolios();
    }
  }, [client, showHouseholdItems]); // Added showHouseholdItems as a dependency

  const loadGoals = async () => {
    setIsLoading(true);
    try {
      let data;
      if (showHouseholdItems) {
        // Get household member IDs
        const householdIds = getHouseholdMemberIds(client, allClients);
        // Filter goals that include any household member
        const allGoals = await FinancialGoal.list(); // Fetch all goals to filter in memory
        data = allGoals.filter(goal => {
          const goalClientIds = goal.client_ids || (goal.client_id ? [goal.client_id] : []);
          return goalClientIds.some(id => householdIds.includes(id));
        });
      } else {
        // Original behavior - only goals directly linked to this client
        const allGoals = await FinancialGoal.list(); // Fetch all goals to filter in memory
        data = allGoals.filter(goal => {
          const goalClientIds = goal.client_ids || (goal.client_id ? [goal.client_id] : []);
          return goalClientIds.includes(client.id);
        });
      }
      setGoals(data);
    } catch (error) {
      console.error("Error loading goals:", error);
    }
    setIsLoading(false);
  };

  const loadCalculatorInstances = async () => {
    try {
      // Logic for loading calculator instances for a client (could be extended for household later if needed)
      const data = await CalculatorInstance.filter({ client_id: client.id });
      setCalculatorInstances(data);
    } catch (error) {
      console.error("Error loading calculator instances:", error);
    }
  };

  const loadPortfolios = async () => {
    try {
      // Logic for loading portfolios for a client (could be extended for household later if needed)
      const data = await Portfolio.filter({ client_id: client.id });
      setPortfolios(data);
    } catch (error) {
      console.error("Error loading portfolios:", error);
    }
  };

  const getHouseholdMemberIds = (currentClient, clients) => {
    if (!currentClient || !clients) return [currentClient.id];
    
    // Find household head (if currentClient is a member, find its primary; otherwise, currentClient is the head)
    const householdHeadId = currentClient.primary_client_id || currentClient.id;
    
    // Get all household member IDs (clients whose id is the head's id, or whose primary_client_id is the head's id)
    const householdMembers = clients.filter(c => 
      c.id === householdHeadId || c.primary_client_id === householdHeadId
    );
    
    return householdMembers.map(c => c.id);
  };

  const getClientNamesFromIds = (clientIds) => {
    if (!clientIds || !allClients) return '';
    return clientIds
      .map(id => {
        const client = allClients.find(c => c.id === id);
        return client ? `${client.first_name} ${client.last_name}` : 'Unknown';
      })
      .join(', ');
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setShowForm(true);
  };

  const handleDelete = async (goalId) => {
    try {
      await FinancialGoal.delete(goalId);
      loadGoals(); // Reload goals after deletion
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  };

  const handleSubmit = async (goalData) => {
    try {
      // Ensure client is included in client_ids if not already
      const clientIds = new Set(goalData.client_ids || []); // Use Set to avoid duplicates
      clientIds.add(client.id); // Add current client's ID

      const dataToSave = { ...goalData, client_ids: Array.from(clientIds) }; // Convert Set back to Array
      
      if (editingGoal) {
        await FinancialGoal.update(editingGoal.id, dataToSave);
      } else {
        await FinancialGoal.create(dataToSave);
      }
      setShowForm(false);
      setEditingGoal(null);
      loadGoals();
      // No need to reload calculator instances on goal submit if the link is by ID,
      // as the instances themselves are not changed by goal creation/update,
      // only the goal's reference to an instance.
    } catch (error) {
      console.error("Error saving goal:", error);
    }
  };

  const getCalculatorInstancesForGoal = (goal) => {
    if (!goal.linked_calculator_instance_ids || goal.linked_calculator_instance_ids.length === 0) return [];
    return calculatorInstances.filter(calc => goal.linked_calculator_instance_ids.includes(calc.id));
  };

  const getPortfoliosForGoal = (goal) => {
    if (!goal.linked_portfolio_ids || goal.linked_portfolio_ids.length === 0) return [];
    return portfolios.filter(portfolio => goal.linked_portfolio_ids.includes(portfolio.id));
  };

  const handleViewCalculator = (calcId) => {
    const calc = calculatorInstances.find(c => c.id === calcId);
    if (calc) {
      setCalcToView(calc);
      setShowCalcViewer(true);
    }
  };

  const handleViewPortfolio = (portfolioId) => {
    const portfolio = portfolios.find(p => p.id === portfolioId);
    if (portfolio) {
      setPortfolioToView(portfolio);
      setShowPortfolioViewer(true);
    }
  };

  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-green-600" />
          Goals for {client.first_name} {client.last_name}
        </CardTitle>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-household"
              checked={showHouseholdItems}
              onChange={(e) => setShowHouseholdItems(e.target.checked)}
              className="rounded border-slate-300"
            />
            <label htmlFor="show-household" className="text-sm text-slate-600">
              Show household goals
            </label>
          </div>
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Goal
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading goals...</p>
        ) : goals.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Target className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No goals found{showHouseholdItems ? ' for this household' : ' for this client'}.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => {
              const goalClientIds = goal.client_ids || (goal.client_id ? [goal.client_id] : []);
              const clientNames = getClientNamesFromIds(goalClientIds);
              
              return (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  clientName={clientNames} // Pass the comma-separated client names
                  onClick={() => handleEdit(goal)}
                  onEdit={() => handleEdit(goal)}
                  onDelete={handleDelete}
                  isSelected={false}
                  calculatorInstances={getCalculatorInstancesForGoal(goal)}
                  portfolios={getPortfoliosForGoal(goal)}
                  onCalculatorClick={handleViewCalculator}
                  onPortfolioClick={handleViewPortfolio}
                />
              );
            })}
          </div>
        )}
      </CardContent>
      {showForm && (
        <GoalForm
          goal={editingGoal}
          clients={allClients || [client]} 
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingGoal(null);
          }}
          preselectedClientId={client.id}
        />
      )}
      {calcToView && (
        <CalculatorViewerModal
          calculatorInstance={calcToView}
          isOpen={showCalcViewer}
          onClose={() => setShowCalcViewer(false)}
          clients={allClients}
          allGoals={goals}
          allPortfolios={portfolios}
        />
      )}
      {portfolioToView && (
        <PortfolioViewerModal
          portfolio={portfolioToView}
          clientName={`${client.first_name} ${client.last_name}`}
          isOpen={showPortfolioViewer}
          onClose={() => setShowPortfolioViewer(false)}
        />
      )}
    </Card>
  );
}
