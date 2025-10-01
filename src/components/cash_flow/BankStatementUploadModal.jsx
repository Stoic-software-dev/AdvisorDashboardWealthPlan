
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  UploadCloud, 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  Brain,
  Download,
  Edit
} from "lucide-react";
import { UploadFile, ExtractDataFromUploadedFile, InvokeLLM } from '@/api/integrations';

const INCOME_CATEGORIES = [
  "Employment Income",
  "Self-Employment Income", 
  "Pension Income",
  "Investment Income",
  "Rental Income",
  "RRSP/LIF/RRIF/TFSA Withdrawals",
  "Other"
];

const EXPENSE_CATEGORIES = [
  "Mortgage / Rent",
  "Property Taxes", 
  "Utilities",
  "Insurance",
  "Groceries",
  "Transportation",
  "Childcare / Education",
  "Medical / Dental / Extended Health",
  "Travel / Entertainment",
  "Subscriptions / Memberships",
  "Investment",
  "Miscellaneous"
];

export default function BankStatementUploadModal({ 
  isOpen, 
  onClose, 
  onTransactionsProcessed, 
  selectedStatementId,
  householdClients 
}) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedTransactions, setExtractedTransactions] = useState([]);
  const [categorizedTransactions, setCategorizedTransactions] = useState([]);
  const [processingStep, setProcessingStep] = useState('upload'); // upload, extract, categorize, review
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleUploadAndProcess = async () => {
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    setIsUploading(true);
    setError('');
    
    try {
      // Step 1: Upload file
      setProcessingStep('upload');
      const uploadResult = await UploadFile({ file });
      
      // Step 2: Extract transaction data
      setProcessingStep('extract');
      setIsProcessing(true);
      
      const extractionSchema = {
        type: "object",
        properties: {
          transactions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string", description: "Transaction date in YYYY-MM-DD format" },
                description: { type: "string", description: "Transaction description or payee" },
                amount: { type: "number", description: "Transaction amount (positive for deposits/income, negative for withdrawals/expenses)" },
                balance: { type: "number", description: "Account balance after transaction (optional)" }
              },
              required: ["date", "description", "amount"]
            }
          }
        }
      };

      const extractResult = await ExtractDataFromUploadedFile({
        file_url: uploadResult.file_url,
        json_schema: extractionSchema
      });

      if (extractResult.status !== 'success') {
        throw new Error(extractResult.details || 'Failed to extract data from file');
      }

      const transactions = extractResult.output?.transactions || [];
      setExtractedTransactions(transactions);

      // Step 3: AI Categorization
      setProcessingStep('categorize');
      
      const categorizationPrompt = `
You are a financial AI assistant helping categorize bank statement transactions into income and expense categories.

INCOME CATEGORIES: ${INCOME_CATEGORIES.join(', ')}
EXPENSE CATEGORIES: ${EXPENSE_CATEGORIES.join(', ')}

For each transaction, determine:
1. Whether it's income (positive amount/deposit) or expense (negative amount/withdrawal)
2. The most appropriate category from the lists above
3. Which household member it likely belongs to (if determinable from description)

Transactions to categorize:
${transactions.map(t => `${t.date}: ${t.description} - $${t.amount}`).join('\n')}

Return a categorized list with the same transaction data plus category assignments.
      `;

      const categorizationResult = await InvokeLLM({
        prompt: categorizationPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            categorized_transactions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  description: { type: "string" },
                  amount: { type: "number" },
                  type: { type: "string", enum: ["income", "expense"] },
                  category: { type: "string" },
                  suggested_client_id: { type: "string", description: "Client ID if determinable, otherwise null" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  notes: { type: "string", description: "AI reasoning for categorization" }
                }
              }
            }
          }
        }
      });

      const categorizedData = categorizationResult.categorized_transactions || [];
      setCategorizedTransactions(categorizedData.map(t => ({
        ...t,
        selected: true, // Default to selected
        suggested_client_id: t.suggested_client_id || (householdClients[0]?.id || '')
      })));

      setProcessingStep('review');

    } catch (error) {
      console.error("Error processing bank statement:", error);
      setError(`Error processing file: ${error.message}`);
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  const handleTransactionChange = (index, field, value) => {
    setCategorizedTransactions(prev => 
      prev.map((t, i) => i === index ? { ...t, [field]: value } : t)
    );
  };

  const handleConfirmTransactions = () => {
    const selectedTransactions = categorizedTransactions.filter(t => t.selected);
    onTransactionsProcessed(selectedTransactions, selectedStatementId);
    onClose();
  };

  const handleReset = () => {
    setFile(null);
    setExtractedTransactions([]);
    setCategorizedTransactions([]);
    setProcessingStep('upload');
    setError('');
  };

  const getStepTitle = () => {
    switch (processingStep) {
      case 'upload': return 'Upload Bank Statement';
      case 'extract': return 'Extracting Transaction Data...';
      case 'categorize': return 'AI Categorizing Transactions...';
      case 'review': return 'Review & Confirm Transactions';
      default: return 'Upload Bank Statement';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            {getStepTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {processingStep === 'upload' && (
            <div className="space-y-4">
              <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-lg">
                <UploadCloud className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Upload Your Bank Statement</h3>
                  <p className="text-slate-600">
                    Supported formats: PDF, CSV, JPG, PNG
                  </p>
                  <Input
                    type="file"
                    accept=".pdf,.csv,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="max-w-sm mx-auto"
                  />
                </div>
              </div>

              {file && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Download className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-slate-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button onClick={handleUploadAndProcess} disabled={isUploading}>
                        {isUploading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Brain className="w-4 h-4 mr-2" />
                        )}
                        {isUploading ? 'Processing...' : 'Process with AI'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {(processingStep === 'extract' || processingStep === 'categorize') && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {processingStep === 'extract' ? 'Extracting Transaction Data' : 'AI Categorizing Transactions'}
              </h3>
              <p className="text-slate-600">
                {processingStep === 'extract' 
                  ? 'Reading your bank statement and identifying transactions...'
                  : 'Analyzing transaction descriptions and assigning categories...'
                }
              </p>
            </div>
          )}

          {processingStep === 'review' && categorizedTransactions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Review Transactions</h3>
                  <p className="text-sm text-slate-600">
                    Review the AI categorization and make adjustments as needed
                  </p>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  {categorizedTransactions.filter(t => t.selected).length} selected
                </Badge>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {categorizedTransactions.map((transaction, index) => (
                  <Card key={index} className={`${transaction.selected ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={transaction.selected}
                          onCheckedChange={(checked) => handleTransactionChange(index, 'selected', checked)}
                        />
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                          <div>
                            <Label className="text-xs">Date</Label>
                            <p className="font-medium">{transaction.date}</p>
                          </div>
                          
                          <div>
                            <Label className="text-xs">Description</Label>
                            <p className="text-sm">{transaction.description}</p>
                          </div>
                          
                          <div>
                            <Label className="text-xs">Amount</Label>
                            <p className={`font-medium ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${Math.abs(transaction.amount).toFixed(2)}
                            </p>
                            <Badge variant="outline" className={`text-xs ${transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {transaction.type}
                            </Badge>
                          </div>
                          
                          <div>
                            <Label className="text-xs">Category</Label>
                            <Select
                              value={transaction.category}
                              onValueChange={(value) => handleTransactionChange(index, 'category', value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(transaction.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-xs">Client</Label>
                            <Select
                              value={transaction.suggested_client_id}
                              onValueChange={(value) => handleTransactionChange(index, 'suggested_client_id', value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {householdClients.map(client => (
                                  <SelectItem key={client.id} value={client.id}>
                                    {client.first_name} {client.last_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              transaction.confidence === 'high' ? 'bg-green-100 text-green-800' :
                              transaction.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}
                          >
                            {transaction.confidence} confidence
                          </Badge>
                        </div>
                      </div>
                      
                      {transaction.notes && (
                        <div className="mt-3 text-xs text-slate-600 bg-slate-100 p-2 rounded">
                          <strong>AI Notes:</strong> {transaction.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {processingStep === 'review' && categorizedTransactions.length === 0 && (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Transactions Found</h3>
              <p className="text-slate-600 mb-4">
                The AI couldn't extract any transaction data from this file. 
                Please try a different file or check that it contains transaction data.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-3">
          {processingStep === 'review' ? (
            <>
              <Button variant="outline" onClick={handleReset}>
                Upload Different File
              </Button>
              <Button 
                onClick={handleConfirmTransactions}
                disabled={categorizedTransactions.filter(t => t.selected).length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Add {categorizedTransactions.filter(t => t.selected).length} Transactions
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={isUploading || isProcessing}>
                Cancel
              </Button>
              <Button 
                onClick={handleUploadAndProcess} 
                disabled={!file || isUploading || isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isUploading || isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4 mr-2" />
                )}
                {isUploading || isProcessing ? 'Processing...' : 'Process with AI'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
