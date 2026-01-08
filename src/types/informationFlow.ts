// ============================================
// Information Flow Types
// ============================================

import type { WasteType, Observation, ProcessStep } from "./index";

// Flow type enum
export type FlowType = "data" | "document" | "approval" | "system" | "notification";

// State type for current vs future
export type FlowStateType = "current" | "future";

// Flow status
export type FlowStatus = "active" | "deprecated" | "proposed";

// I/O type for SIPOC
export type IOType = "input" | "output";

// Line style options
export type LineStyle = "solid" | "dashed" | "dotted";

// Line thickness options
export type LineThickness = "thin" | "normal" | "thick";

// ============================================
// Style Types
// ============================================

export interface FlowStyleOverride {
  color?: string;
  lineStyle?: LineStyle;
  thickness?: LineThickness;
}

export interface FlowEdgeStyle {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  animated?: boolean;
}

// ============================================
// Core Information Flow
// ============================================

export interface InformationFlow {
  id: string;
  process_id?: string;
  future_state_id?: string;
  state_type: FlowStateType;

  // Endpoints
  source_step_id?: string;
  target_step_id?: string;
  source_node_id?: string;
  target_node_id?: string;

  // Core properties
  name: string;
  description?: string;
  flow_type: FlowType;
  status: FlowStatus;

  // Volume
  volume_per_day?: number;
  frequency?: string;
  is_automated: boolean;
  is_real_time: boolean;

  // Quality scores (1-5)
  completeness_score?: number;
  accuracy_score?: number;
  timeliness_score?: number;
  quality_score?: number; // Computed (3-15)

  // Metadata (includes style overrides)
  metadata: {
    style?: FlowStyleOverride;
    [key: string]: unknown;
  };

  // Audit
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  revision: number;
}

// Extended with relations
export interface InformationFlowWithRelations extends InformationFlow {
  waste_types?: WasteType[];
  observations?: Observation[];
  source_step?: ProcessStep;
  target_step?: ProcessStep;
}

// ============================================
// Flow Waste Links
// ============================================

export interface FlowWasteLink {
  id: string;
  flow_id: string;
  waste_type_id: string;
  notes?: string;
  created_at: string;
}

// ============================================
// Flow Observation Links
// ============================================

export interface FlowObservationLink {
  id: string;
  flow_id: string;
  observation_id: string;
  created_at: string;
}

// ============================================
// Step I/O (SIPOC-Style)
// ============================================

