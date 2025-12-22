import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  WorkflowContext,
  WorkflowContextWithRelations,
  WorkflowStakeholder,
  WorkflowSystem,
  WorkflowMetric,
  ContextCompleteness,
  UpsertWorkflowContextInput,
  UpsertWorkflowStakeholderInput,
  UpsertWorkflowSystemInput,
  UpsertWorkflowMetricInput,
} from "@/types";

// Helper to get server-side Supabase client
async function getServerSupabase(): Promise<SupabaseClient> {
  return createServerSupabaseClient();
}

// ============================================
// CONTEXT COMPLETENESS CALCULATION
// ============================================

/**
 * Calculate the completeness score and field status for a workflow context
 */
export function calculateContextCompleteness(
  context: WorkflowContextWithRelations | null
): ContextCompleteness {
  if (!context) {
    return {
      required: {
        purpose: false,
        business_value: false,
        trigger_events: false,
        end_outcomes: false,
      },
      recommended: {
        stakeholders: false,
        systems: false,
        volume_frequency: false,
      },
      optional: {
        sla_targets: false,
        constraints: false,
        metrics: false,
      },
      overallScore: 0,
    };
  }

  const required = {
    purpose: !!context.purpose?.trim(),
    business_value: !!context.business_value?.trim(),
    trigger_events: context.trigger_events.length > 0,
    end_outcomes: context.end_outcomes.length > 0,
  };

  const recommended = {
    stakeholders: context.stakeholders.length > 0,
    systems: context.systems.length > 0,
    volume_frequency: !!context.volume_frequency?.trim(),
  };

  const optional = {
    sla_targets: !!context.sla_targets?.trim(),
    constraints: context.constraints.length > 0,
    metrics: context.metrics.length > 0,
  };

  // Calculate score: required fields worth 15% each (60%), recommended 10% each (30%), optional 3.33% each (10%)
  const requiredScore =
    (Object.values(required).filter(Boolean).length / 4) * 60;
  const recommendedScore =
    (Object.values(recommended).filter(Boolean).length / 3) * 30;
  const optionalScore =
    (Object.values(optional).filter(Boolean).length / 3) * 10;

  const overallScore = Math.round(requiredScore + recommendedScore + optionalScore);

  return {
    required,
    recommended,
    optional,
    overallScore,
  };
}

// ============================================
// FETCH OPERATIONS
// ============================================

/**
 * Get workflow context with all relations for a process
 */
export async function getWorkflowContext(
  processId: string
): Promise<WorkflowContextWithRelations | null> {
  const supabase = await getServerSupabase();
  const { data: context, error: contextError } = await supabase
    .from("workflow_contexts")
    .select("*")
    .eq("workflow_id", processId)
    .single();

  if (contextError) {
    if (contextError.code === "PGRST116") {
      // No context found
      return null;
    }
    console.error("Error fetching workflow context:", contextError);
    throw new Error("Failed to fetch workflow context");
  }

  // Fetch related data (supabase is already defined above)
  const [stakeholdersResult, systemsResult, metricsResult] = await Promise.all([
    supabase
      .from("workflow_stakeholders")
      .select("*")
      .eq("workflow_context_id", context.id),
    supabase
      .from("workflow_systems")
      .select("*")
      .eq("workflow_context_id", context.id),
    supabase
      .from("workflow_metrics")
      .select("*")
      .eq("workflow_context_id", context.id),
  ]);

  return {
    ...context,
    stakeholders: (stakeholdersResult.data || []) as WorkflowStakeholder[],
    systems: (systemsResult.data || []) as WorkflowSystem[],
    metrics: (metricsResult.data || []) as WorkflowMetric[],
  } as WorkflowContextWithRelations;
}

// ============================================
// UPSERT OPERATIONS
// ============================================

/**
 * Create or update workflow context for a process
 */
export async function upsertWorkflowContext(
  processId: string,
  input: UpsertWorkflowContextInput,
  userId?: string
): Promise<WorkflowContext> {
  const supabase = await getServerSupabase();

  // Check if context exists
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: existing, error: existingError } = await supabase
    .from("workflow_contexts")
    .select("id")
    .eq("workflow_id", processId)
    .single();

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from("workflow_contexts")
      .update({
        purpose: input.purpose,
        business_value: input.business_value,
        trigger_events: input.trigger_events || [],
        end_outcomes: input.end_outcomes || [],
        volume_frequency: input.volume_frequency,
        sla_targets: input.sla_targets,
        constraints: input.constraints || [],
        assumptions: input.assumptions || [],
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating workflow context:", error);
      throw new Error("Failed to update workflow context");
    }

    return data as WorkflowContext;
  } else {
    // Create new
    const { data, error } = await supabase
      .from("workflow_contexts")
      .insert({
        workflow_id: processId,
        purpose: input.purpose,
        business_value: input.business_value,
        trigger_events: input.trigger_events || [],
        end_outcomes: input.end_outcomes || [],
        volume_frequency: input.volume_frequency,
        sla_targets: input.sla_targets,
        constraints: input.constraints || [],
        assumptions: input.assumptions || [],
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating workflow context:", error);
      throw new Error("Failed to create workflow context");
    }

    return data as WorkflowContext;
  }
}

