"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const PRESETS = [10, 25, 50, 100];

interface SetAllAmountsProps {
  onSetAllAmounts: (amount: number) => void;
}

export function SetAllAmounts({ onSetAllAmounts }: SetAllAmountsProps) {
  const [customAmount, setCustomAmount] = useState("");

  const handleCustomApply = () => {
    const parsed = parseFloat(customAmount);
    if (!isNaN(parsed) && parsed > 0) {
      onSetAllAmounts(parsed);
      setCustomAmount("");
    }
  };

  return (
    <div className="px-4 py-3 border-b border-border/40 bg-muted/30">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          Set all to:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onSetAllAmounts(preset)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium border border-border rounded-xl",
                "hover:bg-muted hover:border-primary/30 transition-colors"
              )}
            >
              ${preset}
            </button>
          ))}

          {/* Custom amount input */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value.replace(/[^0-9.]/g, ""));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCustomApply();
                }
              }}
              placeholder="Custom"
              className={cn(
                "w-20 bg-transparent border border-border rounded-xl px-3 py-1.5",
                "text-sm text-right outline-none",
                "transition-colors focus:border-primary/50"
              )}
            />
            <button
              type="button"
              onClick={handleCustomApply}
              disabled={!customAmount}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-xl transition-colors",
                customAmount
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