export interface StepIO {
  id: string;
  step_id?: string;
  node_id?: string;
  io_type: IOType;
  name: string;
  description?: string;
  data_type?: string;
  source_destination?: string;
  is_required: boolean;
  linked_flow_id?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// Extended with flow
export interface StepIOWithFlow extends StepIO {
  linked_flow?: InformationFlow;
}

// ============================================
// Flow Comparison
// ============================================

export interface FlowComparisonSnapshot {
  id: string;
  session_id: string;
  future_state_id: string;
  current_flows_count: number;
  future_flows_count: number;
  eliminated_flows: number;
  added_flows: number;
  modified_flows: number;
  avg_quality_improvement?: number;
  waste_reduction_count?: number;
  comparison_data: FlowComparisonData;
  created_at: string;
}

export interface FlowComparisonData {
  eliminated: FlowComparisonItem[];
  added: FlowComparisonItem[];
  modified: FlowComparisonItem[];
  unchanged: FlowComparisonItem[];
}

export interface FlowComparisonItem {
  current_flow_id?: string;
  future_flow_id?: string;
  name: string;
  change_type: "eliminated" | "added" | "modified" | "unchanged";
  quality_change?: number;
  waste_changes?: {
    removed: string[];
    added: string[];
  };
}

// ============================================
// Input Types for CRUD
// ============================================

export interface CreateInformationFlowInput {
  process_id?: string;
  future_state_id?: string;
  state_type: FlowStateType;
  source_step_id?: string;
  target_step_id?: string;
  source_node_id?: string;
  target_node_id?: string;
  name: string;
  description?: string;
  flow_type: FlowType;
  status?: FlowStatus;
  volume_per_day?: number;
  frequency?: string;
  is_automated?: boolean;
  is_real_time?: boolean;
  completeness_score?: number;
  accuracy_score?: number;
  timeliness_score?: number;
  metadata?: {
    style?: FlowStyleOverride;
    [key: string]: unknown;
  };
  waste_type_ids?: string[];
  observation_ids?: string[];
}

export interface UpdateInformationFlowInput {
  name?: string;
  description?: string;
  flow_type?: FlowType;
  status?: FlowStatus;
  volume_per_day?: number;
  frequency?: string;
  is_automated?: boolean;
  is_real_time?: boolean;
  completeness_score?: number;
  accuracy_score?: number;
  timeliness_score?: number;
  metadata?: {
    style?: FlowStyleOverride;
    [key: string]: unknown;
  };
  waste_type_ids?: string[];
  observation_ids?: string[];
}

export interface CreateStepIOInput {
  step_id?: string;
  node_id?: string;
  io_type: IOType;
  name: string;
  description?: string;
  data_type?: string;
  source_destination?: string;
  is_required?: boolean;
  linked_flow_id?: string;
  order_index?: number;
}

export interface UpdateStepIOInput {
  name?: string;
  description?: string;
  data_type?: string;
  source_destination?: string;
  is_required?: boolean;
  linked_flow_id?: string;
  order_index?: number;
}

// ============================================
// Flow Type Configuration
// ============================================

export interface FlowTypeConfig {
  type: FlowType;
  color: string;
  label: string;
  icon: string;
  defaultStyle: FlowEdgeStyle;
}

// Flow type visual configuration with defaults
export const FLOW_TYPE_CONFIG: Record<FlowType, FlowTypeConfig> = {
  data: {
    type: "data",
    color: "#3B82F6", // Blue
    label: "Data",
    icon: "Database",
    defaultStyle: { stroke: "#3B82F6", strokeWidth: 2 },
  },
  document: {
    type: "document",
    color: "#10B981", // Green
    label: "Document",
    icon: "FileText",
    defaultStyle: { stroke: "#10B981", strokeWidth: 2 },
  },
  approval: {
    type: "approval",
    color: "#F59E0B", // Amber
    label: "Approval",
    icon: "CheckCircle",
    defaultStyle: { stroke: "#F59E0B", strokeWidth: 2, strokeDasharray: "8,4" },
  },
  system: {
    type: "system",
    color: "#8B5CF6", // Purple
    label: "System",
    icon: "Cpu",
    defaultStyle: { stroke: "#8B5CF6", strokeWidth: 2 },
  },
  notification: {
    type: "notification",
    color: "#EC4899", // Pink
    label: "Notification",
    icon: "Bell",
    defaultStyle: { stroke: "#EC4899", strokeWidth: 2, strokeDasharray: "2,2" },
  },
};

// Line thickness values
export const LINE_THICKNESS_CONFIG: Record<LineThickness, number> = {
  thin: 1,
  normal: 2,
  thick: 3,
};

// Line style dash arrays
export const LINE_STYLE_CONFIG: Record<LineStyle, string | undefined> = {
  solid: undefined,
  dashed: "8,4",
  dotted: "2,2",
};

// Quality score thresholds
export const QUALITY_THRESHOLDS = {
  poor: { max: 6, color: "#EF4444", label: "Poor" },
  fair: { max: 9, color: "#F59E0B", label: "Fair" },
  good: { max: 12, color: "#10B981", label: "Good" },
  excellent: { max: 15, color: "#3B82F6", label: "Excellent" },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get the effective style for a flow, merging type defaults with overrides
 */
export function getFlowEdgeStyle(flow: InformationFlow): FlowEdgeStyle {
  const typeConfig = FLOW_TYPE_CONFIG[flow.flow_type];
  const override = flow.metadata?.style;

  let strokeWidth = typeConfig.defaultStyle.strokeWidth;
  let strokeDasharray = typeConfig.defaultStyle.strokeDasharray;
  let stroke = typeConfig.color;

  // Apply overrides
  if (override?.color) {
    stroke = override.color;
  }

  if (override?.thickness) {
    strokeWidth = LINE_THICKNESS_CONFIG[override.thickness];
  }

  if (override?.lineStyle) {
    strokeDasharray = LINE_STYLE_CONFIG[override.lineStyle];
  }

  return {
    stroke,
    strokeWidth,
    strokeDasharray,
    animated: flow.is_real_time,
  };
}

/**
 * Get quality level from score
 */
export function getQualityLevel(
  score: number | undefined
): keyof typeof QUALITY_THRESHOLDS {
  if (!score || score <= QUALITY_THRESHOLDS.poor.max) return "poor";
  if (score <= QUALITY_THRESHOLDS.fair.max) return "fair";
  if (score <= QUALITY_THRESHOLDS.good.max) return "good";
  return "excellent";
}

/**
 * Get quality color from score
 */
export function getQualityColor(score: number | undefined): string {
  const level = getQualityLevel(score);
  return QUALITY_THRESHOLDS[level].color;
}
