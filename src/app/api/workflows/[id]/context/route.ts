import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getWorkflowContext,
  saveFullWorkflowContext,
  calculateContextCompleteness,
} from "@/lib/services/workflowContext";
import type {
  UpsertWorkflowContextInput,
  UpsertWorkflowStakeholderInput,
  UpsertWorkflowSystemInput,
  UpsertWorkflowMetricInput,
} from "@/types";

// GET - Fetch workflow context with relations and completeness
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: processId } = await params;
    const supabase = await createServerSupabaseClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify process exists and user has access
    const { data: process, error: processError } = await supabase
      .from("processes")
      .select("id")
      .eq("id", processId)
      .single();

    if (processError || !process) {
      return NextResponse.json(
        { error: "Process not found" },
        { status: 404 }
      );
    }

    // Fetch context
    const context = await getWorkflowContext(processId);
    const completeness = calculateContextCompleteness(context);

    return NextResponse.json({
      context,
      completeness,
    });
  } catch (error) {
    console.error("Error fetching workflow context:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflow context" },
      { status: 500 }
    );
  }
}

// POST/PUT - Create or update workflow context
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: processId } = await params;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/caf3ef25-514f-4d87-a627-e0b4b4f37487',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'context/route.ts:POST',message:'POST request started',data:{processId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const supabase = await createServerSupabaseClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify process exists
    const { data: process, error: processError } = await supabase
      .from("processes")
      .select("id")
      .eq("id", processId)
      .single();

    if (processError || !process) {
      return NextResponse.json(
        { error: "Process not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/caf3ef25-514f-4d87-a627-e0b4b4f37487',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'context/route.ts:POST:body',message:'Request body parsed',data:{contextKeys:Object.keys(body.context||{}),stakeholdersCount:body.stakeholders?.length||0,systemsCount:body.systems?.length||0,metricsCount:body.metrics?.length||0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,E'})}).catch(()=>{});
    // #endregion
    const {
      context: contextInput,
      stakeholders = [],
      systems = [],
      metrics = [],
    }: {
      context: UpsertWorkflowContextInput;
      stakeholders?: UpsertWorkflowStakeholderInput[];
      systems?: UpsertWorkflowSystemInput[];
      metrics?: UpsertWorkflowMetricInput[];
    } = body;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/caf3ef25-514f-4d87-a627-e0b4b4f37487',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'context/route.ts:POST:beforeSave',message:'About to call saveFullWorkflowContext',data:{contextInput,stakeholdersCount:stakeholders.length,systemsCount:systems.length,metricsCount:metrics.length,userId:user.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,E'})}).catch(()=>{});
    // #endregion

    // Save context with all relations
    const savedContext = await saveFullWorkflowContext(
      processId,
      {
        context: contextInput,
        stakeholders,
        systems,
        metrics,
      },
      user.id
    );

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/caf3ef25-514f-4d87-a627-e0b4b4f37487',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'context/route.ts:POST:afterSave',message:'saveFullWorkflowContext succeeded',data:{savedContextId:savedContext?.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    const completeness = calculateContextCompleteness(savedContext);

    return NextResponse.json({
      context: savedContext,
      completeness,
    });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/caf3ef25-514f-4d87-a627-e0b4b4f37487',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'context/route.ts:POST:catch',message:'Error caught in POST handler',data:{errorMessage:(error as Error).message,errorStack:(error as Error).stack?.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,C,D'})}).catch(()=>{});
    // #endregion
    console.error("Error saving workflow context:", error);
    return NextResponse.json(
      { error: "Failed to save workflow context" },
      { status: 500 }
    );
  }
}

