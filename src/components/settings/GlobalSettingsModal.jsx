
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GovernmentBenefitRates, AppSettings } from "@/api/entities";
import { InvokeLLM, UploadFile } from "@/api/integrations";
import { Palette, Save, Building2, Sparkles, Loader2, Download, Settings, PlusCircle, Trash2 } from "lucide-react";

const colorThemes = {
  blue: { name: "Ocean Blue", gradient: "from-blue-600 to-blue-800" },
  green: { name: "Forest Green", gradient: "from-green-600 to-green-800" },
  purple: { name: "Royal Purple", gradient: "from-purple-600 to-purple-800" },
  orange: { name: "Sunset Orange", gradient: "from-orange-600 to-orange-800" },
  red: { name: "Cherry Red", gradient: "from-red-600 to-red-800" },
  indigo: { name: "Deep Indigo", gradient: "from-indigo-600 to-indigo-800" },
  teal: { name: "Ocean Teal", gradient: "from-teal-600 to-teal-800" },
  slate: { name: "Modern Slate", gradient: "from-slate-600 to-slate-800" },
  custom: { name: "Custom Colors", gradient: "from-gray-400 to-gray-600" }
};

export default function GlobalSettingsModal({ isOpen, onClose, onSettingsUpdate, user }) {
  const [activeTab, setActiveTab] = useState("branding");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // App Settings State
  const [appSettings, setAppSettings] = useState({
    crm_name: "FinanceFlow",
    color_theme: "green",
    logo_url: "",
    custom_colors: null,
  });

  // Government Benefit Rates State
  const [benefitRates, setBenefitRates] = useState({
    year: new Date().getFullYear(),
    max_cpp_annual: 0,
    max_oas_annual: 0,
    rrif_minimums: [],
    lif_rates: [],
    notes: ""
  });

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isExtractingColors, setIsExtractingColors] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isFetchingRIFLIF, setIsFetchingRIFLIF] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    if (user?.role !== 'admin') return;
    
    setIsLoading(true);
    setError("");
    
    try {
      const [appSettingsData, ratesData] = await Promise.allSettled([
        AppSettings.list(),
        GovernmentBenefitRates.list('-year', 1)
      ]);

      if (appSettingsData.status === 'fulfilled' && appSettingsData.value && appSettingsData.value.length > 0) {
        setAppSettings(prev => ({ ...prev, ...appSettingsData.value[0] }));
      }

      if (ratesData.status === 'fulfilled' && ratesData.value && ratesData.value.length > 0) {
        const rates = ratesData.value[0];
        setBenefitRates({
          year: rates.year || new Date().getFullYear(),
          max_cpp_annual: rates.max_cpp_annual || 0,
          max_oas_annual: rates.max_oas_annual || 0,
          rrif_minimums: rates.rrif_minimums || [],
          lif_rates: rates.lif_rates || [],
          notes: rates.notes || ""
        });
      }
    } catch (error) {
      console.error("Error loading global settings:", error);
      setError("Failed to load settings");
    }
    setIsLoading(false);
  };

  const handleSaveAppSettings = async () => {
    if (user?.role !== 'admin') return;
    
    setIsSaving(true);
    setError("");
    
    try {
      const existingSettings = await AppSettings.list();
      
      if (existingSettings && existingSettings.length > 0) {
        await AppSettings.update(existingSettings[0].id, appSettings);
      } else {
        await AppSettings.create(appSettings);
      }
      
      if (onSettingsUpdate) {
        onSettingsUpdate(appSettings);
      }
      
      // Show success message briefly then close
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error("Error saving app settings:", error);
      setError("Failed to save application settings");
    }
    setIsSaving(false);
  };

  const handleSaveBenefitRates = async () => {
    if (user?.role !== 'admin') return;
    
    setIsSaving(true);
    setError("");
    
    try {
      const existingRates = await GovernmentBenefitRates.list('-year', 1);
      
      if (existingRates && existingRates.length > 0) {
        await GovernmentBenefitRates.update(existingRates[0].id, benefitRates);
      } else {
        await GovernmentBenefitRates.create(benefitRates);
      }
      
      // Show success message briefly then close
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error("Error saving benefit rates:", error);
      setError("Failed to save benefit rates");
    }
    setIsSaving(false);
  };

  const fetchCurrentMaximums = async () => {
    setIsFetching(true);
    try {
      const currentYear = new Date().getFullYear();
      const response = await InvokeLLM({
        prompt: `What are the current maximum annual benefits for Canada Pension Plan (CPP) and Old Age Security (OAS) for ${currentYear}? Please provide the exact dollar amounts.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            year: { type: "number", description: "Year these maximums apply to" },
            max_cpp_annual: { type: "number", description: "Maximum annual CPP benefit in dollars" },
            max_oas_annual: { type: "number", description: "Maximum annual OAS benefit in dollars" },
            source_notes: { type: "string", description: "Notes about where this information was found" }
          },
          required: ["year", "max_cpp_annual", "max_oas_annual"]
        }
      });

      if (response.max_cpp_annual && response.max_oas_annual) {
        setBenefitRates(prev => ({
          ...prev,
          year: response.year || currentYear,
          max_cpp_annual: response.max_cpp_annual,
          max_oas_annual: response.max_oas_annual,
          notes: response.source_notes || `Fetched on ${new Date().toLocaleDateString()}`
        }));
      } else {
        setError("Could not fetch complete benefit rate information. Please enter values manually.");
      }
    } catch (error) {
      console.error("Failed to fetch benefit rates:", error);
      setError("Failed to fetch current benefit rates. Please enter values manually.");
    } finally {
      setIsFetching(false);
    }
  };
  
  const fetchRIFLIFRates = async () => {
    setIsFetchingRIFLIF(true);
    try {
      const currentYear = new Date().getFullYear();
      const response = await InvokeLLM({
        prompt: `Provide a comprehensive list of RRIF minimum withdrawal rates and LIF minimum and maximum withdrawal rates for Ontario for the year ${currentYear}. The rates should be provided by age. Format the age and rates as numbers.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            rrif_minimums: {
              type: "array",
              description: "RRIF minimum withdrawal percentages by age.",
              items: {
                type: "object",
                properties: {
                  age: { type: "number" },
                  rate: { type: "number", description: "The withdrawal rate as a percentage, e.g., 5.28 for 5.28%" }
                },
                required: ["age", "rate"]
              }
            },
            lif_rates: {
              type: "array",
              description: "LIF minimum and maximum withdrawal percentages by age.",
              items: {
                type: "object",
                properties: {
                  age: { type: "number" },
                  min_rate: { type: "number", description: "The minimum withdrawal rate as a percentage" },
                  max_rate: { type: "number", description: "The maximum withdrawal rate as a percentage" }
                },
                required: ["age", "min_rate", "max_rate"]
              }
            }
          },
          required: ["rrif_minimums", "lif_rates"]
        }
      });

      if (response.rrif_minimums && response.lif_rates) {
        setBenefitRates(prev => ({
          ...prev,
          rrif_minimums: response.rrif_minimums,
          lif_rates: response.lif_rates,
          notes: (prev.notes ? prev.notes + "\n" : "") + `RRIF/LIF rates fetched on ${new Date().toLocaleDateString()}`
        }));
      } else {
        setError("Could not fetch complete RRIF/LIF rate information.");
      }
    } catch (error) {
      console.error("Failed to fetch RIF/LIF rates:", error);
      setError("Failed to fetch current RRIF/LIF rates. Please review the structure or enter manually.");
    } finally {
      setIsFetchingRIFLIF(false);
    }
  };

  const handleRateTableChange = (table, index, field, value) => {
    setBenefitRates(prev => {
      const newTableData = [...prev[table]];
      newTableData[index] = { ...newTableData[index], [field]: parseFloat(value) || 0 };
      return { ...prev, [table]: newTableData };
    });
  };

  const addRateTableRow = (table) => {
    setBenefitRates(prev => {
      const newRow = table === 'rrif_minimums' ? { age: '', rate: '' } : { age: '', min_rate: '', max_rate: '' };
      return { ...prev, [table]: [...(prev[table] || []), newRow] };
    });
  };

  const removeRateTableRow = (table, index) => {
    setBenefitRates(prev => {
        const newTableData = [...prev[table]];
        newTableData.splice(index, 1);
        return { ...prev, [table]: newTableData };
    });
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploadingLogo(true);
    
    try {
      const result = await UploadFile({ file });
      setAppSettings(prev => ({ ...prev, logo_url: result.file_url }));
    } catch (error) {
      console.error("Error uploading logo:", error);
      setError("Failed to upload logo");
    }
    
    setIsUploadingLogo(false);
  };

  const handleExtractColors = async () => {
    if (!appSettings.logo_url) return;
    
    setIsExtractingColors(true);
    
    try {
      const response = await InvokeLLM({
        prompt: `Analyze this logo image and extract a professional color palette suitable for a financial advisory CRM. Return ONLY a JSON object with these exact keys:
        {
          "primary": "#hexcolor",
          "light": "#hexcolor", 
          "text": "#hexcolor",
          "gradient_from": "#hexcolor",
          "gradient_to": "#hexcolor",
          "border": "#hexcolor"
        }
        
        Choose colors that are professional, accessible, and work well together. The primary color should be the main brand color from the logo.`,
        file_urls: [appSettings.logo_url],
        response_json_schema: {
          type: "object",
          properties: {
            primary: { type: "string" },
            light: { type: "string" },
            text: { type: "string" },
            gradient_from: { type: "string" },
            gradient_to: { type: "string" },
            border: { type: "string" }
          }
        }
      });
      
      setAppSettings(prev => ({ 
        ...prev, 
        custom_colors: response,
        color_theme: "custom"
      }));
      
    } catch (error) {
      console.error("Error extracting colors:", error);
      setError("Failed to extract colors from logo");
    }
    
    setIsExtractingColors(false);
  };

  const formatCurrency = (value) => {
    if (value === undefined || value === null) return "$0"; // Handle null or undefined
    return new Intl.NumberFormat('en-CA', { 
      style: 'currency', 
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Global Settings
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mx-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            <span className="ml-2 text-slate-600">Loading settings...</span>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mx-6 mb-6">
              <TabsTrigger value="branding" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="government-rates" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Gov. Rates
              </TabsTrigger>
            </TabsList>

            <div className="px-6 pb-6 max-h-[60vh] overflow-y-auto">
              {/* Branding Tab */}
              <TabsContent value="branding" className="mt-0">
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Company Branding</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="crm_name">CRM Name</Label>
                      <Input
                        id="crm_name"
                        value={appSettings.crm_name}
                        onChange={(e) => setAppSettings(prev => ({ ...prev, crm_name: e.target.value }))}
                        placeholder="Enter your CRM name"
                        className="mt-1"
                      />
                      <p className="text-sm text-slate-500 mt-1">
                        This will appear in the sidebar and throughout your CRM
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="logo_upload">Company Logo</Label>
                      <div className="mt-2 space-y-3">
                        <div className="flex items-center gap-4">
                          <Input
                            id="logo_upload"
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            disabled={isUploadingLogo}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            onClick={handleExtractColors}
                            disabled={!appSettings.logo_url || isExtractingColors}
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            {isExtractingColors ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                            Extract Colors
                          </Button>
                        </div>
                        
                        {appSettings.logo_url && (
                          <div className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50">
                            <img 
                              src={appSettings.logo_url} 
                              alt="Uploaded logo" 
                              className="w-12 h-12 object-contain rounded"
                            />
                            <div>
                              <p className="text-sm font-medium text-slate-900">Logo uploaded successfully</p>
                              <p className="text-xs text-slate-500">Click "Extract Colors" to create a custom theme</p>
                            </div>
                          </div>
                        )}
                        
                        {isUploadingLogo && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading logo...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Color Theme Selection */}
                    <div>
                      <Label>Choose Theme Color</Label>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        {Object.entries(colorThemes).map(([key, theme]) => {
                          if (key === "custom" && !appSettings.custom_colors) return null;
                          
                          const isCustom = key === "custom";
                          const displayTheme = isCustom && appSettings.custom_colors ? {
                            ...theme,
                            gradient: `from-[${appSettings.custom_colors.gradient_from}] to-[${appSettings.custom_colors.gradient_to}]`
                          } : theme;

                          return (
                            <div
                              key={key}
                              onClick={() => setAppSettings(prev => ({ ...prev, color_theme: key }))}
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                appSettings.color_theme === key 
                                  ? `border-slate-400 bg-slate-100` 
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div 
                                  className={`w-6 h-6 rounded-full bg-gradient-to-r ${displayTheme.gradient}`}
                                  style={isCustom && appSettings.custom_colors ? {
                                    background: `linear-gradient(to right, ${appSettings.custom_colors.gradient_from}, ${appSettings.custom_colors.gradient_to})`
                                  } : {}}
                                ></div>
                                <div>
                                  <p className="font-medium text-slate-900">{displayTheme.name}</p>
                                  <p className="text-xs text-slate-500">
                                    {isCustom ? "Extracted from logo" : `${key} theme`}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="mt-6">
                      <Label>Preview</Label>
                      <div className="mt-2 p-4 border rounded-lg bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div 
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-r ${
                              (appSettings.color_theme === "custom" && appSettings.custom_colors) 
                              ? ''
                              : (colorThemes[appSettings.color_theme] || colorThemes.green).gradient
                            }`}
                            style={
                              appSettings.color_theme === "custom" && appSettings.custom_colors ? {
                                background: `linear-gradient(to right, ${appSettings.custom_colors.gradient_from}, ${appSettings.custom_colors.gradient_to})`
                              } : {}
                            }
                          >
                            {appSettings.logo_url ? (
                              <img 
                                src={appSettings.logo_url} 
                                alt="Logo preview" 
                                className="w-8 h-8 object-contain rounded"
                              />
                            ) : (
                              <Building2 className="w-6 h-6 text-white" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-lg">{appSettings.crm_name}</h3>
                            <p className="text-xs text-slate-500 font-medium">Financial Advisory CRM</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end mt-6">
                  <Button onClick={handleSaveAppSettings} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </TabsContent>

              {/* Government Rates Tab */}
              <TabsContent value="government-rates" className="mt-0 space-y-6">
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      CPP & OAS Maximums
                      <Button
                        onClick={fetchCurrentMaximums}
                        disabled={isFetching}
                        variant="outline"
                        size="sm"
                      >
                        {isFetching ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        Fetch CPP/OAS Max
                      </Button>
                    </CardTitle>
                    <p className="text-sm text-slate-600">
                      These rates are used by the Fixed Income Calculator for CPP and OAS calculations.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="year">Tax Year</Label>
                        <Input
                          id="year"
                          type="number"
                          value={benefitRates.year}
                          onChange={(e) => setBenefitRates(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="max_cpp">Maximum CPP Annual</Label>
                        <Input
                          id="max_cpp"
                          type="number"
                          value={benefitRates.max_cpp_annual}
                          onChange={(e) => setBenefitRates(prev => ({ ...prev, max_cpp_annual: parseFloat(e.target.value) || 0 }))}
                          placeholder="e.g., 17478"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Current: {formatCurrency(benefitRates.max_cpp_annual)}
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="max_oas">Maximum OAS Annual</Label>
                        <Input
                          id="max_oas"
                          type="number"
                          value={benefitRates.max_oas_annual}
                          onChange={(e) => setBenefitRates(prev => ({ ...prev, max_oas_annual: parseFloat(e.target.value) || 0 }))}
                          placeholder="e.g., 8814"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Current: {formatCurrency(benefitRates.max_oas_annual)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* RRIF/LIF Section */}
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                     <CardTitle className="flex items-center justify-between">
                      RRIF & LIF Rates
                      <Button
                        onClick={fetchRIFLIFRates}
                        disabled={isFetchingRIFLIF}
                        variant="outline"
                        size="sm"
                      >
                        {isFetchingRIFLIF ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        Fetch RRIF/LIF Rates
                      </Button>
                    </CardTitle>
                    <p className="text-sm text-slate-600">
                      Manage RRIF minimum and LIF minimum/maximum withdrawal percentages.
                    </p>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* RRIF Table */}
                    <div className="space-y-2">
                        <h4 className="font-semibold text-slate-700">RRIF Minimum Payouts (%)</h4>
                        <div className="p-2 border rounded-lg bg-slate-50 max-h-64 overflow-y-auto space-y-2">
                           <div className="grid grid-cols-[1fr,1fr,auto] gap-2 items-center sticky top-0 bg-slate-50 py-1">
                              <Label className="text-xs font-bold">Age</Label>
                              <Label className="text-xs font-bold">Rate %</Label>
                              <div className="w-8"></div>
                           </div>
                           {(benefitRates.rrif_minimums || []).map((item, index) => (
                               <div key={index} className="grid grid-cols-[1fr,1fr,auto] gap-2 items-center">
                                   <Input type="number" value={item.age} onChange={e => handleRateTableChange('rrif_minimums', index, 'age', e.target.value)} className="h-8"/>
                                   <Input type="number" step="0.01" value={item.rate} onChange={e => handleRateTableChange('rrif_minimums', index, 'rate', e.target.value)} className="h-8"/>
                                   <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => removeRateTableRow('rrif_minimums', index)}>
                                       <Trash2 className="w-4 h-4"/>
                                   </Button>
                               </div>
                           ))}
                        </div>
                         <Button variant="outline" size="sm" onClick={() => addRateTableRow('rrif_minimums')} className="mt-2">
                           <PlusCircle className="w-4 h-4 mr-2"/> Add RRIF Row
                        </Button>
                    </div>
                    {/* LIF Table */}
                     <div className="space-y-2">
                        <h4 className="font-semibold text-slate-700">LIF Payouts (%)</h4>
                        <div className="p-2 border rounded-lg bg-slate-50 max-h-64 overflow-y-auto space-y-2">
                           <div className="grid grid-cols-[1fr,1fr,1fr,auto] gap-2 items-center sticky top-0 bg-slate-50 py-1">
                              <Label className="text-xs font-bold">Age</Label>
                              <Label className="text-xs font-bold">Min %</Label>
                              <Label className="text-xs font-bold">Max %</Label>
                              <div className="w-8"></div>
                           </div>
                           {(benefitRates.lif_rates || []).map((item, index) => (
                               <div key={index} className="grid grid-cols-[1fr,1fr,1fr,auto] gap-2 items-center">
                                   <Input type="number" value={item.age} onChange={e => handleRateTableChange('lif_rates', index, 'age', e.target.value)} className="h-8"/>
                                   <Input type="number" step="0.01" value={item.min_rate} onChange={e => handleRateTableChange('lif_rates', index, 'min_rate', e.target.value)} className="h-8"/>
                                   <Input type="number" step="0.01" value={item.max_rate} onChange={e => handleRateTableChange('lif_rates', index, 'max_rate', e.target.value)} className="h-8"/>
                                   <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => removeRateTableRow('lif_rates', index)}>
                                       <Trash2 className="w-4 h-4"/>
                                   </Button>
                               </div>
                           ))}
                        </div>
                         <Button variant="outline" size="sm" onClick={() => addRateTableRow('lif_rates')} className="mt-2">
                           <PlusCircle className="w-4 h-4 mr-2"/> Add LIF Row
                        </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
                  <CardContent>
                    <div>
                      <Label htmlFor="notes">Source information or additional notes</Label>
                      <Textarea
                        id="notes"
                        value={benefitRates.notes}
                        onChange={(e) => setBenefitRates(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="e.g., Rates fetched from Canada.ca on YYYY-MM-DD..."
                        className="h-20 mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end mt-6">
                  <Button onClick={handleSaveBenefitRates} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Rates"}
                  </Button>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
