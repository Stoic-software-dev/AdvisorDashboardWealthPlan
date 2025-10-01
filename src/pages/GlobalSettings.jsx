import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Settings, Download, Save, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { GovernmentBenefitRates, AppSettings } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";

export default function GlobalSettings() {
  const [benefitRates, setBenefitRates] = useState(null);
  const [appSettings, setAppSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [showSaveMessage, setShowSaveMessage] = useState(false);

  // Form data for editing
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    max_cpp_annual: 0,
    max_oas_annual: 0,
    notes: "",
    preferred_inflation_rate: 2.0
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const [rates, settings] = await Promise.all([
        GovernmentBenefitRates.list('-year', 1), // Get most recent year
        AppSettings.list()
      ]);

      const currentRates = rates && rates.length > 0 ? rates[0] : null;
      const currentSettings = settings && settings.length > 0 ? settings[0] : null;

      setBenefitRates(currentRates);
      setAppSettings(currentSettings);

      setFormData({
        year: currentRates?.year || new Date().getFullYear(),
        max_cpp_annual: currentRates?.max_cpp_annual || 0,
        max_oas_annual: currentRates?.max_oas_annual || 0,
        notes: currentRates?.notes || "",
        preferred_inflation_rate: currentSettings?.preferred_inflation_rate || 2.0
      });
    } catch (error) {
      console.error("Error loading settings:", error);
    }
    setIsLoading(false);
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
        setFormData(prev => ({
          ...prev,
          year: response.year || currentYear,
          max_cpp_annual: response.max_cpp_annual,
          max_oas_annual: response.max_oas_annual,
          notes: response.source_notes || `Fetched on ${new Date().toLocaleDateString()}`
        }));
      } else {
        alert("Could not fetch complete benefit rate information. Please enter values manually.");
      }
    } catch (error) {
      console.error("Failed to fetch benefit rates:", error);
      alert("Failed to fetch current benefit rates. Please enter values manually.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save or update government benefit rates
      if (benefitRates?.id) {
        await GovernmentBenefitRates.update(benefitRates.id, {
          year: formData.year,
          max_cpp_annual: formData.max_cpp_annual,
          max_oas_annual: formData.max_oas_annual,
          notes: formData.notes
        });
      } else {
        await GovernmentBenefitRates.create({
          year: formData.year,
          max_cpp_annual: formData.max_cpp_annual,
          max_oas_annual: formData.max_oas_annual,
          notes: formData.notes
        });
      }

      // Save or update app settings
      if (appSettings?.id) {
        await AppSettings.update(appSettings.id, {
          ...appSettings,
          preferred_inflation_rate: formData.preferred_inflation_rate
        });
      } else {
        await AppSettings.create({
          crm_name: "FinanceFlow",
          color_theme: "green",
          preferred_inflation_rate: formData.preferred_inflation_rate
        });
      }

      setSaveMessage("Settings saved successfully!");
      setShowSaveMessage(true);
      setTimeout(() => {
        setShowSaveMessage(false);
        setSaveMessage("");
      }, 4000);

      // Reload to refresh state
      await loadSettings();
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return "$0";
    return new Intl.NumberFormat('en-CA', { 
      style: 'currency', 
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-slate-50 to-green-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            <span className="ml-2 text-slate-600">Loading settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-green-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Success Message */}
        {showSaveMessage && (
          <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {saveMessage}
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Settings className="w-8 h-8 text-green-600" />
            Global Settings
          </h1>
          <p className="text-slate-600">
            Manage application-wide settings and government benefit rates used in calculations.
          </p>
        </div>

        <div className="space-y-6">
          {/* Government Benefit Rates */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Government Benefit Rates
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
                  Fetch Current Maximums
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
                    value={formData.year}
                    onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                  />
                </div>
                <div>
                  <Label htmlFor="max_cpp">Maximum CPP Annual</Label>
                  <Input
                    id="max_cpp"
                    type="number"
                    value={formData.max_cpp_annual}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_cpp_annual: parseFloat(e.target.value) || 0 }))}
                    placeholder="e.g., 17478"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Current: {formatCurrency(formData.max_cpp_annual)}
                  </p>
                </div>
                <div>
                  <Label htmlFor="max_oas">Maximum OAS Annual</Label>
                  <Input
                    id="max_oas"
                    type="number"
                    value={formData.max_oas_annual}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_oas_annual: parseFloat(e.target.value) || 0 }))}
                    placeholder="e.g., 8814"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Current: {formatCurrency(formData.max_oas_annual)}
                  </p>
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Source information or additional notes..."
                  className="h-20"
                />
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* General Application Settings */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>General Application Settings</CardTitle>
              <p className="text-sm text-slate-600">
                Default values used across various calculators and projections.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="inflation_rate">Preferred Inflation Rate (%)</Label>
                  <Input
                    id="inflation_rate"
                    type="number"
                    step="0.1"
                    value={formData.preferred_inflation_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, preferred_inflation_rate: parseFloat(e.target.value) || 2.0 }))}
                    placeholder="2.0"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Used as default inflation rate in calculators and projections
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save All Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}