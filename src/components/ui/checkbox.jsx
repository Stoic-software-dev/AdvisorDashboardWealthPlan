import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    // The `onCheckedChange` prop is designed to pass the new boolean state,
    // which is simpler than handling the native event object.
    const handleClick = () => {
      if (onCheckedChange) {
        onCheckedChange(!checked);
      }
    };

    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        data-state={checked ? 'checked' : 'unchecked'}
        ref={ref}
        onClick={handleClick}
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
          className
        )}
        {...props}
      >
        {/* This div acts as the indicator, similar to Radix's Checkbox.Indicator */}
        <div
          className={cn(
            "flex items-center justify-center text-current h-full w-full",
            checked ? "opacity-100" : "opacity-0"
          )}
          style={{ transition: 'opacity 150ms' }}
        >
          <Check className="h-4 w-4" />
        </div>
      </button>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };