
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Link, Copy, Check, ExternalLink, Users, FileText, ChevronDown, ChevronUp, User, Upload, Shield, Plus } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { createPageUrl } from "@/utils";
import IntakeSubmissionsManager from "../components/intake/IntakeSubmissionsManager";

export default function ClientIntakeManager() {
  const [copied, setCopied] = useState(false);
  const [netWorthCopied, setNetWorthCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showNetWorthPreview, setShowNetWorthPreview] = useState(false);

  // Generate the shareable link URLs
  const baseUrl = window.location.origin;
  const shareableLink = `${baseUrl}${createPageUrl('ClientIntakeForm')}`; // Keep original URL name for functionality
  const netWorthShareableLink = `${baseUrl}${createPageUrl('NetWorthIntakeForm')}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyNetWorthLink = () => {
    navigator.clipboard.writeText(netWorthShareableLink);
    setNetWorthCopied(true);
    setTimeout(() => setNetWorthCopied(false), 2000);
  };

  const handleTogglePreview = () => {
    setShowPreview(!showPreview);
  };

  const handleToggleNetWorthPreview = () => {
    setShowNetWorthPreview(!showNetWorthPreview);
  };

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-green-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <RouterLink to={createPageUrl("Dashboard")}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </RouterLink>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Client Intake Form Manager</h1>
          <p className="text-slate-600">Generate shareable links and manage client intake submissions.</p>
        </div>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">Shareable Links</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="link" className="space-y-6 mt-6">
            {/* Information Update Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Information Update Form
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-600">
                  Share this link with prospects and existing clients to collect their personal and financial information for onboarding or updates.
                </p>
                
                <div className="flex gap-2">
                  <Input 
                    value={shareableLink} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button onClick={handleCopyLink} variant="outline">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button onClick={() => window.open(shareableLink, '_blank')} variant="outline">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>

                {copied && (
                  <p className="text-green-600 text-sm">✓ Link copied to clipboard!</p>
                )}

                <div className="pt-2">
                  <Button onClick={handleTogglePreview} className="bg-blue-600 hover:bg-blue-700">
                    {showPreview ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-2" />
                        Hide Form Preview
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-2" />
                        Show Form Preview
                      </>
                    )}
                  </Button>
                </div>

                {/* Expandable Form Preview */}
                {showPreview && (
                  <div className="mt-6 border-2 border-blue-200 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-purple-50">
                    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
                      {/* Form Header */}
                      <div className="text-center mb-8 p-6 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                        <User className="w-12 h-12 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold">Information Update Form</h1>
                        <p className="text-blue-100 mt-2">Please provide your information below</p>
                      </div>

                      {/* Form Sections Preview */}
                      <div className="space-y-8">
                        {/* Personal Information */}
                        <div>
                          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">1</span>
                            Personal Information
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="preview-firstname">First Name *</Label>
                              <Input id="preview-firstname" placeholder="Enter your first name" disabled />
                            </div>
                            <div>
                              <Label htmlFor="preview-lastname">Last Name *</Label>
                              <Input id="preview-lastname" placeholder="Enter your last name" disabled />
                            </div>
                            <div>
                              <Label htmlFor="preview-dob">Date of Birth</Label>
                              <Input id="preview-dob" type="date" disabled />
                            </div>
                            <div>
                              <Label htmlFor="preview-marital">Marital Status</Label>
                              <Select disabled>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </Select>
                            </div>
                            <div className="md:col-span-2">
                              <Label htmlFor="preview-citizenship">Citizenship</Label>
                              <Input id="preview-citizenship" placeholder="Enter your citizenship" disabled />
                            </div>
                          </div>
                        </div>

                        {/* Contact Information */}
                        <div>
                          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">2</span>
                            Contact Information
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="preview-address">Home Address</Label>
                              <Textarea id="preview-address" placeholder="Enter your complete address" disabled />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="preview-phone">Preferred Telephone Number</Label>
                                <Input id="preview-phone" placeholder="Enter your phone number" disabled />
                              </div>
                              <div>
                                <Label htmlFor="preview-email">Preferred Email Address *</Label>
                                <Input id="preview-email" type="email" placeholder="Enter your email" disabled />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Financial Snapshot */}
                        <div>
                          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">3</span>
                            Financial Snapshot
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="preview-income">Annual Income</Label>
                              <Input id="preview-income" type="number" placeholder="$ 0" disabled />
                            </div>
                            <div>
                              <Label htmlFor="preview-investments">Cash and Investments (Estimated)</Label>
                              <Input id="preview-investments" type="number" placeholder="$ 0" disabled />
                            </div>
                            <div>
                              <Label htmlFor="preview-realestate">Real Estate Assets (Estimated)</Label>
                              <Input id="preview-realestate" type="number" placeholder="$ 0" disabled />
                            </div>
                            <div>
                              <Label htmlFor="preview-liabilities">Total Liabilities (Estimated)</Label>
                              <Input id="preview-liabilities" type="number" placeholder="$ 0" disabled />
                            </div>
                          </div>
                        </div>

                        {/* Employment Information */}
                        <div>
                          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">4</span>
                            Employment Information
                          </h3>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="preview-employer">Employer Name</Label>
                                <Input id="preview-employer" placeholder="Enter employer name" disabled />
                              </div>
                              <div>
                                <Label htmlFor="preview-jobtitle">Job Title</Label>
                                <Input id="preview-jobtitle" placeholder="Enter your job title" disabled />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="preview-years">Years with current employer</Label>
                              <Input id="preview-years" type="number" placeholder="0" disabled />
                            </div>
                          </div>
                        </div>

                        {/* Identification */}
                        <div>
                          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">5</span>
                            Identification
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="preview-idtype">Type of ID</Label>
                              <Select disabled>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select ID type" />
                                </SelectTrigger>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="preview-idnumber">Driver's License Number</Label>
                              <Input id="preview-idnumber" placeholder="Enter ID number" disabled />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="preview-issuedate">Issue Date</Label>
                                <Input id="preview-issuedate" type="date" disabled />
                              </div>
                              <div>
                                <Label htmlFor="preview-expirydate">Expiry Date</Label>
                                <Input id="preview-expirydate" type="date" disabled />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Banking Information */}
                        <div>
                          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">6</span>
                            Banking Information
                          </h3>
                          <div>
                            <Label htmlFor="preview-banking">Upload Banking Information</Label>
                            <p className="text-sm text-slate-600 mb-2">
                              Please upload a copy of your personal void cheque or online banking screen shot.
                            </p>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                              <p className="text-sm text-gray-600">Click to upload your void cheque</p>
                            </div>
                          </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-6">
                          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3" disabled>
                            Submit Information
                          </Button>
                          <p className="text-xs text-center text-slate-500 mt-2">
                            By submitting this form, you consent to the collection and use of your information as described in our privacy policy.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Net Worth Intake Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Net Worth Intake Form
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-600">
                  Share this link with existing clients to collect detailed asset and liability information for net worth statements.
                </p>
                
                <div className="flex gap-2">
                  <Input 
                    value={netWorthShareableLink} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button onClick={handleCopyNetWorthLink} variant="outline">
                    {netWorthCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button onClick={() => window.open(netWorthShareableLink, '_blank')} variant="outline">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>

                {netWorthCopied && (
                  <p className="text-green-600 text-sm">✓ Net Worth link copied to clipboard!</p>
                )}

                <div className="pt-2">
                  <Button onClick={handleToggleNetWorthPreview} className="bg-purple-600 hover:bg-purple-700">
                    {showNetWorthPreview ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-2" />
                        Hide Form Preview
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-2" />
                        Show Form Preview
                      </>
                    )}
                  </Button>
                </div>

                {/* Net Worth Form Preview */}
                {showNetWorthPreview && (
                  <div className="mt-6 border-2 border-purple-200 rounded-lg p-6 bg-gradient-to-br from-purple-50 to-blue-50">
                    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
                      {/* Form Header */}
                      <div className="text-center mb-8 p-6 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                        <Shield className="w-12 h-12 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold">Net Worth Intake Form</h1>
                        <p className="text-blue-100 mt-2">Please provide a detailed account of your assets and liabilities.</p>
                      </div>

                      <div className="space-y-8">
                        {/* Personal Information Preview */}
                        <div>
                          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="text-slate-600">👤</span>
                            Personal Information
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>First Name *</Label>
                              <Input placeholder="Enter your first name" disabled />
                            </div>
                            <div>
                              <Label>Last Name *</Label>
                              <Input placeholder="Enter your last name" disabled />
                            </div>
                            <div>
                              <Label>Email Address *</Label>
                              <Input placeholder="Enter your email" disabled />
                            </div>
                            <div>
                              <Label>Phone Number</Label>
                              <Input placeholder="Enter your phone number" disabled />
                            </div>
                          </div>
                        </div>

                        {/* Assets Preview */}
                        <div>
                          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="text-green-600">💰</span>
                            Assets
                          </h3>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full border-dashed border-slate-300 text-slate-600"
                            disabled
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Asset
                          </Button>
                        </div>

                        {/* Liabilities Preview */}
                        <div>
                          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="text-red-600">💳</span>
                            Liabilities
                          </h3>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full border-dashed border-slate-300 text-slate-600"
                            disabled
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Liability
                          </Button>
                        </div>

                        {/* Financial Summary Preview */}
                        <div>
                          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="text-blue-600">📊</span>
                            Financial Summary
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                              <Label className="text-green-700 font-semibold">Total Assets</Label>
                              <p className="text-2xl font-bold text-green-800">$0.00</p>
                            </div>
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                              <Label className="text-red-700 font-semibold">Total Liabilities</Label>
                              <p className="text-2xl font-bold text-red-800">$0.00</p>
                            </div>
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                              <Label className="text-blue-700 font-semibold">Estimated Net Worth</Label>
                              <p className="text-2xl font-bold text-blue-800">$0.00</p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-6">
                          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3" disabled>
                            Submit Information
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-slate-600">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</div>
                    <div>
                      <p className="font-semibold">Choose the appropriate form</p>
                      <p className="text-sm">Use the Information Update Form for new prospects or general updates, or the Net Worth Intake Form for detailed financial statements.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</div>
                    <div>
                      <p className="font-semibold">Copy and share the link</p>
                      <p className="text-sm">Use the copy button to copy the form URL and share it via email, text, or any other method.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</div>
                    <div>
                      <p className="font-semibold">Review submissions</p>
                      <p className="text-sm">Monitor the "Submissions" tab to review and process incoming forms.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="submissions" className="mt-6">
            <IntakeSubmissionsManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
