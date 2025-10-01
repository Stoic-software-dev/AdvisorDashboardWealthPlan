
import React, { Suspense, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Loader2, Edit, Calendar, Calculator as CalculatorIcon, Users, ExternalLink, Clock } from "lucide-react"; // Combined existing and new lucide-react imports
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge"; // New import from outline
import { format } from "date-fns"; // New import from outline
import { CalculatorInstance } from '@/api/entities'; // Fixed import path as per outline
import { createPageUrl } from '@/utils'; // New import from outline
import { Link } from 'react-router-dom'; // New import from outline


// Lazy load calculators for better performance
const CapitalAssetsCalculator = React.lazy(() => import('./CapitalAssetsCalculator'));
const MortgageCalculator = React.lazy(() => import('./MortgageCalculator'));
// Add other lazy loaded calculators here if needed, following the pattern
const FixedIncomeCalculator = React.lazy(() => import('./FixedIncomeCalculator'));
const RealEstateCalculator = React.lazy(() => import('./RealEstateCalculator'));
const InsuranceNeedsCalculator = React.lazy(() => import('./InsuranceNeedsCalculator'));
const MainViewCalculator = React.lazy(() => import('./MainViewCalculator'));
const TaxLayeringCalculator = React.lazy(() => import('./TaxLayeringCalculator'));
const CapRateCalculator = React.lazy(() => import('./CapRateCalculator'));
const CostBenefitCalculator = React.lazy(() => import('./CostBenefitCalculator'));
const LifetimeTaxPlannerCalculator = React.lazy(() => import('./LifetimeTaxPlannerCalculator'));
const LongTermCashFlowCalculator = React.lazy(() => import('./LongTermCashFlowCalculator'));
const CppOasBreakevenCalculator = React.lazy(() => import('./CppOasBreakevenCalculator'));


export default function CalculatorViewerModal({
  calculatorInstance,
  isOpen,
  onClose,
  clients,
  allGoals,
  allPortfolios
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    // 'name' field removed as per "Remove Scenario Name field" instruction
    description: '',
    calculator_type: ''
  });

  useEffect(() => {
    if (calculatorInstance) {
      setEditFormData({
        // 'name' initialization removed as per instruction
        description: calculatorInstance.description || '',
        calculator_type: calculatorInstance.calculator_type || ''
      });
    }
    // When the modal closes or calculatorInstance changes, reset editing state
    if (!isOpen || !calculatorInstance) {
      setIsEditing(false);
    }
  }, [calculatorInstance, isOpen]); // Added isOpen to dependency array to reset editing

  const handleSaveEdit = async () => {
    try {
      // Ensure calculatorInstance.id exists before attempting to update
      if (!calculatorInstance?.id) {
        console.error('Calculator instance ID is missing, cannot update.');
        return;
      }
      await CalculatorInstance.update(calculatorInstance.id, {
        // 'name' field removed from update payload as per instruction
        description: editFormData.description,
        calculator_type: editFormData.calculator_type
      });

      setIsEditing(false);
      // The parent component should handle refreshing the data after a successful update.
      // Calling onClose() here will close the modal and typically trigger a data refresh.
      onClose();
    } catch (error) {
      console.error('Error updating calculator instance:', error);
      // Optionally, add user feedback for the error
    }
  };

  // If no calculator instance is provided, render nothing.
  if (!calculatorInstance) return null;

  const renderCalculator = () => {
    const props = {
      initialState: calculatorInstance.state_data,
      isViewer: true, // This component is primarily for viewing, fields are disabled.
      clients: clients,
      goals: allGoals,
      portfolios: allPortfolios
    };

    switch (calculatorInstance.calculator_type) {
      case 'capital_assets':
        return <CapitalAssetsCalculator {...props} />;
      case 'mortgage':
        return <MortgageCalculator {...props} />;
      case 'fixed_income':
        return <FixedIncomeCalculator {...props} />;
      case 'real_estate':
        return <RealEstateCalculator {...props} />;
      case 'insurance_needs':
        return <InsuranceNeedsCalculator {...props} />;
      case 'main_view':
        return <MainViewCalculator {...props} />;
      case 'tax_layering':
        return <TaxLayeringCalculator {...props} />;
      case 'cap_rate':
        return <CapRateCalculator {...props} />;
      case 'cost_benefit':
        return <CostBenefitCalculator {...props} />;
      case 'lifetime_tax_planner':
        return <LifetimeTaxPlannerCalculator {...props} />;
      case 'long_term_cash_flow':
        return <LongTermCashFlowCalculator {...props} />;
      case 'cpp_oas_breakeven':
        return <CppOasBreakevenCalculator {...props} />;
      default:
        return <p>Unknown calculator type: {calculatorInstance.calculator_type}</p>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Updated className for DialogContent as per outline */}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {/* DialogTitle now dynamically displays "Edit Calculator" or the instance name */}
          <DialogTitle className="flex items-center justify-between">
            {isEditing ? "Edit Calculator Details" : `View Calculator: ${calculatorInstance.name}`}
            <div className="flex items-center gap-2">
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </DialogTitle>
          {/* DialogDescription is shown only in view mode */}
          {!isEditing && (
            <DialogDescription>
              Viewing a saved calculator instance. Fields are disabled.
            </DialogDescription>
          )}
        </DialogHeader>

        {isEditing ? (
          <div className="space-y-4 py-4"> {/* Added py-4 for top/bottom padding in edit form */}
            {/* The 'Calculator Name' (Scenario Name) field has been removed as per the instructions. */}

            <div>
              <Label htmlFor="calculator-type">Calculator Type</Label>
              <Select
                value={editFormData.calculator_type}
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, calculator_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select calculator type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="capital_assets">Capital Assets</SelectItem>
                  <SelectItem value="mortgage">Mortgage</SelectItem>
                  <SelectItem value="fixed_income">Fixed Income</SelectItem>
                  <SelectItem value="real_estate">Real Estate</SelectItem>
                  <SelectItem value="insurance_needs">Insurance Needs</SelectItem>
                  <SelectItem value="main_view">Main View</SelectItem>
                  <SelectItem value="tax_layering">Tax Layering</SelectItem>
                  <SelectItem value="cap_rate">Cap Rate</SelectItem>
                  <SelectItem value="cost_benefit">Cost Benefit</SelectItem>
                  <SelectItem value="lifetime_tax_planner">Lifetime Tax Planner</SelectItem>
                  <SelectItem value="long_term_cash_flow">Long Term Cash Flow</SelectItem>
                  <SelectItem value="cpp_oas_breakeven">CPP/OAS Breakeven</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="calculator-description">Description (Optional)</Label>
              <Textarea
                id="calculator-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter description"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t"> {/* Added pt-4 border-t for footer consistency */}
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Update Calculator
              </Button>
            </div>
          </div>
        ) : (
          // View mode content
          <>
            <div className="py-4 flex-grow overflow-y-auto">
              <Suspense fallback={
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="mt-4">Loading Calculator...</p>
                </div>
              }>
                {renderCalculator()}
              </Suspense>
            </div>
            <div className="flex justify-end pt-2 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
