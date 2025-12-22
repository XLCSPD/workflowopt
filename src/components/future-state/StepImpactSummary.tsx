"use client";

import { useMemo } from "react";
import { Target, Lightbulb, AlertTriangle, ChevronDown, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type {
  FutureStateNode,
  SolutionCard,
  ProcessStep,
  ObservationWithWasteTypes,
  WasteType,
} from "@/types";

interface StepImpactSummaryProps {
  nodes: FutureStateNode[];
  solutions: SolutionCard[];
  observations: ObservationWithWasteTypes[];
  currentSteps: ProcessStep[];
  onNodeClick?: (nodeId: string) => void;
}

const actionColors: Record<string, string> = {
  keep: "bg-gray-100 text-gray-700 border-gray-300",
  modify: "bg-blue-100 text-blue-700 border-blue-300",
  remove: "bg-red-100 text-red-700 border-red-300",
  new: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

export function StepImpactSummary({
  nodes,
  solutions,
  observations,
  currentSteps,
  onNodeClick,
}: StepImpactSummaryProps) {
  // Filter to only impacted nodes (not "keep")
  const impactedNodes = useMemo(
    () => nodes.filter((n) => n.action !== "keep"),
    [nodes]
  );

  // Group observations by step
  const observationsByStep = useMemo(() => {
    const map = new Map<string, ObservationWithWasteTypes[]>();
    observations.forEach((obs) => {
      const existing = map.get(obs.step_id) || [];
      map.set(obs.step_id, [...existing, obs]);
    });
    return map;
  }, [observations]);

  // Get unique waste types from observations for a step
  const getStepWasteTypes = (stepId: string): WasteType[] => {
    const stepObs = observationsByStep.get(stepId) || [];
    const wasteTypes = stepObs.flatMap((obs) => obs.waste_types || []);
    const unique = new Map<string, WasteType>();
    wasteTypes.forEach((wt) => {
      if (wt && !unique.has(wt.id)) {
        unique.set(wt.id, wt);
      }
    });
    return Array.from(unique.values());
  };

  // Calculate total waste types addressed
  const totalWasteTypesAddressed = useMemo(() => {
    const allWasteTypes = new Set<string>();
    impactedNodes.forEach((node) => {
      if (node.source_step_id) {
        const stepObs = observationsByStep.get(node.source_step_id) || [];
        stepObs.forEach((obs) => {
          obs.waste_types?.forEach((wt) => {
            if (wt) allWasteTypes.add(wt.id);
          });
        });
      }
    });
    return allWasteTypes.size;
  }, [impactedNodes, observationsByStep]);

  if (impactedNodes.length === 0) {
    return null;
  }

  return (
    <Card className="border-brand-gold/30">
      <Collapsible defaultOpen>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-brand-gold" />
                <CardTitle className="text-sm font-semibold">
                  Impact Summary
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {impactedNodes.length} steps
                </Badge>
                {totalWasteTypesAddressed > 0 && (
                  <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {totalWasteTypesAddressed} waste types
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 px-4 pb-4 space-y-3">
            {impactedNodes.map((node) => {
              const solution = solutions.find((s) => s.id === node.linked_solution_id);
              const sourceStep = currentSteps.find((s) => s.id === node.source_step_id);
              const wasteTypes = node.source_step_id
                ? getStepWasteTypes(node.source_step_id)
                : [];
              const obsCount = node.source_step_id
                ? observationsByStep.get(node.source_step_id)?.length || 0
                : 0;

              return (
                <div
                  key={node.id}
                  className={cn(
                    "p-3 bg-muted/30 rounded-lg space-y-2 border-l-4 transition-all",
                    node.action === "modify" && "border-l-blue-500",
                    node.action === "remove" && "border-l-red-500",
                    node.action === "new" && "border-l-emerald-500",
                    onNodeClick && "cursor-pointer hover:bg-muted/60"
                  )}
                  onClick={() => onNodeClick?.(node.id)}
                >
                  {/* Node Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{node.name}</span>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] capitalize", actionColors[node.action])}
                      >
                        {node.action}
                      </Badge>
                    </div>
                    {sourceStep && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {sourceStep.lane}
                      </span>
                    )}
                  </div>

                  {/* Problem Being Solved */}
                  {wasteTypes.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        <span>
                          Waste Addressed{" "}
                          <span className="text-foreground font-medium">
                            ({obsCount} observation{obsCount !== 1 ? "s" : ""})
                          </span>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {wasteTypes.map((wt) => (
                          <Badge
                            key={wt.id}
                            variant="secondary"
                            className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                          >
                            {wt.code}: {wt.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Linked Solution */}
                  {solution && (
                    <div className="flex items-start gap-2 pt-1 border-t border-dashed">
                      <Lightbulb className="h-3.5 w-3.5 text-brand-gold mt-0.5 shrink-0" />
                      <div className="text-xs flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{solution.title}</span>
                          <Badge variant="outline" className="text-[8px] capitalize">
                            {solution.bucket}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground line-clamp-2 mt-0.5">
                          {solution.description}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Change indicator for modify action */}
                  {node.action === "modify" && sourceStep && (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1">
                      <span className="text-blue-600">{sourceStep.step_name}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="text-foreground font-medium">{node.name}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Summary footer */}
            <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Click on any step above to view or edit its design
              </span>
              <div className="flex gap-2">
                {nodes.filter((n) => n.action === "modify").length > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    {nodes.filter((n) => n.action === "modify").length} Modified
                  </Badge>
                )}
                {nodes.filter((n) => n.action === "new").length > 0 && (
                  <Badge variant="outline" className="text-[10px] bg-emerald-50">
                    {nodes.filter((n) => n.action === "new").length} New
                  </Badge>
                )}
                {nodes.filter((n) => n.action === "remove").length > 0 && (
                  <Badge variant="outline" className="text-[10px] bg-red-50">
                    {nodes.filter((n) => n.action === "remove").length} Removed
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

