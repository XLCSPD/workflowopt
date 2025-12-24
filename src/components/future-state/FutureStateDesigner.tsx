"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { StageLanding } from "./StudioShell";
import { StepDesignPanel } from "./StepDesignPanel";
import { WorkflowContextPanel } from "./WorkflowContextPanel";
import { StepImpactSummary } from "./StepImpactSummary";
import { SessionContextHeader } from "./SessionContextHeader";
import { HorizontalFlowView } from "./HorizontalFlowView";
// Note: DesignStudioProvider and useDesignStudio will be used in future phases
// import { DesignStudioProvider, useDesignStudio } from "./DesignStudioContext";
import { FutureStateToolbox } from "./FutureStateToolbox";
import { VersionPanel } from "./VersionPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Select components removed - using VersionPanel for version selection now
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Layout,
  Loader2,
  Sparkles,
  Eye,
  Layers,
  GitCompare,
  Pencil,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Lightbulb,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { FutureStateLane, LaneColor, FutureStateAnnotation } from "@/types/design-studio";
import type {
  FutureState,
  FutureStateNode,
  FutureStateEdge,
  ProcessStep,
  SolutionCard,
  StepDesignStatus,
  ObservationWithWasteTypes,
  WasteType,
  NodeAction,
} from "@/types";
import type { useRealtimeStudio } from "@/lib/hooks/useRealtimeStudio";

interface FutureStateDesignerProps {
  sessionId: string;
  processId: string;
  userId?: string;
  realtimeStudio: ReturnType<typeof useRealtimeStudio>;
}

interface FutureStateWithGraph extends FutureState {
  nodes: FutureStateNode[];
  edges: FutureStateEdge[];
}

const actionConfig = {
  keep: { label: "Keep", color: "bg-gray-100 border-gray-300 text-gray-700" },
  modify: { label: "Modify", color: "bg-blue-100 border-blue-300 text-blue-700" },
  remove: { label: "Remove", color: "bg-red-100 border-red-300 text-red-700 opacity-60 line-through" },
  new: { label: "New", color: "bg-emerald-100 border-emerald-300 text-emerald-700 ring-2 ring-emerald-400" },
};

const stepDesignStatusConfig: Record<StepDesignStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  strategy_only: { icon: Layers, color: "text-gray-400", label: "Strategy Only" },
  needs_step_design: { icon: AlertCircle, color: "text-amber-500", label: "Needs Design" },
  step_design_complete: { icon: CheckCircle2, color: "text-emerald-500", label: "Design Complete" },
};

