import { create } from "zustand";
import type { TrainingContent, TrainingProgress } from "@/types";

interface TrainingState {
  // All training content
  content: TrainingContent[];
  
  // User's progress
  progress: TrainingProgress[];
  
  // Currently viewing content
  currentContent: TrainingContent | null;
  currentSlideIndex: number;
  
  // Quiz state
  quizAnswers: Record<string, string>;
  quizScore: number | null;
  
  // Actions
  setContent: (content: TrainingContent[]) => void;
  setProgress: (progress: TrainingProgress[]) => void;
  updateProgress: (contentId: string, updates: Partial<TrainingProgress>) => void;
  setCurrentContent: (content: TrainingContent | null) => void;
  setCurrentSlideIndex: (index: number) => void;
  nextSlide: () => void;
  prevSlide: () => void;
  setQuizAnswer: (questionId: string, answer: string) => void;
  setQuizScore: (score: number) => void;
  resetQuiz: () => void;
  
  // Computed
  getCompletionPercentage: () => number;
  isContentCompleted: (contentId: string) => boolean;
  
  // Reset
  reset: () => void;
}

const initialState = {
  content: [],
  progress: [],
  currentContent: null,
  currentSlideIndex: 0,
  quizAnswers: {},
  quizScore: null,
};

export const useTrainingStore = create<TrainingState>()((set, get) => ({
  ...initialState,

  setContent: (content) => set({ content }),
  
  setProgress: (progress) => set({ progress }),
  
  updateProgress: (contentId, updates) =>
    set((state) => {
      const existing = state.progress.find((p) => p.content_id === contentId);
      if (existing) {
        return {
          progress: state.progress.map((p) =>
            p.content_id === contentId ? { ...p, ...updates } : p
          ),
        };
      }
      // Add new progress entry
      return {
        progress: [
          ...state.progress,
          {
            id: crypto.randomUUID(),
            user_id: "",
            content_id: contentId,
            completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...updates,
          } as TrainingProgress,
        ],
      };
    }),
  
  setCurrentContent: (content) =>
    set({
      currentContent: content,
      currentSlideIndex: 0,
      quizAnswers: {},
      quizScore: null,
    }),
  
  setCurrentSlideIndex: (index) => set({ currentSlideIndex: index }),
  
  nextSlide: () =>
    set((state) => ({
      currentSlideIndex: state.currentSlideIndex + 1,
    })),
  
  prevSlide: () =>
    set((state) => ({
      currentSlideIndex: Math.max(0, state.currentSlideIndex - 1),
    })),
  
  setQuizAnswer: (questionId, answer) =>
    set((state) => ({
      quizAnswers: { ...state.quizAnswers, [questionId]: answer },
    })),
  
  setQuizScore: (score) => set({ quizScore: score }),
  
  resetQuiz: () => set({ quizAnswers: {}, quizScore: null }),
  
  getCompletionPercentage: () => {
    const { content, progress } = get();
    if (content.length === 0) return 0;
    const completed = progress.filter((p) => p.completed).length;
    return Math.round((completed / content.length) * 100);
  },
  
  isContentCompleted: (contentId) => {
    const progressItem = get().progress.find((p) => p.content_id === contentId);
    return progressItem?.completed || false;
  },
  
  reset: () => set(initialState),
}));

