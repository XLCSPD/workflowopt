import { z } from "zod";
import { createHash } from "crypto";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  AgentOutputSchemas,
  AgentTypeKey,
} from "./schemas";
import type { AgentRun, AgentRunStatus, WorkflowContextWithRelations } from "@/types";

// ============================================
// TYPES
// ============================================

export interface AgentRunnerConfig {
  sessionId: string;
  agentType: AgentTypeKey;
  inputs: Record<string, unknown>;
  userId: string;
  supabase: SupabaseClient;
  forceRerun?: boolean;
}

export interface AgentRunnerResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  runId: string;
  cached: boolean;
  model?: string;
  provider?: string;
}

interface LLMResponse {
  content: string;
  model: string;
  provider: "openai" | "anthropic";
}

// ============================================
// AGENT PROMPTS
// ============================================

const AGENT_SYSTEM_PROMPTS: Record<AgentTypeKey, string> = {
  synthesis: `You are a Lean process improvement expert specializing in waste analysis synthesis.
Your task is to analyze waste walk observations and cluster them into meaningful themes.
Each theme should represent a coherent pattern of waste or inefficiency.
You must provide evidence-anchored outputs linking each theme to specific observations.
Do NOT propose solutions - focus only on identifying and describing the problems.
Always respond with valid JSON matching the expected schema exactly.`,

  solutions: `You are a Lean process improvement expert specializing in solution design.
Your task is to generate actionable solutions based on identified waste themes.
Categorize solutions into three buckets:
- ELIMINATE: Completely remove wasteful steps or processes
- MODIFY: Improve or streamline existing processes
- CREATE: Introduce new capabilities or processes

Each solution must be linked to the themes and observations it addresses.
Consider effort level, risks, and dependencies for each solution.
Always respond with valid JSON matching the expected schema exactly.`,

  sequencing: `You are a Lean process improvement expert specializing in implementation planning.
Your task is to sequence accepted solutions into implementation waves:
- Immediate / Quick Wins: Can be done now with minimal effort
- 0-30 Days: Short-term improvements
- 30-90 Days: Medium-term initiatives
- 90+ Days: Long-term strategic changes

Consider dependencies between solutions and bundle related changes.
Identify and flag any dependency conflicts or circular dependencies.
Always respond with valid JSON matching the expected schema exactly.`,

  design: `You are a Lean process improvement expert specializing in future state design.
Your task is to generate a future state process map based on accepted solutions.
For each step in the current process, determine if it should be:
- KEEP: Unchanged from current state
- MODIFY: Changed in some way (describe what changes)
- REMOVE: Eliminated entirely
- NEW: A new step being added

Preserve the lane structure and provide clear explanations for each change.
Link changes to the solutions that drive them.
Position nodes logically to maintain flow clarity.
Always respond with valid JSON matching the expected schema exactly.`,

  step_design: `You are a Lean process improvement expert specializing in step-level process design.
Your task is to provide 2-3 viable design options for a specific process step that needs detailed design.

For each option you propose:
1. Define the step's PURPOSE clearly
2. List required INPUTS (data, materials, triggers)
3. Detail the ACTIONS performed (in order)
4. Define any DECISIONS within the step
5. List OUTPUTS (deliverables, data, signals)
6. Specify CONTROLS (approvals, validations, audits)

You must:
- Propose 2-3 distinct options with clear tradeoffs
- Assign a confidence score (0-1) to each option
- List explicit assumptions with risks and validation methods
- If you lack sufficient context, include follow-up questions in your response
- When research_mode is enabled, include industry pattern labels for suggestions

Never auto-select an option - always present alternatives for the user to choose.
Always respond with valid JSON matching the expected schema exactly.`,
};

// ============================================
// UTILITIES
// ============================================

/**
 * Generate a deterministic hash of the inputs for idempotency
 */
