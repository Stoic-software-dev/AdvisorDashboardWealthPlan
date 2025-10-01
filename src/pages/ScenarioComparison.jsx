
import React, { useState, useEffect } from "react";
import { CalculatorInstance } from "@/api/entities"; // Updated import path as per outline
import { Client } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, GitCompare, Calculator, Home, DollarSign, List, AlertCircle, Users } from "lucide-react";

import ComparisonCharts from "../components/scenarios/ComparisonCharts";
import SummaryTable from "../components/scenarios/SummaryTable";
import ScenarioAIAnalysis from "../components/scenarios/ScenarioAIAnalysis";
import ClientCombobox from "../components/shared/ClientCombobox";
import { extractCapitalAssetsComparisonData } from "../components/calculators/CapitalAssetsCalculator";
import { extractMortgageComparisonData } from "../components/calculators/MortgageCalculator";
import { extractFixedIncomeComparisonData } from "../components/calculators/FixedIncomeCalculator"; // New import for Fixed Income

const CALCULATOR_TYPES = [
  {
    value: 'main_view',
    label: 'Main View Calculator',
    icon: List,
    description: 'Compare comprehensive financial projections'
  },
  {
    value: 'capital_assets',
    label: 'Capital Assets Calculator',
    icon: Calculator, // Using Calculator icon as per common practice for general calculator
    description: 'Compare investment account projections'
  },
  {
    value: 'fixed_income', // New Calculator Type
    label: 'Fixed Income Calculator',
    icon: DollarSign, // Using DollarSign icon for fixed income
    description: 'Compare bond, GIC, and other fixed income scenarios'
  },
  {
    value: 'mortgage',
    label: 'Debt Repayment Calculator',
    icon: Home,
    description: 'Compare mortgage and debt scenarios'
  }
];

