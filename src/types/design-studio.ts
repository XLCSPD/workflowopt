/**
 * Design Studio Types
 * 
 * Types for the Future State Design Studio including
 * annotations, lanes, versioning, and command patterns.
 */

import type { FutureStateNode, FutureStateEdge, StepType, NodeAction } from "./index";

// ============================================
// ANNOTATION TYPES
// ============================================

export type AnnotationType = "note" | "guardrail" | "assumption" | "risk" | "instruction";

export type AnnotationPriority = "low" | "medium" | "high" | "critical";

export interface FutureStateAnnotation {
  id: string;
  future_state_id: string;
  node_id?: string | null;
  type: AnnotationType;
  title: string;
  content?: string | null;
  priority: AnnotationPriority;
  resolved: boolean;
  position_x?: number | null;
  position_y?: number | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// LANE TYPES
// ============================================

export type LaneColor = "blue" | "emerald" | "amber" | "purple" | "rose" | "slate" | "cyan" | "orange";

export interface FutureStateLane {
  id: string;
  future_state_id: string;
  name: string;
  order_index: number;
  color: LaneColor;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// COMMAND PATTERN FOR UNDO/REDO
// ============================================

export type DesignCommandType =
  | "create_node"
  | "update_node"
  | "delete_node"
  | "move_node"
  | "create_edge"
  | "update_edge"
  | "delete_edge"
  | "create_lane"
  | "update_lane"
  | "delete_lane"
  | "reorder_lanes"
  | "create_annotation"
  | "update_annotation"
  | "delete_annotation"
  | "batch"; // For grouping multiple commands

export interface DesignCommand {
  id: string;
  type: DesignCommandType;
  payload: unknown;
  inverse: unknown; // Data needed to undo
  timestamp: Date;
  description?: string; // Human-readable description for history
}

// Specific command payloads
export interface CreateNodePayload {
  node: Partial<FutureStateNode>;
}

export interface UpdateNodePayload {
  nodeId: string;
  updates: Partial<FutureStateNode>;
  previousValues: Partial<FutureStateNode>;
}

export interface DeleteNodePayload {
  node: FutureStateNode;
  connectedEdges: FutureStateEdge[];
}

export interface MoveNodePayload {
  nodeId: string;
  fromPosition: { x: number; y: number };
  toPosition: { x: number; y: number };
}

export interface CreateEdgePayload {
  edge: Partial<FutureStateEdge>;
}

export interface DeleteEdgePayload {
  edge: FutureStateEdge;
}

export interface CreateLanePayload {
  lane: Partial<FutureStateLane>;
}

export interface UpdateLanePayload {
  laneId: string;
  updates: Partial<FutureStateLane>;
  previousValues: Partial<FutureStateLane>;
}

export interface DeleteLanePayload {
  lane: FutureStateLane;
}

export interface ReorderLanesPayload {
  previousOrder: string[];
  newOrder: string[];
}

export interface CreateAnnotationPayload {
  annotation: Partial<FutureStateAnnotation>;
}

export interface UpdateAnnotationPayload {
  annotationId: string;
  updates: Partial<FutureStateAnnotation>;
  previousValues: Partial<FutureStateAnnotation>;
}

export interface DeleteAnnotationPayload {
  annotation: FutureStateAnnotation;
}

export interface BatchCommandPayload {
  commands: DesignCommand[];
}

// ============================================
// DESIGN STUDIO STATE
// ============================================

export interface DesignStudioState {
  // Mode
  isEditMode: boolean;
  
  // Dirty state tracking
  isDirty: boolean;
  lastSavedAt: Date | null;
  
  // Selection
  selectedNodeIds: string[];
  selectedEdgeId: string | null;
  selectedAnnotationId: string | null;
  
  // Clipboard
  clipboard: ClipboardItem | null;
  
  // Undo/Redo
  undoStack: DesignCommand[];
  redoStack: DesignCommand[];
  
  // Active tool (for toolbox)
  activeTool: ActiveTool | null;
  
