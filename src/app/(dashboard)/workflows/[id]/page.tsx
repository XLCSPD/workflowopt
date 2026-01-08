"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { ProcessMap } from "@/components/workflow/ProcessMap";
import { StepDetailPanel } from "@/components/workflow/StepDetailPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Play,
  Edit,
  MoreVertical,
  Download,
  Share2,
  Loader2,
  Plus,
  Redo2,
  Save,
  Trash2,
  Undo2,
  Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { getWorkflowWithDetails, updateProcess } from "@/lib/services/workflows";
import { exportWorkflowToPDF } from "@/lib/services/export";
import type { ReactFlowInstance } from "reactflow";
import {
  createStep,
  updateStep,
  deleteStep,
  createConnection,
  deleteConnection,
  createLane,
  deleteLane,
  deleteLaneMoveSteps,
  ensureDefaultProcessLanes,
  getProcessLanes,
  renameLane,
  reorderLanes,
  updateLaneColor,
  deleteProcess,
  updateStepPositions,
} from "@/lib/services/workflowEditor";
import type { Process, ProcessLane, ProcessStep, StepType, InformationFlowWithRelations, CreateInformationFlowInput, UpdateInformationFlowInput, WasteType } from "@/types";
import type { StepConnection } from "@/lib/services/workflows";
import { StepToolbox } from "@/components/workflow/StepToolbox";
import { FlowDetailPanel } from "@/components/workflow/FlowDetailPanel";
import { getFlowsByProcess, createFlow, updateFlow, deleteFlow } from "@/lib/services/informationFlows";
import { getWasteTypes } from "@/lib/services/wasteTypes";
import { SwimlaneManager } from "@/components/workflow/SwimlaneManager";
import {
  WorkflowContextDrawer,
  ContextTriggerButton,
} from "@/components/workflow/WorkflowContextDrawer";
import { CopyWorkflowDialog } from "@/components/workflow/CopyWorkflowDialog";
import { useAuthStore } from "@/lib/stores/authStore";
import { canEditWorkflow, getSourceWorkflowName, getSourceFutureStateName } from "@/lib/services/workflowCopy";
import { useSearchParams } from "next/navigation";

interface ConnectionData {
  id?: string;
  source: string;
  target: string;
}

