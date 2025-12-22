import { z } from "zod";

// ============================================
// AGENT OUTPUT SCHEMAS (Zod validation)
// ============================================

// UUID validation regex for filtering
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Helper to filter only valid UUIDs from an array
export function filterValidUUIDs(ids: string[]): string[] {
  return ids.filter((id) => UUID_REGEX.test(id));
}

// Confidence level
export const ConfidenceSchema = z.enum(["high", "medium", "low"]);

// Effort level
export const EffortLevelSchema = z.enum(["low", "medium", "high"]);

// Solution bucket
export const SolutionBucketSchema = z.enum(["eliminate", "modify", "create"]);

// Step type
export const StepTypeSchema = z.enum(["action", "decision", "start", "end", "subprocess"]);

// Node action
export const NodeActionSchema = z.enum(["keep", "modify", "remove", "new"]);

// ============================================
// SYNTHESIS AGENT
// ============================================

// Accept any strings from AI, we'll filter valid UUIDs during persistence
export const SynthesisThemeSchema = z.object({
  name: z.string().min(1, "Theme name is required"),
  summary: z.string().min(1, "Theme summary is required"),
  confidence: ConfidenceSchema,
  root_cause_hypotheses: z.array(z.string()).default([]),
  observation_ids: z.array(z.string()).min(1, "At least one observation must be linked"),
  step_ids: z.array(z.string()).default([]),
  waste_type_ids: z.array(z.string()).default([]),
});

export const SynthesisAgentOutputSchema = z.object({
  themes: z.array(SynthesisThemeSchema).min(1, "At least one theme is required"),
});

export type SynthesisAgentOutputType = z.infer<typeof SynthesisAgentOutputSchema>;

// ============================================
// SOLUTIONS AGENT
// ============================================

// Accept any strings from AI, we'll filter valid UUIDs during persistence
export const SolutionCardSchema = z.object({
  bucket: SolutionBucketSchema,
  title: z.string().min(1, "Solution title is required"),
  description: z.string().min(1, "Solution description is required"),
  expected_impact: z.string().min(1, "Expected impact is required"),
  effort_level: EffortLevelSchema,
  risks: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  recommended_wave: z.string().optional(),
  theme_ids: z.array(z.string()).default([]),
  step_ids: z.array(z.string()).default([]),
  observation_ids: z.array(z.string()).default([]),
});

export const SolutionsAgentOutputSchema = z.object({
  solutions: z.array(SolutionCardSchema).min(1, "At least one solution is required"),
});

export type SolutionsAgentOutputType = z.infer<typeof SolutionsAgentOutputSchema>;

// ============================================
// SEQUENCING AGENT
// ============================================

// Accept any strings from AI, we'll filter valid UUIDs during persistence
export const WaveSchema = z.object({
  name: z.string().min(1, "Wave name is required"),
  order_index: z.number().int().min(0),
  start_estimate: z.string().optional(),
  end_estimate: z.string().optional(),
  solution_ids: z.array(z.string()).default([]),
});

export const DependencySchema = z.object({
  solution_id: z.string(),
  depends_on_solution_id: z.string(),
});

export const SequencingAgentOutputSchema = z.object({
  waves: z.array(WaveSchema).min(1, "At least one wave is required"),
  dependencies: z.array(DependencySchema).default([]),
});

export type SequencingAgentOutputType = z.infer<typeof SequencingAgentOutputSchema>;

// ============================================
// DESIGN AGENT
// ============================================

// Accept any strings from AI, we'll validate UUIDs during persistence
export const FutureStateNodeSchema = z.object({
  source_step_id: z.string().optional().nullable(),
  name: z.string().min(1, "Node name is required"),
  description: z.string().optional(),
  lane: z.string().min(1, "Lane is required"),
  step_type: StepTypeSchema.default("action"),
  lead_time_minutes: z.number().int().optional().nullable(),
  cycle_time_minutes: z.number().int().optional().nullable(),
  position_x: z.number(),
  position_y: z.number(),
  action: NodeActionSchema,
  modified_fields: z.record(z.string(), z.unknown()).default({}),
  linked_solution_id: z.string().optional().nullable(),
  explanation: z.string().optional(),
});