  // Loading states
  isSaving: boolean;
  isLoading: boolean;
}

export type ActiveTool = 
  | { type: "select" }
  | { type: "create_node"; stepType: StepType }
  | { type: "create_edge"; sourceNodeId?: string }
  | { type: "create_annotation"; annotationType: AnnotationType }
  | { type: "pan" };

export interface ClipboardItem {
  type: "node" | "nodes" | "annotation";
  data: unknown;
  timestamp: Date;
}

// ============================================
// CONTEXT ACTIONS
// ============================================

export interface DesignStudioActions {
  // Mode
  setEditMode: (enabled: boolean) => void;
  
  // Selection
  selectNode: (nodeId: string, addToSelection?: boolean) => void;
  selectNodes: (nodeIds: string[]) => void;
  deselectNode: (nodeId: string) => void;
  deselectAll: () => void;
  selectEdge: (edgeId: string | null) => void;
  selectAnnotation: (annotationId: string | null) => void;
  
  // Clipboard
  copy: () => void;
  paste: (position?: { x: number; y: number }) => void;
  cut: () => void;
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Tool selection
  setActiveTool: (tool: ActiveTool | null) => void;
  
  // Node CRUD
  createNode: (params: {
    name: string;
    lane: string;
    stepType: StepType;
    positionX: number;
    positionY: number;
    action?: NodeAction;
    linkedSolutionId?: string;
  }) => Promise<FutureStateNode | null>;
  updateNode: (nodeId: string, updates: Partial<FutureStateNode>) => Promise<boolean>;
  deleteNode: (nodeId: string) => Promise<boolean>;
  duplicateNode: (nodeId: string) => Promise<FutureStateNode | null>;
  
  // Edge CRUD
  createEdge: (sourceNodeId: string, targetNodeId: string, label?: string) => Promise<FutureStateEdge | null>;
  updateEdge: (edgeId: string, updates: Partial<FutureStateEdge>) => Promise<boolean>;
  deleteEdge: (edgeId: string) => Promise<boolean>;
  
  // Lane CRUD
  createLane: (name: string, color?: LaneColor, afterLaneId?: string) => Promise<FutureStateLane | null>;
  updateLane: (laneId: string, updates: Partial<FutureStateLane>) => Promise<boolean>;
  deleteLane: (laneId: string) => Promise<boolean>;
  reorderLanes: (laneIds: string[]) => Promise<boolean>;
  
  // Annotation CRUD
  createAnnotation: (params: {
    type: AnnotationType;
    title: string;
    content?: string;
    nodeId?: string;
    positionX?: number;
    positionY?: number;
    priority?: AnnotationPriority;
  }) => Promise<FutureStateAnnotation | null>;
  updateAnnotation: (annotationId: string, updates: Partial<FutureStateAnnotation>) => Promise<boolean>;
  deleteAnnotation: (annotationId: string) => Promise<boolean>;
  resolveAnnotation: (annotationId: string, resolved: boolean) => Promise<boolean>;
  
  // Save/Version
  save: () => Promise<boolean>;
  saveAsNewVersion: (name: string, description?: string) => Promise<string | null>;
  
