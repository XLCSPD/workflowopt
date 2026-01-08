"use client";

import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type {
  FlowStyleOverride,
  LineStyle,
  LineThickness,
  FlowType,
} from "@/types";
import { FLOW_TYPE_CONFIG } from "@/types/informationFlow";
import { cn } from "@/lib/utils";

// Predefined color palette
const COLOR_PALETTE = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#EF4444", // Red
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F97316", // Orange
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#A855F7", // Violet
];

const LINE_STYLES: { value: LineStyle; label: string; preview: string }[] = [
  { value: "solid", label: "Solid", preview: "─────" },
  { value: "dashed", label: "Dashed", preview: "── ── ──" },
  { value: "dotted", label: "Dotted", preview: "· · · · ·" },
];

const LINE_THICKNESSES: { value: LineThickness; label: string; width: number }[] = [
  { value: "thin", label: "Thin", width: 1 },
  { value: "normal", label: "Normal", width: 2 },
  { value: "thick", label: "Thick", width: 3 },
];

interface FlowStylePickerProps {
  flowType: FlowType;
  value: FlowStyleOverride;
  onChange: (style: FlowStyleOverride) => void;
  disabled?: boolean;
}

export function FlowStylePicker({
  flowType,
  value,
  onChange,
  disabled = false,
}: FlowStylePickerProps) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const typeConfig = FLOW_TYPE_CONFIG[flowType];

  const currentColor = value.color || typeConfig.color;
  const currentLineStyle = value.lineStyle || "solid";
  const currentThickness = value.thickness || "normal";

  const handleColorChange = (color: string) => {
    onChange({ ...value, color });
    setColorPickerOpen(false);
  };

  const handleLineStyleChange = (lineStyle: LineStyle) => {
    onChange({ ...value, lineStyle });
  };

  const handleThicknessChange = (thickness: LineThickness) => {
    onChange({ ...value, thickness });
  };

  const handleReset = () => {
    onChange({});
  };

  const hasCustomStyle =
    value.color !== undefined ||
    value.lineStyle !== undefined ||
    value.thickness !== undefined;

  return (
    <div className="space-y-4">
      {/* Color Picker */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Color</Label>
          {value.color && (
            <button
              type="button"
              onClick={() => onChange({ ...value, color: undefined })}
              className="text-xs text-muted-foreground hover:text-foreground"
              disabled={disabled}
            >
              Reset to default
            </button>
          )}
        </div>
        <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
          <PopoverTrigger asChild disabled={disabled}>
            <button
              type="button"
              className={cn(
                "w-full h-10 rounded-md border flex items-center gap-2 px-3",
                "hover:bg-muted/50 transition-colors",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div
                className="w-6 h-6 rounded-md border"
                style={{ backgroundColor: currentColor }}
              />
              <span className="text-sm font-mono">{currentColor}</span>
              {!value.color && (
                <span className="text-xs text-muted-foreground ml-auto">
                  (default)
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-3">
              <Label className="text-sm">Select Color</Label>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorChange(color)}
                    className={cn(
                      "w-8 h-8 rounded-md border-2 transition-all",
                      "hover:scale-110 hover:shadow-md",
                      currentColor === color
                        ? "border-foreground ring-2 ring-offset-2 ring-brand-gold"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {currentColor === color && (
                      <Check className="h-4 w-4 text-white mx-auto drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
              {/* Default type color */}
              <div className="pt-2 border-t">
                <button
                  type="button"
                  onClick={() => handleColorChange(typeConfig.color)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <div
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: typeConfig.color }}
                  />
                  Use {typeConfig.label} default
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Line Style */}
      <div className="space-y-2">
        <Label className="text-sm">Line Style</Label>
        <div className="flex gap-2">
          {LINE_STYLES.map((style) => (
            <button
              key={style.value}
              type="button"
              onClick={() => handleLineStyleChange(style.value)}
              disabled={disabled}
              className={cn(
                "flex-1 h-10 rounded-md border text-sm font-medium",
                "hover:bg-muted/50 transition-colors",
                currentLineStyle === style.value
                  ? "border-brand-gold bg-brand-gold/10 text-brand-navy"
                  : "border-border text-muted-foreground",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Line Thickness */}
      <div className="space-y-2">
        <Label className="text-sm">Thickness</Label>
        <div className="flex gap-2">
          {LINE_THICKNESSES.map((thickness) => (
            <button
              key={thickness.value}
              type="button"
              onClick={() => handleThicknessChange(thickness.value)}
              disabled={disabled}
              className={cn(
                "flex-1 h-10 rounded-md border flex items-center justify-center gap-2",
                "hover:bg-muted/50 transition-colors",
                currentThickness === thickness.value
                  ? "border-brand-gold bg-brand-gold/10"
                  : "border-border",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div
                className="w-8 rounded-full"
                style={{
                  height: thickness.width * 2,
                  backgroundColor: currentColor,
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label className="text-sm">Preview</Label>
        <div className="h-12 rounded-md border bg-muted/30 flex items-center justify-center px-4">
          <svg width="100%" height="20" className="overflow-visible">
            <defs>
              <marker
                id="preview-arrow"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="5"
                orient="auto"
              >
                <path d="M0,0 L0,10 L10,5 z" fill={currentColor} />
              </marker>
            </defs>
            <line
              x1="10"
              y1="10"
              x2="calc(100% - 20px)"
              y2="10"
              stroke={currentColor}
              strokeWidth={LINE_THICKNESSES.find((t) => t.value === currentThickness)?.width || 2}
              strokeDasharray={
                currentLineStyle === "dashed"
                  ? "8,4"
                  : currentLineStyle === "dotted"
                  ? "2,2"
                  : undefined
              }
              markerEnd="url(#preview-arrow)"
            />
          </svg>
        </div>
      </div>

      {/* Reset Button */}
      {hasCustomStyle && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={disabled}
          className="w-full"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Type Defaults
        </Button>
      )}
    </div>
  );
}
