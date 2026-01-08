import { create } from "zustand";
import type { Process, ProcessStep, FlowNode, FlowEdge, Swimlane, InformationFlowWithRelations, FlowType } from "@/types";

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

  // Information Flows
  informationFlows: InformationFlowWithRelations[];
  showInformationFlows: boolean;
  visibleFlowTypes: Set<FlowType>;
  selectedFlowId: string | null;
  showFlowLabels: boolean;

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

  // Information Flow Actions
  setInformationFlows: (flows: InformationFlowWithRelations[]) => void;
  addInformationFlow: (flow: InformationFlowWithRelations) => void;
  updateInformationFlow: (id: string, updates: Partial<InformationFlowWithRelations>) => void;
  removeInformationFlow: (id: string) => void;
  toggleShowInformationFlows: (show?: boolean) => void;
  toggleFlowType: (type: FlowType) => void;
  setVisibleFlowTypes: (types: Set<FlowType>) => void;
  setAllFlowTypesVisible: (visible: boolean) => void;
  selectFlow: (flowId: string | null) => void;
  toggleShowFlowLabels: (show?: boolean) => void;
  getFlowCounts: () => Record<FlowType, number>;

  // Computed
  getSwimlanes: () => Swimlane[];

  // Reset
  reset: () => void;
}

// Dynamic color palette for swimlanes - cycles through these colors
const SWIMLANE_COLOR_PALETTE = [
  "#3B82F6", // Blue
  "#22C55E", // Green
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#6366F1", // Indigo
  "#06B6D4", // Cyan
  "#EF4444", // Red
  "#A855F7", // Purple
];

function getSwimlaneColor(index: number): string {
  return SWIMLANE_COLOR_PALETTE[index % SWIMLANE_COLOR_PALETTE.length];
}

// All flow types for visibility filtering
const ALL_FLOW_TYPES: FlowType[] = ["data", "document", "approval", "system", "notification"];

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
  // Information Flows
  informationFlows: [] as InformationFlowWithRelations[],
  showInformationFlows: false,
  visibleFlowTypes: new Set<FlowType>(ALL_FLOW_TYPES),
  selectedFlowId: null as string | null,
  showFlowLabels: true,
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
      ([name, laneSteps], index) => ({
        id: name.toLowerCase().replace(/\s+/g, "-"),
        name,
        color: getSwimlaneColor(index),
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
        ([name, laneSteps], index) => ({
          id: name.toLowerCase().replace(/\s+/g, "-"),
          name,
          color: getSwimlaneColor(index),
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

  // Information Flow Actions
  setInformationFlows: (flows) => set({ informationFlows: flows }),

  addInformationFlow: (flow) =>
    set((state) => ({
      informationFlows: [...state.informationFlows, flow],
    })),

  updateInformationFlow: (id, updates) =>
    set((state) => ({
      informationFlows: state.informationFlows.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    })),

  removeInformationFlow: (id) =>
    set((state) => ({
      informationFlows: state.informationFlows.filter((f) => f.id !== id),
      selectedFlowId: state.selectedFlowId === id ? null : state.selectedFlowId,
    })),

  toggleShowInformationFlows: (show) =>
    set((state) => ({
      showInformationFlows: show !== undefined ? show : !state.showInformationFlows,
    })),

  toggleFlowType: (type) =>
    set((state) => {
      const newTypes = new Set(state.visibleFlowTypes);
      if (newTypes.has(type)) {
        newTypes.delete(type);
      } else {
        newTypes.add(type);
      }
      return { visibleFlowTypes: newTypes };
    }),

  setVisibleFlowTypes: (types) => set({ visibleFlowTypes: types }),

  setAllFlowTypesVisible: (visible) =>
    set({
      visibleFlowTypes: visible ? new Set(ALL_FLOW_TYPES) : new Set(),
    }),

  selectFlow: (flowId) => set({ selectedFlowId: flowId }),

  toggleShowFlowLabels: (show) =>
    set((state) => ({
      showFlowLabels: show !== undefined ? show : !state.showFlowLabels,
    })),

  getFlowCounts: () => {
    const flows = get().informationFlows;
    const counts: Record<FlowType, number> = {
      data: 0,
      document: 0,
      approval: 0,
      system: 0,
      notification: 0,
    };
    flows.forEach((flow) => {
      counts[flow.flow_type]++;
    });
    return counts;
  },

  reset: () => set(initialState),
}));

