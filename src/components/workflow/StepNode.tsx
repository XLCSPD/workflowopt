"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
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
  isInlineEditing?: boolean;
  onInlineEdit?: (newName: string) => void;
  onCancelInlineEdit?: () => void;
  onStartInlineEdit?: () => void;
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
  const {
    step,
    isSelected,
    observationCount,
    priorityScore,
    heatmapIntensity,
    onClick,
    isInlineEditing,
    onInlineEdit,
    onCancelInlineEdit,
    onStartInlineEdit,
  } = data;
  const Icon = getStepIcon(step.step_type);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isDecision = step.step_type === "decision";

  // Keep a local draft to avoid jitter while typing.
  const [draftName, setDraftName] = useState(step.step_name);
  const initialName = useMemo(() => step.step_name, [step.step_name]);

  useEffect(() => {
    if (isInlineEditing) {
      setDraftName(step.step_name);
      // Focus/select on next tick so React Flow node mount has settled.
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isInlineEditing, step.step_name]);

  // Decision nodes render as a diamond shape
  if (isDecision) {
    return (
      <>
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 bg-brand-charcoal border-2 border-white"
        />

        <div
          onClick={() => {
            console.log("StepNode clicked:", step.step_name, "onClick exists:", !!onClick);
            onClick?.();
          }}
          className="relative flex items-center justify-center cursor-pointer"
          style={{ width: 120, height: 120 }}
        >
          {/* Diamond shape — rotated square */}
          <div
            className={cn(
              "absolute rotate-45 rounded-sm shadow-step-node transition-all duration-200",
              getHeatmapColor(heatmapIntensity),
              isSelected && "ring-2 ring-brand-gold shadow-step-node-selected",
              !isSelected && "hover:shadow-step-node-hover border-2"
            )}
            style={{ width: 85, height: 85 }}
          />

          {/* Observation Badge */}
          {observationCount > 0 && (
            <div className="absolute -top-1 -right-1 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-medium">
              <AlertTriangle className="h-3 w-3" />
              {observationCount}
            </div>
          )}

          {/* Content — centered, not rotated */}
          <div className="relative z-10 text-center px-2 max-w-[100px]">
            {isInlineEditing ? (
              <input
                ref={inputRef}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setDraftName(initialName);
                    onCancelInlineEdit?.();
                  }
                }}
                onBlur={() => {
                  onInlineEdit?.(draftName);
                }}
                className="step-node-inline-edit text-center text-xs"
                style={{ width: 80 }}
                aria-label="Edit step name"
              />
            ) : (
              <p
                className="font-medium text-xs text-brand-navy line-clamp-3"
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onStartInlineEdit?.();
                }}
                title={step.step_name}
              >
                {step.step_name}
              </p>
            )}
          </div>

          {/* Priority Score */}
          {priorityScore > 0 && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-20 px-1.5 py-0.5 rounded bg-white/90 text-xs">
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

  // Standard rectangular node for all other step types
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-brand-charcoal border-2 border-white"
      />

      <div
        onClick={() => {
          console.log("StepNode clicked:", step.step_name, "onClick exists:", !!onClick);
          onClick?.();
        }}
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
          {isInlineEditing ? (
            <input
              ref={inputRef}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setDraftName(initialName);
                  onCancelInlineEdit?.();
                }
              }}
              onBlur={() => {
                onInlineEdit?.(draftName);
              }}
              className="step-node-inline-edit"
              aria-label="Edit step name"
            />
          ) : (
            <p
              className="font-medium text-sm text-brand-navy line-clamp-2"
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onStartInlineEdit?.();
              }}
              title={step.step_name}
            >
              {step.step_name}
            </p>
          )}
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

