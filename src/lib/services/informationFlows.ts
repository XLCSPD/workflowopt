import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  InformationFlow,
  InformationFlowWithRelations,
  FlowWasteLink,
  FlowObservationLink,
  StepIO,
  StepIOWithFlow,
  FlowComparisonSnapshot,
  FlowComparisonData,
  FlowComparisonItem,
  CreateInformationFlowInput,
  UpdateInformationFlowInput,
  CreateStepIOInput,
  UpdateStepIOInput,
  FlowType,
} from "@/types";

const supabase = getSupabaseClient();

// ============================================
// INFORMATION FLOWS - CRUD
// ============================================

/**
 * Get all flows for a process (current state)
 */
export async function getFlowsByProcess(
  processId: string
): Promise<InformationFlowWithRelations[]> {
  const { data, error } = await supabase
    .from("information_flows")
    .select(
      `
      *,
      source_step:process_steps!source_step_id(id, step_name, lane),
      target_step:process_steps!target_step_id(id, step_name, lane)
    `
    )
    .eq("process_id", processId)
    .eq("state_type", "current")
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Fetch waste types and observations for each flow
  const flowsWithRelations = await Promise.all(
    (data || []).map(async (flow: InformationFlow) => {
      const wasteTypes = await getFlowWasteTypes(flow.id);
      const observations = await getFlowObservations(flow.id);
      return {
        ...flow,
        waste_types: wasteTypes,
        observations,
      } as InformationFlowWithRelations;
    })
  );

  return flowsWithRelations;
}

/**
 * Get all flows for a future state
 */
export async function getFlowsByFutureState(
  futureStateId: string
): Promise<InformationFlowWithRelations[]> {
  const { data, error } = await supabase
    .from("information_flows")
    .select("*")
    .eq("future_state_id", futureStateId)
    .eq("state_type", "future")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const flowsWithRelations = await Promise.all(
    (data || []).map(async (flow: InformationFlow) => {
      const wasteTypes = await getFlowWasteTypes(flow.id);
      const observations = await getFlowObservations(flow.id);
      return {
        ...flow,
        waste_types: wasteTypes,
        observations,
      } as InformationFlowWithRelations;
    })
  );

  return flowsWithRelations;
}

/**
 * Get a single flow by ID
 */
export async function getFlowById(
  flowId: string
): Promise<InformationFlowWithRelations> {
  const { data, error } = await supabase
    .from("information_flows")
    .select(
      `
      *,
      source_step:process_steps!source_step_id(id, step_name, lane),
      target_step:process_steps!target_step_id(id, step_name, lane)
    `
    )
    .eq("id", flowId)
    .single();

  if (error) throw error;

  const wasteTypes = await getFlowWasteTypes(flowId);
  const observations = await getFlowObservations(flowId);

  return {
    ...data,
    waste_types: wasteTypes,
    observations,
  } as InformationFlowWithRelations;
}

/**
 * Create a new information flow
 */
export async function createFlow(
  input: CreateInformationFlowInput
): Promise<InformationFlow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { waste_type_ids, observation_ids, ...flowData } = input;

  const { data, error } = await supabase
    .from("information_flows")
    .insert({
      ...flowData,
      metadata: flowData.metadata || {},
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Create waste type links
  if (waste_type_ids && waste_type_ids.length > 0) {
    await linkFlowToWasteTypes(data.id, waste_type_ids);
  }

  // Create observation links
  if (observation_ids && observation_ids.length > 0) {
    await linkFlowToObservations(data.id, observation_ids);
  }

  return data as InformationFlow;
}

/**
 * Update an existing flow
 */
export async function updateFlow(
  flowId: string,
  input: UpdateInformationFlowInput
): Promise<InformationFlow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { waste_type_ids, observation_ids, ...flowData } = input;

  const { data, error } = await supabase
    .from("information_flows")
    .update({
      ...flowData,
      updated_by: user.id,
    })
    .eq("id", flowId)
    .select()
    .single();

  if (error) throw error;

  // Update waste type links if provided
  if (waste_type_ids !== undefined) {
    await supabase.from("flow_waste_links").delete().eq("flow_id", flowId);
    if (waste_type_ids.length > 0) {
      await linkFlowToWasteTypes(flowId, waste_type_ids);
    }
  }

  // Update observation links if provided
  if (observation_ids !== undefined) {
    await supabase
      .from("flow_observation_links")
      .delete()
      .eq("flow_id", flowId);
    if (observation_ids.length > 0) {
      await linkFlowToObservations(flowId, observation_ids);
    }
  }

  return data as InformationFlow;
}

