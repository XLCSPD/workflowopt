"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { StageLanding } from "./StudioShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GitBranch,
  Loader2,
  Sparkles,
  Calendar,
  ArrowRight,
  AlertTriangle,
  Layers,
  Pencil,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { ImplementationWave, SolutionCard, SolutionDependency, ImplementationItem, StepDesignOption } from "@/types";

interface RoadmapBuilderProps {
  sessionId: string;
}

interface WaveWithSolutions extends ImplementationWave {
  solutions: SolutionCard[];
}

interface ImplementationItemWithRelations extends ImplementationItem {
  solution?: SolutionCard;
  step_design_option?: StepDesignOption & {
    version?: {
      node?: { name: string; lane: string };
    };
  };
}

const waveColors = [
  { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-700" },
  { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-700" },
  { bg: "bg-purple-100", border: "border-purple-300", text: "text-purple-700" },
  { bg: "bg-orange-100", border: "border-orange-300", text: "text-orange-700" },
];

export function RoadmapBuilder({ sessionId }: RoadmapBuilderProps) {
  const [waves, setWaves] = useState<WaveWithSolutions[]>([]);
  const [dependencies, setDependencies] = useState<SolutionDependency[]>([]);
  const [acceptedSolutions, setAcceptedSolutions] = useState<SolutionCard[]>([]);
  const [implementationItems, setImplementationItems] = useState<ImplementationItemWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [viewMode, setViewMode] = useState<"solutions" | "items">("solutions");

  void useAuthStore; // Reserved for future presence integration
  const supabase = getSupabaseClient();
  const { toast } = useToast();

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [wavesRes, solutionsRes, depsRes, itemsRes] = await Promise.all([
        supabase
          .from("implementation_waves")
          .select(`
            *,
            wave_solutions(
              solution_id,
              order_index,
              solution:solution_cards(*)
            )
          `)
          .eq("session_id", sessionId)
          .order("order_index", { ascending: true }),
        supabase
          .from("solution_cards")
          .select("*")
          .eq("session_id", sessionId)
          .eq("status", "accepted"),
        supabase
          .from("solution_dependencies")
          .select("*")
          .in(
            "solution_id",
            (await supabase
              .from("solution_cards")
              .select("id")
              .eq("session_id", sessionId)
              .eq("status", "accepted")
            ).data?.map((s: { id: string }) => s.id) || []
          ),
        // Fetch implementation items (step design options)
        supabase
          .from("implementation_items")
          .select(`
            *,
            solution:solution_cards(*),
            step_design_option:step_design_options(*)
          `)
          .eq("session_id", sessionId),
      ]);

      if (wavesRes.error) {
        console.error("Error fetching waves:", wavesRes.error);
      } else {
        const wavesWithSolutions = (wavesRes.data || []).map((wave: ImplementationWave & { wave_solutions?: Array<{ solution: SolutionCard }> }) => ({
          ...wave,
          solutions:
            (wave.wave_solutions as Array<{ solution: SolutionCard }>)
              ?.map((ws) => ws.solution)
              .filter(Boolean) || [],
        }));
        setWaves(wavesWithSolutions);
      }

      if (solutionsRes.error) {
        console.error("Error fetching solutions:", solutionsRes.error);
      } else {
        setAcceptedSolutions(solutionsRes.data || []);
      }

      if (depsRes.error) {
        console.error("Error fetching dependencies:", depsRes.error);
      } else {
        setDependencies(depsRes.data || []);
      }

      if (itemsRes.error) {
        console.error("Error fetching implementation items:", itemsRes.error);
      } else {
        setImplementationItems(itemsRes.data || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Run sequencing agent
  const handleRunSequencing = async () => {
    setIsRunning(true);
    try {
      console.log("[RoadmapBuilder] Starting sequencing agent...");
      const response = await fetch("/api/future-state/sequencing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, forceRerun: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("[RoadmapBuilder] Sequencing error:", error);
        toast({
          variant: "destructive",
          title: "Sequencing Failed",
          description: error.error || "Failed to run sequencing agent. Check console for details.",
        });
      } else {
        const result = await response.json();
        console.log("[RoadmapBuilder] Sequencing completed:", result);
        toast({
          title: "Sequencing Complete",
          description: result.cached 
            ? "Loaded cached results from previous run." 
            : `Successfully created ${result.data?.waves?.length || 0} implementation waves.`,
        });
        await fetchData();
      }
    } catch (error) {
      console.error("[RoadmapBuilder] Error running sequencing:", error);
      toast({
        variant: "destructive",
        title: "Sequencing Error",
        description: error instanceof Error ? error.message : "Network error occurred. Please try again.",
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Get dependencies for a solution
  const getSolutionDependencies = (solutionId: string) => {
    return dependencies
      .filter((d) => d.solution_id === solutionId)
      .map((d) => acceptedSolutions.find((s) => s.id === d.depends_on_solution_id))
      .filter(Boolean) as SolutionCard[];
  };

  // Check if solution has blocking dependencies
  const hasBlockingDependencies = (solution: SolutionCard, waveIndex: number) => {
    const deps = getSolutionDependencies(solution.id);
    return deps.some((dep) => {
      const depWaveIndex = waves.findIndex((w) =>
        w.solutions.some((s) => s.id === dep.id)
      );
      return depWaveIndex >= waveIndex;
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const totalSolutions = waves.reduce((sum, w) => sum + w.solutions.length, 0);
  const unassigned = acceptedSolutions.filter(
    (s) => !waves.some((w) => w.solutions.some((ws) => ws.id === s.id))
  );
  const stepDesignItems = implementationItems.filter((i) => i.type === "step_design_option");
  const hasStepDesignItems = stepDesignItems.length > 0;

  return (
    <StageLanding
      stage="sequencing"
      title="Roadmap Builder"
      description="Sequence solutions into implementation waves and manage dependencies"
      icon={GitBranch}
      stats={[
        { label: "Waves", value: waves.length },
        { label: "Solutions", value: totalSolutions },
        { label: "Step Designs", value: stepDesignItems.length },
        { label: "Dependencies", value: dependencies.length },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRunSequencing}
            disabled={isRunning || acceptedSolutions.length === 0}
            className="gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sequencing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {waves.length === 0 ? "Generate Roadmap" : "Regenerate"}
              </>
            )}
          </Button>
        </div>
      }
    >
      {waves.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GitBranch className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No roadmap yet
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
              {acceptedSolutions.length === 0
                ? "Accept solutions first to build a roadmap"
                : "Click 'Generate Roadmap' to sequence your solutions into implementation waves"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* View Mode Tabs */}
          {hasStepDesignItems && (
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
              <TabsList>
                <TabsTrigger value="solutions" className="gap-2">
                  <Layers className="h-4 w-4" />
                  Solutions ({totalSolutions})
                </TabsTrigger>
                <TabsTrigger value="items" className="gap-2">
                  <Pencil className="h-4 w-4" />
                  Step Designs ({stepDesignItems.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* Solutions View (default/legacy) */}
          {viewMode === "solutions" && (
          <>
          <div className="grid gap-4 lg:grid-cols-4">
            {waves.map((wave, waveIndex) => {
              const colors = waveColors[waveIndex % waveColors.length];

              return (
                <motion.div
                  key={wave.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: waveIndex * 0.1 }}
                >
                  <Card className={cn("h-full", colors.border)}>
                    <CardHeader className={cn("pb-2", colors.bg)}>
                      <div className="flex items-center justify-between">
                        <CardTitle className={cn("text-sm", colors.text)}>
                          {wave.name}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {wave.solutions.length}
                        </Badge>
                      </div>
                      {(wave.start_estimate || wave.end_estimate) && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {wave.start_estimate}
                          {wave.end_estimate && (
                            <>
                              <ArrowRight className="h-3 w-3" />
                              {wave.end_estimate}
                            </>
                          )}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2 pt-3">
                      <AnimatePresence>
                        {wave.solutions.map((solution, solIndex) => {
                          const deps = getSolutionDependencies(solution.id);
                          const hasBlocking = hasBlockingDependencies(solution, waveIndex);

                          return (
                            <motion.div
                              key={solution.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ delay: solIndex * 0.05 }}
                              className={cn(
                                "p-2 rounded-md bg-white border text-xs",
                                hasBlocking && "border-amber-300 bg-amber-50"
                              )}
                            >
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium line-clamp-1">{solution.title}</p>
                                  <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] capitalize"
                                    >
                                      {solution.bucket}
                                    </Badge>
                                    {solution.effort_level && (
                                      <Badge variant="outline" className="text-[10px]">
                                        {solution.effort_level}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {hasBlocking && (
                                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                )}
                              </div>
                              {deps.length > 0 && (
                                <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground">
                                  <span className="font-medium">Depends on: </span>
                                  {deps.map((d) => d.title).join(", ")}
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>

                      {wave.solutions.length === 0 && (
                        <div className="flex items-center justify-center h-20 border-2 border-dashed rounded-md">
                          <p className="text-xs text-muted-foreground">No solutions</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Unassigned Solutions */}
          {unassigned.length > 0 && (
            <Card className="border-dashed border-amber-300">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  Unassigned Solutions ({unassigned.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {unassigned.map((solution) => (
                    <Badge key={solution.id} variant="outline">
                      {solution.title}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dependency Graph Placeholder */}
          {dependencies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Dependency Graph
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dependencies.map((dep) => {
                    const solution = acceptedSolutions.find((s) => s.id === dep.solution_id);
                    const dependsOn = acceptedSolutions.find(
                      (s) => s.id === dep.depends_on_solution_id
                    );

                    return (
                      <div
                        key={dep.id}
                        className="flex items-center gap-2 text-sm p-2 bg-muted rounded-md"
                      >
                        <Badge variant="outline">{dependsOn?.title || "Unknown"}</Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="secondary">{solution?.title || "Unknown"}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          </>
          )}

          {/* Step Design Items View */}
          {viewMode === "items" && hasStepDesignItems && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Pencil className="h-4 w-4" />
                    Step-Level Implementation Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stepDesignItems.map((item) => {
                      const option = item.step_design_option;
                      const node = option?.version?.node;

                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 border rounded-lg bg-white"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] bg-purple-100 text-purple-700">
                                  Step Design
                                </Badge>
                                {option?.option_key && (
                                  <Badge variant="outline" className="text-[10px] font-mono">
                                    Option {option.option_key}
                                  </Badge>
                                )}
                              </div>
                              <p className="font-medium mt-1">{item.label}</p>
                              {node && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Step: {node.name} ({node.lane})
                                </p>
                              )}
                              {option?.summary && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {option.summary}
                                </p>
                              )}
                            </div>
                            {option?.confidence !== undefined && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs shrink-0",
                                  option.confidence >= 0.8
                                    ? "bg-emerald-100 text-emerald-700"
                                    : option.confidence >= 0.5
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                                )}
                              >
                                {Math.round(option.confidence * 100)}%
                              </Badge>
                            )}
                          </div>
                          {option?.risks && option.risks.length > 0 && (
                            <div className="mt-2 pt-2 border-t">
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-amber-600">Risks:</span>{" "}
                                {option.risks.join(", ")}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </StageLanding>
  );
}

