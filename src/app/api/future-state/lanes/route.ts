import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// ============================================
// POST: Create a new lane
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
    const { futureStateId, name, color = "blue", orderIndex } = body;

    if (!futureStateId || !name) {
      return NextResponse.json(
        { error: "Missing required fields: futureStateId, name" },
        { status: 400 }
      );
    }

    // Verify the future state exists and is not locked
    const { data: futureState, error: fsError } = await supabase
      .from("future_states")
      .select("id, is_locked")
      .eq("id", futureStateId)
      .single();

    if (fsError || !futureState) {
      return NextResponse.json(
        { error: "Future state not found" },
        { status: 404 }
      );
    }

    if (futureState.is_locked) {
      return NextResponse.json(
        { error: "Future state is locked and cannot be modified" },
        { status: 403 }
      );
    }

    // Check for duplicate lane name
    const { data: existingLane } = await supabase
      .from("future_state_lanes")
      .select("id")
      .eq("future_state_id", futureStateId)
      .eq("name", name)
      .single();

    if (existingLane) {
      return NextResponse.json(
        { error: "A lane with this name already exists" },
        { status: 400 }
      );
    }

    // Get next order index if not provided
    let finalOrderIndex = orderIndex;
    if (finalOrderIndex === undefined) {
      const { data: lanes } = await supabase
        .from("future_state_lanes")
        .select("order_index")
        .eq("future_state_id", futureStateId)
        .order("order_index", { ascending: false })
        .limit(1);

      finalOrderIndex = lanes && lanes.length > 0 ? (lanes[0].order_index || 0) + 1 : 0;
    }

    // Create the lane
    const { data: lane, error: insertError } = await supabase
      .from("future_state_lanes")
      .insert({
        future_state_id: futureStateId,
        name,
        color,
        order_index: finalOrderIndex,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating lane:", insertError);
      return NextResponse.json(
        { error: "Failed to create lane" },
        { status: 500 }
      );
    }

    return NextResponse.json({ lane }, { status: 201 });
  } catch (error) {
    console.error("Lane creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH: Update an existing lane
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
    const { laneId, updates } = body;

    if (!laneId) {
      return NextResponse.json(
        { error: "Missing required field: laneId" },
        { status: 400 }
      );
    }

    // Get the lane and verify it exists
    const { data: existingLane, error: fetchError } = await supabase
      .from("future_state_lanes")
      .select("*, future_state:future_states(id, is_locked)")
      .eq("id", laneId)
      .single();

    if (fetchError || !existingLane) {
      return NextResponse.json({ error: "Lane not found" }, { status: 404 });
    }

    // Check if future state is locked
    if (existingLane.future_state?.is_locked) {
      return NextResponse.json(
        { error: "Future state is locked and cannot be modified" },
        { status: 403 }
      );
    }

    // If renaming, check for duplicate
    if (updates.name && updates.name !== existingLane.name) {
      const { data: duplicate } = await supabase
        .from("future_state_lanes")
        .select("id")
        .eq("future_state_id", existingLane.future_state_id)
        .eq("name", updates.name)
        .neq("id", laneId)
        .single();

      if (duplicate) {
        return NextResponse.json(
          { error: "A lane with this name already exists" },
          { status: 400 }
        );
      }

      // Also update nodes that reference this lane
      await supabase
        .from("future_state_nodes")
        .update({ lane: updates.name, updated_by: user.id })
        .eq("future_state_id", existingLane.future_state_id)
        .eq("lane", existingLane.name);
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.orderIndex !== undefined) updateData.order_index = updates.orderIndex;

    // Update the lane
    const { data: lane, error: updateError } = await supabase
      .from("future_state_lanes")
      .update(updateData)
      .eq("id", laneId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating lane:", updateError);
      return NextResponse.json(
        { error: "Failed to update lane" },
        { status: 500 }
      );
    }

    return NextResponse.json({ lane });
  } catch (error) {
    console.error("Lane update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Delete a lane
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
    const { laneId } = body;

    if (!laneId) {
      return NextResponse.json(
        { error: "Missing required field: laneId" },
        { status: 400 }
      );
    }

    // Get the lane and verify it exists
    const { data: existingLane, error: fetchError } = await supabase
      .from("future_state_lanes")
      .select("*, future_state:future_states(id, is_locked)")
      .eq("id", laneId)
      .single();

    if (fetchError || !existingLane) {
      return NextResponse.json({ error: "Lane not found" }, { status: 404 });
    }

    // Check if future state is locked
    if (existingLane.future_state?.is_locked) {
      return NextResponse.json(
        { error: "Future state is locked and cannot be modified" },
        { status: 403 }
      );
    }

    // Check if lane has nodes
    const { data: nodesInLane } = await supabase
      .from("future_state_nodes")
      .select("id")
      .eq("future_state_id", existingLane.future_state_id)
      .eq("lane", existingLane.name)
      .limit(1);

    if (nodesInLane && nodesInLane.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete lane that contains steps. Move or delete the steps first." },
        { status: 400 }
      );
    }

    // Delete the lane
    const { error: deleteError } = await supabase
      .from("future_state_lanes")
      .delete()
      .eq("id", laneId);

    if (deleteError) {
      console.error("Error deleting lane:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete lane" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lane deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// GET: Get lane(s)
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
    const laneId = searchParams.get("laneId");
    const futureStateId = searchParams.get("futureStateId");

    if (laneId) {
      // Get single lane
      const { data: lane, error } = await supabase
        .from("future_state_lanes")
        .select("*")
        .eq("id", laneId)
        .single();

      if (error || !lane) {
        return NextResponse.json({ error: "Lane not found" }, { status: 404 });
      }

      return NextResponse.json({ lane });
    }

    if (futureStateId) {
      // Get all lanes for a future state
      const { data: lanes, error } = await supabase
        .from("future_state_lanes")
        .select("*")
        .eq("future_state_id", futureStateId)
        .order("order_index", { ascending: true });

      if (error) {
        console.error("Error fetching lanes:", error);
        return NextResponse.json(
          { error: "Failed to fetch lanes" },
          { status: 500 }
        );
      }

      return NextResponse.json({ lanes });
    }

    return NextResponse.json(
      { error: "Missing laneId or futureStateId parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Lane fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

