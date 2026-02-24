import { parseJSON, type WorkflowImportData } from "@/lib/services/workflowImport";

// ============================================
// TYPES
// ============================================

export interface VisionImageInput {
  base64: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  pageLabel?: string;
}

export interface VisionAnalysisInput {
  images: VisionImageInput[];
  userHint?: string;
}

export interface VisionAnalysisResult {
  success: boolean;
  data?: WorkflowImportData;
  error?: string;
  confidence: "high" | "medium" | "low";
  warnings: string[];
  suggestions?: string[];
  model: string;
  provider: "openai" | "anthropic";
}

interface VisionLLMResponse {
  content: string;
  model: string;
  provider: "openai" | "anthropic";
}

// ============================================
// PROMPT BUILDING
// ============================================

function buildVisionPrompt(
  imageCount: number,
  userHint?: string
): { system: string; user: string } {
  const system = `You are an expert at analyzing flowchart diagrams and converting them into structured workflow data.
You can read hand-drawn sketches, whiteboard photos, digital diagrams (Visio, Lucidchart, draw.io), and PDF flowcharts.
You must extract the workflow structure and return it as JSON.`;

  const multiImageNote =
    imageCount > 1
      ? `\nYou are being given ${imageCount} images that represent parts of the SAME workflow. Combine them into a single coherent workflow. If the images show sequential pages, connect the last step of each page to the first step of the next page where appropriate.`
      : "";

  const hintNote = userHint
    ? `\nAdditional context from the user: "${userHint}"`
    : "";

  const user = `Analyze the flowchart image${imageCount > 1 ? "s" : ""} and extract the workflow structure.${multiImageNote}${hintNote}

Return a JSON object with this EXACT structure:
{
  "success": true,
  "confidence": "high" | "medium" | "low",
  "warnings": ["any issues or assumptions you made"],
  "workflow": {
    "name": "Name of the workflow (infer from title or content)",
    "description": "Brief description of what this workflow does",
    "lanes": ["Swimlane1", "Swimlane2"],
    "steps": [
      {
        "id": "step-1",
        "name": "Step name (text from the shape)",
        "lane": "Which swimlane this step belongs to",
        "type": "action | decision | start | end | subprocess",
        "description": "Optional description"
      }
    ],
    "connections": [
      {
        "from": "step-1",
        "to": "step-2",
        "label": "Optional label (e.g. Yes/No for decisions)"
      }
    ]
  }
}

Rules:
- Step types: "start" for start/begin shapes (ovals/rounded), "end" for end/terminate shapes, "decision" for diamond/rhombus shapes with Yes/No branches, "subprocess" for double-bordered rectangles, "action" for all other rectangular steps.
- If swimlanes are visible (horizontal or vertical bands with role labels), use them. If not, assign all steps to a "Default" lane.
- Use sequential IDs: "step-1", "step-2", etc.
- Capture ALL connections/arrows between shapes, including labels on decision branches.
- Assign an "order" field to each step based on the logical flow order (left-to-right, top-to-bottom).
- If the image is NOT a flowchart, is too blurry, or you cannot read it, return:
  {
    "success": false,
    "confidence": "low",
    "warnings": [],
    "error": "Description of why you cannot read it",
    "suggestions": ["Specific suggestions to improve the image"]
  }

Respond with valid JSON only, no other text.`;

  return { system, user };
}

// ============================================
// LLM CALLS
// ============================================

async function callOpenAIVision(
  images: VisionImageInput[],
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<VisionLLMResponse> {
  const contentBlocks: Array<
    | { type: "image_url"; image_url: { url: string; detail: string } }
    | { type: "text"; text: string }
  > = [];

  for (const img of images) {
    contentBlocks.push({
      type: "image_url",
      image_url: {
        url: `data:${img.mediaType};base64,${img.base64}`,
        detail: "high",
      },
    });
  }

  contentBlocks.push({ type: "text", text: userPrompt });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contentBlocks },
      ],
      temperature: 0.3,
      max_tokens: 8000,
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

  return { content, model: "gpt-4o", provider: "openai" };
}

