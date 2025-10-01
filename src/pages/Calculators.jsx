
import React, { useState, useEffect, useRef } from "react";
import { CalculatorInstance, Client, FinancialGoal, Portfolio, AppSettings } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge"; // Added for 'Beta' tag

// Updated imports for icons, including new ones
import {
  Calculator, Plus, ArrowLeft, Save, Loader2, TrendingUp, Home, DollarSign, Building,
  FileText, Target, ArrowLeftRight, Trash2, ShieldCheck, FileDigit, Percent, Scale, BarChart3, Copy, Calendar, Users, MoreVertical,
  Telescope, Landmark, LineChart, GitCompareArrows, FileSpreadsheet, Coins,
  // New icons from outline
  Combine, HardHat, Briefcase, AreaChart, Banknote, GanttChartSquare, Waves, FileClock, HandCoins, Building2
} from "lucide-react";

// Import date-fns for date formatting
import { formatDistanceToNow } from 'date-fns';

// Import calculator components
import CapitalAssetsCalculator from "../components/calculators/CapitalAssetsCalculator";
import MortgageCalculator from "../components/calculators/MortgageCalculator";
import FixedIncomeCalculator from "../components/calculators/FixedIncomeCalculator";
import RealEstateCalculator from "../components/calculators/RealEstateCalculator";
import InsuranceNeedsAnalysisCalculator from "../components/calculators/InsuranceNeedsAnalysisCalculator";
import MainViewCalculator from "../components/calculators/MainViewCalculator";
import TaxLayeringCalculator from "../components/calculators/TaxLayeringCalculator"; // Fixed import path
import CapRateCalculator from "../components/calculators/CapRateCalculator";
import CostBenefitCalculator from "../components/calculators/CostBenefitCalculator";
import LifetimeTaxPlanner from "../components/calculators/LifetimeTaxPlanner";
import LongTermCashFlowCalculator from "../components/calculators/LongTermCashFlowCalculator";
import CPPOASBreakevenCalculator from "../components/calculators/CPPOASBreakevenCalculator";
import RealEstateInvestmentCalculator from "../components/calculators/RealEstateInvestmentCalculator";
import ComprehensiveOverviewCalculator from '../components/calculators/ComprehensiveOverviewCalculator'; // Import the new calculator
import DebtComparisonCalculator from "../components/calculators/DebtComparisonCalculator"; // NEW IMPORT

const CalculatorTypeCard = ({ icon: Icon, title, description, value, isSelected, onSelect, iconColorClass, disabled, beta }) => (
  <div
    onClick={() => !disabled && onSelect(value)}
    className={`p-4 rounded-lg border-2 h-full flex flex-col transition-all duration-200 relative ${
      disabled ? 'cursor-not-allowed bg-slate-50 opacity-60' : ''
    } ${
      isSelected
        ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] shadow-lg'
        : `border-slate-200 bg-white ${!disabled ? 'hover:border-slate-300 hover:shadow-md cursor-pointer' : ''}`
    }`}
  >
    {beta && ( // Render badge if beta is true
        <Badge variant="outline" className="absolute top-3 right-3 text-xs bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-100 dark:border-amber-700 z-10">Beta</Badge>
    )}
    <div className="flex items-center gap-3 mb-2">
      <Icon className={`w-5 h-5 ${iconColorClass}`} />
      <h3 className="font-semibold text-slate-800">{title}</h3>
    </div>
    <p className="text-sm text-slate-600 flex-grow">{description}</p>
  </div>
);

