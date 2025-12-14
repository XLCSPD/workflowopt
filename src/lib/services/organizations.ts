import { getSupabaseClient } from "@/lib/supabase/client";
import type { Organization } from "@/types";

const supabase = getSupabaseClient();

// ============================================
// ORGANIZATION QUERIES
// ============================================

export async function getCurrentOrganization(): Promise<Organization | null> {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;

  // Get user's org_id
  const { data: userProfile, error: userError } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", authUser.id)
    .single();

  if (userError || !userProfile?.org_id) return null;

  // Get the organization
  const { data: org, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", userProfile.org_id)
    .single();

  if (error) return null;
  return org;
}

export async function getOrganizationById(orgId: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (error) return null;
  return data;
}

// ============================================
// ORGANIZATION MUTATIONS
// ============================================

export interface CreateOrganizationInput {
  name: string;
}

export async function createOrganization(input: CreateOrganizationInput): Promise<Organization> {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) throw new Error("Not authenticated");

  // Create the organization
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: input.name })
    .select()
    .single();

  if (orgError) throw orgError;

  // Update the current user to be part of this org as admin
  const { error: userError } = await supabase
    .from("users")
    .update({ 
      org_id: org.id,
      role: "admin" // Creator becomes admin
    })
    .eq("id", authUser.id);

  if (userError) {
    // Rollback org creation
    await supabase.from("organizations").delete().eq("id", org.id);
    throw userError;
  }

  return org;
}

export async function updateOrganization(
  orgId: string, 
  updates: Partial<Pick<Organization, "name">>
): Promise<Organization> {
  const { data, error } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", orgId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// ORGANIZATION STATS
// ============================================

export interface OrganizationStats {
  userCount: number;
  workflowCount: number;
  sessionCount: number;
  observationCount: number;
}

export async function getOrganizationStats(orgId: string): Promise<OrganizationStats> {
  // Get user count
  const { count: userCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId);

  // Get workflow count
  const { count: workflowCount } = await supabase
    .from("processes")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId);

  // Get session count (through processes)
  const { data: processes } = await supabase
    .from("processes")
    .select("id")
    .eq("org_id", orgId);

  let sessionCount = 0;
  let observationCount = 0;

  if (processes && processes.length > 0) {
    const processIds = processes.map((p: { id: string }) => p.id);

    const { count: sessions } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .in("process_id", processIds);

    sessionCount = sessions || 0;

    // Get observation count
    const { data: sessionData } = await supabase
      .from("sessions")
      .select("id")
      .in("process_id", processIds);

    if (sessionData && sessionData.length > 0) {
      const sessionIds = sessionData.map((s: { id: string }) => s.id);
      const { count: observations } = await supabase
        .from("observations")
        .select("*", { count: "exact", head: true })
        .in("session_id", sessionIds);

      observationCount = observations || 0;
    }
  }

  return {
    userCount: userCount || 0,
    workflowCount: workflowCount || 0,
    sessionCount,
    observationCount,
  };
}

