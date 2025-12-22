"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { ProcessMap } from "@/components/workflow/ProcessMap";
import { StepDetailPanel } from "@/components/workflow/StepDetailPanel";
import { WasteTaggingPanel } from "@/components/waste/WasteTaggingPanel";
import { ObservationEditPanel } from "@/components/waste/ObservationEditPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ArrowLeft,
  Users,
  Eye,
  Clock,
  AlertTriangle,
  StopCircle,
  BookOpen,
  Loader2,
  Wifi,
  WifiOff,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { getSessionWithDetails, endSession, joinSession } from "@/lib/services/sessions";
import { getWorkflowWithDetails } from "@/lib/services/workflows";
import { getWasteTypes } from "@/lib/services/wasteTypes";
import {
  getObservationsBySession,
  createObservation,
  updateObservation,
  deleteObservation,
  getStepObservationStats,
  getObservationById,
} from "@/lib/services/observations";
import { useRealtimeSession } from "@/lib/hooks/useRealtimeSession";
import type { ProcessStep, WasteType, Session } from "@/types";
import type { StepConnection } from "@/lib/services/workflows";
import type { ObservationWithDetails, CreateObservationInput } from "@/lib/services/observations";

interface SessionParticipantWithUser {
  id: string;
  session_id: string;
  user_id: string;
  joined_at: string;
  last_active_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar_url?: string;
  };
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const sessionId = params.id as string;

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingObservation, setIsSavingObservation] = useState(false);

  // Data state
  const [session, setSession] = useState<Session | null>(null);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [connections, setConnections] = useState<{ source: string; target: string }[]>([]);
  const [participants, setParticipants] = useState<SessionParticipantWithUser[]>([]);
  const [observations, setObservations] = useState<ObservationWithDetails[]>([]);
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [stepObsStats, setStepObsStats] = useState<Record<string, { count: number; priorityScore: number }>>({});

  // UI state
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isTaggingPanelOpen, setIsTaggingPanelOpen] = useState(false);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [isMobileActivityOpen, setIsMobileActivityOpen] = useState(false);
  const [editingObservation, setEditingObservation] = useState<ObservationWithDetails | null>(null);
  const [isUpdatingObservation, setIsUpdatingObservation] = useState(false);
  const [isDeletingObservation, setIsDeletingObservation] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  const selectedStep = steps.find((s) => s.id === selectedStepId) || null;

  // Realtime subscription handlers
  const handleObservationInsert = useCallback(async (newObs: { id: string; step_id: string; priority_score: number }) => {
    // Fetch the full observation with details
    try {
      const obsWithDetails = await getObservationById(newObs.id);
      setObservations(prev => [obsWithDetails, ...prev]);
      
      // Update step stats
      setStepObsStats(prev => ({
        ...prev,
        [newObs.step_id]: {
          count: (prev[newObs.step_id]?.count || 0) + 1,
          priorityScore: (prev[newObs.step_id]?.priorityScore || 0) + newObs.priority_score,
        },
      }));
    } catch (error) {
      console.error("Failed to fetch new observation:", error);
    }
  }, []);

  const handleParticipantJoin = useCallback(async () => {
    // Refresh participants list
    try {
      const { participants: newParticipants } = await getSessionWithDetails(sessionId);
      setParticipants(newParticipants as SessionParticipantWithUser[]);
    } catch (error) {
      console.error("Failed to refresh participants:", error);
    }
  }, [sessionId]);

  const handleParticipantUpdate = useCallback(async () => {
    // Refresh participants list for activity updates
    try {
      const { participants: newParticipants } = await getSessionWithDetails(sessionId);
      setParticipants(newParticipants as SessionParticipantWithUser[]);
    } catch (error) {
      console.error("Failed to refresh participants:", error);
    }
  }, [sessionId]);

  // Setup realtime subscription
  const { isConnected } = useRealtimeSession({
    sessionId,
    onObservationInsert: handleObservationInsert,
    onParticipantJoin: handleParticipantJoin,
    onParticipantUpdate: handleParticipantUpdate,
  });

  // Load session data
  useEffect(() => {
    const loadSessionData = async () => {
      try {
        setIsLoading(true);

        // Get current user
        const { getSupabaseClient } = await import("@/lib/supabase/client");
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }

        // Get session with participants
        const { session: sessionData, participants: participantsData } =
          await getSessionWithDetails(sessionId);

        setSession(sessionData);
        setParticipants(participantsData as SessionParticipantWithUser[]);

        // Get workflow details
        if (sessionData.process_id) {
          const { steps: workflowSteps, connections: workflowConnections } =
            await getWorkflowWithDetails(sessionData.process_id);

          setSteps(workflowSteps);
          setConnections(
            workflowConnections.map((c: StepConnection) => ({
              source: c.source_step_id,
              target: c.target_step_id,
            }))
          );
        }

        // Get waste types
        const wasteTypesData = await getWasteTypes();
        setWasteTypes(wasteTypesData);

        // Get observations
        const observationsData = await getObservationsBySession(sessionId);
        setObservations(observationsData);

        // Get step observation stats
        const stats = await getStepObservationStats(sessionId);
        setStepObsStats(stats);

        // Join session as participant
        await joinSession(sessionId);
      } catch (error) {
        console.error("Failed to load session:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load session data.",
        });
        router.push("/sessions");
      } finally {
        setIsLoading(false);
      }
    };

    loadSessionData();
  }, [sessionId, router, toast]);

  const handleStepClick = useCallback((stepId: string) => {
    setSelectedStepId(stepId);
    setIsDetailPanelOpen(true);
  }, []);

  const handleStartTagging = () => {
    setIsDetailPanelOpen(false);
    setIsTaggingPanelOpen(true);
  };

  const handleSubmitObservation = async (data: {
    notes?: string;
    isDigital: boolean;
    isPhysical: boolean;
    frequencyScore: number;
    impactScore: number;
    easeScore: number;
    wasteTypeIds: string[];
  }) => {
    if (!selectedStepId) return;

    try {
      setIsSavingObservation(true);

      const input: CreateObservationInput = {
        session_id: sessionId,
        step_id: selectedStepId,
        notes: data.notes,
        is_digital: data.isDigital,
        is_physical: data.isPhysical,
        frequency_score: data.frequencyScore,
        impact_score: data.impactScore,
        ease_score: data.easeScore,
        waste_type_ids: data.wasteTypeIds,
      };

      await createObservation(input);

      // Refresh observations
      const observationsData = await getObservationsBySession(sessionId);
      setObservations(observationsData);

      // Refresh stats
      const stats = await getStepObservationStats(sessionId);
      setStepObsStats(stats);

      toast({
        title: "Observation saved",
        description: "Your waste observation has been recorded.",
      });

    setIsTaggingPanelOpen(false);
    setSelectedStepId(null);
    } catch (error) {
      console.error("Failed to save observation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save observation. Please try again.",
      });
    } finally {
      setIsSavingObservation(false);
    }
  };

  const handleEndSession = async () => {
    try {
      await endSession(sessionId);
      toast({
        title: "Session ended",
        description: "The session has been completed.",
      });
      router.push(`/sessions/${sessionId}/results`);
    } catch (error) {
      console.error("Failed to end session:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to end session.",
      });
    }
  };

  const handleEditObservation = (observation: ObservationWithDetails) => {
    setEditingObservation(observation);
    setIsDetailPanelOpen(false);
    setIsEditPanelOpen(true);
  };

  const handleUpdateObservation = async (
    observationId: string,
    data: {
      notes?: string;
      isDigital: boolean;
      isPhysical: boolean;
      frequencyScore: number;
      impactScore: number;
      easeScore: number;
      wasteTypeIds: string[];
    }
  ) => {
    try {
      setIsUpdatingObservation(true);

      await updateObservation(observationId, {
        notes: data.notes,
        is_digital: data.isDigital,
        is_physical: data.isPhysical,
        frequency_score: data.frequencyScore,
        impact_score: data.impactScore,
        ease_score: data.easeScore,
        waste_type_ids: data.wasteTypeIds,
      });

      // Refresh observations
      const observationsData = await getObservationsBySession(sessionId);
      setObservations(observationsData);

      // Refresh stats
      const stats = await getStepObservationStats(sessionId);
      setStepObsStats(stats);

      toast({
        title: "Observation updated",
        description: "Your changes have been saved.",
      });

      setIsEditPanelOpen(false);
      setEditingObservation(null);
    } catch (error) {
      console.error("Failed to update observation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update observation. Please try again.",
      });
    } finally {
      setIsUpdatingObservation(false);
    }
  };

  const handleDeleteObservation = async (observationId: string) => {
    try {
      setIsDeletingObservation(true);

      await deleteObservation(observationId);

      // Refresh observations
      const observationsData = await getObservationsBySession(sessionId);
      setObservations(observationsData);

      // Refresh stats
      const stats = await getStepObservationStats(sessionId);
      setStepObsStats(stats);

      toast({
        title: "Observation deleted",
        description: "The observation has been removed.",
      });

      setIsEditPanelOpen(false);
      setEditingObservation(null);
    } catch (error) {
      console.error("Failed to delete observation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete observation. Please try again.",
      });
    } finally {
      setIsDeletingObservation(false);
    }
  };

  // Check if participant is active (active within last 5 minutes)
  const isParticipantActive = (lastActiveAt: string) => {
    const lastActive = new Date(lastActiveAt);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastActive > fiveMinutesAgo;
  };

  // Get recent activity from observations
  const recentActivity = observations.slice(0, 5).map((obs) => ({
    id: obs.id,
    user: obs.user?.name || "Unknown",
    step: steps.find((s) => s.id === obs.step_id)?.step_name || "Unknown Step",
    waste: obs.waste_types?.[0]?.name || "Unknown",
    time: formatDistanceToNow(new Date(obs.created_at), { addSuffix: true }),
  }));

  const totalObservations = observations.length;
  const activeParticipants = participants.filter((p) =>
    isParticipantActive(p.last_active_at)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground mb-4">Session not found</p>
        <Button asChild>
          <Link href="/sessions">Back to Sessions</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Header
          title={session.name}
          description="Active waste walk session"
          actions={
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/training/cheat-sheet">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Cheat Sheet
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/sessions">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
              {session.status === "active" && (
                <Button variant="destructive" size="sm" onClick={handleEndSession}>
                <StopCircle className="mr-2 h-4 w-4" />
                End Session
              </Button>
              )}
            </div>
          }
        />

        {/* Stats Bar */}
        <div className="px-4 sm:px-6 py-3 border-b bg-muted/30 flex flex-wrap items-center gap-2 sm:gap-4">
          <Badge
            className={
              session.status === "active"
                ? "bg-brand-emerald text-white"
                : "bg-muted"
            }
          >
            {session.status === "active" && (
              <span className="animate-pulse mr-1">●</span>
            )}
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          </Badge>
          <Badge
            variant="outline"
            className={isConnected ? "border-green-500 text-green-600" : "border-gray-400 text-gray-500"}
          >
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                Live
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                Connecting...
              </>
            )}
          </Badge>
          {session.started_at && (
          <span className="text-xs sm:text-sm text-muted-foreground hidden sm:flex items-center gap-1">
            <Clock className="h-4 w-4" />
              Started {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
          </span>
          )}
          <Badge variant="outline">
            <Users className="h-3 w-3 mr-1" />
            {activeParticipants.length} active
          </Badge>
          <Badge
            variant="outline"
            className="border-orange-300 text-orange-700 bg-orange-50"
          >
            <Eye className="h-3 w-3 mr-1" />
            {totalObservations} observations
          </Badge>
          {/* Mobile Activity Panel Toggle */}
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden ml-auto"
            onClick={() => setIsMobileActivityOpen(true)}
          >
            <Activity className="h-4 w-4 mr-1" />
            Activity
          </Button>
        </div>

        {/* Process Map */}
        <div className="flex-1">
          {steps.length > 0 ? (
          <ProcessMap
              workflowId={`session-${session.id}`}
              steps={steps}
              connections={connections}
              observations={stepObsStats}
            selectedStepId={selectedStepId}
            onStepClick={handleStepClick}
            showHeatmap={showHeatmap}
            onToggleHeatmap={setShowHeatmap}
          />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No process steps found for this session.
            </div>
          )}
        </div>
      </div>

      {/* Side Panel - Desktop */}
      <div className="hidden lg:flex w-80 border-l bg-white flex-col">
        {/* Participants */}
        <div className="p-4 border-b">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Participants ({participants.length})
          </h3>
          <div className="space-y-2">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50"
              >
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-brand-gold/20 text-brand-navy text-xs">
                      {participant.user?.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  {isParticipantActive(participant.last_active_at) && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-brand-emerald rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {participant.user?.name || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {participant.user?.role || "participant"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Recent Activity
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="p-3 rounded-lg bg-muted/50 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{activity.user}</span>
                    <span className="text-xs text-muted-foreground">
                      {activity.time}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                      Tagged{" "}
                      <span className="text-orange-600">{activity.waste}</span> on{" "}
                      <span className="font-medium">{activity.step}</span>
                  </p>
                </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No activity yet. Click on a step to start tagging waste.
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Side Panel - Mobile Sheet */}
      <Sheet open={isMobileActivityOpen} onOpenChange={setIsMobileActivityOpen}>
        <SheetContent side="bottom" className="h-[70vh] lg:hidden">
          <SheetHeader>
            <SheetTitle>Session Activity</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-full mt-4">
            {/* Participants */}
            <div className="pb-4 border-b">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participants ({participants.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <div className="relative">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-brand-gold/20 text-brand-navy text-xs">
                          {participant.user?.name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      {isParticipantActive(participant.last_active_at) && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-brand-emerald rounded-full border border-white" />
                      )}
                    </div>
                    <span className="text-sm">{participant.user?.name || "Unknown"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="flex-1 overflow-hidden flex flex-col pt-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Recent Activity
              </h3>
              <ScrollArea className="flex-1">
                <div className="space-y-3 pr-4">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="p-3 rounded-lg bg-muted/50 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{activity.user}</span>
                        <span className="text-xs text-muted-foreground">
                          {activity.time}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                          Tagged{" "}
                          <span className="text-orange-600">{activity.waste}</span> on{" "}
                          <span className="font-medium">{activity.step}</span>
                      </p>
                    </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No activity yet. Click on a step to start tagging waste.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Step Detail Panel */}
      <StepDetailPanel
        step={selectedStep}
        observations={observations.filter((o) => o.step_id === selectedStepId).map(o => ({ ...o, waste_types: o.waste_types || [] }))}
        isOpen={isDetailPanelOpen}
        onClose={() => {
          setIsDetailPanelOpen(false);
          setSelectedStepId(null);
        }}
        onStartTagging={handleStartTagging}
        onEditObservation={session.status === "active" ? handleEditObservation : undefined}
        sessionActive={session.status === "active"}
      />

      {/* Waste Tagging Panel */}
      <WasteTaggingPanel
        step={selectedStep}
        wasteTypes={wasteTypes}
        isOpen={isTaggingPanelOpen}
        onClose={() => {
          setIsTaggingPanelOpen(false);
          setSelectedStepId(null);
        }}
        onSubmit={handleSubmitObservation}
        isSubmitting={isSavingObservation}
      />

      {/* Observation Edit Panel */}
      <ObservationEditPanel
        observation={editingObservation}
        wasteTypes={wasteTypes}
        isOpen={isEditPanelOpen}
        onClose={() => {
          setIsEditPanelOpen(false);
          setEditingObservation(null);
        }}
        onSave={handleUpdateObservation}
        onDelete={handleDeleteObservation}
        isSaving={isUpdatingObservation}
        isDeleting={isDeletingObservation}
        currentUserId={currentUserId}
      />
    </div>
  );
}
