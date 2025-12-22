"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RealtimeChannel, RealtimePresenceState } from "@supabase/supabase-js";
import type {
  InsightTheme,
  SolutionCard,
  ImplementationWave,
  FutureStateNode,
  FutureStateEdge,
  AgentRun,
  StudioLock,
  StepDesignVersion,
  StepDesignOption,
  StepContext,
  DesignAssumption,
} from "@/types";

// ============================================
// TYPES
// ============================================

export interface PresenceUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  currentStage?: string;
  editingEntity?: {
    type: string;
    id: string;
  };
  cursor?: {
    x: number;
    y: number;
  };
  stepDesignActivity?: {
    nodeId: string;
    action: string;
    timestamp: number;
  };
}

export interface StudioRealtimeState {
  themes: InsightTheme[];
  solutions: SolutionCard[];
  waves: ImplementationWave[];
  futureStateNodes: FutureStateNode[];
  futureStateEdges: FutureStateEdge[];
  agentRuns: AgentRun[];
  locks: StudioLock[];
  presenceUsers: PresenceUser[];
  isConnected: boolean;
  // Step Design state
  stepDesignVersions: StepDesignVersion[];
  stepDesignOptions: StepDesignOption[];
  stepContext: StepContext[];
  designAssumptions: DesignAssumption[];
}

export type StudioTableEvent = {
  table: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  payload: unknown;
};

// ============================================
// HOOK
// ============================================

export function useRealtimeStudio(
  sessionId: string,
  userId: string,
  userName: string,
  userEmail: string,
  userAvatarUrl?: string
) {
  const [state, setState] = useState<StudioRealtimeState>({
    themes: [],
    solutions: [],
    waves: [],
    futureStateNodes: [],
    futureStateEdges: [],
    agentRuns: [],
    locks: [],
    presenceUsers: [],
    isConnected: false,
    // Step Design state
    stepDesignVersions: [],
    stepDesignOptions: [],
    stepContext: [],
    designAssumptions: [],
  });

  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const supabase = getSupabaseClient();

  // Update presence
  const updatePresence = useCallback(
    (updates: Partial<Omit<PresenceUser, "id" | "name" | "email" | "avatar_url">>) => {
      if (channel) {
        channel.track({
          id: userId,
          name: userName,
          email: userEmail,
          avatar_url: userAvatarUrl,
          ...updates,
        });
      }
    },
    [channel, userId, userName, userEmail, userAvatarUrl]
  );

  // Broadcast cursor position (for designer)
  const broadcastCursor = useCallback(
    (x: number, y: number) => {
      if (channel) {
        channel.send({
          type: "broadcast",
          event: "cursor",
          payload: { userId, x, y },
        });
      }
    },
    [channel, userId]
  );

  // Broadcast editing status
  const broadcastEditing = useCallback(
    (entityType: string, entityId: string | null) => {
      if (channel) {
        channel.send({
          type: "broadcast",
          event: "editing",
          payload: { userId, entityType, entityId },
        });
      }
    },
    [channel, userId]
  );

  // Broadcast step design activity (for step design collaboration)
  const broadcastStepDesignActivity = useCallback(
    (nodeId: string, action: "viewing" | "designing" | "selecting_option" | "editing_field") => {
      if (channel) {
        channel.send({
          type: "broadcast",
          event: "step_design_activity",
          payload: { userId, userName, nodeId, action, timestamp: Date.now() },
        });
      }
    },
    [channel, userId, userName]
  );

  useEffect(() => {
    if (!sessionId || !userId) return;

    const channelName = `studio:${sessionId}`;
    const newChannel = supabase.channel(channelName, {
      config: {
        presence: { key: userId },
      },
    });

    // Subscribe to presence
    newChannel.on("presence", { event: "sync" }, () => {
      const presenceState = newChannel.presenceState() as RealtimePresenceState<PresenceUser>;
      const users: PresenceUser[] = [];
      for (const key in presenceState) {
        const presences = presenceState[key];
        if (presences && presences.length > 0) {
          users.push(presences[0] as PresenceUser);
        }
      }
      setState((prev) => ({ ...prev, presenceUsers: users }));
    });

    // Subscribe to broadcast events
    newChannel.on("broadcast", { event: "cursor" }, ({ payload }: { payload: { userId: string; x: number; y: number } }) => {
      setState((prev) => ({
        ...prev,
        presenceUsers: prev.presenceUsers.map((u) =>
          u.id === payload.userId ? { ...u, cursor: { x: payload.x, y: payload.y } } : u
        ),
      }));
    });

    newChannel.on("broadcast", { event: "editing" }, ({ payload }: { payload: { userId: string; entityType: string; entityId: string } }) => {
      setState((prev) => ({
        ...prev,
        presenceUsers: prev.presenceUsers.map((u) =>
          u.id === payload.userId
            ? {
                ...u,
                editingEntity: payload.entityId
                  ? { type: payload.entityType, id: payload.entityId }
                  : undefined,
              }
            : u
        ),
      }));
    });

    // Subscribe to step design activity broadcasts
    newChannel.on("broadcast", { event: "step_design_activity" }, ({ payload }: { payload: { userId: string; userName: string; nodeId: string; action: string; timestamp: number } }) => {
      setState((prev) => ({
        ...prev,
        presenceUsers: prev.presenceUsers.map((u) =>
          u.id === payload.userId
            ? {
                ...u,
                stepDesignActivity: {
                  nodeId: payload.nodeId,
                  action: payload.action,
                  timestamp: payload.timestamp,
                },
              }
            : u
        ),
      }));
    });

    // Subscribe to postgres changes for studio tables
    const tables = [
      { table: "insight_themes", stateKey: "themes" },
      { table: "solution_cards", stateKey: "solutions" },
      { table: "implementation_waves", stateKey: "waves" },
      { table: "future_state_nodes", stateKey: "futureStateNodes" },
      { table: "future_state_edges", stateKey: "futureStateEdges" },
      { table: "agent_runs", stateKey: "agentRuns" },
      { table: "studio_locks", stateKey: "locks" },
      // Step Design tables
      { table: "step_design_versions", stateKey: "stepDesignVersions" },
      { table: "step_design_options", stateKey: "stepDesignOptions" },
      { table: "step_context", stateKey: "stepContext" },
      { table: "design_assumptions", stateKey: "designAssumptions" },
    ] as const;

    for (const { table, stateKey } of tables) {
      newChannel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: { eventType: string; new: { id: string }; old: { id: string } }) => {
          setState((prev) => {
            const current = prev[stateKey] as unknown[];
            let updated: unknown[];

            if (payload.eventType === "INSERT") {
              updated = [...current, payload.new];
            } else if (payload.eventType === "UPDATE") {
              const newRecord = payload.new as { id: string };
              updated = current.map((item) =>
                (item as { id: string }).id === newRecord.id ? payload.new : item
              );
            } else if (payload.eventType === "DELETE") {
              const oldRecord = payload.old as { id: string };
              updated = current.filter((item) => (item as { id: string }).id !== oldRecord.id);
            } else {
              updated = current;
            }

            return { ...prev, [stateKey]: updated };
          });
        }
      );
    }

    // Subscribe
    newChannel.subscribe(async (status: string) => {
      if (status === "SUBSCRIBED") {
        setState((prev) => ({ ...prev, isConnected: true }));
        // Track presence
        await newChannel.track({
          id: userId,
          name: userName,
          email: userEmail,
          avatar_url: userAvatarUrl,
        });
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        setState((prev) => ({ ...prev, isConnected: false }));
      }
    });

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
      setChannel(null);
    };
  }, [sessionId, userId, userName, userEmail, userAvatarUrl, supabase]);

  // Acquire lock
  const acquireLock = useCallback(
    async (entityType: string, entityId: string, durationMs = 60000): Promise<boolean> => {
      const expiresAt = new Date(Date.now() + durationMs).toISOString();
      
      const { error } = await supabase.from("studio_locks").upsert(
        {
          session_id: sessionId,
          entity_type: entityType,
          entity_id: entityId,
          locked_by: userId,
          locked_at: new Date().toISOString(),
          expires_at: expiresAt,
        },
        {
          onConflict: "session_id,entity_type,entity_id",
        }
      );

      return !error;
    },
    [supabase, sessionId, userId]
  );

  // Release lock
  const releaseLock = useCallback(
    async (entityType: string, entityId: string): Promise<void> => {
      await supabase
        .from("studio_locks")
        .delete()
        .eq("session_id", sessionId)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("locked_by", userId);
    },
    [supabase, sessionId, userId]
  );

  // Check if entity is locked by another user
  const isLockedByOther = useCallback(
    (entityType: string, entityId: string): PresenceUser | null => {
      const lock = state.locks.find(
        (l) =>
          l.entity_type === entityType &&
          l.entity_id === entityId &&
          l.locked_by !== userId &&
          new Date(l.expires_at) > new Date()
      );
      if (!lock) return null;
      return state.presenceUsers.find((u) => u.id === lock.locked_by) || null;
    },
    [state.locks, state.presenceUsers, userId]
  );

  // Get users currently designing a specific node
  const getUsersDesigningNode = useCallback(
    (nodeId: string): PresenceUser[] => {
      const now = Date.now();
      const recentThreshold = 30000; // 30 seconds
      return state.presenceUsers.filter(
        (u) =>
          u.id !== userId &&
          u.stepDesignActivity?.nodeId === nodeId &&
          now - (u.stepDesignActivity?.timestamp || 0) < recentThreshold
      );
    },
    [state.presenceUsers, userId]
  );

  return {
    ...state,
    updatePresence,
    broadcastCursor,
    broadcastEditing,
    broadcastStepDesignActivity,
    acquireLock,
    releaseLock,
    isLockedByOther,
    getUsersDesigningNode,
  };
}

