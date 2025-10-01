
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calculator,
  Plus,
  Calendar,
  MoreVertical,
  Copy,
  Trash2,
  ChevronDown,
  X,
  Users,
  GitCompareArrows, // Already imported
  Telescope, // Already imported
  TrendingUp, // New import
  Home, // New import
  LineChart, // New import
  Building, // New import
  Building2, // New import
  Shield, // New import
  Eye, // New import
  Layers, // New import
  Percent, // New import
  Scale, // New import
  BarChart, // New import
  DollarSign, // New import
  Layout, // New import
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { CalculatorInstance } from "@/api/entities";
import { createPageUrl } from "@/utils";
import CalculatorViewerModal from "../../calculators/CalculatorViewerModal";
import MainViewCalculator from '../../calculators/MainViewCalculator';
import TaxLayeringCalculator from '../../calculators/TaxLayeringCalculator';
import CapRateCalculator from '../../calculators/CapRateCalculator';
import CostBenefitCalculator from '../../calculators/CostBenefitCalculator';
import LifetimeTaxPlanner from '../../calculators/LifetimeTaxPlanner';
import LongTermCashFlowCalculator from '../../calculators/LongTermCashFlowCalculator';
import CPPOASBreakevenCalculator from '../../calculators/CPPOASBreakevenCalculator';
import RealEstateInvestmentCalculator from '../../calculators/RealEstateInvestmentCalculator';
import ComprehensiveOverviewCalculator from '../../calculators/ComprehensiveOverviewCalculator';
import DebtComparisonCalculator from '../../calculators/DebtComparisonCalculator'; // New Calculator Import


const CALCULATOR_CATEGORIES = [
  {
    title: 'Retirement',
    calculators: [
      {
        value: 'main_view',
        title: 'Retirement - Main View',
        description: "A comprehensive retirement projection.",
        icon: Users,
        iconColorClass: 'text-blue-600'
      },
      {
        value: 'tax_layering',
        title: 'Retirement Income Planner',
        description: "Optimize retirement income by layering different income sources.",
        icon: X,
        iconColorClass: 'text-green-600'
      },
      {
        value: 'lifetime_tax_planner',
        title: 'Lifetime Tax Planner',
        description: "Plan your taxes for life.",
        icon: Calendar,
        iconColorClass: 'text-orange-600'
      },
      {
        value: 'long_term_cash_flow',
        title: 'Long Term Cash Flow',
        description: "Detailed annual cash flow projections.",
        icon: Copy,
        iconColorClass: 'text-purple-600'
      },
      {
        value: 'cpp_oas_breakeven',
        title: 'CPP/OAS Breakeven',
        description: "Determine the optimal age to start CPP and OAS benefits.",
        icon: GitCompareArrows,
        iconColorClass: 'text-amber-600'
      },
      {
        value: 'comprehensive_overview',
        title: 'All-In-One Overview',
        description: 'A comprehensive financial overview including income, net worth, and estate projections.',
        icon: Telescope,
        iconColorClass: 'text-cyan-600'
      },
    ]
  },
  {
    title: 'Assets',
    calculators: [
      {
        value: 'capital_assets',
        title: 'Capital Assets',
        description: "Track and project the growth of your capital assets.",
        icon: Calculator,
        iconColorClass: 'text-red-600'
      },
      {
        value: 'fixed_income',
        title: 'Fixed Income',
        description: "Analyze your fixed income investments.",
        icon: Calculator,
        iconColorClass: 'text-teal-600'
      },
      {
        value: 'real_estate',
        title: 'Real Estate Assets',
        description: "Evaluate your real estate holdings.",
        icon: Calculator,
        iconColorClass: 'text-pink-600'
      },
      {
        value: 'real_estate_investment',
        title: 'Real Estate Investment',
        description: "Analyze potential real estate investments.",
        icon: Calculator,
        iconColorClass: 'text-lime-600'
      },
      {
        value: 'cap_rate',
        title: 'Cap Rate',
        description: "Calculate the capitalization rate for real estate investments.",
        icon: Calculator,
        iconColorClass: 'text-indigo-600'
      },
    ]
  },
  {
    title: 'Liability',
    calculators: [
      {
        value: 'mortgage',
        title: 'Debt Repayment',
        description: "Plan and track your debt repayment strategies.",
        icon: Calculator,
        iconColorClass: 'text-sky-600'
      },
      {
        value: 'debt_comparison',
        title: 'Debt Comparison',
        description: "Compare different debt repayment strategies.",
        icon: GitCompareArrows,
        iconColorClass: 'text-orange-500'
      },
    ]
  },
  {
    title: 'Insurance',
    calculators: [
      {
        value: 'insurance_needs',
        title: 'Insurance Needs Analysis',
        description: "Determine your insurance needs.",
        icon: Calculator,
        iconColorClass: 'text-stone-600'
      },
    ]
  },
  {
    title: 'Other',
    calculators: [
      {
        value: 'cost_benefit',
        title: 'Cost Benefit Analysis',
        description: "Analyze the costs and benefits of a decision.",
        icon: Calculator,
        iconColorClass: 'text-emerald-600'
      },
    ]
  }
];

