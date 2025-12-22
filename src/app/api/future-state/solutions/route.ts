import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rateLimit, insightsRateLimit } from "@/lib/rate-limit";
import { runAgent, buildSolutionsPrompt } from "@/lib/ai/agentRunner";
import { getWorkflowContext } from "@/lib/services/workflowContext";
import type { SolutionsAgentOutputType } from "@/lib/ai/schemas";

// Type for valid input IDs that AI output must be validated against
interface ValidInputIds {
  themeIds: Set<string>;
  observationIds: Set<string>;
  stepIds: Set<string>;
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
        { status: 429 }
      );
    }

    // Fetch confirmed themes for the session
    const { data: themesData, error: themesError } = await supabase
      .from("insight_themes")
      .select(`
        id,
        name,
        summary,
        root_cause_hypotheses,
        insight_theme_observations(observation_id),
        insight_theme_steps(step_id),
        insight_theme_waste_types(waste_type_id)
      `)
      .eq("session_id", sessionId)
      .in("status", ["draft", "confirmed"]);

    if (themesError) {
      console.error("Error fetching themes:", themesError);
      return NextResponse.json(
        { error: "Failed to fetch themes" },
        { status: 500 }
      );
    }

    if (!themesData || themesData.length === 0) {
      return NextResponse.json(
        { error: "No themes found. Complete synthesis first." },
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

    // Fetch observations for context
    const { data: observationsData } = await supabase
      .from("observations")
      .select(`
        id,
        notes,
        priority_score,
        step:process_steps!inner(step_name)
      `)
      .eq("session_id", sessionId);

    // Fetch all steps for the process
    const { data: stepsData } = await supabase
      .from("process_steps")
      .select("id, step_name, lane")
      .eq("process_id", session.process_id);

    // Transform themes
    const themes = themesData.map((t) => ({
      id: t.id,
      name: t.name,
      summary: t.summary || "",
      root_cause_hypotheses: t.root_cause_hypotheses || [],
      observation_ids: (t.insight_theme_observations as Array<{ observation_id: string }>)?.map(
        (o) => o.observation_id
      ) || [],
      step_ids: (t.insight_theme_steps as Array<{ step_id: string }>)?.map((s) => s.step_id) || [],
      waste_type_ids: (t.insight_theme_waste_types as Array<{ waste_type_id: string }>)?.map(
        (w) => w.waste_type_id
      ) || [],
    }));

    // Transform observations
    const observations = (observationsData || []).map((obs) => {
      const step = Array.isArray(obs.step) ? obs.step[0] : obs.step;
      return {
        id: obs.id,
        notes: obs.notes,
        step_name: step?.step_name || "Unknown",
        priority_score: obs.priority_score,
      };
    });

    const steps = stepsData || [];

    // Prepare inputs
    const inputs = { workflowContext, themes, observations, steps };

    // Run the solutions agent
    const result = await runAgent<"solutions">(
      {
        sessionId,
        agentType: "solutions",
        inputs,
        userId: authUser.id,
        supabase,
        forceRerun,
      },
      (inp) => buildSolutionsPrompt(inp as typeof inputs)
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Solutions agent failed" },
        { status: 500 }
      );
    }

    // If not cached, persist the solutions
    if (!result.cached && result.data) {
      // Build sets of valid IDs from the input data to validate AI output
      // This ensures the AI can only reference data from the current session
      const validInputIds: ValidInputIds = {
        themeIds: new Set(themes.map((t) => t.id)),
        observationIds: new Set(observations.map((o) => o.id)),
        stepIds: new Set(steps.map((s) => s.id)),
      };

      // Clear old solutions first to avoid accumulation on re-runs
      await clearExistingSolutions(supabase, sessionId);
      await persistSolutions(supabase, sessionId, authUser.id, result.data, validInputIds);
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
    console.error("Solutions agent error:", error);
    return NextResponse.json(
      { error: "Failed to run solutions agent" },
      { status: 500 }
    );
  }
}

/**
 * Clear existing solutions for a session before re-running the solutions agent.
 * This prevents solution accumulation when the agent is run multiple times.
 * The CASCADE on solution_themes/steps/observations will clean up links.
 */
async function clearExistingSolutions(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  sessionId: string
): Promise<void> {
  const { error } = await supabase
    .from("solution_cards")
    .delete()
    .eq("session_id", sessionId);

  if (error) {
    console.error("Error clearing existing solutions:", error);
    // Don't throw - allow persistence to continue even if cleanup fails
  }
}

