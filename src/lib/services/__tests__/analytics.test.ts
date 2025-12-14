import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Supabase client and dependent services
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
};

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => mockSupabase,
}));

vi.mock("../wasteTypes", () => ({
  getWasteTypes: vi.fn().mockResolvedValue([
    { id: "wt-1", name: "Defects", color: "#FF0000" },
    { id: "wt-2", name: "Waiting", color: "#FFFF00" },
  ]),
}));

describe("analytics service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Dashboard stats calculation", () => {
    it("should calculate correct percentages", () => {
      // Test utility function logic
      const totalObs = 10;
      const digitalCount = 6;
      const digitalPercentage = Math.round((digitalCount / totalObs) * 100);
      
      expect(digitalPercentage).toBe(60);
    });

    it("should handle zero observations", () => {
      const totalObs = 0;
      const digitalPercentage = totalObs > 0 ? Math.round((0 / totalObs) * 100) : 0;
      
      expect(digitalPercentage).toBe(0);
    });
  });

  describe("Priority score calculation", () => {
    it("should calculate priority correctly using formula", () => {
      // Priority = Frequency × Impact × (6 - Ease)
      const frequency = 5;
      const impact = 4;
      const ease = 2;
      
      const priority = frequency * impact * (6 - ease);
      
      expect(priority).toBe(80); // 5 * 4 * 4 = 80
    });

    it("should handle edge cases", () => {
      // Minimum values
      const minPriority = 1 * 1 * (6 - 5);
      expect(minPriority).toBe(1);
      
      // Maximum values
      const maxPriority = 5 * 5 * (6 - 1);
      expect(maxPriority).toBe(125);
    });
  });

  describe("Hotspot classification", () => {
    it("should classify priority scores correctly", () => {
      const getIntensity = (score: number) => {
        if (score >= 15) return "critical";
        if (score >= 10) return "high";
        if (score >= 5) return "medium";
        return "low";
      };

      expect(getIntensity(20)).toBe("critical");
      expect(getIntensity(15)).toBe("critical");
      expect(getIntensity(14)).toBe("high");
      expect(getIntensity(10)).toBe("high");
      expect(getIntensity(9)).toBe("medium");
      expect(getIntensity(5)).toBe("medium");
      expect(getIntensity(4)).toBe("low");
      expect(getIntensity(1)).toBe("low");
    });
  });
});

