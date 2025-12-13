import { create } from "zustand";
import type { Process, ProcessStep, FlowNode, FlowEdge, Swimlane } from "@/types";

interface WorkflowState {
  // Current workflow
  currentProcess: Process | null;
  
  // All processes for the library
  processes: Process[];
  
  // Steps for current process
  steps: ProcessStep[];
  
  // React Flow nodes and edges
  nodes: FlowNode[];
  edges: FlowEdge[];
  
  // Swimlanes
  swimlanes: Swimlane[];
  
  // View state
  zoom: number;
  viewportCenter: { x: number; y: number };
  showHeatmap: boolean;
  
  // Actions
  setCurrentProcess: (process: Process | null) => void;
  setProcesses: (processes: Process[]) => void;
  addProcess: (process: Process) => void;
  updateProcess: (id: string, updates: Partial<Process>) => void;
  removeProcess: (id: string) => void;
  setSteps: (steps: ProcessStep[]) => void;
  addStep: (step: ProcessStep) => void;
  updateStep: (id: string, updates: Partial<ProcessStep>) => void;
  removeStep: (id: string) => void;
  setNodes: (nodes: FlowNode[]) => void;
  setEdges: (edges: FlowEdge[]) => void;
  updateNodeData: (nodeId: string, data: Partial<FlowNode["data"]>) => void;
  setZoom: (zoom: number) => void;
  setViewportCenter: (center: { x: number; y: number }) => void;
  toggleHeatmap: (show?: boolean) => void;
  
  // Computed
  getSwimlanes: () => Swimlane[];
  
  // Reset
  reset: () => void;
}

const SWIMLANE_COLORS: Record<string, string> = {
  "Premier Health": "#4299E1",
  "Versatex": "#48BB78",
  "Merchant": "#ED8936",
  default: "#A0AEC0",
};

const initialState = {
  currentProcess: null,
  processes: [],
  steps: [],
  nodes: [],
  edges: [],
  swimlanes: [],
  zoom: 1,
  viewportCenter: { x: 0, y: 0 },
  showHeatmap: false,
};

export const useWorkflowStore = create<WorkflowState>()((set, get) => ({
  ...initialState,

  setCurrentProcess: (process) => set({ currentProcess: process }),
  
  setProcesses: (processes) => set({ processes }),
  
  addProcess: (process) =>
    set((state) => ({
      processes: [...state.processes, process],
    })),
  
  updateProcess: (id, updates) =>
    set((state) => ({
      processes: state.processes.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),
  
  removeProcess: (id) =>
    set((state) => ({
      processes: state.processes.filter((p) => p.id !== id),
    })),
  
  setSteps: (steps) => {
    // Generate swimlanes from steps
    const laneMap = new Map<string, ProcessStep[]>();
    steps.forEach((step) => {
      const existing = laneMap.get(step.lane) || [];
      laneMap.set(step.lane, [...existing, step]);
    });

    const swimlanes: Swimlane[] = Array.from(laneMap.entries()).map(
      ([name, laneSteps]) => ({
        id: name.toLowerCase().replace(/\s+/g, "-"),
        name,
        color: SWIMLANE_COLORS[name] || SWIMLANE_COLORS.default,
        steps: laneSteps.sort((a, b) => a.order_index - b.order_index),
      })
    );

    set({ steps, swimlanes });
  },
  
  addStep: (step) =>
    set((state) => {
      const newSteps = [...state.steps, step];
      // Recalculate swimlanes
      const laneMap = new Map<string, ProcessStep[]>();
      newSteps.forEach((s) => {
        const existing = laneMap.get(s.lane) || [];
        laneMap.set(s.lane, [...existing, s]);
      });

      const swimlanes: Swimlane[] = Array.from(laneMap.entries()).map(
        ([name, laneSteps]) => ({
          id: name.toLowerCase().replace(/\s+/g, "-"),
          name,
          color: SWIMLANE_COLORS[name] || SWIMLANE_COLORS.default,
          steps: laneSteps.sort((a, b) => a.order_index - b.order_index),
        })
      );

      return { steps: newSteps, swimlanes };
    }),
  
  updateStep: (id, updates) =>
    set((state) => ({
      steps: state.steps.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),
  
  removeStep: (id) =>
    set((state) => ({
      steps: state.steps.filter((s) => s.id !== id),
    })),
  
  setNodes: (nodes) => set({ nodes }),
  
  setEdges: (edges) => set({ edges }),
  
  updateNodeData: (nodeId, data) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    })),
  
  setZoom: (zoom) => set({ zoom }),
  
  setViewportCenter: (viewportCenter) => set({ viewportCenter }),
  
  toggleHeatmap: (show) =>
    set((state) => ({
      showHeatmap: show !== undefined ? show : !state.showHeatmap,
    })),
  
  getSwimlanes: () => get().swimlanes,
  
  reset: () => set(initialState),
}));

