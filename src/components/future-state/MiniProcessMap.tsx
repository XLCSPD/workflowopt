"use client";

import { useMemo, useState } from "react";
import {
  Eye,
  Target,
  AlertTriangle,
  Maximize2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ProcessStep, ObservationWithWasteTypes } from "@/types";

interface MiniProcessMapProps {
  sessionId: string;
  currentSteps: ProcessStep[];
  connections: Array<{ source: string; target: string }>;
  observations: ObservationWithWasteTypes[];
  impactedStepIds?: string[];
  highlightedStepId?: string | null;
  onStepClick?: (stepId: string) => void;
  onViewSession?: () => void;
}

// Swimlane color palette matching ProcessMap
const SWIMLANE_COLORS = [
  { bg: "bg-blue-50", border: "border-blue-300", label: "text-blue-700", bgDark: "dark:bg-blue-950/30" },
  { bg: "bg-green-50", border: "border-green-300", label: "text-green-700", bgDark: "dark:bg-green-950/30" },
  { bg: "bg-amber-50", border: "border-amber-300", label: "text-amber-700", bgDark: "dark:bg-amber-950/30" },
  { bg: "bg-pink-50", border: "border-pink-300", label: "text-pink-700", bgDark: "dark:bg-pink-950/30" },
  { bg: "bg-indigo-50", border: "border-indigo-300", label: "text-indigo-700", bgDark: "dark:bg-indigo-950/30" },
  { bg: "bg-cyan-50", border: "border-cyan-300", label: "text-cyan-700", bgDark: "dark:bg-cyan-950/30" },
];

