"use client";

import { memo, useMemo } from "react";
import {
  EdgeProps,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from "reactflow";
import { AlertTriangle } from "lucide-react";
import type { InformationFlowWithRelations } from "@/types";
import {
  getFlowEdgeStyle,
  getQualityLevel,
} from "@/types/informationFlow";
import { cn } from "@/lib/utils";

export interface FlowEdgeData {
  flow: InformationFlowWithRelations;
  showLabel?: boolean;
  highlightWaste?: boolean;
  isSelected?: boolean;
  onClick?: (flowId: string) => void;
}

/**
 * Custom React Flow edge component for rendering information flows
 * with dynamic styling based on flow type and user overrides.
 */
function FlowEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<FlowEdgeData>) {
  const { flow, showLabel = true, highlightWaste = true, onClick } = data || {};

  // Get the computed edge style
  const edgeStyle = useMemo(() => {
    if (!flow) return { stroke: "#545454", strokeWidth: 2 };
    return getFlowEdgeStyle(flow);
  }, [flow]);

  // Get the path
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Determine quality level for opacity
  const qualityLevel = flow ? getQualityLevel(flow.quality_score) : "good";
  const opacity = qualityLevel === "poor" ? 0.5 : 1;

  // Check if flow has waste tags
  const hasWasteTags =
    highlightWaste && flow?.waste_types && flow.waste_types.length > 0;

  // Get the marker color from edge style
  const markerColor = edgeStyle.stroke;

  const handleClick = () => {
    if (flow && onClick) {
      onClick(flow.id);
    }
  };

  if (!flow) {
    // Fallback for edges without flow data (regular process connections)
    return (
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{
          stroke: "#545454",
          strokeWidth: 2,
        }}
        markerEnd={`url(#arrow-${id})`}
      />
    );
  }

  return (
    <>
      {/* Custom marker definition */}
      <defs>
        <marker
          id={`flow-arrow-${id}`}
          markerWidth="12"
          markerHeight="12"
          refX="10"
          refY="6"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,12 L12,6 z"
            fill={markerColor}
            opacity={opacity}
          />
        </marker>
      </defs>

      {/* Invisible wider path for easier clicking */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="cursor-pointer"
        onClick={handleClick}
      />

      {/* Main edge path */}
      <path
        id={id}
        className={cn(
          "react-flow__edge-path transition-all duration-200",
          selected && "drop-shadow-md"
        )}
        d={edgePath}
        style={{
          stroke: edgeStyle.stroke,
          strokeWidth: selected ? edgeStyle.strokeWidth + 1 : edgeStyle.strokeWidth,
          strokeDasharray: edgeStyle.strokeDasharray,
          opacity,
          cursor: "pointer",
        }}
        markerEnd={`url(#flow-arrow-${id})`}
        onClick={handleClick}
      />

      {/* Animated overlay for real-time flows */}
      {edgeStyle.animated && (
        <path
          d={edgePath}
          fill="none"
          stroke={edgeStyle.stroke}
          strokeWidth={edgeStyle.strokeWidth}
          strokeDasharray="5,5"
          className="animate-flow-arrow"
          style={{ opacity: 0.5 }}
        />
      )}

      {/* Edge label */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          {/* Label container */}
          {showLabel && (
            <div
              onClick={handleClick}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
                "bg-white/95 backdrop-blur-sm shadow-sm border cursor-pointer",
                "hover:shadow-md transition-shadow",
                selected && "ring-2 ring-brand-gold"
              )}
              style={{
                borderColor: edgeStyle.stroke,
                color: edgeStyle.stroke,
              }}
            >
              {/* Flow name */}
              <span className="max-w-[120px] truncate">{flow.name}</span>

              {/* Waste indicator */}
              {hasWasteTags && (
                <AlertTriangle
                  className="h-3 w-3 text-amber-500 flex-shrink-0"
                  aria-label={`${flow.waste_types?.length} waste types tagged`}
                />
              )}
            </div>
          )}

          {/* Minimal indicator when label is hidden but waste exists */}
          {!showLabel && hasWasteTags && (
            <div
              onClick={handleClick}
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center",
                "bg-amber-100 border border-amber-400 cursor-pointer",
                "hover:bg-amber-200 transition-colors"
              )}
            >
              <AlertTriangle className="h-3 w-3 text-amber-600" />
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const FlowEdge = memo(FlowEdgeComponent);

// Export edge types configuration for React Flow
export const flowEdgeTypes = {
  flowEdge: FlowEdge,
};
