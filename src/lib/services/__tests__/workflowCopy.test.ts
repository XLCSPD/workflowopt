import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted for mocks that need to be defined before vi.mock
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  single: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    from: mocks.from,
    rpc: mocks.rpc,
  }),
}));

// Import after mocking
import {
  generateCopyName,
  canEditWorkflow,
  copyWorkflow,
  getWorkflowFutureStates,
  getSourceWorkflowName,
} from "../workflowCopy";

describe("workflowCopy service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // generateCopyName - AC-2.2 Default Naming
  // ============================================
  describe("generateCopyName (AC-2.2)", () => {
    it("should append (Copy) to original name", () => {
      expect(generateCopyName("My Workflow")).toBe("My Workflow (Copy)");
    });

    it("should handle names already ending with (Copy)", () => {
      expect(generateCopyName("My Workflow (Copy)")).toBe("My Workflow (Copy 2)");
    });

    it("should increment existing copy number", () => {
      expect(generateCopyName("My Workflow (Copy 2)")).toBe("My Workflow (Copy 3)");
      expect(generateCopyName("My Workflow (Copy 99)")).toBe("My Workflow (Copy 100)");
    });

    it("should handle empty name", () => {
      expect(generateCopyName("")).toBe(" (Copy)");
    });

    it("should handle names with special characters", () => {
      expect(generateCopyName("Test (v1.0)")).toBe("Test (v1.0) (Copy)");
    });

    it("should handle whitespace around copy suffix", () => {
      expect(generateCopyName("My Workflow  (Copy)  ")).toBe("My Workflow (Copy 2)");
    });
  });

  // ============================================
  // canEditWorkflow - AC-1.3 Permission Enforcement
  // ============================================
  describe("canEditWorkflow (AC-1.3)", () => {
    it("should return true for owner", () => {
      const workflow = { created_by: "user-123" };
      const user = { id: "user-123", role: "participant" };
      expect(canEditWorkflow(workflow, user)).toBe(true);
    });

    it("should return true for admin", () => {
      const workflow = { created_by: "user-123" };
      const user = { id: "different-user", role: "admin" };
      expect(canEditWorkflow(workflow, user)).toBe(true);
    });

    it("should return true for facilitator", () => {
      const workflow = { created_by: "user-123" };
      const user = { id: "different-user", role: "facilitator" };
      expect(canEditWorkflow(workflow, user)).toBe(true);
    });

    it("should return false for non-owner participant", () => {
      const workflow = { created_by: "user-123" };
      const user = { id: "different-user", role: "participant" };
      expect(canEditWorkflow(workflow, user)).toBe(false);
    });

    it("should return false for non-owner with unknown role", () => {
      const workflow = { created_by: "user-123" };
      const user = { id: "different-user", role: "viewer" };
      expect(canEditWorkflow(workflow, user)).toBe(false);
    });
  });

  // ============================================
  // copyWorkflow - RPC integration
  // ============================================
  describe("copyWorkflow", () => {
    it("should call RPC with correct parameters", async () => {
      const newWorkflowId = "new-workflow-uuid";
      mocks.rpc.mockResolvedValue({ data: newWorkflowId, error: null });

      const result = await copyWorkflow({
        sourceProcessId: "source-123",
        newName: "My Copy",
        sourceType: "current",
      });

      expect(mocks.rpc).toHaveBeenCalledWith("copy_workflow", {
        p_source_process_id: "source-123",
        p_new_name: "My Copy",
        p_source_type: "current",
        p_future_state_id: null,
        p_options: {},
      });
      expect(result.success).toBe(true);
      expect(result.newWorkflowId).toBe(newWorkflowId);
    });

    it("should handle RPC errors gracefully", async () => {
      mocks.rpc.mockResolvedValue({
        data: null,
        error: { message: "Permission denied" },
      });

      const result = await copyWorkflow({
        sourceProcessId: "source-123",
        newName: "My Copy",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Permission denied");
    });

    it("should pass future_state_id when sourceType is future_state", async () => {
      mocks.rpc.mockResolvedValue({ data: "new-id", error: null });

      await copyWorkflow({
        sourceProcessId: "source-123",
        newName: "My Copy",
        sourceType: "future_state",
        futureStateId: "fs-456",
      });

      expect(mocks.rpc).toHaveBeenCalledWith("copy_workflow", {
        p_source_process_id: "source-123",
        p_new_name: "My Copy",
        p_source_type: "future_state",
        p_future_state_id: "fs-456",
        p_options: {},
      });
    });

    it("should handle unexpected errors", async () => {
      mocks.rpc.mockRejectedValue(new Error("Network error"));

      const result = await copyWorkflow({
        sourceProcessId: "source-123",
        newName: "My Copy",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });

  // ============================================
  // getWorkflowFutureStates - AC-2.3 Source Selection
  // ============================================
  describe("getWorkflowFutureStates", () => {
    it("should call RPC with correct process ID", async () => {
      const mockStates = [
        { id: "fs-1", name: "Future v1", version: 1, status: "draft", created_at: "2024-01-01", node_count: 5 },
      ];
      mocks.rpc.mockResolvedValue({ data: mockStates, error: null });

      const result = await getWorkflowFutureStates("process-123");

      expect(mocks.rpc).toHaveBeenCalledWith("get_workflow_future_states", {
        p_process_id: "process-123",
      });
      expect(result).toEqual(mockStates);
    });

    it("should return empty array on error", async () => {
      mocks.rpc.mockResolvedValue({ data: null, error: { message: "Error" } });

      const result = await getWorkflowFutureStates("process-123");

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // getSourceWorkflowName - AC-4.2 Lineage Display
  // ============================================
  describe("getSourceWorkflowName", () => {
    it("should return workflow name", async () => {
      mocks.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { name: "Original Workflow" },
              error: null,
            }),
          }),
        }),
      });

      const result = await getSourceWorkflowName("source-123");

      expect(result).toBe("Original Workflow");
    });

    it("should return null on error", async () => {
      mocks.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Not found" },
            }),
          }),
        }),
      });

      const result = await getSourceWorkflowName("nonexistent");

      expect(result).toBeNull();
    });
  });
});

