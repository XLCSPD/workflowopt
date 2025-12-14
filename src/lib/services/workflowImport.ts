import { z } from "zod";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Process, ProcessStep, StepType } from "@/types";
import type { StepConnection } from "./workflows";

const supabase = getSupabaseClient();

// ============================================
// IMPORT SCHEMAS (Zod validation)
// ============================================

// Valid step types
const stepTypeSchema = z.enum(["action", "decision", "start", "end", "subprocess"]).default("action");

// Step definition for import
const importStepSchema = z.object({
  id: z.string().min(1, "Step ID is required"),
  name: z.string().min(1, "Step name is required").max(100, "Step name too long"),
  lane: z.string().min(1, "Lane is required").max(50, "Lane name too long"),
  type: stepTypeSchema,
  description: z.string().optional(),
  order: z.number().optional(),
});

// Connection definition for import
const importConnectionSchema = z.object({
  from: z.string().min(1, "Source step ID is required"),
  to: z.string().min(1, "Target step ID is required"),
  label: z.string().optional(),
});

// Full workflow import schema
export const workflowImportSchema = z.object({
  name: z.string().min(1, "Workflow name is required").max(100, "Workflow name too long"),
  description: z.string().optional(),
  lanes: z.array(z.string()).optional(), // Optional - can be inferred from steps
  steps: z.array(importStepSchema).min(1, "At least one step is required"),
  connections: z.array(importConnectionSchema).optional().default([]),
});

// CSV row schema for steps
const csvStepRowSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Step name is required"),
  lane: z.string().min(1, "Lane is required"),
  type: stepTypeSchema.optional(),
  description: z.string().optional(),
  order: z.coerce.number().optional(),
});

// CSV row schema for connections
const csvConnectionRowSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
});

// ============================================
// TYPES
// ============================================

export type WorkflowImportData = z.infer<typeof workflowImportSchema>;
export type ImportStep = z.infer<typeof importStepSchema>;
export type ImportConnection = z.infer<typeof importConnectionSchema>;

export interface ImportValidationResult {
  valid: boolean;
  data?: WorkflowImportData;
  errors: ImportError[];
  warnings: ImportWarning[];
}

export interface ImportError {
  type: "error";
  field?: string;
  row?: number;
  message: string;
}

export interface ImportWarning {
  type: "warning";
  field?: string;
  row?: number;
  message: string;
}

export interface ImportResult {
  success: boolean;
  process?: Process;
  steps?: ProcessStep[];
  connections?: StepConnection[];
  errors?: string[];
}

// ============================================
// JSON PARSER
// ============================================

export function parseJSON(jsonString: string): ImportValidationResult {
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];

  try {
    const parsed = JSON.parse(jsonString);
    const result = workflowImportSchema.safeParse(parsed);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        errors.push({
          type: "error",
          field: issue.path.join("."),
          message: issue.message,
        });
      });
      return { valid: false, errors, warnings };
    }

    // Validate step ID uniqueness
    const stepIds = new Set<string>();
    result.data.steps.forEach((step, idx) => {
      if (stepIds.has(step.id)) {
        errors.push({
          type: "error",
          row: idx + 1,
          field: "steps[].id",
          message: `Duplicate step ID: "${step.id}"`,
        });
      }
      stepIds.add(step.id);
    });

    // Validate connections reference valid step IDs
    result.data.connections?.forEach((conn, idx) => {
      if (!stepIds.has(conn.from)) {
        errors.push({
          type: "error",
          row: idx + 1,
          field: "connections[].from",
          message: `Connection references unknown step ID: "${conn.from}"`,
        });
      }
      if (!stepIds.has(conn.to)) {
        errors.push({
          type: "error",
          row: idx + 1,
          field: "connections[].to",
          message: `Connection references unknown step ID: "${conn.to}"`,
        });
      }
    });

    // Check for orphan steps (no connections)
    if (result.data.connections && result.data.connections.length > 0) {
      const connectedSteps = new Set<string>();
      result.data.connections.forEach((conn) => {
        connectedSteps.add(conn.from);
        connectedSteps.add(conn.to);
      });

      result.data.steps.forEach((step) => {
        if (!connectedSteps.has(step.id)) {
          warnings.push({
            type: "warning",
            field: "steps",
            message: `Step "${step.name}" (${step.id}) has no connections`,
          });
        }
      });
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    return { valid: true, data: result.data, errors: [], warnings };
  } catch (e) {
    errors.push({
      type: "error",
      message: `Invalid JSON: ${e instanceof Error ? e.message : "Unknown error"}`,
    });
    return { valid: false, errors, warnings };
  }
}

