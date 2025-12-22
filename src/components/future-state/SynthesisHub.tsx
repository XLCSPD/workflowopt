"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { StageLanding } from "./StudioShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Layers,
  MoreVertical,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { InsightTheme, ObservationWithWasteTypes, ProcessStep, WasteType } from "@/types";

interface SynthesisHubProps {
  sessionId: string;
}

interface ThemeWithRelations extends InsightTheme {
  observations?: Array<{ observation_id: string }>;
  steps?: Array<{ step_id: string }>;
  waste_types?: Array<{ waste_type_id: string }>;
  creator?: { id: string; name: string; email: string };
}

interface ObservationWithStep extends ObservationWithWasteTypes {
  step?: ProcessStep | ProcessStep[];
}

export function SynthesisHub({ sessionId }: SynthesisHubProps) {
  const [themes, setThemes] = useState<ThemeWithRelations[]>([]);
  const [observations, setObservations] = useState<ObservationWithStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeWithRelations | null>(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [editingTheme, setEditingTheme] = useState<ThemeWithRelations | null>(null);
  
  const { user } = useAuthStore();
  const supabase = getSupabaseClient();
  const { toast } = useToast();

  // Fetch themes and observations
  const fetchData = useCallback(async () => {
    try {
      const [themesRes, obsRes] = await Promise.all([
        supabase
          .from("insight_themes")
          .select(`
            *,
            creator:users!insight_themes_created_by_fkey(id, name, email),
            insight_theme_observations(observation_id),
            insight_theme_steps(step_id),
            insight_theme_waste_types(waste_type_id)
          `)
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false }),
        supabase
          .from("observations")
          .select(`
            *,
            user:users(id, name, email),
            step:process_steps(id, step_name, lane),
            observation_waste_links(
              waste_type:waste_types(*)
            )
          `)
          .eq("session_id", sessionId),
      ]);

      if (themesRes.error) {
        console.error("Error fetching themes:", themesRes.error);
      } else {
        setThemes(
          (themesRes.data || []).map((t: InsightTheme & { insight_theme_observations?: Array<{ observation_id: string }>; insight_theme_steps?: Array<{ step_id: string }>; insight_theme_waste_types?: Array<{ waste_type_id: string }> }) => ({
            ...t,
            observations: t.insight_theme_observations,
            steps: t.insight_theme_steps,
            waste_types: t.insight_theme_waste_types,
          }))
        );
      }

      if (obsRes.error) {
        console.error("Error fetching observations:", obsRes.error);
      } else {
        const transformed = (obsRes.data || []).map((obs: ObservationWithStep & { observation_waste_links?: Array<{ waste_type: WasteType | null }> }) => ({
          ...obs,
          waste_types:
            (obs.observation_waste_links || [])
              .map((link) => link.waste_type)
              .filter((wt): wt is WasteType => wt !== null) || [],
        }));
        setObservations(transformed);
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

  // Run synthesis agent
  const handleRunSynthesis = async () => {
    setIsRunning(true);
    try {
      console.log("[SynthesisHub] Starting synthesis agent...");
      const response = await fetch("/api/future-state/synthesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, forceRerun: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("[SynthesisHub] Synthesis error:", error);
        toast({
          variant: "destructive",
          title: "Synthesis Failed",
          description: error.error || "Failed to run synthesis agent. Check console for details.",
        });
      } else {
        const result = await response.json();
        console.log("[SynthesisHub] Synthesis completed:", result);
        toast({
          title: "Synthesis Complete",
          description: result.cached 
            ? "Loaded cached results from previous run." 
            : `Successfully identified ${result.data?.themes?.length || 0} themes.`,
        });
        await fetchData();
      }
    } catch (error) {
      console.error("[SynthesisHub] Error running synthesis:", error);
      toast({
        variant: "destructive",
        title: "Synthesis Error",
        description: error instanceof Error ? error.message : "Network error occurred. Please try again.",
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Update theme status
  const handleUpdateStatus = async (themeId: string, status: "confirmed" | "rejected") => {
    const theme = themes.find((t) => t.id === themeId);
    if (!theme) return;

    const { error } = await supabase
      .from("insight_themes")
      .update({ status, updated_by: user?.id })
      .eq("id", themeId)
      .eq("revision", theme.revision);

    if (error) {
      console.error("Error updating theme:", error);
    } else {
      await fetchData();
    }
  };

  // Delete theme
  const handleDeleteTheme = async (themeId: string) => {
    const { error } = await supabase.from("insight_themes").delete().eq("id", themeId);

    if (error) {
      console.error("Error deleting theme:", error);
    } else {
      await fetchData();
    }
  };

  // Save edited theme
  const handleSaveTheme = async () => {
    if (!editingTheme) return;

    const { error } = await supabase
      .from("insight_themes")
      .update({
        name: editingTheme.name,
        summary: editingTheme.summary,
        root_cause_hypotheses: editingTheme.root_cause_hypotheses,
        updated_by: user?.id,
      })
      .eq("id", editingTheme.id)
      .eq("revision", editingTheme.revision);

    if (error) {
      console.error("Error saving theme:", error);
    } else {
      setEditingTheme(null);
      await fetchData();
    }
  };

  // Get observations for a theme
  const getThemeObservations = (theme: ThemeWithRelations) => {
    const obsIds = theme.observations?.map((o) => o.observation_id) || [];
    return observations.filter((o) => obsIds.includes(o.id));
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const confirmedCount = themes.filter((t) => t.status === "confirmed").length;
  const draftCount = themes.filter((t) => t.status === "draft").length;

  return (
    <>
      <StageLanding
        stage="synthesis"
        title="Synthesis Hub"
        description="Cluster observations into meaningful themes and identify root causes"
        icon={Layers}
        stats={[
          { label: "Total Themes", value: themes.length },
          { label: "Confirmed", value: confirmedCount },
          { label: "Draft", value: draftCount },
          { label: "Observations", value: observations.length },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRunSynthesis}
              disabled={isRunning || observations.length === 0}
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Synthesizing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {themes.length === 0 ? "Run Synthesis" : "Re-run Synthesis"}
                </>
              )}
            </Button>
          </div>
        }
      >
        {themes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Layers className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No themes yet
              </h3>
              <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
                {observations.length === 0
                  ? "Complete a waste walk first to gather observations"
                  : "Click 'Run Synthesis' to have AI analyze your observations and identify themes"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {themes.map((theme, index) => (
                <motion.div
                  key={theme.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={cn(
                      "group hover:shadow-md transition-all cursor-pointer",
                      theme.status === "confirmed" && "border-emerald-200 bg-emerald-50/30",
                      theme.status === "rejected" && "border-red-200 bg-red-50/30 opacity-60"
                    )}
                    onClick={() => {
                      setSelectedTheme(theme);
                      setShowEvidenceModal(true);
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base line-clamp-2">{theme.name}</CardTitle>
                          <CardDescription className="line-clamp-2 mt-1">
                            {theme.summary}
                          </CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTheme(theme);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(theme.id, "confirmed");
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-2 text-emerald-500" />
                              Confirm
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(theme.id, "rejected");
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2 text-red-500" />
                              Reject
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTheme(theme.id);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Status & Confidence */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={
                            theme.status === "confirmed"
                              ? "default"
                              : theme.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                          className={cn(
                            theme.status === "confirmed" &&
                              "bg-emerald-100 text-emerald-700 border-emerald-200"
                          )}
                        >
                          {theme.status}
                        </Badge>
                        {theme.confidence && (
                          <Badge variant="outline" className="capitalize">
                            {theme.confidence} confidence
                          </Badge>
                        )}
                      </div>

                      {/* Evidence Count */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          {theme.observations?.length || 0} observations
                        </span>
                      </div>

                      {/* Root Causes */}
                      {theme.root_cause_hypotheses && theme.root_cause_hypotheses.length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Root Causes
                          </p>
                          <ul className="text-sm space-y-0.5">
                            {theme.root_cause_hypotheses.slice(0, 2).map((hypothesis, i) => (
                              <li
                                key={i}
                                className="text-muted-foreground flex items-start gap-1"
                              >
                                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0 text-amber-500" />
                                <span className="line-clamp-1">{hypothesis}</span>
                              </li>
                            ))}
                            {theme.root_cause_hypotheses.length > 2 && (
                              <li className="text-xs text-muted-foreground">
                                +{theme.root_cause_hypotheses.length - 2} more
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </StageLanding>

      {/* Evidence Modal */}
      <Dialog open={showEvidenceModal} onOpenChange={setShowEvidenceModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTheme?.name}</DialogTitle>
            <DialogDescription>{selectedTheme?.summary}</DialogDescription>
          </DialogHeader>

          {selectedTheme && (
            <div className="space-y-4">
              {/* Root Causes */}
              {selectedTheme.root_cause_hypotheses &&
                selectedTheme.root_cause_hypotheses.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Root Cause Hypotheses</h4>
                    <ul className="space-y-1">
                      {selectedTheme.root_cause_hypotheses.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Linked Observations */}
              <div>
                <h4 className="font-medium mb-2">Evidence (Linked Observations)</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {getThemeObservations(selectedTheme).map((obs) => (
                    <div key={obs.id} className="p-3 bg-muted rounded-lg text-sm">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-medium">
                          {Array.isArray(obs.step)
                            ? obs.step[0]?.step_name
                            : (obs.step as ProcessStep)?.step_name || "Unknown Step"}
                        </span>
                        {obs.priority_score && (
                          <Badge variant="outline">Priority: {obs.priority_score}</Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground">{obs.notes || "No notes"}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {obs.waste_types?.map((wt) => (
                          <Badge key={wt.id} variant="secondary" className="text-xs">
                            {wt.code}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                  {getThemeObservations(selectedTheme).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No observations linked to this theme
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEvidenceModal(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (selectedTheme) {
                  handleUpdateStatus(selectedTheme.id, "confirmed");
                  setShowEvidenceModal(false);
                }
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Theme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Theme Modal */}
      <Dialog open={!!editingTheme} onOpenChange={() => setEditingTheme(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Theme</DialogTitle>
          </DialogHeader>

          {editingTheme && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input
                  value={editingTheme.name}
                  onChange={(e) =>
                    setEditingTheme({ ...editingTheme, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Summary</label>
                <Textarea
                  value={editingTheme.summary || ""}
                  onChange={(e) =>
                    setEditingTheme({ ...editingTheme, summary: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Root Cause Hypotheses (one per line)
                </label>
                <Textarea
                  value={editingTheme.root_cause_hypotheses?.join("\n") || ""}
                  onChange={(e) =>
                    setEditingTheme({
                      ...editingTheme,
                      root_cause_hypotheses: e.target.value.split("\n").filter(Boolean),
                    })
                  }
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTheme(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTheme}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

