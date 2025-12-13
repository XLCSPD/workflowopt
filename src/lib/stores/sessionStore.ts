import { create } from "zustand";
import type {
  Session,
  ProcessStep,
  Observation,
  WasteType,
  SessionParticipant,
} from "@/types";

interface SessionState {
  // Current active session
  currentSession: Session | null;
  
  // Process steps for the workflow
  processSteps: ProcessStep[];
  
  // All observations in the session
  observations: Observation[];
  
  // Participants in the session
  participants: SessionParticipant[];
  
  // Available waste types
  wasteTypes: WasteType[];
  
  // Currently selected step
  selectedStepId: string | null;
  
  // UI state
  isTaggingPanelOpen: boolean;
  isCheatSheetOpen: boolean;
  
  // Actions
  setCurrentSession: (session: Session | null) => void;
  setProcessSteps: (steps: ProcessStep[]) => void;
  setObservations: (observations: Observation[]) => void;
  addObservation: (observation: Observation) => void;
  updateObservation: (id: string, observation: Partial<Observation>) => void;
  removeObservation: (id: string) => void;
  setParticipants: (participants: SessionParticipant[]) => void;
  addParticipant: (participant: SessionParticipant) => void;
  removeParticipant: (userId: string) => void;
  setWasteTypes: (wasteTypes: WasteType[]) => void;
  setSelectedStepId: (stepId: string | null) => void;
  toggleTaggingPanel: (open?: boolean) => void;
  toggleCheatSheet: (open?: boolean) => void;
  
  // Computed getters
  getStepObservations: (stepId: string) => Observation[];
  getStepPriorityScore: (stepId: string) => number;
  
  // Reset
  reset: () => void;
}

const initialState = {
  currentSession: null,
  processSteps: [],
  observations: [],
  participants: [],
  wasteTypes: [],
  selectedStepId: null,
  isTaggingPanelOpen: false,
  isCheatSheetOpen: false,
};

export const useSessionStore = create<SessionState>()((set, get) => ({
  ...initialState,

  setCurrentSession: (session) => set({ currentSession: session }),
  
  setProcessSteps: (steps) => set({ processSteps: steps }),
  
  setObservations: (observations) => set({ observations }),
  
  addObservation: (observation) =>
    set((state) => ({
      observations: [...state.observations, observation],
    })),
  
  updateObservation: (id, updates) =>
    set((state) => ({
      observations: state.observations.map((obs) =>
        obs.id === id ? { ...obs, ...updates } : obs
      ),
    })),
  
  removeObservation: (id) =>
    set((state) => ({
      observations: state.observations.filter((obs) => obs.id !== id),
    })),
  
  setParticipants: (participants) => set({ participants }),
  
  addParticipant: (participant) =>
    set((state) => ({
      participants: [...state.participants, participant],
    })),
  
  removeParticipant: (userId) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.user_id !== userId),
    })),
  
  setWasteTypes: (wasteTypes) => set({ wasteTypes }),
  
  setSelectedStepId: (stepId) => set({ selectedStepId: stepId }),
  
  toggleTaggingPanel: (open) =>
    set((state) => ({
      isTaggingPanelOpen: open !== undefined ? open : !state.isTaggingPanelOpen,
    })),
  
  toggleCheatSheet: (open) =>
    set((state) => ({
      isCheatSheetOpen: open !== undefined ? open : !state.isCheatSheetOpen,
    })),
  
  getStepObservations: (stepId) => {
    return get().observations.filter((obs) => obs.step_id === stepId);
  },
  
  getStepPriorityScore: (stepId) => {
    const observations = get().getStepObservations(stepId);
    return observations.reduce((sum, obs) => sum + obs.priority_score, 0);
  },
  
  reset: () => set(initialState),
}));