// ============================================
// CSV PARSER
// ============================================

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

export function parseCSV(
  csvContent: string,
  options: {
    hasConnections?: boolean;
    connectionsCsvContent?: string;
  } = {}
): ImportValidationResult {
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];

  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    errors.push({
      type: "error",
      message: "CSV must have at least a header row and one data row",
    });
    return { valid: false, errors, warnings };
  }

  // Parse header
  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());

  // Map common header variations
  const headerMap: Record<string, string> = {
    step: "name",
    step_name: "name",
    "step name": "name",
    stepname: "name",
    action: "name",
    "action / process step": "name",
    owner: "lane",
    swimlane: "lane",
    "swim lane": "lane",
    swim_lane: "lane",
    step_type: "type",
    steptype: "type",
    "step type": "type",
    desc: "description",
    notes: "description",
    "interaction / trigger": "description",
    step_id: "id",
    stepid: "id",
    "step id": "id",
    order_index: "order",
    orderindex: "order",
    sequence: "order",
  };

  const normalizedHeaders = headers.map((h) => headerMap[h] || h);

  // Check required columns
  const hasName = normalizedHeaders.includes("name");
  const hasLane = normalizedHeaders.includes("lane");

  if (!hasName) {
    errors.push({
      type: "error",
      field: "headers",
      message:
        'CSV must have a column for step name (e.g., "name", "step", "action")',
    });
  }
  if (!hasLane) {
    errors.push({
      type: "error",
      field: "headers",
      message:
        'CSV must have a column for lane/owner (e.g., "lane", "owner", "swimlane")',
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Parse data rows
  const steps: ImportStep[] = [];
  const stepIdMap = new Map<string, string>(); // For auto-generated IDs

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};

    normalizedHeaders.forEach((header, idx) => {
      row[header] = values[idx] || "";
    });

    // Skip empty rows
    if (!row.name && !row.lane) continue;

    // Generate ID if not provided
    let stepId = row.id;
    if (!stepId) {
      // Try to use row number or create from name
      const baseId = row.name
        ? row.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
        : `step-${i}`;
      stepId = `step-${baseId}-${i}`;
    }

    const stepResult = csvStepRowSchema.safeParse({
      id: stepId,
      name: row.name,
      lane: row.lane,
      type: row.type || "action",
      description: row.description,
      order: row.order ? parseInt(row.order, 10) : i,
    });

    if (!stepResult.success) {
      stepResult.error.issues.forEach((issue) => {
        errors.push({
          type: "error",
          row: i + 1,
          field: issue.path.join("."),
          message: issue.message,
        });
      });
      continue;
    }

    // Store mapping of original row to ID for connection lookup
    stepIdMap.set(String(i), stepId);
    stepIdMap.set(row.name?.toLowerCase() || "", stepId);

    steps.push({
      ...stepResult.data,
      id: stepId,
      order: stepResult.data.order || i,
    } as ImportStep);
  }

  if (steps.length === 0) {
    errors.push({
      type: "error",
      message: "No valid steps found in CSV",
    });
    return { valid: false, errors, warnings };
  }

  // Parse connections CSV if provided
  const connections: ImportConnection[] = [];

  if (options.connectionsCsvContent) {
    const connLines = options.connectionsCsvContent
      .split(/\r?\n/)
      .filter((line) => line.trim());

    if (connLines.length >= 2) {
      const connHeaders = parseCSVLine(connLines[0]).map((h) =>
        h.toLowerCase().trim()
      );

      // Map connection headers
      const connHeaderMap: Record<string, string> = {
        from_step: "from",
        fromstep: "from",
        "from step": "from",
        source: "from",
        source_step: "from",
        to_step: "to",
        tostep: "to",
        "to step": "to",
        target: "to",
        target_step: "to",
      };

      const normalizedConnHeaders = connHeaders.map(
        (h) => connHeaderMap[h] || h
      );

      for (let i = 1; i < connLines.length; i++) {
        const values = parseCSVLine(connLines[i]);
        const row: Record<string, string> = {};

        normalizedConnHeaders.forEach((header, idx) => {
          row[header] = values[idx] || "";
        });

        if (!row.from || !row.to) continue;

        // Try to resolve step references
        const fromId =
          stepIdMap.get(row.from) ||
          stepIdMap.get(row.from.toLowerCase()) ||
          row.from;
        const toId =
          stepIdMap.get(row.to) ||
          stepIdMap.get(row.to.toLowerCase()) ||
          row.to;

        const connResult = csvConnectionRowSchema.safeParse({
          from: fromId,
          to: toId,
          label: row.label,
        });

        if (connResult.success) {
          connections.push(connResult.data);
        }
      }
    }
  } else {
    // Auto-generate sequential connections if no connections CSV
    warnings.push({
      type: "warning",
      message:
        "No connections provided - steps will be connected sequentially based on order",
    });

    const sortedSteps = [...steps].sort(
      (a, b) => (a.order || 0) - (b.order || 0)
    );
    for (let i = 0; i < sortedSteps.length - 1; i++) {
      connections.push({
        from: sortedSteps[i].id,
        to: sortedSteps[i + 1].id,
      });
    }
  }

  // Infer workflow name from first step or filename (caller can override)
  const workflowName = "Imported Workflow";

  const data: WorkflowImportData = {
    name: workflowName,
    description: `Imported from CSV with ${steps.length} steps`,
    lanes: [...new Set(steps.map((s) => s.lane))],
    steps,
    connections,
  };

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  return { valid: true, data, errors: [], warnings };
}

