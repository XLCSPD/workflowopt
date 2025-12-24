"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
  Handle,
  Position,
} from "reactflow";
import Dagre from "@dagrejs/dagre";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Tooltips removed to fix infinite loop issue with Radix compose-refs
// Using native title attribute instead
import {
  Eye,
  Layers,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  LayoutGrid,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lightbulb,
  Pencil,
  Trash2,
  Copy,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  FutureStateNode,
  FutureStateEdge,
  ProcessStep,
  WasteType,
  ObservationWithWasteTypes,
  StepDesignStatus,
  SolutionCard,
  NodeAction,
} from "@/types";
import "reactflow/dist/style.css";
import { STEP_TOOLBOX_MIME, ANNOTATION_TOOLBOX_MIME } from "./FutureStateToolbox";

// ============================================
// TYPES
// ============================================

interface HorizontalFlowViewProps {
  futureStateNodes: FutureStateNode[];
  futureStateEdges: FutureStateEdge[];
  currentSteps: ProcessStep[];
  stepConnections: Array<{ source: string; target: string }>;
  observations: ObservationWithWasteTypes[];
  onNodeClick: (nodeId: string) => void;
  highlightedNodeId?: string | null;
  getLinkedSolution?: (solutionId: string | null | undefined) => SolutionCard | null | undefined;
  // Edit mode props
  isEditMode?: boolean;
  selectedNodeIds?: string[];
  onNodeSelect?: (nodeId: string, addToSelection?: boolean) => void;
  onNodePositionChange?: (nodeId: string, position: { x: number; y: number }) => void;
  onCreateNode?: (lane: string, position: { x: number; y: number }, stepType?: string) => void;
  onUpdateNode?: (nodeId: string, updates: { name?: string; action?: NodeAction }) => void;
  onDeleteNode?: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  onCreateEdge?: (sourceId: string, targetId: string) => void;
  onDeleteEdge?: (edgeId: string) => void;
}

interface FlowStepData {
  label: string;
  lane: string;
  action: "keep" | "modify" | "remove" | "new";
  wasteTypes: WasteType[];
  observationCount: number;
  priorityScore: number;
  designStatus?: StepDesignStatus;
  isFutureState: boolean;
  sourceStepId?: string;
  description?: string;
  leadTime?: number;
  cycleTime?: number;
  linkedSolutionName?: string;
}

