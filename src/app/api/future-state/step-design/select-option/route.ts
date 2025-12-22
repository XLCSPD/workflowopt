import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// ============================================
// PATCH: Select a step design option
// ============================================
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const { versionId, optionId, userId } = body;

    if (!versionId || !optionId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: versionId, optionId, userId" },
        { status: 400 }
      );
    }

    // Fetch the version
    const { data: version, error: versionError } = await supabase
      .from("step_design_versions")
      .select("*")
      .eq("id", versionId)
      .single();

    if (versionError || !version) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      );
    }

    // Verify the option belongs to this version
    const { data: option, error: optionError } = await supabase
      .from("step_design_options")
      .select("*")
      .eq("id", optionId)
      .eq("version_id", versionId)
      .single();

    if (optionError || !option) {
      return NextResponse.json(
        { error: "Option not found or does not belong to this version" },
        { status: 404 }
      );
    }

    // Archive any previously accepted versions for this node
    await supabase
      .from("step_design_versions")
      .update({ status: "archived", updated_by: userId })
      .eq("node_id", version.node_id)
      .eq("status", "accepted");

    // Update the version with selected option and mark as accepted
    const { error: updateVersionError } = await supabase
      .from("step_design_versions")
      .update({
        selected_option_id: optionId,
        status: "accepted",
        updated_by: userId,
      })
      .eq("id", versionId);

    if (updateVersionError) {
      console.error("Error updating version:", updateVersionError);
      return NextResponse.json(
        { error: "Failed to update version" },
        { status: 500 }
      );
    }

    // Update the node with active_step_design_version_id and step_design_status
    const { error: updateNodeError } = await supabase
      .from("future_state_nodes")
      .update({
        active_step_design_version_id: versionId,
        step_design_status: "step_design_complete",
        updated_by: userId,
      })
      .eq("id", version.node_id);

    if (updateNodeError) {
      console.error("Error updating node:", updateNodeError);
      return NextResponse.json(
        { error: "Failed to update node status" },
        { status: 500 }
      );
    }

    // Optionally update the linked solution's step_design_status
    const { data: node } = await supabase
      .from("future_state_nodes")
      .select("linked_solution_id")
      .eq("id", version.node_id)
      .single();

    if (node?.linked_solution_id) {
      // Check if all nodes linked to this solution have step design complete
      const { data: linkedNodes } = await supabase
        .from("future_state_nodes")
        .select("step_design_status")
        .eq("linked_solution_id", node.linked_solution_id);

      const allComplete = linkedNodes?.every(
        (n) => n.step_design_status === "step_design_complete"
      );

      const anyNeedsDesign = linkedNodes?.some(
        (n) => n.step_design_status === "needs_step_design"
      );

      let solutionStatus: "strategy_only" | "needs_step_design" | "step_design_complete";
      if (allComplete) {
        solutionStatus = "step_design_complete";
      } else if (anyNeedsDesign || linkedNodes?.some(n => n.step_design_status === "step_design_complete")) {
        solutionStatus = "needs_step_design";
      } else {
        solutionStatus = "strategy_only";
      }

      await supabase
        .from("solution_cards")
        .update({ step_design_status: solutionStatus, updated_by: userId })
        .eq("id", node.linked_solution_id);
    }

    return NextResponse.json({
      success: true,
      message: "Option selected and version accepted",
      versionId,
      optionId,
    });
  } catch (error) {
    console.error("Error selecting option:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