// Define a common array for all calculator definitions as a single source of truth
const calculatorSections = [
    {
      title: 'Financial Planning & Retirement', // Adjusted title to match original's category grouping
      icon: Briefcase,
      calculators: [
        { name: 'Main View', type: 'main_view', icon: Telescope, description: "Consolidated view of all financial aspects for a client.", iconColorClass: 'text-indigo-600' }, 
        { name: 'Retirement Income Planner', type: 'tax_layering', icon: GanttChartSquare, description: 'Strategically plan retirement income withdrawals from various account types to optimize tax efficiency.', iconColorClass: 'text-green-600' },
        { name: 'Long-Term Cash Flow', type: 'long_term_cash_flow', icon: Waves, description: 'Project cash flow over decades to ensure long-term financial stability.', iconColorClass: 'text-sky-600' },
        { name: 'Fixed Income', type: 'fixed_income', icon: LineChart, description: "Project fixed income streams like pensions and government benefits.", iconColorClass: 'text-purple-600' }, 
        { name: 'CPP/OAS Breakeven', type: 'cpp_oas_breakeven', icon: Landmark, description: 'Determine the optimal age to start CPP and OAS benefits.', iconColorClass: 'text-rose-600' },
      ]
    },
    {
      title: 'Asset & Investment Management',
      icon: AreaChart,
      calculators: [
        { name: 'Capital Assets', type: 'capital_assets', icon: Landmark, description: 'Project growth of capital assets over time with contributions and redemptions.', iconColorClass: 'text-blue-600' },
        { name: 'Real Estate (Single Property)', type: 'real_estate', icon: Building, description: 'Analyze the purchase and cash flow of a single real estate property.', iconColorClass: 'text-orange-600' },
        { name: 'Real Estate Portfolio', type: 'real_estate_investment', icon: Building2, description: 'Model the growth of a real estate portfolio over time.', iconColorClass: 'text-amber-600' },
        { name: 'Cap Rate Calculator', type: 'cap_rate', icon: Percent, description: 'Calculate the capitalization rate for an investment property.', iconColorClass: 'text-lime-600' },
      ]
    },
    {
      title: 'Tax & Estate Planning',
      icon: FileDigit,
      calculators: [
        { name: 'Lifetime Tax Planner', type: 'lifetime_tax_planner', icon: FileClock, description: 'Plan and optimize taxes over a client\'s lifetime.', iconColorClass: 'text-cyan-600' },
        { name: 'Insurance Needs', type: 'insurance_needs', icon: ShieldCheck, description: 'Analyze life insurance needs for clients and spouses.', iconColorClass: 'text-emerald-600' },
      ]
    },
    {
      title: 'Debt & Liabilities',
      icon: Banknote,
      calculators: [
        { name: 'Debt Repayment', type: 'mortgage', icon: HandCoins, description: 'Model debt repayment strategies for mortgages or loans.', iconColorClass: 'text-pink-600' },
        { name: 'Debt Comparison', type: 'debt_comparison', icon: GitCompareArrows, description: 'Compare two different debt scenarios side-by-side.', iconColorClass: 'text-indigo-600' }, // NEW CALCULATOR
      ]
    },
    {
      title: 'General Financial Analysis',
      icon: Scale,
      calculators: [
        { name: 'Cost-Benefit Analysis', type: 'cost_benefit', icon: Scale, description: 'Compare the costs and benefits of a financial decision.', iconColorClass: 'text-slate-600' },
      ]
    },
    {
      title: 'In Development',
      icon: HardHat,
      calculators: [
        { name: 'All-In-One Overview', type: 'comprehensive_overview', icon: Combine, description: 'A comprehensive financial overview including income, net worth, and estate projections.', beta: true, iconColorClass: 'text-teal-600' },
      ]
    }
  ];

// Helper function to get calculator definition by type
const getCalculatorDefinition = (type) => {
  for (const section of calculatorSections) {
    const definition = section.calculators.find(def => def.type === type); // 'type' not 'value' now
    if (definition) {
      return definition;
    }
  }
  return null; // or a default definition if needed
};

// Helper function to create URLs for navigation
const createPageUrl = (basePath, params) => {
  const url = new URL(`/${basePath}`, window.location.origin);
  if (params) {
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
  }
  return url.toString();
};

