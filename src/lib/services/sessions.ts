import { getSupabaseClient } from "@/lib/supabase/client";
import type { Session, SessionParticipant, SessionStatus } from "@/types";

const supabase = getSupabaseClient();

export interface SessionWithDetails extends Session {
  process?: {
    id: string;
    name: string;
    description?: string;
  };
  facilitator?: {
    id: string;
    name: string;
    email: string;
  };
  participant_count?: number;
  observation_count?: number;
}

// ============================================
// SESSIONS
// ============================================

export async function getSessions(status?: SessionStatus) {
  let query = supabase
    .from("sessions")
    .select(`
      *,
      process:processes(id, name, description),
      facilitator:users!sessions_facilitator_id_fkey(id, name, email)
    `)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Get participant and observation counts for each session
  interface SessionData {
    id: string;
    name: string;
    process_id: string;
    facilitator_id: string;
    status: string;
    started_at?: string;
    ended_at?: string;
    created_at: string;
    updated_at: string;
    process?: { id: string; name: string; description?: string };
    facilitator?: { id: string; name: string; email: string };
  }

  const sessionsWithCounts = await Promise.all(
    (data || []).map(async (session: SessionData) => {
      const [participantResult, observationResult] = await Promise.all([
        supabase
          .from("session_participants")
          .select("id", { count: "exact" })
          .eq("session_id", session.id),
        supabase
          .from("observations")
          .select("id", { count: "exact" })
          .eq("session_id", session.id),
      ]);

      return {
        ...session,
        participant_count: participantResult.count || 0,
        observation_count: observationResult.count || 0,
      };
    })
  );

  return sessionsWithCounts as SessionWithDetails[];
}

export async function getSessionById(id: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select(`
      *,
      process:processes(id, name, description),
      facilitator:users!sessions_facilitator_id_fkey(id, name, email)
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as SessionWithDetails;
}

export async function createSession(session: {
  name: string;
  process_id: string;
  status?: SessionStatus;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      ...session,
      facilitator_id: user?.id,
      status: session.status || "draft",
    })
    .select()
    .single();

  if (error) throw error;
  return data as Session;
}

export async function updateSession(id: string, updates: Partial<Session>) {
  const { data, error } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Session;
}

export async function startSession(id: string) {
  return updateSession(id, {
    status: "active",
    started_at: new Date().toISOString(),
  });
}

export async function endSession(id: string) {
  return updateSession(id, {
    status: "completed",
    ended_at: new Date().toISOString(),
  });
}

export async function archiveSession(id: string) {
  return updateSession(id, { status: "archived" });
}

export async function deleteSession(id: string) {
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ============================================
// SESSION PARTICIPANTS
// ============================================

export async function getSessionParticipants(sessionId: string) {
  const { data, error } = await supabase
    .from("session_participants")
    .select(`
      *,
      user:users(id, name, email, role, avatar_url)
    `)
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function joinSession(sessionId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Use upsert to handle both new participants and existing ones
  const { data, error } = await supabase
    .from("session_participants")
    .upsert(
      {
        session_id: sessionId,
        user_id: user.id,
        last_active_at: new Date().toISOString(),
      },
      {
        onConflict: "session_id,user_id",
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data as SessionParticipant;
}

export async function updateParticipantActivity(sessionId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("session_participants")
    .update({ last_active_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .eq("user_id", user.id);
}

export async function leaveSession(sessionId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("session_participants")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (error) throw error;
}

// ============================================
// SESSION WITH ALL DATA
// ============================================

export async function getSessionWithDetails(sessionId: string) {
  const [session, participants] = await Promise.all([
    getSessionById(sessionId),
    getSessionParticipants(sessionId),
  ]);

  return {
    session,
    participants,
  };
}

