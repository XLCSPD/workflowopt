import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rateLimit, insightsRateLimit } from "@/lib/rate-limit";
import { runAgent, buildSequencingPrompt } from "@/lib/ai/agentRunner";
import type { SequencingAgentOutputType } from "@/lib/ai/schemas";

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

    // Fetch accepted solutions for the session
    const { data: solutionsData, error: solutionsError } = await supabase
      .from("solution_cards")
      .select(`
        id,
        bucket,
        title,
        description,
        effort_level,
        recommended_wave,
        dependencies,
        solution_steps(step_id)
      `)
      .eq("session_id", sessionId)
      .eq("status", "accepted");

    if (solutionsError) {
      console.error("Error fetching solutions:", solutionsError);
      return NextResponse.json(
        { error: "Failed to fetch solutions" },
        { status: 500 }
      );
    }

    if (!solutionsData || solutionsData.length === 0) {
      return NextResponse.json(
        { error: "No accepted solutions found. Accept solutions first." },
        { status: 400 }
      );
    }

    // Transform solutions
    const solutions = solutionsData.map((s) => ({
      id: s.id,
      bucket: s.bucket,
      title: s.title,
      description: s.description || "",
      effort_level: s.effort_level || "medium",
      recommended_wave: s.recommended_wave || "",
      dependencies: s.dependencies || [],
      step_ids: (s.solution_steps as Array<{ step_id: string }>)?.map((st) => st.step_id) || [],
    }));

    // Prepare inputs
    const inputs = { solutions };

    // Run the sequencing agent
    const result = await runAgent<"sequencing">(
      {
        sessionId,
        agentType: "sequencing",
        inputs,
        userId: authUser.id,
        supabase,
        forceRerun,
      },
      (inp) => buildSequencingPrompt(inp as typeof inputs)
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Sequencing agent failed" },
        { status: 500 }
      );
    }

    // If not cached, persist the waves and dependencies
    if (!result.cached && result.data) {
      await persistSequencing(supabase, sessionId, authUser.id, result.data);
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
    console.error("Sequencing agent error:", error);
    return NextResponse.json(
      { error: "Failed to run sequencing agent" },
      { status: 500 }
    );
  }
}

async function persistSequencing(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  sessionId: string,
  userId: string,
  output: SequencingAgentOutputType
): Promise<void> {
  // Clear existing waves for this session (to avoid duplicates on re-run)
  await supabase.from("implementation_waves").delete().eq("session_id", sessionId);

  // Also clear implementation_items for this session (new tables)
  await supabase.from("implementation_items").delete().eq("session_id", sessionId);

  // Insert waves
  for (const wave of output.waves) {
    const { data: insertedWave, error: waveError } = await supabase
      .from("implementation_waves")
      .insert({
        session_id: sessionId,
        name: wave.name,
        order_index: wave.order_index,
        start_estimate: wave.start_estimate,
        end_estimate: wave.end_estimate,
        created_by: userId,
      })
      .select("id")
      .single();

    if (waveError || !insertedWave) {
      console.error("Error inserting wave:", waveError);
      continue;
    }

    // Link solutions to this wave (legacy table for backward compatibility)
    if (wave.solution_ids.length > 0) {
      const waveSolutions = wave.solution_ids.map((solutionId, index) => ({
        wave_id: insertedWave.id,
        solution_id: solutionId,
        order_index: index,
      }));
      await supabase.from("wave_solutions").insert(waveSolutions);
    }
  }

  // Insert dependencies
  if (output.dependencies.length > 0) {
    // Clear existing dependencies for solutions in this session
    const solutionIds = output.dependencies.map((d) => d.solution_id);
    await supabase
      .from("solution_dependencies")
      .delete()
      .in("solution_id", solutionIds);

    const dependencies = output.dependencies.map((d) => ({
      solution_id: d.solution_id,
      depends_on_solution_id: d.depends_on_solution_id,
    }));
    await supabase.from("solution_dependencies").insert(dependencies);
  }
}


