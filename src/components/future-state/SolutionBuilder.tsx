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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Lightbulb,
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles,
  Trash2,
  Ban,
  Wrench,
  Plus,
  AlertCircle,
  Layers,
  Pencil,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { SolutionCard, InsightTheme, StepDesignStatus } from "@/types";

const stepDesignStatusConfig: Record<StepDesignStatus, { icon: typeof CheckCircle; color: string; label: string; bgColor: string }> = {
  strategy_only: { icon: Layers, color: "text-gray-400", label: "Strategy Only", bgColor: "bg-gray-100" },
  needs_step_design: { icon: AlertCircle, color: "text-amber-500", label: "Needs Design", bgColor: "bg-amber-100" },
  step_design_complete: { icon: CheckCircle, color: "text-emerald-500", label: "Design Complete", bgColor: "bg-emerald-100" },
};

interface SolutionBuilderProps {
  sessionId: string;
}

interface SolutionWithRelations extends SolutionCard {
  themes?: Array<{ theme_id: string }>;
  steps?: Array<{ step_id: string }>;
  observations?: Array<{ observation_id: string }>;
  creator?: { id: string; name: string; email: string };
}

const bucketConfig = {
  eliminate: {
    label: "Eliminate",
    icon: Ban,
    color: "bg-red-100 text-red-700 border-red-200",
    headerColor: "bg-gradient-to-r from-red-500 to-red-600",
    description: "Remove wasteful steps entirely",
  },
  modify: {
    label: "Modify",
    icon: Wrench,
    color: "bg-amber-100 text-amber-700 border-amber-200",
    headerColor: "bg-gradient-to-r from-amber-500 to-amber-600",
    description: "Improve existing processes",
  },
  create: {
    label: "Create",
    icon: Plus,
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    headerColor: "bg-gradient-to-r from-emerald-500 to-emerald-600",
    description: "Add new capabilities",
  },
};

