import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface GeneratedContext {
  purpose?: string;
  business_value?: string;
  trigger_events?: string[];
  end_outcomes?: string[];
  volume_frequency?: string;
  sla_targets?: string;
  compliance_requirements?: string[];
  constraints?: string[];
  assumptions?: string[];
  stakeholders?: Array<{
    role: string;
    responsibilities?: string;
    pain_points?: string;
  }>;
  systems?: Array<{
    name: string;
    role?: string;
    integration_notes?: string;
  }>;
  metrics?: Array<{
    name: string;
    current_value?: string;
    target_value?: string;
  }>;
}

const CONTEXT_EXTRACTION_SYSTEM_PROMPT = `You are a Lean process improvement expert helping to document workflow context.
Your task is to extract structured information from a free-form description of a business workflow.
You must analyze the description and infer as much context as possible, organizing it into structured fields.

For each field:
- If the information is explicitly stated, include it
- If the information can be reasonably inferred, include it with a note
- If the information is not available, omit the field

Be thorough but accurate. Do not hallucinate information that cannot be inferred from the description.
Always respond with valid JSON matching the expected schema exactly.`;

function buildContextExtractionPrompt(
  description: string,
  steps?: Array<{ name: string; lane: string }>
): string {
  let prompt = `Extract structured workflow context from this description:

## Workflow Description
${description}
`;

  if (steps && steps.length > 0) {
    prompt += `
## Process Steps (for reference)
${steps.map((s) => `- ${s.name} (Lane: ${s.lane})`).join("\n")}
`;
  }

  prompt += `
## Instructions
Extract as much information as possible into these categories:

1. **Purpose**: What does this workflow accomplish? (1-2 sentences)
2. **Business Value**: Why does this workflow matter to the organization?
3. **Trigger Events**: What events or actions initiate this workflow?
4. **End Outcomes**: What are the successful outcomes/deliverables?
5. **Volume/Frequency**: How often does this workflow run? What volume?
6. **SLA Targets**: Any time-based requirements or service levels?
7. **Compliance Requirements**: Any regulatory or compliance considerations?
8. **Constraints**: What limitations or fixed requirements exist?
9. **Assumptions**: What assumptions are being made?
10. **Stakeholders**: Who are the key roles involved? What are their responsibilities and pain points?
11. **Systems**: What tools/systems are used? What role do they play?
12. **Metrics**: What would you measure to track success?

## Output Schema
{
  "purpose": "string",
  "business_value": "string",
  "trigger_events": ["string"],
  "end_outcomes": ["string"],
  "volume_frequency": "string",
  "sla_targets": "string",
  "compliance_requirements": ["string"],
  "constraints": ["string"],
  "assumptions": ["string"],
  "stakeholders": [
    {
      "role": "string",
      "responsibilities": "string",
      "pain_points": "string"
    }
  ],
  "systems": [
    {
      "name": "string",
      "role": "string",
      "integration_notes": "string"
    }
  ],
  "metrics": [
    {
      "name": "string",
      "current_value": "string (if mentioned)",
      "target_value": "string (if mentioned or can be suggested)"
    }
  ]
}

Only include fields that you can extract or reasonably infer from the description.`;

  return prompt;
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> {
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
      temperature: 0.5,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 2000,
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
  return data.content?.[0]?.text || "";
}

function tryRepairJson(content: string): string {
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

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return cleaned;
}

// POST - Generate context from free-form description
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: processId } = await params;
    const supabase = await createServerSupabaseClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify process exists
    const { data: workflow, error: processError } = await supabase
      .from("processes")
      .select("id, name")
      .eq("id", processId)
      .single();

    if (processError || !workflow) {
      return NextResponse.json(
        { error: "Process not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const { description } = await request.json();

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    // Fetch existing steps for context
    const { data: steps } = await supabase
      .from("process_steps")
      .select("step_name, lane")
      .eq("process_id", processId)
      .order("order_index", { ascending: true });

    const stepsForPrompt = steps?.map((s) => ({
      name: s.step_name,
      lane: s.lane,
    }));

    // Build prompts
    const userPrompt = buildContextExtractionPrompt(description, stepsForPrompt);

    // Call LLM
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    let responseContent: string;

    if (openaiKey) {
      responseContent = await callOpenAI(
        CONTEXT_EXTRACTION_SYSTEM_PROMPT,
        userPrompt,
        openaiKey
      );
    } else if (anthropicKey) {
      responseContent = await callAnthropic(
        CONTEXT_EXTRACTION_SYSTEM_PROMPT,
        userPrompt,
        anthropicKey
      );
    } else {
      return NextResponse.json(
        { error: "No LLM API key configured" },
        { status: 500 }
      );
    }

    // Parse response
    let generatedContext: GeneratedContext;
    try {
      generatedContext = JSON.parse(responseContent);
    } catch {
      const repaired = tryRepairJson(responseContent);
      generatedContext = JSON.parse(repaired);
    }

    return NextResponse.json({
      generated: generatedContext,
    });
  } catch (error) {
    console.error("Error generating workflow context:", error);
    return NextResponse.json(
      { error: "Failed to generate workflow context" },
      { status: 500 }
    );
  }
}

