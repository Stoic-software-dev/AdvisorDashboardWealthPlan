import React, { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

// Simple custom selector without Command components to avoid dependency issues
export default function MultiCalculatorSelector({
  calculators,
  selectedCalculatorIds,
  onSelectionChange,
  placeholder = "Select calculators...",
  disabled = false,
  className,
}) {
  const [open, setOpen] = useState(false);

  const selectedCalculators = calculators.filter(calc => selectedCalculatorIds.includes(calc.id));

  const handleSelect = (calculatorId) => {
    const newSelection = [...selectedCalculatorIds];
    const index = newSelection.indexOf(calculatorId);
    if (index > -1) {
      newSelection.splice(index, 1);
    } else {
      newSelection.push(calculatorId);
    }
    onSelectionChange(newSelection);
  };

  const handleRemove = (calculatorId) => {
    const newSelection = selectedCalculatorIds.filter(id => id !== calculatorId);
    onSelectionChange(newSelection);
  };

  return (
    <div className={`space-y-2 ${className || ''}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-auto min-h-[38px]"
            disabled={disabled}
          >
            <div className="flex flex-wrap gap-1 flex-grow">
              {selectedCalculators.length > 0 ? (
                selectedCalculators.map(calc => (
                  <Badge
                    key={calc.id}
                    variant="secondary"
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {calc.name || calc.calculator_name}
                    <button
                      className="rounded-full hover:bg-background/50 p-0.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(calc.id);
                      }}
                      aria-label={`Remove ${calc.name || calc.calculator_name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <div className="max-h-60 overflow-auto">
            {(calculators || []).length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No calculators found.
              </div>
            ) : (
              <div className="p-1">
                {(calculators || []).map((calculator) => (
                  <div
                    key={calculator.id}
                    className="flex items-center space-x-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleSelect(calculator.id)}
                  >
                    <Check
                      className={`h-4 w-4 ${
                        selectedCalculatorIds.includes(calculator.id)
                          ? "opacity-100"
                          : "opacity-0"
                      }`}
                    />
                    <span>{calculator.name || calculator.calculator_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}