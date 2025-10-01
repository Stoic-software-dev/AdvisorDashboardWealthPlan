
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserCheck, CheckCircle2, AlertTriangle, Loader2, User } from "lucide-react";
import { ClientSelfUpdateLink } from "@/api/entities";
import { Client } from "@/api/entities";
import { SendEmail } from "@/api/integrations";
import { User as UserEntity } from '@/api/entities'; // Import User to get admin email

export default function ClientSelfUpdateForm() {
  const [loading, setLoading] = useState(true);
  const [linkData, setLinkData] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    validateToken();
  }, []);

  const validateToken = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        setError('No update token provided.');
        setLoading(false);
        return;
      }

      // Find the ClientSelfUpdateLink record by token
      const allLinks = await ClientSelfUpdateLink.list();
      const linkRecord = allLinks.find(link => link.token === token);

      if (!linkRecord) {
        setError('This update link is invalid. Please request a new link from your advisor.');
        setLoading(false);
        return;
      }

      // Check if link has expired
      const now = new Date();
      const expiryDate = new Date(linkRecord.expires_at);
      if (now > expiryDate) {
        setError('This update link has expired. Please request a new link from your advisor.');
        setLoading(false);
        return;
      }

      // Check if link has already been used
      if (linkRecord.status === 'submitted') {
        setError('This update link has already been used. Please request a new link from your advisor.');
        setLoading(false);
        return;
      }

      // Get client data
      const client = await Client.get(linkRecord.client_id);
      if (!client) {
        setError('Client data not found. Please contact your advisor.');
        setLoading(false);
        return;
      }

      setLinkData(linkRecord);
      setClientData(client);
      setFormData({
        first_name: client.first_name || '',
        last_name: client.last_name || '',
        email: client.email || '',
        phone: client.phone || '',
        date_of_birth: client.date_of_birth || '',
        address: client.address || '',
        province: client.province || '',
        marital_status: client.marital_status || '',
        spouse_partner_name: client.spouse_partner_name || '',
        citizenship: client.citizenship || '',
        employer_name: client.employer_name || '',
        job_title: client.job_title || '',
        years_with_employer: client.years_with_employer || '',
        annual_income: client.annual_income || '',
        notes: ''
      });

    } catch (error) {
      console.error('Error validating token:', error);
      setError('An error occurred while validating the update link. Please try again or contact your advisor.');
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Check if the link is still valid one last time before submitting
      const linkRecord = await ClientSelfUpdateLink.get(linkData.id);
      if (!linkRecord || linkRecord.status === 'submitted') {
        setError('This update link has already been used or is no longer valid.');
        setIsSubmitting(false);
        setSubmitSuccess(false); // Ensure success message doesn't show
        // Optionally, force a reload or state change to show the main error screen
        validateToken(); // Re-run validation to show the correct error screen
        return;
      }

      // Update the client record with new information
      const updateData = {
        ...formData,
        annual_income: formData.annual_income ? parseFloat(formData.annual_income) : null,
        years_with_employer: formData.years_with_employer ? parseInt(formData.years_with_employer, 10) : null,
      };

      await Client.update(clientData.id, updateData);

      // Mark the link as used
      await ClientSelfUpdateLink.update(linkData.id, {
        status: 'submitted'
      });

      // Send notification email to admin
      try {
        // Fetch all admin users to notify them.
        const admins = await UserEntity.filter({ role: 'admin' });
        const adminEmails = admins.map(admin => admin.email);

        if (adminEmails.length > 0) {
          const changedFields = [];
          Object.keys(formData).forEach(key => {
            if (key !== 'notes' && formData[key] !== (clientData[key] || '')) {
              changedFields.push(`• ${key.replace('_', ' ')}: "${clientData[key] || 'Not set'}" → "${formData[key]}"`);
            }
          });

          const emailBody = `
${clientData.first_name} ${clientData.last_name} has updated their information via the self-service link.

Updated Fields:
${changedFields.length > 0 ? changedFields.join('\n') : 'No changes made to existing fields'}

${formData.notes ? `Additional Notes:\n${formData.notes}` : ''}

You can review the updated information in their client profile.
          `;
          
          // Send email to all admins
          await Promise.all(adminEmails.map(adminEmail => 
            SendEmail({
              to: adminEmail,
              subject: `Client Information Updated: ${clientData.first_name} ${clientData.last_name}`,
              body: emailBody
            })
          ));
        }
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
        // Don't fail the submission if email fails
      }

      setSubmitSuccess(true);
    } catch (error) {
      console.error('Error updating client:', error);
      setError('An error occurred while updating your information. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-6">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-slate-600">Validating update link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-red-600 mb-4">Update Link Error</h1>
            <p className="text-slate-600 mb-4">{error}</p>
            <p className="text-sm text-slate-500">
              If you believe this is an error, please contact your financial advisor to request a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-green-600 mb-4">Information Updated</h1>
            <p className="text-slate-600 mb-4">
              Thank you! Your information has been successfully updated. Your financial advisor will be notified of the changes.
            </p>
            <p className="text-sm text-slate-500">
              You can now close this page. If you need to make additional changes, please contact your advisor for a new update link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
            <div className="text-center">
              <UserCheck className="w-12 h-12 mx-auto mb-3" />
              <CardTitle className="text-2xl font-bold">Client Self-Update</CardTitle>
              <p className="text-blue-100 mt-2">
                Please review and update your information below.
              </p>
            </div>
          </CardHeader>
        </Card>

        {/* Form */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder="(999) 999-9999"
                    />
                  </div>
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
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="marital_status">Marital Status</Label>
                    <Select value={formData.marital_status} onValueChange={(value) => handleInputChange("marital_status", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status..." />
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="province">Province</Label>
                    <Select value={formData.province} onValueChange={(value) => handleInputChange("province", value)}>
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
              </div>

              {/* Employment Information */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Employment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employer_name">Employer Name</Label>
                    <Input
                      id="employer_name"
                      value={formData.employer_name}
                      onChange={(e) => handleInputChange("employer_name", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="job_title">Job Title</Label>
                    <Input
                      id="job_title"
                      value={formData.job_title}
                      onChange={(e) => handleInputChange("job_title", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="years_with_employer">Years with Employer</Label>
                    <Input
                      id="years_with_employer"
                      type="number"
                      value={formData.years_with_employer}
                      onChange={(e) => handleInputChange("years_with_employer", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="annual_income">Annual Income ($)</Label>
                    <Input
                      id="annual_income"
                      type="number"
                      value={formData.annual_income}
                      onChange={(e) => handleInputChange("annual_income", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Additional Notes</h3>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  rows={4}
                  placeholder="Please share any additional information or changes you'd like your advisor to know about..."
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-6">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Updating Information...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Update My Information
                    </>
                  )}
                </Button>
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="text-center text-sm text-slate-500 pt-4">
                By submitting this form, you consent to our privacy policy.
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
