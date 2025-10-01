
import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GitCompareArrows, Scale, Users, Undo2 } from "lucide-react";
import { NetWorthStatement, Liability } from "@/api/entities";
import MultiClientSelector from '../shared/MultiClientSelector';
import GiuseppeAIOptimizer from '../shared/GiuseppeAIOptimizer';

// --- Utility Functions ---
const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
};

const formatPercentage = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return `${num.toFixed(2)}%`;
};

const parseValue = (value) => {
  if (typeof value !== 'string') return value || '';
  return value.replace(/[^0-9.-]+/g, "");
};

// --- Initial State ---
const emptyFormData = {
  calculator_name: "",
  client_ids: [],
  debt1: {
    name: "Scenario 1",
    debtAmount: 0,
    interestRate: 0,
    amortizationYears: 25,
    extraPayment: 0,
  },
  debt2: {
    name: "Scenario 2", 
    debtAmount: 0,
    interestRate: 0,
    amortizationYears: 25,
    extraPayment: 0,
  }
};

const DebtScenarioForm = ({ scenario, setScenario, scenarioNumber, liabilities, clients, disabled }) => {
  const [displayValues, setDisplayValues] = useState({});

  useEffect(() => {
    setDisplayValues({
      debtAmount: formatCurrency(scenario.debtAmount),
      interestRate: formatPercentage(scenario.interestRate),
      extraPayment: formatCurrency(scenario.extraPayment),
    });
  }, [scenario]);

  const handleInputChange = (field, value) => {
    setScenario({
      ...scenario,
      [field]: value
    });
  };

  const handleDisplayChange = (field, value) => {
    setDisplayValues(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field, type) => {
    const rawValue = parseValue(displayValues[field]);
    const parsed = parseFloat(rawValue);
    const finalValue = !isNaN(parsed) ? parsed : 0;
    
    handleInputChange(field, finalValue);

    if (type === 'currency') setDisplayValues(prev => ({ ...prev, [field]: formatCurrency(finalValue) }));
    if (type === 'percentage') setDisplayValues(prev => ({ ...prev, [field]: formatPercentage(finalValue) }));
  };

  const handleFocus = (field) => {
    setDisplayValues(prev => ({ ...prev, [field]: parseValue(prev[field]) }));
  };

  const handleLiabilitySelection = (liabilityId) => {
    if (!liabilityId || liabilityId === 'none') return;
    const selectedLiability = liabilities.find(l => l.id === liabilityId);
    if (selectedLiability) {
        setScenario({
            ...scenario,
            name: selectedLiability.liability_name,
            debtAmount: selectedLiability.liability_value || 0,
            interestRate: selectedLiability.interest_rate || 0,
            amortizationYears: selectedLiability.amortization_in_months ? Math.round(selectedLiability.amortization_in_months / 12) : 25,
            extraPayment: 0, // Reset extra payment on new selection
        });
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : 'Unknown Client';
  }

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>Debt Scenario {scenarioNumber}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
            <Label htmlFor={`liability-select-${scenarioNumber}`}>Select from Net Worth Statement (Optional)</Label>
            <Select onValueChange={handleLiabilitySelection} disabled={disabled || liabilities.length === 0}>
                <SelectTrigger id={`liability-select-${scenarioNumber}`}>
                    <SelectValue placeholder={liabilities.length === 0 ? "No liabilities found" : "Select a liability"} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">Manual Entry</SelectItem>
                    {liabilities.map(liability => (
                        <SelectItem key={liability.id} value={liability.id}>
                            {getClientName(liability.owner_client_id)} - {liability.liability_name} ({formatCurrency(liability.liability_value)})
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <Separator />
        <div>
          <Label htmlFor={`name-${scenarioNumber}`}>Scenario Name</Label>
          <Input id={`name-${scenarioNumber}`} value={scenario.name} onChange={e => handleInputChange('name', e.target.value)} placeholder={`e.g., Mortgage on Main St.`} disabled={disabled}/>
        </div>
        <div>
          <Label htmlFor={`debtAmount-${scenarioNumber}`}>Debt Amount</Label>
          <Input id={`debtAmount-${scenarioNumber}`} value={displayValues.debtAmount} onChange={e => handleDisplayChange('debtAmount', e.target.value)} onBlur={() => handleBlur('debtAmount', 'currency')} onFocus={() => handleFocus('debtAmount')} disabled={disabled}/>
        </div>
        <div>
          <Label htmlFor={`interestRate-${scenarioNumber}`}>Interest Rate</Label>
          <Input id={`interestRate-${scenarioNumber}`} value={displayValues.interestRate} onChange={e => handleDisplayChange('interestRate', e.target.value)} onBlur={() => handleBlur('interestRate', 'percentage')} onFocus={() => handleFocus('interestRate')} disabled={disabled}/>
        </div>
        <div>
          <Label htmlFor={`amortizationYears-${scenarioNumber}`}>Amortization (Years)</Label>
          <Input id={`amortizationYears-${scenarioNumber}`} type="number" value={scenario.amortizationYears} onChange={e => handleInputChange('amortizationYears', parseInt(e.target.value, 10))} disabled={disabled}/>
        </div>
        <div>
          <Label htmlFor={`extraPayment-${scenarioNumber}`}>Extra Monthly Payment</Label>
          <Input id={`extraPayment-${scenarioNumber}`} value={displayValues.extraPayment} onChange={e => handleDisplayChange('extraPayment', e.target.value)} onBlur={() => handleBlur('extraPayment', 'currency')} onFocus={() => handleFocus('extraPayment')} disabled={disabled}/>
        </div>
      </CardContent>
    </Card>
  );
};

function DebtComparisonCalculator({ clients, goals, portfolios, isLoading, preselectedClientId, initialState, isViewer = false, onNameChange }, ref) {
  const [formData, setFormData] = useState({
    ...emptyFormData,
    client_ids: preselectedClientId ? [preselectedClientId] : []
  });
  const [results, setResults] = useState(null);
  const [liabilities, setLiabilities] = useState([]);
  const [loadingLiabilities, setLoadingLiabilities] = useState(false);

  useImperativeHandle(ref, () => ({
    getState: () => ({
      formData,
      results
    })
  }));

  useEffect(() => {
    if (initialState?.formData) {
      let clientIds = initialState.formData.client_ids;
      if (!clientIds && preselectedClientId) {
        clientIds = [preselectedClientId];
      } else if (!clientIds) {
        clientIds = [];
      }

      const safeFormData = {
        ...emptyFormData,
        ...initialState.formData,
        client_ids: clientIds,
      };
      setFormData(safeFormData);
      
      if (initialState.results) {
        setResults(initialState.results);
      }
    } else {
      setFormData({
        ...emptyFormData,
        client_ids: preselectedClientId ? [preselectedClientId] : [],
      });
    }
  }, [initialState, preselectedClientId]);

  const handleFormDataChange = useCallback((field, value) => {
    if (field === 'calculator_name' && onNameChange) {
      onNameChange(value);
    }
    setFormData(prev => ({
      ...prev,
      [field]: value === null || value === undefined || value === "null" ? "" : value
    }));
  }, [onNameChange]);

  const fetchLiabilities = useCallback(async () => {
    if (formData.client_ids.length === 0) {
      setLiabilities([]);
      return;
    }
    setLoadingLiabilities(true);
    try {
      const allLiabilities = [];
      const seenLiabilityIds = new Set(); // Prevent duplicates on joint statements

      for (const clientId of formData.client_ids) {
        const statements = await NetWorthStatement.filter({ client_ids: [clientId] }, '-statement_date', 1);
        if (statements && statements.length > 0) {
          const latestStatement = statements[0];
          const clientLiabilities = await Liability.filter({ statement_id: latestStatement.id });
          
          if(clientLiabilities) {
            for (const l of clientLiabilities) {
              if (seenLiabilityIds.has(l.id)) continue;

              // Determine the owner client ID for the liability
              // Check if owner_client_id is explicitly set and exists in the 'clients' array
              const ownerExists = clients.some(c => c.id === l.owner_client_id);
              const ownerId = (l.owner_client_id && ownerExists) ? l.owner_client_id : clientId;
              
              allLiabilities.push({ ...l, owner_client_id: ownerId });
              seenLiabilityIds.add(l.id);
            }
          }
        }
      }
      setLiabilities(allLiabilities);
    } catch (error) {
      console.error("Error fetching liabilities:", error);
      setLiabilities([]);
    }
    setLoadingLiabilities(false);
  }, [formData.client_ids, clients]);

  useEffect(() => {
    fetchLiabilities();
  }, [fetchLiabilities]);
  
  const calculateAmortization = (debt) => {
    const principal = parseFloat(debt.debtAmount);
    if (principal <= 0) return null;

    const interestRate = parseFloat(debt.interestRate) / 100;
    const amortizationYears = parseInt(debt.amortizationYears);
    const extraPayment = parseFloat(debt.extraPayment) || 0;
    
    const monthlyRate = interestRate / 12;
    const numberOfPayments = amortizationYears * 12;

    let monthlyPayment = 0;
    if (monthlyRate > 0) {
      monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    } else {
      monthlyPayment = principal / numberOfPayments;
    }
    
    const totalMonthlyPayment = monthlyPayment + extraPayment;
    
    let balance = principal;
    let totalInterest = 0;
    let months = 0;
    
    while (balance > 0) {
      let interestForMonth = balance * monthlyRate;
      let principalForMonth = totalMonthlyPayment - interestForMonth;
      
      if (balance < totalMonthlyPayment) {
        principalForMonth = balance;
        balance = 0;
      } else {
        balance -= principalForMonth;
      }
      
      totalInterest += interestForMonth;
      months++;

      if (months > amortizationYears * 12 * 2) { // Safety break
        break;
      }
    }
    
    const totalPaid = principal + totalInterest;
    return {
      monthlyPayment: Math.round(totalMonthlyPayment),
      totalInterest: Math.round(totalInterest),
      totalPaid: Math.round(totalPaid),
      payoffTimeYears: Math.floor(months / 12),
      payoffTimeMonths: months % 12,
    };
  };

  const handleCalculate = () => {
    const result1 = calculateAmortization(formData.debt1);
    const result2 = calculateAmortization(formData.debt2);
    const newResults = { debt1: result1, debt2: result2 };
    setResults(newResults);
  };

  const handleClearFields = () => {
    setFormData({
      ...emptyFormData,
      client_ids: preselectedClientId ? [preselectedClientId] : []
    });
    setResults(null);
    setLiabilities([]);
  };
  
  return (
    <fieldset disabled={isViewer} className="space-y-6">
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <GitCompareArrows className="w-5 h-5 text-indigo-600" />
              Debt Comparison Calculator
            </CardTitle>
            {!isViewer && (
              <Button variant="outline" onClick={handleClearFields}>
                <Undo2 className="w-4 h-4 mr-2" />
                Clear Fields
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="calculator_name">Calculator Name</Label>
              <Input
                id="calculator_name"
                value={formData.calculator_name}
                onChange={(e) => handleFormDataChange('calculator_name', e.target.value)}
                placeholder="Enter calculator name"
                disabled={isViewer}
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Associated Clients</Label>
              <MultiClientSelector
                clients={clients}
                selectedClientIds={formData.client_ids}
                onSelectionChange={(selectedIds) => handleFormDataChange('client_ids', selectedIds)}
                placeholder="Select up to two clients..."
                maxSelection={2}
                disabled={isViewer}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row gap-6">
        <DebtScenarioForm 
          scenario={formData.debt1} 
          setScenario={(updatedDebt1) => setFormData(prev => ({...prev, debt1: updatedDebt1}))} 
          scenarioNumber={1} 
          liabilities={liabilities} 
          clients={clients} 
          disabled={isViewer || loadingLiabilities} 
        />
        <DebtScenarioForm 
          scenario={formData.debt2} 
          setScenario={(updatedDebt2) => setFormData(prev => ({...prev, debt2: updatedDebt2}))} 
          scenarioNumber={2} 
          liabilities={liabilities} 
          clients={clients} 
          disabled={isViewer || loadingLiabilities} 
        />
      </div>
      
      <div className="flex justify-center">
        <Button onClick={handleCalculate} size="lg" className="px-8 bg-indigo-600 hover:bg-indigo-700" disabled={isViewer}>
          <GitCompareArrows className="w-5 h-5 mr-2"/>
          Compare Scenarios
        </Button>
      </div>

      {results && (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Scale className="w-5 h-5 text-indigo-600"/> Comparison Results</CardTitle>
            <CardDescription>A side-by-side analysis of the two debt scenarios.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Metric</TableHead>
                  <TableHead className="text-center font-semibold text-slate-700">{formData.debt1.name}</TableHead>
                  <TableHead className="text-center font-semibold text-slate-700">{formData.debt2.name}</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">Difference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Payoff Time</TableCell>
                  <TableCell className="text-center">{results.debt1 ? `${results.debt1.payoffTimeYears}y ${results.debt1.payoffTimeMonths}m` : 'N/A'}</TableCell>
                  <TableCell className="text-center">{results.debt2 ? `${results.debt2.payoffTimeYears}y ${results.debt2.payoffTimeMonths}m` : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                      {results.debt1 && results.debt2 ? 
                          `${Math.abs(results.debt1.payoffTimeYears - results.debt2.payoffTimeYears)}y ${Math.abs(results.debt1.payoffTimeMonths - results.debt2.payoffTimeMonths)}m`
                          : 'N/A'
                      }
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total Interest Paid</TableCell>
                  <TableCell className="text-center">{results.debt1 ? formatCurrency(results.debt1.totalInterest) : 'N/A'}</TableCell>
                  <TableCell className="text-center">{results.debt2 ? formatCurrency(results.debt2.totalInterest) : 'N/A'}</TableCell>
                  <TableCell className="text-right text-red-600">{results.debt1 && results.debt2 ? formatCurrency(results.debt1.totalInterest - results.debt2.totalInterest) : 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total Payments Made</TableCell>
                  <TableCell className="text-center">{results.debt1 ? formatCurrency(results.debt1.totalPaid) : 'N/A'}</TableCell>
                  <TableCell className="text-center">{results.debt2 ? formatCurrency(results.debt2.totalPaid) : 'N/A'}</TableCell>
                  <TableCell className="text-right">{results.debt1 && results.debt2 ? formatCurrency(results.debt1.totalPaid - results.debt2.totalPaid) : 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total Monthly Payment</TableCell>
                  <TableCell className="text-center">{results.debt1 ? formatCurrency(results.debt1.monthlyPayment) : 'N/A'}</TableCell>
                  <TableCell className="text-center">{results.debt2 ? formatCurrency(results.debt2.monthlyPayment) : 'N/A'}</TableCell>
                  <TableCell className="text-right">{results.debt1 && results.debt2 ? formatCurrency(results.debt1.monthlyPayment - results.debt2.monthlyPayment) : 'N/A'}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <GiuseppeAIOptimizer
        calculatorName="Debt Comparison Calculator"
        calculatorData={{
          inputs: formData,
          results: results
        }}
      />
    </fieldset>
  );
}

export default forwardRef(DebtComparisonCalculator);
