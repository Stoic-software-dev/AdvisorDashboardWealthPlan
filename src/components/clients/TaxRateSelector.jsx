
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download, Loader2 } from "lucide-react";
import { InvokeLLM } from "@/api/integrations";

const canadianProvinces = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" }
];

const ONTARIO_TAX_BRACKETS_2024 = [
  { label: "20.05% (Income up to $51,446)", value: 20.05 },
  { label: "24.15% (Income up to $55,867)", value: 24.15 },
  { label: "29.65% (Income up to $102,894)", value: 29.65 },
  { label: "31.48% (Income up to $111,733)", value: 31.48 },
  { label: "33.89% (Income up to $150,000)", value: 33.89 },
  { label: "37.91% (Income up to $173,205)", value: 37.91 },
  { label: "43.41% (Income up to $220,000)", value: 43.41 },
  { label: "44.97% (Income up to $246,752)", value: 44.97 },
  { label: "48.29% (Income over $246,752)", value: 48.29 },
];

export default function TaxRateSelector({ value, onChange, province, className = "" }) {
  const [taxBrackets, setTaxBrackets] = useState(ONTARIO_TAX_BRACKETS_2024);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    // If there's a value but it's not in our list of brackets (e.g., custom or from old data),
    // add it to the list so it can be displayed in the dropdown.
    if (value && !taxBrackets.some(b => b.value === value)) {
      setTaxBrackets(prev => [...prev, { label: `${value}% (Custom)`, value: value }]);
    }
  }, [value, taxBrackets]);

  const handleFetchRates = async () => {
    if (!province) {
      alert('Please select a province first.');
      return;
    }
    setIsFetching(true);
    try {
      const provinceName = canadianProvinces.find(p => p.code === province)?.name || province;
      const response = await InvokeLLM({
        prompt: `Provide the combined federal and ${provinceName} marginal tax brackets for the current year. The response should be an array of objects, where each object has a 'rate' and a 'label'.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            tax_brackets: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  rate: { type: "number", description: "Tax rate as a percentage, e.g. 20.05" },
                  label: { type: "string", description: "Descriptive label for the bracket, e.g. '20.05% (Income up to $51,446)'" }
                },
                required: ["rate", "label"]
              }
            }
          }
        }
      });
      if (response.tax_brackets && response.tax_brackets.length > 0) {
        const formattedBrackets = response.tax_brackets.map(b => ({ label: b.label, value: b.rate }));
        setTaxBrackets(formattedBrackets);
        // If current value is not in new brackets, don't change it automatically
        // But if there is no value, set it to the first fetched bracket
        if (!value && formattedBrackets.length > 0) {
          onChange(formattedBrackets[0].value)
        }
      }
    } catch (error) {
      console.error("Failed to fetch tax rates:", error);
      alert("Could not fetch the latest tax rates. Using default values.");
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center mb-1">
        <Label htmlFor="marginal_tax_rate" className="flex items-center text-sm font-medium">
          Marginal Tax Rate {province ? `(${province})` : ''}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleFetchRates}
            disabled={isFetching}
            className="h-6 w-6 ml-1 text-slate-500 hover:text-slate-800"
            title="Fetch latest rates for selected province"
          >
            {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </Button>
        </Label>
      </div>
      <Select
        value={value ? String(value) : ""}
        onValueChange={(v) => onChange(parseFloat(v))}
      >
        <SelectTrigger id="marginal_tax_rate">
          <SelectValue placeholder="Select tax bracket..." />
        </SelectTrigger>
        <SelectContent>
          {taxBrackets.map((bracket, index) => (
            <SelectItem key={`${bracket.value}-${index}`} value={String(bracket.value)}>
              {bracket.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
