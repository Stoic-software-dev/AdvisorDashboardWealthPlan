import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2, Copy, Users, BarChart3, AlertCircle, Calculator } from "lucide-react";
import { toast } from "sonner";

// Calculator imports
import CapitalAssetsCalculator from "../components/calculators/CapitalAssetsCalculator";
import MortgageCalculator from "../components/calculators/MortgageCalculator";
import FixedIncomeCalculator from "../components/calculators/FixedIncomeCalculator";
import RealEstateCalculator from "../components/calculators/RealEstateCalculator";
import MainViewCalculator from "../components/calculators/MainViewCalculator";
import InsuranceNeedsAnalysisCalculator from "../components/calculators/InsuranceNeedsAnalysisCalculator";
import TaxLayeringCalculator from "../components/calculators/TaxLayeringCalculator";
import CapRateCalculator from "../components/calculators/CapRateCalculator";
import CostBenefitCalculator from "../components/calculators/CostBenefitCalculator";
import LifetimeTaxPlanner from "../components/calculators/LifetimeTaxPlanner";
import LongTermCashFlowCalculator from "../components/calculators/LongTermCashFlowCalculator";
import CPPOASBreakevenCalculator from "../components/calculators/CPPOASBreakevenCalculator";
import RealEstateInvestmentCalculator from "../components/calculators/RealEstateInvestmentCalculator";
import ComprehensiveOverviewCalculator from '../components/calculators/ComprehensiveOverviewCalculator';

// Entity imports
import { Client, FinancialGoal, Portfolio, CalculatorInstance, AppSettings } from "@/api/entities";
import { createPageUrl } from "@/utils";

