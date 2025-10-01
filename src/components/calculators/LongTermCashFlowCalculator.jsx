
import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { Calculator, DollarSign, TrendingUp, RotateCcw, Table, FileDigit, Download } from "lucide-react";
import MultiClientSelector from "../shared/MultiClientSelector";
import { CashFlowStatement, IncomeItem, ExpenseItem } from "@/api/entities";
import { differenceInYears } from "date-fns";

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

const emptyFormData = {
  client_ids: [],
  calculator_name: "Long-Term Cash Flow Plan",
  current_age: 45,
  projection_end_age: 95,
  inflation_rate: 2.5,
  income_items: [],
  expense_items: [],
};

const LongTermCashFlowCalculator = forwardRef(({ initialState, clients, isLoading, isViewer = false, onNameChange }, ref) => {
  const [formData, setFormData] = useState(emptyFormData);
  const [displayValues, setDisplayValues] = useState({});
  const [results, setResults] = useState(null);
  const [projectionData, setProjectionData] = useState([]);
  const [viewMode, setViewMode] = useState("summary");
  const [dataSource, setDataSource] = useState("manual");
  const [isDataLoading, setIsDataLoading] = useState(false);

  useEffect(() => {
    setDisplayValues({
      inflation_rate: formatPercentage(formData.inflation_rate),
    });
  }, [formData.inflation_rate]);

  useEffect(() => {
    if (initialState?.formData) {
      setFormData({ ...emptyFormData, ...initialState.formData });
      if (initialState.results) {
        setResults(initialState.results);
        setProjectionData(initialState.projectionData || []);
      }
    }
  }, [initialState]);

  const handleFormDataChange = useCallback((field, value) => {
      if (field === 'calculator_name' && onNameChange) {
          onNameChange(value);
      }
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
  }, [onNameChange]);

  useEffect(() => {
    const primaryClientId = formData.client_ids?.[0];
    if (primaryClientId && clients) {
      const client = clients.find(c => c.id === primaryClientId);
      if (client && client.date_of_birth) {
        const age = differenceInYears(new Date(), new Date(client.date_of_birth));
        handleFormDataChange('current_age', age);
      }
    }
  }, [formData.client_ids, clients, handleFormDataChange]);

  useImperativeHandle(ref, () => ({
    getState: () => ({
      formData,
      results,
      projectionData
    })
  }));
  
  const handleItemChange = (type, index, field, value) => {
      const items = [...formData[type]];
      items[index][field] = value;
      handleFormDataChange(type, items);
  };

  const loadFromCashFlowStatement = async () => {
      if(formData.client_ids.length === 0) {
          alert("Please select a client first.");
          return;
      }
      setIsDataLoading(true);
      try {
        // Updated to use client_ids array format
        let statements;
        try {
          statements = await CashFlowStatement.filter({ client_ids: { $in: [formData.client_ids[0]] } }, "-statement_date");
        } catch (error) {
          // Fallback: fetch all and filter manually
          console.warn("Using fallback filtering for cash flow statements:", error);
          const allStatements = await CashFlowStatement.list();
          statements = allStatements.filter(statement => 
            statement.client_ids && Array.isArray(statement.client_ids) && statement.client_ids.includes(formData.client_ids[0])
          ).sort((a, b) => new Date(b.statement_date) - new Date(a.statement_date));
        }
        
        if (statements && statements.length > 0) {
            const latestStatement = statements[0];
            const [incomeItems, expenseItems] = await Promise.all([
                IncomeItem.filter({statement_id: latestStatement.id}),
                ExpenseItem.filter({statement_id: latestStatement.id}),
            ]);

            const mappedIncomes = incomeItems.map(item => ({...item, start_age: formData.current_age, end_age: formData.projection_end_age, indexing_rate: formData.inflation_rate}));
            const mappedExpenses = expenseItems.map(item => ({...item, start_age: formData.current_age, end_age: formData.projection_end_age, indexing_rate: formData.inflation_rate}));
            
            setFormData(prev => ({...prev, income_items: mappedIncomes, expense_items: mappedExpenses}));
            setDataSource("cash_flow_statement");
            alert(`Successfully loaded ${incomeItems.length} income and ${expenseItems.length} expense items from the latest cash flow statement.`);
        } else {
            alert("No cash flow statements found for the selected client.");
        }
      } catch (error) {
          console.error("Error loading from cash flow statement:", error);
          alert("Failed to load data. Please try again.");
      }
      setIsDataLoading(false);
  };

  const runSimulation = () => {
    let cumulativeNet = 0;
    let totalLifetimeIncome = 0;
    let totalLifetimeExpenses = 0;
    const projection = [];

    for (let age = formData.current_age; age <= formData.projection_end_age; age++) {
      let annualIncome = 0;
      formData.income_items.forEach(item => {
        if (age >= item.start_age && age <= item.end_age) {
          annualIncome += parseFloat(item.amount) * Math.pow(1 + (item.indexing_rate / 100), age - item.start_age);
        }
      });
      totalLifetimeIncome += annualIncome;

      let annualExpenses = 0;
      formData.expense_items.forEach(item => {
        if (age >= item.start_age && age <= item.end_age) {
          annualExpenses += parseFloat(item.amount) * Math.pow(1 + (item.indexing_rate / 100), age - item.start_age);
        }
      });
      totalLifetimeExpenses += annualExpenses;

      const netCashFlow = annualIncome - annualExpenses;
      cumulativeNet += netCashFlow;

      projection.push({
        age,
        annualIncome,
        annualExpenses,
        netCashFlow,
        cumulativeNet
      });
    }

    setProjectionData(projection);
    setResults({
      totalLifetimeIncome,
      totalLifetimeExpenses,
      finalNetCashFlow: cumulativeNet
    });
  };

  const renderItemTable = (type) => {
    const items = formData[type];
    const title = type === 'income_items' ? 'Income Sources' : 'Living Expenses';
    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {items.map((item, index) => (
                        <div key={index} className="grid grid-cols-5 gap-2 items-center p-2 border rounded-md">
                            <Input placeholder="Description" value={item.description} onChange={e => handleItemChange(type, index, 'description', e.target.value)} />
                            <Input placeholder="Amount" type="number" value={item.amount} onChange={e => handleItemChange(type, index, 'amount', e.target.value)} />
                            <Input placeholder="Start Age" type="number" value={item.start_age} onChange={e => handleItemChange(type, index, 'start_age', e.target.value)} />
                            <Input placeholder="End Age" type="number" value={item.end_age} onChange={e => handleItemChange(type, index, 'end_age', e.target.value)} />
                            <Input placeholder="Indexing (%)" type="number" value={item.indexing_rate} onChange={e => handleItemChange(type, index, 'indexing_rate', e.target.value)} />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
  }

  return (
    <fieldset disabled={isViewer} className="space-y-6">
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDigit className="w-6 h-6 text-teal-600" />
            Long-Term Cash Flow Cost Calculator
          </CardTitle>
          <CardDescription>
            Project lifetime income and expenses to understand long-term cash flow dynamics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <Label htmlFor="calculator_name">Plan Name</Label>
                  <Input id="calculator_name" value={formData.calculator_name} onChange={(e) => handleFormDataChange('calculator_name', e.target.value)} />
              </div>
              <div>
                  <Label>Associated Client(s)</Label>
                  <MultiClientSelector
                      clients={clients}
                      selectedClientIds={formData.client_ids}
                      onSelectionChange={(ids) => handleFormDataChange('client_ids', ids)}
                      disabled={isViewer}
                  />
              </div>
            </div>
            <Card>
              <CardHeader><CardTitle>Timeline & Assumptions</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                      <Label>Current Age</Label>
                      <Input type="number" value={formData.current_age} onChange={e => handleFormDataChange('current_age', parseInt(e.target.value))} />
                  </div>
                  <div>
                      <Label>Projection End Age</Label>
                      <Input type="number" value={formData.projection_end_age} onChange={e => handleFormDataChange('projection_end_age', parseInt(e.target.value))} />
                  </div>
                  <div>
                      <Label>Inflation Rate (%)</Label>
                      <Input value={displayValues.inflation_rate} onChange={e => setDisplayValues({...displayValues, inflation_rate: e.target.value})} onBlur={e => handleFormDataChange('inflation_rate', parseFloat(parseValue(e.target.value)))} />
                  </div>
                   <div>
                        <Label className="block mb-2">Data Source</Label>
                        <Button onClick={loadFromCashFlowStatement} disabled={isDataLoading || formData.client_ids.length === 0}>
                            <Download className="w-4 h-4 mr-2"/>
                            {isDataLoading ? 'Loading...' : 'Load from Client Cash Flow'}
                        </Button>
                    </div>
              </CardContent>
            </Card>
        </CardContent>
      </Card>

      {renderItemTable('income_items')}
      {renderItemTable('expense_items')}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setFormData(emptyFormData)}><RotateCcw className="w-4 h-4 mr-2"/>Reset</Button>
        <Button onClick={runSimulation} className="bg-teal-600 hover:bg-teal-700 text-white"><Calculator className="w-4 h-4 mr-2"/>Run Simulation</Button>
      </div>

      {results && (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
                <CardTitle>Cash Flow Simulation Results</CardTitle>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center pt-4">
                    <div className="bg-green-100 p-4 rounded-lg">
                        <p className="text-sm font-medium text-green-800">Total Lifetime Income</p>
                        <p className="text-3xl font-bold text-green-900">{formatCurrency(results.totalLifetimeIncome)}</p>
                    </div>
                    <div className="bg-red-100 p-4 rounded-lg">
                        <p className="text-sm font-medium text-red-800">Total Lifetime Expenses</p>
                        <p className="text-3xl font-bold text-red-900">{formatCurrency(results.totalLifetimeExpenses)}</p>
                    </div>
                     <div className="bg-blue-100 p-4 rounded-lg">
                        <p className="text-sm font-medium text-blue-800">Final Net Cash Flow</p>
                        <p className="text-3xl font-bold text-blue-900">{formatCurrency(results.finalNetCashFlow)}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs value={viewMode} onValueChange={setViewMode}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="summary"><TrendingUp className="w-4 h-4 mr-2"/>Charts</TabsTrigger>
                        <TabsTrigger value="table"><Table className="w-4 h-4 mr-2"/>Data Table</TabsTrigger>
                    </TabsList>
                    <TabsContent value="summary" className="pt-4 h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={projectionData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="age" name="Age"/>
                                <YAxis tickFormatter={(val) => formatCurrency(val).replace('$', '').replace(/,000,000$/, 'M').replace(/,000$/, 'K')}/>
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                <Legend />
                                <Area type="monotone" dataKey="annualIncome" stroke="#22c55e" fill="#22c55e" name="Income"/>
                                <Area type="monotone" dataKey="annualExpenses" stroke="#ef4444" fill="#ef4444" name="Expenses"/>
                            </AreaChart>
                        </ResponsiveContainer>
                    </TabsContent>
                    <TabsContent value="table">
                        <div className="max-h-[500px] overflow-y-auto">
                           <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-slate-50">
                                    <tr>
                                        {['Age', 'Annual Income', 'Annual Expenses', 'Net Cash Flow', 'Cumulative Net'].map(h => <th key={h} className="p-2 text-left font-semibold">{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {projectionData.map(row => (
                                        <tr key={row.age} className="border-b">
                                            <td className="p-2">{row.age}</td>
                                            <td className="p-2 text-green-600">{formatCurrency(row.annualIncome)}</td>
                                            <td className="p-2 text-red-600">{formatCurrency(row.annualExpenses)}</td>
                                            <td className="p-2 font-semibold">{formatCurrency(row.netCashFlow)}</td>
                                            <td className="p-2 font-bold">{formatCurrency(row.cumulativeNet)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                           </table>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
      )}
    </fieldset>
  );
});

export default LongTermCashFlowCalculator;
