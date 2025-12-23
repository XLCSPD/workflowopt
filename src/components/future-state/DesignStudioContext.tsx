"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { v4 as uuidv4 } from "uuid";
import type {
  DesignStudioState,
  DesignStudioActions,
  DesignCommand,
  ActiveTool,
  FutureStateAnnotation,
  FutureStateLane,
  LaneColor,
  AnnotationType,
  AnnotationPriority,
} from "@/types/design-studio";
import type { FutureStateNode, FutureStateEdge, StepType, NodeAction } from "@/types";

// ============================================
// CONSTANTS
// ============================================

const MAX_UNDO_STACK_SIZE = 50;
const AUTO_SAVE_DELAY_MS = 5000;

// ============================================
// INITIAL STATE
// ============================================

const initialState: DesignStudioState = {
  isEditMode: false,
  isDirty: false,
  lastSavedAt: null,
  selectedNodeIds: [],
  selectedEdgeId: null,
  selectedAnnotationId: null,
  clipboard: null,
  undoStack: [],
  redoStack: [],
  activeTool: null,
  isSaving: false,
  isLoading: false,
};

// ============================================
// REDUCER ACTIONS
// ============================================

type DesignStudioAction =
  | { type: "SET_EDIT_MODE"; payload: boolean }
  | { type: "SET_DIRTY"; payload: boolean }
  | { type: "SET_LAST_SAVED"; payload: Date }
  | { type: "SELECT_NODE"; payload: { nodeId: string; addToSelection: boolean } }
  | { type: "SELECT_NODES"; payload: string[] }
  | { type: "DESELECT_NODE"; payload: string }
  | { type: "DESELECT_ALL" }
  | { type: "SELECT_EDGE"; payload: string | null }
  | { type: "SELECT_ANNOTATION"; payload: string | null }
  | { type: "SET_CLIPBOARD"; payload: DesignStudioState["clipboard"] }
  | { type: "PUSH_UNDO"; payload: DesignCommand }
  | { type: "POP_UNDO" }
  | { type: "PUSH_REDO"; payload: DesignCommand }
  | { type: "POP_REDO" }
  | { type: "CLEAR_REDO" }
  | { type: "SET_ACTIVE_TOOL"; payload: ActiveTool | null }
  | { type: "SET_SAVING"; payload: boolean }
  | { type: "SET_LOADING"; payload: boolean };

function designStudioReducer(
  state: DesignStudioState,
  action: DesignStudioAction
): DesignStudioState {
  switch (action.type) {
    case "SET_EDIT_MODE":
      return { ...state, isEditMode: action.payload };

    case "SET_DIRTY":
      return { ...state, isDirty: action.payload };

    case "SET_LAST_SAVED":
      return { ...state, lastSavedAt: action.payload, isDirty: false };

    case "SELECT_NODE":
      if (action.payload.addToSelection) {
        return {
          ...state,
          selectedNodeIds: state.selectedNodeIds.includes(action.payload.nodeId)
            ? state.selectedNodeIds
            : [...state.selectedNodeIds, action.payload.nodeId],
          selectedEdgeId: null,
          selectedAnnotationId: null,
        };
      }
      return {
        ...state,
        selectedNodeIds: [action.payload.nodeId],
        selectedEdgeId: null,
        selectedAnnotationId: null,
      };

    case "SELECT_NODES":
      return {
        ...state,
        selectedNodeIds: action.payload,
        selectedEdgeId: null,
        selectedAnnotationId: null,
      };

    case "DESELECT_NODE":
      return {
        ...state,
        selectedNodeIds: state.selectedNodeIds.filter((id) => id !== action.payload),
      };

    case "DESELECT_ALL":
      return {
        ...state,
        selectedNodeIds: [],
        selectedEdgeId: null,
        selectedAnnotationId: null,
      };

    case "SELECT_EDGE":
      return {
        ...state,
        selectedEdgeId: action.payload,
        selectedNodeIds: [],
        selectedAnnotationId: null,
      };

    case "SELECT_ANNOTATION":
      return {
        ...state,
        selectedAnnotationId: action.payload,
        selectedNodeIds: [],
        selectedEdgeId: null,
      };

    case "SET_CLIPBOARD":
      return { ...state, clipboard: action.payload };

    case "PUSH_UNDO": {
      const newStack = [action.payload, ...state.undoStack].slice(0, MAX_UNDO_STACK_SIZE);
      return { ...state, undoStack: newStack };
    }

    case "POP_UNDO":
      return { ...state, undoStack: state.undoStack.slice(1) };

    case "PUSH_REDO": {
      const newStack = [action.payload, ...state.redoStack];
      return { ...state, redoStack: newStack };
    }

    case "POP_REDO":
      return { ...state, redoStack: state.redoStack.slice(1) };

    case "CLEAR_REDO":
      return { ...state, redoStack: [] };

    case "SET_ACTIVE_TOOL":
      return { ...state, activeTool: action.payload };

    case "SET_SAVING":
      return { ...state, isSaving: action.payload };

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    default:
      return state;
  }
}

