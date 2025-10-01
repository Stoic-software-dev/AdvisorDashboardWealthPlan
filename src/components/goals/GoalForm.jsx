import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X, Loader2, DollarSign, Target, Calendar } from "lucide-react";
import MultiClientSelector from '../shared/MultiClientSelector';
import { Client, CalculatorInstance, Portfolio } from "@/api/entities";

const goalTypes = {
  retirement: 'Retirement',
  education: 'Education',
  home_purchase: 'Home Purchase',
  emergency_fund: 'Emergency Fund',
  vacation: 'Vacation',
  major_purchase: 'Major Purchase',
  debt_repayment: 'Debt Repayment',
  other: 'Other'
};

const calculatorTypes = {
  capital_assets: 'Capital Assets',
  mortgage: 'Mortgage',
  fixed_income: 'Fixed Income', 
  real_estate: 'Real Estate',
  insurance_needs: 'Insurance Needs Analysis',
  main_view: 'Main View',
  tax_layering: 'Tax Layering',
  cap_rate: 'Cap Rate',
  cost_benefit: 'Cost Benefit Analysis',
  lifetime_tax_planner: 'Lifetime Tax Planner',
  long_term_cash_flow: 'Long Term Cash Flow',
  cpp_oas_breakeven: 'CPP & OAS Breakeven'
};

export default function GoalForm({ goal: initialGoal, clients, onCancel, onSubmit }) {
  const [formData, setFormData] = useState({
    client_ids: initialGoal?.client_ids || (clients.length === 1 ? [clients[0].id] : []),
    goal_name: initialGoal?.goal_name || "",
    description: initialGoal?.description || "",
    goal_type: initialGoal?.goal_type || "",
    target_amount: initialGoal?.target_amount || "",
    current_amount: initialGoal?.current_amount || "",
    monthly_contribution: initialGoal?.monthly_contribution || "",
    linked_calculator_instance_ids: initialGoal?.linked_calculator_instance_ids || [],
    linked_portfolio_ids: initialGoal?.linked_portfolio_ids || [],
  });
  
  const [calculators, setCalculators] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [isLoadingCalculators, setIsLoadingCalculators] = useState(false);
  const [isLoadingPortfolios, setIsLoadingPortfolios] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (formData.client_ids && formData.client_ids.length > 0) {
        setIsLoadingCalculators(true);
        setIsLoadingPortfolios(true);
        try {
          const [allCalculators, allPortfolios] = await Promise.all([
            CalculatorInstance.list(),
            Portfolio.list()
          ]);
          
          // Filter calculators that are associated with any of the selected clients
          const clientCalculators = allCalculators.filter(calc =>
            (calc.client_ids || []).some(id => formData.client_ids.includes(id))
          );
          setCalculators(clientCalculators);

          // Filter portfolios that are associated with any of the selected clients
          const clientPortfolios = allPortfolios.filter(portfolio =>
            (portfolio.client_ids || (portfolio.client_id ? [portfolio.client_id] : [])).some(id => formData.client_ids.includes(id))
          );
          setPortfolios(clientPortfolios);
        } catch (error) {
          console.error("Failed to load calculators and portfolios:", error);
          setCalculators([]);
          setPortfolios([]);
        } finally {
          setIsLoadingCalculators(false);
          setIsLoadingPortfolios(false);
        }
      } else {
        setCalculators([]);
        setPortfolios([]);
      }
    };
    fetchData();
  }, [formData.client_ids]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleClientSelectionChange = (selectedIds) => {
    setFormData(prev => ({
      ...prev,
      client_ids: selectedIds,
      // Clear linked items if clients change
      linked_calculator_instance_ids: [],
      linked_portfolio_ids: []
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    const dataToSubmit = {
      ...formData,
      target_amount: formData.target_amount ? parseFloat(formData.target_amount) : null,
      current_amount: formData.current_amount ? parseFloat(formData.current_amount) : null,
      monthly_contribution: formData.monthly_contribution ? parseFloat(formData.monthly_contribution) : null,
    };
    
    await onSubmit(dataToSubmit);
    setIsSaving(false);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600" />
            {initialGoal ? "Edit Financial Goal" : "Create New Financial Goal"}
          </DialogTitle>
          <DialogDescription>
            Define a financial goal for your client(s) to track progress and create projections.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          
          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="clients">Associated Clients *</Label>
            <MultiClientSelector
              clients={clients}
              selectedClientIds={formData.client_ids}
              onSelectionChange={handleClientSelectionChange}
              placeholder="Select clients for this goal"
            />
          </div>

          {/* Goal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goal_name">Goal Name *</Label>
              <Input
                id="goal_name"
                value={formData.goal_name}
                onChange={(e) => handleChange("goal_name", e.target.value)}
                placeholder="e.g., Retirement Planning"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal_type">Goal Type</Label>
              <Select
                value={formData.goal_type}
                onValueChange={(value) => handleChange("goal_type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select goal type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(goalTypes).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Financial Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_amount">Target Amount ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="target_amount"
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.target_amount}
                  onChange={(e) => handleChange("target_amount", e.target.value)}
                  className="pl-10"
                  placeholder="1000000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_amount">Current Amount ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="current_amount"
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.current_amount}
                  onChange={(e) => handleChange("current_amount", e.target.value)}
                  className="pl-10"
                  placeholder="250000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly_contribution">Monthly Contribution ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="monthly_contribution"
                  type="number"
                  min="0"
                  step="100"
                  value={formData.monthly_contribution}
                  onChange={(e) => handleChange("monthly_contribution", e.target.value)}
                  className="pl-10"
                  placeholder="2500"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
              placeholder="Describe this financial goal and any specific details..."
            />
          </div>

          {/* Linked Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Linked Calculator */}
            <div className="space-y-2">
              <Label htmlFor="linked_calculator">Linked Calculator (Optional)</Label>
              {isLoadingCalculators ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading calculators...
                </div>
              ) : (
                <Select
                  value={formData.linked_calculator_instance_ids[0] || ""}
                  onValueChange={(value) => 
                    handleChange("linked_calculator_instance_ids", value ? [value] : [])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No calculator selected" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>No calculator selected</SelectItem>
                    {calculators.map((calc) => (
                      <SelectItem key={calc.id} value={calc.id}>
                        {calc.name} ({calculatorTypes[calc.calculator_type] || calc.calculator_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {calculators.length === 0 && !isLoadingCalculators && formData.client_ids.length > 0 && (
                <p className="text-sm text-gray-500">No calculators found for selected client(s)</p>
              )}
            </div>

            {/* Linked Portfolio */}
            <div className="space-y-2">
              <Label htmlFor="linked_portfolio">Linked Portfolio (Optional)</Label>
              {isLoadingPortfolios ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading portfolios...
                </div>
              ) : (
                <Select
                  value={formData.linked_portfolio_ids[0] || ""}
                  onValueChange={(value) => 
                    handleChange("linked_portfolio_ids", value ? [value] : [])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No portfolio selected" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>No portfolio selected</SelectItem>
                    {portfolios.map((portfolio) => (
                      <SelectItem key={portfolio.id} value={portfolio.id}>
                        {portfolio.account_name} ({portfolio.account_type?.toUpperCase()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {portfolios.length === 0 && !isLoadingPortfolios && formData.client_ids.length > 0 && (
                <p className="text-sm text-gray-500">No portfolios found for selected client(s)</p>
              )}
            </div>
          </div>

        </form>
        <DialogFooter className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {initialGoal ? "Update Goal" : "Create Goal"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}