// Priority thresholds for heat coloring
const getPriorityColor = (priority: number) => {
  if (priority >= 100) return { bg: "bg-red-100", border: "border-red-400", text: "text-red-700" };
  if (priority >= 50) return { bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-700" };
  if (priority >= 20) return { bg: "bg-amber-100", border: "border-amber-400", text: "text-amber-700" };
  if (priority > 0) return { bg: "bg-yellow-50", border: "border-yellow-400", text: "text-yellow-700" };
  return { bg: "bg-white dark:bg-gray-800", border: "border-gray-200 dark:border-gray-600", text: "text-gray-600" };
};

export function MiniProcessMap({
  sessionId: _sessionId,
  currentSteps,
  connections,
  observations,
  impactedStepIds = [],
  highlightedStepId,
  onStepClick,
  onViewSession,
}: MiniProcessMapProps) {
  // sessionId reserved for future use (analytics, tracking)
  void _sessionId;
  const [isExpanded, setIsExpanded] = useState(false);

  // Group observations by step with priority totals
  const stepStats = useMemo(() => {
    const stats: Record<string, { count: number; priority: number; wasteTypes: string[] }> = {};
    observations.forEach((obs) => {
      if (!stats[obs.step_id]) {
        stats[obs.step_id] = { count: 0, priority: 0, wasteTypes: [] };
      }
      stats[obs.step_id].count += 1;
      stats[obs.step_id].priority += obs.priority_score || 0;
      obs.waste_types?.forEach((wt) => {
        if (wt && !stats[obs.step_id].wasteTypes.includes(wt.code)) {
          stats[obs.step_id].wasteTypes.push(wt.code);
        }
      });
    });
    return stats;
  }, [observations]);

  // Group steps by lane, sorted by order
  const lanes = useMemo(() => {
    const laneMap = new Map<string, ProcessStep[]>();
    currentSteps.forEach((step) => {
      const lane = step.lane || "Default";
      if (!laneMap.has(lane)) laneMap.set(lane, []);
      laneMap.get(lane)!.push(step);
    });
    // Sort steps within each lane by order_index
    laneMap.forEach((steps) => {
      steps.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    });
    return Array.from(laneMap.entries());
  }, [currentSteps]);

  // Build adjacency for drawing arrows
  const outgoingConnections = useMemo(() => {
    const map = new Map<string, string[]>();
    connections.forEach(({ source, target }) => {
      if (!map.has(source)) map.set(source, []);
      map.get(source)!.push(target);
    });
    return map;
  }, [connections]);

  // Find step position for detecting cross-lane arrows
  const stepPositions = useMemo(() => {
    const positions: Record<string, { laneIdx: number; stepIdx: number }> = {};
    lanes.forEach(([, steps], laneIdx) => {
      steps.forEach((step, stepIdx) => {
        positions[step.id] = { laneIdx, stepIdx };
      });
    });
    return positions;
  }, [lanes]);

  // Check if there are cross-lane connections
  const hasCrossLaneConnections = useMemo(() => {
    return connections.some(({ source, target }) => {
      const srcPos = stepPositions[source];
      const tgtPos = stepPositions[target];
      return srcPos && tgtPos && srcPos.laneIdx !== tgtPos.laneIdx;
    });
  }, [connections, stepPositions]);

  const totalObservations = observations.length;
  const stepsWithIssues = Object.keys(stepStats).length;

  const renderMiniMap = (compact: boolean = true) => (
    <div className={cn("space-y-2", compact && "text-xs")}>
      {lanes.map(([laneName, steps], laneIdx) => {
        const laneColor = SWIMLANE_COLORS[laneIdx % SWIMLANE_COLORS.length];

        return (
          <div
            key={laneName}
            className={cn(
              "rounded-lg border p-2",
              laneColor.bg,
              laneColor.bgDark,
              laneColor.border
            )}
          >
            {/* Lane Header */}
            <div
              className={cn(
                "font-medium mb-1.5 uppercase tracking-wider",
                compact ? "text-[9px]" : "text-[10px]",
                laneColor.label
              )}
            >
              {laneName}
            </div>

            {/* Steps Row */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {steps.length === 0 ? (
                <span className="text-[10px] text-muted-foreground italic">
                  No steps
                </span>
              ) : (
                steps.map((step, stepIdx) => {
                  const stats = stepStats[step.id];
                  const hasObservations = stats && stats.count > 0;
                  const priorityColor = getPriorityColor(stats?.priority || 0);
                  const isImpacted = impactedStepIds.includes(step.id);
                  const isHighlighted = highlightedStepId === step.id;
                  const hasOutgoing = outgoingConnections.has(step.id);

                  // Check if next connection is within same lane
                  const nextStepInLane = stepIdx < steps.length - 1 ? steps[stepIdx + 1] : null;
                  const hasConnectionToNext =
                    nextStepInLane && outgoingConnections.get(step.id)?.includes(nextStepInLane.id);

                  return (
                    <div key={step.id} className="flex items-center shrink-0">
                      {/* Step Node */}
                      <div
                        onClick={() => onStepClick?.(step.id)}
                        className={cn(
                          "relative px-1.5 py-1 rounded border-2 cursor-pointer transition-all",
                          "hover:shadow-md hover:scale-105",
                          compact ? "min-w-[60px] max-w-[80px]" : "min-w-[100px] max-w-[140px]",
                          hasObservations ? priorityColor.bg : "bg-white dark:bg-gray-800",
                          hasObservations ? priorityColor.border : "border-gray-200 dark:border-gray-600",
                          isImpacted && "ring-2 ring-brand-gold ring-offset-1",
                          isHighlighted && "ring-2 ring-blue-500 ring-offset-1 scale-105"
                        )}
                      >
                        {/* Step Name */}
                        <div
                          className={cn(
                            "font-medium truncate",
                            compact ? "text-[9px]" : "text-xs",
                            hasObservations ? priorityColor.text : "text-gray-700 dark:text-gray-300"
                          )}
                          title={step.step_name}
                        >
                          {step.step_name}
                        </div>

                        {/* Observation Badge */}
                        {hasObservations && (
                          <div className="flex items-center justify-between mt-0.5">
                            <div className="flex items-center gap-0.5">
                              <AlertTriangle
                                className={cn(
                                  "text-amber-600",
                                  compact ? "h-2 w-2" : "h-2.5 w-2.5"
                                )}
                              />
                              <span
                                className={cn(
                                  "font-bold",
                                  compact ? "text-[8px]" : "text-[9px]",
                                  priorityColor.text
                                )}
                              >
                                {stats.count}
                              </span>
                            </div>
                            <span
                              className={cn(
                                "font-bold",
                                compact ? "text-[8px]" : "text-[9px]",
                                priorityColor.text
                              )}
                              title="Priority Score"
                            >
                              {stats.priority}
                            </span>
                          </div>
                        )}

                        {/* Impact Indicator */}
                        {isImpacted && (
                          <div className="absolute -top-1.5 -right-1.5">
                            <Target className="h-3 w-3 text-brand-gold fill-brand-gold/30" />
                          </div>
                        )}
                      </div>

                      {/* Arrow to next step (if connected) */}
                      {hasOutgoing && hasConnectionToNext && (
                        <div className="flex items-center px-0.5">
                          <div className="w-2 h-0.5 bg-gray-400" />
                          <div className="w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-l-[4px] border-l-gray-400" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}

      {/* Cross-lane arrows indicator */}
      {hasCrossLaneConnections && (
        <div className="text-[9px] text-muted-foreground text-center italic flex items-center justify-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 2V10M6 10L3 7M6 10L9 7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Flow continues across lanes
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-brand-gold" />
          <span className="text-sm font-semibold">Waste Walk Map</span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(true)}
            className="h-6 w-6 p-0"
            title="Expand map"
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
          {onViewSession && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewSession}
              className="h-6 w-6 p-0"
              title="Open full session"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex gap-3 mb-2 pb-2 border-b">
        <div className="text-center flex-1">
          <div className="text-lg font-bold text-brand-gold">{totalObservations}</div>
          <div className="text-[9px] text-muted-foreground">Observations</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-lg font-bold text-amber-500">{stepsWithIssues}</div>
          <div className="text-[9px] text-muted-foreground">Steps Affected</div>
        </div>
      </div>

      {/* Mini Map */}
      <div className="flex-1 overflow-y-auto">{renderMiniMap(true)}</div>

      {/* Legend */}
      <div className="mt-2 pt-2 border-t space-y-2">
        <div className="flex items-center justify-center gap-2 text-[9px] text-muted-foreground flex-wrap">
          <span>Priority:</span>
          <div className="flex items-center gap-0.5">
            <div className="w-2 h-2 rounded bg-gray-100 border border-gray-300" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="w-2 h-2 rounded bg-amber-100 border border-amber-400" />
            <span>Med</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="w-2 h-2 rounded bg-orange-100 border border-orange-400" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="w-2 h-2 rounded bg-red-100 border border-red-400" />
            <span>Critical</span>
          </div>
        </div>

        {/* Impact Summary */}
        {impactedStepIds.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 text-xs">
            <Target className="h-3 w-3 text-brand-gold" />
            <span className="text-muted-foreground">
              <strong className="text-foreground">{impactedStepIds.length}</strong> steps targeted
              for improvement
            </span>
          </div>
        )}
      </div>

      {/* Expanded Dialog */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-brand-gold" />
              Waste Walk Process Map
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-2 min-h-0">
            {renderMiniMap(false)}
          </div>

          {/* Stats in expanded view */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-brand-gold">{totalObservations}</span>
                <span className="text-muted-foreground">Observations</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-amber-500">{stepsWithIssues}</span>
                <span className="text-muted-foreground">Steps Affected</span>
              </div>
              {impactedStepIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-brand-gold" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">{impactedStepIds.length}</strong> targeted
                  </span>
                </div>
              )}
            </div>
            {onViewSession && (
              <Button onClick={onViewSession} variant="outline" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Open Full Session
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