interface WorkflowSnapshot {
  steps: ProcessStep[];
  connections: ConnectionData[];
}

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);

  // Copy workflow dialog state (AC-1.2)
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [workflow, setWorkflow] = useState<Process | null>(null);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [connections, setConnections] = useState<ConnectionData[]>([]);
  const [connectionIds, setConnectionIds] = useState<Record<string, string>>({});
  const [observations] = useState<
    Record<string, { count: number; priorityScore: number }>
  >({});

  // Keep connectionIds consistent with the current connections state.
  useEffect(() => {
    const map: Record<string, string> = {};
    connections.forEach((c) => {
      if (!c.id) return;
      map[`${c.source}-${c.target}`] = c.id;
    });
    setConnectionIds(map);
  }, [connections]);

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedStepIds, setSelectedStepIds] = useState<string[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddStepDialogOpen, setIsAddStepDialogOpen] = useState(false);
  const [isEditStepDialogOpen, setIsEditStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<ProcessStep | null>(null);
  const [stepForm, setStepForm] = useState({
    name: "",
    description: "",
    type: "action" as StepType,
    lane: "Requester",
    lead_time_minutes: "" as string,
    cycle_time_minutes: "" as string,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [lanes, setLanes] = useState<ProcessLane[]>([]);
  const [isSwimlaneManagerOpen, setIsSwimlaneManagerOpen] = useState(false);
  
  // Context drawer state
  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState(false);
  const [contextCompleteness, setContextCompleteness] = useState(0);
  const laneNames = useMemo(() => lanes.map((l) => l.name), [lanes]);

  // Information Flow state
  const [informationFlows, setInformationFlows] = useState<InformationFlowWithRelations[]>([]);
  const [flowPanelMode, setFlowPanelMode] = useState<"create" | "edit" | null>(null);
  const [selectedFlowForEdit, setSelectedFlowForEdit] = useState<InformationFlowWithRelations | null>(null);
  const [newFlowEdge, setNewFlowEdge] = useState<{ sourceStepId: string; targetStepId: string } | null>(null);
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);

  // Lineage display state (AC-4.2)
  const [sourceWorkflowName, setSourceWorkflowName] = useState<string | null>(null);

  // Check if user can copy this workflow (AC-1.3)
  const canCopy = useMemo(() => {
    if (!user || !workflow) return false;
    return canEditWorkflow({ created_by: workflow.created_by }, { id: user.id, role: user.role });
  }, [user, workflow]);

  // Handle mode=edit URL parameter (AC-5.1)
  useEffect(() => {
    if (searchParams.get("mode") === "edit" && !isEditMode && !isLoading) {
      setIsEditMode(true);
    }
  }, [searchParams, isLoading, isEditMode]);

  // Fetch source workflow name for lineage display (AC-4.2)
  useEffect(() => {
    if (!workflow) return;
    
    const fetchSourceName = async () => {
      if (workflow.copied_from_future_state_id) {
        const name = await getSourceFutureStateName(workflow.copied_from_future_state_id);
        setSourceWorkflowName(name);
      } else if (workflow.copied_from_process_id) {
        const name = await getSourceWorkflowName(workflow.copied_from_process_id);
        setSourceWorkflowName(name);
      } else {
        setSourceWorkflowName(null);
      }
    };

    fetchSourceName();
  }, [workflow]);

  const laneStyles = useMemo(() => {
    const map: Record<string, { bg: string; border: string }> = {};
    lanes.forEach((l) => {
      if (l.bg_color && l.border_color) {
        map[l.name] = { bg: l.bg_color, border: l.border_color };
      }
    });
    return map;
  }, [lanes]);
  const [newLaneName, setNewLaneName] = useState("");
  const [isAddingNewLane, setIsAddingNewLane] = useState(false);
  const [inlineEditingStepId, setInlineEditingStepId] = useState<string | null>(null);

  const selectedStep = steps.find((s) => s.id === selectedStepId) || null;

  const {
    canUndo,
    canRedo,
    undo,
    redo,
    pushSnapshot,
    pushUndoSnapshot,
    pushRedoSnapshot,
    clear: clearHistory,
  } = useUndoRedo<WorkflowSnapshot>({ limit: 50 });
  const currentSnapshot = useMemo<WorkflowSnapshot>(() => ({ steps, connections }), [steps, connections]);

  const cloneSnapshot = useCallback((snap: WorkflowSnapshot): WorkflowSnapshot => {
    // Steps/connections are plain JSON-ish data from Supabase; JSON clone is fine and stable.
    return JSON.parse(JSON.stringify(snap)) as WorkflowSnapshot;
  }, []);

  const handleAddNewLane = useCallback(async () => {
    if (!workflow) return;
    const trimmed = newLaneName.trim();
    if (!trimmed) return;
    if (laneNames.includes(trimmed)) {
      toast({ variant: "destructive", title: "Lane already exists" });
      return;
    }

    setIsSaving(true);
    try {
      const created = await createLane(workflow.id, trimmed);
      setLanes((prev) => [...prev, created].sort((a, b) => a.order_index - b.order_index));
      setStepForm((prev) => ({ ...prev, lane: created.name }));
      toast({ title: `Swimlane "${created.name}" added` });
      setNewLaneName("");
      setIsAddingNewLane(false);
    } catch (error) {
      console.error("Failed to add swimlane:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to add swimlane." });
    } finally {
      setIsSaving(false);
    }
  }, [workflow, newLaneName, laneNames, toast]);

  // Handle rename workflow
  const handleRenameWorkflow = useCallback(async (newName: string) => {
    if (!workflow) return;
    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName === workflow.name) return;

    try {
      await updateProcess(workflow.id, { name: trimmedName });
      setWorkflow((prev) => prev ? { ...prev, name: trimmedName } : null);
      toast({ title: "Workflow renamed successfully" });
    } catch (error) {
      console.error("Failed to rename workflow:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to rename workflow." });
      throw error; // Re-throw so EditableTitle stays in edit mode
    }
  }, [workflow, toast]);

  // Fetch workflow data
  useEffect(() => {
    const loadWorkflow = async () => {
      try {
        setIsLoading(true);
        const workflowId = params.id as string;

        const {
          process,
          steps: workflowSteps,
          connections: workflowConnections,
          lanes: workflowLanes,
        } = await getWorkflowWithDetails(workflowId);

        setWorkflow(process);
        setSteps(workflowSteps);

        // Store connection IDs for deletion
        const connIdMap: Record<string, string> = {};
        workflowConnections.forEach((c: StepConnection) => {
          const key = `${c.source_step_id}-${c.target_step_id}`;
          connIdMap[key] = c.id;
        });
        setConnectionIds(connIdMap);

        setConnections(
          workflowConnections.map((c: StepConnection) => ({
            id: c.id,
            source: c.source_step_id,
            target: c.target_step_id,
          }))
        );

        // Load or initialize persisted lanes (DB-backed order)
        let resolvedLanes: ProcessLane[] = workflowLanes || [];
        if (resolvedLanes.length === 0) {
          resolvedLanes = await ensureDefaultProcessLanes(workflowId);
        }
        setLanes(resolvedLanes);

        // Keep step form lane valid
        setStepForm((prev) => ({
          ...prev,
          lane: resolvedLanes[0]?.name ?? prev.lane ?? "Requester",
        }));

        // Load information flows
        try {
          const flows = await getFlowsByProcess(workflowId);
          setInformationFlows(flows);
        } catch (flowError) {
          console.error("Failed to load information flows:", flowError);
          // Don't fail the whole page load if flows fail
        }

        // Load waste types for flow panel
        try {
          const types = await getWasteTypes();
          setWasteTypes(types);
        } catch (wasteError) {
          console.error("Failed to load waste types:", wasteError);
        }

        // Reset UI/editor state on (re)load
        setSelectedStepId(null);
        setIsPanelOpen(false);
        setInlineEditingStepId(null);
        setIsEditStepDialogOpen(false);
        setIsAddStepDialogOpen(false);
        setEditingStep(null);
        setFlowPanelMode(null);
        setSelectedFlowForEdit(null);
        setNewFlowEdge(null);
        clearHistory();
      } catch (error) {
        console.error("Failed to load workflow:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load workflow. Please try again.",
        });
        router.push("/workflows");
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflow();
  }, [params.id, router, toast, clearHistory]);

  // Fetch context completeness
  useEffect(() => {
    const fetchContextCompleteness = async () => {
      const workflowId = params.id as string;
      if (!workflowId) return;
      
      try {
        const response = await fetch(`/api/workflows/${workflowId}/context`);
        if (response.ok) {
          const data = await response.json();
          setContextCompleteness(data.completeness?.overallScore || 0);
        }
      } catch (error) {
        console.error("Failed to fetch context completeness:", error);
      }
    };

    fetchContextCompleteness();
  }, [params.id]);

  const handleStepClick = useCallback(
    (stepId: string) => {
      console.log("Workflows page: handleStepClick called with stepId:", stepId, "isEditMode:", isEditMode);
      if (isEditMode) {
        // In edit mode, open edit dialog
        const step = steps.find((s) => s.id === stepId);
        if (step) {
          setSelectedStepId(stepId);
          setInlineEditingStepId(null);
          setEditingStep(step);
          setStepForm({
            name: step.step_name,
            description: step.description || "",
            type: step.step_type,
            lane: step.lane,
            lead_time_minutes: step.lead_time_minutes != null ? String(step.lead_time_minutes) : "",
            cycle_time_minutes: step.cycle_time_minutes != null ? String(step.cycle_time_minutes) : "",
          });
          setIsEditStepDialogOpen(true);
        }
      } else {
        console.log("Workflows page: Opening panel for step:", stepId);
    setSelectedStepId(stepId);
    setIsPanelOpen(true);
      }
    },
    [isEditMode, steps]
  );

  const handleSelectStep = useCallback((stepId: string | null) => {
    setSelectedStepId(stepId);
    // When single-selecting, also update multi-select state
    if (stepId) {
      setSelectedStepIds([stepId]);
    }
  }, []);

  const handleSelectSteps = useCallback((stepIds: string[]) => {
    setSelectedStepIds(stepIds);
    // When multi-selecting, clear single select if more than one
    if (stepIds.length !== 1) {
      setSelectedStepId(null);
    } else if (stepIds.length === 1) {
      setSelectedStepId(stepIds[0]);
    }
  }, []);

  const handleCreateStepFromToolbox = useCallback(
    async (input: { type: ProcessStep["step_type"]; lane: string; position: { x: number; y: number } }) => {
      if (!workflow) return;
      if (isSaving) return;

      pushSnapshot(cloneSnapshot(currentSnapshot));

      setIsSaving(true);
      try {
        const label = input.type.charAt(0).toUpperCase() + input.type.slice(1);
        const newStep = await createStep({
          id: crypto.randomUUID(),
          process_id: workflow.id,
          name: `New ${label}`,
          type: input.type as StepType,
          lane: input.lane,
          order_index: steps.length,
          position_x: input.position.x,
          position_y: input.position.y,
        });

        setSteps((prev) => [...prev, newStep]);
        setSelectedStepId(newStep.id);
        setInlineEditingStepId(newStep.id);
      } catch (error) {
        console.error("Failed to create step from toolbox:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to add step." });
      } finally {
        setIsSaving(false);
      }
    },
    [workflow, isSaving, pushSnapshot, cloneSnapshot, currentSnapshot, steps.length, toast]
  );

  // Handle position changes from ProcessMap - persist to database
  const handlePositionsChange = useCallback(
    async (positions: { id: string; x: number; y: number }[]) => {
      if (!workflow) return;
      if (positions.length === 0) return;
      
      try {
        await updateStepPositions(
          positions.map((p) => ({
            id: p.id,
            position_x: p.x,
            position_y: p.y,
          }))
        );
      } catch (error) {
        console.error("Failed to save step positions:", error);
        // Don't show toast for this - it's a background save
      }
    },
    [workflow]
  );

  const handleReorderLanes = useCallback(
    async (orderedLaneIds: string[]) => {
      if (!workflow) return;
      const next = orderedLaneIds
        .map((id, index) => {
          const lane = lanes.find((l) => l.id === id);
          return lane ? { ...lane, order_index: index } : null;
        })
        .filter(Boolean) as ProcessLane[];

      setLanes(next);
      try {
        await reorderLanes(workflow.id, orderedLaneIds);
      } catch (error) {
        console.error("Failed to reorder lanes:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to reorder lanes." });
        // Reload from DB to recover
        const refreshed = await getProcessLanes(workflow.id);
        setLanes(refreshed);
      }
    },
    [workflow, lanes, toast]
  );

  const handleRenameLane = useCallback(
    async (_laneId: string, oldName: string, newName: string) => {
      if (!workflow) return;
      const trimmed = newName.trim();
      if (!trimmed) return;
      if (laneNames.includes(trimmed)) {
        toast({ variant: "destructive", title: "Lane already exists" });
        return;
      }

      setIsSaving(true);
      try {
        await renameLane(workflow.id, oldName, trimmed);
        setLanes((prev) =>
          prev.map((l) => (l.name === oldName ? { ...l, name: trimmed } : l))
        );
        setSteps((prev) => prev.map((s) => (s.lane === oldName ? { ...s, lane: trimmed } : s)));
        setStepForm((prev) => ({ ...prev, lane: prev.lane === oldName ? trimmed : prev.lane }));
        toast({ title: "Swimlane renamed" });
      } catch (error) {
        console.error("Failed to rename lane:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to rename lane." });
      } finally {
        setIsSaving(false);
      }
    },
    [workflow, laneNames, toast]
  );

  const handleDeleteLane = useCallback(
    async (laneId: string) => {
      if (!workflow) return;
      const lane = lanes.find((l) => l.id === laneId);
      if (!lane) return;
      const stepCount = steps.filter((s) => s.lane === lane.name).length;
      if (stepCount > 0) {
        toast({ variant: "destructive", title: "Lane not empty", description: "Move or delete steps first." });
        return;
      }

      setIsSaving(true);
      try {
        await deleteLane(workflow.id, laneId);
        setLanes((prev) => prev.filter((l) => l.id !== laneId));
        setStepForm((prev) => ({ ...prev, lane: laneNames[0] || "Requester" }));
        toast({ title: "Swimlane deleted" });
      } catch (error) {
        console.error("Failed to delete lane:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete lane." });
      } finally {
        setIsSaving(false);
      }
    },
    [workflow, lanes, steps, laneNames, toast]
  );

  const handleDeleteLaneMoveSteps = useCallback(
    async (laneId: string, destinationLaneId: string) => {
      if (!workflow) return;
      if (isSaving) return;

      const lane = lanes.find((l) => l.id === laneId);
      const dest = lanes.find((l) => l.id === destinationLaneId);
      if (!lane || !dest) return;

      setIsSaving(true);
      try {
        await deleteLaneMoveSteps(workflow.id, laneId, destinationLaneId);

        // Update local steps to reflect the server-side move.
        setSteps((prev) => prev.map((s) => (s.lane === lane.name ? { ...s, lane: dest.name } : s)));

        // Refresh lanes (order_index may have been normalized server-side)
        const refreshed = await getProcessLanes(workflow.id);
        setLanes(refreshed);

        // Keep forms pointing to a valid lane name
        setStepForm((prev) => ({ ...prev, lane: prev.lane === lane.name ? dest.name : prev.lane }));

        toast({ title: "Swimlane deleted", description: `Moved steps to “${dest.name}”.` });
      } catch (error) {
        console.error("Failed to delete lane (move steps):", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete lane." });
      } finally {
        setIsSaving(false);
      }
    },
    [workflow, isSaving, lanes, toast]
  );

  const handleUpdateLaneColor = useCallback(
    async (laneId: string, colors: { bg_color: string | null; border_color: string | null }) => {
      if (!workflow) return;
      if (isSaving) return;

      setIsSaving(true);
      try {
        const updated = await updateLaneColor(workflow.id, laneId, colors);
        setLanes((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      } catch (error) {
        console.error("Failed to update lane color:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to update lane color." });
      } finally {
        setIsSaving(false);
      }
    },
    [workflow, isSaving, toast]
  );

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedStepId(null);
  }, []);

  const applySnapshot = useCallback(
    async (snap: WorkflowSnapshot) => {
      if (!workflow) return;

      setInlineEditingStepId(null);
      setIsEditStepDialogOpen(false);
      setIsAddStepDialogOpen(false);
      setEditingStep(null);

      setIsSaving(true);
      try {
        const currentById = new Map<string, ProcessStep>(steps.map((s) => [s.id, s]));
        const targetById = new Map<string, ProcessStep>(snap.steps.map((s) => [s.id, s]));

        // 1) Delete steps not in target (connections will cascade)
        for (const id of Array.from(currentById.keys())) {
          if (!targetById.has(id)) {
            await deleteStep(id);
          }
        }

        // 2) Upsert steps to match target
        for (const [id, target] of Array.from(targetById.entries())) {
          const exists = currentById.has(id);

          if (!exists) {
            await createStep({
              id,
              process_id: workflow.id,
              name: target.step_name,
              description: target.description ?? undefined,
              type: target.step_type,
              lane: target.lane,
              order_index: target.order_index,
              lead_time_minutes: target.lead_time_minutes ?? null,
              cycle_time_minutes: target.cycle_time_minutes ?? null,
              position_x: target.position_x,
              position_y: target.position_y,
            });
          } else {
            await updateStep(id, {
              name: target.step_name,
              description: target.description ?? undefined,
              type: target.step_type,
              lane: target.lane,
              order_index: target.order_index,
              lead_time_minutes: target.lead_time_minutes ?? null,
              cycle_time_minutes: target.cycle_time_minutes ?? null,
              position_x: target.position_x,
              position_y: target.position_y,
            });
          }
        }

        // 3) Normalize target connections to always have an id
        const normalizedTargetConnections: ConnectionData[] = snap.connections.map((c) => ({
          ...c,
          id: c.id ?? crypto.randomUUID(),
        }));

        const currentConnIds = new Set<string>(
          connections.map((c) => c.id).filter((id): id is string => typeof id === "string")
        );
        const targetConnIds = new Set<string>(
          normalizedTargetConnections.map((c) => c.id).filter((id): id is string => typeof id === "string")
        );

        // 4) Delete connections not in target
        for (const c of connections) {
          if (!c.id) continue;
          if (!targetConnIds.has(c.id)) {
            await deleteConnection(c.id);
          }
        }

        // 5) Create connections missing from current
        for (const c of normalizedTargetConnections) {
          if (!c.id) continue;
          if (currentConnIds.has(c.id)) continue;
          await createConnection(workflow.id, c.source, c.target, undefined, c.id);
        }

        // 6) Apply state
        setSteps(snap.steps);
        setConnections(normalizedTargetConnections);
        setSelectedStepId(null);
      } catch (error) {
        console.error("Failed to apply snapshot:", error);
        toast({
          variant: "destructive",
          title: "Undo/Redo failed",
          description: "Could not apply workflow change. Please try again.",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [workflow, steps, connections, toast]
  );

  const handleUndo = useCallback(async () => {
    if (!isEditMode) return;
    if (!canUndo) return;
    if (isSaving) return;

    const prev = undo();
    if (!prev) return;
    pushRedoSnapshot(cloneSnapshot(currentSnapshot));
    await applySnapshot(prev);
  }, [applySnapshot, canUndo, cloneSnapshot, currentSnapshot, isEditMode, isSaving, pushRedoSnapshot, undo]);

  const handleRedo = useCallback(async () => {
    if (!isEditMode) return;
    if (!canRedo) return;
    if (isSaving) return;

    const next = redo();
    if (!next) return;
    pushUndoSnapshot(cloneSnapshot(currentSnapshot));
    await applySnapshot(next);
  }, [applySnapshot, canRedo, cloneSnapshot, currentSnapshot, isEditMode, isSaving, pushUndoSnapshot, redo]);

  // Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z
  useEffect(() => {
    if (!isEditMode) return;

    const handler = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || el?.isContentEditable) return;

      const isMacUndo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z";
      if (!isMacUndo) return;

      e.preventDefault();
      if (e.shiftKey) {
        void handleRedo();
      } else {
        void handleUndo();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleRedo, handleUndo, isEditMode]);

  const handleQuickAddStep = useCallback(
    async (lane: string, position: { x: number; y: number }) => {
      if (!workflow) return;
      if (isSaving) return;

      pushSnapshot(cloneSnapshot(currentSnapshot));

      setIsSaving(true);
      try {
        const newStep = await createStep({
          id: crypto.randomUUID(),
          process_id: workflow.id,
          name: "New Step",
          description: undefined,
          type: "action",
          lane,
          order_index: steps.length,
          position_x: position.x,
          position_y: position.y,
        });

        setSteps((prev) => [...prev, newStep]);
        setSelectedStepId(newStep.id);
        setInlineEditingStepId(newStep.id);
      } catch (error) {
        console.error("Failed to quick-add step:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to add step.",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [workflow, isSaving, pushSnapshot, cloneSnapshot, currentSnapshot, steps.length, toast]
  );

  const handleStartInlineEditStep = useCallback((stepId: string) => {
    setSelectedStepId(stepId);
    setInlineEditingStepId(stepId);
  }, []);

  const handleCancelInlineEditStep = useCallback((stepId: string) => {
    if (inlineEditingStepId === stepId) setInlineEditingStepId(null);
  }, [inlineEditingStepId]);

  const handleInlineEditStep = useCallback(
    async (stepId: string, newName: string) => {
      const trimmed = newName.trim();

      // If user clears the name, treat it as a delete (common quick-edit behavior).
      if (!trimmed) {
        pushSnapshot(cloneSnapshot(currentSnapshot));

        setInlineEditingStepId(null);
        setIsSaving(true);
        try {
          await deleteStep(stepId);
          setSteps((prev) => prev.filter((s) => s.id !== stepId));
          setConnections((prev) => prev.filter((c) => c.source !== stepId && c.target !== stepId));
          setSelectedStepId((prev) => (prev === stepId ? null : prev));
          toast({ title: "Step deleted" });
        } catch (error) {
          console.error("Failed to delete step:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to delete step.",
          });
        } finally {
          setIsSaving(false);
        }
        return;
      }

      const step = steps.find((s) => s.id === stepId);
      if (!step) return;

      // Avoid creating history entries for no-op edits.
      if (step.step_name === trimmed) {
        setInlineEditingStepId(null);
        return;
      }

      pushSnapshot(cloneSnapshot(currentSnapshot));

      setIsSaving(true);
      try {
        const updated = await updateStep(stepId, { name: trimmed });
        setSteps((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        setInlineEditingStepId(null);
      } catch (error) {
        console.error("Failed to rename step:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update step name.",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [steps, pushSnapshot, cloneSnapshot, currentSnapshot, toast]
  );

  const handleAddStep = async () => {
    if (!stepForm.name.trim() || !workflow) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a step name.",
      });
      return;
    }

    pushSnapshot(cloneSnapshot(currentSnapshot));
    setInlineEditingStepId(null);
    setIsSaving(true);
    try {
      const leadTime =
        stepForm.lead_time_minutes.trim() === ""
          ? null
          : Number(stepForm.lead_time_minutes);
      const cycleTime =
        stepForm.cycle_time_minutes.trim() === ""
          ? null
          : Number(stepForm.cycle_time_minutes);

      if ((leadTime != null && !Number.isFinite(leadTime)) || (cycleTime != null && !Number.isFinite(cycleTime))) {
        toast({
          variant: "destructive",
          title: "Invalid time",
          description: "Lead Time and Cycle Time must be numbers (minutes).",
        });
        return;
      }

      const newStep = await createStep({
        id: crypto.randomUUID(),
        process_id: workflow.id,
        name: stepForm.name.trim(),
        description: stepForm.description.trim() || undefined,
        type: stepForm.type,
        lane: stepForm.lane,
        lead_time_minutes: leadTime,
        cycle_time_minutes: cycleTime,
        order_index: steps.length,
      });

      setSteps([...steps, newStep]);
      setIsAddStepDialogOpen(false);
      resetStepForm();

      toast({
        title: "Step added",
        description: "New step has been added to the workflow.",
      });
    } catch (error) {
      console.error("Failed to add step:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add step.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStep = async () => {
    if (!editingStep || !stepForm.name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a step name.",
      });
      return;
    }

    pushSnapshot(cloneSnapshot(currentSnapshot));
    setInlineEditingStepId(null);
    setIsSaving(true);
    try {
      const leadTime =
        stepForm.lead_time_minutes.trim() === ""
          ? null
          : Number(stepForm.lead_time_minutes);
      const cycleTime =
        stepForm.cycle_time_minutes.trim() === ""
          ? null
          : Number(stepForm.cycle_time_minutes);

      if ((leadTime != null && !Number.isFinite(leadTime)) || (cycleTime != null && !Number.isFinite(cycleTime))) {
        toast({
          variant: "destructive",
          title: "Invalid time",
          description: "Lead Time and Cycle Time must be numbers (minutes).",
        });
        return;
      }

      const updated = await updateStep(editingStep.id, {
        name: stepForm.name.trim(),
        description: stepForm.description.trim() || undefined,
        type: stepForm.type,
        lane: stepForm.lane,
        lead_time_minutes: leadTime,
        cycle_time_minutes: cycleTime,
      });

      setSteps(steps.map((s) => (s.id === updated.id ? updated : s)));
      setIsEditStepDialogOpen(false);
      setEditingStep(null);
      resetStepForm();

      toast({
        title: "Step updated",
        description: "Step has been updated successfully.",
      });
    } catch (error) {
      console.error("Failed to update step:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update step.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    pushSnapshot(cloneSnapshot(currentSnapshot));
    setInlineEditingStepId(null);
    setIsSaving(true);
    try {
      await deleteStep(stepId);
      setSteps(steps.filter((s) => s.id !== stepId));
      setConnections(
        connections.filter((c) => c.source !== stepId && c.target !== stepId)
      );
      if (selectedStepId === stepId) setSelectedStepId(null);
      setSelectedStepIds((prev) => prev.filter((id) => id !== stepId));
      setIsEditStepDialogOpen(false);
      setEditingStep(null);

      toast({
        title: "Step deleted",
        description: "Step has been removed from the workflow.",
      });
    } catch (error) {
      console.error("Failed to delete step:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete step.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle bulk delete of multiple steps
  const handleDeleteSteps = async (stepIds: string[]) => {
    if (stepIds.length === 0) return;
    
    pushSnapshot(cloneSnapshot(currentSnapshot));
    setInlineEditingStepId(null);
    setIsSaving(true);
    
    try {
      // Delete all steps in parallel
      await Promise.all(stepIds.map((id) => deleteStep(id)));
      
      // Update local state
      setSteps((prev) => prev.filter((s) => !stepIds.includes(s.id)));
      setConnections((prev) =>
        prev.filter((c) => !stepIds.includes(c.source) && !stepIds.includes(c.target))
      );
      
      // Clear selection
      setSelectedStepId(null);
      setSelectedStepIds([]);
      setIsEditStepDialogOpen(false);
      setEditingStep(null);

      toast({
        title: `${stepIds.length} steps deleted`,
        description: "Steps have been removed from the workflow.",
      });
    } catch (error) {
      console.error("Failed to delete steps:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete some steps.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnect = async (sourceId: string, targetId: string) => {
    if (!workflow) return;

    // Check if connection already exists
    const exists = connections.some(
      (c) => c.source === sourceId && c.target === targetId
    );
    if (exists) return;

    pushSnapshot(cloneSnapshot(currentSnapshot));
    setInlineEditingStepId(null);
    try {
      const newConn = await createConnection(
        workflow.id,
        sourceId,
        targetId
      );
      setConnections([
        ...connections,
        { id: newConn.id, source: sourceId, target: targetId },
      ]);

      toast({
        title: "Connection added",
        description: "Steps are now connected.",
      });
    } catch (error) {
      console.error("Failed to create connection:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create connection.",
      });
    }
  };

  const handleDeleteConnection = async (sourceId: string, targetId: string) => {
    const key = `${sourceId}-${targetId}`;
    const connId = connectionIds[key];
    if (!connId) return;

    pushSnapshot(cloneSnapshot(currentSnapshot));
    setInlineEditingStepId(null);
    try {
      await deleteConnection(connId);
      setConnections(
        connections.filter(
          (c) => !(c.source === sourceId && c.target === targetId)
        )
      );

      toast({
        title: "Connection removed",
        description: "Connection has been deleted.",
      });
    } catch (error) {
      console.error("Failed to delete connection:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete connection.",
      });
    }
  };

  const handleDeleteWorkflow = async () => {
    if (!workflow) return;
    
    if (!confirm("Are you sure you want to delete this workflow? This cannot be undone.")) {
      return;
    }

    try {
      await deleteProcess(workflow.id);
      toast({
        title: "Workflow deleted",
        description: "The workflow has been permanently deleted.",
      });
      router.push("/workflows");
    } catch (error) {
      console.error("Failed to delete workflow:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete workflow.",
      });
    }
  };

  function sanitizeFilenamePart(value: string): string {
    return value
      .trim()
      .replace(/[^\w\-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80);
  }

  function downloadTextFile(filename: string, text: string, mimeType: string) {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function csvEscape(value: unknown): string {
    if (value === null || value === undefined) return "";
    const s = String(value);
    // Escape double-quotes and wrap values containing special chars
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  const handleExportJson = useCallback(() => {
    if (!workflow) return;

    try {
      const safeName = sanitizeFilenamePart(workflow.name || "workflow") || "workflow";
      const payload = {
        exportedAt: new Date().toISOString(),
        workflow,
        steps,
        connections,
      };
      downloadTextFile(
        `${safeName}.json`,
        JSON.stringify(payload, null, 2),
        "application/json;charset=utf-8"
      );
      toast({ title: "Export started", description: "Downloaded workflow JSON." });
    } catch (error) {
      console.error("Failed to export JSON:", error);
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Could not export workflow as JSON.",
      });
    }
  }, [workflow, steps, connections, toast]);

  const handleExportStepsCsv = useCallback(() => {
    if (!workflow) return;

    try {
      const safeName = sanitizeFilenamePart(workflow.name || "workflow") || "workflow";
      const header = [
        "id",
        "process_id",
        "step_name",
        "description",
        "lane",
        "step_type",
        "order_index",
        "lead_time_minutes",
        "cycle_time_minutes",
        "position_x",
        "position_y",
        "created_at",
        "updated_at",
      ];

      const rows = steps.map((s) =>
        [
          s.id,
          s.process_id,
          s.step_name,
          s.description ?? "",
          s.lane,
          s.step_type,
          s.order_index,
          s.lead_time_minutes ?? "",
          s.cycle_time_minutes ?? "",
          s.position_x ?? "",
          s.position_y ?? "",
          s.created_at,
          s.updated_at,
        ]
          .map(csvEscape)
          .join(",")
      );

      const csv = [header.join(","), ...rows].join("\n");
      downloadTextFile(`${safeName}_steps.csv`, csv, "text/csv;charset=utf-8");
      toast({ title: "Export started", description: "Downloaded steps CSV." });
    } catch (error) {
      console.error("Failed to export steps CSV:", error);
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Could not export workflow steps as CSV.",
      });
    }
  }, [workflow, steps, toast]);

  const handleExportConnectionsCsv = useCallback(() => {
    if (!workflow) return;

    try {
      const safeName = sanitizeFilenamePart(workflow.name || "workflow") || "workflow";
      const header = ["id", "source", "target"];
      const rows = connections.map((c) =>
        [c.id ?? "", c.source, c.target].map(csvEscape).join(",")
      );
      const csv = [header.join(","), ...rows].join("\n");
      downloadTextFile(`${safeName}_connections.csv`, csv, "text/csv;charset=utf-8");
      toast({ title: "Export started", description: "Downloaded connections CSV." });
    } catch (error) {
      console.error("Failed to export connections CSV:", error);
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Could not export workflow connections as CSV.",
      });
    }
  }, [workflow, connections, toast]);

  const handleExportPdf = useCallback(async () => {
    if (!workflow) return;

    try {
      toast({ title: "Preparing PDF…", description: "This can take a moment." });
      await exportWorkflowToPDF({
        workflow: { id: workflow.id, name: workflow.name },
        steps,
        connections,
        filename: `${sanitizeFilenamePart(workflow.name || "workflow") || "workflow"}.pdf`,
        chartElementId: "workflow-process-map-export",
        reactFlowInstance: reactFlowInstanceRef.current || undefined,
      });
      
      toast({ title: "PDF exported", description: "Your workflow PDF has been downloaded." });
    } catch (error) {
      console.error("Failed to export PDF:", error);
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error instanceof Error ? error.message : "Could not export workflow as PDF.",
      });
    }
  }, [workflow, steps, connections, toast]);

  const resetStepForm = () => {
    setStepForm({
      name: "",
      description: "",
      type: "action",
      lane: laneNames[0] || "Requester",
      lead_time_minutes: "",
      cycle_time_minutes: "",
    });
  };

  // Information Flow handlers
  const handleEdgeClickForNewFlow = useCallback((sourceStepId: string, targetStepId: string) => {
    // Check if flow already exists for this edge
    const existingFlow = informationFlows.find(
      (f) => f.source_step_id === sourceStepId && f.target_step_id === targetStepId
    );

    if (existingFlow) {
      // Open edit panel
      setSelectedFlowForEdit(existingFlow);
      setFlowPanelMode("edit");
    } else {
      // Open create panel
      setNewFlowEdge({ sourceStepId, targetStepId });
      setFlowPanelMode("create");
    }
  }, [informationFlows]);

  const handleSelectFlow = useCallback((flowId: string | null) => {
    if (!flowId) {
      setFlowPanelMode(null);
      setSelectedFlowForEdit(null);
      return;
    }
    const flow = informationFlows.find((f) => f.id === flowId);
    if (flow) {
      setSelectedFlowForEdit(flow);
      setFlowPanelMode("edit");
    }
  }, [informationFlows]);

  const handleCreateFlow = useCallback(async (input: CreateInformationFlowInput) => {
    try {
      const newFlow = await createFlow(input);
      // Refetch to get the full flow with relations
      const flows = await getFlowsByProcess(workflow?.id || "");
      setInformationFlows(flows);
      toast({
        title: "Flow created",
        description: `"${newFlow.name}" has been added.`,
      });
    } catch (error) {
      console.error("Failed to create flow:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create information flow.",
      });
      throw error;
    }
  }, [workflow?.id, toast]);

  const handleSaveFlow = useCallback(async (flowId: string, updates: UpdateInformationFlowInput) => {
    try {
      await updateFlow(flowId, updates);
      // Refetch to get updated flow with relations
      const flows = await getFlowsByProcess(workflow?.id || "");
      setInformationFlows(flows);
      toast({
        title: "Flow updated",
        description: "Information flow has been saved.",
      });
    } catch (error) {
      console.error("Failed to update flow:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update information flow.",
      });
      throw error;
    }
  }, [workflow?.id, toast]);

  const handleDeleteFlow = useCallback(async (flowId: string) => {
    try {
      await deleteFlow(flowId);
      setInformationFlows((prev) => prev.filter((f) => f.id !== flowId));
      toast({
        title: "Flow deleted",
        description: "Information flow has been removed.",
      });
    } catch (error) {
      console.error("Failed to delete flow:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete information flow.",
      });
      throw error;
    }
  }, [toast]);

  const handleCloseFlowPanel = useCallback(() => {
    setFlowPanelMode(null);
    setSelectedFlowForEdit(null);
    setNewFlowEdge(null);
  }, []);

  // Get step names for the flow panel
  const getStepName = useCallback((stepId: string | null | undefined) => {
    if (!stepId) return undefined;
    const step = steps.find((s) => s.id === stepId);
    return step?.step_name;
  }, [steps]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground mb-4">Workflow not found</p>
        <Button asChild>
          <Link href="/workflows">Back to Workflows</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title={workflow.name}
        description={workflow.description || "No description"}
        onTitleEdit={handleRenameWorkflow}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/workflows">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>

            {isEditMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleUndo()}
                  disabled={!canUndo || isSaving}
                  title="Undo (Cmd/Ctrl+Z)"
                >
                  <Undo2 className="mr-2 h-4 w-4" />
                  Undo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRedo()}
                  disabled={!canRedo || isSaving}
                  title="Redo (Cmd/Ctrl+Shift+Z)"
                >
                  <Redo2 className="mr-2 h-4 w-4" />
                  Redo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSwimlaneManagerOpen(true)}
                >
                  Manage Swimlanes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddStepDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Step
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsEditMode(false)}
                  className="bg-brand-emerald hover:bg-brand-emerald/90"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Done Editing
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditMode(true)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                {/* Copy as new workflow (AC-1.2) */}
                {canCopy && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCopyDialogOpen(true)}
                    className="bg-white"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy as New
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPdf}
                  className="bg-white"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                <Button
                  asChild
                  className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                >
                  <Link href={`/sessions/new?workflow=${params.id}`}>
                    <Play className="mr-2 h-4 w-4" />
                    Start Waste Walk
                  </Link>
                </Button>
              </>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditMode(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Workflow
                </DropdownMenuItem>
                {canCopy && (
                  <DropdownMenuItem onClick={() => setIsCopyDialogOpen(true)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy workflow
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onSelect={handleExportJson}>
                      Download JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleExportPdf}>
                      Download PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleExportStepsCsv}>
                      Download Steps CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleExportConnectionsCsv}>
                      Download Connections CSV
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={handleDeleteWorkflow}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Workflow
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Stats Bar */}
      <div className="px-6 py-3 border-b bg-muted/30 flex items-center gap-4 flex-wrap">
        {isEditMode && (
          <Badge className="bg-orange-100 text-orange-700 border-orange-300">
            <Edit className="mr-1 h-3 w-3" />
            Edit Mode
          </Badge>
        )}
        {/* Lineage indicator (AC-4.2) */}
        {sourceWorkflowName && (
          <Badge variant="outline" className="bg-blue-50 border-blue-300 text-blue-700">
            <Copy className="mr-1 h-3 w-3" />
            Copied from: {sourceWorkflowName}
          </Badge>
        )}
        <Badge variant="secondary">{steps.length} Steps</Badge>
        <Badge variant="secondary">{lanes.length} Swimlanes</Badge>
        {Object.keys(observations).length > 0 && (
          <>
            <Badge
              variant="outline"
              className="border-orange-300 text-orange-700 bg-orange-50"
            >
              {Object.values(observations).reduce((sum, o) => sum + o.count, 0)}{" "}
              Observations
        </Badge>
            <Badge
              variant="outline"
              className="border-red-300 text-red-700 bg-red-50"
            >
              Total Priority:{" "}
              {Object.values(observations).reduce(
                (sum, o) => sum + o.priorityScore,
                0
              )}
        </Badge>
          </>
        )}
        {isEditMode && (
          <>
            {selectedStepIds.length > 1 && (
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                {selectedStepIds.length} steps selected
              </Badge>
            )}
            <p className="text-sm text-muted-foreground ml-auto">
              Double-click canvas to add. Shift+click or drag to multi-select. Press Del to delete.
            </p>
          </>
        )}
      </div>

      {/* Process Map */}
      <div className="flex-1" id="workflow-process-map-export">
        <div className="h-full relative">
          {isEditMode && (
            <div className="absolute left-4 bottom-4 z-20">
              <StepToolbox />
            </div>
          )}
          <ProcessMap
            workflowId={params.id as string}
            lanes={laneNames}
            laneStyles={laneStyles}
            steps={steps}
            connections={connections}
            observations={observations}
            selectedStepId={selectedStepId}
            selectedStepIds={selectedStepIds}
            onSelectStep={handleSelectStep}
            onSelectSteps={handleSelectSteps}
            onStepClick={handleStepClick}
            onQuickAddStep={handleQuickAddStep}
            onCreateStepFromToolbox={handleCreateStepFromToolbox}
            inlineEditingStepId={inlineEditingStepId}
            onStartInlineEditStep={handleStartInlineEditStep}
            onInlineEditStep={handleInlineEditStep}
            onCancelInlineEditStep={handleCancelInlineEditStep}
            showHeatmap={showHeatmap}
            onToggleHeatmap={setShowHeatmap}
            isEditMode={isEditMode}
            onDeleteStep={(stepId) => void handleDeleteStep(stepId)}
            onDeleteSteps={(stepIds) => void handleDeleteSteps(stepIds)}
            onConnect={handleConnect}
            onDeleteConnection={handleDeleteConnection}
            onReactFlowInit={(instance) => {
              reactFlowInstanceRef.current = instance;
            }}
            onPositionsChange={handlePositionsChange}
            // Information Flow props
            informationFlows={informationFlows}
            onSelectFlow={handleSelectFlow}
            onEdgeClickForNewFlow={handleEdgeClickForNewFlow}
          />

          {steps.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="max-w-md rounded-xl border bg-background/90 backdrop-blur px-5 py-4 text-center shadow-sm pointer-events-auto">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-brand-gold/15 flex items-center justify-center">
                    <Edit className="h-5 w-5 text-brand-gold" />
                  </div>
                </div>
                <h3 className="text-base font-medium mb-1">Start building your workflow</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter edit mode, then double-click the canvas (or press <span className="font-medium">N</span>) to add your first step.
                </p>
                {!isEditMode ? (
                  <Button
                    size="sm"
                    className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                    onClick={() => setIsEditMode(true)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Enter Edit Mode
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddStepDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Step via Form
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <SwimlaneManager
        open={isSwimlaneManagerOpen}
        onOpenChange={setIsSwimlaneManagerOpen}
        lanes={lanes}
        steps={steps}
        isSaving={isSaving}
        onAddLane={async (name) => {
          if (!workflow) return;
          setIsSaving(true);
          try {
            const created = await createLane(workflow.id, name);
            const refreshed = await getProcessLanes(workflow.id);
            setLanes(refreshed);
            setStepForm((prev) => ({ ...prev, lane: created.name }));
          } finally {
            setIsSaving(false);
          }
        }}
        onReorder={handleReorderLanes}
        onRename={handleRenameLane}
        onDelete={handleDeleteLane}
        onDeleteMoveSteps={handleDeleteLaneMoveSteps}
        onUpdateLaneColor={handleUpdateLaneColor}
      />

      {/* Step Detail Panel (View Mode) */}
      {!isEditMode && (
      <StepDetailPanel
        step={selectedStep}
        observations={[]}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        onStartTagging={() => {
            router.push(
              `/sessions/new?workflow=${params.id}&step=${selectedStepId}`
            );
        }}
        sessionActive={false}
        informationFlows={informationFlows}
        showIOPanel={true}
        processId={params.id as string}
      />
      )}

      {/* Add Step Dialog */}
      <Dialog open={isAddStepDialogOpen} onOpenChange={setIsAddStepDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Step</DialogTitle>
            <DialogDescription>
              Create a new step in your workflow
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Step Name *</Label>
              <Input
                placeholder="e.g., Submit Request"
                value={stepForm.name}
                onChange={(e) =>
                  setStepForm({ ...stepForm, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what happens in this step..."
                value={stepForm.description}
                onChange={(e) =>
                  setStepForm({ ...stepForm, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={stepForm.type}
                  onValueChange={(value: StepType) =>
                    setStepForm({ ...stepForm, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start">Start</SelectItem>
                    <SelectItem value="action">Action</SelectItem>
                    <SelectItem value="decision">Decision</SelectItem>
                    <SelectItem value="subprocess">Subprocess</SelectItem>
                    <SelectItem value="end">End</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Swimlane</Label>
                {isAddingNewLane ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter new swimlane name..."
                      value={newLaneName}
                      onChange={(e) => setNewLaneName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddNewLane();
                        } else if (e.key === "Escape") {
                          setIsAddingNewLane(false);
                          setNewLaneName("");
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddNewLane}
                      disabled={!newLaneName.trim()}
                      className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                    >
                      Add
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsAddingNewLane(false);
                        setNewLaneName("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={stepForm.lane}
                    onValueChange={(value) => {
                      if (value === "__add_new__") {
                        setIsAddingNewLane(true);
                      } else {
                        setStepForm({ ...stepForm, lane: value });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {laneNames.map((lane) => (
                        <SelectItem key={lane} value={lane}>
                          {lane}
                        </SelectItem>
                      ))}
                      <SelectItem value="__add_new__" className="text-brand-gold font-medium">
                        <span className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add new swimlane...
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lead Time (min)</Label>
                <Input
                  inputMode="numeric"
                  placeholder="e.g., 60"
                  value={stepForm.lead_time_minutes}
                  onChange={(e) =>
                    setStepForm({ ...stepForm, lead_time_minutes: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Cycle Time (min)</Label>
                <Input
                  inputMode="numeric"
                  placeholder="e.g., 15"
                  value={stepForm.cycle_time_minutes}
                  onChange={(e) =>
                    setStepForm({ ...stepForm, cycle_time_minutes: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddStepDialogOpen(false);
                setIsAddingNewLane(false);
                setNewLaneName("");
                resetStepForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddStep}
              disabled={isSaving || !stepForm.name.trim() || isAddingNewLane}
              className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Step"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Step Dialog */}
      <Dialog open={isEditStepDialogOpen} onOpenChange={setIsEditStepDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Step</DialogTitle>
            <DialogDescription>
              Update step details or delete this step
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Step Name *</Label>
              <Input
                placeholder="e.g., Submit Request"
                value={stepForm.name}
                onChange={(e) =>
                  setStepForm({ ...stepForm, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what happens in this step..."
                value={stepForm.description}
                onChange={(e) =>
                  setStepForm({ ...stepForm, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={stepForm.type}
                  onValueChange={(value: StepType) =>
                    setStepForm({ ...stepForm, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start">Start</SelectItem>
                    <SelectItem value="action">Action</SelectItem>
                    <SelectItem value="decision">Decision</SelectItem>
                    <SelectItem value="subprocess">Subprocess</SelectItem>
                    <SelectItem value="end">End</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Swimlane</Label>
                {isAddingNewLane ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter new swimlane name..."
                      value={newLaneName}
                      onChange={(e) => setNewLaneName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddNewLane();
                        } else if (e.key === "Escape") {
                          setIsAddingNewLane(false);
                          setNewLaneName("");
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddNewLane}
                      disabled={!newLaneName.trim()}
                      className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                    >
                      Add
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsAddingNewLane(false);
                        setNewLaneName("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={stepForm.lane}
                    onValueChange={(value) => {
                      if (value === "__add_new__") {
                        setIsAddingNewLane(true);
                      } else {
                        setStepForm({ ...stepForm, lane: value });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {laneNames.map((lane) => (
                        <SelectItem key={lane} value={lane}>
                          {lane}
                        </SelectItem>
                      ))}
                      <SelectItem value="__add_new__" className="text-brand-gold font-medium">
                        <span className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add new swimlane...
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lead Time (min)</Label>
                <Input
                  inputMode="numeric"
                  placeholder="e.g., 60"
                  value={stepForm.lead_time_minutes}
                  onChange={(e) =>
                    setStepForm({ ...stepForm, lead_time_minutes: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Cycle Time (min)</Label>
                <Input
                  inputMode="numeric"
                  placeholder="e.g., 15"
                  value={stepForm.cycle_time_minutes}
                  onChange={(e) =>
                    setStepForm({ ...stepForm, cycle_time_minutes: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              variant="destructive"
              onClick={() => editingStep && handleDeleteStep(editingStep.id)}
              disabled={isSaving}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Step
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditStepDialogOpen(false);
                  setEditingStep(null);
                  setIsAddingNewLane(false);
                  setNewLaneName("");
                  resetStepForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateStep}
                disabled={isSaving || !stepForm.name.trim() || isAddingNewLane}
                className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Context Drawer Trigger Button */}
      <div
        className="fixed z-40 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-[calc(1rem+env(safe-area-inset-left))] md:left-[calc(17rem+1.5rem)]"
      >
        <ContextTriggerButton
          completeness={contextCompleteness}
          onClick={() => setIsContextDrawerOpen(true)}
        />
      </div>

      {/* Workflow Context Drawer */}
      <WorkflowContextDrawer
        open={isContextDrawerOpen}
        onOpenChange={(open) => {
          setIsContextDrawerOpen(open);
          // Refresh completeness when drawer closes
          if (!open) {
            fetch(`/api/workflows/${params.id}/context`)
              .then((res) => res.json())
              .then((data) => {
                setContextCompleteness(data.completeness?.overallScore || 0);
              })
              .catch(console.error);
          }
        }}
        processId={params.id as string}
        workflowName={workflow?.name || "Workflow"}
      />

      {/* Copy Workflow Dialog (AC-1.2) */}
      {workflow && (
        <CopyWorkflowDialog
          open={isCopyDialogOpen}
          onOpenChange={setIsCopyDialogOpen}
          workflow={workflow}
        />
      )}

      {/* Flow Detail Panel - for creating and editing information flows */}
      {flowPanelMode && (
        <FlowDetailPanel
          mode={flowPanelMode}
          flow={selectedFlowForEdit}
          sourceStepId={flowPanelMode === "create" ? newFlowEdge?.sourceStepId : selectedFlowForEdit?.source_step_id || undefined}
          targetStepId={flowPanelMode === "create" ? newFlowEdge?.targetStepId : selectedFlowForEdit?.target_step_id || undefined}
          processId={workflow?.id}
          isOpen={flowPanelMode !== null}
          onClose={handleCloseFlowPanel}
          onCreate={handleCreateFlow}
          onSave={handleSaveFlow}
          onDelete={handleDeleteFlow}
          wasteTypes={wasteTypes}
          observations={[]}
          sourceStepName={getStepName(flowPanelMode === "create" ? newFlowEdge?.sourceStepId : selectedFlowForEdit?.source_step_id)}
          targetStepName={getStepName(flowPanelMode === "create" ? newFlowEdge?.targetStepId : selectedFlowForEdit?.target_step_id)}
        />
      )}
    </div>
  );
}
