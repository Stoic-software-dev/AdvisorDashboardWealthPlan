
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { UploadFile, ExtractDataFromUploadedFile } from "@/api/integrations";
import { Portfolio, CashFlow } from "@/api/entities";
import { X, Loader2, FileUp, AlertCircle, Sparkles, CheckCircle, Plus, Calculator } from "lucide-react";

const extractionSchema = {
  type: "object",
  properties: {
    portfolios: {
      type: "array",
      description: "A list of all investment accounts found in the statement.",
      items: {
        type: "object",
        properties: {
          account_name: {
            type: "string",
            description: "The full name/description of the account as it appears on the statement"
          },
          account_number: {
            type: "string", 
            description: "The account or plan number"
          },
          account_holder: {
            type: "string",
            description: "Name of the account owner/holder"
          },
          statement_date: {
            type: "string",
            format: "date",
            description: "Date of the statement"
          },
          current_market_value: {
            type: "number",
            description: "Current total market value of the account"
          },
          previous_market_value: {
            type: "number",
            description: "Previous period market value if available"
          },
          cash_balance: {
            type: "number",
            description: "Cash component or balance within the account"
          },
          cash_flows: {
            type: "array",
            description: "Deposits, withdrawals, and other cash flows during the period",
            items: {
              type: "object",
              properties: {
                date: {
                  type: "string",
                  format: "date",
                  description: "Transaction date"
                },
                type: {
                  type: "string",
                  enum: ["deposit", "withdrawal", "dividend", "fee"],
                  description: "Type of cash flow"
                },
                amount: {
                  type: "number",
                  description: "Amount (positive for inflows, negative for outflows)"
                },
                description: {
                  type: "string",
                  description: "Transaction description"
                }
              }
            }
          }
        },
        required: ["account_name", "current_market_value"]
      }
    }
  },
  required: ["portfolios"]
};

