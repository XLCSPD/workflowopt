"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { useRealtimeStudio } from "@/lib/hooks/useRealtimeStudio";
import { StudioShell } from "@/components/future-state/StudioShell";
import { SynthesisHub } from "@/components/future-state/SynthesisHub";
import { SolutionBuilder } from "@/components/future-state/SolutionBuilder";
import { RoadmapBuilder } from "@/components/future-state/RoadmapBuilder";
import { FutureStateDesigner } from "@/components/future-state/FutureStateDesigner";
import { CompareView } from "@/components/future-state/CompareView";
import { ExportPanel } from "@/components/future-state/ExportPanel";
import { Skeleton } from "@/components/ui/skeleton";
import type { Session, Process, StudioStage, AgentRun } from "@/types";

interface SessionData {
  session: Session & { process?: Process };
  agentRuns: AgentRun[];
}

function StudioContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;
  const { user } = useAuthStore();
  const supabase = getSupabaseClient();

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRunningAgent, setIsRunningAgent] = useState(false);

  // Get current stage from URL or default to synthesis
  const currentStage = (searchParams.get("stage") as StudioStage) || "synthesis";

  // Realtime studio hook
  const realtimeStudio = useRealtimeStudio(
    sessionId,
    user?.id || "",
    user?.name || "Anonymous",
    user?.email || "",
    user?.avatar_url
  );

  // Fetch session data
  useEffect(() => {
    async function fetchSession() {
      if (!sessionId) return;

      try {
        const { data: session, error: sessionError } = await supabase
          .from("sessions")
          .select(`
            *,
            process:processes(*)
          `)
          .eq("id", sessionId)
          .single();

        if (sessionError) {
          console.error("Error fetching session:", sessionError);
          return;
        }

        const { data: agentRuns, error: runsError } = await supabase
          .from("agent_runs")
          .select("*")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false });

        if (runsError) {
          console.error("Error fetching agent runs:", runsError);
        }

        setSessionData({
          session: session as Session & { process?: Process },
          agentRuns: agentRuns || [],
        });
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, [sessionId, supabase]);

  // Update presence with current stage
  useEffect(() => {
    if (realtimeStudio.isConnected) {
      realtimeStudio.updatePresence({ currentStage });
    }
  }, [currentStage, realtimeStudio]);

  // Run agent handler
  const handleRunAgent = useCallback(async () => {
    if (!sessionId || !user) return;

    setIsRunningAgent(true);

    try {
      const agentEndpoint = currentStage === "designer" ? "design" : currentStage;
      const response = await fetch(`/api/future-state/${agentEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, forceRerun: false }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Agent error:", error);
      }

      // Refresh agent runs
      const { data: agentRuns } = await supabase
        .from("agent_runs")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false });

      setSessionData((prev) =>
        prev ? { ...prev, agentRuns: agentRuns || [] } : null
      );
    } catch (error) {
      console.error("Error running agent:", error);
    } finally {
      setIsRunningAgent(false);
    }
  }, [sessionId, currentStage, user, supabase]);

  // Determine if agent can be run for current stage
  const canRunAgent = ["synthesis", "solutions", "sequencing", "designer"].includes(currentStage);

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="shrink-0 border-b bg-white p-4">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-muted-foreground">Session not found</p>
      </div>
    );
  }

  const { session, agentRuns } = sessionData;

  // Render stage content
  const renderStageContent = () => {
    switch (currentStage) {
      case "synthesis":
        return <SynthesisHub sessionId={sessionId} />;
      case "solutions":
        return <SolutionBuilder sessionId={sessionId} />;
      case "sequencing":
        return <RoadmapBuilder sessionId={sessionId} />;
      case "designer":
        return (
          <FutureStateDesigner
            sessionId={sessionId}
            processId={session.process_id}
            userId={user?.id}
            realtimeStudio={realtimeStudio}
          />
        );
      case "compare":
        return <CompareView sessionId={sessionId} />;
      case "export":
        return <ExportPanel sessionId={sessionId} sessionName={session.name} />;
      default:
        return <SynthesisHub sessionId={sessionId} />;
    }
  };

  return (
    <StudioShell
      sessionId={sessionId}
      sessionName={session.name}
      processName={session.process?.name}
      currentStage={currentStage}
      presenceUsers={realtimeStudio.presenceUsers}
      agentRuns={agentRuns}
      isRunningAgent={isRunningAgent}
      onRunAgent={canRunAgent ? handleRunAgent : undefined}
      canRunAgent={canRunAgent}
    >
      {renderStageContent()}
    </StudioShell>
  );
}

export default function FutureStateStudioSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-[calc(100vh-4rem)]">
          <div className="shrink-0 border-b bg-white p-4">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex-1 p-6">
            <Skeleton className="h-full rounded-xl" />
          </div>
        </div>
      }
    >
      <StudioContent />
    </Suspense>
  );
}