export function generateInputHash(inputs: Record<string, unknown>): string {
  const normalized = JSON.stringify(inputs, Object.keys(inputs).sort());
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

/**
 * Try to repair malformed JSON from LLM output
 */
function tryRepairJson(content: string): string {
  // Strip markdown code fences if present
  let cleaned = content.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Try to find JSON object in the response
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return cleaned;
}

// ============================================
// LLM CALLS
// ============================================

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<LLMResponse> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  return {
    content,
    model: "gpt-4o-mini",
    provider: "openai",
  };
}

async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<LLMResponse> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `${userPrompt}\n\nRespond with valid JSON only, no other text.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error("No content in Anthropic response");
  }

  return {
    content,
    model: "claude-3-haiku-20240307",
    provider: "anthropic",
  };
}

async function callLLM(
  agentType: AgentTypeKey,
  userPrompt: string
): Promise<LLMResponse> {
  const systemPrompt = AGENT_SYSTEM_PROMPTS[agentType];
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (openaiKey) {
    return callOpenAI(systemPrompt, userPrompt, openaiKey);
  } else if (anthropicKey) {
    return callAnthropic(systemPrompt, userPrompt, anthropicKey);
  } else {
    throw new Error("No LLM API key configured (OPENAI_API_KEY or ANTHROPIC_API_KEY)");
  }
}

// ============================================
// AGENT RUN MANAGEMENT
// ============================================

async function createAgentRun(
  config: AgentRunnerConfig,
  inputHash: string
): Promise<string> {
  const { data, error } = await config.supabase
    .from("agent_runs")
    .insert({
      session_id: config.sessionId,
      agent_type: config.agentType,
      input_hash: inputHash,
      inputs: config.inputs,
      status: "queued" as AgentRunStatus,
      created_by: config.userId,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create agent run: ${error.message}`);
  }

  return data.id;
}

async function updateAgentRun(
  supabase: SupabaseClient,
  runId: string,
  updates: Partial<AgentRun>
): Promise<void> {
  const { error } = await supabase
    .from("agent_runs")
    .update(updates)
    .eq("id", runId);

  if (error) {
    console.error(`Failed to update agent run ${runId}:`, error);
  }
}

async function findCachedRun(
  supabase: SupabaseClient,
  sessionId: string,
  agentType: AgentTypeKey,
  inputHash: string
): Promise<AgentRun | null> {
  const { data, error } = await supabase
    .from("agent_runs")
    .select("*")
    .eq("session_id", sessionId)
    .eq("agent_type", agentType)
    .eq("input_hash", inputHash)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data as AgentRun;
}

// ============================================
// MAIN RUNNER
// ============================================

