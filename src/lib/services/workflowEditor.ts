import { getSupabaseClient } from "@/lib/supabase/client";
import type { ProcessStep, StepType } from "@/types";

const supabase = getSupabaseClient();

// ============================================
// STEP CRUD OPERATIONS
// ============================================

export interface CreateStepInput {
  process_id: string;
  name: string;
  description?: string;
  type: StepType;
  lane: string;
  lead_time_minutes?: number | null;
  cycle_time_minutes?: number | null;
  position_x?: number;
  position_y?: number;
  order_index?: number;
}

export interface UpdateStepInput {
  name?: string;
  description?: string;
  type?: StepType;
  lane?: string;
  lead_time_minutes?: number | null;
  cycle_time_minutes?: number | null;
  position_x?: number;
  position_y?: number;
  order_index?: number;
}

export async function createStep(input: CreateStepInput): Promise<ProcessStep> {
  // Map input to database column names
  const dbInput = {
    process_id: input.process_id,
    step_name: input.name,
    description: input.description,
    step_type: input.type,
    lane: input.lane,
    lead_time_minutes: input.lead_time_minutes ?? null,
    cycle_time_minutes: input.cycle_time_minutes ?? null,
    position_x: input.position_x,
    position_y: input.position_y,
    order_index: input.order_index,
  };
  
  const { data, error } = await supabase
    .from("process_steps")
    .insert(dbInput)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateStep(
  stepId: string,
  updates: UpdateStepInput
): Promise<ProcessStep> {
  // Map input to database column names
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.step_name = updates.name;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.type !== undefined) dbUpdates.step_type = updates.type;
  if (updates.lane !== undefined) dbUpdates.lane = updates.lane;
  if (updates.lead_time_minutes !== undefined) dbUpdates.lead_time_minutes = updates.lead_time_minutes;
  if (updates.cycle_time_minutes !== undefined) dbUpdates.cycle_time_minutes = updates.cycle_time_minutes;
  if (updates.position_x !== undefined) dbUpdates.position_x = updates.position_x;
  if (updates.position_y !== undefined) dbUpdates.position_y = updates.position_y;
  if (updates.order_index !== undefined) dbUpdates.order_index = updates.order_index;
  
  const { data, error } = await supabase
    .from("process_steps")
    .update(dbUpdates)
    .eq("id", stepId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteStep(stepId: string): Promise<void> {
  // First delete any connections involving this step
  await supabase
    .from("step_connections")
    .delete()
    .or(`source_step_id.eq.${stepId},target_step_id.eq.${stepId}`);

  // Then delete the step
  const { error } = await supabase
    .from("process_steps")
    .delete()
    .eq("id", stepId);

  if (error) throw error;
}

export async function updateStepPositions(
  steps: { id: string; position_x: number; position_y: number }[]
): Promise<void> {
  // Update positions in batch
  const updates = steps.map((step) =>
    supabase
      .from("process_steps")
      .update({ position_x: step.position_x, position_y: step.position_y })
      .eq("id", step.id)
  );

  await Promise.all(updates);
}

// ============================================
// CONNECTION CRUD OPERATIONS
// ============================================

// StepConnection type is defined in workflows.ts
import type { StepConnection } from "./workflows";

export async function createConnection(
  processId: string,
  sourceStepId: string,
  targetStepId: string,
  label?: string
): Promise<StepConnection> {
  const { data, error } = await supabase
    .from("step_connections")
    .insert({
      process_id: processId,
      source_step_id: sourceStepId,
      target_step_id: targetStepId,
      label,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateConnection(
  connectionId: string,
  label: string
): Promise<StepConnection> {
  const { data, error } = await supabase
    .from("step_connections")
    .update({ label })
    .eq("id", connectionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteConnection(connectionId: string): Promise<void> {
  const { error } = await supabase
    .from("step_connections")
    .delete()
    .eq("id", connectionId);

  if (error) throw error;
}

// ============================================
// PROCESS CRUD OPERATIONS
// ============================================

export interface CreateProcessInput {
  name: string;
  description?: string;
}

export async function createProcess(input: CreateProcessInput) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get user's org_id
  const { data: userProfile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  const { data, error } = await supabase
    .from("processes")
    .insert({
      ...input,
      org_id: userProfile?.org_id || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProcess(processId: string): Promise<void> {
  // Delete connections first
  await supabase
    .from("step_connections")
    .delete()
    .eq("process_id", processId);

  // Delete steps
  await supabase
    .from("process_steps")
    .delete()
    .eq("process_id", processId);

  // Delete sessions
  await supabase
    .from("sessions")
    .delete()
    .eq("process_id", processId);

  // Finally delete the process
  const { error } = await supabase
    .from("processes")
    .delete()
    .eq("id", processId);

  if (error) throw error;
}

// ============================================
// LANE HELPERS
// ============================================

export function getDefaultLanes(): string[] {
  return ["Requester", "Approver", "System"];
}

export function generateStepId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

