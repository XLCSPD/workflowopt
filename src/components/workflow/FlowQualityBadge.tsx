"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  QUALITY_THRESHOLDS,
  getQualityLevel,
  getQualityColor,
} from "@/types/informationFlow";
import { cn } from "@/lib/utils";

interface FlowQualityBadgeProps {
  score: number | undefined;
  completeness?: number;
  accuracy?: number;
  timeliness?: number;
  showDetails?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function FlowQualityBadge({
  score,
  completeness,
  accuracy,
  timeliness,
  showDetails = false,
  size = "md",
  className,
}: FlowQualityBadgeProps) {
  const qualityLevel = getQualityLevel(score);
  const qualityColor = getQualityColor(score);
  const label = QUALITY_THRESHOLDS[qualityLevel].label;

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-0.5",
    lg: "text-base px-3 py-1",
  };

  const badge = (
    <Badge
      variant="outline"
      className={cn(sizeClasses[size], className)}
      style={{
        borderColor: qualityColor,
        color: qualityColor,
        backgroundColor: `${qualityColor}10`,
      }}
    >
      {score !== undefined ? `${score}/15` : "--"} · {label}
    </Badge>
  );

  if (!showDetails || (completeness === undefined && accuracy === undefined && timeliness === undefined)) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="p-3">
          <div className="space-y-2">
            <p className="font-medium text-sm">Quality Breakdown</p>
            <div className="space-y-1.5">
              <QualityRow label="Completeness" value={completeness} />
              <QualityRow label="Accuracy" value={accuracy} />
              <QualityRow label="Timeliness" value={timeliness} />
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function QualityRow({
  label,
  value,
}: {
  label: string;
  value: number | undefined;
}) {
  const displayValue = value || 3;
  const percentage = (displayValue / 5) * 100;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-24">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${percentage}%`,
            backgroundColor:
              displayValue <= 2
                ? "#EF4444"
                : displayValue <= 3
                ? "#F59E0B"
                : displayValue <= 4
                ? "#10B981"
                : "#3B82F6",
          }}
        />
      </div>
      <span className="text-xs font-medium w-4">{displayValue}</span>
    </div>
  );
}
