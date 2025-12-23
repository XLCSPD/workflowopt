import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// ============================================
// POST: Create a new node
// ============================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      futureStateId,
      name,
      lane,
      stepType,
      positionX,
      positionY,
      action = "new",
      linkedSolutionId,
      description,
    } = body;

    if (!futureStateId || !name || !lane) {
      return NextResponse.json(
        { error: "Missing required fields: futureStateId, name, lane" },
        { status: 400 }
      );
    }

    // Verify the future state exists and user has access
    // Note: is_locked column may not exist until migration is applied
    const { data: futureState, error: fsError } = await supabase
      .from("future_states")
      .select("id, session_id")
      .eq("id", futureStateId)
      .single();

    if (fsError || !futureState) {
      console.error("Future state lookup error:", fsError);
      return NextResponse.json(
        { error: "Future state not found" },
        { status: 404 }
      );
    }

    // Note: is_locked check will be enabled after migration is applied
    // if (futureState.is_locked) {
    //   return NextResponse.json(
    //     { error: "Future state is locked and cannot be modified" },
    //     { status: 403 }
    //   );
    // }

    // Create the node
    const { data: node, error: insertError } = await supabase
      .from("future_state_nodes")
      .insert({
        future_state_id: futureStateId,
        name,
        lane,
        step_type: stepType || "action",
        position_x: positionX || 0,
        position_y: positionY || 0,
        action,
        linked_solution_id: linkedSolutionId || null,
        description: description || null,
        created_by: user.id,
        updated_by: user.id,
        step_design_status: "needs_step_design",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating node:", insertError);
      return NextResponse.json(
        { error: "Failed to create node" },
        { status: 500 }
      );
    }

    return NextResponse.json({ node }, { status: 201 });
  } catch (error) {
    console.error("Node creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH: Update an existing node
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { nodeId, updates } = body;

    if (!nodeId) {
      return NextResponse.json(
        { error: "Missing required field: nodeId" },
        { status: 400 }
      );
    }

    console.log("[PATCH nodes] Looking up node:", nodeId);

    // Get the node and verify it exists (simplified query to avoid is_locked column issues)
    const { data: existingNode, error: fetchError } = await supabase
      .from("future_state_nodes")
      .select("*")
      .eq("id", nodeId)
      .single();

    if (fetchError) {
      console.error("[PATCH nodes] Node lookup error:", fetchError);
      return NextResponse.json({ error: "Node not found", details: fetchError.message }, { status: 404 });
    }

    if (!existingNode) {
      console.error("[PATCH nodes] Node not found:", nodeId);
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    console.log("[PATCH nodes] Found node:", existingNode.id, existingNode.name);

    // Build update object with snake_case field names
    const updateData: Record<string, unknown> = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.lane !== undefined) updateData.lane = updates.lane;
    if (updates.stepType !== undefined) updateData.step_type = updates.stepType;
    if (updates.positionX !== undefined) updateData.position_x = updates.positionX;
    if (updates.positionY !== undefined) updateData.position_y = updates.positionY;
    if (updates.action !== undefined) updateData.action = updates.action;
    if (updates.linkedSolutionId !== undefined) {
      updateData.linked_solution_id = updates.linkedSolutionId;
    }
    if (updates.leadTimeMinutes !== undefined) {
      updateData.lead_time_minutes = updates.leadTimeMinutes;
    }
    if (updates.cycleTimeMinutes !== undefined) {
      updateData.cycle_time_minutes = updates.cycleTimeMinutes;
    }

    // Increment revision
    updateData.revision = (existingNode.revision || 0) + 1;

    console.log("[PATCH nodes] Update data:", updateData);

    // Update the node - don't use .single() to avoid RLS issues
    const { data: nodes, error: updateError } = await supabase
      .from("future_state_nodes")
      .update(updateData)
      .eq("id", nodeId)
      .select();

    if (updateError) {
      console.error("[PATCH nodes] Error updating node:", updateError);
      return NextResponse.json(
        { error: "Failed to update node", details: updateError.message },
        { status: 500 }
      );
    }

    console.log("[PATCH nodes] Update result:", nodes);

    if (!nodes || nodes.length === 0) {
      console.error("[PATCH nodes] No rows updated - likely RLS blocking update. Node created_by:", existingNode.created_by, "Current user:", user.id);
      return NextResponse.json(
        { error: "Failed to update node - access denied", details: "RLS policy may be blocking this update" },
        { status: 403 }
      );
    }

    return NextResponse.json({ node: nodes[0] });
  } catch (error) {
    console.error("Node update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Delete a node
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { nodeId, cascade = true } = body;

    if (!nodeId) {
      return NextResponse.json(
        { error: "Missing required field: nodeId" },
        { status: 400 }
      );
    }

    console.log("[DELETE nodes] Looking up node:", nodeId);

    // Get the node and verify it exists (simplified query to avoid is_locked column issues)
    const { data: existingNode, error: fetchError } = await supabase
      .from("future_state_nodes")
      .select("*")
      .eq("id", nodeId)
      .single();

    if (fetchError) {
      console.error("[DELETE nodes] Node lookup error:", fetchError);
      return NextResponse.json({ error: "Node not found", details: fetchError.message }, { status: 404 });
    }

    if (!existingNode) {
      console.error("[DELETE nodes] Node not found:", nodeId);
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    console.log("[DELETE nodes] Found node:", existingNode.id, existingNode.name);

    // If cascade, delete connected edges first
    if (cascade) {
      const { error: edgeDeleteError } = await supabase
        .from("future_state_edges")
        .delete()
        .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`);

      if (edgeDeleteError) {
        console.error("Error deleting connected edges:", edgeDeleteError);
        // Continue with node deletion anyway - edges might have CASCADE delete
      }
    }

    // Delete the node
    const { error: deleteError } = await supabase
      .from("future_state_nodes")
      .delete()
      .eq("id", nodeId);

    if (deleteError) {
      console.error("Error deleting node:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete node" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Node deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// GET: Get node(s)
// ============================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get("nodeId");
    const futureStateId = searchParams.get("futureStateId");

    if (nodeId) {
      // Get single node
      const { data: node, error } = await supabase
        .from("future_state_nodes")
        .select("*")
        .eq("id", nodeId)
        .single();

      if (error || !node) {
        return NextResponse.json({ error: "Node not found" }, { status: 404 });
      }

      return NextResponse.json({ node });
    }

    if (futureStateId) {
      // Get all nodes for a future state
      const { data: nodes, error } = await supabase
        .from("future_state_nodes")
        .select("*")
        .eq("future_state_id", futureStateId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching nodes:", error);
        return NextResponse.json(
          { error: "Failed to fetch nodes" },
          { status: 500 }
        );
      }

      return NextResponse.json({ nodes });
    }

    return NextResponse.json(
      { error: "Missing nodeId or futureStateId parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Node fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

