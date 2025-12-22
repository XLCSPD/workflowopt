import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rateLimit, insightsRateLimit } from "@/lib/rate-limit";
import { runAgent, buildDesignPrompt } from "@/lib/ai/agentRunner";
import { getWorkflowContext } from "@/lib/services/workflowContext";
import type { DesignAgentOutputType } from "@/lib/ai/schemas";

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

    // Fetch current process steps
    const { data: stepsData, error: stepsError } = await supabase
      .from("process_steps")
      .select("*")
      .eq("process_id", session.process_id)
      .order("order_index", { ascending: true });

    if (stepsError) {
      console.error("Error fetching steps:", stepsError);
      return NextResponse.json(
        { error: "Failed to fetch process steps" },
        { status: 500 }
      );
    }

    if (!stepsData || stepsData.length === 0) {
      return NextResponse.json(
        { error: "No process steps found" },
        { status: 400 }
      );
    }

    // Fetch current edges
    const { data: edgesData, error: edgesError } = await supabase
      .from("step_connections")
      .select("source_step_id, target_step_id, label")
      .eq("process_id", session.process_id);

    if (edgesError) {
      console.error("Error fetching edges:", edgesError);
    }

    // Fetch accepted solutions
    const { data: solutionsData, error: solutionsError } = await supabase
      .from("solution_cards")
      .select(`
        id,
        bucket,
        title,
        description,
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

    // Get unique lanes
    const lanes = Array.from(new Set(stepsData.map((s) => s.lane)));

    // Transform data
    const currentSteps = stepsData.map((s) => ({
      id: s.id,
      step_name: s.step_name,
      description: s.description,
      lane: s.lane,
      step_type: s.step_type,
      position_x: s.position_x ?? 0,
      position_y: s.position_y ?? 0,
      lead_time_minutes: s.lead_time_minutes,
      cycle_time_minutes: s.cycle_time_minutes,
    }));

    const currentEdges = (edgesData || []).map((e) => ({
      source_step_id: e.source_step_id,
      target_step_id: e.target_step_id,
      label: e.label,
    }));

    const solutions = solutionsData.map((s) => ({
      id: s.id,
      bucket: s.bucket,
      title: s.title,
      description: s.description || "",
      step_ids: (s.solution_steps as Array<{ step_id: string }>)?.map((st) => st.step_id) || [],
    }));

    // Prepare inputs
    const inputs = { workflowContext, currentSteps, currentEdges, solutions, lanes };

    // Run the design agent
    const result = await runAgent<"design">(
      {
        sessionId,
        agentType: "design",
        inputs,
        userId: authUser.id,
        supabase,
        forceRerun,
      },
      (inp) => buildDesignPrompt(inp as typeof inputs)
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Design agent failed" },
        { status: 500 }
      );
    }

    // If not cached, persist the future state
    if (!result.cached && result.data) {
      const futureStateId = await persistFutureState(
        supabase,
        session.process_id,
        sessionId,
        authUser.id,
        result.data
      );
      return NextResponse.json({
        success: true,
        runId: result.runId,
        cached: result.cached,
        model: result.model,
        provider: result.provider,
        data: result.data,
        futureStateId,
      });
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
    console.error("Design agent error:", error);
    return NextResponse.json(
      { error: "Failed to run design agent" },
      { status: 500 }
    );
  }
}

async function persistFutureState(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  processId: string,
  sessionId: string,
  userId: string,
  output: DesignAgentOutputType
): Promise<string | null> {
  const { future_state } = output;

  // Get next version number
  const { data: existingStates } = await supabase
    .from("future_states")
    .select("version")
    .eq("session_id", sessionId)
    .order("version", { ascending: false })
    .limit(1);

  const nextVersion = (existingStates?.[0]?.version ?? 0) + 1;

  // Create future state
  const { data: insertedState, error: stateError } = await supabase
    .from("future_states")
    .insert({
      process_id: processId,
      session_id: sessionId,
      name: `${future_state.name} v${nextVersion}`,
      version: nextVersion,
      status: "draft",
      created_by: userId,
    })
    .select("id")
    .single();

  if (stateError || !insertedState) {
    console.error("Error inserting future state:", stateError);
    return null;
  }

  const futureStateId = insertedState.id;

  // Insert nodes and track their IDs for edge creation
  const nodeIdMap: Record<number, string> = {};

  for (let i = 0; i < future_state.nodes.length; i++) {
    const node = future_state.nodes[i];
    const { data: insertedNode, error: nodeError } = await supabase
      .from("future_state_nodes")
      .insert({
        future_state_id: futureStateId,
        source_step_id: node.source_step_id || null,
        name: node.name,
        description: node.description,
        lane: node.lane,
        step_type: node.step_type,
        lead_time_minutes: node.lead_time_minutes,
        cycle_time_minutes: node.cycle_time_minutes,
        position_x: node.position_x,
        position_y: node.position_y,
        action: node.action,
        modified_fields: {
          ...node.modified_fields,
          explanation: node.explanation,
        },
        linked_solution_id: node.linked_solution_id || null,
        created_by: userId,
      })
      .select("id")
      .single();

    if (nodeError || !insertedNode) {
      console.error("Error inserting node:", nodeError);
      continue;
    }

    nodeIdMap[i] = insertedNode.id;
  }

  // Insert edges
  for (const edge of future_state.edges) {
    const sourceNodeId = nodeIdMap[edge.source_node_index];
    const targetNodeId = nodeIdMap[edge.target_node_index];

    if (!sourceNodeId || !targetNodeId) {
      console.error("Invalid edge node indices:", edge);
      continue;
    }

    await supabase.from("future_state_edges").insert({
      future_state_id: futureStateId,
      source_node_id: sourceNodeId,
      target_node_id: targetNodeId,
      label: edge.label,
    });
  }

  return futureStateId;
}

// GET: Fetch existing future states for a session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const futureStateId = searchParams.get("futureStateId");

    if (!sessionId && !futureStateId) {
      return NextResponse.json(
        { error: "Session ID or Future State ID is required" },
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

    if (futureStateId) {
      // Fetch single future state with full graph
      const { data: futureState, error } = await supabase
        .from("future_states")
        .select(`
          *,
          creator:users!future_states_created_by_fkey(id, name, email),
          nodes:future_state_nodes(*),
          edges:future_state_edges(*)
        `)
        .eq("id", futureStateId)
        .single();

      if (error) {
        console.error("Error fetching future state:", error);
        return NextResponse.json(
          { error: "Failed to fetch future state" },
          { status: 500 }
        );
      }

      return NextResponse.json({ futureState });
    }

    // Fetch all future states for session
    const { data: futureStates, error } = await supabase
      .from("future_states")
      .select(`
        *,
        creator:users!future_states_created_by_fkey(id, name, email)
      `)
      .eq("session_id", sessionId)
      .order("version", { ascending: false });

    if (error) {
      console.error("Error fetching future states:", error);
      return NextResponse.json(
        { error: "Failed to fetch future states" },
        { status: 500 }
      );
    }

    // Fetch latest agent run
    const { data: latestRun } = await supabase
      .from("agent_runs")
      .select("id, status, created_at, model, provider")
      .eq("session_id", sessionId)
      .eq("agent_type", "design")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      futureStates: futureStates || [],
      latestRun,
    });
  } catch (error) {
    console.error("Error fetching future states:", error);
    return NextResponse.json(
      { error: "Failed to fetch future states" },
      { status: 500 }
    );
  }
}

// PATCH: Update future state node
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { nodeId, updates, revision } = body;

    if (!nodeId || !updates) {
      return NextResponse.json(
        { error: "Node ID and updates are required" },
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
      .from("future_state_nodes")
      .update({ ...updates, updated_by: authUser.id })
      .eq("id", nodeId);

    if (revision !== undefined) {
      query.eq("revision", revision);
    }

    const { data, error } = await query.select().single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Conflict: node was modified by another user" },
          { status: 409 }
        );
      }
      console.error("Error updating node:", error);
      return NextResponse.json(
        { error: "Failed to update node" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, node: data });
  } catch (error) {
    console.error("Error updating node:", error);
    return NextResponse.json(
      { error: "Failed to update node" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a future state
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const futureStateId = searchParams.get("futureStateId");

    if (!futureStateId) {
      return NextResponse.json(
        { error: "Future State ID is required" },
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

    const { error } = await supabase
      .from("future_states")
      .delete()
      .eq("id", futureStateId);

    if (error) {
      console.error("Error deleting future state:", error);
      return NextResponse.json(
        { error: "Failed to delete future state" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting future state:", error);
    return NextResponse.json(
      { error: "Failed to delete future state" },
      { status: 500 }
    );
  }
}

