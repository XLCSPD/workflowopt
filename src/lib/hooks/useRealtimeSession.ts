import { useEffect, useState, useCallback } from "react";
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

  // Subscribe to realtime changes
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
            onObservationInsert?.(payload.new as RealtimeObservation);
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
            onObservationUpdate?.(payload.new as RealtimeObservation);
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
            onObservationDelete?.(payload.old.id);
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
            onParticipantJoin?.(payload.new as RealtimeParticipant);
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
            onParticipantLeave?.(payload.old.id);
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
            onParticipantUpdate?.(payload.new as RealtimeParticipant);
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
  }, [
    sessionId,
    supabase,
    onObservationInsert,
    onObservationUpdate,
    onObservationDelete,
    onParticipantJoin,
    onParticipantLeave,
    onParticipantUpdate,
  ]);

  // Broadcast presence (to show who's online)
  const updatePresence = useCallback(async () => {
    if (!channel) return;
    
    try {
      // Update last_active_at in the database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("session_participants")
          .update({ last_active_at: new Date().toISOString() })
          .eq("session_id", sessionId)
          .eq("user_id", user.id);
      }
    } catch (error) {
      console.error("Failed to update presence:", error);
    }
  }, [channel, sessionId, supabase]);

  // Update presence periodically
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

