import React, { useState, useEffect, useMemo } from "react";
import { Client, NetWorthStatement, User, Asset, Liability, NetWorthIntakeLink } from "@/api/entities";
import { SendEmail } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  User as UserIcon,
  PlusCircle,
  Trash2
} from "lucide-react";
import { AppSettings } from "@/api/entities";

const theme = {
  gradient_from: '#4a90e2',
  gradient_to: '#6b3fa0',
};

const assetCategories = ["Capital Registered", "Capital Non-Registered", "Capital Tax-Free", "Principal Residence", "Investment Real Estate", "Other Real Estate", "Other"];
const liabilityCategories = ["Principal Mortgage", "Long-Term Debt", "Short-Term Debt", "Other Liability"];

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

export default function NetWorthUpdateForm() {
  const [client, setClient] = useState(null);
  const [assets, setAssets] = useState([]);
  const [liabilities, setLiabilities] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
  const [submitMessage, setSubmitMessage] = useState("");
  const [appSettings, setAppSettings] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    const validateTokenAndLoadClient = async () => {
      if (!token) {
        setIsValidToken(false);
        setIsLoading(false);
        setSubmitStatus('error');
        setSubmitMessage("This link is missing a security token. Please contact your advisor.");
        return;
      }

      try {
        const links = await NetWorthIntakeLink.filter({ token: token, status: "pending" });
        const link = links[0];

        if (link && new Date(link.expires_at) > new Date()) {
          const clientData = await Client.get(link.client_id);
          setClient(clientData);
          setIsValidToken(true);
        } else {
          setIsValidToken(false);
          setSubmitStatus('error');
          setSubmitMessage("This link is either invalid or has expired. Please request a new one from your advisor.");
        }
      } catch (error) {
        console.error("Error validating token:", error);
        setIsValidToken(false);
        setSubmitStatus('error');
        setSubmitMessage("An error occurred while trying to validate your link. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    
    validateTokenAndLoadClient();

    const fetchAppSettings = async () => {
      try {
        const settings = await AppSettings.list();
        if (settings.length > 0) {
          setAppSettings(settings[0]);
        }
      } catch (error) {
        console.error("Error fetching app settings:", error);
      }
    };
    fetchAppSettings();

  }, []);

  const totalAssets = useMemo(() => assets.reduce((sum, asset) => sum + (parseFloat(asset.asset_value) || 0), 0), [assets]);
  const totalLiabilities = useMemo(() => liabilities.reduce((sum, liability) => sum + (parseFloat(liability.liability_value) || 0), 0), [liabilities]);
  const netWorth = useMemo(() => totalAssets - totalLiabilities, [totalAssets, totalLiabilities]);

  // Asset handlers
  const addAsset = () => setAssets([...assets, { id: generateId(), asset_category: '', asset_name: '', asset_value: '' }]);
  const updateAsset = (id, field, value) => {
    setAssets(assets.map(asset => asset.id === id ? { ...asset, [field]: value } : asset));
  };
  const removeAsset = (id) => setAssets(assets.filter(asset => asset.id !== id));

  // Liability handlers
  const addLiability = () => setLiabilities([...liabilities, { id: generateId(), liability_category: '', liability_name: '', liability_value: '' }]);
  const updateLiability = (id, field, value) => {
    setLiabilities(liabilities.map(liability => liability.id === id ? { ...liability, [field]: value } : liability));
  };
  const removeLiability = (id) => setLiabilities(liabilities.filter(liability => liability.id !== id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!client) return;

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // 1. Create Net Worth Statement
      const newStatement = await NetWorthStatement.create({
        name: `Client Submitted Net Worth - ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}`,
        statement_date: new Date().toISOString().split('T')[0],
        client_ids: [client.id],
        status: 'draft',
      });

      // 2. Prepare and bulk create assets
      if (assets.length > 0) {
        const assetsToCreate = assets.map(a => ({
          statement_id: newStatement.id,
          owner_client_id: client.id,
          asset_category: a.asset_category,
          asset_name: a.asset_name,
          asset_value: parseFloat(a.asset_value) || 0,
        }));
        await Asset.bulkCreate(assetsToCreate);
      }

      // 3. Prepare and bulk create liabilities
      if (liabilities.length > 0) {
        const liabilitiesToCreate = liabilities.map(l => ({
          statement_id: newStatement.id,
          owner_client_id: client.id,
          liability_category: l.liability_category,
          liability_name: l.liability_name,
          liability_value: parseFloat(l.liability_value) || 0,
        }));
        await Liability.bulkCreate(liabilitiesToCreate);
      }
      
      // 4. Invalidate the link
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const links = await NetWorthIntakeLink.filter({ token: token });
      if (links.length > 0) {
        await NetWorthIntakeLink.update(links[0].id, { status: 'submitted' });
      }

      // 5. Send notification email to the advisor
      try {
        const advisor = await User.me();
        const appName = appSettings?.crm_name || "FinanceFlow";
        
        if (advisor && advisor.email) {
          await SendEmail({
            to: advisor.email,
            subject: `Net Worth Update from ${client.first_name} ${client.last_name}`,
            body: `
              <p>${client.first_name} ${client.last_name} has submitted an updated net worth statement through the secure link.</p>
              <p>You can view the new statement in their client profile under the Financial Statements tab.</p>
              <p>-- ${appName} --</p>
            `,
          });
        }
      } catch (emailError) {
        console.warn("Could not send advisor notification email:", emailError);
      }

      setSubmitStatus('success');
      setSubmitMessage("Thank you! Your information has been securely submitted to your advisor.");

    } catch (error) {
      console.error("Error submitting net worth statement:", error);
      setSubmitStatus('error');
      setSubmitMessage("An unexpected error occurred. Please try again or contact your advisor.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
        <p className="ml-4 text-slate-600">Verifying secure link...</p>
      </div>
    );
  }

  if (!isValidToken || submitStatus === 'error') {
     return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
          <Card className="w-full max-w-lg text-center shadow-xl">
            <CardHeader className="bg-red-500 text-white">
              <CardTitle className="flex items-center justify-center gap-2">
                <AlertCircle className="w-6 h-6" />
                Access Denied
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-lg text-slate-700">{submitMessage}</p>
            </CardContent>
          </Card>
        </div>
      );
  }
  
  if (submitStatus === 'success') {
     return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
          <Card className="w-full max-w-lg text-center shadow-xl">
            <CardHeader className="bg-green-600 text-white">
              <CardTitle className="flex items-center justify-center gap-2">
                <CheckCircle className="w-6 h-6" />
                Submission Successful
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-lg text-slate-700">{submitMessage}</p>
            </CardContent>
          </Card>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div 
          className="w-full text-white p-8 rounded-t-xl shadow-2xl flex flex-col items-center text-center"
          style={{
            background: `linear-gradient(to right, ${theme.gradient_from}, ${theme.gradient_to})`
          }}
        >
          <Shield className="w-12 h-12 mb-4" />
          <h1 className="text-3xl font-bold">Client Net Worth Update</h1>
          <p className="mt-2 text-white/90">Please provide a detailed breakdown of your assets and liabilities.</p>
        </div>

        {/* Form Body */}
        <div className="bg-white p-8 rounded-b-xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Personal Information */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-slate-800">
                  <UserIcon className="w-5 h-5 text-slate-500" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>First Name</Label>
                  <Input value={client.first_name} readOnly className="mt-1 bg-slate-100" />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input value={client.last_name} readOnly className="mt-1 bg-slate-100" />
                </div>
                <div>
                  <Label>Email Address</Label>
                  <Input value={client.email} readOnly className="mt-1 bg-slate-100" />
                </div>
              </CardContent>
            </Card>

            {/* Assets Section */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-xl text-slate-800">
                  <span className="flex items-center gap-2">Assets</span>
                  <Button type="button" variant="outline" size="sm" onClick={addAsset} className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Add Asset
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {assets.map((asset, index) => (
                  <div key={asset.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end p-3 border rounded-md bg-slate-50/50">
                    <div className="md:col-span-1">
                      <Label htmlFor={`asset-cat-${index}`}>Category</Label>
                      <Select value={asset.asset_category} onValueChange={(val) => updateAsset(asset.id, 'asset_category', val)}>
                        <SelectTrigger id={`asset-cat-${index}`} className="mt-1">
                          <SelectValue placeholder="Select category..." />
                        </SelectTrigger>
                        <SelectContent>
                          {assetCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-1">
                      <Label htmlFor={`asset-name-${index}`}>Name / Description</Label>
                      <Input id={`asset-name-${index}`} placeholder="e.g., TFSA, Principal Residence" value={asset.asset_name} onChange={(e) => updateAsset(asset.id, 'asset_name', e.target.value)} className="mt-1" />
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="flex-grow">
                        <Label htmlFor={`asset-val-${index}`}>Value ($)</Label>
                        <Input id={`asset-val-${index}`} type="number" placeholder="e.g., 50000" value={asset.asset_value} onChange={(e) => updateAsset(asset.id, 'asset_value', e.target.value)} className="mt-1" />
                       </div>
                       <Button type="button" variant="ghost" size="icon" onClick={() => removeAsset(asset.id)} className="text-red-500 hover:bg-red-100 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                       </Button>
                    </div>
                  </div>
                ))}
                {assets.length === 0 && <p className="text-center text-slate-500 py-4">No assets added yet.</p>}
              </CardContent>
            </Card>

            {/* Liabilities Section */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-xl text-slate-800">
                  <span className="flex items-center gap-2">Liabilities</span>
                  <Button type="button" variant="outline" size="sm" onClick={addLiability} className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Add Liability
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {liabilities.map((liability, index) => (
                  <div key={liability.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end p-3 border rounded-md bg-slate-50/50">
                    <div className="md:col-span-1">
                      <Label htmlFor={`lia-cat-${index}`}>Category</Label>
                      <Select value={liability.liability_category} onValueChange={(val) => updateLiability(liability.id, 'liability_category', val)}>
                        <SelectTrigger id={`lia-cat-${index}`} className="mt-1">
                          <SelectValue placeholder="Select category..." />
                        </SelectTrigger>
                        <SelectContent>
                          {liabilityCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-1">
                      <Label htmlFor={`lia-name-${index}`}>Name / Description</Label>
                      <Input id={`lia-name-${index}`} placeholder="e.g., Mortgage, Car Loan" value={liability.liability_name} onChange={(e) => updateLiability(liability.id, 'liability_name', e.target.value)} className="mt-1" />
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="flex-grow">
                        <Label htmlFor={`lia-val-${index}`}>Balance ($)</Label>
                        <Input id={`lia-val-${index}`} type="number" placeholder="e.g., 250000" value={liability.liability_value} onChange={(e) => updateLiability(liability.id, 'liability_value', e.target.value)} className="mt-1" />
                       </div>
                       <Button type="button" variant="ghost" size="icon" onClick={() => removeLiability(liability.id)} className="text-red-500 hover:bg-red-100 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                       </Button>
                    </div>
                  </div>
                ))}
                {liabilities.length === 0 && <p className="text-center text-slate-500 py-4">No liabilities added yet.</p>}
              </CardContent>
            </Card>

            {/* Summary Section */}
            <Card className="border-slate-200 shadow-sm bg-slate-50">
              <CardHeader>
                <CardTitle className="text-xl text-slate-800">Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-green-100 rounded-lg">
                  <p className="text-sm font-medium text-green-800">Total Assets</p>
                  <p className="text-2xl font-bold text-green-900">${totalAssets.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-red-100 rounded-lg">
                  <p className="text-sm font-medium text-red-800">Total Liabilities</p>
                  <p className="text-2xl font-bold text-red-900">${totalLiabilities.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-blue-100 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">Estimated Net Worth</p>
                  <p className="text-2xl font-bold text-blue-900">${netWorth.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            
            {/* Submit Button */}
            <div className="text-center">
              <Button type="submit" size="lg" disabled={isSubmitting} className="w-full max-w-xs text-lg">
                {isSubmitting ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...</>
                ) : (
                  'Submit Information'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}