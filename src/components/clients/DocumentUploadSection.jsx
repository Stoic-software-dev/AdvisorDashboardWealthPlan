
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileText, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { UploadFile, ExtractDataFromUploadedFile } from "@/api/integrations";

// Define the schemas for different document types
const SCHEMAS = {
  client_info: {
    type: "object",
    properties: {
      first_name: { type: "string", description: "The client's first name." },
      last_name: { type: "string", description: "The client's last name." },
      email: { type: "string", format: "email", description: "The client's email address." },
      phone: { type: "string", description: "The client's phone number." },
      address: { type: "string", description: "The client's full mailing address." },
      province: { type: "string", description: "The client's province or state, as a two-letter abbreviation (e.g., ON, BC, CA, NY)." },
      date_of_birth: { type: "string", format: "date", description: "The client's date of birth in YYYY-MM-DD format." },
      occupation: { type: "string", description: "The client's profession or occupation." },
      annual_income: { type: "number", description: "The client's total annual income." },
      dependents: {
        type: "array",
        description: "A list of the client's dependents.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "The full name of the dependent." },
            date_of_birth: { type: "string", format: "date", description: "The dependent's date of birth." },
            relationship: { type: "string", description: "The dependent's relationship to the client (e.g., Child, Spouse)." }
          }
        }
      }
    }
  },
  tax_document: {
    type: "object",
    properties: {
      year: { type: "number", description: "The taxation year this profile represents." },
      sin: { type: "string", description: "Social Insurance Number (SIN)." },
      is_canadian_citizen: { type: "boolean", description: "Whether the client is a Canadian citizen." },
      foreign_property_over_100k: { type: "boolean", description: "Whether the client held foreign property with a cost over $100,000." },
      total_income_line_15000: { type: "number", description: "Total income from line 15000." },
      net_income_line_23600: { type: "number", description: "Net income from line 23600." },
      employment_income: { type: "number", description: "Employment income (T4)." },
      pension_income: { type: "number", description: "Pension income." },
      investment_income: { type: "number", description: "Total investment income (dividends, interest)." },
      rental_income: { type: "number", description: "Net rental income." },
      gross_self_employment_income: { type: "number", description: "Gross self-employment income." },
      net_self_employment_income: { type: "number", description: "Net self-employment income." },
      rrsp_deduction: { type: "number", description: "RRSP deduction claimed." },
      pension_adjustment: { type: "number", description: "Pension adjustment amount." },
      childcare_expenses_deduction: { type: "number", description: "Child care expenses deduction." },
      employment_expenses_deduction: { type: "number", description: "Employment expenses deduction." },
      union_dues_deduction: { type: "number", description: "Union and professional dues deduction." },
      support_payments_deduction: { type: "number", "description": "Support payments made deduction." },
      moving_expenses_deduction: { type: "number", "description": "Moving expenses deduction." },
      carrying_charges_deduction: { type: "number", "description": "Carrying charges and interest expenses." },
      rrsp_deduction_limit: { type: "number", description: "RRSP deduction limit for the next year, from NOA." },
      unused_rrsp_contributions: { type: "number", "description": "Unused RRSP/PRPP contributions from NOA." },
      hbp_balance: { type: "number", description: "Home Buyers' Plan (HBP) balance from NOA." },
      llp_balance: { type: "number", description: "Lifelong Learning Plan (LLP) balance from NOA." },
      income_breakdown: {
        type: "array",
        description: "A detailed breakdown of all significant income sources listed on the tax return.",
        items: {
          type: "object",
          properties: {
            description: { type: "string", description: "The description of the income source (e.g., 'Employment income', 'OAS pension')." },
            line_number: { type: "string", description: "The CRA line number, if available (e.g., '10100')." },
            amount: { type: "number", description: "The amount for that income source." }
          },
          required: ["description", "amount"]
        }
      },
      deductions_breakdown: {
        type: "array",
        description: "A detailed breakdown of all significant deductions, credits, and expenses from the tax return.",
        items: {
          type: "object",
          properties: {
            description: { type: "string", description: "The description of the deduction (e.g., 'RRSP deduction', 'Union dues')." },
            line_number: { type: "string", description: "The CRA line number, if available (e.g., '20800')." },
            amount: { type: "number", description: "The amount for that deduction." }
          },
          required: ["description", "amount"]
        }
      }
    }
  }
};


export default function DocumentUploadSection({ onDataExtracted, documentType = 'client_info' }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, uploading, extracting, success, error
  const [error, setError] = useState('');

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);
    setError('');
    setStatus('uploading');

    try {
      // Step 1: Upload the file
      const uploadResult = await UploadFile({ file: selectedFile });
      if (!uploadResult || !uploadResult.file_url) {
        throw new Error("File URL was not returned from upload.");
      }
      const fileUrl = uploadResult.file_url;
      
      setStatus('extracting');

      // Step 2: Extract data from the uploaded file
      const schema = SCHEMAS[documentType] || SCHEMAS.client_info; // Fallback to client_info schema
      
      const extractionResult = await ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: schema,
      });

      if (extractionResult.status === 'error') {
        throw new Error(extractionResult.details || 'Data extraction failed.');
      }
      
      // Pass the extracted data up to the parent component
      onDataExtracted(extractionResult.output, selectedFile, fileUrl);
      
      setStatus('success');
    } catch (err) {
      console.error("Document upload/extraction error:", err);
      setError(`An error occurred: ${err.message}. Please try a different file or enter data manually.`);
      setStatus('error');
    } finally {
      setIsProcessing(false);
      // Reset file input to allow re-uploading the same file
      if (event.target) {
        event.target.value = null;
      }
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'idle':
        return 'Drag & drop a file here, or click to select';
      case 'uploading':
        return 'Uploading file...';
      case 'extracting':
        return "Analyzing document with AI...";
      case 'success':
        return 'Data extracted successfully!';
      case 'error':
        return 'Upload failed. Please try again.';
      default:
        return 'Select a file';
    }
  };
  
  const StatusIcon = () => {
    switch(status) {
      case 'idle': return <Upload className="w-8 h-8 text-slate-400" />;
      case 'uploading':
      case 'extracting':
        return <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-8 h-8 text-red-500" />;
      default:
        return <FileText className="w-8 h-8 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center transition-all duration-300 hover:border-blue-500 hover:bg-slate-50/50">
        <Input
          id="document-upload"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.csv"
          onChange={handleFileChange}
          className="hidden"
          disabled={isProcessing}
        />
        <label htmlFor="document-upload" className={`cursor-pointer flex flex-col items-center justify-center space-y-3 ${isProcessing ? 'cursor-not-allowed' : ''}`}>
          <StatusIcon />
          <p className="text-sm font-medium text-slate-700">{getStatusMessage()}</p>
          {file && !isProcessing && <p className="text-xs text-slate-500 truncate max-w-xs">{file.name}</p>}
        </label>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Upload Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
