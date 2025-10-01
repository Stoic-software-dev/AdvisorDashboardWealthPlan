
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, CheckCircle2, AlertTriangle, Loader2, FileText, Upload } from "lucide-react";
import { ClientIntakeSubmission } from "@/api/entities";
import { UploadFile } from "@/api/integrations";

export default function ClientIntakeForm() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    marital_status: '',
    citizenship: '',
    address: '',
    province: '',
    spouse_partner_name: '',
    annual_income: '',
    cash_and_investments: '',
    real_estate_assets: '',
    total_liabilities: '',
    employer_name: '',
    job_title: '',
    years_with_employer: '',
    occupation: '',
    id_type: '',
    id_number: '',
    id_issue_date: '',
    id_expiry_date: '',
    banking_file: null,
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatPhoneNumber = (value) => {
    const digits = value.replace(/\D/g, '');
    const limitedDigits = digits.slice(0, 10);
    
    if (limitedDigits.length <= 3) {
      return `(${limitedDigits}`;
    } else if (limitedDigits.length <= 6) {
      return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
    } else {
      return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
    }
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    handleInputChange("phone", formatted);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const result = await UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        banking_file: {
          url: result.file_url,
          name: file.name,
          size: file.size
        }
      }));
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Failed to upload document. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const submissionData = {
        ...formData,
        annual_income: formData.annual_income ? parseFloat(formData.annual_income) : null,
        cash_and_investments: formData.cash_and_investments ? parseFloat(formData.cash_and_investments) : null,
        real_estate_assets: formData.real_estate_assets ? parseFloat(formData.real_estate_assets) : null,
        total_liabilities: formData.total_liabilities ? parseFloat(formData.total_liabilities) : null,
        years_with_employer: formData.years_with_employer ? parseInt(formData.years_with_employer, 10) : null,
        banking_file_url: formData.banking_file?.url || null,
        banking_file_name: formData.banking_file?.name || null,
        status: 'pending'
      };

      await ClientIntakeSubmission.create(submissionData);
      setSubmitSuccess(true);
      
    } catch (error) {
      console.error('Submission error:', error);
      setError('There was an error submitting your information. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardContent className="p-8">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Information Submitted!</h2>
            <p className="text-slate-600 mb-6">
              Thank you for submitting your information. Your advisor will review it and contact you soon.
            </p>
            <p className="text-sm text-slate-500">
              You can now close this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-xl bg-white/95 backdrop-blur-sm">
          {/* Form Header - Updated with matching styling */}
          <div className="text-center mb-8 p-6 rounded-t-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <UserPlus className="w-12 h-12 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Information Update Form</h1>
            <p className="text-blue-100 mt-2">Please provide your information below</p>
          </div>

          <CardContent className="p-8">
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Information */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  Personal Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange("first_name", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange("last_name", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder="(999) 999-9999"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="citizenship">Citizenship</Label>
                    <Input
                      id="citizenship"
                      value={formData.citizenship}
                      onChange={(e) => handleInputChange("citizenship", e.target.value)}
                      placeholder="e.g., Canadian"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="marital_status">Marital Status</Label>
                    <Select value={formData.marital_status} onValueChange={(value) => handleInputChange("marital_status", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                        <SelectItem value="Common-law">Common-law</SelectItem>
                        <SelectItem value="Divorced">Divorced</SelectItem>
                        <SelectItem value="Widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {['Married', 'Common-law'].includes(formData.marital_status) && (
                    <div>
                      <Label htmlFor="spouse_partner_name">Spouse/Partner Name</Label>
                      <Input
                        id="spouse_partner_name"
                        value={formData.spouse_partner_name}
                        onChange={(e) => handleInputChange("spouse_partner_name", e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="address">Home Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      placeholder="Street address, city, postal code"
                    />
                  </div>
                  <div>
                    <Label htmlFor="province">Province</Label>
                    <Select value={formData.province} onValueChange={(value) => handleInputChange("province", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select province" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AB">Alberta</SelectItem>
                        <SelectItem value="BC">British Columbia</SelectItem>
                        <SelectItem value="MB">Manitoba</SelectItem>
                        <SelectItem value="NB">New Brunswick</SelectItem>
                        <SelectItem value="NL">Newfoundland and Labrador</SelectItem>
                        <SelectItem value="NS">Nova Scotia</SelectItem>
                        <SelectItem value="NT">Northwest Territories</SelectItem>
                        <SelectItem value="NU">Nunavut</SelectItem>
                        <SelectItem value="ON">Ontario</SelectItem>
                        <SelectItem value="PE">Prince Edward Island</SelectItem>
                        <SelectItem value="QC">Quebec</SelectItem>
                        <SelectItem value="SK">Saskatchewan</SelectItem>
                        <SelectItem value="YT">Yukon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  Professional Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employer_name">Employer Name</Label>
                    <Input
                      id="employer_name"
                      value={formData.employer_name}
                      onChange={(e) => handleInputChange("employer_name", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="occupation">Occupation</Label>
                    <Input
                      id="occupation"
                      value={formData.occupation}
                      onChange={(e) => handleInputChange("occupation", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="job_title">Job Title</Label>
                    <Input
                      id="job_title"
                      value={formData.job_title}
                      onChange={(e) => handleInputChange("job_title", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="years_with_employer">Years with Current Employer</Label>
                    <Input
                      id="years_with_employer"
                      type="number"
                      value={formData.years_with_employer}
                      onChange={(e) => handleInputChange("years_with_employer", e.target.value)}
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  Financial Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="annual_income">Annual Income ($)</Label>
                    <Input
                      id="annual_income"
                      type="number"
                      value={formData.annual_income}
                      onChange={(e) => handleInputChange("annual_income", e.target.value)}
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cash_and_investments">Cash & Investments ($)</Label>
                    <Input
                      id="cash_and_investments"
                      type="number"
                      value={formData.cash_and_investments}
                      onChange={(e) => handleInputChange("cash_and_investments", e.target.value)}
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="real_estate_assets">Real Estate Assets ($)</Label>
                    <Input
                      id="real_estate_assets"
                      type="number"
                      value={formData.real_estate_assets}
                      onChange={(e) => handleInputChange("real_estate_assets", e.target.value)}
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="total_liabilities">Total Liabilities ($)</Label>
                    <Input
                      id="total_liabilities"
                      type="number"
                      value={formData.total_liabilities}
                      onChange={(e) => handleInputChange("total_liabilities", e.target.value)}
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Identification Information */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  Identification Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="id_type">ID Type</Label>
                    <Select value={formData.id_type} onValueChange={(value) => handleInputChange("id_type", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ID type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="drivers_license">Driver's License</SelectItem>
                        <SelectItem value="other_photo_id">Other Photo ID</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="id_number">ID Number</Label>
                    <Input
                      id="id_number"
                      value={formData.id_number}
                      onChange={(e) => handleInputChange("id_number", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="id_issue_date">ID Issue Date</Label>
                    <Input
                      id="id_issue_date"
                      type="date"
                      value={formData.id_issue_date}
                      onChange={(e) => handleInputChange("id_issue_date", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="id_expiry_date">ID Expiry Date</Label>
                    <Input
                      id="id_expiry_date"
                      type="date"
                      value={formData.id_expiry_date}
                      onChange={(e) => handleInputChange("id_expiry_date", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Banking Document Upload */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  Banking Information (Optional)
                </h3>
                <div>
                  <Label htmlFor="banking_file">Upload Banking Document</Label>
                  <p className="text-sm text-slate-600 mb-2">
                    Upload a void cheque or bank statement for direct deposit setup.
                  </p>
                  <div className="flex items-center gap-4">
                    <Input
                      id="banking_file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                    />
                    {uploadingFile && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                  {formData.banking_file && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ {formData.banking_file.name} uploaded successfully
                    </p>
                  )}
                </div>
              </div>

              {/* Additional Notes */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  Additional Information
                </h3>
                <div>
                  <Label htmlFor="notes">Additional Notes or Comments</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    rows={4}
                    placeholder="Any additional information you'd like to share..."
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-6">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-8 py-3 text-lg bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5 mr-2" />
                      Submit Information
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