/**
 * Delete a flow
 */
export async function deleteFlow(flowId: string): Promise<void> {
  // Links are cascade deleted
  const { error } = await supabase
    .from("information_flows")
    .delete()
    .eq("id", flowId);

  if (error) throw error;
}

// ============================================
// FLOW WASTE LINKS
// ============================================

/**
 * Get waste types linked to a flow
 */
async function getFlowWasteTypes(flowId: string) {
  const { data: links } = await supabase
    .from("flow_waste_links")
    .select("waste_type_id")
    .eq("flow_id", flowId);

  if (!links || links.length === 0) return [];

  const wasteTypeIds = links.map((l: { waste_type_id: string }) => l.waste_type_id);
  const { data: wasteTypes } = await supabase
    .from("waste_types")
    .select("*")
    .in("id", wasteTypeIds);

  return wasteTypes || [];
}

/**
 * Link a flow to waste types
 */
async function linkFlowToWasteTypes(
  flowId: string,
  wasteTypeIds: string[]
): Promise<void> {
  const links = wasteTypeIds.map((wasteTypeId) => ({
    flow_id: flowId,
    waste_type_id: wasteTypeId,
  }));

  const { error } = await supabase.from("flow_waste_links").insert(links);
  if (error) throw error;
}

/**
 * Add a waste type link with notes
 */
