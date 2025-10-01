import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { X, TrendingUp, AlertTriangle } from "lucide-react";

export default function ReturnPeriodModal({ isOpen, onClose, onSave, period, maxYear }) {
  const [currentPeriod, setCurrentPeriod] = useState({
    start_year: 0,
    end_year: 0,
    return_type: 'fixed',
    return_rate: 7,
    standard_deviation: 15,
    use_randomized_returns: false,
    id: Date.now()
  });

  useEffect(() => {
    if (period) {
      setCurrentPeriod({
        return_rate: 7,
        standard_deviation: 15,
        use_randomized_returns: false,
        ...period,
      });
    } else {
      setCurrentPeriod({
        start_year: 0,
        end_year: 0,
        return_type: 'fixed',
        return_rate: 7,
        standard_deviation: 15,
        use_randomized_returns: false,
        id: Date.now()
      });
    }
  }, [period, isOpen]);

  const handleChange = (field, value) => {
    if (field === 'use_randomized_returns') {
      setCurrentPeriod(prev => ({ ...prev, [field]: value }));
      return;
    }
    
    let parsedValue = value;
    if (['start_year', 'end_year', 'return_rate', 'standard_deviation'].includes(field)) {
        parsedValue = value === '' ? '' : parseFloat(value);
    }
    setCurrentPeriod(prev => ({ ...prev, [field]: parsedValue }));
  };

  const handleSave = () => {
    const periodToSave = {
        ...currentPeriod,
        start_year: currentPeriod.start_year === '' ? 0 : Number(currentPeriod.start_year),
        end_year: currentPeriod.end_year === '' ? 0 : Number(currentPeriod.end_year),
        return_rate: currentPeriod.return_rate === '' ? 7 : Number(currentPeriod.return_rate),
        standard_deviation: currentPeriod.standard_deviation === '' ? 15 : Number(currentPeriod.standard_deviation),
        use_randomized_returns: currentPeriod.return_type === 'monte_carlo' ? currentPeriod.use_randomized_returns : false,
    };
    onSave(periodToSave);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Configure Return Period
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-3 right-3">
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-year">Start Year</Label>
              <Input id="start-year" type="number" value={currentPeriod.start_year} onChange={(e) => handleChange('start_year', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="end-year">End Year (0 = Until End)</Label>
              <Input id="end-year" type="number" value={currentPeriod.end_year} onChange={(e) => handleChange('end_year', e.target.value)} />
            </div>
          </div>
          
          <div>
            <Label className="mb-2 block">Return Type</Label>
            <RadioGroup
              value={currentPeriod.return_type}
              onValueChange={(value) => handleChange('return_type', value)}
              className="grid grid-cols-2 gap-2"
            >
              <Label htmlFor="fixed-return" className="flex-1 cursor-pointer rounded-md border p-4 hover:bg-slate-50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-muted">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="fixed" id="fixed-return" />
                  <span>Fixed Return</span>
                </div>
              </Label>
              <Label htmlFor="monte-carlo" className="flex-1 cursor-pointer rounded-md border p-4 hover:bg-slate-50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-muted">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="monte_carlo" id="monte-carlo" />
                  <span>Monte Carlo Simulation</span>
                </div>
              </Label>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="return-rate">Expected average return (%)</Label>
            <Input
              id="return-rate"
              type="number"
              step="0.01"
              value={currentPeriod.return_rate}
              onChange={(e) => handleChange('return_rate', e.target.value)}
            />
            <p className="text-sm text-gray-500 mt-1">Typically 6-8% for balanced portfolios.</p>
          </div>

          {currentPeriod.return_type === 'monte_carlo' && (
            <>
              <div>
                <Label htmlFor="std-dev">Standard Deviation (%)</Label>
                <Input
                  id="std-dev"
                  type="number"
                  step="0.01"
                  value={currentPeriod.standard_deviation}
                  onChange={(e) => handleChange('standard_deviation', e.target.value)}
                />
                <p className="text-sm text-gray-500 mt-1">Volatility measure - typically 15-20% for equity portfolios</p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-randomized"
                  checked={currentPeriod.use_randomized_returns}
                  onCheckedChange={(checked) => handleChange('use_randomized_returns', checked)}
                />
                <Label htmlFor="use-randomized">Use randomized returns for Monte Carlo simulation</Label>
              </div>

              {currentPeriod.use_randomized_returns && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">Monte Carlo Simulation</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    When randomized returns are enabled, the calculator will generate random returns each year using normal distribution based on your mean return and standard deviation. This helps model the uncertainty and sequence of returns risk.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>
        <Separator />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}