export default function ClientCalculators({ client, onRefresh }) {
  const [calculators, setCalculators] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewerCalculator, setViewerCalculator] = useState(null);
  const [allClients, setAllClients] = useState([]);
  const [selectedCalculatorType, setSelectedCalculatorType] = useState('all'); // Add filter state

  const calculatorOptions = [
    { value: 'capital_assets', label: 'Capital Assets', icon: TrendingUp },
    { value: 'mortgage', label: 'Debt Repayment', icon: Home },
    { value: 'debt_comparison', label: 'Debt Comparison', icon: GitCompareArrows },
    { value: 'fixed_income', label: 'Fixed Income', icon: LineChart },
    { value: 'real_estate', label: 'Real Estate (Single Property)', icon: Building },
    { value: 'real_estate_investment', label: 'Real Estate Portfolio', icon: Building2 },
    { value: 'insurance_needs', label: 'Insurance Needs Analysis', icon: Shield },
    { value: 'main_view', label: 'Main View', icon: Eye },
    { value: 'tax_layering', label: 'Retirement Income Planner', icon: Layers },
    { value: 'cap_rate', label: 'Cap Rate Calculator', icon: Percent },
    { value: 'cost_benefit', label: 'Cost-Benefit Analysis', icon: Scale },
    { value: 'lifetime_tax_planner', label: 'Lifetime Tax Planner', icon: Calendar },
    { value: 'long_term_cash_flow', label: 'Long-Term Cash Flow', icon: BarChart },
    { value: 'cpp_oas_breakeven', label: 'CPP/OAS Breakeven', icon: DollarSign },
    { value: 'comprehensive_overview', label: 'All-In-One Overview (Beta)', icon: Layout },
  ];

  const getCalculatorDisplayName = (calculatorType) => {
    const option = calculatorOptions.find(opt => opt.value === calculatorType);
    return option ? option.label : calculatorType;
  };

  const loadData = useCallback(async () => {
    if (!client?.id) return;

    setIsLoading(true);
    try {
      // Load all clients and calculators
      const [allCalculators, clientsData] = await Promise.all([
        CalculatorInstance.list(),
        import("@/api/entities").then(module => module.Client.list())
      ]);

      setAllClients(clientsData || []);

      const clientCalculators = allCalculators.filter(calc => {
        const clientIds = calc.client_ids || (calc.client_id ? [calc.client_id] : []);
        return clientIds.includes(client.id);
      });
      setCalculators(clientCalculators);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getAssociatedClientNames = (calculator) => {
    const clientIds = calculator.client_ids || (calculator.client_id ? [calculator.client_id] : []);
    const clientNames = clientIds.map(id => {
      const clientData = allClients.find(c => c.id === id);
      return clientData ? `${clientData.first_name} ${clientData.last_name}` : 'Unknown Client';
    });
    return clientNames;
  };

  const handleNewCalculator = (calculatorType) => {
    const url = createPageUrl(`ClientCalculatorInstance?clientId=${client.id}&calculatorType=${calculatorType}`);
    window.location.href = url;
  };

  const handleOpenCalculator = (calculator) => {
    const primaryClientId = calculator.client_ids?.[0] || calculator.client_id;
    const url = createPageUrl(`ClientCalculatorInstance?clientId=${primaryClientId}&calculatorId=${calculator.id}`);
    window.location.href = url;
  };

  const handleCopyCalculator = async (calculator) => {
    try {
      const newCalculator = {
        name: `${calculator.name} (Copy)`,
        description: calculator.description,
        calculator_type: calculator.calculator_type,
        client_ids: calculator.client_ids,
        scenario_name: calculator.scenario_name,
        state_data: calculator.state_data
      };

      await CalculatorInstance.create(newCalculator);
      await loadData();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error copying calculator:", error);
    }
  };

  const handleDeleteCalculator = async (calculator) => {
    if (confirm(`Are you sure you want to delete "${calculator.name}"? This action cannot be undone.`)) {
      try {
        await CalculatorInstance.delete(calculator.id);
        await loadData();
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error("Error deleting calculator:", error);
      }
    }
  };

  // Filter calculators based on selected type
  const filteredCalculators = selectedCalculatorType === 'all'
    ? calculators
    : calculators.filter(calc => calc.calculator_type === selectedCalculatorType);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="h-8 w-20 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const renderCalculator = (type) => {

    const commonProps = {
      // client,
      // settings,
      // onSave: handleCalculatorSave,
      // onClose: handleCalculatorClose,
      // appSettings,
      // ref: calculatorRef,
      // calculator: currentCalculator,
      // isNew: !currentCalculator?.id,
      // setCalculatorState,
      // setAppSettings
    };

    switch (type) {
      case "capital_assets":
        return <></>;
      case "mortgage":
        return <></>;
      case "debt_comparison":
        return <DebtComparisonCalculator ref={undefined} {...commonProps} />; // New calculator case
      case "fixed_income":
        return <></>;
      case "real_estate":
        return <></>;
      case "real_estate_investment":
        return <RealEstateInvestmentCalculator ref={undefined} {...commonProps} />;
      case "insurance_needs":
        return <></>;
      case "main_view":
        return <MainViewCalculator ref={undefined} {...commonProps} appSettings={{}} />;
      case "tax_layering":
        return <TaxLayeringCalculator ref={undefined} {...commonProps} />;
      case "cap_rate":
        return <CapRateCalculator ref={undefined} {...commonProps} />;
      case "cost_benefit":
        return <CostBenefitCalculator ref={undefined} {...commonProps} />;
      case "lifetime_tax_planner":
        return <LifetimeTaxPlanner ref={undefined} {...commonProps} />;
      case "long_term_cash_flow":
        return <LongTermCashFlowCalculator ref={undefined} {...commonProps} />;
      case "cpp_oas_breakeven":
        return <CPPOASBreakevenCalculator ref={undefined} {...commonProps} />;
      case "comprehensive_overview":
        return <ComprehensiveOverviewCalculator ref={undefined} {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with New Calculator Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Calculator Instances</h3>
          <p className="text-sm text-slate-600">Financial calculations and projections for {client.first_name} {client.last_name}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Calculator Type Filter */}
          <Select value={selectedCalculatorType} onValueChange={setSelectedCalculatorType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Calculator Types</SelectItem>
              {calculatorOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Calculator
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {calculatorOptions.map((option) => {
                const Icon = option.icon; // Get the icon component
                return (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => handleNewCalculator(option.value)}
                    className="cursor-pointer"
                  >
                    {Icon && <Icon className="w-4 h-4 mr-2" />}
                    {option.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Calculator Instances */}
      {filteredCalculators.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calculator className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">
              {selectedCalculatorType === 'all'
                ? 'No Calculator Instances Yet'
                : `No ${getCalculatorDisplayName(selectedCalculatorType)} Calculators`}
            </h3>
            <p className="text-slate-500 text-center mb-4">
              {selectedCalculatorType === 'all'
                ? `Start creating financial projections and calculations for ${client.first_name} ${client.last_name}`
                : `No ${getCalculatorDisplayName(selectedCalculatorType)} calculations found. Try a different filter or create a new one.`}
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Calculator
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                {calculatorOptions.map((option) => {
                  const Icon = option.icon; // Get the icon component
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => handleNewCalculator(option.value)}
                      className="cursor-pointer"
                    >
                      {Icon && <Icon className="w-4 h-4 mr-2" />}
                      {option.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCalculators.map((calculator) => {
            const associatedClients = getAssociatedClientNames(calculator);
            const calculatorOption = calculatorOptions.find(opt => opt.value === calculator.calculator_type);
            const CardIcon = calculatorOption ? calculatorOption.icon : Calculator; // Use the icon from calculatorOptions

            return (
              <Card key={calculator.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="px-4 pt-4 pb-0">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                      <CardIcon className="w-5 h-5 text-blue-500" /> {/* Use the dynamic icon */}
                      {calculator.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleOpenCalculator(calculator)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Open/Edit
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCopyCalculator(calculator)}>
                            <Copy className="w-3 h-3 mr-1" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteCalculator(calculator)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                    <CardIcon className="w-4 h-4 text-blue-500" /> {/* Use the dynamic icon */}
                    <span className="font-semibold text-[var(--color-accent-text)]">
                      {getCalculatorDisplayName(calculator.calculator_type)}
                    </span>
                    {calculator.updated_date && (
                      <>
                        <span className="mx-2">•</span>
                        <Calendar className="w-3.5 h-3.5 mr-1" />
                        <span>Updated {formatDistanceToNow(new Date(calculator.updated_date), { addSuffix: true })}</span>
                      </>
                    )}
                  </div>
                  {associatedClients.length > 0 && (
                    <div className="flex items-center text-sm text-slate-600 mb-3">
                      <Users className="w-3.5 h-3.5 mr-1.5" />
                      <span>{associatedClients.join(', ')}</span>
                    </div>
                  )}
                  {calculator.description && (
                    <p className="text-sm text-slate-600 line-clamp-2">{calculator.description}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Calculator Viewer Modal */}
      {viewerCalculator && (
        <CalculatorViewerModal
          calculator={viewerCalculator}
          onClose={() => setViewerCalculator(null)}
        />
      )}
    </div>
  );
}