export async function addFlowWasteLink(
  flowId: string,
  wasteTypeId: string,
  notes?: string
): Promise<FlowWasteLink> {
  const { data, error } = await supabase
    .from("flow_waste_links")
    .insert({
      flow_id: flowId,
      waste_type_id: wasteTypeId,
      notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data as FlowWasteLink;
}

/**
 * Remove a waste type link
 */
export async function removeFlowWasteLink(
  flowId: string,
  wasteTypeId: string
): Promise<void> {
  const { error } = await supabase
    .from("flow_waste_links")
    .delete()
    .eq("flow_id", flowId)
    .eq("waste_type_id", wasteTypeId);

  if (error) throw error;
}

// ============================================
// FLOW OBSERVATION LINKS
// ============================================

/**
 * Get observations linked to a flow
 */
async function getFlowObservations(flowId: string) {
  const { data: links } = await supabase
    .from("flow_observation_links")
    .select("observation_id")
    .eq("flow_id", flowId);

  if (!links || links.length === 0) return [];

  const observationIds = links.map((l: { observation_id: string }) => l.observation_id);
  const { data: observations } = await supabase
    .from("observations")
    .select("*")
    .in("id", observationIds);

  return observations || [];
}

/**
 * Link a flow to observations
 */
async function linkFlowToObservations(
  flowId: string,
  observationIds: string[]
): Promise<void> {
  const links = observationIds.map((observationId) => ({
    flow_id: flowId,
    observation_id: observationId,
  }));

  const { error } = await supabase.from("flow_observation_links").insert(links);
  if (error) throw error;
}

/**
 * Add an observation link
 */
export async function addFlowObservationLink(
  flowId: string,
  observationId: string
): Promise<FlowObservationLink> {
  const { data, error } = await supabase
    .from("flow_observation_links")
    .insert({
      flow_id: flowId,
      observation_id: observationId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as FlowObservationLink;
}

/**
 * Remove an observation link
 */
export async function removeFlowObservationLink(
  flowId: string,
  observationId: string
): Promise<void> {
  const { error } = await supabase
    .from("flow_observation_links")
    .delete()
    .eq("flow_id", flowId)
    .eq("observation_id", observationId);

  if (error) throw error;
}

// ============================================
// STEP I/O (SIPOC)
// ============================================

/**
 * Get inputs and outputs for a step
 */
export async function getStepIO(stepId: string): Promise<StepIOWithFlow[]> {
  const { data, error } = await supabase
    .from("step_io")
    .select(
      `
      *,
      linked_flow:information_flows(*)
    `
    )
    .eq("step_id", stepId)
    .order("io_type")
    .order("order_index");

  if (error) throw error;
  return (data || []) as StepIOWithFlow[];
}

/**
 * Get inputs and outputs for a future state node
 */
export async function getNodeIO(nodeId: string): Promise<StepIOWithFlow[]> {
  const { data, error } = await supabase
    .from("step_io")
    .select(
      `
      *,
      linked_flow:information_flows(*)
    `
    )
    .eq("node_id", nodeId)
    .order("io_type")
    .order("order_index");

  if (error) throw error;
  return (data || []) as StepIOWithFlow[];
}

/**
 * Create a step I/O entry
 */
export async function createStepIO(input: CreateStepIOInput): Promise<StepIO> {
  const { data, error } = await supabase
    .from("step_io")
    .insert({
      ...input,
      is_required: input.is_required ?? true,
      order_index: input.order_index ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as StepIO;
}

/**
 * Update a step I/O entry
 */
export async function updateStepIO(
  ioId: string,
  input: UpdateStepIOInput
): Promise<StepIO> {
  const { data, error } = await supabase
    .from("step_io")
    .update(input)
    .eq("id", ioId)
    .select()
    .single();

  if (error) throw error;
  return data as StepIO;
}

/**
 * Delete a step I/O entry
 */
export async function deleteStepIO(ioId: string): Promise<void> {
  const { error } = await supabase.from("step_io").delete().eq("id", ioId);

  if (error) throw error;
}

/**
 * Reorder step I/O entries
 */
export async function reorderStepIO(
  updates: { id: string; order_index: number }[]
): Promise<void> {
  for (const update of updates) {
    const { error } = await supabase
      .from("step_io")
      .update({ order_index: update.order_index })
      .eq("id", update.id);

    if (error) throw error;
  }
}

// ============================================
// FLOW STATISTICS
// ============================================

export interface FlowStats {
  totalFlows: number;
  byType: Record<FlowType, number>;
  avgQualityScore: number;
  automatedCount: number;
  realTimeCount: number;
  wasteTaggedCount: number;
  observationLinkedCount: number;
}

/**
 * Get statistics for flows in a process
 */
export async function getProcessFlowStats(processId: string): Promise<FlowStats> {
  const flows = await getFlowsByProcess(processId);

  const stats: FlowStats = {
    totalFlows: flows.length,
    byType: {
      data: 0,
      document: 0,
      approval: 0,
      system: 0,
      notification: 0,
    },
    avgQualityScore: 0,
    automatedCount: 0,
    realTimeCount: 0,
    wasteTaggedCount: 0,
    observationLinkedCount: 0,
  };

  let qualitySum = 0;
  let qualityCount = 0;

  flows.forEach((flow) => {
    // By type
    stats.byType[flow.flow_type] = (stats.byType[flow.flow_type] || 0) + 1;

    // Quality
    if (flow.quality_score) {
      qualitySum += flow.quality_score;
      qualityCount++;
    }

    // Automated
    if (flow.is_automated) stats.automatedCount++;

    // Real-time
    if (flow.is_real_time) stats.realTimeCount++;

    // Waste tagged
    if (flow.waste_types && flow.waste_types.length > 0) {
      stats.wasteTaggedCount++;
    }

    // Observation linked
    if (flow.observations && flow.observations.length > 0) {
      stats.observationLinkedCount++;
    }
  });

  stats.avgQualityScore = qualityCount > 0 ? qualitySum / qualityCount : 0;

  return stats;
}

// ============================================
// FLOW COMPARISON
// ============================================

/**
 * Create a comparison snapshot between current and future flows
 */
export async function createFlowComparison(
  sessionId: string,
  futureStateId: string
): Promise<FlowComparisonSnapshot> {
  // Get session's process_id
  const { data: session } = await supabase
    .from("sessions")
    .select("process_id")
    .eq("id", sessionId)
    .single();

  if (!session) throw new Error("Session not found");

  const currentFlows = await getFlowsByProcess(session.process_id);
  const futureFlows = await getFlowsByFutureState(futureStateId);

  // Calculate comparison
  const comparison = calculateFlowComparison(currentFlows, futureFlows);

  const { data, error } = await supabase
    .from("flow_comparison_snapshots")
    .insert({
      session_id: sessionId,
      future_state_id: futureStateId,
      current_flows_count: currentFlows.length,
      future_flows_count: futureFlows.length,
      eliminated_flows: comparison.eliminated.length,
      added_flows: comparison.added.length,
      modified_flows: comparison.modified.length,
      avg_quality_improvement: comparison.avgQualityImprovement,
      waste_reduction_count: comparison.wasteReductionCount,
      comparison_data: comparison,
    })
    .select()
    .single();

  if (error) throw error;
  return data as FlowComparisonSnapshot;
}

/**
 * Get existing comparison snapshot
 */
export async function getFlowComparison(
  sessionId: string,
  futureStateId: string
): Promise<FlowComparisonSnapshot | null> {
  const { data, error } = await supabase
    .from("flow_comparison_snapshots")
    .select("*")
    .eq("session_id", sessionId)
    .eq("future_state_id", futureStateId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as FlowComparisonSnapshot | null;
}

/**
 * Calculate comparison between current and future flows
 */
function calculateFlowComparison(
  currentFlows: InformationFlowWithRelations[],
  futureFlows: InformationFlowWithRelations[]
): FlowComparisonData & {
  avgQualityImprovement: number;
  wasteReductionCount: number;
} {
  // Match flows by name (case-insensitive)
  const currentByName = new Map(
    currentFlows.map((f) => [f.name.toLowerCase(), f])
  );
  const futureByName = new Map(
    futureFlows.map((f) => [f.name.toLowerCase(), f])
  );

  const eliminated: FlowComparisonItem[] = [];
  const added: FlowComparisonItem[] = [];
  const modified: FlowComparisonItem[] = [];
  const unchanged: FlowComparisonItem[] = [];

  let qualityImprovementSum = 0;
  let qualityImprovementCount = 0;
  let wasteReductionCount = 0;

  // Check current flows
  currentFlows.forEach((currentFlow) => {
    const futureFlow = futureByName.get(currentFlow.name.toLowerCase());

    if (!futureFlow) {
      eliminated.push({
        current_flow_id: currentFlow.id,
        name: currentFlow.name,
        change_type: "eliminated",
      });
    } else {
      // Check if modified
      const qualityChange =
        (futureFlow.quality_score || 0) - (currentFlow.quality_score || 0);
      const wasteRemoved = (currentFlow.waste_types || [])
        .filter(
          (w) => !(futureFlow.waste_types || []).find((fw) => fw.id === w.id)
        )
        .map((w) => w.name);
      const wasteAdded = (futureFlow.waste_types || [])
        .filter(
          (w) => !(currentFlow.waste_types || []).find((cw) => cw.id === w.id)
        )
        .map((w) => w.name);

      if (
        qualityChange !== 0 ||
        wasteRemoved.length > 0 ||
        wasteAdded.length > 0 ||
        currentFlow.flow_type !== futureFlow.flow_type
      ) {
        modified.push({
          current_flow_id: currentFlow.id,
          future_flow_id: futureFlow.id,
          name: currentFlow.name,
          change_type: "modified",
          quality_change: qualityChange,
          waste_changes: { removed: wasteRemoved, added: wasteAdded },
        });

        if (qualityChange !== 0) {
          qualityImprovementSum += qualityChange;
          qualityImprovementCount++;
        }
        wasteReductionCount += wasteRemoved.length;
      } else {
        unchanged.push({
          current_flow_id: currentFlow.id,
          future_flow_id: futureFlow.id,
          name: currentFlow.name,
          change_type: "unchanged",
        });
      }
    }
  });

  // Check for new flows in future
  futureFlows.forEach((futureFlow) => {
    if (!currentByName.has(futureFlow.name.toLowerCase())) {
      added.push({
        future_flow_id: futureFlow.id,
        name: futureFlow.name,
        change_type: "added",
      });
    }
  });

  return {
    eliminated,
    added,
    modified,
    unchanged,
    avgQualityImprovement:
      qualityImprovementCount > 0
        ? qualityImprovementSum / qualityImprovementCount
        : 0,
    wasteReductionCount,
  };
}

// ============================================
// COPY FLOWS
// ============================================

/**
 * Copy flows from a process to a future state
 */
export async function copyFlowsToFutureState(
  processId: string,
  futureStateId: string,
  nodeMapping: Map<string, string> // Maps step_id to node_id
): Promise<InformationFlow[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const currentFlows = await getFlowsByProcess(processId);
  const copiedFlows: InformationFlow[] = [];

  for (const flow of currentFlows) {
    const sourceNodeId = flow.source_step_id
      ? nodeMapping.get(flow.source_step_id)
      : undefined;
    const targetNodeId = flow.target_step_id
      ? nodeMapping.get(flow.target_step_id)
      : undefined;

    // Only copy if both endpoints are mapped
    if (sourceNodeId && targetNodeId) {
      const copiedFlow = await createFlow({
        future_state_id: futureStateId,
        state_type: "future",
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        name: flow.name,
        description: flow.description,
        flow_type: flow.flow_type,
        status: "proposed",
        volume_per_day: flow.volume_per_day,
        frequency: flow.frequency,
        is_automated: flow.is_automated,
        is_real_time: flow.is_real_time,
        completeness_score: flow.completeness_score,
        accuracy_score: flow.accuracy_score,
        timeliness_score: flow.timeliness_score,
        metadata: flow.metadata,
        waste_type_ids: flow.waste_types?.map((w) => w.id),
      });

      copiedFlows.push(copiedFlow);
    }
  }

  return copiedFlows;
}
