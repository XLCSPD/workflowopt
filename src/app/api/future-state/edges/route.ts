import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// ============================================
// POST: Create a new edge
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
    const { futureStateId, sourceNodeId, targetNodeId, label } = body;

    console.log("[POST edges] Request body:", { futureStateId, sourceNodeId, targetNodeId, label });

    if (!futureStateId || !sourceNodeId || !targetNodeId) {
      return NextResponse.json(
        { error: "Missing required fields: futureStateId, sourceNodeId, targetNodeId" },
        { status: 400 }
      );
    }

    // Prevent self-loops
    if (sourceNodeId === targetNodeId) {
      return NextResponse.json(
        { error: "Cannot create edge from a node to itself" },
        { status: 400 }
      );
    }

    // Verify the future state exists
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

    // Verify both nodes exist and belong to this future state
    const { data: nodes, error: nodesError } = await supabase
      .from("future_state_nodes")
      .select("id")
      .eq("future_state_id", futureStateId)
      .in("id", [sourceNodeId, targetNodeId]);

    if (nodesError || !nodes || nodes.length !== 2) {
      return NextResponse.json(
        { error: "One or both nodes not found in this future state" },
        { status: 400 }
      );
    }

    // Check for duplicate edge
    const { data: existingEdge } = await supabase
      .from("future_state_edges")
      .select("id")
      .eq("future_state_id", futureStateId)
      .eq("source_node_id", sourceNodeId)
      .eq("target_node_id", targetNodeId)
      .single();

    if (existingEdge) {
      return NextResponse.json(
        { error: "Edge already exists between these nodes" },
        { status: 400 }
      );
    }

    // Check for cycles (simple check - prevent immediate reverse edge)
    const { data: reverseEdge } = await supabase
      .from("future_state_edges")
      .select("id")
      .eq("future_state_id", futureStateId)
      .eq("source_node_id", targetNodeId)
      .eq("target_node_id", sourceNodeId)
      .single();

    if (reverseEdge) {
      // Allow reverse edges for now, but log a warning
      console.warn("Creating reverse edge - may create cycle");
    }

    // Get the next order index for edges from this source
    const { data: existingEdges } = await supabase
      .from("future_state_edges")
      .select("order_index")
      .eq("future_state_id", futureStateId)
      .eq("source_node_id", sourceNodeId)
      .order("order_index", { ascending: false })
      .limit(1);

    const nextOrderIndex = existingEdges && existingEdges.length > 0 
      ? (existingEdges[0].order_index || 0) + 1 
      : 0;

    // Create the edge
    const { data: edge, error: insertError } = await supabase
      .from("future_state_edges")
      .insert({
        future_state_id: futureStateId,
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        label: label || null,
        order_index: nextOrderIndex,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating edge:", insertError);
      // Check if it's an RLS policy violation
      if (insertError.code === "42501") {
        return NextResponse.json(
          { error: "Permission denied - RLS policy needs to allow edge creation" },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: "Failed to create edge" },
        { status: 500 }
      );
    }

    return NextResponse.json({ edge }, { status: 201 });
  } catch (error) {
    console.error("Edge creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH: Update an existing edge
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
    const { edgeId, updates } = body;

    if (!edgeId) {
      return NextResponse.json(
        { error: "Missing required field: edgeId" },
        { status: 400 }
      );
    }

    // Get the edge and verify it exists
    // Note: is_locked column may not exist until migration is applied
    const { data: existingEdge, error: fetchError } = await supabase
      .from("future_state_edges")
      .select("*")
      .eq("id", edgeId)
      .single();

    if (fetchError || !existingEdge) {
      console.error("Edge lookup error:", fetchError);
      return NextResponse.json({ error: "Edge not found" }, { status: 404 });
    }

    // Note: is_locked check will be enabled after migration is applied
    // if (existingEdge.future_state?.is_locked) {
    //   return NextResponse.json(
    //     { error: "Future state is locked and cannot be modified" },
    //     { status: 403 }
    //   );
    // }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.label !== undefined) updateData.label = updates.label;
    if (updates.orderIndex !== undefined) updateData.order_index = updates.orderIndex;

    // Update the edge
    const { data: edge, error: updateError } = await supabase
      .from("future_state_edges")
      .update(updateData)
      .eq("id", edgeId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating edge:", updateError);
      return NextResponse.json(
        { error: "Failed to update edge" },
        { status: 500 }
      );
    }

    return NextResponse.json({ edge });
  } catch (error) {
    console.error("Edge update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Delete an edge
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
    const { edgeId } = body;

    if (!edgeId) {
      return NextResponse.json(
        { error: "Missing required field: edgeId" },
        { status: 400 }
      );
    }

    // Get the edge and verify it exists
    // Note: is_locked column may not exist until migration is applied
    const { data: existingEdge, error: fetchError } = await supabase
      .from("future_state_edges")
      .select("*")
      .eq("id", edgeId)
      .single();

    if (fetchError || !existingEdge) {
      console.error("Edge lookup error for delete:", fetchError);
      return NextResponse.json({ error: "Edge not found" }, { status: 404 });
    }

    // Note: is_locked check will be enabled after migration is applied
    // if (existingEdge.future_state?.is_locked) {
    //   return NextResponse.json(
    //     { error: "Future state is locked and cannot be modified" },
    //     { status: 403 }
    //   );
    // }

    // Delete the edge
    const { error: deleteError } = await supabase
      .from("future_state_edges")
      .delete()
      .eq("id", edgeId);

    if (deleteError) {
      console.error("Error deleting edge:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete edge" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Edge deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// GET: Get edge(s)
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
    const edgeId = searchParams.get("edgeId");
    const futureStateId = searchParams.get("futureStateId");

    if (edgeId) {
      // Get single edge
      const { data: edge, error } = await supabase
        .from("future_state_edges")
        .select("*")
        .eq("id", edgeId)
        .single();

      if (error || !edge) {
        return NextResponse.json({ error: "Edge not found" }, { status: 404 });
      }

      return NextResponse.json({ edge });
    }

    if (futureStateId) {
      // Get all edges for a future state
      const { data: edges, error } = await supabase
        .from("future_state_edges")
        .select("*")
        .eq("future_state_id", futureStateId)
        .order("order_index", { ascending: true });

      if (error) {
        console.error("Error fetching edges:", error);
        return NextResponse.json(
          { error: "Failed to fetch edges" },
          { status: 500 }
        );
      }

      return NextResponse.json({ edges });
    }

    return NextResponse.json(
      { error: "Missing edgeId or futureStateId parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Edge fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

