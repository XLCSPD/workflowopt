"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { cn } from "@/lib/utils";
import type { ProcessStep } from "@/types";
import {
  Play,
  Square,
  Diamond,
  CircleDot,
  AlertTriangle,
} from "lucide-react";

interface StepNodeData {
  step: ProcessStep;
  isSelected: boolean;
  observationCount: number;
  priorityScore: number;
  heatmapIntensity?: "low" | "medium" | "high" | "critical";
  onClick?: () => void;
}

const getStepIcon = (type: string) => {
  switch (type) {
    case "start":
      return Play;
    case "end":
      return Square;
    case "decision":
      return Diamond;
    case "subprocess":
      return CircleDot;
    default:
      return null;
  }
};

const getHeatmapColor = (intensity?: string) => {
  switch (intensity) {
    case "critical":
      return "border-red-500 bg-red-50";
    case "high":
      return "border-orange-500 bg-orange-50";
    case "medium":
      return "border-yellow-500 bg-yellow-50";
    case "low":
      return "border-green-500 bg-green-50";
    default:
      return "border-border bg-white";
  }
};

function StepNodeComponent({ data }: NodeProps<StepNodeData>) {
  const { step, isSelected, observationCount, priorityScore, heatmapIntensity, onClick } = data;
  const Icon = getStepIcon(step.step_type);

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-brand-charcoal border-2 border-white"
      />

      <div
        onClick={onClick}
        className={cn(
          "relative px-4 py-3 rounded-lg shadow-step-node cursor-pointer transition-all duration-200",
          "min-w-[160px] max-w-[200px]",
          getHeatmapColor(heatmapIntensity),
          isSelected && "ring-2 ring-brand-gold shadow-step-node-selected",
          !isSelected && "hover:shadow-step-node-hover border-2"
        )}
      >
        {/* Step Type Icon */}
        {Icon && (
          <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-brand-navy flex items-center justify-center">
            <Icon className="h-3 w-3 text-white" />
          </div>
        )}

        {/* Observation Badge */}
        {observationCount > 0 && (
          <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-medium">
            <AlertTriangle className="h-3 w-3" />
            {observationCount}
          </div>
        )}

        {/* Step Content */}
        <div className="space-y-1">
          <p className="font-medium text-sm text-brand-navy line-clamp-2">
            {step.step_name}
          </p>
          {step.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {step.description}
            </p>
          )}
        </div>

        {/* Priority Score */}
        {priorityScore > 0 && (
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Priority</span>
            <span
              className={cn(
                "font-bold",
                priorityScore >= 15
                  ? "text-red-600"
                  : priorityScore >= 10
                  ? "text-orange-600"
                  : "text-yellow-600"
              )}
            >
              {priorityScore}
            </span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-brand-charcoal border-2 border-white"
      />
    </>
  );
}

export const StepNode = memo(StepNodeComponent);