export function SolutionBuilder({ sessionId }: SolutionBuilderProps) {
  const [solutions, setSolutions] = useState<SolutionWithRelations[]>([]);
  const [themes, setThemes] = useState<InsightTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSolution, setSelectedSolution] = useState<SolutionWithRelations | null>(null);
  const [hasFutureState, setHasFutureState] = useState(false);

  const { user } = useAuthStore();
  const supabase = getSupabaseClient();
  const router = useRouter();
  const { toast } = useToast();

  // Fetch solutions and themes
  const fetchData = useCallback(async () => {
    try {
      const [solutionsRes, themesRes, futureStatesRes] = await Promise.all([
        supabase
          .from("solution_cards")
          .select(`
            *,
            creator:users!solution_cards_created_by_fkey(id, name, email),
            solution_themes(theme_id),
            solution_steps(step_id),
            solution_observations(observation_id)
          `)
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false }),
        supabase
          .from("insight_themes")
          .select("*")
          .eq("session_id", sessionId)
          .in("status", ["draft", "confirmed"]),
        supabase
          .from("future_states")
          .select("id")
          .eq("session_id", sessionId)
          .limit(1),
      ]);

      if (solutionsRes.error) {
        console.error("Error fetching solutions:", solutionsRes.error);
      } else {
        setSolutions(
          (solutionsRes.data || []).map((s: SolutionCard & { solution_themes?: Array<{ theme_id: string }>; solution_steps?: Array<{ step_id: string }>; solution_observations?: Array<{ observation_id: string }> }) => ({
            ...s,
            themes: s.solution_themes,
            steps: s.solution_steps,
            observations: s.solution_observations,
          }))
        );
      }

      if (themesRes.error) {
        console.error("Error fetching themes:", themesRes.error);
      } else {
        setThemes(themesRes.data || []);
      }

      if (!futureStatesRes.error) {
        setHasFutureState((futureStatesRes.data || []).length > 0);
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

  // Run solutions agent
  const handleRunSolutions = async () => {
    setIsRunning(true);
    try {
      console.log("[SolutionBuilder] Starting solutions agent...");
      const response = await fetch("/api/future-state/solutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, forceRerun: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("[SolutionBuilder] Solutions error:", error);
        toast({
          variant: "destructive",
          title: "Solutions Generation Failed",
          description: error.error || "Failed to generate solutions. Check console for details.",
        });
      } else {
        const result = await response.json();
        console.log("[SolutionBuilder] Solutions completed:", result);
        toast({
          title: "Solutions Generated",
          description: result.cached 
            ? "Loaded cached results from previous run." 
            : `Successfully generated ${result.data?.solutions?.length || 0} solutions.`,
        });
        await fetchData();
      }
    } catch (error) {
      console.error("[SolutionBuilder] Error running solutions:", error);
      toast({
        variant: "destructive",
        title: "Solutions Error",
        description: error instanceof Error ? error.message : "Network error occurred. Please try again.",
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Update solution status
  const handleUpdateStatus = async (
    solutionId: string,
    status: "accepted" | "rejected" | "draft"
  ) => {
    const solution = solutions.find((s) => s.id === solutionId);
    if (!solution) return;

    const { error } = await supabase
      .from("solution_cards")
      .update({ status, updated_by: user?.id })
      .eq("id", solutionId)
      .eq("revision", solution.revision);

    if (error) {
      console.error("Error updating solution:", error);
    } else {
      await fetchData();
    }
  };

  // Delete solution
  const handleDeleteSolution = async (solutionId: string) => {
    const { error } = await supabase.from("solution_cards").delete().eq("id", solutionId);

    if (error) {
      console.error("Error deleting solution:", error);
    } else {
      await fetchData();
    }
  };

  // Get theme names for a solution
  const getSolutionThemes = (solution: SolutionWithRelations) => {
    const themeIds = solution.themes?.map((t) => t.theme_id) || [];
    return themes.filter((t) => themeIds.includes(t.id));
  };

  // Navigate to designer with step design open
  const handleDesignAtStepLevel = (solutionId: string) => {
    if (!hasFutureState) {
      // Navigate to designer first to generate a future state
      router.push(`/future-state/${sessionId}?stage=designer`);
    } else {
      // Navigate to designer with the solution context
      router.push(`/future-state/${sessionId}?stage=designer&solution=${solutionId}`);
    }
  };

  // Group solutions by bucket
  const solutionsByBucket = {
    eliminate: solutions.filter((s) => s.bucket === "eliminate"),
    modify: solutions.filter((s) => s.bucket === "modify"),
    create: solutions.filter((s) => s.bucket === "create"),
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const acceptedCount = solutions.filter((s) => s.status === "accepted").length;
  const draftCount = solutions.filter((s) => s.status === "draft").length;

  return (
    <>
      <StageLanding
        stage="solutions"
        title="Solution Builder"
        description="Generate and refine solutions to address identified waste themes"
        icon={Lightbulb}
        stats={[
          { label: "Total Solutions", value: solutions.length },
          { label: "Accepted", value: acceptedCount },
          { label: "Draft", value: draftCount },
          { label: "Themes", value: themes.length },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRunSolutions}
              disabled={isRunning || themes.length === 0}
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {solutions.length === 0 ? "Generate Solutions" : "Regenerate"}
                </>
              )}
            </Button>
          </div>
        }
      >
        {solutions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lightbulb className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No solutions yet
              </h3>
              <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
                {themes.length === 0
                  ? "Complete synthesis first to identify themes"
                  : "Click 'Generate Solutions' to have AI propose solutions for your themes"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {(["eliminate", "modify", "create"] as const).map((bucket) => {
              const config = bucketConfig[bucket];
              const bucketSolutions = solutionsByBucket[bucket];
              const Icon = config.icon;

              return (
                <div key={bucket} className="space-y-4">
                  {/* Bucket Header */}
                  <div
                    className={cn(
                      "rounded-lg p-4 text-white",
                      config.headerColor
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <h3 className="font-semibold">{config.label}</h3>
                      <Badge variant="secondary" className="ml-auto bg-white/20 text-white">
                        {bucketSolutions.length}
                      </Badge>
                    </div>
                    <p className="text-sm text-white/80 mt-1">{config.description}</p>
                  </div>

                  {/* Solutions */}
                  <div className="space-y-3 min-h-[200px]">
                    <AnimatePresence>
                      {bucketSolutions.map((solution, index) => (
                        <motion.div
                          key={solution.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card
                            className={cn(
                              "group hover:shadow-md transition-all cursor-pointer",
                              solution.status === "accepted" &&
                                "border-emerald-200 bg-emerald-50/30",
                              solution.status === "rejected" &&
                                "border-red-200 bg-red-50/30 opacity-60"
                            )}
                            onClick={() => setSelectedSolution(solution)}
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between gap-2">
                                <CardTitle className="text-sm line-clamp-2">
                                  {solution.title}
                                </CardTitle>
                                <Badge
                                  variant={
                                    solution.status === "accepted"
                                      ? "default"
                                      : solution.status === "rejected"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                  className={cn(
                                    "shrink-0 text-[10px]",
                                    solution.status === "accepted" &&
                                      "bg-emerald-100 text-emerald-700"
                                  )}
                                >
                                  {solution.status}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {solution.description}
                              </p>

                              {/* Effort & Impact */}
                              <div className="flex items-center gap-2 text-xs flex-wrap">
                                {solution.effort_level && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {solution.effort_level} effort
                                  </Badge>
                                )}
                                {solution.recommended_wave && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {solution.recommended_wave}
                                  </Badge>
                                )}
                                {/* Step Design Status Badge */}
                                {solution.status === "accepted" && (bucket === "modify" || bucket === "create") && (
                                  (() => {
                                    const designStatus = solution.step_design_status || "strategy_only";
                                    const StatusIcon = stepDesignStatusConfig[designStatus].icon;
                                    return (
                                      <Badge 
                                        variant="outline" 
                                        className={cn(
                                          "text-[10px] gap-1",
                                          stepDesignStatusConfig[designStatus].bgColor,
                                          stepDesignStatusConfig[designStatus].color
                                        )}
                                      >
                                        <StatusIcon className="h-3 w-3" />
                                        {stepDesignStatusConfig[designStatus].label}
                                      </Badge>
                                    );
                                  })()
                                )}
                              </div>

                              {/* Design at Step Level CTA for accepted modify/create solutions */}
                              {solution.status === "accepted" && (bucket === "modify" || bucket === "create") && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full h-7 text-xs gap-1 border-brand-gold/50 text-brand-navy hover:bg-brand-gold/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDesignAtStepLevel(solution.id);
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                  {solution.step_design_status === "step_design_complete" 
                                    ? "View Step Design" 
                                    : "Design at Step Level"}
                                </Button>
                              )}

                              {/* Actions */}
                              <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(solution.id, "accepted");
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(solution.id, "rejected");
                                  }}
                                >
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSolution(solution.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {bucketSolutions.length === 0 && (
                      <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg">
                        <p className="text-sm text-muted-foreground">No {bucket} solutions</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </StageLanding>

      {/* Solution Detail Modal */}
      <Dialog open={!!selectedSolution} onOpenChange={() => setSelectedSolution(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {selectedSolution && (
                <Badge className={bucketConfig[selectedSolution.bucket].color}>
                  {bucketConfig[selectedSolution.bucket].label}
                </Badge>
              )}
              <Badge
                variant={
                  selectedSolution?.status === "accepted"
                    ? "default"
                    : selectedSolution?.status === "rejected"
                    ? "destructive"
                    : "secondary"
                }
              >
                {selectedSolution?.status}
              </Badge>
            </div>
            <DialogTitle>{selectedSolution?.title}</DialogTitle>
            <DialogDescription>{selectedSolution?.description}</DialogDescription>
          </DialogHeader>

          {selectedSolution && (
            <div className="space-y-4">
              {/* Expected Impact */}
              {selectedSolution.expected_impact && (
                <div>
                  <h4 className="font-medium mb-1">Expected Impact</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedSolution.expected_impact}
                  </p>
                </div>
              )}

              {/* Effort & Wave */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1">Effort Level</h4>
                  <Badge variant="outline" className="capitalize">
                    {selectedSolution.effort_level || "Not specified"}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Recommended Wave</h4>
                  <Badge variant="outline">
                    {selectedSolution.recommended_wave || "Not specified"}
                  </Badge>
                </div>
              </div>

              {/* Risks */}
              {selectedSolution.risks && selectedSolution.risks.length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">Risks</h4>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    {selectedSolution.risks.map((risk, i) => (
                      <li key={i}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Dependencies */}
              {selectedSolution.dependencies && selectedSolution.dependencies.length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">Dependencies</h4>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    {selectedSolution.dependencies.map((dep, i) => (
                      <li key={i}>{dep}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Linked Themes */}
              {getSolutionThemes(selectedSolution).length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">Addresses Themes</h4>
                  <div className="flex flex-wrap gap-2">
                    {getSolutionThemes(selectedSolution).map((theme) => (
                      <Badge key={theme.id} variant="secondary">
                        {theme.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setSelectedSolution(null)}>
              Close
            </Button>
            {selectedSolution?.status === "accepted" && 
             (selectedSolution.bucket === "modify" || selectedSolution.bucket === "create") && (
              <Button
                variant="outline"
                className="gap-2 border-brand-gold text-brand-navy"
                onClick={() => {
                  if (selectedSolution) {
                    handleDesignAtStepLevel(selectedSolution.id);
                    setSelectedSolution(null);
                  }
                }}
              >
                <Pencil className="h-4 w-4" />
                {selectedSolution.step_design_status === "step_design_complete" 
                  ? "View Step Design" 
                  : "Design at Step Level"}
              </Button>
            )}
            {selectedSolution?.status !== "accepted" && (
              <Button
                onClick={() => {
                  if (selectedSolution) {
                    handleUpdateStatus(selectedSolution.id, "accepted");
                    setSelectedSolution(null);
                  }
                }}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept Solution
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

