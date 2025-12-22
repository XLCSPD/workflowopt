import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rateLimit, insightsRateLimit } from "@/lib/rate-limit";
import { runAgent, buildSynthesisPrompt } from "@/lib/ai/agentRunner";
import { getWorkflowContext } from "@/lib/services/workflowContext";
import type { SynthesisAgentOutputType } from "@/lib/ai/schemas";

// Type for valid input IDs that AI output must be validated against
interface ValidInputIds {
  observationIds: Set<string>;
  stepIds: Set<string>;
  wasteTypeIds: Set<string>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, forceRerun = false } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Apply rate limiting
    const rateLimitResult = rateLimit(authUser.id, insightsRateLimit);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: `Rate limit exceeded. Please try again in ${rateLimitResult.reset} seconds.`,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
          },
        }
      );
    }

    // Fetch observations for the session
    const { data: observationsData, error: obsError } = await supabase
      .from("observations")
      .select(`
        id,
        notes,
        priority_score,
        step:process_steps!inner(id, step_name, lane),
        observation_waste_links(
          waste_type:waste_types(id, name, code)
        )
      `)
      .eq("session_id", sessionId);

    if (obsError) {
      console.error("Error fetching observations:", obsError);
      return NextResponse.json(
        { error: "Failed to fetch observations" },
        { status: 500 }
      );
    }

    if (!observationsData || observationsData.length === 0) {
      return NextResponse.json(
        { error: "No observations found for this session. Complete a waste walk first." },
        { status: 400 }
      );
    }

    // Fetch session to get process_id
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("process_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Fetch workflow context if available
    const workflowContext = await getWorkflowContext(session.process_id);

    // Fetch all steps for the process
    const { data: stepsData, error: stepsError } = await supabase
      .from("process_steps")
      .select("id, step_name, lane")
      .eq("process_id", session.process_id);

    if (stepsError) {
      console.error("Error fetching steps:", stepsError);
      return NextResponse.json(
        { error: "Failed to fetch process steps" },
        { status: 500 }
      );
    }

    // Fetch all waste types
    const { data: wasteTypesData, error: wasteError } = await supabase
      .from("waste_types")
      .select("id, name, code");

    if (wasteError) {
      console.error("Error fetching waste types:", wasteError);
      return NextResponse.json(
        { error: "Failed to fetch waste types" },
        { status: 500 }
      );
    }

    // Transform observations
    interface WasteLink {
      waste_type: { id: string; name: string; code: string } | { id: string; name: string; code: string }[] | null;
    }

    const observations = observationsData.map((obs) => {
      const step = Array.isArray(obs.step) ? obs.step[0] : obs.step;
      const links = (obs.observation_waste_links || []) as WasteLink[];
      const wasteTypes: { id: string; name: string; code: string }[] = [];
      
      for (const link of links) {
        if (link.waste_type) {
          if (Array.isArray(link.waste_type)) {
            wasteTypes.push(...link.waste_type);
          } else {
            wasteTypes.push(link.waste_type);
          }
        }
      }

      return {
        id: obs.id,
        notes: obs.notes,
        step_name: step?.step_name || "Unknown",
        lane: step?.lane || "Unknown",
        waste_types: wasteTypes,
        priority_score: obs.priority_score,
      };
    });

    const steps = stepsData || [];
    const wasteTypes = wasteTypesData || [];

    // Debug: Log what observations are being sent to the AI
    console.log(`[Synthesis] Session ${sessionId}:`);
    console.log(`  - Observations count: ${observations.length}`);
    observations.forEach((obs, i) => {
      console.log(`  - Obs ${i + 1}: step="${obs.step_name}", lane="${obs.lane}", notes="${obs.notes?.substring(0, 100) || 'no notes'}..."`);
    });
    console.log(`  - Steps count: ${steps.length}`);

    // Prepare inputs for the agent
    const inputs = {
      workflowContext,
      observations,
      steps,
      waste_types: wasteTypes,
    };

    // Run the synthesis agent
    const result = await runAgent<"synthesis">(
      {
        sessionId,
        agentType: "synthesis",
        inputs,
        userId: authUser.id,
        supabase,
        forceRerun,
      },
      (inp) => buildSynthesisPrompt(inp as typeof inputs)
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Synthesis agent failed" },
        { status: 500 }
      );
    }

    // If not cached, persist the themes to the database
    if (!result.cached && result.data) {
      // Build sets of valid IDs from the input data to validate AI output
      // This ensures the AI can only reference data from the current session
      const validInputIds: ValidInputIds = {
        observationIds: new Set(observations.map((o) => o.id)),
        stepIds: new Set(steps.map((s) => s.id)),
        wasteTypeIds: new Set(wasteTypes.map((w) => w.id)),
      };

      // Clear old themes first to avoid accumulation on re-runs
      await clearExistingThemes(supabase, sessionId);
      await persistThemes(supabase, sessionId, authUser.id, result.data, validInputIds);
    }

    return NextResponse.json({
      success: true,
      runId: result.runId,
      cached: result.cached,
      model: result.model,
      provider: result.provider,
      data: result.data,
    });
  } catch (error) {
    console.error("Synthesis agent error:", error);
    return NextResponse.json(
      { error: "Failed to run synthesis agent" },
      { status: 500 }
    );
  }
}