export default function CalculatorsPage() {
  const [view, setView] = useState('list');
  const [activeInstance, setActiveInstance] = useState(null);
  const [savedInstances, setSavedInstances] = useState([]);
  
  const [clients, setClients] = useState([]);
  const [goals, setGoals] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [appSettings, setAppSettings] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [instanceName, setInstanceName] = useState("");
  const [instanceDescription, setInstanceDescription] = useState("");
  const [instanceType, setInstanceType] = useState("");
  const [childCalcName, setChildCalcName] = useState("");

  const [initialStateForCheck, setInitialStateForCheck] = useState(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [calculatorToDelete, setCalculatorToDelete] = useState(null);

  const calculatorRef = useRef();

  const [saveMessage, setSaveMessage] = useState("");
  const [showSaveMessage, setShowSaveMessage] = useState(false);

  useEffect(() => {
    loadPageData();
  }, []);
  
  useEffect(() => {
    if (activeInstance) {
      setInstanceName(activeInstance.name || "");
      setInstanceDescription(activeInstance.description || "");
      setInstanceType(activeInstance.calculator_type || "");
      setChildCalcName(activeInstance.state_data?.formData?.calculator_name || "");
    } else {
      setInstanceName("");
      setInstanceDescription("");
      setInstanceType("");
      setChildCalcName("");
    }
  }, [activeInstance]);

  const loadPageData = async () => {
    setIsLoading(true);
    try {
      const allInstances = await CalculatorInstance.list();
      const standaloneInstances = allInstances.filter(instance => {
        // Handle both new client_ids array format and legacy client_id format
        const clientIds = instance.client_ids || (instance.client_id ? [instance.client_id] : []);
        return clientIds.length === 0; // Only show calculators with no client assignments
      });
      
      const [clientData, goalData, portfolioData, settingsData] = await Promise.all([
        Client.list(),
        FinancialGoal.list(),
        Portfolio.list(),
        AppSettings.list(),
      ]);
      
      setSavedInstances(standaloneInstances || []);
      setClients(clientData || []);
      setGoals(goalData || []);
      setPortfolios(portfolioData || []);
      setAppSettings(settingsData && settingsData.length > 0 ? settingsData[0] : null);
    } catch (error) {
      console.error("Error loading calculator page data:", error);
    }
    setIsLoading(false);
  };

  const handleDeleteCalculator = async (calculator) => {
    try {
      await CalculatorInstance.delete(calculator.id);
      await loadPageData();
    } catch (error) {
      console.error("Failed to delete calculator:", error);
      alert("There was an error deleting the calculator. Please try again.");
    }
  };

  const confirmDelete = (calculator) => {
    setCalculatorToDelete(calculator);
    setShowDeleteDialog(true);
  };

  const handleCreateNew = () => {
    setActiveInstance(null);
    setInitialStateForCheck({
      name: "",
      description: "",
      calculator_type: "",
      state_data: null
    });
    setChildCalcName("");
    setView('instance');
  };

  const handleOpenInstance = (instance) => {
    setActiveInstance(instance);
    setInitialStateForCheck({
      name: instance.name,
      description: instance.description,
      calculator_type: instance.calculator_type,
      state_data: instance.state_data
    });
    setChildCalcName(instance.state_data?.formData?.calculator_name || "");
    setView('instance');
  };

  const handleBackToList = (force = false) => {
    if (!force && initialStateForCheck) {
      const currentState = {
        name: instanceName, // This will be from activeInstance.name or empty for new
        description: instanceDescription, // This will be from activeInstance.description or empty for new
        calculator_type: instanceType,
        state_data: calculatorRef.current ? calculatorRef.current.getState() : null
      };
      
      if (JSON.stringify(currentState) !== JSON.stringify(initialStateForCheck)) {
        const proceed = window.confirm("You have unsaved changes. Are you sure you want to discard them?");
        if (!proceed) {
          return;
        }
      }
    }
    setView('list');
    setActiveInstance(null);
    setInitialStateForCheck(null);
    // Clear form fields when going back to list
    setInstanceName("");
    setInstanceDescription("");
    setInstanceType("");
    setChildCalcName("");
  };
  
  const handleSave = async () => {
    const state_from_child = calculatorRef.current ? calculatorRef.current.getState() : {};
    const child_name = state_from_child?.formData?.calculator_name || '';
    // Use the name from child_name for new instances, or instanceName for existing if populated
    // Since instanceName input is removed, for new calculators, instanceName will be empty,
    // so finalInstanceName will be child_name. For existing, instanceName comes from activeInstance.name.
    const finalInstanceName = instanceName || child_name; 

    if (!finalInstanceName) {
      alert("Calculator Name is required (set within the calculator form).");
      return;
    }
    if (!instanceType) {
      alert("Please select a Calculator Type before saving.");
      return;
    }
    if (!calculatorRef.current) {
      alert("Calculator component not loaded. Please select a type and try again.");
      return;
    }

    setIsSaving(true);
    
    const state_data = state_from_child || {};
    state_data.formData = state_data.formData || {};
    state_data.formData.calculator_name = finalInstanceName; // Ensure state_data reflects the chosen name

    const client_ids_from_calc = state_data?.formData?.client_ids || [];
    
    const dataToSave = {
      name: finalInstanceName,
      description: instanceDescription, // Will be from activeInstance for existing, or empty for new
      calculator_type: instanceType,
      client_ids: client_ids_from_calc,
      state_data
    };

    try {
      let savedInstance;
      if (activeInstance?.id) {
        savedInstance = await CalculatorInstance.update(activeInstance.id, dataToSave);
      } else {
        savedInstance = await CalculatorInstance.create(dataToSave);
      }
      
      const primaryClientId = savedInstance.client_ids?.[0];
      
      if (primaryClientId) {
        // Redirect to the client's calculators tab instead of individual calculator
        window.location.href = createPageUrl("Clients", { id: primaryClientId, tab: "calculators" });
      } else {
        // If it's a standalone calculator, show success message and refresh list
        setSaveMessage("Calculator successfully saved as a standalone instance.");
        setShowSaveMessage(true);
        setTimeout(() => {
          setShowSaveMessage(false);
          setSaveMessage("");
        }, 4000); 
        
        await loadPageData(); 
        handleBackToList(true); // Force back to list view
      }
    } catch (error) {
      console.error("Failed to save calculator:", error);
      alert("There was an error saving the calculator. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicateCalculator = async (instance) => {
    try {
      const newName = `Copy of ${instance.name}`;
      const dataToDuplicate = {
        name: newName,
        description: instance.description,
        calculator_type: instance.calculator_type,
        client_ids: instance.client_ids,
        state_data: instance.state_data,
      };
      await CalculatorInstance.create(dataToDuplicate);
      await loadPageData();
      setSaveMessage("Calculator successfully duplicated!");
      setShowSaveMessage(true);
      setTimeout(() => {
        setShowSaveMessage(false);
        setSaveMessage("");
      }, 4000);
    } catch (error) {
      console.error("Failed to duplicate calculator:", error);
      alert("There was an error duplicating the calculator. Please try again.");
    }
  };
  
  const getAssociatedClientNames = (client_ids) => {
    if (!client_ids || client_ids.length === 0) {
      return "Standalone";
    }
    const associatedClients = clients.filter(client => client_ids.includes(client.id));
    if (associatedClients.length === 0) {
      return "No associated clients found"; 
    }
    return associatedClients.map(client => client.name).join(', ');
  };
  
  const renderListView = () => (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle>Standalone Calculators</CardTitle>
          <CardDescription>General-purpose calculators not assigned to a specific client.</CardDescription>
        </div>
        <Button 
          onClick={handleCreateNew} 
          className="shadow-lg"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-accent-foreground)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-accent-gradient-to)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-accent)';
          }}
        >
          <Plus className="w-4 h-4 mr-2"/>
          New Calculator
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400"/>
          </div>
        ) : savedInstances.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Calculator className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold">No Standalone Calculators Found</p>
            <p>Click "New Calculator" to create your first one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedInstances.map(inst => {
              const definition = getCalculatorDefinition(inst.calculator_type);
              const IconComponent = definition?.icon || Calculator; // Fallback to generic Calculator icon
              // Assign a default icon color if not explicitly defined in the new structure
              const iconColor = definition?.iconColorClass || 'text-gray-600'; 

              return (
                <Card key={inst.id} className="hover:shadow-xl transition-shadow flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <IconComponent className={`w-5 h-5 ${iconColor}`} />
                        {inst.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button onClick={() => handleOpenInstance(inst)}>Open/Edit</Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDuplicateCalculator(inst)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => confirmDelete(inst)} className="text-red-600 focus:bg-red-50 focus:text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow pt-4">
                    <div className="flex items-center text-sm text-slate-500 mb-2">
                      {inst.updated_date && (
                        <>
                          <Calendar className="w-3.5 h-3.5 mr-1" />
                          <span>Updated {formatDistanceToNow(new Date(inst.updated_date), { addSuffix: true })}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-slate-600 mb-3">
                      <Users className="w-3.5 h-3.5 mr-1.5" />
                      <span>{getAssociatedClientNames(inst.client_ids)}</span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-3">{inst.description || "No description."}</p>
                  </CardContent>
                  <div className="p-4 pt-0 hidden"></div>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderCalculator = (type) => {
    const commonProps = {
      initialState: activeInstance?.state_data,
      clients: clients,
      goals: goals,
      portfolios: portfolios,
      isLoading: isLoading,
      currentInstance: activeInstance,
      onNameChange: setChildCalcName, // Pass setter to child for reactivity
    };

    switch (type) {
      case "capital_assets":
        return <CapitalAssetsCalculator ref={calculatorRef} {...commonProps} />;
      case "mortgage":
        return <MortgageCalculator ref={calculatorRef} {...commonProps} />;
      case "debt_comparison": // NEW CASE
        return <DebtComparisonCalculator ref={calculatorRef} {...commonProps} />; // NEW CALCULATOR COMPONENT
      case "fixed_income":
        return <FixedIncomeCalculator ref={calculatorRef} {...commonProps} />;
      case "real_estate":
        return <RealEstateCalculator ref={calculatorRef} {...commonProps} />;
      case "real_estate_investment":
        return <RealEstateInvestmentCalculator ref={calculatorRef} {...commonProps} />;
      case "insurance_needs":
        return <InsuranceNeedsAnalysisCalculator ref={calculatorRef} {...commonProps} />;
      case "main_view":
        return <MainViewCalculator ref={calculatorRef} {...commonProps} appSettings={appSettings} />;
      case "tax_layering":
        return <TaxLayeringCalculator ref={calculatorRef} {...commonProps} />;
      case "cap_rate":
        return <CapRateCalculator ref={calculatorRef} {...commonProps} />;
      case "cost_benefit":
        return <CostBenefitCalculator ref={calculatorRef} {...commonProps} />;
      case "lifetime_tax_planner":
        return <LifetimeTaxPlanner ref={calculatorRef} {...commonProps} />;
      case "long_term_cash_flow":
        return <LongTermCashFlowCalculator ref={calculatorRef} {...commonProps} />;
      case "cpp_oas_breakeven":
        return <CPPOASBreakevenCalculator ref={calculatorRef} {...commonProps} />;
      case "comprehensive_overview":
        return <ComprehensiveOverviewCalculator ref={calculatorRef} {...commonProps} />;
      default:
        return null;
    }
  };

  const renderInstanceView = () => {
    const isEditing = !!activeInstance;
    
    // Check if calculator name is filled in either the top-level field or within the calculator component
    const getCalculatorNameFromComponent = () => {
      if (calculatorRef.current) {
        const state = calculatorRef.current.getState();
        return state?.formData?.calculator_name || '';
      }
      return '';
    };
    
    const hasCalculatorName = instanceName || getCalculatorNameFromComponent();
    
    // Use the new calculatorSections for rendering the selection cards
    const selectableCalculatorCategories = calculatorSections;

    return (
      <div>
        {/* Success Message */}
        {showSaveMessage && (
          <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
            {saveMessage}
          </div>
        )}
        
        <Card className="mb-6 border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle>{isEditing ? `Edit Calculator` : 'Create New Calculator'}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleBackToList()}>
                    <ArrowLeft className="w-4 h-4 mr-2"/>
                    Back to List
                </Button>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <Label className="mb-3 block font-semibold text-slate-800">Calculator Type</Label>
                    <div className="space-y-8">
                        {selectableCalculatorCategories.map(section => (
                            <div key={section.title}>
                                <h3 className="text-lg font-semibold text-slate-800 mb-3 border-b pb-2 flex items-center gap-2">
                                  {section.icon && <section.icon className="w-5 h-5 text-slate-600" />}
                                  {section.title}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {section.calculators.map(calculator => (
                                        <CalculatorTypeCard
                                            key={calculator.type}
                                            title={calculator.name} // Use 'name' from new structure
                                            description={calculator.description}
                                            value={calculator.type} // Use 'type' from new structure as 'value'
                                            icon={calculator.icon}
                                            // Assign a generic color class for calculator cards as none are specified in calculatorSections
                                            iconColorClass={calculator.iconColorClass || 'text-slate-600'} 
                                            isSelected={instanceType === calculator.type}
                                            onSelect={setInstanceType}
                                            disabled={isEditing}
                                            beta={calculator.beta} // Pass beta prop to CalculatorTypeCard
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Buttons - Always show, but enable when name is filled from calculator component */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => handleBackToList()}>Cancel</Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={isSaving || !hasCalculatorName} 
                        className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-[var(--color-accent-foreground)] disabled:bg-slate-400 disabled:text-slate-100 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : null}
                        {isEditing ? 'Save Changes' : 'Create Calculator'}
                    </Button>
                </div>
            </CardContent>
        </Card>

        {/* Calculator Component - Only show after type is selected to allow state capture for new instances */}
        {instanceType && (
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm mt-6">
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400"/>
                  <p className="ml-4 text-slate-500">Loading supporting data...</p>
                </div>
              ) : (
                renderCalculator(instanceType)
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-green-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Financial Calculators</h1>
          <p className="text-slate-600">Create, save, and manage your financial calculation instances.</p>
        </div>
        
        {view === 'list' ? renderListView() : renderInstanceView()}

        {/* Delete Confirmation Dialog */}
        {showDeleteDialog && calculatorToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-red-600">Delete Calculator</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Are you sure you want to delete <strong>"{calculatorToDelete.name}"</strong>?</p>
                <p className="text-sm text-slate-600">This action cannot be undone.</p>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteDialog(false);
                      setCalculatorToDelete(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      await handleDeleteCalculator(calculatorToDelete);
                      setShowDeleteDialog(false);
                      setCalculatorToDelete(null);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