// Priority color helper (matching MiniProcessMap)
const getPriorityColor = (priority: number) => {
  if (priority >= 100) return { bg: "bg-red-100", border: "border-red-400", text: "text-red-700" };
  if (priority >= 50) return { bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-700" };
  if (priority >= 20) return { bg: "bg-amber-100", border: "border-amber-400", text: "text-amber-700" };
  if (priority > 0) return { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700" };
  return { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-600" };
};

// ============================================
// CONSTANTS
// ============================================

const LANE_HEIGHT = 140;
const NODE_WIDTH = 220;
const NODE_HEIGHT = 110;
const NODE_GAP_X = 60;
const LANE_GAP = 10;

// Swimlane background colors matching the mockup
const SWIMLANE_COLORS = [
  { bg: "bg-blue-50", border: "border-blue-200", accent: "bg-blue-400" },
  { bg: "bg-emerald-50", border: "border-emerald-200", accent: "bg-emerald-400" },
  { bg: "bg-amber-50", border: "border-amber-200", accent: "bg-amber-400" },
  { bg: "bg-purple-50", border: "border-purple-200", accent: "bg-purple-400" },
  { bg: "bg-rose-50", border: "border-rose-200", accent: "bg-rose-400" },
];

const actionColors = {
  keep: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-700",
    badge: "bg-slate-100 text-slate-600",
    leftBorder: "bg-slate-300",
  },
  modify: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-800",
    badge: "bg-amber-100 text-amber-700",
    leftBorder: "bg-amber-400",
  },
  remove: {
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-700 line-through opacity-60",
    badge: "bg-red-100 text-red-600",
    leftBorder: "bg-red-400",
  },
  new: {
    bg: "bg-emerald-50",
    border: "border-emerald-400",
    text: "text-emerald-800",
    badge: "bg-emerald-100 text-emerald-700",
    leftBorder: "bg-emerald-400",
  },
};

// Reserved for future use: design status indicators on nodes
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const designStatusConfig: Record<StepDesignStatus, { icon: typeof CheckCircle2; color: string }> = {
  strategy_only: { icon: Layers, color: "text-gray-400" },
  needs_step_design: { icon: AlertCircle, color: "text-amber-500" },
  step_design_complete: { icon: CheckCircle2, color: "text-emerald-500" },
};

// ============================================
// AUTO-LAYOUT FUNCTION (using Dagre)
// ============================================

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  laneList: string[]
): { nodes: Node[]; edges: Edge[] } {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ 
    rankdir: "LR",      // Left to Right flow
    nodesep: 50,        // Horizontal spacing between nodes in same rank
    ranksep: 80,        // Spacing between ranks (columns)
    marginx: 40,
    marginy: 30,
  });

  // Only add step nodes (not swimlane labels) to the graph
  const stepNodes = nodes.filter(n => n.type === "flowStep");
  
  stepNodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  // Run Dagre layout algorithm
  Dagre.layout(g);

  // Create lane Y position map
  const laneYPositions = new Map<string, number>();
  laneList.forEach((lane, index) => {
    laneYPositions.set(lane, index * (LANE_HEIGHT + LANE_GAP));
  });

  // Apply layout: use Dagre X positions, but fix Y to swimlane
  const layoutedNodes = nodes.map((node) => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) return node;
    
    const lane = node.data.lane;
    const laneY = laneYPositions.get(lane) ?? 0;
    
    return {
      ...node,
      position: {
        x: dagreNode.x - NODE_WIDTH / 2 + 20, // Offset from left edge
        y: laneY + (LANE_HEIGHT - NODE_HEIGHT) / 2, // Center vertically in lane
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// ============================================
// CUSTOM NODE COMPONENT
// ============================================

function FlowStepNode({ data, selected }: { data: FlowStepData; selected: boolean }) {
  const priorityColors = getPriorityColor(data.priorityScore);
  const actionColorSet = actionColors[data.action];
  
  // Use priority heat colors for background
  const hasPriority = data.priorityScore > 0;
  const borderColor = hasPriority ? priorityColors.border : "border-slate-200";
  const bgColor = hasPriority ? priorityColors.bg : "bg-white";
  
  // Show action indicator for future state nodes
  const showActionIndicator = data.isFutureState;
  const isRemoved = data.action === "remove";

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 shadow-md cursor-pointer transition-all hover:shadow-lg overflow-hidden",
        bgColor,
        borderColor,
        selected && "ring-2 ring-brand-gold ring-offset-2",
        isRemoved && "opacity-60"
      )}
      style={{ width: NODE_WIDTH, minHeight: NODE_HEIGHT }}
    >
      {/* Left Border Action Indicator */}
      {showActionIndicator && (
        <div 
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1.5 z-10",
            actionColorSet.leftBorder
          )}
        />
      )}

      {/* Connection Handles */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-2 !h-2 !bg-slate-400 !border-slate-500"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-2 !h-2 !bg-slate-400 !border-slate-500"
      />

      {/* Observation Count Badge - Top Right */}
      {data.observationCount > 0 && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 gap-1 shadow-sm">
            <AlertTriangle className="h-3 w-3" />
            {data.observationCount}
          </Badge>
        </div>
      )}

      <div className={cn("p-3 flex flex-col h-full", showActionIndicator && "pl-4")}>
        {/* Step Name */}
        <p className={cn(
          "font-semibold text-sm text-slate-800 leading-tight",
          isRemoved && "line-through"
        )}>
          {data.label}
        </p>

        {/* Linked Solution - Only for modified/new steps */}
        {data.linkedSolutionName && data.action !== "keep" && (
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-amber-700 bg-amber-50/80 rounded px-1.5 py-0.5">
            <Lightbulb className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{data.linkedSolutionName}</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom Section: Priority + Action */}
        <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200/50 gap-2">
          {/* Priority Score */}
          {hasPriority ? (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Priority</span>
              <span className={cn("font-bold text-sm", priorityColors.text)}>
                {data.priorityScore}
              </span>
            </div>
          ) : (
            <div />
          )}
          
          {/* Action Badge */}
          {showActionIndicator && (
            <Badge className={cn("text-[10px] capitalize px-1.5 py-0", actionColorSet.badge)}>
              {data.action}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// Node types for React Flow
const nodeTypes = {
  flowStep: FlowStepNode,
};

// ============================================
// MAIN COMPONENT
// ============================================

function HorizontalFlowViewInner({
  futureStateNodes,
  futureStateEdges,
  currentSteps,
  stepConnections,
  observations,
  onNodeClick,
  highlightedNodeId,
  getLinkedSolution,
  // Edit mode props
  isEditMode = false,
  selectedNodeIds = [],
  onNodeSelect,
  onNodePositionChange,
  onCreateNode,
  onUpdateNode,
  onDeleteNode,
  onDuplicateNode,
  onCreateEdge,
  onDeleteEdge,
}: HorizontalFlowViewProps) {
  console.log("[HorizontalFlowView] Rendering, futureStateNodes:", futureStateNodes.length);
  const [viewState, setViewState] = useState<"current" | "future">("future");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Context menu state for node operations
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    nodeName: string;
    x: number;
    y: number;
  } | null>(null);
  
  // Editing state for inline rename
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Track if we've initialized the nodes to prevent infinite loops
  const prevDataSignatureRef = useRef<string>("");
  // Track if we've done initial layout - only do it once per session
  const hasInitialLayoutRef = useRef<boolean>(false);
  
  // Store callback refs to avoid triggering useEffect when callbacks change
  const callbacksRef = useRef({
    getStepWasteTypes: (stepId: string): WasteType[] => [],
    getStepPriorityScore: (stepId: string): number => 0,
    getLinkedSolution: (solutionId: string | null | undefined) => null as SolutionCard | null | undefined,
    fitView: (options?: { padding?: number; duration?: number }) => {},
  });

  // Calculate lanes from source data (memoized to avoid state update loops)
  const laneList = useMemo(() => {
    const laneSet = new Set<string>();
    if (viewState === "future") {
      futureStateNodes.forEach((n) => laneSet.add(n.lane));
    } else {
      currentSteps.forEach((s) => laneSet.add(s.lane));
    }
    return Array.from(laneSet);
  }, [viewState, futureStateNodes, currentSteps]);

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

  // Get priority score for a step (sum of all observation priority scores)
  const getStepPriorityScore = useCallback((stepId: string): number => {
    const stepObs = observationsByStep.get(stepId) || [];
    return stepObs.reduce((sum, obs) => sum + (obs.priority_score || 0), 0);
  }, [observationsByStep]);

  const { fitView, zoomIn, zoomOut, screenToFlowPosition } = useReactFlow();
  
  // Update callback refs (this doesn't trigger re-renders)
  callbacksRef.current.getStepWasteTypes = getStepWasteTypes;
  callbacksRef.current.getStepPriorityScore = getStepPriorityScore;
  callbacksRef.current.getLinkedSolution = getLinkedSolution || (() => null);
  callbacksRef.current.fitView = fitView;
  const viewport = useViewport();
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle drag over for toolbox drops
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  // Handle drop from toolbox
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    
    if (!isEditMode || !onCreateNode) return;
    
    // Check if it's a step type drop
    const stepType = event.dataTransfer.getData(STEP_TOOLBOX_MIME);
    if (stepType) {
      // Get the position where the element was dropped
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      // Determine which lane based on Y position
      const laneIndex = Math.floor(position.y / (LANE_HEIGHT + LANE_GAP));
      const lane = laneList[laneIndex] || laneList[0] || "Default";
      
      onCreateNode(lane, position, stepType);
      return;
    }
    
    // Check if it's an annotation type drop
    const annotationType = event.dataTransfer.getData(ANNOTATION_TOOLBOX_MIME);
    if (annotationType) {
      // TODO: Handle annotation drops when annotation creation is implemented
      console.log("Annotation drop:", annotationType, screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      }));
    }
  }, [isEditMode, onCreateNode, screenToFlowPosition, laneList]);

  // Calculate scaled lane height based on viewport zoom
  const scaledLaneHeight = LANE_HEIGHT * viewport.zoom;

  // Build nodes and edges based on view state
  useEffect(() => {
    // Create a signature of the current data to detect actual changes
    const dataSignature = JSON.stringify({
      viewState,
      futureNodeIds: futureStateNodes.map(n => `${n.id}:${n.name}:${n.action}`),
      futureEdgeIds: futureStateEdges.map(e => e.id),
      currentStepIds: currentSteps.map(s => s.id),
      connectionCount: stepConnections.length,
      highlightedNodeId,
    });

    // Skip if data hasn't actually changed (prevents infinite loops from callback reference changes)
    if (prevDataSignatureRef.current === dataSignature) {
      console.log("[HorizontalFlowView] Skipping update - data unchanged");
      return;
    }
    console.log("[HorizontalFlowView] Data changed - rebuilding nodes. Nodes:", futureStateNodes.length, "Edges:", futureStateEdges.length);
    prevDataSignatureRef.current = dataSignature;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const flowNodes: Node<any>[] = [];
    let flowEdges: Edge[] = [];

    // Create lane Y positions using the memoized laneList
    const laneYPositions = new Map<string, number>();
    laneList.forEach((lane, index) => {
      const laneY = index * (LANE_HEIGHT + LANE_GAP);
      laneYPositions.set(lane, laneY);
    });

    if (viewState === "future") {
      // Group nodes by lane and sort by position_x
      const nodesByLane = new Map<string, typeof futureStateNodes>();
      futureStateNodes.forEach((node) => {
        if (!nodesByLane.has(node.lane)) {
          nodesByLane.set(node.lane, []);
        }
        nodesByLane.get(node.lane)!.push(node);
      });
      nodesByLane.forEach((nodes) => nodes.sort((a, b) => a.position_x - b.position_x));

      // Create step nodes with proper lane-aligned positions
      futureStateNodes.forEach((node) => {
        const laneNodes = nodesByLane.get(node.lane) || [];
        const indexInLane = laneNodes.findIndex((n) => n.id === node.id);
        const laneY = laneYPositions.get(node.lane) || 0;
        
        // Get linked solution name (using ref to avoid dependency issues)
        const linkedSolution = callbacksRef.current.getLinkedSolution(node.linked_solution_id);
        const linkedSolutionName = linkedSolution?.title;

        // Use stored position if available and valid, otherwise calculate default
        const hasStoredPosition = node.position_x != null && node.position_x !== 0;
        const defaultX = 20 + indexInLane * (NODE_WIDTH + NODE_GAP_X);
        
        flowNodes.push({
          id: node.id,
          type: "flowStep",
          position: { 
            x: hasStoredPosition ? node.position_x : defaultX,
            y: laneY, // Y is always lane-based for swimlane alignment
          },
          data: {
            label: node.name,
            lane: node.lane,
            action: node.action as "keep" | "modify" | "remove" | "new",
            wasteTypes: node.source_step_id ? callbacksRef.current.getStepWasteTypes(node.source_step_id) : [],
            observationCount: node.source_step_id 
              ? (observationsByStep.get(node.source_step_id)?.length || 0) 
              : 0,
            priorityScore: node.source_step_id ? callbacksRef.current.getStepPriorityScore(node.source_step_id) : 0,
            designStatus: node.step_design_status,
            isFutureState: true,
            sourceStepId: node.source_step_id,
            description: node.description,
            leadTime: node.lead_time_minutes,
            cycleTime: node.cycle_time_minutes,
            linkedSolutionName,
          },
          selected: node.id === highlightedNodeId || selectedNodeIds.includes(node.id),
        });
      });

      // Create edges with proper styling
      flowEdges = futureStateEdges.map((edge) => ({
        id: edge.id,
        source: edge.source_node_id,
        target: edge.target_node_id,
        type: "smoothstep",
        animated: false,
        style: { stroke: "#64748b", strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#64748b",
          width: 16,
          height: 16,
        },
      }));
    } else {
      // Current State View - group by lane and sort
      const stepsByLane = new Map<string, typeof currentSteps>();
      currentSteps.forEach((step) => {
        if (!stepsByLane.has(step.lane)) {
          stepsByLane.set(step.lane, []);
        }
        stepsByLane.get(step.lane)!.push(step);
      });
      stepsByLane.forEach((steps) => steps.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));

      currentSteps.forEach((step) => {
        const laneSteps = stepsByLane.get(step.lane) || [];
        const indexInLane = laneSteps.findIndex((s) => s.id === step.id);
        const laneY = laneYPositions.get(step.lane) || 0;

        flowNodes.push({
          id: step.id,
          type: "flowStep",
          position: { 
            x: 20 + indexInLane * (NODE_WIDTH + NODE_GAP_X),
            y: laneY,
          },
          data: {
            label: step.step_name,
            lane: step.lane,
            action: "keep" as const,
            wasteTypes: callbacksRef.current.getStepWasteTypes(step.id),
            observationCount: observationsByStep.get(step.id)?.length || 0,
            priorityScore: callbacksRef.current.getStepPriorityScore(step.id),
            isFutureState: false,
            description: step.description || undefined,
          },
        });
      });

      // Create edges with proper styling
      flowEdges = stepConnections.map((conn, idx) => ({
        id: `conn-${idx}`,
        source: conn.source,
        target: conn.target,
        type: "smoothstep",
        animated: false,
        style: { stroke: "#64748b", strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#64748b",
          width: 16,
          height: 16,
        },
      }));
    }

    // Check if this is the first time loading and nodes need initial layout
    // Only apply Dagre layout once - on first load when nodes don't have positions
    if (!hasInitialLayoutRef.current) {
      // Check if most nodes have no stored position
      const nodesWithoutPosition = flowNodes.filter(n => {
        const data = n.data as FlowStepData;
        if (data.isFutureState) {
          const fsNode = futureStateNodes.find(fn => fn.id === n.id);
          return !fsNode?.position_x || fsNode.position_x === 0;
        }
        return false;
      });
      
      const needsInitialLayout = nodesWithoutPosition.length > flowNodes.length / 2;
      
      if (needsInitialLayout && flowNodes.length > 0) {
        // Apply Dagre layout for initial positioning
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          flowNodes,
          flowEdges,
          laneList
        );
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        hasInitialLayoutRef.current = true;
        
        // Fit view after initial layout
        setTimeout(() => {
          callbacksRef.current.fitView({ padding: 0.15, duration: 300 });
        }, 100);
        return;
      }
      
      // Mark as initialized even if we didn't need layout
      hasInitialLayoutRef.current = true;
    }
    
    // After initial layout, always preserve stored positions
    setNodes(flowNodes);
    setEdges(flowEdges);
  // Note: We use callbacksRef for getStepWasteTypes, getStepPriorityScore, getLinkedSolution
  // to avoid infinite loops caused by callback reference changes.
  // The data signature check prevents unnecessary updates when data hasn't changed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewState,
    futureStateNodes,
    futureStateEdges,
    currentSteps,
    stepConnections,
    observationsByStep,
    highlightedNodeId,
    laneList,
    setNodes,
    setEdges,
  ]);

  // Handle node context menu (right-click)
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (!isEditMode) return;
      event.preventDefault();
      const data = node.data as FlowStepData;
      setContextMenu({
        nodeId: node.id,
        nodeName: data.label,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [isEditMode]
  );

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Handle rename from context menu
  const handleStartRename = useCallback(() => {
    if (contextMenu) {
      setEditingNodeId(contextMenu.nodeId);
      setEditingName(contextMenu.nodeName);
      closeContextMenu();
    }
  }, [contextMenu, closeContextMenu]);

  // Handle save rename
  const handleSaveRename = useCallback(() => {
    if (editingNodeId && editingName.trim() && onUpdateNode) {
      onUpdateNode(editingNodeId, { name: editingName.trim() });
    }
    setEditingNodeId(null);
    setEditingName("");
  }, [editingNodeId, editingName, onUpdateNode]);

  // Handle cancel rename
  const handleCancelRename = useCallback(() => {
    setEditingNodeId(null);
    setEditingName("");
  }, []);

  // Handle delete from context menu
  const handleContextDelete = useCallback(() => {
    if (contextMenu && onDeleteNode) {
      if (window.confirm(`Delete step "${contextMenu.nodeName}"?`)) {
        onDeleteNode(contextMenu.nodeId);
      }
    }
    closeContextMenu();
  }, [contextMenu, onDeleteNode, closeContextMenu]);

  // Handle duplicate from context menu
  const handleContextDuplicate = useCallback(() => {
    if (contextMenu && onDuplicateNode) {
      onDuplicateNode(contextMenu.nodeId);
    }
    closeContextMenu();
  }, [contextMenu, onDuplicateNode, closeContextMenu]);

  // Keyboard event handler for Delete key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isEditMode) return;
      
      // Don't handle if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (event.key === "Delete" || event.key === "Backspace") {
        // Get selected nodes from React Flow state
        const selectedNodes = nodes.filter(n => n.selected);
        if (selectedNodes.length > 0 && onDeleteNode) {
          event.preventDefault();
          const nodeNames = selectedNodes.map(n => (n.data as FlowStepData).label).join(", ");
          if (window.confirm(`Delete ${selectedNodes.length} step(s): ${nodeNames}?`)) {
            selectedNodes.forEach(n => onDeleteNode(n.id));
          }
        }
      }
      
      if (event.key === "Escape") {
        closeContextMenu();
        handleCancelRename();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditMode, nodes, onDeleteNode, closeContextMenu, handleCancelRename]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        closeContextMenu();
      }
    };
    
    if (contextMenu) {
      // Use setTimeout to avoid closing immediately on the same click
      setTimeout(() => {
        window.addEventListener("click", handleClickOutside);
      }, 0);
      return () => window.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenu, closeContextMenu]);

  // Auto-layout handler for manual triggering
  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) return;
    
    const laneList = Array.from(new Set(
      nodes
        .filter(n => n.type === "flowStep")
        .map(n => n.data.lane as string)
    ));
    
    const { nodes: layoutedNodes } = getLayoutedElements(nodes, edges, laneList);
    setNodes(layoutedNodes);
    
    setTimeout(() => {
      fitView({ padding: 0.15, duration: 300 });
    }, 50);
  }, [nodes, edges, setNodes, fitView]);

  // Handle node click - only allow clicks on future state nodes
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const data = node.data as FlowStepData;
      // Only allow clicking on future state nodes for step design
      if (data.isFutureState) {
        onNodeClick(node.id);
      }
      // Current state nodes are view-only in the flowchart
    },
    [onNodeClick]
  );

  // Stats for the view
  const stats = useMemo(() => {
    if (viewState === "future") {
      return {
        modified: futureStateNodes.filter((n) => n.action === "modify").length,
        removed: futureStateNodes.filter((n) => n.action === "remove").length,
        new: futureStateNodes.filter((n) => n.action === "new").length,
        keep: futureStateNodes.filter((n) => n.action === "keep").length,
      };
    }
    return { modified: 0, removed: 0, new: 0, keep: currentSteps.length };
  }, [viewState, futureStateNodes, currentSteps]);

  // Get accent color for swimlane
  const getAccentColor = (colorIndex: number) => {
    const colorMap = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e"];
    return colorMap[colorIndex % colorMap.length];
  };

  return (
    <div ref={containerRef} className="relative h-[600px] w-full rounded-xl border overflow-hidden bg-slate-50">
      {/* Fixed Swimlane Labels - synced with React Flow viewport */}
      <div 
        className="absolute left-0 top-0 w-28 h-full z-20 bg-white/95 backdrop-blur-sm border-r border-slate-200"
        style={{
          transform: `translateY(${viewport.y}px)`,
        }}
      >
        {laneList.map((lane, index) => {
          const colors = SWIMLANE_COLORS[index % SWIMLANE_COLORS.length];
          return (
            <div
              key={lane}
              className={cn(
                "flex items-center border-b border-slate-200 transition-all duration-75",
                colors.bg
              )}
              style={{
                height: scaledLaneHeight,
                borderLeftWidth: 4,
                borderLeftColor: getAccentColor(index),
              }}
            >
              <span 
                className="px-2 font-semibold text-slate-700 whitespace-nowrap truncate"
                style={{
                  fontSize: `${Math.max(10, 13 * viewport.zoom)}px`,
                }}
              >
                {lane}
              </span>
            </div>
          );
        })}
      </div>

      {/* Swimlane Background Bands - synced with viewport */}
      <div 
        className="absolute left-28 right-0 top-0 pointer-events-none z-0"
        style={{
          transform: `translateY(${viewport.y}px)`,
        }}
      >
        {laneList.map((lane, index) => {
          const colors = SWIMLANE_COLORS[index % SWIMLANE_COLORS.length];
          return (
            <div
              key={lane}
              className={cn("w-full border-b border-dashed transition-all duration-75", colors.bg)}
              style={{
                height: scaledLaneHeight,
                opacity: 0.4,
                borderColor: getAccentColor(index),
              }}
            />
          );
        })}
      </div>

      {/* Header Controls - positioned after swimlane labels */}
      <div className="absolute left-28 top-0 right-0 z-10 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <Tabs value={viewState} onValueChange={(v) => setViewState(v as "current" | "future")}>
              <TabsList className="h-9 bg-white/90 backdrop-blur-sm">
                <TabsTrigger value="current" className="text-xs gap-1.5 px-3">
                  <Eye className="h-3.5 w-3.5" />
                  Current
                </TabsTrigger>
                <TabsTrigger value="future" className="text-xs gap-1.5 px-3">
                  <Sparkles className="h-3.5 w-3.5" />
                  Future
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Stats */}
            <AnimatePresence mode="wait">
              <motion.div
                key={viewState}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center gap-2"
              >
                {viewState === "future" && (
                  <>
                    {stats.modified > 0 && (
                      <Badge className="bg-amber-100 text-amber-700 text-xs">
                        {stats.modified} Modified
                      </Badge>
                    )}
                    {stats.new > 0 && (
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                        {stats.new} New
                      </Badge>
                    )}
                    {stats.removed > 0 && (
                      <Badge className="bg-red-100 text-red-700 text-xs">
                        {stats.removed} Removed
                      </Badge>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Auto Layout Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoLayout}
              className="bg-white shadow-sm gap-2 h-9"
            >
              <LayoutGrid className="h-4 w-4" />
              Auto Layout
            </Button>

            {/* View Controls - Simplified without Tooltips to fix infinite loop */}
            <div className="flex items-center bg-white rounded-md border shadow-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => zoomIn()}
                className="h-9 px-2.5 rounded-r-none border-r"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => zoomOut()}
                className="h-9 px-2.5 rounded-none border-r"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fitView({ padding: 0.15, duration: 300 })}
                className="h-9 px-2.5 rounded-l-none"
                title="Fit View"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Dual Legend: Priority + Action */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground bg-white/90 backdrop-blur-sm rounded-md px-3 py-1.5 border shadow-sm">
            {/* Priority Legend */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-600">Priority:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-100 border border-red-300" title="High" />
                <div className="w-3 h-3 rounded bg-orange-100 border border-orange-300" title="Medium-High" />
                <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300" title="Medium" />
                <div className="w-3 h-3 rounded bg-slate-50 border border-slate-200" title="Low" />
              </div>
              <span className="text-[10px]">High → Low</span>
            </div>
            
            <div className="w-px h-4 bg-slate-300" />
            
            {/* Action Legend */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-600">Action:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-3 rounded-sm bg-slate-300" />
                <span>Keep</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-3 rounded-sm bg-amber-400" />
                <span>Modify</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-3 rounded-sm bg-red-400" />
                <span>Remove</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-3 rounded-sm bg-emerald-400" />
                <span>New</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* React Flow Canvas - offset to make room for fixed labels */}
      <div 
        className="absolute left-28 right-0 top-0 bottom-0"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes) => {
            onNodesChange(changes);
            // Track position changes for edit mode
            if (isEditMode && onNodePositionChange) {
              changes.forEach((change) => {
                if (change.type === "position" && change.position && change.dragging === false) {
                  onNodePositionChange(change.id, change.position);
                }
              });
            }
          }}
          onEdgesChange={onEdgesChange}
          onNodeClick={(event, node) => {
            if (isEditMode && onNodeSelect) {
              onNodeSelect(node.id, event.shiftKey || event.metaKey || event.ctrlKey);
            } else {
              handleNodeClick(event, node);
            }
          }}
          onConnect={(params) => {
            if (isEditMode && onCreateEdge && params.source && params.target) {
              onCreateEdge(params.source, params.target);
            }
          }}
          onEdgeClick={(event, edge) => {
            if (isEditMode && onDeleteEdge) {
              event.stopPropagation();
              // Could show confirmation or directly delete
              if (window.confirm("Delete this connection?")) {
                onDeleteEdge(edge.id);
              }
            }
          }}
          onNodeContextMenu={handleNodeContextMenu}
          onPaneClick={(event) => {
            // Double-click to create node in edit mode
            if (isEditMode && onCreateNode && event.detail === 2) {
              const reactFlowBounds = containerRef.current?.getBoundingClientRect();
              if (reactFlowBounds) {
                const position = {
                  x: event.clientX - reactFlowBounds.left - 112, // Offset for swimlane labels
                  y: event.clientY - reactFlowBounds.top,
                };
                // Determine which lane based on Y position
                const laneIndex = Math.floor(position.y / (LANE_HEIGHT + LANE_GAP));
                const lane = laneList[laneIndex] || laneList[0] || "Default";
                onCreateNode(lane, position, "action");
              }
            }
          }}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={isEditMode ? { stroke: "#f59e0b", strokeWidth: 2 } : undefined}
          fitView
          fitViewOptions={{ padding: 0.15, minZoom: 0.5, maxZoom: 1.2 }}
          minZoom={0.3}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          proOptions={{ hideAttribution: true }}
          className="bg-transparent"
          nodesDraggable={isEditMode}
          nodesConnectable={isEditMode}
          elementsSelectable={isEditMode}
          selectNodesOnDrag={false}
        >
          <Background color="#e2e8f0" gap={20} size={1} />
          <MiniMap
            nodeColor={(node) => {
              const action = (node.data as FlowStepData).action;
              switch (action) {
                case "modify": return "#fbbf24";
                case "remove": return "#ef4444";
                case "new": return "#10b981";
                default: return "#94a3b8";
              }
            }}
            maskColor="rgba(255, 255, 255, 0.8)"
            position="bottom-right"
            className="!bg-white !border !shadow-lg !rounded-lg !right-2 !bottom-2"
          />
        </ReactFlow>
      </div>

      {/* Context Menu for Nodes */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
              onClick={handleStartRename}
            >
              <Pencil className="w-4 h-4 text-slate-500" />
              Rename
            </button>
            {onDuplicateNode && (
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
                onClick={handleContextDuplicate}
              >
                <Copy className="w-4 h-4 text-slate-500" />
                Duplicate
              </button>
            )}
            <div className="border-t border-slate-200 my-1" />
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
              onClick={handleContextDelete}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline Rename Dialog */}
      <AnimatePresence>
        {editingNodeId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
            onClick={handleCancelRename}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl p-4 min-w-[300px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-slate-900">Rename Step</h3>
                <button onClick={handleCancelRename} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveRename();
                  if (e.key === "Escape") handleCancelRename();
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={handleCancelRename}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveRename}>
                  Save
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Wrapper component that provides the ReactFlowProvider context
export function HorizontalFlowView(props: HorizontalFlowViewProps) {
  return (
    <ReactFlowProvider>
      <HorizontalFlowViewInner {...props} />
    </ReactFlowProvider>
  );
}