// ============================================
// CONTEXT
// ============================================

interface DesignStudioContextValue {
  state: DesignStudioState;
  actions: DesignStudioActions;
  // Data refs for accessing current nodes/edges/etc.
  nodes: FutureStateNode[];
  edges: FutureStateEdge[];
  lanes: FutureStateLane[];
  annotations: FutureStateAnnotation[];
}

const DesignStudioContext = createContext<DesignStudioContextValue | null>(null);

// ============================================
// PROVIDER PROPS
// ============================================

interface DesignStudioProviderProps {
  children: React.ReactNode;
  futureStateId: string | null;
  sessionId: string;
  userId: string;
  nodes: FutureStateNode[];
  edges: FutureStateEdge[];
  lanes: FutureStateLane[];
  annotations: FutureStateAnnotation[];
  onNodesChange: (nodes: FutureStateNode[]) => void;
  onEdgesChange: (edges: FutureStateEdge[]) => void;
  onLanesChange: (lanes: FutureStateLane[]) => void;
  onAnnotationsChange: (annotations: FutureStateAnnotation[]) => void;
  onRefresh: () => Promise<void>;
}

// ============================================
// PROVIDER COMPONENT
// ============================================

export function DesignStudioProvider({
  children,
  futureStateId,
  sessionId,
  userId,
  nodes,
  edges,
  lanes,
  annotations,
  onNodesChange,
  onEdgesChange,
  onLanesChange,
  onAnnotationsChange,
  onRefresh,
}: DesignStudioProviderProps) {
  // Reserved for future use
  void userId;
  const [state, dispatch] = useReducer(designStudioReducer, initialState);

  // Refs for accessing latest data in callbacks
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const lanesRef = useRef(lanes);
  const annotationsRef = useRef(annotations);
  const futureStateIdRef = useRef(futureStateId);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    lanesRef.current = lanes;
  }, [lanes]);

  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  useEffect(() => {
    futureStateIdRef.current = futureStateId;
  }, [futureStateId]);

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to add command to undo stack
  const pushUndo = useCallback((command: DesignCommand) => {
    dispatch({ type: "PUSH_UNDO", payload: command });
    dispatch({ type: "CLEAR_REDO" });
    dispatch({ type: "SET_DIRTY", payload: true });
  }, []);

  // ============================================
  // ACTIONS IMPLEMENTATION
  // ============================================

  const setEditMode = useCallback((enabled: boolean) => {
    dispatch({ type: "SET_EDIT_MODE", payload: enabled });
    if (!enabled) {
      dispatch({ type: "DESELECT_ALL" });
      dispatch({ type: "SET_ACTIVE_TOOL", payload: null });
    }
  }, []);

  const selectNode = useCallback((nodeId: string, addToSelection = false) => {
    dispatch({ type: "SELECT_NODE", payload: { nodeId, addToSelection } });
  }, []);

  const selectNodes = useCallback((nodeIds: string[]) => {
    dispatch({ type: "SELECT_NODES", payload: nodeIds });
  }, []);

  const deselectNode = useCallback((nodeId: string) => {
    dispatch({ type: "DESELECT_NODE", payload: nodeId });
  }, []);

  const deselectAll = useCallback(() => {
    dispatch({ type: "DESELECT_ALL" });
  }, []);

  const selectEdge = useCallback((edgeId: string | null) => {
    dispatch({ type: "SELECT_EDGE", payload: edgeId });
  }, []);

  const selectAnnotation = useCallback((annotationId: string | null) => {
    dispatch({ type: "SELECT_ANNOTATION", payload: annotationId });
  }, []);

  const setActiveTool = useCallback((tool: ActiveTool | null) => {
    dispatch({ type: "SET_ACTIVE_TOOL", payload: tool });
  }, []);

  const markDirty = useCallback(() => {
    dispatch({ type: "SET_DIRTY", payload: true });

    // Reset auto-save timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      // Auto-save logic will be implemented later
    }, AUTO_SAVE_DELAY_MS);
  }, []);

  const markClean = useCallback(() => {
    dispatch({ type: "SET_DIRTY", payload: false });
    dispatch({ type: "SET_LAST_SAVED", payload: new Date() });
  }, []);

  // ============================================
  // NODE CRUD
  // ============================================

  const createNode = useCallback(
    async (params: {
      name: string;
      lane: string;
      stepType: StepType;
      positionX: number;
      positionY: number;
      action?: NodeAction;
      linkedSolutionId?: string;
    }): Promise<FutureStateNode | null> => {
      if (!futureStateIdRef.current) return null;

      try {
        const response = await fetch("/api/future-state/nodes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            futureStateId: futureStateIdRef.current,
            name: params.name,
            lane: params.lane,
            stepType: params.stepType,
            positionX: params.positionX,
            positionY: params.positionY,
            action: params.action || "new",
            linkedSolutionId: params.linkedSolutionId,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("Failed to create node:", error);
          return null;
        }

        const { node } = await response.json();

        // Update local state
        onNodesChange([...nodesRef.current, node]);

        // Add to undo stack
        pushUndo({
          id: uuidv4(),
          type: "create_node",
          payload: { node },
          inverse: { nodeId: node.id },
          timestamp: new Date(),
          description: `Created step "${params.name}"`,
        });

        return node;
      } catch (error) {
        console.error("Error creating node:", error);
        return null;
      }
    },
    [onNodesChange, pushUndo]
  );

  const updateNode = useCallback(
    async (nodeId: string, updates: Partial<FutureStateNode>): Promise<boolean> => {
      const currentNode = nodesRef.current.find((n) => n.id === nodeId);
      if (!currentNode) return false;

      try {
        const response = await fetch("/api/future-state/nodes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodeId, updates }),
        });

        if (!response.ok) {
          console.error("Failed to update node");
          return false;
        }

        const { node: updatedNode } = await response.json();

        // Update local state
        onNodesChange(nodesRef.current.map((n) => (n.id === nodeId ? updatedNode : n)));

        // Add to undo stack
        pushUndo({
          id: uuidv4(),
          type: "update_node",
          payload: { nodeId, updates },
          inverse: { nodeId, updates: currentNode },
          timestamp: new Date(),
          description: `Updated step "${currentNode.name}"`,
        });

        return true;
      } catch (error) {
        console.error("Error updating node:", error);
        return false;
      }
    },
    [onNodesChange, pushUndo]
  );

  const deleteNode = useCallback(
    async (nodeId: string): Promise<boolean> => {
      const currentNode = nodesRef.current.find((n) => n.id === nodeId);
      if (!currentNode) return false;

      const connectedEdges = edgesRef.current.filter(
        (e) => e.source_node_id === nodeId || e.target_node_id === nodeId
      );

      try {
        const response = await fetch("/api/future-state/nodes", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodeId, cascade: true }),
        });

        if (!response.ok) {
          console.error("Failed to delete node");
          return false;
        }

        // Update local state
        onNodesChange(nodesRef.current.filter((n) => n.id !== nodeId));
        onEdgesChange(
          edgesRef.current.filter(
            (e) => e.source_node_id !== nodeId && e.target_node_id !== nodeId
          )
        );

        // Deselect if selected
        dispatch({ type: "DESELECT_NODE", payload: nodeId });

        // Add to undo stack
        pushUndo({
          id: uuidv4(),
          type: "delete_node",
          payload: { node: currentNode, connectedEdges },
          inverse: { node: currentNode, connectedEdges },
          timestamp: new Date(),
          description: `Deleted step "${currentNode.name}"`,
        });

        return true;
      } catch (error) {
        console.error("Error deleting node:", error);
        return false;
      }
    },
    [onNodesChange, onEdgesChange, pushUndo]
  );

  const duplicateNode = useCallback(
    async (nodeId: string): Promise<FutureStateNode | null> => {
      const sourceNode = nodesRef.current.find((n) => n.id === nodeId);
      if (!sourceNode) return null;

      return createNode({
        name: `Copy of ${sourceNode.name}`,
        lane: sourceNode.lane,
        stepType: sourceNode.step_type,
        positionX: sourceNode.position_x + 50,
        positionY: sourceNode.position_y + 50,
        action: "new",
      });
    },
    [createNode]
  );

  // ============================================
  // EDGE CRUD
  // ============================================

  const createEdge = useCallback(
    async (
      sourceNodeId: string,
      targetNodeId: string,
      label?: string
    ): Promise<FutureStateEdge | null> => {
      if (!futureStateIdRef.current) return null;

      try {
        const response = await fetch("/api/future-state/edges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            futureStateId: futureStateIdRef.current,
            sourceNodeId,
            targetNodeId,
            label,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("Failed to create edge:", error);
          return null;
        }

        const { edge } = await response.json();

        // Update local state
        onEdgesChange([...edgesRef.current, edge]);

        // Add to undo stack
        pushUndo({
          id: uuidv4(),
          type: "create_edge",
          payload: { edge },
          inverse: { edgeId: edge.id },
          timestamp: new Date(),
          description: "Created connection",
        });

        return edge;
      } catch (error) {
        console.error("Error creating edge:", error);
        return null;
      }
    },
    [onEdgesChange, pushUndo]
  );

  const updateEdge = useCallback(
    async (edgeId: string, updates: Partial<FutureStateEdge>): Promise<boolean> => {
      const currentEdge = edgesRef.current.find((e) => e.id === edgeId);
      if (!currentEdge) return false;

      try {
        const response = await fetch("/api/future-state/edges", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ edgeId, updates }),
        });

        if (!response.ok) {
          console.error("Failed to update edge");
          return false;
        }

        const { edge: updatedEdge } = await response.json();

        // Update local state
        onEdgesChange(edgesRef.current.map((e) => (e.id === edgeId ? updatedEdge : e)));

        // Add to undo stack
        pushUndo({
          id: uuidv4(),
          type: "update_edge",
          payload: { edgeId, updates },
          inverse: { edgeId, updates: currentEdge },
          timestamp: new Date(),
          description: "Updated connection",
        });

        return true;
      } catch (error) {
        console.error("Error updating edge:", error);
        return false;
      }
    },
    [onEdgesChange, pushUndo]
  );

  const deleteEdge = useCallback(
    async (edgeId: string): Promise<boolean> => {
      const currentEdge = edgesRef.current.find((e) => e.id === edgeId);
      if (!currentEdge) return false;

      try {
        const response = await fetch("/api/future-state/edges", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ edgeId }),
        });

        if (!response.ok) {
          console.error("Failed to delete edge");
          return false;
        }

        // Update local state
        onEdgesChange(edgesRef.current.filter((e) => e.id !== edgeId));

        // Deselect if selected
        if (state.selectedEdgeId === edgeId) {
          dispatch({ type: "SELECT_EDGE", payload: null });
        }

        // Add to undo stack
        pushUndo({
          id: uuidv4(),
          type: "delete_edge",
          payload: { edge: currentEdge },
          inverse: { edge: currentEdge },
          timestamp: new Date(),
          description: "Deleted connection",
        });

        return true;
      } catch (error) {
        console.error("Error deleting edge:", error);
        return false;
      }
    },
    [onEdgesChange, pushUndo, state.selectedEdgeId]
  );

  // ============================================
  // LANE CRUD
  // ============================================

  const createLane = useCallback(
    async (
      name: string,
      color: LaneColor = "blue",
      afterLaneId?: string
    ): Promise<FutureStateLane | null> => {
      if (!futureStateIdRef.current) return null;

      // Calculate order index
      let orderIndex = lanesRef.current.length;
      if (afterLaneId) {
        const afterLane = lanesRef.current.find((l) => l.id === afterLaneId);
        if (afterLane) {
          orderIndex = afterLane.order_index + 1;
        }
      }

      try {
        const response = await fetch("/api/future-state/lanes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            futureStateId: futureStateIdRef.current,
            name,
            color,
            orderIndex,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("Failed to create lane:", error);
          return null;
        }

        const { lane } = await response.json();

        // Update local state
        onLanesChange([...lanesRef.current, lane].sort((a, b) => a.order_index - b.order_index));

        // Add to undo stack
        pushUndo({
          id: uuidv4(),
          type: "create_lane",
          payload: { lane },
          inverse: { laneId: lane.id },
          timestamp: new Date(),
          description: `Created lane "${name}"`,
        });

        return lane;
      } catch (error) {
        console.error("Error creating lane:", error);
        return null;
      }
    },
    [onLanesChange, pushUndo]
  );

  const updateLane = useCallback(
    async (laneId: string, updates: Partial<FutureStateLane>): Promise<boolean> => {
      const currentLane = lanesRef.current.find((l) => l.id === laneId);
      if (!currentLane) return false;

      try {
        const response = await fetch("/api/future-state/lanes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ laneId, updates }),
        });

        if (!response.ok) {
          console.error("Failed to update lane");
          return false;
        }

        const { lane: updatedLane } = await response.json();

        // Update local state
        onLanesChange(lanesRef.current.map((l) => (l.id === laneId ? updatedLane : l)));

        // Add to undo stack
        pushUndo({
          id: uuidv4(),
          type: "update_lane",
          payload: { laneId, updates },
          inverse: { laneId, updates: currentLane },
          timestamp: new Date(),
          description: `Updated lane "${currentLane.name}"`,
        });

        return true;
      } catch (error) {
        console.error("Error updating lane:", error);
        return false;
      }
    },
    [onLanesChange, pushUndo]
  );

  const deleteLane = useCallback(
    async (laneId: string): Promise<boolean> => {
      const currentLane = lanesRef.current.find((l) => l.id === laneId);
      if (!currentLane) return false;

      // Check if lane has nodes
      const laneNodes = nodesRef.current.filter((n) => n.lane === currentLane.name);
      if (laneNodes.length > 0) {
        console.error("Cannot delete lane with nodes");
        return false;
      }

      try {
        const response = await fetch("/api/future-state/lanes", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ laneId }),
        });

        if (!response.ok) {
          console.error("Failed to delete lane");
          return false;
        }

        // Update local state
        onLanesChange(lanesRef.current.filter((l) => l.id !== laneId));

        // Add to undo stack
        pushUndo({
          id: uuidv4(),
          type: "delete_lane",
          payload: { lane: currentLane },
          inverse: { lane: currentLane },
          timestamp: new Date(),
          description: `Deleted lane "${currentLane.name}"`,
        });

        return true;
      } catch (error) {
        console.error("Error deleting lane:", error);
        return false;
      }
    },
    [onLanesChange, pushUndo]
  );

  const reorderLanes = useCallback(
    async (laneIds: string[]): Promise<boolean> => {
      const previousOrder = lanesRef.current.map((l) => l.id);

      try {
        const response = await fetch("/api/future-state/lanes/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            futureStateId: futureStateIdRef.current,
            laneIds,
          }),
        });

        if (!response.ok) {
          console.error("Failed to reorder lanes");
          return false;
        }

        // Update local state
        const reorderedLanes = laneIds
          .map((id, index) => {
            const lane = lanesRef.current.find((l) => l.id === id);
            return lane ? { ...lane, order_index: index } : null;
          })
          .filter(Boolean) as FutureStateLane[];

        onLanesChange(reorderedLanes);

        // Add to undo stack
        pushUndo({
          id: uuidv4(),
          type: "reorder_lanes",
          payload: { newOrder: laneIds },
          inverse: { previousOrder },
          timestamp: new Date(),
          description: "Reordered lanes",
        });

        return true;
      } catch (error) {
        console.error("Error reordering lanes:", error);
        return false;
      }
    },
    [onLanesChange, pushUndo]
  );

  // ============================================
  // ANNOTATION CRUD
  // ============================================

  const createAnnotation = useCallback(
    async (params: {
      type: AnnotationType;
      title: string;
      content?: string;
      nodeId?: string;
      positionX?: number;
      positionY?: number;
      priority?: AnnotationPriority;
    }): Promise<FutureStateAnnotation | null> => {
      if (!futureStateIdRef.current) return null;

      try {
        const response = await fetch("/api/future-state/annotations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            futureStateId: futureStateIdRef.current,
            ...params,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("Failed to create annotation:", error);
          return null;
        }

        const { annotation } = await response.json();

        // Update local state
        onAnnotationsChange([...annotationsRef.current, annotation]);

        // Add to undo stack
        pushUndo({
          id: uuidv4(),
          type: "create_annotation",
          payload: { annotation },
          inverse: { annotationId: annotation.id },
          timestamp: new Date(),
          description: `Created ${params.type} "${params.title}"`,
        });

        return annotation;
      } catch (error) {
        console.error("Error creating annotation:", error);
        return null;
      }
    },
    [onAnnotationsChange, pushUndo]
  );

  const updateAnnotation = useCallback(
    async (
      annotationId: string,
      updates: Partial<FutureStateAnnotation>
    ): Promise<boolean> => {
      const currentAnnotation = annotationsRef.current.find((a) => a.id === annotationId);
      if (!currentAnnotation) return false;

      try {
        const response = await fetch("/api/future-state/annotations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ annotationId, updates }),
        });

        if (!response.ok) {
          console.error("Failed to update annotation");
          return false;
        }

        const { annotation: updatedAnnotation } = await response.json();

        // Update local state
        onAnnotationsChange(
          annotationsRef.current.map((a) => (a.id === annotationId ? updatedAnnotation : a))
        );

        // Add to undo stack
        pushUndo({
          id: uuidv4(),
          type: "update_annotation",
          payload: { annotationId, updates },
          inverse: { annotationId, updates: currentAnnotation },
          timestamp: new Date(),
          description: `Updated ${currentAnnotation.type}`,
        });

        return true;
      } catch (error) {
        console.error("Error updating annotation:", error);
        return false;
      }
    },
    [onAnnotationsChange, pushUndo]
  );

  const deleteAnnotation = useCallback(
    async (annotationId: string): Promise<boolean> => {
      const currentAnnotation = annotationsRef.current.find((a) => a.id === annotationId);
      if (!currentAnnotation) return false;

      try {
        const response = await fetch("/api/future-state/annotations", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ annotationId }),
        });

        if (!response.ok) {
          console.error("Failed to delete annotation");
          return false;
        }

        // Update local state
        onAnnotationsChange(annotationsRef.current.filter((a) => a.id !== annotationId));

        // Deselect if selected
        if (state.selectedAnnotationId === annotationId) {
          dispatch({ type: "SELECT_ANNOTATION", payload: null });
        }

        // Add to undo stack
        pushUndo({
          id: uuidv4(),
          type: "delete_annotation",
          payload: { annotation: currentAnnotation },
          inverse: { annotation: currentAnnotation },
          timestamp: new Date(),
          description: `Deleted ${currentAnnotation.type}`,
        });

        return true;
      } catch (error) {
        console.error("Error deleting annotation:", error);
        return false;
      }
    },
    [onAnnotationsChange, pushUndo, state.selectedAnnotationId]
  );

  const resolveAnnotation = useCallback(
    async (annotationId: string, resolved: boolean): Promise<boolean> => {
      return updateAnnotation(annotationId, { resolved });
    },
    [updateAnnotation]
  );

  // ============================================
  // CLIPBOARD OPERATIONS
  // ============================================

  const copy = useCallback(() => {
    if (state.selectedNodeIds.length === 1) {
      const node = nodesRef.current.find((n) => n.id === state.selectedNodeIds[0]);
      if (node) {
        dispatch({
          type: "SET_CLIPBOARD",
          payload: { type: "node", data: node, timestamp: new Date() },
        });
      }
    } else if (state.selectedNodeIds.length > 1) {
      const selectedNodes = nodesRef.current.filter((n) =>
        state.selectedNodeIds.includes(n.id)
      );
      dispatch({
        type: "SET_CLIPBOARD",
        payload: { type: "nodes", data: selectedNodes, timestamp: new Date() },
      });
    }
  }, [state.selectedNodeIds]);

  const paste = useCallback(
    async (position?: { x: number; y: number }) => {
      if (!state.clipboard) return;

      if (state.clipboard.type === "node") {
        const sourceNode = state.clipboard.data as FutureStateNode;
        await createNode({
          name: `Copy of ${sourceNode.name}`,
          lane: sourceNode.lane,
          stepType: sourceNode.step_type,
          positionX: position?.x ?? sourceNode.position_x + 50,
          positionY: position?.y ?? sourceNode.position_y + 50,
          action: "new",
        });
      }
    },
    [state.clipboard, createNode]
  );

  const cut = useCallback(() => {
    copy();
    state.selectedNodeIds.forEach((nodeId) => {
      deleteNode(nodeId);
    });
  }, [copy, state.selectedNodeIds, deleteNode]);

  // ============================================
  // UNDO/REDO
  // ============================================

  const canUndo = useCallback(() => state.undoStack.length > 0, [state.undoStack]);
  const canRedo = useCallback(() => state.redoStack.length > 0, [state.redoStack]);

  const undo = useCallback(async () => {
    if (!canUndo()) return;

    const command = state.undoStack[0];
    dispatch({ type: "POP_UNDO" });
    dispatch({ type: "PUSH_REDO", payload: command });

    // Execute inverse operation based on command type
    // This is a simplified version - full implementation would handle all command types
    await onRefresh();
  }, [canUndo, state.undoStack, onRefresh]);

  const redo = useCallback(async () => {
    if (!canRedo()) return;

    const command = state.redoStack[0];
    dispatch({ type: "POP_REDO" });
    dispatch({ type: "PUSH_UNDO", payload: command });

    // Re-execute operation
    await onRefresh();
  }, [canRedo, state.redoStack, onRefresh]);

  // ============================================
  // SAVE OPERATIONS
  // ============================================

  const save = useCallback(async (): Promise<boolean> => {
    dispatch({ type: "SET_SAVING", payload: true });
    try {
      // The actual save happens through individual CRUD operations
      // This just marks the state as clean
      markClean();
      return true;
    } finally {
      dispatch({ type: "SET_SAVING", payload: false });
    }
  }, [markClean]);

  const saveAsNewVersion = useCallback(
    async (name: string, description?: string): Promise<string | null> => {
      if (!futureStateIdRef.current) return null;

      dispatch({ type: "SET_SAVING", payload: true });
      try {
        const response = await fetch("/api/future-state/versions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            sourceVersionId: futureStateIdRef.current,
            name,
            description,
          }),
        });

        if (!response.ok) {
          console.error("Failed to create new version");
          return null;
        }

        const { versionId } = await response.json();
        markClean();
        return versionId;
      } catch (error) {
        console.error("Error creating version:", error);
        return null;
      } finally {
        dispatch({ type: "SET_SAVING", payload: false });
      }
    },
    [sessionId, markClean]
  );

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const actions: DesignStudioActions = useMemo(
    () => ({
      setEditMode,
      selectNode,
      selectNodes,
      deselectNode,
      deselectAll,
      selectEdge,
      selectAnnotation,
      copy,
      paste,
      cut,
      undo,
      redo,
      canUndo,
      canRedo,
      setActiveTool,
      createNode,
      updateNode,
      deleteNode,
      duplicateNode,
      createEdge,
      updateEdge,
      deleteEdge,
      createLane,
      updateLane,
      deleteLane,
      reorderLanes,
      createAnnotation,
      updateAnnotation,
      deleteAnnotation,
      resolveAnnotation,
      save,
      saveAsNewVersion,
      markDirty,
      markClean,
    }),
    [
      setEditMode,
      selectNode,
      selectNodes,
      deselectNode,
      deselectAll,
      selectEdge,
      selectAnnotation,
      copy,
      paste,
      cut,
      undo,
      redo,
      canUndo,
      canRedo,
      setActiveTool,
      createNode,
      updateNode,
      deleteNode,
      duplicateNode,
      createEdge,
      updateEdge,
      deleteEdge,
      createLane,
      updateLane,
      deleteLane,
      reorderLanes,
      createAnnotation,
      updateAnnotation,
      deleteAnnotation,
      resolveAnnotation,
      save,
      saveAsNewVersion,
      markDirty,
      markClean,
    ]
  );

  const contextValue: DesignStudioContextValue = useMemo(
    () => ({
      state,
      actions,
      nodes,
      edges,
      lanes,
      annotations,
    }),
    [state, actions, nodes, edges, lanes, annotations]
  );

  return (
    <DesignStudioContext.Provider value={contextValue}>
      {children}
    </DesignStudioContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useDesignStudio() {
  const context = useContext(DesignStudioContext);
  if (!context) {
    throw new Error("useDesignStudio must be used within a DesignStudioProvider");
  }
  return context;
}

// Export context for advanced use cases
export { DesignStudioContext };