  // Dirty state
  markDirty: () => void;
  markClean: () => void;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

// Node API
export interface CreateNodeRequest {
  futureStateId: string;
  name: string;
  lane: string;
  stepType: StepType;
  positionX: number;
  positionY: number;
  action?: NodeAction;
  linkedSolutionId?: string;
  description?: string;
}

export interface UpdateNodeRequest {
  nodeId: string;
  updates: Partial<{
    name: string;
    description: string;
    lane: string;
    stepType: StepType;
    positionX: number;
    positionY: number;
    action: NodeAction;
    linkedSolutionId: string | null;
    leadTimeMinutes: number | null;
    cycleTimeMinutes: number | null;
  }>;
}

export interface DeleteNodeRequest {
  nodeId: string;
  cascade?: boolean; // Delete connected edges too
}

// Edge API
export interface CreateEdgeRequest {
  futureStateId: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
}

export interface UpdateEdgeRequest {
  edgeId: string;
  updates: Partial<{
    label: string;
    orderIndex: number;
  }>;
}

export interface DeleteEdgeRequest {
  edgeId: string;
}

// Lane API
export interface CreateLaneRequest {
  futureStateId: string;
  name: string;
  color?: LaneColor;
  orderIndex?: number;
}

export interface UpdateLaneRequest {
  laneId: string;
  updates: Partial<{
    name: string;
    color: LaneColor;
    orderIndex: number;
  }>;
}

export interface DeleteLaneRequest {
  laneId: string;
}

export interface ReorderLanesRequest {
  futureStateId: string;
  laneIds: string[];
}

// Annotation API
export interface CreateAnnotationRequest {
  futureStateId: string;
  type: AnnotationType;
  title: string;
  content?: string;
  nodeId?: string;
  positionX?: number;
  positionY?: number;
  priority?: AnnotationPriority;
}

export interface UpdateAnnotationRequest {
  annotationId: string;
  updates: Partial<{
    type: AnnotationType;
    title: string;
    content: string;
    priority: AnnotationPriority;
    resolved: boolean;
    positionX: number;
    positionY: number;
    nodeId: string | null;
  }>;
}

export interface DeleteAnnotationRequest {
  annotationId: string;
}

// Version API
export interface CreateVersionRequest {
  sessionId: string;
  sourceVersionId: string;
  name: string;
  description?: string;
}

export interface RestoreVersionRequest {
  sessionId: string;
  versionId: string;
}

export interface UpdateVersionRequest {
  versionId: string;
  updates: Partial<{
    name: string;
    description: string;
    isLocked: boolean;
  }>;
}

// ============================================
// TOOLBOX TYPES
// ============================================

export interface ToolboxStepItem {
  type: StepType;
  label: string;
  icon: string;
  description: string;
}

export interface ToolboxAnnotationItem {
  type: AnnotationType;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export const TOOLBOX_STEPS: ToolboxStepItem[] = [
  { type: "start", label: "Start", icon: "Play", description: "Process beginning" },
  { type: "action", label: "Task", icon: "Square", description: "Work activity" },
  { type: "decision", label: "Decision", icon: "Diamond", description: "Branching point" },
  { type: "subprocess", label: "Subprocess", icon: "CircleDot", description: "Nested process" },
  { type: "end", label: "End", icon: "Square", description: "Process completion" },
];

export const TOOLBOX_ANNOTATIONS: ToolboxAnnotationItem[] = [
  { type: "note", label: "Note", icon: "StickyNote", color: "amber", description: "General notes" },
  { type: "guardrail", label: "Guardrail", icon: "Shield", color: "red", description: "Constraints and rules" },
  { type: "assumption", label: "Assumption", icon: "Lightbulb", color: "blue", description: "Design assumptions" },
  { type: "risk", label: "Risk", icon: "AlertTriangle", color: "orange", description: "Known risks" },
  { type: "instruction", label: "Instruction", icon: "Info", color: "green", description: "User guidance" },
];

// ============================================
// LANE COLORS CONFIG
// ============================================

export const LANE_COLORS: Record<LaneColor, { bg: string; border: string; accent: string; text: string }> = {
  blue: { bg: "bg-blue-50", border: "border-blue-200", accent: "bg-blue-400", text: "text-blue-700" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", accent: "bg-emerald-400", text: "text-emerald-700" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", accent: "bg-amber-400", text: "text-amber-700" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", accent: "bg-purple-400", text: "text-purple-700" },
  rose: { bg: "bg-rose-50", border: "border-rose-200", accent: "bg-rose-400", text: "text-rose-700" },
  slate: { bg: "bg-slate-50", border: "border-slate-200", accent: "bg-slate-400", text: "text-slate-700" },
  cyan: { bg: "bg-cyan-50", border: "border-cyan-200", accent: "bg-cyan-400", text: "text-cyan-700" },
  orange: { bg: "bg-orange-50", border: "border-orange-200", accent: "bg-orange-400", text: "text-orange-700" },
};

// ============================================
// ANNOTATION COLORS CONFIG
// ============================================

export const ANNOTATION_COLORS: Record<AnnotationType, { bg: string; border: string; icon: string; text: string }> = {
  note: { bg: "bg-amber-50", border: "border-amber-300", icon: "text-amber-600", text: "text-amber-800" },
  guardrail: { bg: "bg-red-50", border: "border-red-300", icon: "text-red-600", text: "text-red-800" },
  assumption: { bg: "bg-blue-50", border: "border-blue-300", icon: "text-blue-600", text: "text-blue-800" },
  risk: { bg: "bg-orange-50", border: "border-orange-300", icon: "text-orange-600", text: "text-orange-800" },
  instruction: { bg: "bg-green-50", border: "border-green-300", icon: "text-green-600", text: "text-green-800" },
};

