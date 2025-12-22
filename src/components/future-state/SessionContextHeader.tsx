"use client";

import { useMemo } from "react";
import {
  FileSearch,
  AlertTriangle,
  Lightbulb,
  Target,
  TrendingUp,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  ObservationWithWasteTypes,
  SolutionCard,
  FutureStateNode,
  WasteType,
} from "@/types";

interface SessionContextHeaderProps {
  observations: ObservationWithWasteTypes[];
  solutions: SolutionCard[];
  nodes: FutureStateNode[];
  sessionName?: string;
}

export function SessionContextHeader({
  observations,
  solutions,
  nodes,
  sessionName,
}: SessionContextHeaderProps) {
  // Calculate stats
  const stats = useMemo(() => {
    // Unique steps with observations
    const stepsWithObs = new Set(observations.map((o) => o.step_id));

    // Unique waste types across all observations
    const wasteTypeMap = new Map<string, WasteType>();
    observations.forEach((obs) => {
      obs.waste_types?.forEach((wt) => {
        if (wt && !wasteTypeMap.has(wt.id)) {
          wasteTypeMap.set(wt.id, wt);
        }
      });
    });

    // Top waste categories
    const wasteCounts: Record<string, number> = {};
    observations.forEach((obs) => {
      obs.waste_types?.forEach((wt) => {
        if (wt) {
          wasteCounts[wt.code] = (wasteCounts[wt.code] || 0) + 1;
        }
      });
    });

    const topWasteTypes = Object.entries(wasteCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([code, count]) => ({ code, count }));

    // Nodes being changed
    const changedNodes = nodes.filter((n) => n.action !== "keep");
    const modifiedCount = nodes.filter((n) => n.action === "modify").length;
    const newCount = nodes.filter((n) => n.action === "new").length;
    const removedCount = nodes.filter((n) => n.action === "remove").length;

    // Average priority score
    const avgPriority =
      observations.length > 0
        ? observations.reduce((sum, o) => sum + (o.priority_score || 0), 0) /
          observations.length
        : 0;

    return {
      observationCount: observations.length,
      stepsWithObsCount: stepsWithObs.size,
      wasteTypeCount: wasteTypeMap.size,
      topWasteTypes,
      acceptedSolutionCount: solutions.filter((s) => s.status === "accepted").length,
      totalSolutionCount: solutions.length,
      changedNodeCount: changedNodes.length,
      modifiedCount,
      newCount,
      removedCount,
      avgPriority: Math.round(avgPriority),
    };
  }, [observations, solutions, nodes]);

  return (
    <div className="flex flex-wrap items-center gap-4 p-3 bg-gradient-to-r from-muted/40 to-muted/20 rounded-lg border border-muted">
      {/* Session Name */}
      {sessionName && (
        <>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Session:</span>
            <span className="text-sm font-medium">{sessionName}</span>
          </div>
          <Separator orientation="vertical" className="h-5" />
        </>
      )}

      {/* Observations */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <FileSearch className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong className="text-brand-gold">{stats.observationCount}</strong>{" "}
                <span className="text-muted-foreground">
                  observation{stats.observationCount !== 1 ? "s" : ""}
                </span>
              </span>
              <Badge variant="secondary" className="text-[10px] ml-1">
                {stats.stepsWithObsCount} steps
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {stats.observationCount} waste observations recorded across{" "}
              {stats.stepsWithObsCount} process steps
            </p>
            {stats.avgPriority > 0 && (
              <p className="text-muted-foreground mt-1">
                Average priority score: {stats.avgPriority}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Separator orientation="vertical" className="h-5" />

      {/* Waste Types */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm">
                <strong className="text-amber-600">{stats.wasteTypeCount}</strong>{" "}
                <span className="text-muted-foreground">waste types</span>
              </span>
              {stats.topWasteTypes.length > 0 && (
                <div className="flex gap-1 ml-1">
                  {stats.topWasteTypes.map((wt) => (
                    <Badge
                      key={wt.code}
                      variant="outline"
                      className="text-[9px] px-1 py-0 border-amber-300 text-amber-700"
                    >
                      {wt.code}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium mb-1">Top waste types identified:</p>
            <ul className="text-sm space-y-0.5">
              {stats.topWasteTypes.map((wt) => (
                <li key={wt.code}>
                  {wt.code}: {wt.count} occurrence{wt.count !== 1 ? "s" : ""}
                </li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Separator orientation="vertical" className="h-5" />

      {/* Solutions */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <Lightbulb className="h-4 w-4 text-brand-gold" />
              <span className="text-sm">
                <strong className="text-brand-gold">
                  {stats.acceptedSolutionCount}
                </strong>
                <span className="text-muted-foreground">
                  /{stats.totalSolutionCount} solutions
                </span>
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {stats.acceptedSolutionCount} solutions accepted out of{" "}
              {stats.totalSolutionCount} proposed
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Separator orientation="vertical" className="h-5" />

      {/* Changes Summary */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <Target className="h-4 w-4 text-emerald-500" />
              <span className="text-sm">
                <strong className="text-emerald-600">{stats.changedNodeCount}</strong>{" "}
                <span className="text-muted-foreground">steps impacted</span>
              </span>
              <div className="flex gap-1 ml-1">
                {stats.modifiedCount > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1 py-0 border-blue-300 text-blue-700"
                  >
                    {stats.modifiedCount} mod
                  </Badge>
                )}
                {stats.newCount > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1 py-0 border-emerald-300 text-emerald-700"
                  >
                    {stats.newCount} new
                  </Badge>
                )}
                {stats.removedCount > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1 py-0 border-red-300 text-red-700"
                  >
                    {stats.removedCount} rem
                  </Badge>
                )}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium mb-1">Future state changes:</p>
            <ul className="text-sm space-y-0.5">
              <li>• {stats.modifiedCount} steps modified</li>
              <li>• {stats.newCount} new steps added</li>
              <li>• {stats.removedCount} steps removed</li>
            </ul>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Improvement indicator */}
      {stats.changedNodeCount > 0 && stats.observationCount > 0 && (
        <>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground">
              Addressing{" "}
              <strong className="text-foreground">
                {Math.round(
                  (stats.changedNodeCount / stats.stepsWithObsCount) * 100
                )}
                %
              </strong>{" "}
              of problem areas
            </span>
          </div>
        </>
      )}
    </div>
  );
}

