import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { runAgent, buildStepDesignPrompt } from "@/lib/ai/agentRunner";
import { getWorkflowContext } from "@/lib/services/workflowContext";
import type { StepDesignAgentOutputType } from "@/lib/ai/schemas";
import type {
  StepContext,
  StepDesignVersion,
  StepDesignOption,
  FutureStateNode,
  SolutionCard,
  ProcessStep,
  DesignAssumption,
  StepContextData,
} from "@/types";

// ============================================
// GET: Fetch step design data for a node
// ============================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const sessionId = searchParams.get("sessionId");
    const futureStateId = searchParams.get("futureStateId");
    const nodeId = searchParams.get("nodeId");

    if (!sessionId || !futureStateId || !nodeId) {
      return NextResponse.json(
        { error: "Missing required parameters: sessionId, futureStateId, nodeId" },
        { status: 400 }
      );
    }

    // Fetch the node
    const { data: node, error: nodeError } = await supabase
      .from("future_state_nodes")
      .select("*")
      .eq("id", nodeId)
      .single();

    if (nodeError || !node) {
      return NextResponse.json(
        { error: "Node not found" },
        { status: 404 }
      );
    }

    // Fetch step context
    const { data: context } = await supabase
      .from("step_context")
      .select("*")
      .eq("node_id", nodeId)
      .single();

    // Fetch all design versions for this node
    const { data: versions } = await supabase
      .from("step_design_versions")
      .select("*")
      .eq("node_id", nodeId)
      .order("version", { ascending: false });

    // Fetch options for the latest version
    let options: StepDesignOption[] = [];
    let assumptions: DesignAssumption[] = [];
    
    if (versions && versions.length > 0) {
      const latestVersion = versions[0];
      
      const { data: optionsData } = await supabase
        .from("step_design_options")
        .select("*")
        .eq("version_id", latestVersion.id);
      
      options = optionsData || [];

      // Fetch assumptions for all options
      if (options.length > 0) {
        const optionIds = options.map(o => o.id);
        const { data: assumptionsData } = await supabase
          .from("design_assumptions")
          .select("*")
          .in("option_id", optionIds);
        
        assumptions = assumptionsData || [];
      }
    }

    // Fetch linked solution if exists
    let linkedSolution: SolutionCard | null = null;
    if (node.linked_solution_id) {
      const { data: solutionData } = await supabase
        .from("solution_cards")
        .select("*")
        .eq("id", node.linked_solution_id)
        .single();
      
      linkedSolution = solutionData;
    }

    // Fetch source step if exists
    let sourceStep: ProcessStep | null = null;
    if (node.source_step_id) {
      const { data: stepData } = await supabase
        .from("process_steps")
        .select("*")
        .eq("id", node.source_step_id)
        .single();
      
      sourceStep = stepData;
    }

    return NextResponse.json({
      node: node as FutureStateNode,
      context: context as StepContext | null,
      versions: versions as StepDesignVersion[] || [],
      latestVersion: versions?.[0] as StepDesignVersion | undefined,
      options,
      assumptions,
      linkedSolution,
      sourceStep,
    });
  } catch (error) {
    console.error("Error fetching step design data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Run Step Design Agent
// ============================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const {
      sessionId,
      futureStateId,
      nodeId,
      researchMode = false,
      userId,
    } = body;

    if (!sessionId || !futureStateId || !nodeId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, futureStateId, nodeId, userId" },
        { status: 400 }
      );
    }

    // Fetch the node
    const { data: node, error: nodeError } = await supabase
      .from("future_state_nodes")
      .select("*")
      .eq("id", nodeId)
      .single();

    if (nodeError || !node) {
      return NextResponse.json(
        { error: "Node not found" },
        { status: 404 }
      );
    }

    // Fetch session to get process_id for workflow context
    const { data: session } = await supabase
      .from("sessions")
      .select("process_id")
      .eq("id", sessionId)
      .single();

    // Fetch workflow context if available
    const workflowContext = session?.process_id 
      ? await getWorkflowContext(session.process_id)
      : null;

    // Fetch linked solution if exists
    let solution = undefined;
    if (node.linked_solution_id) {
      const { data: solutionData } = await supabase
        .from("solution_cards")
        .select("*")
        .eq("id", node.linked_solution_id)
        .single();
      
      if (solutionData) {
        solution = {
          id: solutionData.id,
          title: solutionData.title,
          description: solutionData.description || "",
          bucket: solutionData.bucket,
        };
      }
    }

    // Fetch source step if exists
    let currentStep = undefined;
    if (node.source_step_id) {
      const { data: stepData } = await supabase
        .from("process_steps")
        .select("*")
        .eq("id", node.source_step_id)
        .single();
      
      if (stepData) {
        currentStep = {
          id: stepData.id,
          step_name: stepData.step_name,
          description: stepData.description,
          lane: stepData.lane,
          lead_time_minutes: stepData.lead_time_minutes,
          cycle_time_minutes: stepData.cycle_time_minutes,
        };
      }
    }

    // Fetch existing context
    const { data: contextData } = await supabase
      .from("step_context")
      .select("*")
      .eq("node_id", nodeId)
      .single();

    const existingContext = contextData?.context_json as StepContextData | undefined;

    // Fetch prior versions for context
    const { data: priorVersionsData } = await supabase
      .from("step_design_versions")
      .select(`
        version,
        selected_option_id,
        step_design_options!inner(title, summary)
      `)
      .eq("node_id", nodeId)
      .eq("status", "accepted")
      .order("version", { ascending: false });

    const priorVersions = priorVersionsData?.map((v: { 
      version: number; 
      selected_option_id: string | null;
      step_design_options: Array<{ title: string; summary: string }>;
    }) => ({
      version: v.version,
      selectedOption: v.step_design_options?.[0] ? {
        title: v.step_design_options[0].title,
        summary: v.step_design_options[0].summary,
      } : undefined,
    }));

    // Build inputs for the agent
    const agentInputs = {
      workflowContext,
      node: {
        id: node.id,
        name: node.name,
        description: node.description,
        lane: node.lane,
        step_type: node.step_type,
        action: node.action,
        linked_solution_id: node.linked_solution_id,
      },
      solution,
      currentStep,
      existingContext,
      priorVersions,
      researchMode,
    };

    // Run the step design agent
    const result = await runAgent<"step_design">(
      {
        sessionId,
        agentType: "step_design",
        inputs: agentInputs,
        userId,
        supabase,
      },
      () => buildStepDesignPrompt(agentInputs)
    );

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || "Agent run failed" },
        { status: 500 }
      );
    }

    const output = result.data as StepDesignAgentOutputType;

    // Get next version number
    const { data: maxVersionData } = await supabase
      .from("step_design_versions")
      .select("version")
      .eq("node_id", nodeId)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (maxVersionData?.version || 0) + 1;

    // Create new version
    const { data: newVersion, error: versionError } = await supabase
      .from("step_design_versions")
      .insert({
        session_id: sessionId,
        future_state_id: futureStateId,
        node_id: nodeId,
        version: nextVersion,
        status: "draft",
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (versionError || !newVersion) {
      console.error("Error creating version:", versionError);
      return NextResponse.json(
        { error: "Failed to create design version" },
        { status: 500 }
      );
    }

    // Create options
    const optionsToInsert = output.options.map((opt) => ({
      version_id: newVersion.id,
      option_key: opt.option_key,
      title: opt.title,
      summary: opt.summary,
      changes: opt.changes,
      waste_addressed: opt.waste_addressed,
      risks: opt.risks,
      dependencies: opt.dependencies,
      confidence: opt.confidence,
      research_mode_used: researchMode,
      pattern_labels: opt.pattern_labels || [],
      design_json: opt.design,
    }));

    const { data: createdOptions, error: optionsError } = await supabase
      .from("step_design_options")
      .insert(optionsToInsert)
      .select();

    if (optionsError) {
      console.error("Error creating options:", optionsError);
      return NextResponse.json(
        { error: "Failed to create design options" },
        { status: 500 }
      );
    }

    // Create assumptions for each option
    const assumptionsToInsert: Array<{
      option_id: string;
      assumption: string;
      risk_if_wrong?: string;
      validation_method?: string;
    }> = [];

    output.options.forEach((opt, index) => {
      const createdOption = createdOptions[index];
      if (createdOption && opt.assumptions) {
        opt.assumptions.forEach((assumption) => {
          assumptionsToInsert.push({
            option_id: createdOption.id,
            assumption: assumption.assumption,
            risk_if_wrong: assumption.risk_if_wrong,
            validation_method: assumption.validation_method,
          });
        });
      }
    });

    if (assumptionsToInsert.length > 0) {
      const { error: assumptionsError } = await supabase
        .from("design_assumptions")
        .insert(assumptionsToInsert);

      if (assumptionsError) {
        console.error("Error creating assumptions:", assumptionsError);
        // Non-fatal, continue
      }
    }

    // Update step context with any questions from the AI
    if (output.questions && output.questions.length > 0) {
      const existingQuestions = (existingContext?.questions || []) as Array<{
        id: string;
        question: string;
        answer?: string;
        required: boolean;
      }>;
      
      const newQuestions = output.questions.map((q) => ({
        id: q.id,
        question: q.question,
        required: q.required,
        answer: undefined,
      }));

      const mergedQuestions = [
        ...existingQuestions,
        ...newQuestions.filter(
          (nq) => !existingQuestions.some((eq) => eq.id === nq.id)
        ),
      ];

      if (contextData) {
        await supabase
          .from("step_context")
          .update({
            context_json: {
              ...existingContext,
              questions: mergedQuestions,
            },
            updated_by: userId,
          })
          .eq("id", contextData.id);
      } else {
        await supabase
          .from("step_context")
          .insert({
            session_id: sessionId,
            future_state_id: futureStateId,
            node_id: nodeId,
            context_json: { questions: mergedQuestions },
            created_by: userId,
            updated_by: userId,
          });
      }
    }

    // Update node step_design_status to needs_step_design if it was strategy_only
    if (node.step_design_status === "strategy_only") {
      await supabase
        .from("future_state_nodes")
        .update({
          step_design_status: "needs_step_design",
          updated_by: userId,
        })
        .eq("id", nodeId);
    }

    return NextResponse.json({
      success: true,
      runId: result.runId,
      cached: result.cached,
      version: newVersion as StepDesignVersion,
      options: createdOptions as StepDesignOption[],
      context_needed: output.context_needed,
      questions: output.questions || [],
    });
  } catch (error) {
    console.error("Error running step design agent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

