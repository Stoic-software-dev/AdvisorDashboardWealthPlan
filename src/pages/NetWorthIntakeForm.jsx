import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Shield, Plus, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { NetWorthIntakeSubmission } from "@/api/entities";
import { User as UserEntity } from "@/api/entities";
import { SendEmail } from "@/api/integrations";

const ASSET_CATEGORIES = [
  'Chequing Account', 'Savings Account', 'TFSA', 'RRSP', 'Investment Account',
  'Principal Residence', 'Investment Real Estate', 'Vehicle', 'Other Real Estate', 'Other Asset'
];

const LIABILITY_CATEGORIES = [
  'Principal Mortgage', 'Investment Property Mortgage', 'Line of Credit', 'Credit Card',
  'Personal Loan', 'Vehicle Loan', 'Student Loan', 'Other Liability'
];

export default function NetWorthIntakeForm() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });

  const [assets, setAssets] = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addAsset = () => {
    const newAsset = {
      id: Date.now().toString(),
      category: '',
      description: '',
      value: ''
    };
    setAssets(prev => [...prev, newAsset]);
  };

  const updateAsset = (id, field, value) => {
    setAssets(prev => 
      prev.map(asset => 
        asset.id === id 
          ? { ...asset, [field]: value }
          : asset
      )
    );
  };

  const removeAsset = (id) => {
    setAssets(prev => prev.filter(asset => asset.id !== id));
  };

  const addLiability = () => {
    const newLiability = {
      id: Date.now().toString(),
      category: '',
      description: '',
      value: ''
    };
    setLiabilities(prev => [...prev, newLiability]);
  };

  const updateLiability = (id, field, value) => {
    setLiabilities(prev => 
      prev.map(liability => 
        liability.id === id 
          ? { ...liability, [field]: value }
          : liability
      )
    );
  };

  const removeLiability = (id) => {
    setLiabilities(prev => prev.filter(liability => liability.id !== id));
  };

  const calculateTotals = () => {
    const totalAssets = assets.reduce((sum, asset) => {
      const value = parseFloat(asset.value) || 0;
      return sum + value;
    }, 0);

    const totalLiabilities = liabilities.reduce((sum, liability) => {
      const value = parseFloat(liability.value) || 0;
      return sum + value;
    }, 0);

    const estimatedNetWorth = totalAssets - totalLiabilities;

    return { totalAssets, totalLiabilities, estimatedNetWorth };
  };

  const { totalAssets, totalLiabilities, estimatedNetWorth } = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.first_name || !formData.last_name || !formData.email) {
        throw new Error('Please fill in all required fields (First Name, Last Name, Email).');
      }

      // Validate that at least one asset or liability is added
      if (assets.length === 0 && liabilities.length === 0) {
        throw new Error('Please add at least one asset or liability.');
      }

      // Validate all assets and liabilities have required fields
      for (const asset of assets) {
        if (!asset.category || !asset.description || !asset.value) {
          throw new Error('Please fill in all asset fields (Category, Description, Value).');
        }
      }

      for (const liability of liabilities) {
        if (!liability.category || !liability.description || !liability.value) {
          throw new Error('Please fill in all liability fields (Category, Description, Value).');
        }
      }

      // Create net worth intake submission
      const submissionData = {
        ...formData,
        assets: assets.map(asset => ({
          ...asset,
          value: parseFloat(asset.value)
        })),
        liabilities: liabilities.map(liability => ({
          ...liability,
          value: parseFloat(liability.value)
        })),
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        estimated_net_worth: estimatedNetWorth,
        status: 'pending'
      };

      await NetWorthIntakeSubmission.create(submissionData);

      // Send email notification to admin
      try {
        let adminEmail = null;
        
        // Try to get admin email
        try {
          const allUsers = await UserEntity.list();
          const adminUsers = allUsers.filter(user => user.role === 'admin');
          if (adminUsers.length > 0) {
            adminEmail = adminUsers[0].email;
          }
        } catch (userError) {
          console.error('Error fetching admin users:', userError);
        }

        // Fallback to first user
        if (!adminEmail) {
          try {
            const firstUser = await UserEntity.list('created_date', 1);
            if (firstUser.length > 0) {
              adminEmail = firstUser[0].email;
            }
          } catch (userError) {
            console.error('Error fetching first user:', userError);
          }
        }

        if (adminEmail) {
          const emailBody = `
New Net Worth Intake Form Submission

Client Information:
• Name: ${formData.first_name} ${formData.last_name}
• Email: ${formData.email}
• Phone: ${formData.phone || 'Not provided'}

Financial Summary:
• Total Assets: $${totalAssets.toLocaleString()}
• Total Liabilities: $${totalLiabilities.toLocaleString()}
• Estimated Net Worth: $${estimatedNetWorth.toLocaleString()}

Assets (${assets.length}):
${assets.map(asset => `• ${asset.category}: ${asset.description} - $${parseFloat(asset.value).toLocaleString()}`).join('\n')}

Liabilities (${liabilities.length}):
${liabilities.map(liability => `• ${liability.category}: ${liability.description} - $${parseFloat(liability.value).toLocaleString()}`).join('\n')}

Please log in to your dashboard under Client Management > Client Intake Form > Submissions tab to review this net worth submission.
          `;

          await SendEmail({
            to: adminEmail,
            subject: `💰 New Net Worth Intake: ${formData.first_name} ${formData.last_name}`,
            body: emailBody
          });

          console.log('Net Worth intake email notification sent to:', adminEmail);
        }
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
      }

      setSubmitSuccess(true);
    } catch (error) {
      console.error('Error submitting form:', error);
      setError(error.message || 'An error occurred while submitting the form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600" />
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Net Worth Information Submitted Successfully!</h1>
            <p className="text-slate-600 mb-6">
              Thank you for providing your net worth information. We have received your submission and will review it shortly.
            </p>
            <div className="bg-slate-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-slate-800 mb-2">Summary of Your Submission:</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Total Assets</p>
                  <p className="font-semibold text-green-600">${totalAssets.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-500">Total Liabilities</p>
                  <p className="font-semibold text-red-600">${totalLiabilities.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-500">Estimated Net Worth</p>
                  <p className="font-semibold text-blue-600">${estimatedNetWorth.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              We will contact you soon to discuss your financial planning needs.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-xl bg-white">
          {/* Header */}
          <div className="text-center p-6 rounded-t-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <Shield className="w-12 h-12 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Net Worth Intake Form</h1>
            <p className="text-blue-100 mt-2">Please provide a detailed account of your assets and liabilities.</p>
          </div>

          <CardContent className="p-8">
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-slate-600">👤</span>
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      placeholder="Enter your first name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      placeholder="Enter your last name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>
              </div>

              {/* Assets */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-green-600">💰</span>
                  Assets
                </h3>
                <div className="space-y-4">
                  {assets.map((asset) => (
                    <div key={asset.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Category</Label>
                          <Select
                            value={asset.category}
                            onValueChange={(value) => updateAsset(asset.id, 'category', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {ASSET_CATEGORIES.map(category => (
                                <SelectItem key={category} value={category}>{category}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Input
                            value={asset.description}
                            onChange={(e) => updateAsset(asset.id, 'description', e.target.value)}
                            placeholder="Asset description"
                          />
                        </div>
                        <div>
                          <Label>Value ($)</Label>
                          <Input
                            type="number"
                            value={asset.value}
                            onChange={(e) => updateAsset(asset.id, 'value', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeAsset(asset.id)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addAsset}
                    className="w-full border-dashed border-slate-300 text-slate-600 hover:bg-slate-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Asset
                  </Button>
                </div>
              </div>

              {/* Liabilities */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-red-600">💳</span>
                  Liabilities
                </h3>
                <div className="space-y-4">
                  {liabilities.map((liability) => (
                    <div key={liability.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Category</Label>
                          <Select
                            value={liability.category}
                            onValueChange={(value) => updateLiability(liability.id, 'category', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {LIABILITY_CATEGORIES.map(category => (
                                <SelectItem key={category} value={category}>{category}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Input
                            value={liability.description}
                            onChange={(e) => updateLiability(liability.id, 'description', e.target.value)}
                            placeholder="Liability description"
                          />
                        </div>
                        <div>
                          <Label>Value ($)</Label>
                          <Input
                            type="number"
                            value={liability.value}
                            onChange={(e) => updateLiability(liability.id, 'value', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeLiability(liability.id)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addLiability}
                    className="w-full border-dashed border-slate-300 text-slate-600 hover:bg-slate-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Liability
                  </Button>
                </div>
              </div>

              {/* Financial Summary */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-blue-600">📊</span>
                  Financial Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                    <Label className="text-green-700 font-semibold">Total Assets</Label>
                    <p className="text-2xl font-bold text-green-800">${totalAssets.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                    <Label className="text-red-700 font-semibold">Total Liabilities</Label>
                    <p className="text-2xl font-bold text-red-800">${totalLiabilities.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                    <Label className="text-blue-700 font-semibold">Estimated Net Worth</Label>
                    <p className="text-2xl font-bold text-blue-800">${estimatedNetWorth.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Submitting Information...
                    </>
                  ) : (
                    'Submit Information'
                  )}
                </Button>
                <p className="text-xs text-center text-slate-500 mt-2">
                  By submitting this form, you consent to the collection and use of your information as described in our privacy policy.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}