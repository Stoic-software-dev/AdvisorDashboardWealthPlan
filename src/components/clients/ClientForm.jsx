
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, X, Plus, Trash2, Users, Tag, Upload, User, Briefcase, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, differenceInYears } from 'date-fns';
import TaxRateSelector from "./TaxRateSelector"; // Import the new component
import ClientCombobox from '../shared/ClientCombobox'; // Added import for ClientCombobox
import DocumentUploadSection from './DocumentUploadSection'; // Import the new document upload component

export default function ClientForm({ client, clients, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    first_name: client?.first_name || "",
    last_name: client?.last_name || "",
    email: client?.email || "",
    phone: client?.phone || "",
    date_of_birth: client?.date_of_birth || "",
    address: client?.address || "",
    province: client?.province || "",
    marital_status: client?.marital_status || "", // Added marital_status field
    spouse_partner_name: client?.spouse_partner_name || "", // Added spouse_partner_name field
    citizenship: client?.citizenship || "", // Added citizenship field
    employer_name: client?.employer_name || "", // Added employer_name field
    job_title: client?.job_title || "", // Added job_title field
    years_with_employer: client?.years_with_employer || "", // Added years_with_employer field
    id_type: client?.id_type || "", // Added id_type field
    id_number: client?.id_number || "", // Added id_number field
    id_expiry_date: client?.id_expiry_date || "", // Added id_expiry_date field
    id_issue_date: client?.id_issue_date || "", // Added id_issue_date field
    occupation: client?.occupation || "",
    annual_income: client?.annual_income || "",
    marginal_tax_rate: client?.marginal_tax_rate || "", // Replaced net_worth with marginal_tax_rate
    risk_tolerance: client?.risk_tolerance || "",
    status: client?.status || "active", // Changed default status from "prospect" to "active"
    notes: client?.notes || "",
    dependents: client?.dependents || [],
    primary_client_id: client?.primary_client_id || null,
    relationship_to_primary: client?.relationship_to_primary || "",
    tags: client?.tags || []
  });
  
  const [isSecondary, setIsSecondary] = useState(!!client?.primary_client_id);
  const [shareDependents, setShareDependents] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [showDocumentUpload, setShowDocumentUpload] = useState(!client); // Show for new clients only

  // Get all existing tags from all clients
  const existingTags = [...new Set(clients?.flatMap(c => c.tags || []) || [])].sort();

  // Fixed date formatting for dependents as well
  const formatDateWithoutTimezone = (dateString) => {
    if (!dateString) return '';
    try {
      const [year, month, day] = dateString.split('-');
      // Create date without timezone issues by using UTC methods or by parsing parts
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      // Check for invalid date
      if (isNaN(date.getTime())) {
        return dateString; // Return original string if date is invalid
      }
      return format(date, "PPP");
    } catch (e) {
      console.error("Error formatting date:", e);
      return dateString;
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return '';
    try {
      const [year, month, day] = dob.split('-');
      // Create date without timezone issues by using UTC methods or by parsing parts
      const birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      if (isNaN(birthDate.getTime())) {
        return '';
      }
      return `Age ${differenceInYears(new Date(), birthDate)}`;
    } catch (e) {
      console.error("Error calculating age:", e);
      return '';
    }
  };

  // Format phone number as (416) 889-0855
  const formatPhoneNumber = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Limit to 10 digits
    const limitedDigits = digits.slice(0, 10);
    
    // Format based on length
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
    handleChange("phone", formatted);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle data extracted from documents
  const handleDocumentDataExtracted = (extractedData) => {
    // Create a mapping for common field variations
    const fieldMappings = {
      'first_name': ['first_name', 'firstname', 'given_name'],
      'last_name': ['last_name', 'lastname', 'surname', 'family_name'],
      'email': ['email', 'email_address'],
      'phone': ['phone', 'phone_number', 'telephone'],
      'address': ['address', 'street_address', 'mailing_address'],
      'annual_income': ['annual_income', 'income', 'total_income', 'employment_income'],
      'occupation': ['occupation', 'job_title', 'employment'], // occupation and job_title can overlap
      'date_of_birth': ['date_of_birth', 'dob', 'birth_date'],
      'marital_status': ['marital_status', 'marital'],
      'citizenship': ['citizenship', 'nationality'],
      'employer_name': ['employer_name', 'employer'],
      'job_title': ['job_title'],
      'years_with_employer': ['years_with_employer', 'years_at_employer'],
      'id_number': ['id_number', 'license_number', 'drivers_license_number'],
      'id_issue_date': ['id_issue_date', 'issue_date'],
      'id_expiry_date': ['id_expiry_date', 'expiry_date'],
      'spouse_partner_name': ['spouse_partner_name', 'spouse_name', 'partner_name'],
    };

    const updatedFormData = { ...formData };

    // Process extracted data and map to form fields
    Object.entries(extractedData).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;

      // Find the form field that matches this extracted key
      const formField = Object.keys(fieldMappings).find(field =>
        fieldMappings[field].includes(key.toLowerCase())
      );

      if (formField && (!updatedFormData[formField] || updatedFormData[formField] === '')) {
        // Special handling for different field types
        if (formField === 'annual_income' && typeof value === 'number') {
          updatedFormData[formField] = value.toString();
        } else if (formField === 'years_with_employer' && typeof value === 'number') {
          updatedFormData[formField] = value.toString();
        } else if (formField === 'phone' && typeof value === 'string') {
          updatedFormData[formField] = formatPhoneNumber(value);
        } else if (['date_of_birth', 'id_issue_date', 'id_expiry_date'].includes(formField) && typeof value === 'string') {
          // Try to parse and format the date
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              updatedFormData[formField] = date.toISOString().split('T')[0];
            }
          } catch (e) {
            console.warn(`Could not parse date for ${formField}:`, value, e);
          }
        } else if (typeof value === 'string') {
          updatedFormData[formField] = value;
        }
      }
    });

    // Handle dependents separately
    if (extractedData.dependents && Array.isArray(extractedData.dependents)) {
      const processedDependents = extractedData.dependents.map(dep => ({
        name: dep.name || '',
        date_of_birth: dep.date_of_birth || '',
        relationship: dep.relationship || 'Child'
      }));
      updatedFormData.dependents = [...(formData.dependents || []), ...processedDependents];
    }

    // Update province mapping if address contains province info
    if (extractedData.province || (extractedData.address && typeof extractedData.address === 'string')) {
      const provinceMap = {
        'ontario': 'ON', 'on': 'ON', 'ont': 'ON',
        'quebec': 'QC', 'qc': 'QC', 'que': 'QC',
        'british columbia': 'BC', 'bc': 'BC',
        'alberta': 'AB', 'ab': 'AB', 'alta': 'AB',
        'manitoba': 'MB', 'mb': 'MB', 'man': 'MB',
        'saskatchewan': 'SK', 'sk': 'SK', 'sask': 'SK',
        'nova scotia': 'NS', 'ns': 'NS',
        'new brunswick': 'NB', 'nb': 'NB',
        'newfoundland': 'NL', 'nl': 'NL',
        'prince edward island': 'PE', 'pe': 'PE', 'pei': 'PE'
      };

      const provinceText = (extractedData.province || extractedData.address || '').toLowerCase();
      const matchedProvince = Object.keys(provinceMap).find(key => 
        provinceText.includes(key)
      );
      
      if (matchedProvince && !updatedFormData.province) {
        updatedFormData.province = provinceMap[matchedProvince];
      }
    }

    setFormData(updatedFormData);
  };

  const handleIsSecondaryChange = (checked) => {
    setIsSecondary(checked);
    if (!checked) {
      setFormData(prev => ({
        ...prev,
        primary_client_id: null,
        relationship_to_primary: ""
      }));
      setShareDependents(false);
    }
  };

  const handleShareDependentsChange = (checked) => {
    setShareDependents(checked);
    if (checked && formData.primary_client_id) {
      // Get primary client's dependents
      const primaryClient = clients?.find(c => c.id === formData.primary_client_id);
      if (primaryClient?.dependents) {
        setFormData(prev => ({
          ...prev,
          dependents: [...primaryClient.dependents]
        }));
      }
    }
  };

  const handlePrimaryClientChange = (primaryClientId) => {
    handleChange("primary_client_id", primaryClientId);
    
    // If sharing dependents, update dependents list
    if (shareDependents) {
      const primaryClient = clients?.find(c => c.id === primaryClientId);
      if (primaryClient?.dependents) {
        setFormData(prev => ({
          ...prev,
          dependents: [...primaryClient.dependents]
        }));
      }
    }
  };

  const handleDependentChange = (index, field, value) => {
    const newDependents = [...formData.dependents];
    newDependents[index] = { ...newDependents[index], [field]: value };
    setFormData(prev => ({ ...prev, dependents: newDependents }));
  };

  const addDependent = () => {
    setFormData(prev => ({
      ...prev,
      dependents: [...(prev.dependents || []), { name: '', date_of_birth: '', relationship: '' }]
    }));
  };

  const removeDependent = (index) => {
    const newDependents = [...formData.dependents];
    newDependents.splice(index, 1);
    setFormData(prev => ({ ...prev, dependents: newDependents }));
  };
  
  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim() !== '') {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!formData.tags.includes(newTag)) {
        handleChange("tags", [...formData.tags, newTag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    handleChange("tags", formData.tags.filter(tag => tag !== tagToRemove));
  };

  const handleToggleExistingTag = (tag) => {
    if (formData.tags.includes(tag)) {
      // Remove tag if already selected
      handleChange("tags", formData.tags.filter(t => t !== tag));
    } else {
      // Add tag if not selected
      handleChange("tags", [...formData.tags, tag]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      annual_income: formData.annual_income ? parseFloat(formData.annual_income) : null,
      years_with_employer: formData.years_with_employer ? parseInt(formData.years_with_employer, 10) : null, // Ensure years_with_employer is parsed as integer
      marginal_tax_rate: formData.marginal_tax_rate ? parseFloat(formData.marginal_tax_rate) : null, // Updated for marginal_tax_rate
      primary_client_id: isSecondary ? formData.primary_client_id : null,
      relationship_to_primary: isSecondary ? formData.relationship_to_primary : null,
    };
    onSubmit(submitData);
  };
  
  const potentialPrimaryClients = clients ? clients.filter(c => c.id !== client?.id) : [];
  const primaryClient = formData.primary_client_id ? clients?.find(c => c.id === formData.primary_client_id) : null;

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {client ? "Edit Client" : "Add New Client"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Document Upload Section - Only for new clients */}
          {showDocumentUpload && !client && (
            <DocumentUploadSection onDataExtracted={handleDocumentDataExtracted} />
          )}

          {/* Toggle Document Upload Section - Only for new clients */}
          {!client && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDocumentUpload(!showDocumentUpload)}
                className="text-sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                {showDocumentUpload ? 'Hide Document Upload' : 'Upload Document to Auto-Fill'}
              </Button>
            </div>
          )}

          {/* Basic Information */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><User className="w-4 h-4" />Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleChange("first_name", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleChange("last_name", e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Updated section for Email and Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handlePhoneChange} // Preserving existing formatting logic
                    placeholder="(999) 999-9999" // Updated placeholder
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleChange("date_of_birth", e.target.value)}
                  />
                </div>
                <div>
                   <Label htmlFor="citizenship">Citizenship</Label>
                  <Input
                    id="citizenship"
                    value={formData.citizenship}
                    onChange={(e) => handleChange("citizenship", e.target.value)}
                  />
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                 <div>
                    <Label htmlFor="marital_status">Marital Status</Label>
                    <Select value={formData.marital_status} onValueChange={(value) => handleChange("marital_status", value)}>
                        <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
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
                            onChange={(e) => handleChange("spouse_partner_name", e.target.value)}
                        />
                    </div>
                )}
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="province">Province</Label>
                  <Select value={formData.province} onValueChange={(value) => handleChange("province", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select province..." />
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

               <div className="mt-4">
                  <Label htmlFor="status">Client Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
            </CardContent>
          </Card>

          {/* Professional & Financial Information */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Briefcase className="w-4 h-4"/>Professional & Financial Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employer_name">Employer Name</Label>
                  <Input
                    id="employer_name"
                    value={formData.employer_name}
                    onChange={(e) => handleChange("employer_name", e.target.value)}
                  />
                </div>
                 <div>
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    value={formData.occupation}
                    onChange={(e) => handleChange("occupation", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    value={formData.job_title}
                    onChange={(e) => handleChange("job_title", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="years_with_employer">Years with Employer</Label>
                  <Input
                    id="years_with_employer"
                    type="number"
                    value={formData.years_with_employer}
                    onChange={(e) => handleChange("years_with_employer", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="annual_income">Annual Income ($)</Label>
                  <Input
                    id="annual_income"
                    type="number"
                    value={formData.annual_income}
                    onChange={(e) => handleChange("annual_income", e.target.value)}
                  />
                </div>
                <TaxRateSelector 
                  value={formData.marginal_tax_rate}
                  onChange={(rate) => handleChange("marginal_tax_rate", rate)}
                  province={formData.province}
                />
              </div>
               <div className="mt-4">
                  <Label htmlFor="risk_tolerance">Risk Tolerance</Label>
                  <Select value={formData.risk_tolerance} onValueChange={(value) => handleChange("risk_tolerance", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select risk tolerance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
            </CardContent>
          </Card>

          {/* Identification Information */}
          <Card>
            <CardContent className="p-4">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Shield className="w-4 h-4"/>Identification</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="id_type">ID Type</Label>
                        <Select value={formData.id_type} onValueChange={(value) => handleChange("id_type", value)}>
                            <SelectTrigger><SelectValue placeholder="Select ID type..."/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="drivers_license">Driver's License</SelectItem>
                                <SelectItem value="other_photo_id">Other Photo ID</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="id_number">ID Number</Label>
                        <Input id="id_number" value={formData.id_number} onChange={(e) => handleChange("id_number", e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="id_issue_date">ID Issue Date</Label>
                        <Input id="id_issue_date" type="date" value={formData.id_issue_date} onChange={(e) => handleChange("id_issue_date", e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="id_expiry_date">ID Expiry Date</Label>
                        <Input id="id_expiry_date" type="date" value={formData.id_expiry_date} onChange={(e) => handleChange("id_expiry_date", e.target.value)} />
                    </div>
                </div>
            </CardContent>
          </Card>

          {/* Household Management */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4"/>Household Management
              </h3>
              <div className="flex items-center space-x-2 mb-4">
                <Switch 
                  id="is-secondary" 
                  checked={isSecondary}
                  onCheckedChange={handleIsSecondaryChange}
                />
                <Label htmlFor="is-secondary">This is a secondary client in a household</Label>
              </div>

              {isSecondary && (
                <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="primary_client_id">Primary Client *</Label>
                      <ClientCombobox
                        clients={potentialPrimaryClients}
                        value={formData.primary_client_id}
                        onChange={handlePrimaryClientChange}
                        placeholder="Select primary client"
                        showNoneOption={false}
                      />
                    </div>
                    <div>
                      <Label htmlFor="relationship_to_primary">Relationship *</Label>
                       <Select 
                        value={formData.relationship_to_primary || ""} 
                        onValueChange={(value) => handleChange("relationship_to_primary", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Spouse">Spouse</SelectItem>
                          <SelectItem value="Partner">Partner</SelectItem>
                          <SelectItem value="Child">Child</SelectItem>
                          <SelectItem value="Parent">Parent</SelectItem>
                          <SelectItem value="Sibling">Sibling</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.primary_client_id && primaryClient?.dependents && primaryClient.dependents.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="share-dependents"
                        checked={shareDependents}
                        onCheckedChange={handleShareDependentsChange}
                      />
                      <Label htmlFor="share-dependents" className="text-sm">
                        Share dependents with {primaryClient.first_name} {primaryClient.last_name} ({primaryClient.dependents.length} dependent{primaryClient.dependents.length !== 1 ? 's' : ''})
                      </Label>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Tags */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Tag className="w-4 h-4"/>Client Tags
              </h3>
              
              {/* Selected Tags Display */}
              {formData.tags.length > 0 && (
                <div className="mb-4">
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">Selected Tags:</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="default" className="capitalize text-sm">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 rounded-full hover:bg-black/20 p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing Tags Selection */}
              {existingTags.length > 0 && (
                <div className="mb-4">
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">
                    Click to select existing tags:
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {existingTags.map((tag) => (
                      <Button
                        key={tag}
                        type="button"
                        variant={formData.tags.includes(tag) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleToggleExistingTag(tag)}
                        className="capitalize text-xs h-7"
                      >
                        {tag}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* New Tag Input */}
              <div>
                <Label htmlFor="new-tag" className="text-sm font-medium text-slate-700 mb-2 block">
                  Add new tag:
                </Label>
                <Input
                  id="new-tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Type a new tag and press Enter..."
                />
                <p className="text-xs text-slate-500 mt-2">
                  Press Enter to add a new tag. Tags help you categorize and filter clients.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Financial Dependents */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-900">Financial Dependents</h3>
                {!shareDependents && (
                  <Button type="button" size="sm" variant="outline" onClick={addDependent}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Dependent
                  </Button>
                )}
              </div>
              
              {shareDependents && primaryClient && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Shared with {primaryClient.first_name} {primaryClient.last_name}:</strong> Changes to dependents will be reflected for both clients in this household.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {formData.dependents?.map((dependent, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border rounded-lg relative">
                    {!shareDependents && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-7 w-7 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        onClick={() => removeDependent(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    <div>
                      <Label htmlFor={`dep_name_${index}`}>Full Name</Label>
                      <Input
                        id={`dep_name_${index}`}
                        value={dependent.name}
                        onChange={(e) => handleDependentChange(index, "name", e.target.value)}
                        placeholder="e.g., Jane Doe"
                        disabled={shareDependents}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`dep_dob_${index}`}>Date of Birth</Label>
                      <Input
                        id={`dep_dob_${index}`}
                        type="date"
                        value={dependent.date_of_birth}
                        onChange={(e) => handleDependentChange(index, "date_of_birth", e.target.value)}
                        disabled={shareDependents}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`dep_rel_${index}`}>Relationship</Label>
                      <Select
                        value={dependent.relationship}
                        onValueChange={(value) => handleDependentChange(index, "relationship", value)}
                        disabled={shareDependents}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Spouse">Spouse</SelectItem>
                          <SelectItem value="Child">Child</SelectItem>
                          <SelectItem value="Parent">Parent</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
                {!formData.dependents || formData.dependents.length === 0 && (
                  <p className="text-sm text-center text-slate-500 py-2">No dependents added.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-slate-900 mb-4">Additional Notes</h3>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={3}
                placeholder="Add any additional notes about this client..."
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              {client ? "Update Client" : "Create Client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
