
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
    Upload, 
    FileText, 
    CheckCircle, 
    AlertTriangle, 
    Loader2,
    Info,
    Save,
    X
} from "lucide-react";
import { Fund } from "@/api/entities";
import { UploadFile, ExtractDataFromUploadedFile } from "@/api/integrations";

const formatPercentage = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return "N/A";
    return `${(value * 100).toFixed(2)}%`;
};

export default function UploadFundDocumentModal({ isOpen, onClose, onUploadSuccess, existingFunds, fundToEdit }) {
    const [step, setStep] = useState(1); // 1: Upload, 2: Extract, 3: Confirm
    const [uploadedFile, setUploadedFile] = useState(null);
    const [extractedData, setExtractedData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState("");
    const [existingFund, setExistingFund] = useState(null);

    useEffect(() => {
        if (isOpen) {
            if (fundToEdit) {
                // If editing, skip to step 3 and pre-fill data
                setExtractedData({ ...fundToEdit });
                setExistingFund(fundToEdit);
                setStep(3);
            } else {
                // Reset for creation flow
                setStep(1);
                setUploadedFile(null);
                setExtractedData(null);
                setError("");
                setExistingFund(null);
            }
        }
    }, [isOpen, fundToEdit]);

    const handleClose = () => {
        // Reset state on close regardless of mode
        setStep(1);
        setUploadedFile(null);
        setExtractedData(null);
        setError("");
        setExistingFund(null);
        onClose();
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.pdf')) {
            setError('Please select a PDF file (Fund Facts, Fund Profile, or KYP document).');
            return;
        }

        setIsProcessing(true);
        setError("");
        
        try {
            const uploadResult = await UploadFile({ file });
            setUploadedFile({ 
                file, 
                url: uploadResult.file_url 
            });
            setStep(2);
            await extractFundData(uploadResult.file_url);
        } catch (error) {
            console.error('Error uploading file:', error);
            setError('Failed to upload file. Please try again.');
        }
        
        setIsProcessing(false);
    };

    const extractFundData = async (fileUrl) => {
        setIsProcessing(true);
        try {
            const extractionSchema = {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        description: "The complete official name of the fund"
                    },
                    fund_code: {
                        type: "string", 
                        description: "The fund code, ticker symbol, or unique identifier (usually a series of letters/numbers)"
                    },
                    fund_family: {
                        type: "string",
                        description: "The fund company or family name (e.g., Fidelity, BMO, Vanguard, RBC, etc.)"
                    },
                    category: {
                        type: "string",
                        description: "The investment category, asset class, or fund type (e.g., Global Equity, Canadian Fixed Income, Balanced Fund, Money Market, etc.)"
                    },
                    mer: {
                        type: "number",
                        description: "Management Expense Ratio as a decimal (e.g., 0.025 for 2.5%, 0.005 for 0.5%)"
                    },
                    historical_performance: {
                        type: "array",
                        description: "Array of historical performance data",
                        items: {
                            type: "object",
                            properties: {
                                period: {
                                    type: "string",
                                    description: "Time period (e.g., 1YR, 3YR, 5YR, 10YR, YTD, etc.)"
                                },
                                value: {
                                    type: "number",
                                    description: "Performance return as a decimal (e.g., 0.12 for 12%, -0.05 for -5%)"
                                }
                            }
                        }
                    },
                    standard_deviation: {
                        type: "number",
                        description: "Standard deviation as a percentage converted to decimal (e.g., 0.15 for 15%)"
                    },
                    sharpe_ratio: {
                        type: "number",
                        description: "Sharpe ratio as a numerical value"
                    },
                    r_squared: {
                        type: "number",
                        description: "R-squared as a decimal (e.g., 0.85 for 85%)"
                    },
                    beta: {
                        type: "number",
                        description: "Beta risk metric as a numerical value (e.g., 1.2, 0.8)"
                    },
                    risk_rating: {
                        type: "string",
                        description: "Risk rating or classification (e.g., Low, Medium, High, Conservative, Moderate, Aggressive, or numerical scale)"
                    }
                },
                required: ["name", "fund_code"]
            };

            const result = await ExtractDataFromUploadedFile({
                file_url: fileUrl,
                json_schema: extractionSchema
            });

            if (result.status === 'success' && result.output) {
                const data = {
                    ...result.output,
                    document_url: fileUrl,
                    last_updated_date: new Date().toISOString()
                };
                
                setExtractedData(data);
                
                // Check if fund already exists by fund_code
                if (data.fund_code) {
                    const existing = existingFunds.find(f => 
                        f.fund_code?.toLowerCase() === data.fund_code.toLowerCase()
                    );
                    setExistingFund(existing);
                }
                
                setStep(3);
            } else {
                setError(`Data extraction failed: ${result.details || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error extracting fund data:', error);
            setError('Failed to extract fund data from document. Please ensure this is a valid Fund Facts, Fund Profile, or KYP document.');
        }
        setIsProcessing(false);
    };

    const handleConfirmSave = async () => {
        if (!extractedData) return;
        
        setIsProcessing(true);
        try {
            if (existingFund) {
                // Update existing fund (covers both editing and matching a new upload to an existing fund)
                await Fund.update(existingFund.id, extractedData);
            } else {
                // Create new fund
                await Fund.create(extractedData);
            }
            
            onUploadSuccess();
            handleClose();
        } catch (error) {
            console.error('Error saving fund:', error);
            setError('Failed to save fund data. Please try again.');
        }
        setIsProcessing(false);
    };

    const renderStep1 = () => (
        <div className="space-y-6">
            <div className="text-center">
                <Upload className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-semibold mb-2">Upload Fund Document</h3>
                <p className="text-slate-600 mb-4">Upload a Fund Facts, Fund Profile, or KYP PDF document to extract fund data</p>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Info className="w-4 h-4" />
                        Supported Documents
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Fund Facts documents (Canadian mutual funds)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Fund Profile documents</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Know Your Product (KYP) documents</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>ETF Facts documents</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                        The system will extract fund name, code, family, MER, performance data, risk metrics (including Beta), and risk ratings.
                    </p>
                </CardContent>
            </Card>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                <Input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="fund-upload"
                    disabled={isProcessing}
                />
                <Label htmlFor="fund-upload" className="cursor-pointer">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                    <p className="text-lg font-medium mb-2">
                        {isProcessing ? 'Uploading...' : 'Choose PDF file to upload'}
                    </p>
                    <p className="text-sm text-slate-500">Click here to select your Fund Facts, Fund Profile, or KYP document</p>
                </Label>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6 text-center">
            <div className="flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
            <div>
                <h3 className="text-lg font-semibold mb-2">Extracting Fund Data</h3>
                <p className="text-slate-600">Please wait while we analyze the document and extract fund information...</p>
            </div>
            <div className="text-sm text-slate-500">
                File: {uploadedFile?.file?.name}
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                    <h3 className="text-lg font-semibold">{fundToEdit ? "Edit Fund Details" : "Fund Data Extracted"}</h3>
                    <p className="text-slate-600">
                        {existingFund && !fundToEdit
                            ? `This will update the existing fund: ${existingFund.name}`
                            : 'Review and edit the extracted information.'
                        }
                    </p>
                </div>
            </div>

            {existingFund && (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        <strong>{fundToEdit ? 'Editing Existing Fund' : 'Existing Fund Found'}:</strong> 
                        {fundToEdit ? ' You are editing an existing fund.' : ` A fund with code "${existingFund.fund_code}" already exists.`}
                        This will update all existing data and propagate changes to client portfolios.
                    </AlertDescription>
                </Alert>
            )}

            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Fund Information</CardTitle>
                    <p className="text-sm text-slate-500">
                        {fundToEdit ? "Edit the fund details below." : "Review and edit the extracted information."}
                    </p>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div>
                            <Label htmlFor="fundName" className="text-sm font-medium text-slate-600">Fund Name</Label>
                            <Input
                                id="fundName"
                                value={extractedData?.name || ''}
                                onChange={(e) => setExtractedData({ ...extractedData, name: e.target.value })}
                                className="mt-1"
                                disabled={isProcessing}
                            />
                        </div>
                        <div>
                            <Label htmlFor="fundCode" className="text-sm font-medium text-slate-600">Fund Code</Label>
                            <Input
                                id="fundCode"
                                value={extractedData?.fund_code || ''}
                                onChange={(e) => setExtractedData({ ...extractedData, fund_code: e.target.value })}
                                className="mt-1"
                                disabled={isProcessing}
                            />
                        </div>
                        <div>
                            <Label htmlFor="fundFamily" className="text-sm font-medium text-slate-600">Fund Family</Label>
                            <Input
                                id="fundFamily"
                                value={extractedData?.fund_family || ''}
                                onChange={(e) => setExtractedData({ ...extractedData, fund_family: e.target.value })}
                                className="mt-1"
                                disabled={isProcessing}
                            />
                        </div>
                        <div>
                            <Label htmlFor="category" className="text-sm font-medium text-slate-600">Category</Label>
                            <Input
                                id="category"
                                value={extractedData?.category || ''}
                                onChange={(e) => setExtractedData({ ...extractedData, category: e.target.value })}
                                className="mt-1"
                                disabled={isProcessing}
                            />
                        </div>
                        <div>
                            <Label htmlFor="mer" className="text-sm font-medium text-slate-600">MER (%)</Label>
                            <Input
                                id="mer"
                                type="number"
                                value={extractedData?.mer !== undefined ? parseFloat((extractedData.mer * 100).toFixed(2)) : ''}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '') {
                                        setExtractedData({ ...extractedData, mer: null });
                                    } else {
                                        const numericValue = parseFloat(value);
                                        if (!isNaN(numericValue)) {
                                            setExtractedData({ ...extractedData, mer: numericValue / 100 });
                                        }
                                    }
                                }}
                                className="mt-1"
                                step="0.01"
                                placeholder="e.g., 1.67"
                                disabled={isProcessing}
                            />
                        </div>
                        <div>
                            <Label htmlFor="riskRating" className="text-sm font-medium text-slate-600">Risk Rating</Label>
                            <Input
                                id="riskRating"
                                value={extractedData?.risk_rating || ''}
                                onChange={(e) => setExtractedData({ ...extractedData, risk_rating: e.target.value })}
                                className="mt-1"
                                disabled={isProcessing}
                            />
                        </div>
                    </div>

                    {extractedData?.historical_performance && extractedData.historical_performance.length > 0 && (
                        <div>
                            <Label className="text-sm font-medium text-slate-600">Historical Performance</Label>
                            <p className="text-xs text-slate-500 mb-2">Performance data is updated by uploading a new document.</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                                {extractedData.historical_performance.map((perf, index) => (
                                    <div key={index} className="text-center p-2 bg-slate-50 rounded">
                                        <div className="text-xs text-slate-500">{perf.period}</div>
                                        <div className="font-semibold">{formatPercentage(perf.value)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <Label className="text-sm font-medium text-slate-600">Risk Metrics</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 mt-2">
                            <div>
                                <Label htmlFor="beta" className="text-xs text-slate-500">Beta</Label>
                                <Input
                                    id="beta"
                                    type="number"
                                    value={extractedData?.beta || ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === '') {
                                            setExtractedData({ ...extractedData, beta: null });
                                        } else {
                                            const numericValue = parseFloat(value);
                                            if (!isNaN(numericValue)) {
                                                setExtractedData({ ...extractedData, beta: numericValue });
                                            }
                                        }
                                    }}
                                    className="mt-1"
                                    step="0.01"
                                    disabled={isProcessing}
                                />
                            </div>
                            <div>
                                <Label htmlFor="sharpeRatio" className="text-xs text-slate-500">Sharpe Ratio</Label>
                                <Input
                                    id="sharpeRatio"
                                    type="number"
                                    value={extractedData?.sharpe_ratio || ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === '') {
                                            setExtractedData({ ...extractedData, sharpe_ratio: null });
                                        } else {
                                            const numericValue = parseFloat(value);
                                            if (!isNaN(numericValue)) {
                                                setExtractedData({ ...extractedData, sharpe_ratio: numericValue });
                                            }
                                        }
                                    }}
                                    className="mt-1"
                                    step="0.01"
                                    disabled={isProcessing}
                                />
                            </div>
                             <div>
                                <Label htmlFor="stdDeviation" className="text-xs text-slate-500">Std Deviation (%)</Label>
                                <Input
                                    id="stdDeviation"
                                    type="number"
                                    value={extractedData?.standard_deviation !== undefined ? (extractedData.standard_deviation * 100) : ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === '') {
                                            setExtractedData({ ...extractedData, standard_deviation: null });
                                        } else {
                                            const numericValue = parseFloat(value);
                                            if (!isNaN(numericValue)) {
                                                setExtractedData({ ...extractedData, standard_deviation: numericValue / 100 });
                                            }
                                        }
                                    }}
                                    className="mt-1"
                                    step="0.01"
                                    disabled={isProcessing}
                                />
                            </div>
                            <div>
                                <Label htmlFor="rSquared" className="text-xs text-slate-500">R-Squared (%)</Label>
                                <Input
                                    id="rSquared"
                                    type="number"
                                    value={extractedData?.r_squared !== undefined ? (extractedData.r_squared * 100) : ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === '') {
                                            setExtractedData({ ...extractedData, r_squared: null });
                                        } else {
                                            const numericValue = parseFloat(value);
                                            if (!isNaN(numericValue)) {
                                                setExtractedData({ ...extractedData, r_squared: numericValue / 100 });
                                            }
                                        }
                                    }}
                                    className="mt-1"
                                    step="0.01"
                                    disabled={isProcessing}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => fundToEdit ? handleClose() : setStep(1)} disabled={isProcessing}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                </Button>
                <Button onClick={handleConfirmSave} disabled={isProcessing}>
                    {isProcessing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    {existingFund ? 'Update Fund' : 'Save New Fund'}
                </Button>
            </div>
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        {fundToEdit ? "Edit Fund Details" : "Upload Fund Document"}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Progress Indicator */}
                    {!fundToEdit && (
                      <div className="flex items-center justify-center space-x-4">
                          {[1, 2, 3].map((stepNum) => (
                              <div key={stepNum} className="flex items-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                      step >= stepNum ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'
                                  }`}>
                                      {stepNum}
                                  </div>
                                  {stepNum < 3 && <div className={`w-12 h-0.5 ${step > stepNum ? 'bg-green-600' : 'bg-slate-200'}`} />}
                              </div>
                          ))}
                      </div>
                    )}

                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                </div>
            </DialogContent>
        </Dialog>
    );
}
