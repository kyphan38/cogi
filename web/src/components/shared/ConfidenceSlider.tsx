"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export interface ConfidenceSliderProps {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  label?: string;
}

export function ConfidenceSlider({
  value,
  onChange,
  disabled,
  label = "How confident are you in your highlights?",
}: ConfidenceSliderProps) {
  return (
    <div className="grid max-w-md gap-3">
      <Label htmlFor="confidence">
        {label} ({value}%)
      </Label>
      <Slider
        id="confidence"
        min={0}
        max={100}
        step={1}
        value={[value]}
        onValueChange={(v) => {
          const n = Array.isArray(v) ? v[0] : v;
          onChange(typeof n === "number" ? n : 0);
        }}
        disabled={disabled}
      />
    </div>
  );
}