export async function runAgent<T extends AgentTypeKey>(
  config: AgentRunnerConfig & { agentType: T },
  buildPrompt: (inputs: Record<string, unknown>) => string
): Promise<AgentRunnerResult<z.infer<(typeof AgentOutputSchemas)[T]>>> {
  const { sessionId, agentType, inputs, supabase, forceRerun } = config;
  const inputHash = generateInputHash(inputs);

  // Check for cached successful run (unless forcing rerun)
  if (!forceRerun) {
    const cachedRun = await findCachedRun(supabase, sessionId, agentType, inputHash);
    if (cachedRun && cachedRun.outputs) {
      return {
        success: true,
        data: cachedRun.outputs as z.infer<(typeof AgentOutputSchemas)[T]>,
        runId: cachedRun.id,
        cached: true,
        model: cachedRun.model || undefined,
        provider: cachedRun.provider || undefined,
      };
    }
  }

  // Create new agent run record
  const runId = await createAgentRun(config, inputHash);

  try {
    // Update status to running
    await updateAgentRun(supabase, runId, {
      status: "running",
      started_at: new Date().toISOString(),
    });

    // Build the prompt
    const userPrompt = buildPrompt(inputs);

    // Call the LLM
    const llmResponse = await callLLM(agentType, userPrompt);

    // Parse and validate the response
    const schema = AgentOutputSchemas[agentType];
    let parsed: unknown;

    try {
      parsed = JSON.parse(llmResponse.content);
    } catch {
      // Try to repair the JSON
      const repaired = tryRepairJson(llmResponse.content);
      parsed = JSON.parse(repaired);
    }

    // Validate with Zod
    const validated = schema.parse(parsed);

    // Update run as succeeded
    await updateAgentRun(supabase, runId, {
      status: "succeeded",
      outputs: validated as Record<string, unknown>,
      model: llmResponse.model,
      provider: llmResponse.provider,
      completed_at: new Date().toISOString(),
    });

    return {
      success: true,
      data: validated as z.infer<(typeof AgentOutputSchemas)[T]>,
      runId,
      cached: false,
      model: llmResponse.model,
      provider: llmResponse.provider,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Update run as failed
    await updateAgentRun(supabase, runId, {
      status: "failed",
      error: errorMessage,
      completed_at: new Date().toISOString(),
    });

    return {
      success: false,
      error: errorMessage,
      runId,
      cached: false,
    };
  }
}

// ============================================
// PROMPT BUILDERS
// ============================================

/**
 * Format workflow context for inclusion in prompts
 */
function formatWorkflowContext(context: WorkflowContextWithRelations | null | undefined): string {
  if (!context) {
    return "No workflow context provided.";
  }

  let formatted = "";

  if (context.purpose) {
    formatted += `- **Purpose**: ${context.purpose}\n`;
  }
  if (context.business_value) {
    formatted += `- **Business Value**: ${context.business_value}\n`;
  }
  if (context.trigger_events?.length) {
    formatted += `- **Triggers**: ${context.trigger_events.join(", ")}\n`;
  }
  if (context.end_outcomes?.length) {
    formatted += `- **Target Outcomes**: ${context.end_outcomes.join(", ")}\n`;
  }
  if (context.volume_frequency) {
    formatted += `- **Volume/Frequency**: ${context.volume_frequency}\n`;
  }
  if (context.sla_targets) {
    formatted += `- **SLA Targets**: ${context.sla_targets}\n`;
  }
  if (context.compliance_requirements?.length) {
    formatted += `- **Compliance**: ${context.compliance_requirements.join(", ")}\n`;
  }
  if (context.constraints?.length) {
    formatted += `- **Constraints**: ${context.constraints.join("; ")}\n`;
  }
  if (context.assumptions?.length) {
    formatted += `- **Assumptions**: ${context.assumptions.join("; ")}\n`;
  }

  if (context.stakeholders?.length) {
    formatted += "\n### Key Stakeholders\n";
    context.stakeholders.forEach((s) => {
      formatted += `- **${s.role}**: ${s.responsibilities || "N/A"}`;
      if (s.pain_points) {
        formatted += ` (Pain points: ${s.pain_points})`;
      }
      formatted += "\n";
    });
  }

  if (context.systems?.length) {
    formatted += "\n### Systems Involved\n";
    context.systems.forEach((s) => {
      formatted += `- **${s.name}**: ${s.role || "N/A"}`;
      if (s.integration_notes) {
        formatted += ` (${s.integration_notes})`;
      }
      formatted += "\n";
    });
  }

  if (context.metrics?.length) {
    formatted += "\n### Success Metrics\n";
    context.metrics.forEach((m) => {
      formatted += `- **${m.name}**: `;
      if (m.current_value || m.target_value) {
        formatted += `${m.current_value || "?"} → ${m.target_value || "?"}`;
      } else {
        formatted += "Not defined";
      }
      formatted += "\n";
    });
  }

  return formatted || "No workflow context details provided.";
}

export function buildSynthesisPrompt(inputs: {
  workflowContext?: WorkflowContextWithRelations | null;
  observations: Array<{
    id: string;
    notes: string | null;
    step_name: string;
    lane: string;
    waste_types: Array<{ id: string; name: string; code: string }>;
    priority_score: number | null;
  }>;
  steps: Array<{ id: string; step_name: string; lane: string }>;
  waste_types: Array<{ id: string; name: string; code: string }>;
}): string {
  const { workflowContext, observations, steps, waste_types } = inputs;

  return `Analyze the following waste walk observations and cluster them into meaningful themes.

## Workflow Context
${formatWorkflowContext(workflowContext)}

## Available Process Steps
${steps.map((s) => `- ${s.id}: ${s.step_name} (Lane: ${s.lane})`).join("\n")}

## Available Waste Types
${waste_types.map((w) => `- ${w.id}: ${w.code} - ${w.name}`).join("\n")}

## Observations (${observations.length} total)
${observations
  .map(
    (o) => `
### Observation ${o.id}
- Step: ${o.step_name} (Lane: ${o.lane})
- Priority Score: ${o.priority_score ?? "N/A"}
- Waste Types: ${o.waste_types.map((w) => w.code).join(", ") || "None"}
- Notes: ${o.notes || "No notes"}
`
  )
  .join("\n")}

## Instructions
1. Consider the workflow context when analyzing observations - understand the business purpose and constraints.
2. Group related observations into themes based on root causes, affected areas, or waste patterns.
3. Each theme should have at least one observation linked to it.
4. Provide a clear name and summary for each theme.
5. Suggest root cause hypotheses for each theme, considering the workflow context and stakeholder pain points.
6. Assign a confidence level (high/medium/low) based on evidence strength.

## Output Schema
{
  "themes": [
    {
      "name": "Theme Name",
      "summary": "Brief description of this waste pattern",
      "confidence": "high" | "medium" | "low",
      "root_cause_hypotheses": ["Hypothesis 1", "Hypothesis 2"],
      "observation_ids": ["uuid1", "uuid2"],
      "step_ids": ["uuid1"],
      "waste_type_ids": ["uuid1", "uuid2"]
    }
  ]
}`;
}

export function buildSolutionsPrompt(inputs: {
  workflowContext?: WorkflowContextWithRelations | null;
  themes: Array<{
    id: string;
    name: string;
    summary: string;
    root_cause_hypotheses: string[];
    observation_ids: string[];
    step_ids: string[];
    waste_type_ids: string[];
  }>;
  observations: Array<{
    id: string;
    notes: string | null;
    step_name: string;
    priority_score: number | null;
  }>;
  steps: Array<{ id: string; step_name: string; lane: string }>;
}): string {
  const { workflowContext, themes, observations, steps } = inputs;

  return `Generate solutions for the identified waste themes.

## Workflow Context
${formatWorkflowContext(workflowContext)}

## Identified Themes
${themes
  .map(
    (t) => `
### Theme: ${t.name} (ID: ${t.id})
- Summary: ${t.summary}
- Root Causes: ${t.root_cause_hypotheses.join(", ") || "Not identified"}
- Affected Steps: ${t.step_ids.length} steps
- Evidence: ${t.observation_ids.length} observations
`
  )
  .join("\n")}

## Process Steps
${steps.map((s) => `- ${s.id}: ${s.step_name} (Lane: ${s.lane})`).join("\n")}

## Sample Observations for Context
${observations
  .slice(0, 10)
  .map((o) => `- [${o.id}] ${o.step_name}: ${o.notes || "No notes"} (Priority: ${o.priority_score ?? "N/A"})`)
  .join("\n")}

## Instructions
Consider the workflow context when generating solutions:
- Respect stated constraints (things that cannot change)
- Align with business value and success metrics
- Consider stakeholder pain points and system limitations
- Keep SLA targets and compliance requirements in mind

Generate solutions in three buckets:
1. ELIMINATE: Remove wasteful steps or processes entirely
2. MODIFY: Improve or streamline existing processes
3. CREATE: Add new capabilities or processes

For each solution:
- Link to the themes it addresses
- Link to specific steps affected
- Assess effort level and risks
- Suggest implementation wave (Immediate, 0-30 days, 30-90 days, 90+ days)

## Output Schema
{
  "solutions": [
    {
      "bucket": "eliminate" | "modify" | "create",
      "title": "Solution Title",
      "description": "Detailed description of the solution",
      "expected_impact": "Expected outcomes and benefits",
      "effort_level": "low" | "medium" | "high",
      "risks": ["Risk 1", "Risk 2"],
      "dependencies": ["Dependency description"],
      "recommended_wave": "Immediate" | "0-30 days" | "30-90 days" | "90+ days",
      "theme_ids": ["theme-uuid"],
      "step_ids": ["step-uuid"],
      "observation_ids": ["observation-uuid"]
    }
  ]
}`;
}

export function buildSequencingPrompt(inputs: {
  solutions: Array<{
    id: string;
    bucket: string;
    title: string;
    description: string;
    effort_level: string;
    recommended_wave: string;
    dependencies: string[];
    step_ids: string[];
  }>;
}): string {
  const { solutions } = inputs;

  return `Sequence the following accepted solutions into implementation waves.

## Accepted Solutions (${solutions.length} total)
${solutions
  .map(
    (s) => `
### ${s.title} (ID: ${s.id})
- Bucket: ${s.bucket}
- Effort: ${s.effort_level}
- Recommended Wave: ${s.recommended_wave}
- Description: ${s.description}
- Dependencies: ${s.dependencies.join(", ") || "None"}
- Steps Affected: ${s.step_ids.length}
`
  )
  .join("\n")}

## Instructions
1. Group solutions into implementation waves:
   - Immediate / Quick Wins (order_index: 0)
   - 0-30 Days (order_index: 1)
   - 30-90 Days (order_index: 2)
   - 90+ Days (order_index: 3)

2. Identify dependencies between solutions (which must be completed before others).

3. Consider:
   - Effort levels and resource constraints
   - Dependencies and logical ordering
   - Quick wins for early momentum
   - Bundling related changes

## Output Schema
{
  "waves": [
    {
      "name": "Immediate / Quick Wins",
      "order_index": 0,
      "start_estimate": "Week 1",
      "end_estimate": "Week 2",
      "solution_ids": ["solution-uuid-1", "solution-uuid-2"]
    }
  ],
  "dependencies": [
    {
      "solution_id": "solution-uuid-2",
      "depends_on_solution_id": "solution-uuid-1"
    }
  ]
}`;
}

export function buildDesignPrompt(inputs: {
  workflowContext?: WorkflowContextWithRelations | null;
  currentSteps: Array<{
    id: string;
    step_name: string;
    description?: string;
    lane: string;
    step_type: string;
    position_x: number;
    position_y: number;
    lead_time_minutes?: number;
    cycle_time_minutes?: number;
  }>;
  currentEdges: Array<{
    source_step_id: string;
    target_step_id: string;
    label?: string;
  }>;
  solutions: Array<{
    id: string;
    bucket: string;
    title: string;
    description: string;
    step_ids: string[];
  }>;
  lanes: string[];
}): string {
  const { workflowContext, currentSteps, currentEdges, solutions, lanes } = inputs;

  return `Design a future state process map based on the accepted solutions.

## Workflow Context
${formatWorkflowContext(workflowContext)}

## Current Process Steps
${currentSteps
  .map(
    (s) => `
- ID: ${s.id}
  Name: ${s.step_name}
  Lane: ${s.lane}
  Type: ${s.step_type}
  Position: (${s.position_x}, ${s.position_y})
  Lead Time: ${s.lead_time_minutes ?? "N/A"} min
  Cycle Time: ${s.cycle_time_minutes ?? "N/A"} min
`
  )
  .join("\n")}

## Current Connections
${currentEdges.map((e) => `- ${e.source_step_id} -> ${e.target_step_id}${e.label ? ` (${e.label})` : ""}`).join("\n")}

## Available Lanes
${lanes.map((l) => `- ${l}`).join("\n")}

## Solutions to Implement
${solutions
  .map(
    (s) => `
### ${s.title} (ID: ${s.id})
- Action: ${s.bucket.toUpperCase()}
- Description: ${s.description}
- Target Steps: ${s.step_ids.join(", ") || "General"}
`
  )
  .join("\n")}

## Instructions
Consider the workflow context when designing the future state:
- Ensure the design supports the stated workflow purpose and business value
- Respect constraints and compliance requirements
- Design with success metrics in mind (enable measurement)
- Consider systems involved when adding/modifying steps

1. For each current step, determine the appropriate action:
   - KEEP: Unchanged from current state
   - MODIFY: Changed based on solutions (describe changes in modified_fields)
   - REMOVE: Eliminated entirely

2. Add NEW steps where solutions require new capabilities.

3. Preserve logical flow and lane organization.

4. Maintain proper positioning for visual clarity.

5. Link each change to the solution that drives it.

## Output Schema
{
  "future_state": {
    "name": "Future State v1",
    "nodes": [
      {
        "source_step_id": "current-step-uuid" | null,
        "name": "Step Name",
        "description": "Optional description",
        "lane": "Lane Name",
        "step_type": "action" | "decision" | "start" | "end" | "subprocess",
        "lead_time_minutes": 30,
        "cycle_time_minutes": 15,
        "position_x": 100,
        "position_y": 200,
        "action": "keep" | "modify" | "remove" | "new",
        "modified_fields": { "field": "old -> new" },
        "linked_solution_id": "solution-uuid" | null,
        "explanation": "Why this change was made"
      }
    ],
    "edges": [
      {
        "source_node_index": 0,
        "target_node_index": 1,
        "label": "Optional label"
      }
    ]
  }
}`;
}

export function buildStepDesignPrompt(inputs: {
  workflowContext?: WorkflowContextWithRelations | null;
  node: {
    id: string;
    name: string;
    description?: string;
    lane: string;
    step_type: string;
    action: string;
    linked_solution_id?: string;
  };
  solution?: {
    id: string;
    title: string;
    description: string;
    bucket: string;
  };
  currentStep?: {
    id: string;
    step_name: string;
    description?: string;
    lane: string;
    lead_time_minutes?: number;
    cycle_time_minutes?: number;
  };
  existingContext?: {
    purpose?: string;
    inputs?: string[];
    outputs?: string[];
    constraints?: string[];
    assumptions?: string[];
    questions?: Array<{ question: string; answer?: string }>;
  };
  priorVersions?: Array<{
    version: number;
    selectedOption?: {
      title: string;
      summary: string;
    };
  }>;
  researchMode: boolean;
}): string {
  const { workflowContext, node, solution, currentStep, existingContext, priorVersions, researchMode } = inputs;

  let prompt = `Design the step-level details for the following process step.

## Workflow Context
${formatWorkflowContext(workflowContext)}

## Target Node
- Name: ${node.name}
- Lane: ${node.lane}
- Type: ${node.step_type}
- Action: ${node.action}
${node.description ? `- Description: ${node.description}` : ""}
`;

  if (currentStep) {
    prompt += `
## Current State (before modification)
- Original Name: ${currentStep.step_name}
- Description: ${currentStep.description || "N/A"}
- Lead Time: ${currentStep.lead_time_minutes ?? "N/A"} min
- Cycle Time: ${currentStep.cycle_time_minutes ?? "N/A"} min
`;
  }

  if (solution) {
    prompt += `
## Linked Solution
- Title: ${solution.title}
- Bucket: ${solution.bucket.toUpperCase()}
- Description: ${solution.description}
`;
  }

  if (existingContext) {
    prompt += `
## Context Already Captured
`;
    if (existingContext.purpose) {
      prompt += `- Purpose: ${existingContext.purpose}\n`;
    }
    if (existingContext.inputs?.length) {
      prompt += `- Inputs: ${existingContext.inputs.join(", ")}\n`;
    }
    if (existingContext.outputs?.length) {
      prompt += `- Outputs: ${existingContext.outputs.join(", ")}\n`;
    }
    if (existingContext.constraints?.length) {
      prompt += `- Constraints: ${existingContext.constraints.join(", ")}\n`;
    }
    if (existingContext.assumptions?.length) {
      prompt += `- Assumptions: ${existingContext.assumptions.join(", ")}\n`;
    }
    if (existingContext.questions?.length) {
      prompt += `\n### Prior Q&A\n`;
      existingContext.questions.forEach((q) => {
        prompt += `Q: ${q.question}\nA: ${q.answer || "(unanswered)"}\n`;
      });
    }
  }

  if (priorVersions?.length) {
    prompt += `
## Prior Design Versions
${priorVersions.map((v) => `- Version ${v.version}: ${v.selectedOption?.title || "No selection"}`).join("\n")}
`;
  }

  prompt += `
## Instructions
1. Generate 2-3 distinct design options (A, B, C) for this step.
2. Each option should include:
   - Purpose: Clear statement of what this step accomplishes
   - Inputs: What data, materials, or triggers initiate this step
   - Actions: Ordered list of what happens in this step
   - Decisions: Any decision points within the step
   - Outputs: What this step produces
   - Controls: Approvals, validations, audit requirements
   - Timing estimates (lead time, cycle time)

3. For each option:
   - Provide a clear title and summary
   - Describe what changes from current state
   - List wastes addressed
   - Identify risks and dependencies
   - Assign a confidence score (0-1) based on available context
   - List explicit assumptions with:
     - What you're assuming
     - Risk if the assumption is wrong
     - How to validate the assumption

4. If you need more context to provide good options, include follow-up questions.
   Set context_needed: true and list questions that would help refine the design.
`;

  if (researchMode) {
    prompt += `
## Research Mode ENABLED
Include industry best practices and pattern labels for your suggestions.
Tag each option with relevant pattern names (e.g., "Poka-Yoke", "Single-Piece Flow", "Standard Work").
`;
  }

  prompt += `
## Output Schema
{
  "questions": [
    {
      "id": "unique-id",
      "question": "What is the expected volume per day?",
      "required": true,
      "context_field": "volume"
    }
  ],
  "context_needed": false,
  "options": [
    {
      "option_key": "A",
      "title": "Option Title",
      "summary": "Brief summary of this approach",
      "changes": "What changes from current state",
      "waste_addressed": ["Waiting", "Over-processing"],
      "risks": ["Implementation risk 1"],
      "dependencies": ["Requires training"],
      "confidence": 0.85,
      "pattern_labels": ["Pattern Name"],
      "design": {
        "purpose": "Clear purpose statement",
        "inputs": [
          { "name": "Input 1", "source": "Previous step", "required": true, "description": "..." }
        ],
        "actions": [
          { "order": 1, "description": "Action description", "performer": "Role", "system": "System name" }
        ],
        "decisions": [
          { "question": "Is X valid?", "options": [{ "label": "Yes", "outcome": "Proceed" }, { "label": "No", "outcome": "Return" }] }
        ],
        "outputs": [
          { "name": "Output 1", "destination": "Next step", "format": "Format", "description": "..." }
        ],
        "controls": [
          { "type": "validation", "description": "Check X", "owner": "Role", "frequency": "Each time" }
        ],
        "timing": {
          "estimated_lead_time_minutes": 30,
          "estimated_cycle_time_minutes": 15
        }
      },
      "assumptions": [
        {
          "assumption": "System X is available",
          "risk_if_wrong": "Manual workaround required",
          "validation_method": "Check with IT"
        }
      ]
    }
  ]
}`;

  return prompt;
}