async function callAnthropicVision(
  images: VisionImageInput[],
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<VisionLLMResponse> {
  const contentBlocks: Array<
    | {
        type: "image";
        source: { type: "base64"; media_type: string; data: string };
      }
    | { type: "text"; text: string }
  > = [];

  for (const img of images) {
    contentBlocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mediaType,
        data: img.base64,
      },
    });
  }

  contentBlocks.push({
    type: "text",
    text: `${userPrompt}\n\nRespond with valid JSON only, no other text.`,
  });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: contentBlocks }],
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

  return { content, model: "claude-sonnet-4-20250514", provider: "anthropic" };
}

function callVisionLLM(
  images: VisionImageInput[],
  systemPrompt: string,
  userPrompt: string
): Promise<VisionLLMResponse> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (openaiKey) {
    console.log("[visionAnalyzer] Using OpenAI (gpt-4o)");
    return callOpenAIVision(images, systemPrompt, userPrompt, openaiKey);
  } else if (anthropicKey) {
    console.log("[visionAnalyzer] Using Anthropic (claude-sonnet-4-20250514)");
    return callAnthropicVision(images, systemPrompt, userPrompt, anthropicKey);
  } else {
    throw new Error(
      "No LLM API key configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in your environment."
    );
  }
}

// ============================================
// JSON REPAIR (mirrors agentRunner.ts pattern)
// ============================================

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

// ============================================
// MAIN ANALYZER
// ============================================

export async function analyzeFlowchartImages(
  input: VisionAnalysisInput
): Promise<VisionAnalysisResult> {
  const { images, userHint } = input;

  if (!images || images.length === 0) {
    return {
      success: false,
      error: "No images provided",
      confidence: "low",
      warnings: [],
      model: "",
      provider: "openai",
    };
  }

  const { system, user } = buildVisionPrompt(images.length, userHint);

  const llmResponse = await callVisionLLM(images, system, user);

  // Parse the AI response
  const repairedJson = tryRepairJson(llmResponse.content);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(repairedJson);
  } catch {
    return {
      success: false,
      error:
        "Failed to parse AI response. The image may be too complex or unclear.",
      confidence: "low",
      warnings: [],
      suggestions: [
        "Try uploading a clearer or higher-resolution image",
        "Ensure the flowchart has readable text",
        "Try a simpler diagram with fewer elements",
      ],
      model: llmResponse.model,
      provider: llmResponse.provider,
    };
  }

  // Check if AI reported it couldn't read the image
  if (parsed.success === false) {
    return {
      success: false,
      error:
        (parsed.error as string) || "The AI could not interpret this image as a flowchart.",
      confidence: (parsed.confidence as "high" | "medium" | "low") || "low",
      warnings: (parsed.warnings as string[]) || [],
      suggestions: (parsed.suggestions as string[]) || [
        "Try a higher resolution image",
        "Ensure the flowchart has clear, readable text",
        "Use a photo with better lighting and contrast",
      ],
      model: llmResponse.model,
      provider: llmResponse.provider,
    };
  }

  // Extract the workflow data from the response
  const workflowData = parsed.workflow || parsed;

  // Validate against the existing import schema
  const validation = parseJSON(JSON.stringify(workflowData));

  if (!validation.valid || !validation.data) {
    const errorMessages = validation.errors
      .map((e) => e.message)
      .join("; ");

    return {
      success: false,
      error: `AI output did not match expected workflow format: ${errorMessages}`,
      confidence: "low",
      warnings: validation.warnings.map((w) => w.message),
      suggestions: [
        "Try uploading a clearer image",
        "Ensure the flowchart has labeled shapes and arrows",
      ],
      model: llmResponse.model,
      provider: llmResponse.provider,
    };
  }

  const confidence =
    (parsed.confidence as "high" | "medium" | "low") || "medium";
  const aiWarnings = (parsed.warnings as string[]) || [];
  const schemaWarnings = validation.warnings.map((w) => w.message);

  return {
    success: true,
    data: validation.data,
    confidence,
    warnings: [...aiWarnings, ...schemaWarnings],
    model: llmResponse.model,
    provider: llmResponse.provider,
  };
}