// ============================================
// IMPORT EXECUTOR
// ============================================

export async function importWorkflow(
  data: WorkflowImportData
): Promise<ImportResult> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, errors: ["Not authenticated"] };
    }

    // Get user's org_id
    const { data: userProfile } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    // Create the process
    const { data: process, error: processError } = await supabase
      .from("processes")
      .insert({
        name: data.name,
        description: data.description,
        org_id: userProfile?.org_id || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (processError) {
      return { success: false, errors: [processError.message] };
    }

    // Calculate positions for steps
    const laneIndices = new Map<string, number>();
    const lanes = data.lanes || [...new Set(data.steps.map((s) => s.lane))];
    lanes.forEach((lane, idx) => laneIndices.set(lane, idx));

    const LANE_HEIGHT = 120;
    const STEP_WIDTH = 180;
    const STEP_GAP = 40;

    // Group steps by lane for positioning
    const stepsByLane = new Map<string, ImportStep[]>();
    data.steps.forEach((step) => {
      const laneSteps = stepsByLane.get(step.lane) || [];
      laneSteps.push(step);
      stepsByLane.set(step.lane, laneSteps);
    });

    // Sort steps within each lane
    stepsByLane.forEach((laneSteps) => {
      laneSteps.sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    // Calculate positions
    const stepPositions = new Map<
      string,
      { x: number; y: number; order: number }
    >();
    let globalOrderIndex = 0;

    // Simple left-to-right layout per lane
    stepsByLane.forEach((laneSteps, lane) => {
      const laneIndex = laneIndices.get(lane) || 0;
      const y = laneIndex * LANE_HEIGHT + LANE_HEIGHT / 2 - 35; // Center in lane

      laneSteps.forEach((step, stepIndex) => {
        const x = STEP_GAP + stepIndex * (STEP_WIDTH + STEP_GAP);
        stepPositions.set(step.id, { x, y, order: globalOrderIndex++ });
      });
    });

    // Create steps
    const stepsToInsert = data.steps.map((step) => {
      const pos = stepPositions.get(step.id) || { x: 0, y: 0, order: 0 };
      return {
        process_id: process.id,
        step_name: step.name,
        description: step.description,
        step_type: step.type,
        lane: step.lane,
        order_index: pos.order,
        position_x: pos.x,
        position_y: pos.y,
      };
    });

    const { data: createdSteps, error: stepsError } = await supabase
      .from("process_steps")
      .insert(stepsToInsert)
      .select();

    if (stepsError) {
      // Rollback process creation
      await supabase.from("processes").delete().eq("id", process.id);
      return { success: false, errors: [stepsError.message] };
    }

    // Build ID mapping (import ID -> database ID)
    const idMapping = new Map<string, string>();
    data.steps.forEach((importStep, idx) => {
      if (createdSteps[idx]) {
        idMapping.set(importStep.id, createdSteps[idx].id);
      }
    });

    // Create connections
    const connectionsToInsert = (data.connections || [])
      .map((conn) => ({
        process_id: process.id,
        source_step_id: idMapping.get(conn.from),
        target_step_id: idMapping.get(conn.to),
        label: conn.label,
      }))
      .filter((conn) => conn.source_step_id && conn.target_step_id);

    let createdConnections: StepConnection[] = [];

    if (connectionsToInsert.length > 0) {
      const { data: conns, error: connsError } = await supabase
        .from("step_connections")
        .insert(connectionsToInsert)
        .select();

      if (connsError) {
        console.error("Failed to create connections:", connsError);
        // Continue anyway - steps are more important
      } else {
        createdConnections = conns || [];
      }
    }

    return {
      success: true,
      process,
      steps: createdSteps,
      connections: createdConnections,
    };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

// ============================================
// SAMPLE DATA GENERATORS
// ============================================

export function generateSampleJSON(): string {
  const sample: WorkflowImportData = {
    name: "Sample Procurement Workflow",
    description: "A sample procurement process workflow",
    lanes: ["Requester", "Vendor", "Finance"],
    steps: [
      {
        id: "step-1",
        name: "Submit Request",
        lane: "Requester",
        type: "start",
        description: "Requester submits a purchase request",
      },
      {
        id: "step-2",
        name: "Review Request",
        lane: "Finance",
        type: "action",
        description: "Finance reviews the request",
      },
      {
        id: "step-3",
        name: "Approved?",
        lane: "Finance",
        type: "decision",
        description: "Decision point for approval",
      },
      {
        id: "step-4",
        name: "Process Order",
        lane: "Vendor",
        type: "action",
        description: "Vendor processes the order",
      },
      {
        id: "step-5",
        name: "Receive Goods",
        lane: "Requester",
        type: "end",
        description: "Requester receives the goods",
      },
    ],
    connections: [
      { from: "step-1", to: "step-2" },
      { from: "step-2", to: "step-3" },
      { from: "step-3", to: "step-4", label: "Yes" },
      { from: "step-4", to: "step-5" },
    ],
  };

  return JSON.stringify(sample, null, 2);
}

export function generateSampleCSV(): { steps: string; connections: string } {
  const stepsCSV = `id,name,lane,type,description,order
step-1,Submit Request,Requester,start,Requester submits a purchase request,1
step-2,Review Request,Finance,action,Finance reviews the request,2
step-3,Approved?,Finance,decision,Decision point for approval,3
step-4,Process Order,Vendor,action,Vendor processes the order,4
step-5,Receive Goods,Requester,end,Requester receives the goods,5`;

  const connectionsCSV = `from,to,label
step-1,step-2,
step-2,step-3,
step-3,step-4,Yes
step-4,step-5,`;

  return { steps: stepsCSV, connections: connectionsCSV };
}

// ============================================
// PREMIER HEALTH CSV CONVERTER
// ============================================

/**
 * Special parser for the Premier Health CSV format
 * Columns: Step, Owner, Action / Process Step, Interaction / Trigger
 */
export function parsePremierHealthCSV(
  csvContent: string,
  workflowName: string = "Imported Workflow"
): ImportValidationResult {
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];

  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    errors.push({
      type: "error",
      message: "CSV must have at least a header row and one data row",
    });
    return { valid: false, errors, warnings };
  }

  // Parse header
  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());

  // Check for Premier Health format
  const hasStep =
    headers.includes("step") ||
    headers.some((h) => h.includes("step") && !h.includes("process"));
  const hasOwner = headers.includes("owner");
  const hasAction =
    headers.includes("action / process step") ||
    headers.includes("action") ||
    headers.some((h) => h.includes("action"));

  if (!hasOwner && !hasAction) {
    // Fall back to standard CSV parser
    return parseCSV(csvContent);
  }

  // Map headers to indices
  const stepIdx = headers.findIndex(
    (h) => h === "step" || (h.includes("step") && !h.includes("process"))
  );
  const ownerIdx = headers.indexOf("owner");
  const actionIdx = headers.findIndex(
    (h) => h === "action / process step" || h === "action" || h.includes("action")
  );
  const triggerIdx = headers.findIndex(
    (h) => h === "interaction / trigger" || h.includes("trigger") || h.includes("interaction")
  );

  const steps: ImportStep[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    const stepNum = stepIdx >= 0 ? values[stepIdx] : String(i);
    const owner = ownerIdx >= 0 ? values[ownerIdx] : "Unknown";
    const action = actionIdx >= 0 ? values[actionIdx] : "";
    const trigger = triggerIdx >= 0 ? values[triggerIdx] : "";

    if (!action.trim()) continue;

    // Generate step ID
    const stepId = `step-${stepNum || i}`;

    // Determine step type based on keywords
    let stepType: StepType = "action";
    const actionLower = action.toLowerCase();
    if (
      actionLower.includes("start") ||
      actionLower.includes("initiat") ||
      i === 1
    ) {
      stepType = "start";
    } else if (
      actionLower.includes("decision") ||
      actionLower.includes("approve") ||
      actionLower.includes("review") ||
      actionLower.includes("select")
    ) {
      stepType = "decision";
    } else if (
      actionLower.includes("end") ||
      actionLower.includes("close") ||
      actionLower.includes("complete") ||
      i === lines.length - 1
    ) {
      stepType = "end";
    }

    steps.push({
      id: stepId,
      name: action.trim(),
      lane: owner.trim(),
      type: stepType,
      description: trigger.trim() || undefined,
      order: parseInt(stepNum, 10) || i,
    });
  }

  if (steps.length === 0) {
    errors.push({
      type: "error",
      message: "No valid steps found in CSV",
    });
    return { valid: false, errors, warnings };
  }

  // Generate sequential connections
  warnings.push({
    type: "warning",
    message:
      "Connections auto-generated sequentially. Edit in workflow editor for complex flows.",
  });

  const sortedSteps = [...steps].sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );
  const connections: ImportConnection[] = [];

  for (let i = 0; i < sortedSteps.length - 1; i++) {
    connections.push({
      from: sortedSteps[i].id,
      to: sortedSteps[i + 1].id,
    });
  }

  const lanes = [...new Set(steps.map((s) => s.lane))];

  const data: WorkflowImportData = {
    name: workflowName,
    description: `Imported from CSV with ${steps.length} steps across ${lanes.length} swimlanes`,
    lanes,
    steps,
    connections,
  };

  return { valid: true, data, errors: [], warnings };
}

