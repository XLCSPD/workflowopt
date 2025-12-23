import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// ============================================
// POST: Create a new version (clone current state)
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
    const { sessionId, sourceVersionId, name, description } = body;

    if (!sessionId || !sourceVersionId || !name) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, sourceVersionId, name" },
        { status: 400 }
      );
    }

    // Get the source version
    const { data: sourceVersion, error: sourceError } = await supabase
      .from("future_states")
      .select("*, nodes:future_state_nodes(*), edges:future_state_edges(*)")
      .eq("id", sourceVersionId)
      .eq("session_id", sessionId)
      .single();

    if (sourceError || !sourceVersion) {
      return NextResponse.json(
        { error: "Source version not found" },
        { status: 404 }
      );
    }

    // Get the next version number
    const { data: existingVersions } = await supabase
      .from("future_states")
      .select("version")
      .eq("session_id", sessionId)
      .order("version", { ascending: false })
      .limit(1);

    const nextVersion = existingVersions && existingVersions.length > 0
      ? (existingVersions[0].version || 0) + 1
      : 1;

    // Create the new version
    const { data: newVersion, error: createError } = await supabase
      .from("future_states")
      .insert({
        process_id: sourceVersion.process_id,
        session_id: sessionId,
        name: name,
        description: description || null,
        version: nextVersion,
        status: "draft",
        parent_version_id: sourceVersionId,
        is_locked: false,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError || !newVersion) {
      console.error("Error creating version:", createError);
      return NextResponse.json(
        { error: "Failed to create version" },
        { status: 500 }
      );
    }

    // Clone nodes with ID mapping
    const nodeIdMap: Record<string, string> = {};
    const sourceNodes = sourceVersion.nodes || [];

    for (const node of sourceNodes) {
      const { data: newNode, error: nodeError } = await supabase
        .from("future_state_nodes")
        .insert({
          future_state_id: newVersion.id,
          source_step_id: node.source_step_id,
          name: node.name,
          description: node.description,
          lane: node.lane,
          step_type: node.step_type,
          lead_time_minutes: node.lead_time_minutes,
          cycle_time_minutes: node.cycle_time_minutes,
          position_x: node.position_x,
          position_y: node.position_y,
          action: node.action,
          modified_fields: node.modified_fields,
          linked_solution_id: node.linked_solution_id,
          step_design_status: node.step_design_status,
          created_by: user.id,
          updated_by: user.id,
        })
        .select()
        .single();

      if (!nodeError && newNode) {
        nodeIdMap[node.id] = newNode.id;
      }
    }

    // Clone edges with mapped node IDs
    const sourceEdges = sourceVersion.edges || [];

    for (const edge of sourceEdges) {
      const newSourceId = nodeIdMap[edge.source_node_id];
      const newTargetId = nodeIdMap[edge.target_node_id];

      if (newSourceId && newTargetId) {
        await supabase.from("future_state_edges").insert({
          future_state_id: newVersion.id,
          source_node_id: newSourceId,
          target_node_id: newTargetId,
          label: edge.label,
          order_index: edge.order_index,
        });
      }
    }

    // Clone lanes
    const { data: sourceLanes } = await supabase
      .from("future_state_lanes")
      .select("*")
      .eq("future_state_id", sourceVersionId);

    if (sourceLanes) {
      for (const lane of sourceLanes) {
        await supabase.from("future_state_lanes").insert({
          future_state_id: newVersion.id,
          name: lane.name,
          order_index: lane.order_index,
          color: lane.color,
          created_by: user.id,
          updated_by: user.id,
        });
      }
    }

    // Clone annotations with mapped node IDs
    const { data: sourceAnnotations } = await supabase
      .from("future_state_annotations")
      .select("*")
      .eq("future_state_id", sourceVersionId);

    if (sourceAnnotations) {
      for (const annotation of sourceAnnotations) {
        const newNodeId = annotation.node_id ? nodeIdMap[annotation.node_id] : null;
        await supabase.from("future_state_annotations").insert({
          future_state_id: newVersion.id,
          node_id: newNodeId,
          type: annotation.type,
          title: annotation.title,
          content: annotation.content,
          priority: annotation.priority,
          resolved: annotation.resolved,
          position_x: annotation.position_x,
          position_y: annotation.position_y,
          created_by: user.id,
          updated_by: user.id,
        });
      }
    }

    return NextResponse.json({ 
      versionId: newVersion.id,
      version: newVersion
    }, { status: 201 });
  } catch (error) {
    console.error("Version creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH: Update version metadata
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
    const { versionId, updates } = body;

    if (!versionId) {
      return NextResponse.json(
        { error: "Missing required field: versionId" },
        { status: 400 }
      );
    }

    // Get the version
    const { data: existingVersion, error: fetchError } = await supabase
      .from("future_states")
      .select("*")
      .eq("id", versionId)
      .single();

    if (fetchError || !existingVersion) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Cannot update locked versions (except to unlock)
    if (existingVersion.is_locked && updates.isLocked !== false) {
      return NextResponse.json(
        { error: "Version is locked and cannot be modified" },
        { status: 403 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.isLocked !== undefined) updateData.is_locked = updates.isLocked;
    if (updates.status !== undefined) updateData.status = updates.status;

    // Update the version
    const { data: version, error: updateError } = await supabase
      .from("future_states")
      .update(updateData)
      .eq("id", versionId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating version:", updateError);
      return NextResponse.json(
        { error: "Failed to update version" },
        { status: 500 }
      );
    }

    return NextResponse.json({ version });
  } catch (error) {
    console.error("Version update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Delete a version
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
    const { versionId } = body;

    if (!versionId) {
      return NextResponse.json(
        { error: "Missing required field: versionId" },
        { status: 400 }
      );
    }

    // Get the version
    const { data: existingVersion, error: fetchError } = await supabase
      .from("future_states")
      .select("*")
      .eq("id", versionId)
      .single();

    if (fetchError || !existingVersion) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Cannot delete locked or published versions
    if (existingVersion.is_locked) {
      return NextResponse.json(
        { error: "Cannot delete a locked version" },
        { status: 403 }
      );
    }

    if (existingVersion.status === "published") {
      return NextResponse.json(
        { error: "Cannot delete a published version" },
        { status: 403 }
      );
    }

    // Check if this is the only version
    const { data: allVersions } = await supabase
      .from("future_states")
      .select("id")
      .eq("session_id", existingVersion.session_id);

    if (allVersions && allVersions.length <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the only version" },
        { status: 400 }
      );
    }

    // Delete cascades to nodes, edges, lanes, and annotations via FK constraints
    const { error: deleteError } = await supabase
      .from("future_states")
      .delete()
      .eq("id", versionId);

    if (deleteError) {
      console.error("Error deleting version:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete version" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Version deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// GET: Get version(s)
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
    const versionId = searchParams.get("versionId");
    const sessionId = searchParams.get("sessionId");

    if (versionId) {
      // Get single version with full graph
      const { data: version, error } = await supabase
        .from("future_states")
        .select(`
          *,
          nodes:future_state_nodes(*),
          edges:future_state_edges(*),
          creator:users!future_states_created_by_fkey(id, full_name)
        `)
        .eq("id", versionId)
        .single();

      if (error || !version) {
        return NextResponse.json({ error: "Version not found" }, { status: 404 });
      }

      return NextResponse.json({ version });
    }

    if (sessionId) {
      // Get all versions for a session (without full graph)
      const { data: versions, error } = await supabase
        .from("future_states")
        .select(`
          id,
          name,
          description,
          version,
          status,
          is_locked,
          parent_version_id,
          created_by,
          created_at,
          updated_at,
          creator:users!future_states_created_by_fkey(id, full_name)
        `)
        .eq("session_id", sessionId)
        .order("version", { ascending: false });

      if (error) {
        console.error("Error fetching versions:", error);
        return NextResponse.json(
          { error: "Failed to fetch versions" },
          { status: 500 }
        );
      }

      return NextResponse.json({ versions });
    }

    return NextResponse.json(
      { error: "Missing versionId or sessionId parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Version fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

