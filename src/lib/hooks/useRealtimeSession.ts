import { useEffect, useState, useCallback, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface RealtimeObservation {
  id: string;
  session_id: string;
  step_id: string;
  user_id: string;
  notes?: string;
  is_digital: boolean;
  is_physical: boolean;
  frequency_score: number;
  impact_score: number;
  ease_score: number;
  priority_score: number;
  created_at: string;
}

interface RealtimeParticipant {
  id: string;
  session_id: string;
  user_id: string;
  joined_at: string;
  last_active_at: string;
}

interface UseRealtimeSessionOptions {
  sessionId: string;
  onObservationInsert?: (observation: RealtimeObservation) => void;
  onObservationUpdate?: (observation: RealtimeObservation) => void;
  onObservationDelete?: (observationId: string) => void;
  onParticipantJoin?: (participant: RealtimeParticipant) => void;
  onParticipantLeave?: (participantId: string) => void;
  onParticipantUpdate?: (participant: RealtimeParticipant) => void;
}

export function useRealtimeSession({
  sessionId,
  onObservationInsert,
  onObservationUpdate,
  onObservationDelete,
  onParticipantJoin,
  onParticipantLeave,
  onParticipantUpdate,
}: UseRealtimeSessionOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const supabase = getSupabaseClient();

  // Use refs for callbacks to avoid re-subscribing when callbacks change
  const onObservationInsertRef = useRef(onObservationInsert);
  onObservationInsertRef.current = onObservationInsert;

  const onObservationUpdateRef = useRef(onObservationUpdate);
  onObservationUpdateRef.current = onObservationUpdate;

  const onObservationDeleteRef = useRef(onObservationDelete);
  onObservationDeleteRef.current = onObservationDelete;

  const onParticipantJoinRef = useRef(onParticipantJoin);
  onParticipantJoinRef.current = onParticipantJoin;

  const onParticipantLeaveRef = useRef(onParticipantLeave);
  onParticipantLeaveRef.current = onParticipantLeave;

  const onParticipantUpdateRef = useRef(onParticipantUpdate);
  onParticipantUpdateRef.current = onParticipantUpdate;

  // Ref for sessionId to use in presence update
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  // Subscribe to realtime changes - only depends on sessionId, not callbacks
  useEffect(() => {
    if (!sessionId) return;

    const observationsChannel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "observations",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: RealtimePostgresChangesPayload<RealtimeObservation>) => {
          if (payload.new && 'id' in payload.new) {
            onObservationInsertRef.current?.(payload.new as RealtimeObservation);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "observations",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: RealtimePostgresChangesPayload<RealtimeObservation>) => {
          if (payload.new && 'id' in payload.new) {
            onObservationUpdateRef.current?.(payload.new as RealtimeObservation);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "observations",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: RealtimePostgresChangesPayload<RealtimeObservation>) => {
          if (payload.old && 'id' in payload.old && payload.old.id) {
            onObservationDeleteRef.current?.(payload.old.id);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "session_participants",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: RealtimePostgresChangesPayload<RealtimeParticipant>) => {
          if (payload.new && 'id' in payload.new) {
            onParticipantJoinRef.current?.(payload.new as RealtimeParticipant);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "session_participants",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: RealtimePostgresChangesPayload<RealtimeParticipant>) => {
          if (payload.old && 'id' in payload.old && payload.old.id) {
            onParticipantLeaveRef.current?.(payload.old.id);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "session_participants",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: RealtimePostgresChangesPayload<RealtimeParticipant>) => {
          if (payload.new && 'id' in payload.new) {
            onParticipantUpdateRef.current?.(payload.new as RealtimeParticipant);
          }
        }
      )
      .subscribe((status: string) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    setChannel(observationsChannel);

    return () => {
      observationsChannel.unsubscribe();
    };
  }, [sessionId, supabase]);

  // Broadcast presence (to show who's online) - stable callback using refs
  const updatePresence = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && sessionIdRef.current) {
        await supabase
          .from("session_participants")
          .update({ last_active_at: new Date().toISOString() })
          .eq("session_id", sessionIdRef.current)
          .eq("user_id", user.id);
      }
    } catch (error) {
      console.error("Failed to update presence:", error);
    }
  }, [supabase]);

  // Update presence periodically - only run once when connected
  useEffect(() => {
    if (!isConnected) return;

    // Update immediately
    updatePresence();

    // Then update every 30 seconds
    const interval = setInterval(updatePresence, 30000);

    return () => clearInterval(interval);
  }, [isConnected, updatePresence]);

  return {
    isConnected,
    updatePresence,
  };
}