export default function ClientCalculatorInstancePage() {
  const [clients, setClients] = useState([]);
  const [goals, setGoals] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [allCalculators, setAllCalculators] = useState([]);
  const [appSettings, setAppSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentInstance, setCurrentInstance] = useState(null);
  const [calculatorType, setCalculatorType] = useState(null);
  const [preselectedClientId, setPreselectedClientId] = useState(null);
  const [initialState, setInitialState] = useState(null);
  const [isViewer, setIsViewer] = useState(false);

  const calculatorRef = useRef();

  // Parse URL parameters and load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const clientId = urlParams.get('clientId');
        const calculatorId = urlParams.get('calculatorId');
        const calculatorTypeParam = urlParams.get('calculatorType');
        const accessToken = urlParams.get('access_token');
        
        console.log('URL Parameters:', { clientId, calculatorId, calculatorTypeParam, accessToken });
        
        // Check for required URL parameters
        if (!clientId && !calculatorId) {
          console.log('Missing required URL parameters, redirecting to Dashboard');
          window.location.href = createPageUrl('Dashboard');
          return;
        }
        
        // If we have clientId but no calculatorType (for new calculator), redirect to Dashboard
        if (clientId && !calculatorId && !calculatorTypeParam) {
          console.log('Missing calculatorType for new calculator, redirecting to Dashboard');
          window.location.href = createPageUrl('Dashboard');
          return;
        }

        // Set viewer mode if access token is present
        setIsViewer(!!accessToken);

        // Load basic data with error handling
        try {
          const [clientsData, goalsData, portfoliosData, settingsData, allCalculatorsData] = await Promise.all([
            Client.list().catch(err => { console.error('Error loading clients:', err); return []; }),
            FinancialGoal.list().catch(err => { console.error('Error loading goals:', err); return []; }),
            Portfolio.list().catch(err => { console.error('Error loading portfolios:', err); return []; }),
            AppSettings.list().catch(err => { console.error('Error loading settings:', err); return []; }),
            // Always load all calculators because MainViewCalculator might need them
            CalculatorInstance.list().catch(err => { console.error('Error loading all calculator instances:', err); return []; })
          ]);

          setClients(clientsData || []);
          setGoals(goalsData || []);
          setPortfolios(portfoliosData || []);
          setAppSettings(settingsData?.[0] || null);
          setAllCalculators(allCalculatorsData || []);

          if (calculatorId) {
            console.log('Looking for calculator with ID:', calculatorId);
            
            try {
              // Load the specific calculator instance directly
              const instance = await CalculatorInstance.get(calculatorId);
              console.log('Found calculator instance:', instance);
              
              if (instance) {
                setCurrentInstance(instance);
                setCalculatorType(instance.calculator_type);
                setInitialState(instance.state_data || {});
                
                // Set preselected client from the calculator's client_ids
                const calculatorClientIds = instance.client_ids || (instance.client_id ? [instance.client_id] : []);
                if (calculatorClientIds.length > 0) {
                  setPreselectedClientId(calculatorClientIds[0]);
                }
              } else {
                console.log('Calculator instance not found, redirecting to Dashboard');
                toast.error("Calculator instance not found. It may have been deleted or you may not have access to it.");
                setTimeout(() => {
                  window.location.href = createPageUrl('Dashboard');
                }, 2000);
                return;
              }
            } catch (error) {
              console.error('Error loading specific calculator instance:', error);
              toast.error("Error loading calculator instance.");
              window.location.href = createPageUrl('Dashboard');
              return;
            }
          } else if (clientId && calculatorTypeParam) {
            // Creating new calculator
            console.log('Creating new calculator:', { clientId, calculatorTypeParam });
            setCalculatorType(calculatorTypeParam);
            setPreselectedClientId(clientId);
            setCurrentInstance(null);
            setInitialState({});
          }
        } catch (dataError) {
          console.error("Error loading basic data:", dataError);
          toast.error("Error loading required data");
          // On error, redirect to Dashboard instead of showing error page
          window.location.href = createPageUrl('Dashboard');
          return;
        }

      } catch (error) {
        console.error("Error in loadData:", error);
        toast.error("Error loading calculator data");
        // On error, redirect to Dashboard instead of showing error page
        window.location.href = createPageUrl('Dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Add a function to refresh the current instance
  const refreshCurrentInstance = useCallback(async () => {
    if (currentInstance?.id) {
      try {
        const updatedInstance = await CalculatorInstance.get(currentInstance.id);
        setCurrentInstance(updatedInstance);
        console.log("Refreshed current instance from DB.");
      } catch (error) {
        console.error('Error refreshing calculator instance:', error);
      }
    }
  }, [currentInstance?.id]);

  // Listen for focus events to refresh data when returning to the page
  useEffect(() => {
    const handleFocus = () => {
      refreshCurrentInstance();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshCurrentInstance]);

  // Also refresh when the page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && currentInstance?.id) {
        refreshCurrentInstance();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshCurrentInstance, currentInstance?.id]);

  // Helper function for processing and saving calculator data based on the outline's logic
  const _processAndSaveCalculatorData = async (stateData) => {
    if (!stateData || typeof stateData !== 'object') {
      console.error('Invalid state data provided to _processAndSaveCalculatorData');
      toast.error('Invalid calculator data for saving.');
      return;
    }

    // Client selection validation - check multiple possible field names
    const clientIds = stateData.associatedClientIds || stateData.client_ids || (stateData.formData?.client_ids);
    if (!clientIds || clientIds.length === 0) {
      toast.error("Please select at least one client before saving");
      return;
    }

    const saveData = {
      name: stateData.calculatorName || stateData.formData?.calculator_name || getCalculatorDisplayName(calculatorType) || 'Unnamed Calculator',
      description: stateData.description || stateData.formData?.description || '',
      calculator_type: calculatorType,
      client_ids: clientIds,
      state_data: stateData
    };

    let savedInstance;
    if (currentInstance && currentInstance.id) {
      // Update existing instance
      console.log('Updating calculator instance:', currentInstance.id);
      savedInstance = await CalculatorInstance.update(currentInstance.id, saveData);
      console.log('Calculator updated successfully:', savedInstance);
      toast.success("Calculator updated successfully!");
    } else {
      // Create new instance
      console.log('Creating new calculator instance');
      savedInstance = await CalculatorInstance.create(saveData);
      console.log('Calculator created successfully:', savedInstance);
      toast.success("Calculator created successfully!");
    }

    // Update the current instance state with the saved data
    setCurrentInstance(savedInstance);
  };

  // The main save handler called by the Save button
  const handleSave = async () => {
    if (!calculatorRef.current) {
      toast.error("Calculator not ready");
      return;
    }

    setIsSaving(true);
    try {
      const state_data = calculatorRef.current.getState(); // Get state from the currently rendered calculator
      await _processAndSaveCalculatorData(state_data); // Call the helper with the retrieved state
    } catch (error) {
      console.error("Error saving calculator:", error);
      toast.error("Failed to save calculator");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoBack = () => {
    if (preselectedClientId) {
      window.location.href = createPageUrl(`Clients?id=${preselectedClientId}&tab=calculators`);
    } else {
      window.location.href = createPageUrl('Calculators');
    }
  };

  const handleCopyCalculator = () => {
    toast.info("Duplicate functionality not yet implemented.");
    console.log("Duplicate calculator clicked!");
    // Logic for duplicating calculator would go here
  };

  const getCalculatorDisplayName = (calculatorType) => {
    const displayNames = {
      'capital_assets': 'Capital Assets',
      'mortgage': 'Debt Repayment',
      'fixed_income': 'Fixed Income',
      'real_estate': 'Real Estate Assets',
      'real_estate_investment': 'Real Estate Investment',
      'insurance_needs': 'Insurance Needs Analysis',
      'main_view': 'Retirement - Main View',
      'tax_layering': 'Tax Layering',
      'cap_rate': 'Cap Rate',
      'cost_benefit': 'Cost Benefit',
      'lifetime_tax_planner': 'Lifetime Tax Planner',
      'long_term_cash_flow': 'Long Term Cash Flow',
      'cpp_oas_breakeven': 'CPP/OAS Breakeven',
      'comprehensive_overview': 'Comprehensive Overview'
    };
    
    return displayNames[calculatorType] || calculatorType;
  };

  // Refactored to use an object mapping calculator types to components
  const calculatorComponents = {
    capital_assets: CapitalAssetsCalculator,
    mortgage: MortgageCalculator,
    fixed_income: FixedIncomeCalculator,
    real_estate: RealEstateCalculator,
    real_estate_investment: RealEstateInvestmentCalculator,
    insurance_needs: InsuranceNeedsAnalysisCalculator,
    main_view: MainViewCalculator,
    tax_layering: TaxLayeringCalculator,
    cap_rate: CapRateCalculator,
    cost_benefit: CostBenefitCalculator,
    lifetime_tax_planner: LifetimeTaxPlanner,
    long_term_cash_flow: LongTermCashFlowCalculator,
    cpp_oas_breakeven: CPPOASBreakevenCalculator,
    comprehensive_overview: ComprehensiveOverviewCalculator,
  };

  const renderCalculator = () => {
    const commonProps = {
      clients,
      goals,
      portfolios,
      isLoading: false, // This prop seems redundant as parent handles overall loading
      preselectedClientId,
      initialState,
      isViewer,
      currentInstance, 
      onSave: _processAndSaveCalculatorData, // Pass the new helper for child components to potentially use internally
      isSaving,
      ref: calculatorRef
    };

    const CalculatorComponent = calculatorComponents[calculatorType];

    if (CalculatorComponent) {
      if (calculatorType === 'main_view') {
        return <CalculatorComponent {...commonProps} allCalculators={allCalculators} appSettings={appSettings} />;
      }
      return <CalculatorComponent {...commonProps} />;
    } else {
      return (
        <Card className="border-none shadow-lg bg-white">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Unknown Calculator Type
            </h3>
            <p className="text-slate-600 mb-4">
              The calculator type "{calculatorType}" is not recognized.
            </p>
            <Button onClick={() => window.location.href = createPageUrl('Dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 p-6 flex items-center justify-center">
        <Card className="border-none shadow-lg bg-white">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading calculator...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!calculatorType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 flex items-center justify-center">
        <Card className="p-6 max-w-md text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Calculator Not Found</h2>
          <p className="text-slate-600 mb-4">The requested calculator could not be loaded or is invalid.</p>
          <Button onClick={handleGoBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleGoBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Client Calculators
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {currentInstance?.name || 'New Calculator'}
                </h1>
              </div>
            </div>
            {!isViewer && (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleCopyCalculator}
                  className="flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Duplicate
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Calculator
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Calculator Component (ref is passed via commonProps to the specific calculator component) */}
          <div> 
            {renderCalculator()}
          </div>
        </div>
      </div>
    </div>
  );
}