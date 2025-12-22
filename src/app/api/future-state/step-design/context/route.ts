import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { StepContextData } from "@/types";

// ============================================
// GET: Fetch step context
// ============================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const nodeId = searchParams.get("nodeId");

    if (!nodeId) {
      return NextResponse.json(
        { error: "Missing required parameter: nodeId" },
        { status: 400 }
      );
    }

    const { data: context, error } = await supabase
      .from("step_context")
      .select("*")
      .eq("node_id", nodeId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching context:", error);
      return NextResponse.json(
        { error: "Failed to fetch context" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      context: context || null,
    });
  } catch (error) {
    console.error("Error fetching step context:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH: Update step context (save Q&A, notes, etc.)
// ============================================
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const {
      sessionId,
      futureStateId,
      nodeId,
      contextJson,
      notes,
      userId,
    } = body;

    if (!nodeId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: nodeId, userId" },
        { status: 400 }
      );
    }

    // Check if context exists
    const { data: existingContext, error: fetchError } = await supabase
      .from("step_context")
      .select("*")
      .eq("node_id", nodeId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching existing context:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch existing context" },
        { status: 500 }
      );
    }

    if (existingContext) {
      // Update existing context
      const updates: {
        context_json?: StepContextData;
        notes?: string;
        updated_by: string;
      } = {
        updated_by: userId,
      };

      if (contextJson !== undefined) {
        // Merge with existing context_json
        updates.context_json = {
          ...existingContext.context_json,
          ...contextJson,
        };
      }

      if (notes !== undefined) {
        updates.notes = notes;
      }

      const { data: updated, error: updateError } = await supabase
        .from("step_context")
        .update(updates)
        .eq("id", existingContext.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating context:", updateError);
        return NextResponse.json(
          { error: "Failed to update context" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        context: updated,
      });
    } else {
      // Create new context
      if (!sessionId || !futureStateId) {
        return NextResponse.json(
          { error: "Missing required fields for new context: sessionId, futureStateId" },
          { status: 400 }
        );
      }

      const { data: created, error: createError } = await supabase
        .from("step_context")
        .insert({
          session_id: sessionId,
          future_state_id: futureStateId,
          node_id: nodeId,
          context_json: contextJson || {},
          notes: notes || null,
          created_by: userId,
          updated_by: userId,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating context:", createError);
        return NextResponse.json(
          { error: "Failed to create context" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        context: created,
      });
    }
  } catch (error) {
    console.error("Error updating step context:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Answer a specific question in context
// ============================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const {
      nodeId,
      questionId,
      answer,
      userId,
    } = body;

    if (!nodeId || !questionId || answer === undefined || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: nodeId, questionId, answer, userId" },
        { status: 400 }
      );
    }

    // Fetch existing context
    const { data: context, error: fetchError } = await supabase
      .from("step_context")
      .select("*")
      .eq("node_id", nodeId)
      .single();

    if (fetchError || !context) {
      return NextResponse.json(
        { error: "Context not found for this node" },
        { status: 404 }
      );
    }

    // Update the specific question's answer
    const contextJson = context.context_json as StepContextData;
    const questions = contextJson.questions || [];
    
    const updatedQuestions = questions.map((q) => {
      if (q.id === questionId) {
        return {
          ...q,
          answer,
          answeredBy: userId,
          answeredAt: new Date().toISOString(),
        };
      }
      return q;
    });

    const { data: updated, error: updateError } = await supabase
      .from("step_context")
      .update({
        context_json: {
          ...contextJson,
          questions: updatedQuestions,
        },
        updated_by: userId,
      })
      .eq("id", context.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating question answer:", updateError);
      return NextResponse.json(
        { error: "Failed to update question answer" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      context: updated,
    });
  } catch (error) {
    console.error("Error answering question:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

