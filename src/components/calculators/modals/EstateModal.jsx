
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Percent } from "lucide-react";

const PROBATE_RATES = {
  "Ontario": 1.5,
  "British Columbia": 1.4,
  "Alberta": 0.25,
  "Saskatchewan": 0.7,
  "Manitoba": 0.7,
  "Quebec": 0.5,
  "New Brunswick": 0.5,
  "Nova Scotia": 1.0,
  "Prince Edward Island": 0.5,
  "Newfoundland and Labrador": 0.6,
  "Northwest Territories": 0.25,
  "Nunavut": 0.25,
  "Yukon": 0.25
};

const formatPercentage = (value) => {
  if (!value) return '';
  return `${value}%`;
};

export default function EstateModal({ isOpen, onClose, onSave, currentData }) {
  const [formData, setFormData] = useState({
    tax_on_registered_rate: 25.0,
    probate_province: "Ontario",
    probate_rate: 1.5
  });

  const [displayValues, setDisplayValues] = useState({});

  useEffect(() => {
    if (currentData) {
      setFormData({
        tax_on_registered_rate: currentData.tax_on_registered_rate || 25.0,
        probate_province: currentData.probate_province || "Ontario",
        probate_rate: currentData.probate_rate || 1.5
      });
    }
  }, [currentData, isOpen]);

  useEffect(() => {
    setDisplayValues({
      tax_on_registered_rate: formatPercentage(formData.tax_on_registered_rate),
      probate_rate: formatPercentage(formData.probate_rate)
    });
  }, [formData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDisplayChange = (field, value) => {
    setDisplayValues(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field) => {
    const rawValue = displayValues[field]?.replace(/[^0-9.-]+/g, '') || '';
    const numericValue = parseFloat(rawValue) || 0;
    handleInputChange(field, numericValue);
  };

  const handleFocus = (field) => {
    const rawValue = String(formData[field] || '').replace(/[^0-9.-]+/g, '');
    setDisplayValues(prev => ({ ...prev, [field]: rawValue }));
  };

  const handleProvinceChange = (province) => {
    const rate = PROBATE_RATES[province] || 1.5;
    setFormData(prev => ({
      ...prev,
      probate_province: province,
      probate_rate: rate
    }));
  };

  const handleSave = () => {
    const dataToSave = {
      tax_on_registered_rate: parseFloat(formData.tax_on_registered_rate) || 25.0,
      probate_province: formData.probate_province,
      probate_rate: parseFloat(formData.probate_rate) || 1.5
    };
    onSave(dataToSave);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-600" />
            Estate Planning Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-red-600" />
                <h4 className="font-semibold text-red-800">Tax on Registered Assets</h4>
              </div>
              <div>
                <Label>Tax Rate on Registered Assets at Death (%)</Label>
                <Input
                  value={displayValues.tax_on_registered_rate}
                  onFocus={() => handleFocus('tax_on_registered_rate')}
                  onBlur={() => handleBlur('tax_on_registered_rate')}
                  onChange={(e) => handleDisplayChange('tax_on_registered_rate', e.target.value)}
                  placeholder="25.0"
                />
                <p className="text-xs text-red-600 mt-1">
                  Marginal tax rate applied to RRSP/RRIF withdrawals at death
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <h4 className="font-semibold text-blue-800">Probate Fees</h4>
              </div>
              
              <div>
                <Label>Province/Territory</Label>
                <Select value={formData.probate_province} onValueChange={handleProvinceChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(PROBATE_RATES).map(province => (
                      <SelectItem key={province} value={province}>{province}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Probate Tax/Fee Rate (%)</Label>
                <Input
                  value={displayValues.probate_rate}
                  onFocus={() => handleFocus('probate_rate')}
                  onBlur={() => handleBlur('probate_rate')}
                  onChange={(e) => handleDisplayChange('probate_rate', e.target.value)}
                />
                 <p className="text-xs text-blue-600 mt-1">
                  This rate is an estimate applied to the estate value.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
