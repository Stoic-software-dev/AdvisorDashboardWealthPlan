
import React, { useState, useEffect } from 'react';
import { TaxProfile } from '@/api/entities'; // Changed from '@/api/entities'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  FileDigit, 
  Edit, 
  Save, 
  X, 
  DollarSign, 
  Percent, 
  ExternalLink,
  CheckCircle,
  Calculator,
  Loader2,
  AlertCircle,
  UploadCloud,
  Trash2 // Added Trash2 icon
} from 'lucide-react';
import { merge } from 'lodash';
import DocumentUploadSection from '../DocumentUploadSection';

const formatCurrency = (value) => {
  if (!value || value === 0) return 'Not specified';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const ProfileDisplayCard = ({ label, value, icon: Icon, children }) => (
  <Card className="bg-slate-50">
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-medium text-slate-600">{label}</Label>
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
      </div>
      {children || <div className="text-base font-semibold text-slate-900">{value || 'Not specified'}</div>}
    </CardContent>
  </Card>
);

export default function ClientTaxProfile({ client }) {
  const [taxProfiles, setTaxProfiles] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [editedProfile, setEditedProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [extractionAlert, setExtractionAlert] = useState(null);
  const [documentCategory, setDocumentCategory] = useState('t1'); // State for document category selection

  useEffect(() => {
    if (client) {
      loadTaxProfiles();
    }
  }, [client]);

  useEffect(() => {
    const profile = taxProfiles.find(p => p.year === selectedYear);
    setSelectedProfile(profile || null);
  }, [selectedYear, taxProfiles]);

  const loadTaxProfiles = async () => {
    setIsLoading(true);
    try {
      const profiles = await TaxProfile.filter({ client_id: client.id });
      setTaxProfiles(profiles || []);
    } catch (e) {
      console.error("Failed to load tax profiles:", e);
      setError("Failed to load tax profiles.");
    }
    setIsLoading(false);
  };

  const handleDataExtracted = (extractedData, file, fileUrl) => {
    const categoryMap = {
        t1: 'T1',
        noa: 'NOA',
        other: 'Tax Document'
    };
    // Generate a default name if not provided, using selected category and year
    const formattedName = `${extractedData.year || selectedYear} ${categoryMap[documentCategory]}`;

    const dataWithMeta = {
      ...extractedData,
      source_document_name: formattedName,
      source_document_category: documentCategory,
      source_document_url: fileUrl,
    };

    setExtractionAlert({
      title: "Data Extracted Successfully!",
      description: "Review the data below. It has been pre-filled from the document. Click 'Save Profile' to confirm.",
    });

    // Merge extracted data with existing profile for the selected year
    const baseProfile = selectedProfile || {};
    // Use lodash.merge for deep merging of objects, useful for nested arrays like breakdowns
    const mergedData = merge({}, baseProfile, dataWithMeta);

    // If a year was extracted, use it and switch to it
    if (extractedData.year && extractedData.year !== selectedYear) {
      setSelectedYear(extractedData.year);
    }

    setEditedProfile(mergedData);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editedProfile) return;
    setIsLoading(true);
    
    try {
      const categoryMap = {
        t1: 'T1',
        noa: 'NOA',
        other: 'Tax Document'
      };
      // Ensure source_document_name is correctly set on save,
      // especially if category was changed during editing or if it's a new profile
      const currentDocCategory = editedProfile.source_document_category || documentCategory || 'other'; // Use edited, then current state, then default
      const formattedName = `${editedProfile.year || selectedYear} ${categoryMap[currentDocCategory]}`;

      const payload = {
        ...editedProfile,
        client_id: client.id,
        year: editedProfile.year || selectedYear, // Use edited year or default
        source_document_name: formattedName,
        source_document_category: currentDocCategory, // Ensure category is also saved
      };

      if (editedProfile.id) {
        await TaxProfile.update(editedProfile.id, payload);
      } else {
        await TaxProfile.create(payload);
      }
      
      setExtractionAlert(null);
      setIsEditing(false);
      setEditedProfile(null);
      await loadTaxProfiles();
    } catch (e) {
      console.error("Failed to save tax profile:", e);
      setError("An error occurred while saving. Please try again.");
    }
    setIsLoading(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedProfile(null);
    setExtractionAlert(null);
  };

  const handleFieldChange = (field, value) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleDeleteProfile = async () => {
    if (!selectedProfile) return;
    
    if (window.confirm(`Are you sure you want to delete the ${selectedYear} tax profile? This action cannot be undone.`)) {
      setIsLoading(true);
      try {
        await TaxProfile.delete(selectedProfile.id);
        setExtractionAlert(null); // Clear any extraction alert
        setIsEditing(false); // Exit editing mode if in it
        setEditedProfile(null); // Clear edited profile
        setSelectedProfile(null); // Clear selected profile for year
        setSelectedYear(new Date().getFullYear() - 1); // Reset selected year if needed or keep same
        await loadTaxProfiles(); // Reload all profiles to reflect deletion
      } catch (e) {
        console.error("Failed to delete tax profile:", e);
        setError("Failed to delete tax profile.");
      }
      setIsLoading(false);
    }
  };

  const renderProfileView = (profile) => (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProfileDisplayCard label="Tax Year" value={profile.year} />
        <ProfileDisplayCard label="SIN" value={profile.sin} />
        <ProfileDisplayCard label="Source Document">
          {profile.source_document_url ? (
            <Button
              variant="link"
              className="p-0 h-auto text-blue-600 justify-start"
              onClick={() => window.open(profile.source_document_url, '_blank')}
              title={`Open ${profile.source_document_name || 'Document'}`}
            >
              {profile.source_document_name || 'View Document'} <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          ) : (
            <Badge variant="outline">{profile.source_document_name || 'Manual Entry'}</Badge>
          )}
        </ProfileDisplayCard>
      </div>

      {/* Tabbed Income and Deductions */}
      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="income" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Income
          </TabsTrigger>
          <TabsTrigger value="deductions" className="flex items-center gap-2">
            <Percent className="w-4 h-4" />
            Deductions & Contributions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <ProfileDisplayCard label="Total Income (Line 15000)" value={formatCurrency(profile.total_income_line_15000)} />
                  <ProfileDisplayCard label="Net Income (Line 23600)" value={formatCurrency(profile.net_income_line_23600)} />
                  <ProfileDisplayCard label="Employment Income" value={formatCurrency(profile.employment_income)} />
                  <ProfileDisplayCard label="Pension Income" value={formatCurrency(profile.pension_income)} />
                  <ProfileDisplayCard label="Investment Income" value={formatCurrency(profile.investment_income)} />
                  <ProfileDisplayCard label="Rental Income" value={formatCurrency(profile.rental_income)} />
                  <ProfileDisplayCard label="Gross Self-Employment" value={formatCurrency(profile.gross_self_employment_income)} />
                  <ProfileDisplayCard label="Net Self-Employment" value={formatCurrency(profile.net_self_employment_income)} />
              </div>
              {profile.income_breakdown?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="w-4 h-4" />Detailed Income Breakdown</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {profile.income_breakdown.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded-md border">
                          <div>
                            <span className="font-medium">{item.description}</span>
                            {item.line_number && <Badge variant="outline" className="ml-2 text-xs">{item.line_number}</Badge>}
                          </div>
                          <span className="font-semibold text-green-600">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
        </TabsContent>

        <TabsContent value="deductions" className="mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ProfileDisplayCard label="RRSP Deduction" value={formatCurrency(profile.rrsp_deduction)} />
                <ProfileDisplayCard label="Pension Adjustment" value={formatCurrency(profile.pension_adjustment)} />
                <ProfileDisplayCard label="Childcare Expenses" value={formatCurrency(profile.childcare_expenses_deduction)} />
                <ProfileDisplayCard label="Employment Expenses" value={formatCurrency(profile.employment_expenses_deduction)} />
                <ProfileDisplayCard label="Union Dues" value={formatCurrency(profile.union_dues_deduction)} />
                <ProfileDisplayCard label="Support Payments" value={formatCurrency(profile.support_payments_deduction)} />
                <ProfileDisplayCard label="Moving Expenses" value={formatCurrency(profile.moving_expenses_deduction)} />
                <ProfileDisplayCard label="Carrying Charges" value={formatCurrency(profile.carrying_charges_deduction)} />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">NOA Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ProfileDisplayCard label="RRSP Limit (Next Year)" value={formatCurrency(profile.rrsp_deduction_limit)} />
                    <ProfileDisplayCard label="Unused RRSP Contributions" value={formatCurrency(profile.unused_rrsp_contributions)} />
                    <ProfileDisplayCard label="HBP Balance" value={formatCurrency(profile.hbp_balance)} />
                    <ProfileDisplayCard label="LLP Balance" value={formatCurrency(profile.llp_balance)} />
                  </div>
                </CardContent>
              </Card>
              {profile.deductions_breakdown?.length > 0 && (
                  <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="w-4 h-4" />Detailed Deductions Breakdown</CardTitle></CardHeader>
                  <CardContent>
                      <div className="space-y-2">
                      {profile.deductions_breakdown.map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded-md border">
                          <div>
                            <span className="font-medium">{item.description}</span>
                            {item.line_number && <Badge variant="outline" className="ml-2 text-xs">{item.line_number}</Badge>}
                          </div>
                          <span className="font-semibold text-red-600">{formatCurrency(item.amount)}</span>
                          </div>
                      ))}
                      </div>
                  </CardContent>
                  </Card>
              )}
            </div>
        </TabsContent>
      </Tabs>

      {profile.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">{profile.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderEditView = () => {
    const profile = editedProfile || {};
    
    return (
      <div className="space-y-6">
        {extractionAlert && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>{extractionAlert.title}</strong><br />
              {extractionAlert.description}
            </AlertDescription>
          </Alert>
        )}

        {/* Upload & Auto-Fill Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-green-600" />
              Upload Document to Update Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <Label htmlFor="tax-doc-category" className="text-sm font-medium">Document Type</Label>
                <Select value={documentCategory} onValueChange={setDocumentCategory}>
                  <SelectTrigger id="tax-doc-category">
                    <SelectValue placeholder="Select document type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="t1">T1 Income Tax Return</SelectItem>
                    <SelectItem value="noa">Notice of Assessment (NOA)</SelectItem>
                    <SelectItem value="other">Other Tax Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Upload Document</Label>
                <DocumentUploadSection onDataExtracted={handleDataExtracted} documentType="tax_document" />
              </div>
            </div>
            <div className="text-xs text-slate-500">
              Upload a new document to automatically merge data with the existing profile. The extracted data will appear in the form below for your review.
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="year">Tax Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={profile.year || selectedYear}
                  onChange={(e) => handleFieldChange('year', parseInt(e.target.value) || selectedYear)}
                />
              </div>
              <div>
                <Label htmlFor="sin">Social Insurance Number</Label>
                <Input
                  id="sin"
                  value={profile.sin || ''}
                  onChange={(e) => handleFieldChange('sin', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_canadian_citizen"
                  checked={profile.is_canadian_citizen || false}
                  onCheckedChange={(checked) => handleFieldChange('is_canadian_citizen', checked)}
                />
                <Label htmlFor="is_canadian_citizen">Canadian Citizen</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="foreign_property"
                  checked={profile.foreign_property_over_100k || false}
                  onCheckedChange={(checked) => handleFieldChange('foreign_property_over_100k', checked)}
                />
                <Label htmlFor="foreign_property">Foreign Property Over $100k</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Income Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Income Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="total_income">Total Income (Line 15000)</Label>
                <Input
                  id="total_income"
                  type="number"
                  value={profile.total_income_line_15000 || ''}
                  onChange={(e) => handleFieldChange('total_income_line_15000', parseFloat(e.target.value) || null)}
                />
              </div>
              <div>
                <Label htmlFor="net_income">Net Income (Line 23600)</Label>
                <Input
                  id="net_income"
                  type="number"
                  value={profile.net_income_line_23600 || ''}
                  onChange={(e) => handleFieldChange('net_income_line_23600', parseFloat(e.target.value) || null)}
                />
              </div>
              <div>
                <Label htmlFor="employment_income">Employment Income</Label>
                <Input
                  id="employment_income"
                  type="number"
                  value={profile.employment_income || ''}
                  onChange={(e) => handleFieldChange('employment_income', parseFloat(e.target.value) || null)}
                />
              </div>
              <div>
                <Label htmlFor="gross_self_employment">Gross Self-Employment Income</Label>
                <Input
                  id="gross_self_employment"
                  type="number"
                  value={profile.gross_self_employment_income || ''}
                  onChange={(e) => handleFieldChange('gross_self_employment_income', parseFloat(e.target.value) || null)}
                />
              </div>
              <div>
                <Label htmlFor="net_self_employment">Net Self-Employment Income</Label>
                <Input
                  id="net_self_employment"
                  type="number"
                  value={profile.net_self_employment_income || ''}
                  onChange={(e) => handleFieldChange('net_self_employment_income', parseFloat(e.target.value) || null)}
                />
              </div>
              <div>
                <Label htmlFor="investment_income">Investment Income</Label>
                <Input
                  id="investment_income"
                  type="number"
                  value={profile.investment_income || ''}
                  onChange={(e) => handleFieldChange('investment_income', parseFloat(e.target.value) || null)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deduction Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Deductions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rrsp_deduction">RRSP Deduction</Label>
                <Input
                  id="rrsp_deduction"
                  type="number"
                  value={profile.rrsp_deduction || ''}
                  onChange={(e) => handleFieldChange('rrsp_deduction', parseFloat(e.target.value) || null)}
                />
              </div>
              <div>
                <Label htmlFor="childcare_expenses">Childcare Expenses</Label>
                <Input
                  id="childcare_expenses"
                  type="number"
                  value={profile.childcare_expenses_deduction || ''}
                  onChange={(e) => handleFieldChange('childcare_expenses_deduction', parseFloat(e.target.value) || null)}
                />
              </div>
              <div>
                <Label htmlFor="employment_expenses">Employment Expenses</Label>
                <Input
                  id="employment_expenses"
                  type="number"
                  value={profile.employment_expenses_deduction || ''}
                  onChange={(e) => handleFieldChange('employment_expenses_deduction', parseFloat(e.target.value) || null)}
                />
              </div>
              <div>
                <Label htmlFor="union_dues">Union Dues</Label>
                <Input
                  id="union_dues"
                  type="number"
                  value={profile.union_dues_deduction || ''}
                  onChange={(e) => handleFieldChange('union_dues_deduction', parseFloat(e.target.value) || null)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* NOA Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notice of Assessment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rrsp_limit">RRSP Deduction Limit (Next Year)</Label>
                <Input
                  id="rrsp_limit"
                  type="number"
                  value={profile.rrsp_deduction_limit || ''}
                  onChange={(e) => handleFieldChange('rrsp_deduction_limit', parseFloat(e.target.value) || null)}
                />
              </div>
              <div>
                <Label htmlFor="hbp_balance">HBP Balance</Label>
                <Input
                  id="hbp_balance"
                  type="number"
                  value={profile.hbp_balance || ''}
                  onChange={(e) => handleFieldChange('hbp_balance', parseFloat(e.target.value) || null)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={profile.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              rows={3}
              placeholder="Add any additional notes about this tax profile..."
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancelEdit}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {editedProfile?.id ? 'Update Profile' : 'Save Profile'}
          </Button>
        </div>
      </div>
    );
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  // Generate options for the current year and 4 years prior
  for (let i = 0; i < 5; i++) {
    yearOptions.push(currentYear - i);
  }

  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <FileDigit className="w-5 h-5 text-green-600" />
            Tax Profile for {client.first_name} {client.last_name}
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="tax-year-select" className="text-sm">Year:</Label>
              <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                <SelectTrigger id="tax-year-select" className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isEditing && selectedProfile && (
              <div className="flex gap-2">
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
                <Button onClick={handleDeleteProfile} variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading && !isEditing ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : isEditing ? (
          renderEditView()
        ) : selectedProfile ? (
          renderProfileView(selectedProfile)
        ) : (
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold text-slate-800">No Tax Profile for {selectedYear}</h3>
            <p className="text-slate-500 my-2">You can create a new profile by uploading a document or entering data manually.</p>
            <div className="mt-6 p-6 border rounded-lg max-w-2xl mx-auto bg-slate-50/50">
                <div className="flex items-center gap-2 mb-4">
                    <UploadCloud className="w-6 h-6 text-green-600" />
                    <h4 className="font-semibold text-lg">Upload & Auto-Fill</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div>
                        <Label htmlFor="tax-doc-category" className="text-sm font-medium">1. Select Document Type</Label>
                        <Select value={documentCategory} onValueChange={setDocumentCategory}>
                            <SelectTrigger id="tax-doc-category">
                                <SelectValue placeholder="Select document type..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="t1">T1 Income Tax Return</SelectItem>
                                <SelectItem value="noa">Notice of Assessment (NOA)</SelectItem>
                                <SelectItem value="other">Other Tax Document</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                         <Label className="text-sm font-medium">2. Upload Document</Label>
                        <DocumentUploadSection onDataExtracted={handleDataExtracted} documentType="tax_document" />
                    </div>
                </div>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-slate-50/50 px-2 text-muted-foreground">Or</span>
                    </div>
                </div>

                <Button onClick={() => setIsEditing(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Enter Data Manually
                </Button>
            </div>
          </div>
        )}

        {extractionAlert && !isEditing && ( // Only show if not in editing mode already, as it's shown there
            <Alert className="mt-6 bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">{extractionAlert.title}</AlertTitle>
                <AlertDescription className="text-blue-700">
                    {extractionAlert.description}
                </AlertDescription>
            </Alert>
        )}
      </CardContent>
    </Card>
  );
}