// GET: Fetch existing waves and dependencies for a session
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

    // Fetch waves with solutions (legacy)
    const { data: waves, error: wavesError } = await supabase
      .from("implementation_waves")
      .select(`
        *,
        wave_solutions(
          solution_id,
          order_index,
          solution:solution_cards(*)
        ),
        wave_items(
          item_id,
          order_index,
          item:implementation_items(
            *,
            solution:solution_cards(*),
            step_design_option:step_design_options(
              *,
              version:step_design_versions(
                *,
                node:future_state_nodes(*)
              )
            )
          )
        )
      `)
      .eq("session_id", sessionId)
      .order("order_index", { ascending: true });

    if (wavesError) {
      console.error("Error fetching waves:", wavesError);
      return NextResponse.json(
        { error: "Failed to fetch waves" },
        { status: 500 }
      );
    }

    // Fetch solution dependencies
    const { data: solutionDependencies, error: depsError } = await supabase
      .from("solution_dependencies")
      .select(`
        *,
        solution:solution_cards!solution_dependencies_solution_id_fkey(id, title),
        depends_on:solution_cards!solution_dependencies_depends_on_solution_id_fkey(id, title)
      `)
      .in(
        "solution_id",
        (waves || []).flatMap((w) =>
          (w.wave_solutions as Array<{ solution_id: string }>)?.map((ws) => ws.solution_id) || []
        )
      );

    if (depsError) {
      console.error("Error fetching solution dependencies:", depsError);
    }

    // Fetch implementation items for step design options
    const { data: implementationItems, error: itemsError } = await supabase
      .from("implementation_items")
      .select(`
        *,
        solution:solution_cards(*),
        step_design_option:step_design_options(
          *,
          version:step_design_versions(
            *,
            node:future_state_nodes(*)
          )
        )
      `)
      .eq("session_id", sessionId);

    if (itemsError) {
      console.error("Error fetching implementation items:", itemsError);
    }

    // Fetch implementation dependencies (item-level)
    const itemIds = (implementationItems || []).map((i) => i.id);
    let implementationDependencies: Array<{
      id: string;
      item_id: string;
      depends_on_item_id: string;
    }> = [];
    
    if (itemIds.length > 0) {
      const { data: implDeps, error: implDepsError } = await supabase
        .from("implementation_dependencies")
        .select("*")
        .in("item_id", itemIds);

      if (implDepsError) {
        console.error("Error fetching implementation dependencies:", implDepsError);
      } else {
        implementationDependencies = implDeps || [];
      }
    }

    // Fetch latest agent run
    const { data: latestRun } = await supabase
      .from("agent_runs")
      .select("id, status, created_at, model, provider")
      .eq("session_id", sessionId)
      .eq("agent_type", "sequencing")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      waves: waves || [],
      dependencies: solutionDependencies || [],
      implementationItems: implementationItems || [],
      implementationDependencies,
      latestRun,
    });
  } catch (error) {
    console.error("Error fetching sequencing:", error);
    return NextResponse.json(
      { error: "Failed to fetch sequencing data" },
      { status: 500 }
    );
  }
}

// PATCH: Update wave assignment for a solution
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { solutionId, waveId, orderIndex } = body;

    if (!solutionId || !waveId) {
      return NextResponse.json(
        { error: "Solution ID and Wave ID are required" },
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

    // Remove from current wave
    await supabase
      .from("wave_solutions")
      .delete()
      .eq("solution_id", solutionId);

    // Add to new wave
    const { error } = await supabase.from("wave_solutions").insert({
      wave_id: waveId,
      solution_id: solutionId,
      order_index: orderIndex ?? 0,
    });

    if (error) {
      console.error("Error updating wave assignment:", error);
      return NextResponse.json(
        { error: "Failed to update wave assignment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating wave assignment:", error);
    return NextResponse.json(
      { error: "Failed to update wave assignment" },
      { status: 500 }
    );
  }
}