/**
 * Clear existing themes for a session before re-running synthesis.
 * This prevents theme accumulation when the agent is run multiple times.
 * The CASCADE on insight_theme_observations/steps/waste_types will clean up links.
 */
async function clearExistingThemes(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  sessionId: string
): Promise<void> {
  const { error } = await supabase
    .from("insight_themes")
    .delete()
    .eq("session_id", sessionId);

  if (error) {
    console.error("Error clearing existing themes:", error);
    // Don't throw - allow persistence to continue even if cleanup fails
  }
}

async function persistThemes(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  sessionId: string,
  userId: string,
  output: SynthesisAgentOutputType,
  validInputIds: ValidInputIds
): Promise<void> {
  for (const theme of output.themes) {
    // Insert the theme
    const { data: insertedTheme, error: themeError } = await supabase
      .from("insight_themes")
      .insert({
        session_id: sessionId,
        name: theme.name,
        summary: theme.summary,
        confidence: theme.confidence,
        root_cause_hypotheses: theme.root_cause_hypotheses,
        status: "draft",
        created_by: userId,
      })
      .select("id")
      .single();

    if (themeError || !insertedTheme) {
      console.error("Error inserting theme:", themeError);
      continue;
    }

    const themeId = insertedTheme.id;

    // Validate IDs against the actual input data (not just UUID format)
    // This ensures AI output only references data from the current session
    const validObservationIds = theme.observation_ids.filter(
      (id) => validInputIds.observationIds.has(id)
    );
    const validStepIds = theme.step_ids.filter(
      (id) => validInputIds.stepIds.has(id)
    );
    const validWasteTypeIds = theme.waste_type_ids.filter(
      (id) => validInputIds.wasteTypeIds.has(id)
    );

    // Log if any IDs were filtered out (useful for debugging AI hallucinations)
    const filteredObsCount = theme.observation_ids.length - validObservationIds.length;
    const filteredStepCount = theme.step_ids.length - validStepIds.length;
    const filteredWasteCount = theme.waste_type_ids.length - validWasteTypeIds.length;
    if (filteredObsCount > 0 || filteredStepCount > 0 || filteredWasteCount > 0) {
      console.warn(
        `Theme "${theme.name}": Filtered out invalid IDs - ` +
        `${filteredObsCount} observations, ${filteredStepCount} steps, ${filteredWasteCount} waste types`
      );
    }

    // Link observations (only IDs from current session)
    if (validObservationIds.length > 0) {
      const observationLinks = validObservationIds.map((obsId) => ({
        theme_id: themeId,
        observation_id: obsId,
      }));
      await supabase.from("insight_theme_observations").insert(observationLinks);
    }

    // Link steps (only IDs from current process)
    if (validStepIds.length > 0) {
      const stepLinks = validStepIds.map((stepId) => ({
        theme_id: themeId,
        step_id: stepId,
      }));
      await supabase.from("insight_theme_steps").insert(stepLinks);
    }

    // Link waste types (only valid waste type IDs)
    if (validWasteTypeIds.length > 0) {
      const wasteLinks = validWasteTypeIds.map((wasteId) => ({
        theme_id: themeId,
        waste_type_id: wasteId,
      }));
      await supabase.from("insight_theme_waste_types").insert(wasteLinks);
    }
  }
}

// GET: Fetch existing themes for a session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch themes with relations
    const { data: themes, error } = await supabase
      .from("insight_themes")
      .select(`
        *,
        creator:users!insight_themes_created_by_fkey(id, name, email),
        insight_theme_observations(observation_id),
        insight_theme_steps(step_id),
        insight_theme_waste_types(waste_type_id)
      `)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching themes:", error);
      return NextResponse.json(
        { error: "Failed to fetch themes" },
        { status: 500 }
      );
    }

    // Fetch latest agent run for this session
    const { data: latestRun } = await supabase
      .from("agent_runs")
      .select("id, status, created_at, model, provider")
      .eq("session_id", sessionId)
      .eq("agent_type", "synthesis")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      themes: themes || [],
      latestRun,
    });
  } catch (error) {
    console.error("Error fetching themes:", error);
    return NextResponse.json(
      { error: "Failed to fetch themes" },
      { status: 500 }
    );
  }
}