async function persistSolutions(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  sessionId: string,
  userId: string,
  output: SolutionsAgentOutputType,
  validInputIds: ValidInputIds
): Promise<void> {
  for (const solution of output.solutions) {
    // Insert the solution
    const { data: insertedSolution, error: solutionError } = await supabase
      .from("solution_cards")
      .insert({
        session_id: sessionId,
        bucket: solution.bucket,
        title: solution.title,
        description: solution.description,
        expected_impact: solution.expected_impact,
        effort_level: solution.effort_level,
        risks: solution.risks,
        dependencies: solution.dependencies,
        recommended_wave: solution.recommended_wave,
        status: "draft",
        created_by: userId,
      })
      .select("id")
      .single();

    if (solutionError || !insertedSolution) {
      console.error("Error inserting solution:", solutionError);
      continue;
    }

    const solutionId = insertedSolution.id;

    // Validate IDs against the actual input data (not just UUID format)
    // This ensures AI output only references data from the current session
    const validThemeIds = solution.theme_ids.filter(
      (id) => validInputIds.themeIds.has(id)
    );
    const validStepIds = solution.step_ids.filter(
      (id) => validInputIds.stepIds.has(id)
    );
    const validObservationIds = solution.observation_ids.filter(
      (id) => validInputIds.observationIds.has(id)
    );

    // Log if any IDs were filtered out (useful for debugging AI hallucinations)
    const filteredThemeCount = solution.theme_ids.length - validThemeIds.length;
    const filteredStepCount = solution.step_ids.length - validStepIds.length;
    const filteredObsCount = solution.observation_ids.length - validObservationIds.length;
    if (filteredThemeCount > 0 || filteredStepCount > 0 || filteredObsCount > 0) {
      console.warn(
        `Solution "${solution.title}": Filtered out invalid IDs - ` +
        `${filteredThemeCount} themes, ${filteredStepCount} steps, ${filteredObsCount} observations`
      );
    }

    // Link themes (only IDs from current session)
    if (validThemeIds.length > 0) {
      const themeLinks = validThemeIds.map((themeId) => ({
        solution_id: solutionId,
        theme_id: themeId,
      }));
      await supabase.from("solution_themes").insert(themeLinks);
    }

    // Link steps (only IDs from current process)
    if (validStepIds.length > 0) {
      const stepLinks = validStepIds.map((stepId) => ({
        solution_id: solutionId,
        step_id: stepId,
      }));
      await supabase.from("solution_steps").insert(stepLinks);
    }

    // Link observations (only IDs from current session)
    if (validObservationIds.length > 0) {
      const obsLinks = validObservationIds.map((obsId) => ({
        solution_id: solutionId,
        observation_id: obsId,
      }));
      await supabase.from("solution_observations").insert(obsLinks);
    }
  }
}

// GET: Fetch existing solutions for a session
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

    // Fetch solutions with relations
    const { data: solutions, error } = await supabase
      .from("solution_cards")
      .select(`
        *,
        creator:users!solution_cards_created_by_fkey(id, name, email),
        solution_themes(theme_id),
        solution_steps(step_id),
        solution_observations(observation_id)
      `)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching solutions:", error);
      return NextResponse.json(
        { error: "Failed to fetch solutions" },
        { status: 500 }
      );
    }

    // Fetch latest agent run
    const { data: latestRun } = await supabase
      .from("agent_runs")
      .select("id, status, created_at, model, provider")
      .eq("session_id", sessionId)
      .eq("agent_type", "solutions")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      solutions: solutions || [],
      latestRun,
    });
  } catch (error) {
    console.error("Error fetching solutions:", error);
    return NextResponse.json(
      { error: "Failed to fetch solutions" },
      { status: 500 }
    );
  }
}

// PATCH: Update solution status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { solutionId, status, revision } = body;

    if (!solutionId || !status) {
      return NextResponse.json(
        { error: "Solution ID and status are required" },
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

    // Update with optimistic concurrency check
    const query = supabase
      .from("solution_cards")
      .update({ status, updated_by: authUser.id })
      .eq("id", solutionId);

    // If revision provided, check for conflicts
    if (revision !== undefined) {
      query.eq("revision", revision);
    }

    const { data, error } = await query.select().single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Conflict: solution was modified by another user" },
          { status: 409 }
        );
      }
      console.error("Error updating solution:", error);
      return NextResponse.json(
        { error: "Failed to update solution" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, solution: data });
  } catch (error) {
    console.error("Error updating solution:", error);
    return NextResponse.json(
      { error: "Failed to update solution" },
      { status: 500 }
    );
  }
}