export const FutureStateEdgeSchema = z.object({
  source_node_index: z.number().int().min(0),
  target_node_index: z.number().int().min(0),
  label: z.string().optional(),
});

export const DesignAgentOutputSchema = z.object({
  future_state: z.object({
    name: z.string().min(1, "Future state name is required"),
    nodes: z.array(FutureStateNodeSchema).min(1, "At least one node is required"),
    edges: z.array(FutureStateEdgeSchema).default([]),
  }),
});

export type DesignAgentOutputType = z.infer<typeof DesignAgentOutputSchema>;

// ============================================
// STEP DESIGN AGENT
// ============================================

// Step Design Input schema
export const StepDesignInputSchema = z.object({
  name: z.string(),
  source: z.string().optional(),
  required: z.boolean(),
  description: z.string().optional(),
});

// Step Design Action schema
export const StepDesignActionSchema = z.object({
  order: z.number().int(),
  description: z.string(),
  performer: z.string().optional(),
  system: z.string().optional(),
  notes: z.string().optional(),
});

// Step Design Decision schema
export const StepDesignDecisionSchema = z.object({
  question: z.string(),
  options: z.array(z.object({
    label: z.string(),
    outcome: z.string(),
  })),
  default: z.string().optional(),
});

// Step Design Output schema
export const StepDesignOutputSchema = z.object({
  name: z.string(),
  destination: z.string().optional(),
  format: z.string().optional(),
  description: z.string().optional(),
});

// Step Design Control schema
export const StepDesignControlSchema = z.object({
  type: z.enum(["approval", "validation", "audit", "compliance", "other"]),
  description: z.string(),
  owner: z.string().optional(),
  frequency: z.string().optional(),
});

// Full Step Design Data schema
export const StepDesignDataSchema = z.object({
  purpose: z.string().optional(),
  inputs: z.array(StepDesignInputSchema).optional(),
  actions: z.array(StepDesignActionSchema).optional(),
  decisions: z.array(StepDesignDecisionSchema).optional(),
  outputs: z.array(StepDesignOutputSchema).optional(),
  controls: z.array(StepDesignControlSchema).optional(),
  timing: z.object({
    estimated_lead_time_minutes: z.number().int().optional(),
    estimated_cycle_time_minutes: z.number().int().optional(),
  }).optional(),
}).passthrough();

// Design Assumption (from AI)
export const DesignAssumptionFromAISchema = z.object({
  assumption: z.string(),
  risk_if_wrong: z.string().optional(),
  validation_method: z.string().optional(),
});

// Step Design Option (from AI)
export const StepDesignOptionFromAISchema = z.object({
  option_key: z.enum(["A", "B", "C"]),
  title: z.string().min(1, "Option title is required"),
  summary: z.string().min(1, "Option summary is required"),
  changes: z.string(),
  waste_addressed: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  pattern_labels: z.array(z.string()).optional().default([]),
  design: StepDesignDataSchema,
  assumptions: z.array(DesignAssumptionFromAISchema).default([]),
});

// Context Question (from AI)
export const StepDesignQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  required: z.boolean(),
  context_field: z.string().optional(),
});

// Full Step Design Agent Output
export const StepDesignAgentOutputSchema = z.object({
  questions: z.array(StepDesignQuestionSchema).optional().default([]),
  context_needed: z.boolean(),
  options: z.array(StepDesignOptionFromAISchema).min(1).max(3),
});

export type StepDesignAgentOutputType = z.infer<typeof StepDesignAgentOutputSchema>;

// ============================================
// AGENT TYPE MAP
// ============================================

export const AgentOutputSchemas = {
  synthesis: SynthesisAgentOutputSchema,
  solutions: SolutionsAgentOutputSchema,
  sequencing: SequencingAgentOutputSchema,
  design: DesignAgentOutputSchema,
  step_design: StepDesignAgentOutputSchema,
} as const;

export type AgentTypeKey = keyof typeof AgentOutputSchemas;