export default function ScenarioComparison() {
  const [calculatorType, setCalculatorType] = useState('main_view');
  const [availableInstances, setAvailableInstances] = useState([]);
  const [selectedInstances, setSelectedInstances] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scenarios, setScenarios] = useState([]); // This will hold processed scenario data for charts/tables
  const [comparisonData, setComparisonData] = useState(null); // This signals the type of comparison and if data is ready
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('all');

  useEffect(() => {
    const fetchClients = async () => {
        try {
            const clientData = await Client.list();
            setClients(clientData || []);
        } catch(error) {
            console.error("Error fetching clients:", error);
            setClients([]);
        }
    };
    fetchClients();
  }, []);

  useEffect(() => {
    loadAvailableInstances();
  }, [calculatorType, selectedClientId]);

  const loadAvailableInstances = async () => {
    setIsLoading(true);
    try {
      // Fetch instances based on the selected calculator type
      const filterParams = { calculator_type: calculatorType };
      
      let instances = await CalculatorInstance.filter(filterParams, "-created_date");

      // If a specific client is selected, filter the results further client-client
      if (selectedClientId && selectedClientId !== 'all') {
          instances = instances.filter(instance => {
              const clientIds = instance.client_ids || (instance.client_id ? [instance.client_id] : []);
              return clientIds.includes(selectedClientId);
          });
      }

      setAvailableInstances(instances || []);
      setSelectedInstances([]); // Clear selections when changing calculator type or client filter
      setScenarios([]); // Clear processed scenarios
      setComparisonData(null); // Clear previous comparison results
    } catch (error) {
      console.error("Error loading calculator instances:", error);
      setAvailableInstances([]);
    }
    setIsLoading(false);
  };

  const handleInstanceSelection = (instanceId, isSelected) => {
    if (isSelected) {
      if (!selectedInstances.includes(instanceId)) {
        setSelectedInstances(prev => [...prev, instanceId]);
      }
    } else {
      selectedInstances.includes(instanceId) && setSelectedInstances(prev => prev.filter(id => id !== instanceId));
    }
  };

  const runComparison = async () => {
    if (selectedInstances.length < 2) {
      alert("Please select at least 2 instances to compare.");
      return;
    }

    setIsLoading(true);
    try {
      // Directly fetch the full data for each selected instance to ensure we have the complete state.
      const instancePromises = selectedInstances.map(id => CalculatorInstance.get(id));
      const instancesWithFullData = await Promise.all(instancePromises);

      if (instancesWithFullData.some(inst => !inst)) {
        throw new Error("One or more selected instances could not be fully loaded. Please try again.");
      }
      
      if (calculatorType === 'main_view') {
        await runMainViewComparison(instancesWithFullData);
      } else if (calculatorType === 'capital_assets') {
        await runCapitalAssetsComparison(instancesWithFullData);
      } else if (calculatorType === 'fixed_income') { // New comparison type
        await runFixedIncomeComparison(instancesWithFullData);
      } else if (calculatorType === 'mortgage') {
        await runMortgageComparison(instancesWithFullData);
      }
    } catch (error) {
      console.error("Error running comparison:", error);
      alert(`There was an error running the comparison: ${error.message}`);
    }
    setIsLoading(false);
  };

  const runMainViewComparison = async (instances) => {
    // This logic is adapted from the original `useMemo` for `comparisonData`
    const processedScenarios = instances.map(instance => {
      const sd = instance.state_data || {};

      // Get final estate value from the last entry in estateData
      const estateData = sd.estateData || [];
      const finalEstateValue = estateData.length > 0
        ? estateData[estateData.length - 1]?.finalEstateValue || 0
        : 0;

      return {
        id: instance.id,
        name: instance.scenario_name || instance.name,
        netWorthData: sd.netWorthData || [],
        projectionData: sd.projectionData || [],
        peakNetWorth: Math.max(...(sd.netWorthData?.map(d => d.netWorth) || [0])),
        finalEstateValue: finalEstateValue,
      };
    });
    setScenarios(processedScenarios);
    setComparisonData({ type: 'main_view', data: processedScenarios });
    console.log("Running Main View comparison for:", processedScenarios);
  };

  const runCapitalAssetsComparison = async (instances) => {
    console.log("Running Capital Assets comparison for:", instances);
    
    const processedScenarios = instances.map(instance => {
      try {
        // Pass the 'clients' state to the extraction function, just like the mortgage calculator.
        const comparisonData = extractCapitalAssetsComparisonData(instance.state_data, clients);
        
        if (!comparisonData) {
          return {
            id: instance.id,
            name: instance.scenario_name || instance.name,
            error: "Unable to extract comparison data - no valid state data found"
          };
        }

        return {
          id: instance.id,
          name: comparisonData.name || instance.scenario_name || instance.name,
          projectionData: comparisonData.projectionData,
          finalMetrics: comparisonData.finalMetrics
        };
      } catch (error) {
        console.error(`Error processing instance ${instance.id}:`, error);
        return {
          id: instance.id,
          name: instance.scenario_name || instance.name,
          error: `Processing error: ${error.message}`
        };
      }
    });

    // Filter out any scenarios with errors
    const validScenarios = processedScenarios.filter(s => !s.error);
    
    if (validScenarios.length === 0) {
      alert("No valid scenarios could be processed for comparison. Please check that your calculator instances have saved data.");
      return;
    }
    
    setScenarios(validScenarios);
    setComparisonData({ 
      type: 'capital_assets', 
      data: validScenarios 
    });
  };

  const runFixedIncomeComparison = async (instances) => {
    console.log("Running Fixed Income comparison for:", instances);

    const processedScenarios = instances.map(instance => {
      try {
        console.log(`Processing Fixed Income instance ${instance.id}:`, {
          name: instance.name,
          hasStateData: !!instance.state_data,
          stateDataKeys: Object.keys(instance.state_data || {}),
        });
        
        const comparisonData = extractFixedIncomeComparisonData(instance.state_data, clients);
        
        if (!comparisonData) {
          console.error(`No comparison data extracted for instance ${instance.id}`);
          return {
            id: instance.id,
            name: instance.scenario_name || instance.name,
            error: "Unable to extract comparison data - no valid projection data found"
          };
        }

        console.log(`Successfully processed Fixed Income instance ${instance.id}.`);

        return {
          id: instance.id,
          name: comparisonData.name || instance.scenario_name || instance.name,
          projectionData: comparisonData.projectionData,
          finalMetrics: comparisonData.finalMetrics
        };
      } catch (error) {
        console.error(`Error processing Fixed Income instance ${instance.id}:`, error);
        return {
          id: instance.id,
          name: instance.scenario_name || instance.name,
          error: `Processing error: ${error.message}`
        };
      }
    });

    // Filter out any scenarios with errors
    const validScenarios = processedScenarios.filter(s => !s.error);
    
    console.log('Fixed Income comparison results:', {
      total: processedScenarios.length,
      valid: validScenarios.length,
      errors: processedScenarios.filter(s => s.error).map(s => ({ id: s.id, name: s.name, error: s.error }))
    });
    
    if (validScenarios.length === 0) {
      const errorMessages = processedScenarios.filter(s => s.error).map(s => `(${s.name}: ${s.error})`).join('; ');
      alert(`No valid Fixed Income scenarios could be processed for comparison. Please check that your calculator instances have saved data. Errors: ${errorMessages}`);
      return;
    }
    
    setScenarios(validScenarios);
    setComparisonData({ 
      type: 'fixed_income', 
      data: validScenarios 
    });
  };

  const runMortgageComparison = async (instances) => {
    console.log("Running Debt Repayment comparison for:", instances);
    
    const processedScenarios = instances.map(instance => {
      try {
        const comparisonData = extractMortgageComparisonData(instance.state_data, clients);
        
        if (!comparisonData) {
          return {
            id: instance.id,
            name: instance.scenario_name || instance.name,
            error: "Unable to extract comparison data - no valid state data found"
          };
        }

        return {
          id: instance.id,
          name: instance.scenario_name || instance.name,
          projectionData: comparisonData.projectionData,
          finalMetrics: comparisonData.finalMetrics
        };
      } catch (error) {
        console.error(`Error processing instance ${instance.id}:`, error);
        return {
          id: instance.id,
          name: instance.scenario_name || instance.name,
          error: `Processing error: ${error.message}`
        };
      }
    });

    // Filter out any scenarios with errors
    const validScenarios = processedScenarios.filter(s => !s.error);
    
    if (validScenarios.length === 0) {
      alert("No valid scenarios could be processed for comparison. Please check that your calculator instances have saved data.");
      return;
    }
    
    setScenarios(validScenarios);
    setComparisonData({ 
      type: 'mortgage', 
      data: validScenarios 
    });
  };

  const selectedCalculatorType = CALCULATOR_TYPES.find(type => type.value === calculatorType);

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <GitCompare className="w-8 h-8 text-blue-600" />
            Scenario Comparison
          </h1>
          <p className="text-slate-600">
            Compare multiple calculator scenarios to analyze different financial strategies and outcomes.
          </p>
        </div>

        {/* Calculator Type Selection */}
        <Card className="mb-6 border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Select Calculator Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CALCULATOR_TYPES.map(type => {
                const Icon = type.icon;
                const isSelected = calculatorType === type.value;
                return (
                  <div
                    key={type.value}
                    onClick={() => setCalculatorType(type.value)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-lg'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                      <h3 className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                        {type.label}
                      </h3>
                    </div>
                    <p className={`text-sm ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                      {type.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Instance Selection */}
        <Card className="mb-6 border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                {selectedCalculatorType && <selectedCalculatorType.icon className="w-5 h-5 text-gray-600" />}
                Select {selectedCalculatorType?.label} Instances
              </CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Choose 2 or more instances to compare their results side-by-side
              </p>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex-grow md:w-56">
                    <ClientCombobox
                        clients={clients}
                        value={selectedClientId}
                        onChange={setSelectedClientId}
                        placeholder="Filter by Client..."
                        showAllOption
                    />
                </div>
                <Badge variant="outline" className="text-blue-600 flex-shrink-0">
                  {selectedInstances.length} selected
                </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8 text-slate-600">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Loading calculator instances...</span>
              </div>
            ) : availableInstances.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Calculator className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-semibold">No {selectedCalculatorType?.label} Instances Found</p>
                <p>
                  {selectedClientId !== 'all' 
                    ? "Try selecting 'All Clients' or create an instance for this client." 
                    : "Create some calculator instances first to enable scenario comparison."
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableInstances.map(instance => (
                  <div
                    key={instance.id}
                    className={`p-4 border rounded-lg transition-all duration-200 ${
                      selectedInstances.includes(instance.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedInstances.includes(instance.id)}
                        onCheckedChange={(checked) => handleInstanceSelection(instance.id, checked)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate">
                          {instance.name}
                        </h4>
                        {instance.scenario_name && (
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                            {instance.scenario_name}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {instance.created_date && (
                            <Badge variant="secondary" className="text-xs">
                              {new Date(instance.created_date).toLocaleDateString()}
                            </Badge>
                          )}
                          {instance.client_ids && instance.client_ids[0] && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {clients.find(c => c.id === instance.client_ids[0])?.first_name || 'Client'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {availableInstances.length > 0 && (
              <div className="flex justify-end mt-6">
                <Button
                  onClick={runComparison}
                  disabled={selectedInstances.length < 2 || isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Running Comparison...
                    </>
                  ) : (
                    <>
                      <GitCompare className="w-4 h-4 mr-2" />
                      Compare Selected ({selectedInstances.length})
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comparison Results */}
        {comparisonData && (
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Comparison Results</CardTitle>
            </CardHeader>
            <CardContent>
              {(comparisonData.type === 'main_view' || comparisonData.type === 'capital_assets' || comparisonData.type === 'fixed_income' || comparisonData.type === 'mortgage') && scenarios.length > 0 ? (
                <div className="space-y-6">
                  <SummaryTable data={scenarios} comparisonType={comparisonData.type} />
                  <ComparisonCharts data={scenarios} comparisonType={comparisonData.type} />
                  <ScenarioAIAnalysis data={scenarios} comparisonType={comparisonData.type} />
                </div>
              ) : comparisonData.message ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4 text-amber-500" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {comparisonData.message}
                  </h3>
                  <p className="text-slate-600 mb-4">
                    Selected instances for comparison:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {comparisonData.instances && comparisonData.instances.map((instance, index) => (
                      <Badge key={instance.id || index} variant="outline" className="text-sm">
                        {instance.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
