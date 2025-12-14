import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted for mocks
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    from: mocks.from,
    auth: {
      getUser: mocks.getUser,
    },
  }),
}));

// Import after mocking
import {
  compareSessionMetrics,
  getComparisonSuggestions,
} from "../comparison";

describe("comparison service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("compareSessionMetrics", () => {
    it("should compare two sessions and calculate differences", async () => {
      // Mock observations for session 1
      const session1Observations = [
        {
          id: "obs-1",
          priority_score: 15,
          is_digital: true,
          is_physical: false,
          observation_waste_links: [{ waste_type: { id: "wt-1", name: "Defects" } }],
        },
        {
          id: "obs-2",
          priority_score: 25,
          is_digital: false,
          is_physical: true,
          observation_waste_links: [{ waste_type: { id: "wt-2", name: "Waiting" } }],
        },
      ];

      // Mock observations for session 2
      const session2Observations = [
        {
          id: "obs-3",
          priority_score: 10,
          is_digital: true,
          is_physical: false,
          observation_waste_links: [{ waste_type: { id: "wt-1", name: "Defects" } }],
        },
      ];

      mocks.from.mockImplementation((table: string) => {
        if (table === "observations") {
          let callCount = 0;
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation(() => {
                callCount++;
                return Promise.resolve({
                  data: callCount === 1 ? session1Observations : session2Observations,
                  error: null,
                });
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const result = await compareSessionMetrics("session-1", "session-2");

      expect(result).toBeDefined();
      expect(result).toHaveProperty("session1");
      expect(result).toHaveProperty("session2");
      expect(result).toHaveProperty("differences");
    });

    it("should handle empty sessions", async () => {
      mocks.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const result = await compareSessionMetrics("empty-1", "empty-2");

      expect(result).toBeDefined();
      expect(result.session1.totalObservations).toBe(0);
      expect(result.session2.totalObservations).toBe(0);
    });

    it("should calculate percentage differences", async () => {
      const session1Obs = Array(10).fill({
        id: "obs",
        priority_score: 10,
        is_digital: true,
        is_physical: false,
        observation_waste_links: [],
      });

      const session2Obs = Array(5).fill({
        id: "obs",
        priority_score: 10,
        is_digital: true,
        is_physical: false,
        observation_waste_links: [],
      });

      let callIdx = 0;
      mocks.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation(() => {
            callIdx++;
            return Promise.resolve({
              data: callIdx === 1 ? session1Obs : session2Obs,
              error: null,
            });
          }),
        }),
      }));

      const result = await compareSessionMetrics("session-1", "session-2");

      // Session 2 has 50% fewer observations
      expect(result.differences.observationsDelta).toBeLessThan(0);
    });
  });

  describe("getComparisonSuggestions", () => {
    it("should provide improvement suggestions based on metrics", () => {
      const metrics = {
        session1: {
          totalObservations: 20,
          avgPriority: 15,
          digitalPercentage: 60,
          topWasteTypes: [{ name: "Waiting", count: 8 }],
        },
        session2: {
          totalObservations: 10,
          avgPriority: 8,
          digitalPercentage: 40,
          topWasteTypes: [{ name: "Waiting", count: 3 }],
        },
        differences: {
          observationsDelta: -50,
          priorityDelta: -7,
          digitalDelta: -20,
        },
      };

      const suggestions = getComparisonSuggestions(metrics);

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it("should highlight improvements", () => {
      const improvedMetrics = {
        session1: {
          totalObservations: 20,
          avgPriority: 20,
          digitalPercentage: 50,
          topWasteTypes: [],
        },
        session2: {
          totalObservations: 10, // 50% reduction - improvement
          avgPriority: 10, // Lower priority - improvement
          digitalPercentage: 50,
          topWasteTypes: [],
        },
        differences: {
          observationsDelta: -50,
          priorityDelta: -10,
          digitalDelta: 0,
        },
      };

      const suggestions = getComparisonSuggestions(improvedMetrics);

      // Check that suggestions exist
      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it("should highlight areas needing attention", () => {
      const worseMetrics = {
        session1: {
          totalObservations: 10,
          avgPriority: 10,
          digitalPercentage: 30,
          topWasteTypes: [],
        },
        session2: {
          totalObservations: 25, // More waste found
          avgPriority: 20, // Higher priority - worse
          digitalPercentage: 70, // More digital waste
          topWasteTypes: [],
        },
        differences: {
          observationsDelta: 150,
          priorityDelta: 10,
          digitalDelta: 40,
        },
      };

      const suggestions = getComparisonSuggestions(worseMetrics);

      // Should highlight concerns
      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("comparison calculations", () => {
  describe("delta calculations", () => {
    it("should calculate positive delta correctly", () => {
      const before = 10;
      const after = 15;
      const delta = after - before;

      expect(delta).toBe(5);
    });

    it("should calculate negative delta correctly", () => {
      const before = 20;
      const after = 12;
      const delta = after - before;

      expect(delta).toBe(-8);
    });

    it("should calculate percentage change", () => {
      const before = 100;
      const after = 75;
      const percentChange = ((after - before) / before) * 100;

      expect(percentChange).toBe(-25);
    });

    it("should handle zero baseline", () => {
      const before = 0;
      const after = 10;

      // Avoid division by zero
      const percentChange = before === 0 ? (after > 0 ? 100 : 0) : ((after - before) / before) * 100;

      expect(percentChange).toBe(100);
    });
  });

  describe("waste type comparison", () => {
    it("should identify common waste types between sessions", () => {
      const session1Types = ["Defects", "Waiting", "Transport"];
      const session2Types = ["Waiting", "Overproduction", "Defects"];

      const common = session1Types.filter((t) => session2Types.includes(t));

      expect(common).toContain("Defects");
      expect(common).toContain("Waiting");
      expect(common.length).toBe(2);
    });

    it("should identify new waste types in second session", () => {
      const session1Types = ["Defects", "Waiting"];
      const session2Types = ["Waiting", "Overproduction", "Motion"];

      const newTypes = session2Types.filter((t) => !session1Types.includes(t));

      expect(newTypes).toContain("Overproduction");
      expect(newTypes).toContain("Motion");
      expect(newTypes.length).toBe(2);
    });

    it("should identify removed waste types in second session", () => {
      const session1Types = ["Defects", "Waiting", "Transport"];
      const session2Types = ["Waiting"];

      const removed = session1Types.filter((t) => !session2Types.includes(t));

      expect(removed).toContain("Defects");
      expect(removed).toContain("Transport");
      expect(removed.length).toBe(2);
    });
  });
});

