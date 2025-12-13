// User roles
export type UserRole = "admin" | "facilitator" | "participant";

// Session status
export type SessionStatus = "draft" | "active" | "completed" | "archived";

// Training content types
export type TrainingContentType = "video" | "slides" | "article" | "quiz";

// Step types for workflow
export type StepType = "action" | "decision" | "start" | "end" | "subprocess";

// Waste nature
export type WasteNature = "digital" | "physical" | "both";

// Organization
export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// User
export interface User {
  id: string;
  org_id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// Process/Workflow
export interface Process {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Process Step
export interface ProcessStep {
  id: string;
  process_id: string;
  step_name: string;
  description?: string;
  lane: string;
  step_type: StepType;
  order_index: number;
  lead_time_minutes?: number;
  cycle_time_minutes?: number;
  position_x?: number;
  position_y?: number;
  created_at: string;
  updated_at: string;
}

// Waste Type
export interface WasteType {
  id: string;
  code: string;
  name: string;
  description: string;
  category: "core_lean" | "digital";
  digital_examples: string[];
  icon?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

// Session
export interface Session {
  id: string;
  name: string;
  process_id: string;
  facilitator_id: string;
  status: SessionStatus;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
}

// Session Participant
export interface SessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  joined_at: string;
  last_active_at: string;
}

// Observation
export interface Observation {
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
  attachments?: string[];
  created_at: string;
  updated_at: string;
}

// Observation Waste Link
export interface ObservationWasteLink {
  id: string;
  observation_id: string;
  waste_type_id: string;
}

// Training Content
export interface TrainingContent {
  id: string;
  org_id?: string;
  title: string;
  type: TrainingContentType;
  file_url?: string;
  content?: string;
  description?: string;
  order_index: number;
  duration_minutes?: number;
  created_at: string;
  updated_at: string;
}

// Training Progress
export interface TrainingProgress {
  id: string;
  user_id: string;
  content_id: string;
  completed: boolean;
  quiz_score?: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// Extended types with relations
export interface ProcessWithSteps extends Process {
  process_steps: ProcessStep[];
}

export interface SessionWithDetails extends Session {
  process: Process;
  facilitator: User;
  participants: SessionParticipant[];
  observations: Observation[];
}

export interface ObservationWithWasteTypes extends Observation {
  waste_types: WasteType[];
  user: User;
}

export interface StepWithObservations extends ProcessStep {
  observations: ObservationWithWasteTypes[];
  total_priority_score: number;
  observation_count: number;
}

// Analytics types
export interface WasteDistribution {
  waste_type_id: string;
  waste_type_name: string;
  waste_type_code: string;
  count: number;
  percentage: number;
  avg_priority: number;
}

export interface LaneWasteStats {
  lane: string;
  total_observations: number;
  total_priority: number;
  avg_priority: number;
  waste_types: WasteDistribution[];
}

export interface StepHeatmapData {
  step_id: string;
  step_name: string;
  lane: string;
  position_x: number;
  position_y: number;
  total_priority: number;
  observation_count: number;
  intensity: "low" | "medium" | "high" | "critical";
}

export interface InsightRecommendation {
  id: string;
  step_id: string;
  step_name: string;
  priority_score: number;
  waste_types: string[];
  recommendation: string;
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
}

// Form types
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
  attachments?: File[];
}

export interface CreateSessionInput {
  name: string;
  process_id: string;
}

export interface CreateProcessInput {
  name: string;
  description?: string;
}

export interface CreateProcessStepInput {
  process_id: string;
  step_name: string;
  description?: string;
  lane: string;
  step_type: StepType;
  order_index: number;
  position_x?: number;
  position_y?: number;
}

// React Flow types
export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    step: ProcessStep;
    isSelected: boolean;
    observationCount: number;
    priorityScore: number;
    heatmapIntensity?: "low" | "medium" | "high" | "critical";
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  style?: Record<string, unknown>;
}

// Swimlane types
export interface Swimlane {
  id: string;
  name: string;
  color: string;
  steps: ProcessStep[];
}