export function FutureStateDesigner({
  sessionId,
  processId,
  userId = "",
  realtimeStudio: _realtimeStudio,
}: FutureStateDesignerProps) {
  console.log("[FutureStateDesigner] Rendering");
  const router = useRouter();
  const [futureStates, setFutureStates] = useState<FutureState[]>([]);
  const [selectedFutureState, setSelectedFutureState] = useState<FutureStateWithGraph | null>(null);
  const [currentSteps, setCurrentSteps] = useState<ProcessStep[]>([]);
  const [connections, setConnections] = useState<Array<{ source: string; target: string }>>([]);
  const [acceptedSolutions, setAcceptedSolutions] = useState<SolutionCard[]>([]);
  const [observations, setObservations] = useState<ObservationWithWasteTypes[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [viewMode, setViewMode] = useState<"side-by-side" | "future-only" | "flowchart">("flowchart");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [stepDesignPanelOpen, setStepDesignPanelOpen] = useState(false);
  const [contextPanelOpen, setContextPanelOpen] = useState(true);
  const [highlightedStepId, setHighlightedStepId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Edit mode and toolbox state
  const [isEditMode, setIsEditMode] = useState(false);
  const [toolboxCollapsed, setToolboxCollapsed] = useState(false);
  const [lanes, setLanes] = useState<FutureStateLane[]>([]);
  // Annotations state - will be used for displaying annotations in future phases
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [annotations, setAnnotations] = useState<FutureStateAnnotation[]>([]);

  // Ref to access selectedFutureState in callbacks without triggering re-creation
  const selectedFutureStateRef = useRef<FutureStateWithGraph | null>(null);
  selectedFutureStateRef.current = selectedFutureState;

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-collapse context panel on mobile
  useEffect(() => {
    if (isMobile) {
      setContextPanelOpen(false);
    }
  }, [isMobile]);

  // Realtime studio for future use with presence/cursors
  void _realtimeStudio;
  const supabase = getSupabaseClient();
  const { toast } = useToast();

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [statesRes, stepsRes, connectionsRes, solutionsRes, observationsRes] = await Promise.all([
        supabase
          .from("future_states")
          .select("*")
          .eq("session_id", sessionId)
          .order("version", { ascending: false }),
        supabase
          .from("process_steps")
          .select("*")
          .eq("process_id", processId)
          .order("order_index", { ascending: true }),
        // Fetch step connections for the process flow
        supabase
          .from("step_connections")
          .select("source_step_id, target_step_id")
          .eq("process_id", processId),
        supabase
          .from("solution_cards")
          .select("*")
          .eq("session_id", sessionId)
          .eq("status", "accepted"),
        // Fetch observations with waste types
        supabase
          .from("observations")
          .select(`
            *,
            waste_links:observation_waste_links(
              waste_type:waste_types(*)
            )
          `)
          .eq("session_id", sessionId),
      ]);

      if (statesRes.error) {
        console.error("Error fetching future states:", statesRes.error);
      } else {
        setFutureStates(statesRes.data || []);
        // Auto-select the latest version
        if (statesRes.data && statesRes.data.length > 0 && !selectedFutureState) {
          await fetchFutureStateGraph(statesRes.data[0].id);
        }
      }

      if (stepsRes.error) {
        console.error("Error fetching steps:", stepsRes.error);
      } else {
        setCurrentSteps(stepsRes.data || []);
      }

      if (connectionsRes.error) {
        console.error("Error fetching connections:", connectionsRes.error);
      } else {
        setConnections(
          (connectionsRes.data || []).map((c: { source_step_id: string; target_step_id: string }) => ({
            source: c.source_step_id,
            target: c.target_step_id,
          }))
        );
      }

      if (solutionsRes.error) {
        console.error("Error fetching solutions:", solutionsRes.error);
      } else {
        setAcceptedSolutions(solutionsRes.data || []);
      }

      if (observationsRes.error) {
        console.error("Error fetching observations:", observationsRes.error);
      } else {
        // Transform observations to include waste_types at top level
        interface ObservationWithLinks {
          id: string;
          session_id: string;
          step_id: string;
          user_id: string;
          notes?: string;
          is_digital: boolean;
          is_physical: boolean;
          frequency_score: number;
          impact_score: number;
          ease_score: number;
          priority_score: number;
          created_at: string;
          updated_at: string;
          waste_links?: Array<{ waste_type: WasteType | WasteType[] | null }>;
        }
        const transformedObs = (observationsRes.data || []).map((obs: ObservationWithLinks) => ({
          ...obs,
          waste_types: (obs.waste_links || [])
            .map((wl) => {
              if (Array.isArray(wl.waste_type)) return wl.waste_type[0];
              return wl.waste_type;
            })
            .filter((wt): wt is WasteType => wt !== null),
        })) as ObservationWithWasteTypes[];
        setObservations(transformedObs);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  // Note: selectedFutureState intentionally excluded from deps to prevent infinite loop
  // fetchFutureStateGraph sets selectedFutureState, which would recreate fetchData and cause loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, processId, supabase]);

  // Fetch single future state with graph
  const fetchFutureStateGraph = async (futureStateId: string) => {
    console.log("[fetchFutureStateGraph] Fetching graph for:", futureStateId);
    const { data, error } = await supabase
      .from("future_states")
      .select(`
        *,
        nodes:future_state_nodes(*),
        edges:future_state_edges(*)
      `)
      .eq("id", futureStateId)
      .single();

    if (error) {
      console.error("[fetchFutureStateGraph] Error:", error);
      return;
    }

    console.log("[fetchFutureStateGraph] Got data - nodes:", data?.nodes?.length, "edges:", data?.edges?.length);
    setSelectedFutureState(data as FutureStateWithGraph);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch lanes and annotations when future state changes
  useEffect(() => {
    async function fetchLanesAndAnnotations() {
      if (!selectedFutureState?.id) {
        setLanes([]);
        setAnnotations([]);
        return;
      }

      try {
        const [lanesRes, annotationsRes] = await Promise.all([
          supabase
            .from("future_state_lanes")
            .select("*")
            .eq("future_state_id", selectedFutureState.id)
            .order("order_index", { ascending: true }),
          supabase
            .from("future_state_annotations")
            .select("*")
            .eq("future_state_id", selectedFutureState.id)
            .order("created_at", { ascending: true }),
        ]);

        if (!lanesRes.error && lanesRes.data) {
          setLanes(lanesRes.data as FutureStateLane[]);
        }
        if (!annotationsRes.error && annotationsRes.data) {
          setAnnotations(annotationsRes.data as FutureStateAnnotation[]);
        }
      } catch (error) {
        console.error("Error fetching lanes/annotations:", error);
      }
    }

    fetchLanesAndAnnotations();
  }, [selectedFutureState?.id, supabase]);

  // Auto-collapse context panel in flowchart mode (flowchart has its own context)
  useEffect(() => {
    if (viewMode === "flowchart") {
      setContextPanelOpen(false);
    }
  }, [viewMode]);

  // Run design agent
  const handleRunDesign = async () => {
    setIsRunning(true);
    try {
      console.log("[FutureStateDesigner] Starting design agent...");
      const response = await fetch("/api/future-state/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, forceRerun: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("[FutureStateDesigner] Design error:", error);
        toast({
          variant: "destructive",
          title: "Design Generation Failed",
          description: error.error || "Failed to generate future state design. Check console for details.",
        });
      } else {
        const result = await response.json();
        console.log("[FutureStateDesigner] Design completed:", result);
        toast({
          title: "Design Generated",
          description: result.cached 
            ? "Loaded cached results from previous run." 
            : "Successfully generated future state design.",
        });
        if (result.futureStateId) {
          await fetchFutureStateGraph(result.futureStateId);
        }
        await fetchData();
      }
    } catch (error) {
      console.error("[FutureStateDesigner] Error running design:", error);
      toast({
        variant: "destructive",
        title: "Design Error",
        description: error instanceof Error ? error.message : "Network error occurred. Please try again.",
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Group observations by step
  const observationsByStep = useMemo(() => {
    const map = new Map<string, ObservationWithWasteTypes[]>();
    observations.forEach((obs) => {
      const existing = map.get(obs.step_id) || [];
      map.set(obs.step_id, [...existing, obs]);
    });
    return map;
  }, [observations]);

  // Get waste types for a step
  const getStepWasteTypes = useCallback((stepId: string): WasteType[] => {
    const stepObs = observationsByStep.get(stepId) || [];
    const wasteTypes = stepObs.flatMap((obs) => obs.waste_types || []);
    const unique = new Map<string, WasteType>();
    wasteTypes.forEach((wt) => {
      if (wt && !unique.has(wt.id)) {
        unique.set(wt.id, wt);
      }
    });
    return Array.from(unique.values());
  }, [observationsByStep]);

  // Group nodes by lane
  const nodesByLane = useMemo(() => {
    if (!selectedFutureState) return {};
    const lanes: Record<string, FutureStateNode[]> = {};
    selectedFutureState.nodes.forEach((node) => {
      if (!lanes[node.lane]) lanes[node.lane] = [];
      lanes[node.lane].push(node);
    });
    // Sort by position
    Object.values(lanes).forEach((nodes) =>
      nodes.sort((a, b) => a.position_x - b.position_x)
    );
    return lanes;
  }, [selectedFutureState]);

  // Group current steps by lane
  const currentByLane = useMemo(() => {
    const lanes: Record<string, ProcessStep[]> = {};
    currentSteps.forEach((step) => {
      if (!lanes[step.lane]) lanes[step.lane] = [];
      lanes[step.lane].push(step);
    });
    Object.values(lanes).forEach((steps) =>
      steps.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
    );
    return lanes;
  }, [currentSteps]);

  const allLanes = useMemo(() => {
    const lanes = new Set([
      ...Object.keys(nodesByLane),
      ...Object.keys(currentByLane),
    ]);
    return Array.from(lanes);
  }, [nodesByLane, currentByLane]);

  // Get impacted step IDs (source steps for modified/new nodes)
  const impactedStepIds = useMemo(() => {
    if (!selectedFutureState) return [];
    return selectedFutureState.nodes
      .filter((n) => n.action !== "keep" && n.source_step_id)
      .map((n) => n.source_step_id!)
      .filter(Boolean);
  }, [selectedFutureState]);

  // Get linked solution for a node (memoized to prevent infinite loops)
  const getLinkedSolution = useCallback((solutionId: string | null | undefined) => {
    if (!solutionId) return null;
    return acceptedSolutions.find((s) => s.id === solutionId);
  }, [acceptedSolutions]);

  // Handle opening step design panel (memoized to prevent infinite loops)
  const handleOpenStepDesign = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setStepDesignPanelOpen(true);
  }, []);

  // Handle clicking on a step in the context panel (memoized)
  const handleContextStepClick = useCallback((stepId: string) => {
    setHighlightedStepId(stepId);
    // Clear highlight after 2 seconds
    setTimeout(() => setHighlightedStepId(null), 2000);
  }, []);

  // Handle node update (refresh the graph)
  const handleNodeUpdated = async () => {
    if (selectedFutureState) {
      await fetchFutureStateGraph(selectedFutureState.id);
    }
  };

  // Check if a node can have step design (modify or new actions)
  const canHaveStepDesign = (node: FutureStateNode) => {
    return node.action === "modify" || node.action === "new";
  };

  // Handle adding a lane from the toolbox (memoized)
  const handleAddLane = useCallback(async (name: string, color: LaneColor) => {
    const futureState = selectedFutureStateRef.current;
    if (!futureState) return;

    try {
      const response = await fetch("/api/future-state/lanes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          futureStateId: futureState.id,
          name,
          color,
        }),
      });

      if (response.ok) {
        const { lane } = await response.json();
        setLanes((prev) => [...prev, lane]);
        toast({
          title: "Lane Added",
          description: `Added lane "${name}"`,
        });
      }
    } catch (error) {
      console.error("Error adding lane:", error);
    }
  }, [toast]);

  // Handle creating a node from the toolbox (memoized)
  const handleCreateNode = useCallback(async (lane: string, position: { x: number; y: number }, stepType = "action") => {
    const futureState = selectedFutureStateRef.current;
    if (!futureState) return;

    try {
      const response = await fetch("/api/future-state/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          futureStateId: futureState.id,
          name: "New Step",
          lane,
          stepType,
          positionX: position.x,
          positionY: position.y,
          action: "new",
        }),
      });

      if (response.ok) {
        await fetchFutureStateGraph(futureState.id);
        toast({
          title: "Step Added",
          description: "New step created. Click to edit.",
        });
      }
    } catch (error) {
      console.error("Error creating node:", error);
    }
  }, [toast]);

  // Handle updating node position (memoized)
  const handleNodePositionChange = useCallback(async (nodeId: string, position: { x: number; y: number }) => {
    try {
      await fetch("/api/future-state/nodes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId,
          updates: { positionX: position.x, positionY: position.y },
        }),
      });
    } catch (error) {
      console.error("Error updating node position:", error);
    }
  }, []);

  // Handle creating an edge (memoized)
  const handleCreateEdge = useCallback(async (sourceId: string, targetId: string) => {
    const futureState = selectedFutureStateRef.current;
    if (!futureState) return;

    try {
      const response = await fetch("/api/future-state/edges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          futureStateId: futureState.id,
          sourceNodeId: sourceId,
          targetNodeId: targetId,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        await fetchFutureStateGraph(futureState.id);
        toast({
          title: "Connection Added",
          description: "Steps connected.",
        });
      } else {
        console.error("Error creating edge:", data);
        toast({ title: "Connection Failed", description: data.error || "Failed to connect steps", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error creating edge:", error);
      toast({ title: "Connection Failed", description: "Network error", variant: "destructive" });
    }
  }, [toast]);

  // Handle deleting an edge (memoized)
  const handleDeleteEdge = useCallback(async (edgeId: string) => {
    try {
      const response = await fetch("/api/future-state/edges", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edgeId }),
      });

      const data = await response.json();
      if (response.ok) {
        const futureState = selectedFutureStateRef.current;
        if (futureState) {
          await fetchFutureStateGraph(futureState.id);
        }
        toast({
          title: "Connection Removed",
          description: "Connection deleted.",
        });
      } else {
        console.error("Error deleting edge:", data);
        toast({ title: "Delete Failed", description: data.error || "Failed to delete connection", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error deleting edge:", error);
      toast({ title: "Delete Failed", description: "Network error", variant: "destructive" });
    }
  }, [toast]);

  // Handle updating a node (name, action, etc.) - memoized
  const handleUpdateNode = useCallback(async (nodeId: string, updates: { name?: string; action?: NodeAction }) => {
    try {
      const response = await fetch("/api/future-state/nodes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId, updates }),
      });
      const data = await response.json();
      if (response.ok) {
        const futureState = selectedFutureStateRef.current;
        if (futureState) {
          await fetchFutureStateGraph(futureState.id);
        }
        toast({ title: "Step Updated", description: "Step updated successfully." });
      } else {
        console.error("Error updating node:", data);
        toast({ title: "Update Failed", description: data.error || "Failed to update step", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error updating node:", error);
      toast({ title: "Update Failed", description: "Network error", variant: "destructive" });
    }
  }, [toast]);

  // Handle deleting a node (memoized)
  const handleDeleteNode = useCallback(async (nodeId: string) => {
    try {
      const response = await fetch("/api/future-state/nodes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId, cascade: true }),
      });
      const data = await response.json();
      if (response.ok) {
        const futureState = selectedFutureStateRef.current;
        if (futureState) {
          await fetchFutureStateGraph(futureState.id);
        }
        toast({ title: "Step Deleted", description: "Step removed from the design." });
      } else {
        console.error("Error deleting node:", data);
        toast({ title: "Delete Failed", description: data.error || "Failed to delete step", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error deleting node:", error);
      toast({ title: "Delete Failed", description: "Network error", variant: "destructive" });
    }
  }, [toast]);

  // Handle duplicating a node (memoized)
  const handleDuplicateNode = useCallback(async (nodeId: string) => {
    const futureState = selectedFutureStateRef.current;
    if (!futureState) return;

    const node = futureState.nodes.find(n => n.id === nodeId);
    if (!node) return;

    try {
      const response = await fetch("/api/future-state/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          futureStateId: futureState.id,
          name: `${node.name} (copy)`,
          lane: node.lane,
          stepType: node.step_type,
          positionX: node.position_x + 50,
          positionY: node.position_y + 50,
          action: node.action,
        }),
      });
      if (response.ok) {
        await fetchFutureStateGraph(futureState.id);
        toast({ title: "Step Duplicated", description: "A copy of the step has been created." });
      }
    } catch (error) {
      console.error("Error duplicating node:", error);
    }
  }, [toast]);

  // Handle saving as a new version
  const handleSaveAsNewVersion = async (name: string, description?: string): Promise<string | null> => {
    if (!selectedFutureState) return null;

    try {
      const response = await fetch("/api/future-state/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          sourceVersionId: selectedFutureState.id,
          name,
          description,
        }),
      });

      if (response.ok) {
        const { versionId } = await response.json();
        toast({
          title: "Version Created",
          description: `Created new version "${name}"`,
        });
        await fetchData();
        await fetchFutureStateGraph(versionId);
        return versionId;
      }
    } catch (error) {
      console.error("Error creating version:", error);
    }
    return null;
  };

  // Handle save
  const handleSave = async () => {
    toast({
      title: "Saved",
      description: "Changes saved successfully.",
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const modifiedCount = selectedFutureState?.nodes.filter((n) => n.action === "modify").length || 0;
  const removedCount = selectedFutureState?.nodes.filter((n) => n.action === "remove").length || 0;
  const newCount = selectedFutureState?.nodes.filter((n) => n.action === "new").length || 0;

  return (
    <StageLanding
      stage="designer"
      title="Future State Designer"
      description="Design and visualize your future state process map"
      icon={Layout}
      stats={[
        { label: "Versions", value: futureStates.length },
        { label: "Modified", value: modifiedCount },
        { label: "Removed", value: removedCount },
        { label: "New Steps", value: newCount },
      ]}
      actions={
        <div className="flex items-center gap-3">
          {/* Edit Mode Toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={!isEditMode ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setIsEditMode(false)}
              className="gap-1.5"
            >
              <Eye className="h-4 w-4" />
              View
            </Button>
            <Button
              variant={isEditMode ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setIsEditMode(true)}
              className="gap-1.5"
              disabled={!selectedFutureState}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </div>

          {/* Version Panel */}
          {selectedFutureState && (
            <VersionPanel
              sessionId={sessionId}
              currentVersionId={selectedFutureState.id}
              onVersionSelect={(id) => fetchFutureStateGraph(id)}
              onSaveAsNewVersion={handleSaveAsNewVersion}
              isDirty={false}
              isSaving={false}
              onSave={handleSave}
            />
          )}

          {/* Generate Button */}
          <Button
            onClick={handleRunDesign}
            disabled={isRunning || acceptedSolutions.length === 0}
            className="gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Designing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {futureStates.length === 0 ? "Generate Design" : "Regenerate"}
              </>
            )}
          </Button>
        </div>
      }
    >
      {/* Session Context Header - hide on mobile for cleaner view */}
      {observations.length > 0 && !isMobile && (
        <SessionContextHeader
          observations={observations}
          solutions={acceptedSolutions}
          nodes={selectedFutureState?.nodes || []}
        />
      )}

      {futureStates.length === 0 ? (
        <Card className="border-dashed mt-4">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layout className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No future state designs yet
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
              {acceptedSolutions.length === 0
                ? "Accept solutions first to generate a future state design"
                : "Click 'Generate Design' to have AI create a future state based on your accepted solutions"}
            </p>
          </CardContent>
        </Card>
      ) : selectedFutureState ? (
        <div className="flex flex-col md:flex-row gap-4 mt-4">
          {/* Left Sidebar - Workflow Context Panel (hidden on mobile) */}
          <Collapsible
            open={contextPanelOpen}
            onOpenChange={setContextPanelOpen}
            className="flex-shrink-0 hidden md:block"
          >
            <div className="flex items-start">
              <CollapsibleContent className="w-56">
                <Card className="h-[calc(100vh-400px)] min-h-[400px]">
                  <CardContent className="p-3 h-full">
                    <WorkflowContextPanel
                      sessionId={sessionId}
                      currentSteps={currentSteps}
                      connections={connections}
                      observations={observations}
                      onStepClick={handleContextStepClick}
                      highlightedStepId={highlightedStepId}
                      impactedStepIds={impactedStepIds}
                      onViewSession={() => router.push(`/sessions/${sessionId}`)}
                    />
                  </CardContent>
                </Card>
              </CollapsibleContent>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-6 p-0 rounded-l-none border border-l-0"
                >
                  {contextPanelOpen ? (
                    <ChevronLeft className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </Collapsible>

          {/* Main Content */}
          <div className="flex-1 space-y-4 min-w-0">
            {/* View Mode Toggle */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
                <TabsList className="h-auto flex-wrap">
                  <TabsTrigger value="flowchart" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                    <Workflow className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Flowchart</span>
                    <span className="xs:hidden">Flow</span>
                  </TabsTrigger>
                  <TabsTrigger value="side-by-side" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                    <GitCompare className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Side by Side</span>
                    <span className="sm:hidden">Compare</span>
                  </TabsTrigger>
                  <TabsTrigger value="future-only" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                    <Layers className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Future Only</span>
                    <span className="sm:hidden">Future</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Legend - hide for flowchart since it has its own */}
              {viewMode !== "flowchart" && (
              <div className="flex items-center gap-3 text-xs">
                {Object.entries(actionConfig).map(([action, config]) => (
                  <div key={action} className="flex items-center gap-1">
                    <div className={cn("w-3 h-3 rounded border", config.color)} />
                    <span className="text-muted-foreground">{config.label}</span>
                  </div>
                ))}
              </div>
              )}
            </div>

            {/* Horizontal Flowchart View */}
            {viewMode === "flowchart" && (
              <div className="flex h-full">
                {/* Toolbox (visible in edit mode) */}
                {isEditMode && (
                  <FutureStateToolbox
                    isCollapsed={toolboxCollapsed}
                    onToggleCollapse={() => setToolboxCollapsed(!toolboxCollapsed)}
                    lanes={lanes}
                    onAddLane={handleAddLane}
                    className="flex-shrink-0"
                  />
                )}
                
                {/* Canvas */}
                <div className="flex-1 min-w-0">
                  <HorizontalFlowView
                    futureStateNodes={selectedFutureState.nodes}
                    futureStateEdges={selectedFutureState.edges}
                    currentSteps={currentSteps}
                    stepConnections={connections}
                    observations={observations}
                    getLinkedSolution={getLinkedSolution}
                    onNodeClick={handleOpenStepDesign}
                    highlightedNodeId={highlightedStepId}
                    isEditMode={isEditMode}
                    onCreateNode={handleCreateNode}
                    onUpdateNode={handleUpdateNode}
                    onDeleteNode={handleDeleteNode}
                    onDuplicateNode={handleDuplicateNode}
                    onNodePositionChange={handleNodePositionChange}
                    onCreateEdge={handleCreateEdge}
                    onDeleteEdge={handleDeleteEdge}
                  />
                </div>
              </div>
            )}

            {/* Process Maps (Vertical View) */}
            {viewMode !== "flowchart" && (
            <div
              className={cn(
                "grid gap-4",
                viewMode === "side-by-side" ? "lg:grid-cols-2" : "grid-cols-1"
              )}
            >
              {/* Current State */}
              {viewMode === "side-by-side" && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Current State
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 overflow-x-auto">
                    {allLanes.map((lane) => (
                      <div key={lane} className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {lane}
                        </h4>
                        <div className="flex gap-2 flex-wrap">
                          <TooltipProvider>
                            {(currentByLane[lane] || []).map((step) => {
                              const stepObs = observationsByStep.get(step.id) || [];
                              const wasteTypes = getStepWasteTypes(step.id);
                              const priority = stepObs.reduce(
                                (sum, o) => sum + (o.priority_score || 0),
                                0
                              );
                              const isHighlighted = highlightedStepId === step.id;

                              return (
                                <Tooltip key={step.id}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={cn(
                                        "px-3 py-2 border rounded-md text-xs transition-all",
                                        stepObs.length > 0
                                          ? priority >= 50
                                            ? "bg-red-50 border-red-200"
                                            : priority >= 25
                                            ? "bg-amber-50 border-amber-200"
                                            : "bg-yellow-50 border-yellow-200"
                                          : "bg-gray-100 border-gray-200",
                                        isHighlighted && "ring-2 ring-blue-500 ring-offset-1"
                                      )}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <span>{step.step_name}</span>
                                        {stepObs.length > 0 && (
                                          <Badge
                                            variant="secondary"
                                            className="text-[9px] px-1 py-0"
                                          >
                                            {stepObs.length}
                                          </Badge>
                                        )}
                                      </div>
                                      {wasteTypes.length > 0 && (
                                        <div className="flex gap-0.5 mt-1">
                                          {wasteTypes.slice(0, 2).map((wt) => (
                                            <span
                                              key={wt.id}
                                              className="text-[8px] px-1 py-0 bg-amber-100 text-amber-700 rounded"
                                            >
                                              {wt.code}
                                            </span>
                                          ))}
                                          {wasteTypes.length > 2 && (
                                            <span className="text-[8px] text-muted-foreground">
                                              +{wasteTypes.length - 2}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-xs">
                                    <p className="font-medium">{step.step_name}</p>
                                    {stepObs.length > 0 && (
                                      <div className="mt-1 space-y-1">
                                        <p className="text-amber-500 text-xs flex items-center gap-1">
                                          <AlertTriangle className="h-3 w-3" />
                                          {stepObs.length} observation
                                          {stepObs.length !== 1 ? "s" : ""} recorded
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                          {wasteTypes.map((wt) => (
                                            <Badge
                                              key={wt.id}
                                              variant="outline"
                                              className="text-[10px]"
                                            >
                                              {wt.code}: {wt.name}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </TooltipProvider>
                          {(!currentByLane[lane] || currentByLane[lane].length === 0) && (
                            <span className="text-xs text-muted-foreground italic">
                              No steps in this lane
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Future State */}
              <Card className="border-brand-gold/30">
                <CardHeader className="pb-2 bg-brand-gold/5">
                  <CardTitle className="text-sm flex items-center gap-2 text-brand-navy">
                    <Sparkles className="h-4 w-4 text-brand-gold" />
                    {selectedFutureState.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 overflow-x-auto">
                  {allLanes.map((lane) => (
                    <div key={lane} className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {lane}
                      </h4>
                      <div className="flex gap-2 flex-wrap">
                        <TooltipProvider>
                          {(nodesByLane[lane] || []).map((node) => {
                            const config = actionConfig[node.action];
                            const solution = getLinkedSolution(node.linked_solution_id);
                            const explanation =
                              (node.modified_fields as { explanation?: string })?.explanation;
                            const hasStepDesign = canHaveStepDesign(node);
                            const designStatus = node.step_design_status || "strategy_only";
                            const StatusIcon = stepDesignStatusConfig[designStatus].icon;

                            // Get waste types being addressed by this node
                            const sourceStepWaste = node.source_step_id
                              ? getStepWasteTypes(node.source_step_id)
                              : [];
                            const sourceStepObs = node.source_step_id
                              ? observationsByStep.get(node.source_step_id) || []
                              : [];

                            return (
                              <Tooltip key={node.id}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      "px-3 py-2 border rounded-md text-xs group relative cursor-pointer transition-all hover:shadow-md",
                                      config.color,
                                      hasStepDesign && "hover:ring-2 hover:ring-brand-gold/50"
                                    )}
                                    onClick={() => hasStepDesign && handleOpenStepDesign(node.id)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className={node.action === "remove" ? "line-through" : ""}>
                                        {node.name}
                                      </span>
                                      <Badge variant="outline" className="text-[10px] capitalize">
                                        {node.action}
                                      </Badge>
                                      {hasStepDesign && (
                                        <StatusIcon
                                          className={cn(
                                            "h-3.5 w-3.5",
                                            stepDesignStatusConfig[designStatus].color
                                          )}
                                        />
                                      )}
                                    </div>
                                    {hasStepDesign && (
                                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Pencil className="h-3 w-3 text-brand-navy" />
                                      </div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-sm p-3 space-y-2">
                                  <p className="font-medium">{node.name}</p>
                                  
                                  {/* Linked Solution */}
                                  {solution && (
                                    <div className="flex items-start gap-1.5 pt-1 border-t">
                                      <Lightbulb className="h-3.5 w-3.5 text-brand-gold mt-0.5 shrink-0" />
                                      <div>
                                        <p className="text-xs font-medium">{solution.title}</p>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                          {solution.description}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Waste Being Addressed */}
                                  {sourceStepWaste.length > 0 && (
                                    <div className="pt-1 border-t space-y-1">
                                      <div className="flex items-center gap-1 text-xs">
                                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                                        <span className="font-medium">
                                          Addressing {sourceStepObs.length} observation
                                          {sourceStepObs.length !== 1 ? "s" : ""}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {sourceStepWaste.slice(0, 4).map((wt) => (
                                          <Badge
                                            key={wt.id}
                                            variant="secondary"
                                            className="text-[10px] bg-amber-100 text-amber-800"
                                          >
                                            {wt.code}
                                          </Badge>
                                        ))}
                                        {sourceStepWaste.length > 4 && (
                                          <Badge variant="outline" className="text-[10px]">
                                            +{sourceStepWaste.length - 4}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {explanation && (
                                    <p className="text-xs text-muted-foreground pt-1 border-t">
                                      {explanation}
                                    </p>
                                  )}
                                  
                                  {hasStepDesign && (
                                    <p className="text-brand-gold text-xs pt-1 border-t">
                                      Click to {designStatus === "step_design_complete" ? "view" : "design"} step details
                                    </p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </TooltipProvider>
                        {(!nodesByLane[lane] || nodesByLane[lane].length === 0) && (
                          <span className="text-xs text-muted-foreground italic">
                            No steps in this lane
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            )}

            {/* Step Impact Summary */}
            {selectedFutureState && (
              <StepImpactSummary
                nodes={selectedFutureState.nodes}
                solutions={acceptedSolutions}
                observations={observations}
                currentSteps={currentSteps}
                onNodeClick={(nodeId) => {
                  const node = selectedFutureState.nodes.find((n) => n.id === nodeId);
                  if (node && canHaveStepDesign(node)) {
                    handleOpenStepDesign(nodeId);
                  }
                }}
              />
            )}

            {/* Change Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Change Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gray-200" />
                    <span>
                      {selectedFutureState.nodes.filter((n) => n.action === "keep").length} Unchanged
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-200" />
                    <span>{modifiedCount} Modified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-200" />
                    <span>{removedCount} Removed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-200" />
                    <span>{newCount} New</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="mt-4">
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Select a future state version to view</p>
          </CardContent>
        </Card>
      )}

      {/* Step Design Panel Sheet */}
      <Sheet open={stepDesignPanelOpen} onOpenChange={setStepDesignPanelOpen}>
        <SheetContent side="right" className="w-full sm:w-[480px] max-w-[100vw] p-0 overflow-hidden">
          {selectedNodeId && selectedFutureState ? (
            <StepDesignPanel
              sessionId={sessionId}
              futureStateId={selectedFutureState.id}
              nodeId={selectedNodeId}
              userId={userId || ""}
              onClose={() => setStepDesignPanelOpen(false)}
              onNodeUpdated={handleNodeUpdated}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </StageLanding>
  );
}
