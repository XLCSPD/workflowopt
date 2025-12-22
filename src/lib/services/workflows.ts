import { getSupabaseClient } from "@/lib/supabase/client";
import type { Process, ProcessLane, ProcessStep } from "@/types";

const supabase = getSupabaseClient();

export interface StepConnection {
  id: string;
  process_id: string;
  source_step_id: string;
  target_step_id: string;
  label?: string;
}

// ============================================
// PROCESSES (WORKFLOWS)
// ============================================

export async function getProcesses() {
  const { data, error } = await supabase
    .from("processes")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data as Process[];
}

export async function getProcessById(id: string) {
  const { data, error } = await supabase
    .from("processes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Process;
}

export async function createProcess(process: {
  name: string;
  description?: string;
  org_id?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from("processes")
    .insert({
      ...process,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Process;
}

export async function updateProcess(id: string, updates: Partial<Process>) {
  const { data, error } = await supabase
    .from("processes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Process;
}

export async function deleteProcess(id: string) {
  const { error } = await supabase
    .from("processes")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ============================================
// PROCESS STEPS
// ============================================

export async function getProcessSteps(processId: string) {
  const { data, error } = await supabase
    .from("process_steps")
    .select("*")
    .eq("process_id", processId)
    .order("order_index", { ascending: true });

  if (error) throw error;
  return data as ProcessStep[];
}

export async function createProcessStep(step: Omit<ProcessStep, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("process_steps")
    .insert(step)
    .select()
    .single();

  if (error) throw error;
  return data as ProcessStep;
}

export async function updateProcessStep(id: string, updates: Partial<ProcessStep>) {
  const { data, error } = await supabase
    .from("process_steps")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ProcessStep;
}

export async function deleteProcessStep(id: string) {
  const { error } = await supabase
    .from("process_steps")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ============================================
// STEP CONNECTIONS
// ============================================

export async function getStepConnections(processId: string) {
  const { data, error } = await supabase
    .from("step_connections")
    .select("*")
    .eq("process_id", processId);

  if (error) throw error;
  return data as StepConnection[];
}

export async function createStepConnection(connection: {
  process_id: string;
  source_step_id: string;
  target_step_id: string;
  label?: string;
}) {
  const { data, error } = await supabase
    .from("step_connections")
    .insert(connection)
    .select()
    .single();

  if (error) throw error;
  return data as StepConnection;
}

export async function deleteStepConnection(id: string) {
  const { error } = await supabase
    .from("step_connections")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ============================================
// WORKFLOW WITH ALL DATA
// ============================================

export async function getWorkflowWithDetails(processId: string) {
  const [process, steps, connections, lanes] = await Promise.all([
    getProcessById(processId),
    getProcessSteps(processId),
    getStepConnections(processId),
    (async () => {
      const { data, error } = await supabase
        .from("process_lanes")
        .select("*")
        .eq("process_id", processId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data || []) as ProcessLane[];
    })(),
  ]);

  return {
    process,
    steps,
    connections,
    lanes,
  };
}

// ============================================
// WORKFLOW STATS
// ============================================

export async function getWorkflowStats(processId: string) {
  const { data: steps } = await supabase
    .from("process_steps")
    .select("lane")
    .eq("process_id", processId);

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id")
    .eq("process_id", processId);

  const stepCount = steps?.length || 0;
  const laneCount = new Set(steps?.map((s: { lane: string }) => s.lane)).size;
  const sessionCount = sessions?.length || 0;

  return { stepCount, laneCount, sessionCount };
}

export async function getAllWorkflowsWithStats() {
  const processes = await getProcesses();
  
  const workflowsWithStats = await Promise.all(
    processes.map(async (process) => {
      const stats = await getWorkflowStats(process.id);
      return {
        ...process,
        ...stats,
      };
    })
  );

  return workflowsWithStats;
}

