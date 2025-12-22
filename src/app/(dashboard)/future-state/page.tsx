"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Layers,
  Lightbulb,
  GitBranch,
  Layout,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { Session, Process } from "@/types";

interface SessionWithProgress extends Session {
  process?: Process;
  observationCount: number;
  themeCount: number;
  solutionCount: number;
  waveCount: number;
  futureStateCount: number;
}

const stageConfig = [
  { key: "observations", label: "Waste Walk", icon: CheckCircle2, color: "text-emerald-500" },
  { key: "synthesis", label: "Synthesis", icon: Layers, color: "text-blue-500" },
  { key: "solutions", label: "Solutions", icon: Lightbulb, color: "text-amber-500" },
  { key: "sequencing", label: "Sequencing", icon: GitBranch, color: "text-purple-500" },
  { key: "designer", label: "Future States", icon: Layout, color: "text-rose-500" },
];

export default function FutureStateStudioPage() {
  const [sessions, setSessions] = useState<SessionWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const supabase = getSupabaseClient();

  useEffect(() => {
    async function fetchSessions() {
      if (!user) return;

      try {
        // Fetch sessions with related data
        const { data: sessionsData, error: sessionsError } = await supabase
          .from("sessions")
          .select(`
            *,
            process:processes(id, name, description)
          `)
          .in("status", ["active", "completed"])
          .order("updated_at", { ascending: false });

        if (sessionsError) {
          console.error("Error fetching sessions:", sessionsError);
          return;
        }

        // Fetch counts for each session
        const sessionsWithProgress: SessionWithProgress[] = await Promise.all(
          (sessionsData || []).map(async (session: Session & { process?: Process }) => {
            const [observations, themes, solutions, waves, futureStates] = await Promise.all([
              supabase
                .from("observations")
                .select("id", { count: "exact", head: true })
                .eq("session_id", session.id),
              supabase
                .from("insight_themes")
                .select("id", { count: "exact", head: true })
                .eq("session_id", session.id),
              supabase
                .from("solution_cards")
                .select("id", { count: "exact", head: true })
                .eq("session_id", session.id),
              supabase
                .from("implementation_waves")
                .select("id", { count: "exact", head: true })
                .eq("session_id", session.id),
              supabase
                .from("future_states")
                .select("id", { count: "exact", head: true })
                .eq("session_id", session.id),
            ]);

            return {
              ...session,
              process: session.process as Process | undefined,
              observationCount: observations.count || 0,
              themeCount: themes.count || 0,
              solutionCount: solutions.count || 0,
              waveCount: waves.count || 0,
              futureStateCount: futureStates.count || 0,
            };
          })
        );

        setSessions(sessionsWithProgress);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, [user, supabase]);

  const getStageProgress = (session: SessionWithProgress) => {
    return {
      observations: session.observationCount > 0,
      synthesis: session.themeCount > 0,
      solutions: session.solutionCount > 0,
      sequencing: session.waveCount > 0,
      designer: session.futureStateCount > 0,
    };
  };

  const getCurrentStage = (session: SessionWithProgress): string => {
    const progress = getStageProgress(session);
    if (!progress.observations) return "observations";
    if (!progress.synthesis) return "synthesis";
    if (!progress.solutions) return "solutions";
    if (!progress.sequencing) return "sequencing";
    if (!progress.designer) return "designer";
    return "complete";
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <Skeleton className="h-10 w-72 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-brand-gold/20 to-brand-gold/5">
            <Sparkles className="h-8 w-8 text-brand-gold" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-brand-navy">Future State Studio</h1>
            <p className="text-muted-foreground">
              Transform waste observations into actionable future state designs
            </p>
          </div>
        </div>
      </motion.div>

      {/* Sessions Grid */}
      {sessions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No sessions ready for Future State Studio
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Complete a waste walk session first to unlock Future State Studio
              </p>
              <Link href="/sessions">
                <Button>
                  Go to Sessions
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session, index) => {
            const progress = getStageProgress(session);
            const currentStage = getCurrentStage(session);
            const completedStages = Object.values(progress).filter(Boolean).length;

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
              >
                <Link href={`/future-state/${session.id}`}>
                  <Card className="group h-full hover:shadow-lg transition-all duration-300 hover:border-brand-gold/50 cursor-pointer overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <CardHeader className="relative">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg group-hover:text-brand-navy transition-colors line-clamp-1">
                            {session.name}
                          </CardTitle>
                          <CardDescription className="line-clamp-1">
                            {session.process?.name || "No workflow"}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={currentStage === "complete" ? "default" : "secondary"}
                          className={cn(
                            currentStage === "complete" &&
                              "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                          )}
                        >
                          {currentStage === "complete"
                            ? "Complete"
                            : `${completedStages}/${stageConfig.length}`}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="relative space-y-4">
                      {/* Progress Steps */}
                      <div className="flex items-center justify-between gap-1">
                        {stageConfig.map((stage, i) => {
                          const isComplete = progress[stage.key as keyof typeof progress];
                          const isCurrent = stage.key === currentStage;
                          const Icon = isComplete ? CheckCircle2 : stage.icon;

                          return (
                            <div
                              key={stage.key}
                              className="flex flex-col items-center flex-1"
                            >
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                  isComplete
                                    ? "bg-emerald-100"
                                    : isCurrent
                                    ? "bg-brand-gold/20 ring-2 ring-brand-gold/50"
                                    : "bg-muted"
                                )}
                              >
                                <Icon
                                  className={cn(
                                    "h-4 w-4",
                                    isComplete
                                      ? "text-emerald-600"
                                      : isCurrent
                                      ? "text-brand-gold"
                                      : "text-muted-foreground"
                                  )}
                                />
                              </div>
                              {i < stageConfig.length - 1 && (
                                <div
                                  className={cn(
                                    "h-0.5 w-full mt-4 -mb-4",
                                    isComplete ? "bg-emerald-300" : "bg-muted"
                                  )}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Stage Labels */}
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        {stageConfig.map((stage) => (
                          <span key={stage.key} className="flex-1 text-center truncate px-0.5">
                            {stage.label}
                          </span>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-4 gap-2 pt-2 border-t">
                        <div className="text-center">
                          <p className="text-lg font-semibold text-brand-navy">
                            {session.observationCount}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Observations</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-brand-navy">
                            {session.themeCount}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Themes</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-brand-navy">
                            {session.solutionCount}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Solutions</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-brand-navy">
                            {session.futureStateCount}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Future States</p>
                        </div>
                      </div>

                      {/* Updated time */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2">
                        <Clock className="h-3 w-3" />
                        <span>
                          Updated{" "}
                          {new Date(session.updated_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