// ============================================
// STAKEHOLDER OPERATIONS
// ============================================

/**
 * Update stakeholders for a context (replaces all)
 */
export async function updateStakeholders(
  contextId: string,
  stakeholders: UpsertWorkflowStakeholderInput[]
): Promise<WorkflowStakeholder[]> {
  const supabase = await getServerSupabase();
  // Delete existing stakeholders
  await supabase
    .from("workflow_stakeholders")
    .delete()
    .eq("workflow_context_id", contextId);

  if (stakeholders.length === 0) {
    return [];
  }

  // Insert new stakeholders
  const { data, error } = await supabase
    .from("workflow_stakeholders")
    .insert(
      stakeholders.map((s) => ({
        workflow_context_id: contextId,
        role: s.role,
        responsibilities: s.responsibilities,
        pain_points: s.pain_points,
      }))
    )
    .select();

  if (error) {
    console.error("Error updating stakeholders:", error);
    throw new Error("Failed to update stakeholders");
  }

  return data as WorkflowStakeholder[];
}

// ============================================
// SYSTEM OPERATIONS
// ============================================

/**
 * Update systems for a context (replaces all)
 */
export async function updateSystems(
  contextId: string,
  systems: UpsertWorkflowSystemInput[]
): Promise<WorkflowSystem[]> {
  const supabase = await getServerSupabase();
  // Delete existing systems
  await supabase
    .from("workflow_systems")
    .delete()
    .eq("workflow_context_id", contextId);

  if (systems.length === 0) {
    return [];
  }

  // Insert new systems
  const { data, error } = await supabase
    .from("workflow_systems")
    .insert(
      systems.map((s) => ({
        workflow_context_id: contextId,
        name: s.name,
        role: s.role,
        integration_notes: s.integration_notes,
      }))
    )
    .select();

  if (error) {
    console.error("Error updating systems:", error);
    throw new Error("Failed to update systems");
  }

  return data as WorkflowSystem[];
}

// ============================================
// METRIC OPERATIONS
// ============================================

/**
 * Update metrics for a context (replaces all)
 */
export async function updateMetrics(
  contextId: string,
  metrics: UpsertWorkflowMetricInput[]
): Promise<WorkflowMetric[]> {
  const supabase = await getServerSupabase();
  // Delete existing metrics
  await supabase
    .from("workflow_metrics")
    .delete()
    .eq("workflow_context_id", contextId);

  if (metrics.length === 0) {
    return [];
  }

  // Insert new metrics
  const { data, error } = await supabase
    .from("workflow_metrics")
    .insert(
      metrics.map((m) => ({
        workflow_context_id: contextId,
        name: m.name,
        current_value: m.current_value,
        target_value: m.target_value,
      }))
    )
    .select();

  if (error) {
    console.error("Error updating metrics:", error);
    throw new Error("Failed to update metrics");
  }

  return data as WorkflowMetric[];
}

// ============================================
// FULL CONTEXT SAVE (ATOMIC)
// ============================================

/**
 * Save full workflow context with all relations
 */
export async function saveFullWorkflowContext(
  processId: string,
  input: {
    context: UpsertWorkflowContextInput;
    stakeholders: UpsertWorkflowStakeholderInput[];
    systems: UpsertWorkflowSystemInput[];
    metrics: UpsertWorkflowMetricInput[];
  },
  userId?: string
): Promise<WorkflowContextWithRelations> {
  // First, upsert the main context
  const context = await upsertWorkflowContext(processId, input.context, userId);

  // Then update all relations in parallel
  const [stakeholders, systems, metrics] = await Promise.all([
    updateStakeholders(context.id, input.stakeholders),
    updateSystems(context.id, input.systems),
    updateMetrics(context.id, input.metrics),
  ]);

  return {
    ...context,
    stakeholders,
    systems,
    metrics,
  };
}

// ============================================
// DELETE OPERATIONS
// ============================================

/**
 * Delete workflow context and all relations
 */
export async function deleteWorkflowContext(processId: string): Promise<void> {
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("workflow_contexts")
    .delete()
    .eq("workflow_id", processId);

  if (error) {
    console.error("Error deleting workflow context:", error);
    throw new Error("Failed to delete workflow context");
  }
}

