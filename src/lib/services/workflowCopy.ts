/**
 * Workflow Copy Service
 * Implements AC-3.1/3.2/3.3, AC-4.1 from PRD_Copy_Workflow_Feature.md
 * 
 * Provides client-side wrapper for the copy_workflow RPC and helper utilities
 */

import { getSupabaseClient } from "@/lib/supabase/client";
import type { FutureStateStatus } from "@/types";

const supabase = getSupabaseClient();

// ============================================
// TYPES
// ============================================

export type CopySourceType = "current" | "future_state";

export interface CopyWorkflowInput {
  sourceProcessId: string;
  newName: string;
  sourceType?: CopySourceType;
  futureStateId?: string;
  options?: Record<string, unknown>;
}

export interface CopyWorkflowResult {
  success: boolean;
  newWorkflowId?: string;
  error?: string;
}

export interface FutureStateSource {
  id: string;
  name: string;
  version: number;
  status: FutureStateStatus;
  created_at: string;
  node_count: number;
}

// ============================================
// COPY WORKFLOW
// ============================================

/**
 * Copy a workflow using the atomic RPC function
 * Implements AC-3.1 (Structural Duplication), AC-3.2 (Data Isolation), AC-3.3 (ID Re-Creation)
 */
export async function copyWorkflow(input: CopyWorkflowInput): Promise<CopyWorkflowResult> {
  const { sourceProcessId, newName, sourceType = "current", futureStateId, options = {} } = input;

  try {
    const { data, error } = await supabase.rpc("copy_workflow", {
      p_source_process_id: sourceProcessId,
      p_new_name: newName,
      p_source_type: sourceType,
      p_future_state_id: futureStateId || null,
      p_options: options,
    });

    if (error) {
      console.error("[copyWorkflow] RPC error:", error);
      return {
        success: false,
        error: error.message || "Failed to copy workflow",
      };
    }

    return {
      success: true,
      newWorkflowId: data as string,
    };
  } catch (err) {
    console.error("[copyWorkflow] Unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// ============================================
// FUTURE STATE SOURCES
// ============================================

/**
 * Get available future states that can be used as copy sources (AC-2.3)
 */
export async function getWorkflowFutureStates(processId: string): Promise<FutureStateSource[]> {
  try {
    const { data, error } = await supabase.rpc("get_workflow_future_states", {
      p_process_id: processId,
    });

    if (error) {
      console.error("[getWorkflowFutureStates] RPC error:", error);
      return [];
    }

    return (data || []) as FutureStateSource[];
  } catch (err) {
    console.error("[getWorkflowFutureStates] Unexpected error:", err);
    return [];
  }
}

// ============================================
// LINEAGE HELPERS
// ============================================

/**
 * Get the source workflow name for lineage display (AC-4.2)
 */
export async function getSourceWorkflowName(sourceProcessId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("processes")
    .select("name")
    .eq("id", sourceProcessId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.name;
}

/**
 * Get the source future state name for lineage display (AC-4.2)
 */
export async function getSourceFutureStateName(futureStateId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("future_states")
    .select("name, version")
    .eq("id", futureStateId)
    .single();

  if (error || !data) {
    return null;
  }

  return `${data.name} (v${data.version})`;
}

// ============================================
// NAMING HELPERS
// ============================================

/**
 * Generate default copy name (AC-2.2)
 */
export function generateCopyName(originalName: string): string {
  // If already ends with (Copy) or (Copy N), increment the number
  const copyPattern = /\s*\(Copy(?:\s+(\d+))?\)\s*$/;
  const match = originalName.match(copyPattern);

  if (match) {
    const existingNumber = match[1] ? parseInt(match[1], 10) : 1;
    const baseName = originalName.replace(copyPattern, "");
    return `${baseName} (Copy ${existingNumber + 1})`;
  }

  return `${originalName} (Copy)`;
}

// ============================================
// PERMISSION HELPERS
// ============================================

/**
 * Check if user can edit a workflow (for copy permission - AC-1.3)
 * This mirrors the RLS policy: owner OR admin/facilitator
 */
export function canEditWorkflow(
  workflow: { created_by: string },
  user: { id: string; role: string }
): boolean {
  const isOwner = workflow.created_by === user.id;
  const isRoleEditor = user.role === "admin" || user.role === "facilitator";
  return isOwner || isRoleEditor;
}

