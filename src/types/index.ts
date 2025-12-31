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

// Copy source type for workflow lineage
export type CopySourceType = "original" | "current" | "future_state";

// Process/Workflow
export interface Process {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Lineage metadata (for copied workflows)
  copied_from_process_id?: string | null;
  copied_from_future_state_id?: string | null;
  copy_source_type?: CopySourceType;
  copied_by?: string | null;
  copied_at?: string | null;
}

// Process Lane (Swimlane) - persisted per workflow
export interface ProcessLane {
  id: string;
  process_id: string;
  name: string;
  order_index: number;
  bg_color?: string | null;
  border_color?: string | null;
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
  // Stored as JSONB in Postgres; Supabase returns this as a JS object at runtime.
  // We keep this flexible and narrow it at usage sites (video/slides/article/quiz).
  content?: unknown;
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
  user?: Partial<User> & { id: string; name: string; email: string };
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

// ============================================
// FUTURE STATE STUDIO TYPES
// ============================================

// Enums
export type ThemeStatus = "draft" | "confirmed" | "rejected";
export type SolutionStatus = "draft" | "accepted" | "rejected";
export type SolutionBucket = "eliminate" | "modify" | "create";
export type EffortLevel = "low" | "medium" | "high";
export type FutureStateStatus = "draft" | "published";
export type NodeAction = "keep" | "modify" | "remove" | "new";
export type AgentType = "synthesis" | "solutions" | "sequencing" | "design" | "step_design";
export type AgentRunStatus = "queued" | "running" | "succeeded" | "failed";

// Step Design Status Enums
export type StepDesignStatus = "strategy_only" | "needs_step_design" | "step_design_complete";
export type StepDesignVersionStatus = "draft" | "accepted" | "archived";
export type ImplementationItemType = "solution" | "step_design_option";

// Insight Theme (Synthesis)
export interface InsightTheme {
  id: string;
  session_id: string;
  name: string;
  summary?: string;
  confidence?: string;
  root_cause_hypotheses: string[];
  status: ThemeStatus;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  revision: number;
}

export interface InsightThemeObservation {
  id: string;
  theme_id: string;
  observation_id: string;
  created_at: string;
}

export interface InsightThemeStep {
  id: string;
  theme_id: string;
  step_id: string;
  created_at: string;
}

export interface InsightThemeWasteType {
  id: string;
  theme_id: string;
  waste_type_id: string;
  created_at: string;
}

// Extended theme with relations
export interface InsightThemeWithRelations extends InsightTheme {
  observations?: ObservationWithWasteTypes[];
  steps?: ProcessStep[];
  waste_types?: WasteType[];
  creator?: User;
}

// Solution Card
export interface SolutionCard {
  id: string;
  session_id: string;
  bucket: SolutionBucket;
  title: string;
  description?: string;
  expected_impact?: string;
  effort_level?: EffortLevel;
  risks: string[];
  dependencies: string[];
  recommended_wave?: string;
  status: SolutionStatus;
  step_design_status: StepDesignStatus;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  revision: number;
}

export interface SolutionTheme {
  id: string;
  solution_id: string;
  theme_id: string;
  created_at: string;
}

export interface SolutionStep {
  id: string;
  solution_id: string;
  step_id: string;
  created_at: string;
}

export interface SolutionObservation {
  id: string;
  solution_id: string;
  observation_id: string;
  created_at: string;
}

// Extended solution with relations
export interface SolutionCardWithRelations extends SolutionCard {
  themes?: InsightTheme[];
  steps?: ProcessStep[];
  observations?: Observation[];
  creator?: User;
  wave?: ImplementationWave;
}

// Implementation Wave (Sequencing)
export interface ImplementationWave {
  id: string;
  session_id: string;
  name: string;
  order_index: number;
  start_estimate?: string;
  end_estimate?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  revision: number;
}

export interface WaveSolution {
  id: string;
  wave_id: string;
  solution_id: string;
  order_index: number;
  created_at: string;
}

export interface SolutionDependency {
  id: string;
  solution_id: string;
  depends_on_solution_id: string;
  created_at: string;
}

// Extended wave with solutions
export interface ImplementationWaveWithSolutions extends ImplementationWave {
  solutions?: SolutionCardWithRelations[];
}

// Future State
export interface FutureState {
  id: string;
  process_id: string;
  session_id: string;
  name: string;
  version: number;
  status: FutureStateStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Future State Node
export interface FutureStateNode {
  id: string;
  future_state_id: string;
  source_step_id?: string;
  name: string;
  description?: string;
  lane: string;
  step_type: StepType;
  lead_time_minutes?: number;
  cycle_time_minutes?: number;
  position_x: number;
  position_y: number;
  action: NodeAction;
  modified_fields: Record<string, unknown>;
  linked_solution_id?: string;
  step_design_status: StepDesignStatus;
  active_step_design_version_id?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  revision: number;
}

// Future State Edge
export interface FutureStateEdge {
  id: string;
  future_state_id: string;
  source_node_id: string;
  target_node_id: string;
  label?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// Extended future state with nodes and edges
export interface FutureStateWithGraph extends FutureState {
  nodes: FutureStateNode[];
  edges: FutureStateEdge[];
  creator?: User;
}

// Agent Run (Audit)
export interface AgentRun {
  id: string;
  session_id: string;
  agent_type: AgentType;
  input_hash: string;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  model?: string;
  provider?: string;
  status: AgentRunStatus;
  error?: string;
  started_at?: string;
  completed_at?: string;
  created_by?: string;
  created_at: string;
}

// Studio Lock (Collaboration)
export interface StudioLock {
  id: string;
  session_id: string;
  entity_type: string;
  entity_id: string;
  locked_by: string;
  locked_at: string;
  expires_at: string;
}

// Extended lock with user info
export interface StudioLockWithUser extends StudioLock {
  user?: User;
}

// ============================================
// FUTURE STATE STUDIO INPUT TYPES
// ============================================

export interface CreateInsightThemeInput {
  session_id: string;
  name: string;
  summary?: string;
  confidence?: string;
  root_cause_hypotheses?: string[];
  observation_ids?: string[];
  step_ids?: string[];
  waste_type_ids?: string[];
}

export interface UpdateInsightThemeInput {
  name?: string;
  summary?: string;
  confidence?: string;
  root_cause_hypotheses?: string[];
  status?: ThemeStatus;
  observation_ids?: string[];
  step_ids?: string[];
  waste_type_ids?: string[];
}

export interface CreateSolutionCardInput {
  session_id: string;
  bucket: SolutionBucket;
  title: string;
  description?: string;
  expected_impact?: string;
  effort_level?: EffortLevel;
  risks?: string[];
  dependencies?: string[];
  recommended_wave?: string;
  theme_ids?: string[];
  step_ids?: string[];
  observation_ids?: string[];
}

export interface UpdateSolutionCardInput {
  bucket?: SolutionBucket;
  title?: string;
  description?: string;
  expected_impact?: string;
  effort_level?: EffortLevel;
  risks?: string[];
  dependencies?: string[];
  recommended_wave?: string;
  status?: SolutionStatus;
  theme_ids?: string[];
  step_ids?: string[];
  observation_ids?: string[];
}

export interface CreateFutureStateInput {
  process_id: string;
  session_id: string;
  name: string;
}

export interface CreateFutureStateNodeInput {
  future_state_id: string;
  source_step_id?: string;
  name: string;
  description?: string;
  lane: string;
  step_type?: StepType;
  lead_time_minutes?: number;
  cycle_time_minutes?: number;
  position_x: number;
  position_y: number;
  action: NodeAction;
  modified_fields?: Record<string, unknown>;
  linked_solution_id?: string;
}

export interface UpdateFutureStateNodeInput {
  name?: string;
  description?: string;
  lane?: string;
  step_type?: StepType;
  lead_time_minutes?: number;
  cycle_time_minutes?: number;
  position_x?: number;
  position_y?: number;
  action?: NodeAction;
  modified_fields?: Record<string, unknown>;
  linked_solution_id?: string;
}

export interface CreateFutureStateEdgeInput {
  future_state_id: string;
  source_node_id: string;
  target_node_id: string;
  label?: string;
  order_index?: number;
}

// ============================================
// STUDIO STAGE TYPES
// ============================================

export type StudioStage =
  | "landing"
  | "synthesis"
  | "solutions"
  | "sequencing"
  | "designer"
  | "compare"
  | "export";

// ============================================
// PRESENCE USER FOR REALTIME
// ============================================

export interface PresenceUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  currentStage?: string;
  cursor?: { x: number; y: number };
  editingEntity?: { type: string; id: string };
  stepDesignActivity?: {
    nodeId: string;
    action: string;
    timestamp: number;
  };
}

export interface StudioProgress {
  session_id: string;
  synthesis_complete: boolean;
  solutions_complete: boolean;
  sequencing_complete: boolean;
  design_complete: boolean;
  themes_count: number;
  solutions_count: number;
  future_states_count: number;
}

// ============================================
// AGENT OUTPUT SCHEMAS
// ============================================

export interface SynthesisAgentOutput {
  themes: Array<{
    name: string;
    summary: string;
    confidence: "high" | "medium" | "low";
    root_cause_hypotheses: string[];
    observation_ids: string[];
    step_ids: string[];
    waste_type_ids: string[];
  }>;
}

export interface SolutionsAgentOutput {
  solutions: Array<{
    bucket: SolutionBucket;
    title: string;
    description: string;
    expected_impact: string;
    effort_level: EffortLevel;
    risks: string[];
    dependencies: string[];
    recommended_wave: string;
    theme_ids: string[];
    step_ids: string[];
    observation_ids: string[];
  }>;
}

export interface SequencingAgentOutput {
  waves: Array<{
    name: string;
    order_index: number;
    start_estimate: string;
    end_estimate: string;
    solution_ids: string[];
  }>;
  dependencies: Array<{
    solution_id: string;
    depends_on_solution_id: string;
  }>;
}

export interface DesignAgentOutput {
  future_state: {
    name: string;
    nodes: Array<{
      source_step_id?: string;
      name: string;
      description?: string;
      lane: string;
      step_type: StepType;
      lead_time_minutes?: number;
      cycle_time_minutes?: number;
      position_x: number;
      position_y: number;
      action: NodeAction;
      modified_fields: Record<string, unknown>;
      linked_solution_id?: string;
      explanation?: string;
    }>;
    edges: Array<{
      source_node_index: number;
      target_node_index: number;
      label?: string;
    }>;
  };
}

// ============================================
// STEP-LEVEL DESIGN TYPES
// ============================================

// Step Context (Inline Q&A + Context Capture)
export interface StepContext {
  id: string;
  session_id: string;
  future_state_id: string;
  node_id: string;
  context_json: StepContextData;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  revision: number;
}

// Structured context data for step design
export interface StepContextData {
  questions?: StepContextQuestion[];
  purpose?: string;
  inputs?: string[];
  outputs?: string[];
  constraints?: string[];
  assumptions?: string[];
  [key: string]: unknown;
}

export interface StepContextQuestion {
  id: string;
  question: string;
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
  required: boolean;
}

// Step Design Version
export interface StepDesignVersion {
  id: string;
  session_id: string;
  future_state_id: string;
  node_id: string;
  version: number;
  status: StepDesignVersionStatus;
  selected_option_id?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  revision: number;
}

// Step Design Option (2-3 AI-generated alternatives)
export interface StepDesignOption {
  id: string;
  version_id: string;
  option_key: "A" | "B" | "C";
  title: string;
  summary?: string;
  changes?: string;
  waste_addressed: string[];
  risks: string[];
  dependencies: string[];
  confidence: number;
  research_mode_used: boolean;
  pattern_labels: string[];
  design_json: StepDesignData;
  created_at: string;
}

// Structured step design data (purpose, inputs, actions, etc.)
export interface StepDesignData {
  purpose?: string;
  inputs?: StepDesignInput[];
  actions?: StepDesignAction[];
  decisions?: StepDesignDecision[];
  outputs?: StepDesignOutput[];
  controls?: StepDesignControl[];
  timing?: {
    estimated_lead_time_minutes?: number;
    estimated_cycle_time_minutes?: number;
  };
  [key: string]: unknown;
}

export interface StepDesignInput {
  name: string;
  source?: string;
  required: boolean;
  description?: string;
}

export interface StepDesignAction {
  order: number;
  description: string;
  performer?: string;
  system?: string;
  notes?: string;
}

export interface StepDesignDecision {
  question: string;
  options: Array<{ label: string; outcome: string }>;
  default?: string;
}

export interface StepDesignOutput {
  name: string;
  destination?: string;
  format?: string;
  description?: string;
}

export interface StepDesignControl {
  type: "approval" | "validation" | "audit" | "compliance" | "other";
  description: string;
  owner?: string;
  frequency?: string;
}

// Design Assumption
export interface DesignAssumption {
  id: string;
  option_id: string;
  assumption: string;
  risk_if_wrong?: string;
  validation_method?: string;
  validated: boolean;
  validated_at?: string;
  validated_by?: string;
  created_at: string;
}

// Extended Step Design Version with relations
export interface StepDesignVersionWithRelations extends StepDesignVersion {
  options?: StepDesignOptionWithAssumptions[];
  context?: StepContext;
  node?: FutureStateNode;
  selectedOption?: StepDesignOption;
}

export interface StepDesignOptionWithAssumptions extends StepDesignOption {
  assumptions?: DesignAssumption[];
}

// ============================================
// IMPLEMENTATION ITEMS (Sub-solution Sequencing)
// ============================================

export interface ImplementationItem {
  id: string;
  session_id: string;
  label: string;
  type: ImplementationItemType;
  solution_id?: string;
  step_design_option_id?: string;
  created_by?: string;
  created_at: string;
}

export interface WaveItem {
  id: string;
  wave_id: string;
  item_id: string;
  order_index: number;
  created_at: string;
}

export interface ImplementationDependency {
  id: string;
  item_id: string;
  depends_on_item_id: string;
  created_at: string;
}

// Extended Implementation Item with relations
export interface ImplementationItemWithRelations extends ImplementationItem {
  solution?: SolutionCard;
  stepDesignOption?: StepDesignOption;
  wave?: ImplementationWave;
  dependsOn?: ImplementationItem[];
  dependents?: ImplementationItem[];
}

// Extended Wave with items (new style)
export interface ImplementationWaveWithItems extends ImplementationWave {
  items?: ImplementationItemWithRelations[];
  solutions?: SolutionCardWithRelations[]; // Legacy support
}

// ============================================
// STEP DESIGN INPUT TYPES
// ============================================

export interface CreateStepContextInput {
  session_id: string;
  future_state_id: string;
  node_id: string;
  context_json?: StepContextData;
  notes?: string;
}

export interface UpdateStepContextInput {
  context_json?: StepContextData;
  notes?: string;
}

export interface RunStepDesignAgentInput {
  session_id: string;
  future_state_id: string;
  node_id: string;
  research_mode?: boolean;
  selected_solution_ids?: string[];
}

export interface SelectStepDesignOptionInput {
  version_id: string;
  option_id: string;
}

// ============================================
// STEP DESIGN AGENT OUTPUT
// ============================================

export interface StepDesignAgentOutput {
  questions?: Array<{
    id: string;
    question: string;
    required: boolean;
    context_field?: string;
  }>;
  context_needed: boolean;
  options: Array<{
    option_key: "A" | "B" | "C";
    title: string;
    summary: string;
    changes: string;
    waste_addressed: string[];
    risks: string[];
    dependencies: string[];
    confidence: number;
    pattern_labels?: string[];
    design: StepDesignData;
    assumptions: Array<{
      assumption: string;
      risk_if_wrong?: string;
      validation_method?: string;
    }>;
  }>;
}

// ============================================
// WORKFLOW CONTEXT TYPES
// ============================================

// Workflow Context (structured overview for AI agents)
export interface WorkflowContext {
  id: string;
  process_id: string;
  // Core descriptors
  purpose?: string;
  business_value?: string;
  trigger_events: string[];
  end_outcomes: string[];
  // Operational context
  volume_frequency?: string;
  sla_targets?: string;
  compliance_requirements: string[];
  // Pain points
  known_pain_points: string[];
  previous_improvement_attempts: string[];
  // Constraints and assumptions
  constraints: string[];
  assumptions: string[];
  // Metadata
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

// Workflow Stakeholder
export interface WorkflowStakeholder {
  id: string;
  context_id: string;
  role: string;
  responsibilities?: string;
  pain_points?: string;
  order_index: number;
  created_at?: string;
}

// Workflow System
export interface WorkflowSystem {
  id: string;
  context_id: string;
  name: string;
  role?: string;
  integration_notes?: string;
  order_index: number;
  created_at?: string;
}

// Workflow Metric
export interface WorkflowMetric {
  id: string;
  context_id: string;
  name: string;
  current_value?: string;
  target_value?: string;
  order_index: number;
  created_at?: string;
}

// Extended Workflow Context with relations
export interface WorkflowContextWithRelations extends WorkflowContext {
  stakeholders: WorkflowStakeholder[];
  systems: WorkflowSystem[];
  metrics: WorkflowMetric[];
}

// Context completeness tracking
export interface ContextCompleteness {
  required: {
    purpose: boolean;
    business_value: boolean;
    trigger_events: boolean;
    end_outcomes: boolean;
  };
  recommended: {
    stakeholders: boolean;
    systems: boolean;
    volume_frequency: boolean;
  };
  optional: {
    sla_targets: boolean;
    constraints: boolean;
    metrics: boolean;
  };
  overallScore: number; // 0-100
}

// Input types for creating/updating context
export interface UpsertWorkflowContextInput {
  purpose?: string;
  business_value?: string;
  trigger_events?: string[];
  end_outcomes?: string[];
  volume_frequency?: string;
  sla_targets?: string;
  compliance_requirements?: string[];
  known_pain_points?: string[];
  previous_improvement_attempts?: string[];
  constraints?: string[];
  assumptions?: string[];
}

export interface UpsertWorkflowStakeholderInput {
  id?: string;
  role: string;
  responsibilities?: string;
  pain_points?: string;
  order_index?: number;
}

export interface UpsertWorkflowSystemInput {
  id?: string;
  name: string;
  role?: string;
  integration_notes?: string;
  order_index?: number;
}

export interface UpsertWorkflowMetricInput {
  id?: string;
  name: string;
  current_value?: string;
  target_value?: string;
  order_index?: number;
}

