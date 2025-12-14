import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted for mocks that need to be defined before vi.mock
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
import { getWorkflowStats } from "../workflows";

describe("workflows service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getWorkflowStats", () => {
    it("should return workflow statistics", async () => {
      const mockSteps = [
        { lane: "Requester" },
        { lane: "Requester" },
        { lane: "Approver" },
      ];
      const mockSessions = [{ id: "session-1" }, { id: "session-2" }];

      mocks.from.mockImplementation((table: string) => {
        if (table === "process_steps") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockSteps, error: null }),
            }),
          };
        }
        if (table === "sessions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockSessions, error: null }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const stats = await getWorkflowStats("process-123");

      expect(stats).toEqual({
        stepCount: 3,
        laneCount: 2, // Requester and Approver
        sessionCount: 2,
      });
    });

    it("should handle empty data", async () => {
      mocks.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      const stats = await getWorkflowStats("empty-process");

      expect(stats).toEqual({
        stepCount: 0,
        laneCount: 0,
        sessionCount: 0,
      });
    });
  });
});
