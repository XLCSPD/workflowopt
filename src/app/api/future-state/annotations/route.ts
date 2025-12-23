import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// ============================================
// POST: Create a new annotation
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
      type = "note",
      title,
      content,
      nodeId,
      positionX,
      positionY,
      priority = "medium",
    } = body;

    if (!futureStateId || !title) {
      return NextResponse.json(
        { error: "Missing required fields: futureStateId, title" },
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

    // If nodeId provided, verify the node exists
    if (nodeId) {
      const { data: node, error: nodeError } = await supabase
        .from("future_state_nodes")
        .select("id")
        .eq("id", nodeId)
        .eq("future_state_id", futureStateId)
        .single();

      if (nodeError || !node) {
        return NextResponse.json(
          { error: "Node not found in this future state" },
          { status: 400 }
        );
      }
    }

    // Create the annotation
    const { data: annotation, error: insertError } = await supabase
      .from("future_state_annotations")
      .insert({
        future_state_id: futureStateId,
        node_id: nodeId || null,
        type,
        title,
        content: content || null,
        priority,
        position_x: positionX || null,
        position_y: positionY || null,
        resolved: false,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating annotation:", insertError);
      return NextResponse.json(
        { error: "Failed to create annotation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ annotation }, { status: 201 });
  } catch (error) {
    console.error("Annotation creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH: Update an existing annotation
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
    const { annotationId, updates } = body;

    if (!annotationId) {
      return NextResponse.json(
        { error: "Missing required field: annotationId" },
        { status: 400 }
      );
    }

    // Get the annotation and verify it exists
    const { data: existingAnnotation, error: fetchError } = await supabase
      .from("future_state_annotations")
      .select("*, future_state:future_states(id, is_locked)")
      .eq("id", annotationId)
      .single();

    if (fetchError || !existingAnnotation) {
      return NextResponse.json({ error: "Annotation not found" }, { status: 404 });
    }

    // Check if future state is locked
    if (existingAnnotation.future_state?.is_locked) {
      return NextResponse.json(
        { error: "Future state is locked and cannot be modified" },
        { status: 403 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.resolved !== undefined) updateData.resolved = updates.resolved;
    if (updates.positionX !== undefined) updateData.position_x = updates.positionX;
    if (updates.positionY !== undefined) updateData.position_y = updates.positionY;
    if (updates.nodeId !== undefined) updateData.node_id = updates.nodeId;

    // Update the annotation
    const { data: annotation, error: updateError } = await supabase
      .from("future_state_annotations")
      .update(updateData)
      .eq("id", annotationId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating annotation:", updateError);
      return NextResponse.json(
        { error: "Failed to update annotation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ annotation });
  } catch (error) {
    console.error("Annotation update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Delete an annotation
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
    const { annotationId } = body;

    if (!annotationId) {
      return NextResponse.json(
        { error: "Missing required field: annotationId" },
        { status: 400 }
      );
    }

    // Get the annotation and verify it exists
    const { data: existingAnnotation, error: fetchError } = await supabase
      .from("future_state_annotations")
      .select("*, future_state:future_states(id, is_locked)")
      .eq("id", annotationId)
      .single();

    if (fetchError || !existingAnnotation) {
      return NextResponse.json({ error: "Annotation not found" }, { status: 404 });
    }

    // Check if future state is locked
    if (existingAnnotation.future_state?.is_locked) {
      return NextResponse.json(
        { error: "Future state is locked and cannot be modified" },
        { status: 403 }
      );
    }

    // Delete the annotation
    const { error: deleteError } = await supabase
      .from("future_state_annotations")
      .delete()
      .eq("id", annotationId);

    if (deleteError) {
      console.error("Error deleting annotation:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete annotation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Annotation deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// GET: Get annotation(s)
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
    const annotationId = searchParams.get("annotationId");
    const futureStateId = searchParams.get("futureStateId");
    const nodeId = searchParams.get("nodeId");

    if (annotationId) {
      // Get single annotation
      const { data: annotation, error } = await supabase
        .from("future_state_annotations")
        .select("*")
        .eq("id", annotationId)
        .single();

      if (error || !annotation) {
        return NextResponse.json({ error: "Annotation not found" }, { status: 404 });
      }

      return NextResponse.json({ annotation });
    }

    if (futureStateId) {
      // Get all annotations for a future state
      let query = supabase
        .from("future_state_annotations")
        .select("*")
        .eq("future_state_id", futureStateId);

      if (nodeId) {
        query = query.eq("node_id", nodeId);
      }

      const { data: annotations, error } = await query.order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching annotations:", error);
        return NextResponse.json(
          { error: "Failed to fetch annotations" },
          { status: 500 }
        );
      }

      return NextResponse.json({ annotations });
    }

    return NextResponse.json(
      { error: "Missing annotationId or futureStateId parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Annotation fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