export default function UploadStatementDialog({ clients, onClose, onComplete }) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Review, 3: Cash Flows, 4: Complete
  const [file, setFile] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [extractedPortfolios, setExtractedPortfolios] = useState([]);
  const [portfolioConfigs, setPortfolioConfigs] = useState({});

  // Add utility function for delayed execution
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleProcessStatement = async () => {
    if (!file || !selectedClientId) {
      setError("Please select a client and a statement file.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { file_url } = await UploadFile({ file });
      const extractionResult = await ExtractDataFromUploadedFile({
        file_url,
        json_schema: extractionSchema
      });

      if (extractionResult.status === "success" && extractionResult.output.portfolios) {
        const portfoliosWithDefaults = extractionResult.output.portfolios.map(p => ({
          ...p,
          account_type: 'taxable',
          id: Math.random().toString(36).substr(2, 9) // temp id
        }));
        
        setExtractedPortfolios(portfoliosWithDefaults);
        
        // Initialize portfolio configurations
        const initialConfigs = {};
        portfoliosWithDefaults.forEach(p => {
          initialConfigs[p.id] = {
            is_new: false,
            account_type: 'taxable',
            manual_cash_flows: []
          };
        });
        setPortfolioConfigs(initialConfigs);
        
        setStep(2);
      } else {
        throw new Error(extractionResult.details || "Failed to extract data from the statement.");
      }
    } catch (err) {
      console.error(err);
      setError(`An error occurred: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePortfolioConfigChange = (tempId, field, value) => {
    setPortfolioConfigs(prev => ({
      ...prev,
      [tempId]: {
        ...prev[tempId],
        [field]: value
      }
    }));
  };

  const addManualCashFlow = (tempId) => {
    setPortfolioConfigs(prev => ({
      ...prev,
      [tempId]: {
        ...prev[tempId],
        manual_cash_flows: [
          ...prev[tempId].manual_cash_flows,
          { date: '', type: 'deposit', amount: '', description: '' }
        ]
      }
    }));
  };

  const updateManualCashFlow = (tempId, index, field, value) => {
    setPortfolioConfigs(prev => ({
      ...prev,
      [tempId]: {
        ...prev[tempId],
        manual_cash_flows: prev[tempId].manual_cash_flows.map((cf, i) => 
          i === index ? { ...cf, [field]: value } : cf
        )
      }
    }));
  };

  const removeManualCashFlow = (tempId, index) => {
    setPortfolioConfigs(prev => ({
      ...prev,
      [tempId]: {
        ...prev[tempId],
        manual_cash_flows: prev[tempId].manual_cash_flows.filter((_, i) => i !== index)
      }
    }));
  };

  const calculatePerformance = (portfolio, config) => {
    const currentValue = portfolio.current_market_value;
    const previousValue = config.is_new 
      ? (config.inception_value || portfolio.previous_market_value || 0)
      : (portfolio.previous_market_value || currentValue);
    
    // Calculate total cash flows
    const extractedCashFlows = portfolio.cash_flows || [];
    const manualCashFlows = config.manual_cash_flows.filter(cf => cf.amount);
    const allCashFlows = [...extractedCashFlows, ...manualCashFlows];
    
    const totalCashFlow = allCashFlows.reduce((sum, cf) => {
      const amount = parseFloat(cf.amount) || 0;
      return sum + (cf.type === 'withdrawal' || cf.type === 'fee' ? -Math.abs(amount) : Math.abs(amount));
    }, 0);

    // Time-weighted return calculation: (Ending Value - Beginning Value - Net Cash Flow) / (Beginning Value + Cash Flow)
    const gainLoss = currentValue - previousValue - totalCashFlow;
    const adjustedBeginning = previousValue + (totalCashFlow / 2); // Simple approximation
    const performance = adjustedBeginning > 0 ? (gainLoss / adjustedBeginning) * 100 : 0;

    return {
      performance: performance,
      totalCashFlow: totalCashFlow,
      gainLoss: gainLoss
    };
  };

  const handleCreatePortfolios = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      let successCount = 0;
      const totalPortfolios = extractedPortfolios.length;

      for (let i = 0; i < extractedPortfolios.length; i++) {
        const portfolio = extractedPortfolios[i];
        const config = portfolioConfigs[portfolio.id];
        
        try {
          // Add progress indication
          setError(`Processing portfolio ${i + 1} of ${totalPortfolios}: ${portfolio.account_name}...`);
          
          const performance = calculatePerformance(portfolio, config);
          
          // Create portfolio with retry logic
          const portfolioData = {
            client_id: selectedClientId,
            account_name: portfolio.account_name,
            account_number: portfolio.account_number,
            account_type: config.account_type,
            total_value: portfolio.current_market_value,
            cash_balance: portfolio.cash_balance || 0,
            last_updated: portfolio.statement_date || new Date().toISOString().split('T')[0],
            performance_ytd: performance.performance,
            performance_1yr: performance.performance,
            previous_value: config.is_new 
              ? (config.inception_value || portfolio.previous_market_value || 0)
              : (portfolio.previous_market_value || portfolio.current_market_value),
            inception_date: config.is_new ? config.inception_date : undefined
          };

          let newPortfolio;
          let retryCount = 0;
          const maxRetries = 3;

          while (retryCount < maxRetries) {
            try {
              newPortfolio = await Portfolio.create(portfolioData);
              break;
            } catch (createError) {
              retryCount++;
              if (createError.message?.includes('Rate limit') && retryCount < maxRetries) {
                await delay(2000 * retryCount); // Progressive delay: 2s, 4s, 6s
                continue;
              }
              throw createError;
            }
          }

          // Add delay between portfolio creation and cash flow processing
          await delay(500);
          
          // Process cash flows with batch processing and delays
          const extractedCashFlows = portfolio.cash_flows || [];
          const manualCashFlows = config.manual_cash_flows.filter(cf => cf.amount);
          const allCashFlows = [...extractedCashFlows, ...manualCashFlows];
          
          // Process cash flows in smaller batches
          const batchSize = 3;
          const cashFlowBatches = [];
          
          for (let j = 0; j < allCashFlows.length; j += batchSize) {
            cashFlowBatches.push(allCashFlows.slice(j, j + batchSize));
          }

          for (let batchIndex = 0; batchIndex < cashFlowBatches.length; batchIndex++) {
            const batch = cashFlowBatches[batchIndex];
            
            // Process each cash flow in the batch with individual error handling
            for (const cashFlow of batch) {
              if (cashFlow.amount) {
                let retryCount = 0;
                const maxRetries = 3;
                
                while (retryCount < maxRetries) {
                  try {
                    await CashFlow.create({
                      portfolio_id: newPortfolio.id,
                      transaction_date: cashFlow.date,
                      transaction_type: cashFlow.type,
                      amount: parseFloat(cashFlow.amount),
                      description: cashFlow.description || '',
                      is_manual: manualCashFlows.includes(cashFlow)
                    });
                    break;
                  } catch (cashFlowError) {
                    retryCount++;
                    if (cashFlowError.message?.includes('Rate limit') && retryCount < maxRetries) {
                      await delay(1500 * retryCount); // Progressive delay
                      continue;
                    }
                    console.warn(`Failed to create cash flow for ${portfolio.account_name}:`, cashFlowError.message);
                    break; // Don't fail the entire process for individual cash flow errors
                  }
                }
              }
            }
            
            // Delay between batches to prevent rate limiting
            if (batchIndex < cashFlowBatches.length - 1) {
              await delay(1000);
            }
          }
          
          successCount++;
          
          // Delay between portfolios to prevent rate limiting
          if (i < extractedPortfolios.length - 1) {
            await delay(1500);
          }
          
        } catch (portfolioError) {
          console.error(`Failed to create portfolio ${portfolio.account_name}:`, portfolioError);
          setError(`Warning: Failed to create portfolio "${portfolio.account_name}". Error: ${portfolioError.message}`);
          await delay(2000); // Wait longer before continuing
        }
      }
      
      if (successCount > 0) {
        setError(null);
        setStep(4);
      } else {
        throw new Error("Failed to create any portfolios. Please check your data and try again.");
      }
      
    } catch (err) {
      console.error(err);
      setError(`Failed to create portfolios: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <>
      <DialogHeader>
        <DialogTitle>Upload Investment Statement</DialogTitle>
        <DialogDescription>
          Select a client and upload their investment statement. The AI will extract account details, values, and cash flows.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <Label htmlFor="client-select">Select Client *</Label>
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger id="client-select">
              <SelectValue placeholder="Choose a client..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>
                  {client.first_name} {client.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="statement-file">Investment Statement *</Label>
          <Input 
            id="statement-file" 
            type="file" 
            accept=".pdf,.png,.jpg,.jpeg" 
            onChange={handleFileChange}
          />
          <p className="text-xs text-slate-500 mt-1">
            Supports PDF, PNG, JPG files. AI will extract account details, values, and cash flows.
          </p>
        </div>
        {error && (
          <Alert variant={error.includes('Warning') ? "default" : "destructive"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{error.includes('Warning') ? 'Warning' : 'Error'}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleProcessStatement} disabled={isLoading || !file || !selectedClientId}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Process Statement
        </Button>
      </DialogFooter>
    </>
  );

  const renderStep2 = () => (
    <>
      <DialogHeader>
        <DialogTitle>Review Extracted Portfolios</DialogTitle>
        <DialogDescription>
          Review the accounts extracted from the statement and configure each one.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
        {extractedPortfolios.map((portfolio) => {
          const config = portfolioConfigs[portfolio.id] || {};
          const performance = calculatePerformance(portfolio, config);
          
          return (
            <Card key={portfolio.id} className="border border-slate-200">
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500">Account Name</Label>
                    <p className="font-semibold">{portfolio.account_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Account Number</Label>
                    <p className="font-medium">{portfolio.account_number || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Account Holder</Label>
                    <p className="font-medium">{portfolio.account_holder || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Current Value</Label>
                    <p className="font-semibold text-green-600">
                      ${portfolio.current_market_value?.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Account Type *</Label>
                    <Select 
                      value={config.account_type} 
                      onValueChange={(value) => handlePortfolioConfigChange(portfolio.id, 'account_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rrsp">RRSP</SelectItem>
                        <SelectItem value="rrif">RRIF</SelectItem>
                        <SelectItem value="tfsa">TFSA</SelectItem>
                        <SelectItem value="resp">RESP</SelectItem>
                        <SelectItem value="lira">LIRA</SelectItem>
                        <SelectItem value="lif">LIF</SelectItem>
                        <SelectItem value="taxable">Non-Registered</SelectItem>
                        <SelectItem value="corporate">Corporate</SelectItem>
                        <SelectItem value="trust">Trust</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={config.is_new}
                      onCheckedChange={(checked) => handlePortfolioConfigChange(portfolio.id, 'is_new', checked)}
                    />
                    <Label className="text-sm">This is a new portfolio</Label>
                  </div>
                </div>

                {config.is_new && (
                  <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded-lg">
                    <div>
                      <Label>Inception Date</Label>
                      <Input
                        type="date"
                        value={config.inception_date || ''}
                        onChange={(e) => handlePortfolioConfigChange(portfolio.id, 'inception_date', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Initial Value</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={config.inception_value || ''}
                        onChange={(e) => handlePortfolioConfigChange(portfolio.id, 'inception_value', e.target.value)}
                        placeholder="Enter initial investment"
                      />
                    </div>
                  </div>
                )}

                {/* Cash Flows Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Cash Flows</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addManualCashFlow(portfolio.id)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Manual Entry
                    </Button>
                  </div>
                  
                  {/* Extracted Cash Flows */}
                  {portfolio.cash_flows && portfolio.cash_flows.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">From Statement:</Label>
                      {portfolio.cash_flows.map((cf, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded">
                          <span className="font-medium">{cf.date}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            cf.type === 'deposit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {cf.type}
                          </span>
                          <span className="font-medium">${Math.abs(cf.amount).toLocaleString()}</span>
                          <span className="text-slate-600">{cf.description}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Manual Cash Flows */}
                  {config.manual_cash_flows && config.manual_cash_flows.map((cf, index) => (
                    <div key={index} className="grid grid-cols-5 gap-2 items-center">
                      <Input
                        type="date"
                        value={cf.date}
                        onChange={(e) => updateManualCashFlow(portfolio.id, index, 'date', e.target.value)}
                        placeholder="Date"
                      />
                      <Select
                        value={cf.type}
                        onValueChange={(value) => updateManualCashFlow(portfolio.id, index, 'type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deposit">Deposit</SelectItem>
                          <SelectItem value="withdrawal">Withdrawal</SelectItem>
                          <SelectItem value="dividend">Dividend</SelectItem>
                          <SelectItem value="fee">Fee</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        value={cf.amount}
                        onChange={(e) => updateManualCashFlow(portfolio.id, index, 'amount', e.target.value)}
                        placeholder="Amount"
                      />
                      <Input
                        value={cf.description}
                        onChange={(e) => updateManualCashFlow(portfolio.id, index, 'description', e.target.value)}
                        placeholder="Description"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeManualCashFlow(portfolio.id, index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Performance Preview */}
                <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                  <Calculator className="w-5 h-5 text-slate-500" />
                  <div className="text-sm">
                    <span className="text-slate-600">Calculated Performance: </span>
                    <span className={`font-semibold ${performance.performance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {performance.performance >= 0 ? '+' : ''}{performance.performance.toFixed(2)}%
                    </span>
                    <span className="text-slate-500 ml-2">
                      (Cash Flow: ${performance.totalCashFlow.toLocaleString()})
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {error && (
          <Alert variant={error.includes('Warning') || error.includes('Processing') ? "default" : "destructive"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {error.includes('Warning') ? 'Warning' : error.includes('Processing') ? 'Status' : 'Error'}
            </AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setStep(1)} disabled={isLoading}>Back</Button>
        <Button onClick={handleCreatePortfolios} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Portfolios...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Create {extractedPortfolios.length} Portfolio{extractedPortfolios.length > 1 ? 's' : ''}
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  );

  const renderStep4 = () => (
    <>
      <DialogHeader>
        <DialogTitle>Upload Complete</DialogTitle>
      </DialogHeader>
      <div className="py-8 text-center flex flex-col items-center">
        <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          Successfully processed {extractedPortfolios.length} portfolio{extractedPortfolios.length > 1 ? 's' : ''}
        </h3>
        <p className="text-slate-500">
          All portfolios have been created with performance calculations and cash flow tracking.
        </p>
      </div>
      <DialogFooter>
        <Button onClick={onComplete} className="w-full">Done</Button>
      </DialogFooter>
    </>
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 4 && renderStep4()}
      </DialogContent>
    </Dialog>
  );
}
