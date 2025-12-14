import { getSupabaseClient } from "@/lib/supabase/client";
import type { Observation, WasteType } from "@/types";

const supabase = getSupabaseClient();

export interface ObservationWithDetails extends Observation {
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  waste_types?: WasteType[];
}

export interface CreateObservationInput {
  session_id: string;
  step_id: string;
  notes?: string;
  is_digital: boolean;
  is_physical: boolean;
  frequency_score: number;
  impact_score: number;
  ease_score: number;
  waste_type_ids: string[];
  attachments?: string[];
}

// ============================================
// OBSERVATIONS
// ============================================

export async function getObservationsBySession(sessionId: string) {
  const { data, error } = await supabase
    .from("observations")
    .select(`
      *,
      user:users(id, name, email, avatar_url)
    `)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Get waste types for each observation
  interface ObservationData {
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
    updated_at: string;
    user?: { id: string; name: string; email: string; avatar_url?: string };
  }

  const observationsWithWasteTypes = await Promise.all(
    (data || []).map(async (obs: ObservationData) => {
      const { data: links } = await supabase
        .from("observation_waste_links")
        .select("waste_type_id")
        .eq("observation_id", obs.id);

      if (links && links.length > 0) {
        const wasteTypeIds = links.map((l: { waste_type_id: string }) => l.waste_type_id);
        const { data: wasteTypes } = await supabase
          .from("waste_types")
          .select("*")
          .in("id", wasteTypeIds);

        return { ...obs, waste_types: wasteTypes || [] };
      }

      return { ...obs, waste_types: [] };
    })
  );

  return observationsWithWasteTypes as ObservationWithDetails[];
}

export async function getObservationsByStep(sessionId: string, stepId: string) {
  const observations = await getObservationsBySession(sessionId);
  return observations.filter(obs => obs.step_id === stepId);
}

export async function getObservationById(id: string) {
  const { data, error } = await supabase
    .from("observations")
    .select(`
      *,
      user:users(id, name, email, avatar_url)
    `)
    .eq("id", id)
    .single();

  if (error) throw error;

  // Get waste types
  const { data: links } = await supabase
    .from("observation_waste_links")
    .select("waste_type_id")
    .eq("observation_id", id);

  if (links && links.length > 0) {
    const wasteTypeIds = links.map((l: { waste_type_id: string }) => l.waste_type_id);
    const { data: wasteTypes } = await supabase
      .from("waste_types")
      .select("*")
      .in("id", wasteTypeIds);

    return { ...data, waste_types: wasteTypes || [] } as ObservationWithDetails;
  }

  return { ...data, waste_types: [] } as ObservationWithDetails;
}

export async function createObservation(input: CreateObservationInput) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Create the observation
  const { data: observation, error } = await supabase
    .from("observations")
    .insert({
      session_id: input.session_id,
      step_id: input.step_id,
      user_id: user.id,
      notes: input.notes,
      is_digital: input.is_digital,
      is_physical: input.is_physical,
      frequency_score: input.frequency_score,
      impact_score: input.impact_score,
      ease_score: input.ease_score,
      attachments: input.attachments || [],
    })
    .select()
    .single();

  if (error) throw error;

  // Create waste type links
  if (input.waste_type_ids.length > 0) {
    const links = input.waste_type_ids.map(wasteTypeId => ({
      observation_id: observation.id,
      waste_type_id: wasteTypeId,
    }));

    const { error: linkError } = await supabase
      .from("observation_waste_links")
      .insert(links);

    if (linkError) throw linkError;
  }

  return observation as Observation;
}

export async function updateObservation(
  id: string,
  input: Partial<CreateObservationInput>
) {
  // Update the observation
  const updates: Partial<Observation> = {};
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.is_digital !== undefined) updates.is_digital = input.is_digital;
  if (input.is_physical !== undefined) updates.is_physical = input.is_physical;
  if (input.frequency_score !== undefined) updates.frequency_score = input.frequency_score;
  if (input.impact_score !== undefined) updates.impact_score = input.impact_score;
  if (input.ease_score !== undefined) updates.ease_score = input.ease_score;

  const { data, error } = await supabase
    .from("observations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  // Update waste type links if provided
  if (input.waste_type_ids !== undefined) {
    // Delete existing links
    await supabase
      .from("observation_waste_links")
      .delete()
      .eq("observation_id", id);

    // Create new links
    if (input.waste_type_ids.length > 0) {
      const links = input.waste_type_ids.map(wasteTypeId => ({
        observation_id: id,
        waste_type_id: wasteTypeId,
      }));

      await supabase
        .from("observation_waste_links")
        .insert(links);
    }
  }

  return data as Observation;
}

export async function deleteObservation(id: string) {
  // Links will be cascade deleted due to FK constraint
  const { error } = await supabase
    .from("observations")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ============================================
// AGGREGATION HELPERS
// ============================================

export async function getStepObservationStats(sessionId: string) {
  const observations = await getObservationsBySession(sessionId);
  
  const statsMap: Record<string, { count: number; priorityScore: number }> = {};
  
  observations.forEach(obs => {
    if (!statsMap[obs.step_id]) {
      statsMap[obs.step_id] = { count: 0, priorityScore: 0 };
    }
    statsMap[obs.step_id].count += 1;
    statsMap[obs.step_id].priorityScore += obs.priority_score;
  });

  return statsMap;
}

export async function getSessionObservationSummary(sessionId: string) {
  const observations = await getObservationsBySession(sessionId);
  
  const totalCount = observations.length;
  const totalPriority = observations.reduce((sum, obs) => sum + obs.priority_score, 0);
  const avgPriority = totalCount > 0 ? totalPriority / totalCount : 0;
  
  const digitalCount = observations.filter(obs => obs.is_digital).length;
  const physicalCount = observations.filter(obs => obs.is_physical).length;
  
  // Waste type distribution
  const wasteTypeCount: Record<string, number> = {};
  observations.forEach(obs => {
    obs.waste_types?.forEach(wt => {
      wasteTypeCount[wt.name] = (wasteTypeCount[wt.name] || 0) + 1;
    });
  });

  return {
    totalCount,
    totalPriority,
    avgPriority,
    digitalCount,
    physicalCount,
    digitalPercentage: totalCount > 0 ? (digitalCount / totalCount) * 100 : 0,
    wasteTypeDistribution: wasteTypeCount,
  };
}

