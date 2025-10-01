
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Download,
  Users,
  ArrowRight,
  Info
} from "lucide-react";
import { Client } from "@/api/entities";
import { UploadFile } from "@/api/integrations";

const CLIENT_FIELD_MAPPINGS = {
  first_name: { label: "First Name", required: true, type: "text" },
  last_name: { label: "Last Name", required: true, type: "text" },
  email: { label: "Email", required: true, type: "email" },
  phone: { label: "Phone", required: false, type: "text" },
  date_of_birth: { label: "Date of Birth", required: false, type: "date" },
  address: { label: "Address", required: false, type: "text" },
  occupation: { label: "Occupation", required: false, type: "text" },
  annual_income: { label: "Annual Income", required: false, type: "number" },
  net_worth: { label: "Net Worth", required: false, type: "number" },
  risk_tolerance: { label: "Risk Tolerance", required: false, type: "select", options: ["conservative", "moderate", "aggressive"] },
  status: { label: "Status", required: false, type: "select", options: ["prospect", "active", "inactive"] },
  notes: { label: "Notes", required: false, type: "text" }
};

// Simple CSV parser function
const parseCSV = (csvText) => {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return { headers: [], data: [] };
  
  const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(value => value.trim().replace(/"/g, ''));
    if (values.length === headers.length && values.some(v => v)) { // Skip empty rows
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
  }
  
  return { headers, data };
};

export default function ImportClientsDialog({ isOpen, onClose, onImportComplete }) {
  const [step, setStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [fieldMappings, setFieldMappings] = useState({});
  const [validatedData, setValidatedData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [parseError, setParseError] = useState("");

  const handleClose = () => {
    setStep(1);
    setUploadedFile(null);
    setCsvData([]);
    setCsvHeaders([]);
    setFieldMappings({});
    setValidatedData([]);
    setErrors([]);
    setImportResults(null);
    setParseError("");
    onClose();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Please select a CSV file.');
      return;
    }

    setIsProcessing(true);
    setParseError("");
    
    try {
      // Read file as text first for better CSV parsing
      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      // Parse CSV content
      const { headers, data } = parseCSV(fileContent);
      
      if (headers.length === 0 || data.length === 0) {
        setParseError('The CSV file appears to be empty or has no valid data rows.');
        setIsProcessing(false);
        return;
      }

      setCsvHeaders(headers);
      setCsvData(data);
      setUploadedFile(file);
      
      // Auto-map obvious fields
      const autoMappings = {};
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        Object.keys(CLIENT_FIELD_MAPPINGS).forEach(field => {
          const lowerField = field.toLowerCase().replace(/[^a-z0-9]/g, '');
          
          // Check for exact matches or common variations
          if (lowerHeader === lowerField || 
              lowerHeader.includes(lowerField) || 
              lowerField.includes(lowerHeader) ||
              (field === 'first_name' && (lowerHeader.includes('first') || lowerHeader.includes('fname'))) ||
              (field === 'last_name' && (lowerHeader.includes('last') || lowerHeader.includes('lname') || lowerHeader.includes('surname'))) ||
              (field === 'email' && lowerHeader.includes('mail')) ||
              (field === 'phone' && (lowerHeader.includes('phone') || lowerHeader.includes('tel'))) ||
              (field === 'date_of_birth' && (lowerHeader.includes('birth') || lowerHeader.includes('dob'))) ||
              (field === 'annual_income' && lowerHeader.includes('income')) ||
              (field === 'net_worth' && (lowerHeader.includes('worth') || lowerHeader.includes('networth'))) ||
              (field === 'risk_tolerance' && lowerHeader.includes('risk'))) {
            autoMappings[field] = header;
          }
        });
      });
      
      setFieldMappings(autoMappings);
      setStep(2);
    } catch (error) {
      console.error('Error processing file:', error);
      setParseError('Failed to read the CSV file. Please ensure it is a valid CSV format.');
    }
    
    setIsProcessing(false);
  };

  const handleMappingChange = (clientField, csvHeader) => {
    setFieldMappings(prev => ({
      ...prev,
      [clientField]: csvHeader === 'none' ? '' : csvHeader
    }));
  };

  const validateAndPreview = () => {
    const validated = [];
    const validationErrors = [];

    csvData.forEach((row, index) => {
      const clientData = {};
      const rowErrors = [];

      // Map fields
      Object.keys(fieldMappings).forEach(clientField => {
        const csvHeader = fieldMappings[clientField];
        if (csvHeader && row[csvHeader]) {
          let value = row[csvHeader].trim();
          
          // Type conversion and validation
          const fieldConfig = CLIENT_FIELD_MAPPINGS[clientField];
          
          if (fieldConfig.type === 'number' && value) {
            const numValue = parseFloat(value.replace(/[,$]/g, ''));
            if (!isNaN(numValue)) {
              clientData[clientField] = numValue;
            } else {
              rowErrors.push(`Invalid number format for ${fieldConfig.label}: ${value}`);
            }
          } else if (fieldConfig.type === 'email' && value) {
            if (value.includes('@')) {
              clientData[clientField] = value.toLowerCase();
            } else {
              rowErrors.push(`Invalid email format: ${value}`);
            }
          } else if (fieldConfig.type === 'date' && value) {
            // Try to parse various date formats
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              clientData[clientField] = date.toISOString().split('T')[0];
            } else {
              rowErrors.push(`Invalid date format for ${fieldConfig.label}: ${value}`);
            }
          } else if (fieldConfig.type === 'select' && value) {
            const lowerValue = value.toLowerCase();
            const matchingOption = fieldConfig.options.find(opt => 
              opt.toLowerCase() === lowerValue || 
              opt.toLowerCase().includes(lowerValue) ||
              lowerValue.includes(opt.toLowerCase())
            );
            if (matchingOption) {
              clientData[clientField] = matchingOption;
            } else {
              rowErrors.push(`Invalid value for ${fieldConfig.label}: ${value}. Must be one of: ${fieldConfig.options.join(', ')}`);
            }
          } else {
            clientData[clientField] = value;
          }
        }
      });

      // Check required fields
      Object.keys(CLIENT_FIELD_MAPPINGS).forEach(field => {
        if (CLIENT_FIELD_MAPPINGS[field].required && !clientData[field]) {
          rowErrors.push(`Missing required field: ${CLIENT_FIELD_MAPPINGS[field].label}`);
        }
      });

      validated.push({
        ...clientData,
        _rowIndex: index + 1,
        _errors: rowErrors
      });

      if (rowErrors.length > 0) {
        validationErrors.push({
          row: index + 1,
          errors: rowErrors
        });
      }
    });

    setValidatedData(validated);
    setErrors(validationErrors);
    setStep(3);
  };

  const performImport = async () => {
    setIsProcessing(true);
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    const validRows = validatedData.filter(row => row._errors.length === 0);

    for (const row of validRows) {
      try {
        // Remove internal fields before creating
        const { _rowIndex, _errors, ...clientData } = row;
        await Client.create(clientData);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: row._rowIndex,
          error: error.message || 'Unknown error'
        });
      }
    }

    setImportResults(results);
    setIsProcessing(false);
    setStep(4);
  };

  const downloadSampleCSV = () => {
    const headers = Object.keys(CLIENT_FIELD_MAPPINGS);
    const sampleData = [
      'John,Doe,john.doe@email.com,(555) 123-4567,1985-03-15,123 Main St,Software Engineer,75000,250000,moderate,active,New client referral',
      'Jane,Smith,jane.smith@email.com,(555) 987-6543,1990-07-22,456 Oak Ave,Marketing Manager,65000,180000,conservative,prospect,Met at networking event'
    ];
    
    const csvContent = [headers.join(','), ...sampleData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client_import_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Upload className="w-16 h-16 mx-auto mb-4 text-slate-400" />
        <h3 className="text-lg font-semibold mb-2">Upload Client Data CSV</h3>
        <p className="text-slate-600 mb-4">Import multiple clients at once from a CSV file</p>
        
        <Button variant="outline" onClick={downloadSampleCSV} className="mb-4">
          <Download className="w-4 h-4 mr-2" />
          Download Sample CSV
        </Button>
      </div>

      {parseError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            CSV Format Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-green-700 mb-2">Required Fields:</h4>
              <ul className="space-y-1">
                {Object.entries(CLIENT_FIELD_MAPPINGS)
                  .filter(([_, config]) => config.required)
                  .map(([field, config]) => (
                    <li key={field} className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      {config.label}
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">Optional Fields:</h4>
              <ul className="space-y-1 text-slate-600 text-xs">
                {Object.entries(CLIENT_FIELD_MAPPINGS)
                  .filter(([_, config]) => !config.required)
                  .slice(0, 6)
                  .map(([field, config]) => (
                    <li key={field}>• {config.label}</li>
                  ))}
                <li className="text-slate-400">... and more</li>
              </ul>
            </div>
          </div>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Tips:</strong> Make sure your CSV file has column headers in the first row. The system will try to automatically match your columns to client fields, but you can adjust the mapping in the next step.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
        <Input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
          id="csv-upload"
          disabled={isProcessing}
        />
        <Label htmlFor="csv-upload" className="cursor-pointer">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <p className="text-lg font-medium mb-2">
            {isProcessing ? 'Processing file...' : 'Choose CSV file to upload'}
          </p>
          <p className="text-sm text-slate-500">Click here to select your CSV file</p>
        </Label>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CheckCircle className="w-6 h-6 text-green-600" />
        <div>
          <h3 className="text-lg font-semibold">Map CSV Columns</h3>
          <p className="text-slate-600">Found {csvData.length} rows in your CSV file. Match your columns to client fields:</p>
        </div>
      </div>

      <div className="grid gap-4">
        {Object.entries(CLIENT_FIELD_MAPPINGS).map(([field, config]) => (
          <div key={field} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <Label className="font-medium">
                  {config.label}
                  {config.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <p className="text-xs text-slate-500">
                  {config.type === 'select' ? `Options: ${config.options?.join(', ')}` : `Type: ${config.type}`}
                </p>
              </div>
            </div>
            <div className="w-48">
              <Select
                value={fieldMappings[field] || 'none'}
                onValueChange={(value) => handleMappingChange(field, value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Don't import</SelectItem>
                  {csvHeaders.filter(header => header).map(header => (
                    <SelectItem key={header} value={header}>{header}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(1)}>
          Back
        </Button>
        <Button onClick={validateAndPreview}>
          Preview Import <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CheckCircle className="w-6 h-6 text-green-600" />
        <div>
          <h3 className="text-lg font-semibold">Preview Import</h3>
          <p className="text-slate-600">Review the data before importing</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{validatedData.filter(row => row._errors.length === 0).length}</div>
            <div className="text-sm text-slate-600">Valid Records</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{errors.length}</div>
            <div className="text-sm text-slate-600">Records with Errors</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-slate-600">{csvData.length}</div>
            <div className="text-sm text-slate-600">Total Records</div>
          </CardContent>
        </Card>
      </div>

      {errors.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {errors.length} records have validation errors and will be skipped during import.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="preview" className="w-full">
        <TabsList>
          <TabsTrigger value="preview">Data Preview</TabsTrigger>
          {errors.length > 0 && <TabsTrigger value="errors">Errors ({errors.length})</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="preview" className="space-y-4">
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium">Row</th>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Validation</th>
                </tr>
              </thead>
              <tbody>
                {validatedData.slice(0, 20).map((row, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-3">{row._rowIndex}</td>
                    <td className="p-3">{row.first_name} {row.last_name}</td>
                    <td className="p-3">{row.email}</td>
                    <td className="p-3">
                      <Badge variant="outline">{row.status || 'prospect'}</Badge>
                    </td>
                    <td className="p-3">
                      {row._errors.length === 0 ? (
                        <Badge className="bg-green-100 text-green-800">Valid</Badge>
                      ) : (
                        <Badge variant="destructive">Has Errors</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {validatedData.length > 20 && (
              <div className="p-3 text-center text-slate-500 bg-slate-50">
                ... and {validatedData.length - 20} more records
              </div>
            )}
          </div>
        </TabsContent>
        
        {errors.length > 0 && (
          <TabsContent value="errors" className="space-y-4">
            <div className="max-h-96 overflow-y-auto space-y-3">
              {errors.map((error, index) => (
                <Alert key={index} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Row {error.row}:</strong>
                    <ul className="mt-1 ml-4 list-disc">
                      {error.errors.map((err, errIndex) => (
                        <li key={errIndex}>{err}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(2)}>
          Back to Mapping
        </Button>
        <Button 
          onClick={performImport}
          disabled={validatedData.filter(row => row._errors.length === 0).length === 0}
        >
          Import {validatedData.filter(row => row._errors.length === 0).length} Clients
        </Button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6 text-center">
      <CheckCircle className="w-16 h-16 mx-auto text-green-600" />
      <div>
        <h3 className="text-xl font-semibold mb-2">Import Complete!</h3>
        <p className="text-slate-600">Your client data has been imported successfully.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{importResults?.successful || 0}</div>
            <div className="text-sm text-slate-600">Successfully Imported</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{importResults?.failed || 0}</div>
            <div className="text-sm text-slate-600">Failed to Import</div>
          </CardContent>
        </Card>
      </div>

      {importResults?.errors && importResults.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Import Errors:</strong>
            <ul className="mt-2 space-y-1">
              {importResults.errors.map((error, index) => (
                <li key={index}>Row {error.row}: {error.error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Button onClick={() => {
        onImportComplete();
        handleClose();
      }}>
        <Users className="w-4 h-4 mr-2" />
        View Imported Clients
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Clients from CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNum ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {stepNum}
                </div>
                {stepNum < 4 && <div className={`w-12 h-0.5 ${step > stepNum ? 'bg-green-600' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
