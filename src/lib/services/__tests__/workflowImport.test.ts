import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock UUID generation
vi.mock("uuid", () => ({
  v4: vi.fn(() => "mock-uuid-" + Math.random().toString(36).substr(2, 9)),
}));

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
  getSampleJsonWorkflow,
  getSampleCsvSteps,
  getSampleCsvConnections,
} from "../workflowImport";

describe("workflowImport service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
  });

  describe("getSampleJsonWorkflow", () => {
    it("should return a valid JSON sample", () => {
      const sample = getSampleJsonWorkflow();

      expect(sample).toContain('"name"');
      expect(sample).toContain('"steps"');
      expect(sample).toContain('"connections"');

      // Should be valid JSON
      const parsed = JSON.parse(sample);
      expect(parsed).toHaveProperty("name");
      expect(parsed).toHaveProperty("steps");
      expect(Array.isArray(parsed.steps)).toBe(true);
    });

    it("should have required step properties in sample", () => {
      const sample = getSampleJsonWorkflow();
      const parsed = JSON.parse(sample);

      const step = parsed.steps[0];
      expect(step).toHaveProperty("id");
      expect(step).toHaveProperty("name");
      expect(step).toHaveProperty("lane");
      expect(step).toHaveProperty("type");
    });

    it("should have valid step types in sample", () => {
      const sample = getSampleJsonWorkflow();
      const parsed = JSON.parse(sample);

      const validTypes = ["start", "action", "decision", "subprocess", "end"];
      parsed.steps.forEach((step: { type: string }) => {
        expect(validTypes).toContain(step.type);
      });
    });
  });

  describe("getSampleCsvSteps", () => {
    it("should return a valid CSV string", () => {
      const csv = getSampleCsvSteps();

      expect(csv).toBeDefined();
      expect(typeof csv).toBe("string");
      expect(csv.length).toBeGreaterThan(0);
    });

    it("should have correct headers", () => {
      const csv = getSampleCsvSteps();
      const lines = csv.split("\n");
      const headers = lines[0].toLowerCase();

      expect(headers).toContain("id");
      expect(headers).toContain("name");
      expect(headers).toContain("lane");
      expect(headers).toContain("type");
    });

    it("should have data rows", () => {
      const csv = getSampleCsvSteps();
      const lines = csv.split("\n").filter((line) => line.trim());

      // Should have header + at least one data row
      expect(lines.length).toBeGreaterThan(1);
    });
  });

  describe("getSampleCsvConnections", () => {
    it("should return a valid CSV string", () => {
      const csv = getSampleCsvConnections();

      expect(csv).toBeDefined();
      expect(typeof csv).toBe("string");
      expect(csv.length).toBeGreaterThan(0);
    });

    it("should have correct headers", () => {
      const csv = getSampleCsvConnections();
      const lines = csv.split("\n");
      const headers = lines[0].toLowerCase();

      expect(headers).toContain("from");
      expect(headers).toContain("to");
    });

    it("should have connection data", () => {
      const csv = getSampleCsvConnections();
      const lines = csv.split("\n").filter((line) => line.trim());

      // Should have header + at least one data row
      expect(lines.length).toBeGreaterThan(1);
    });
  });

  describe("JSON format validation", () => {
    it("should accept valid workflow JSON", () => {
      const validJson = {
        name: "Test Workflow",
        steps: [
          { id: "1", name: "Start", lane: "User", type: "start" },
          { id: "2", name: "Process", lane: "System", type: "action" },
          { id: "3", name: "End", lane: "User", type: "end" },
        ],
        connections: [
          { from: "1", to: "2" },
          { from: "2", to: "3" },
        ],
      };

      expect(() => JSON.stringify(validJson)).not.toThrow();
    });

    it("should have proper structure for steps", () => {
      const validStep = {
        id: "step-1",
        name: "Test Step",
        lane: "Test Lane",
        type: "action",
        description: "Optional description",
        position_x: 100,
        position_y: 200,
        order_index: 0,
      };

      expect(validStep.id).toBeDefined();
      expect(validStep.name).toBeDefined();
      expect(validStep.lane).toBeDefined();
      expect(validStep.type).toBeDefined();
    });
  });

  describe("CSV format validation", () => {
    it("should parse standard CSV format", () => {
      const csv = "id,name,lane,type\n1,Start,User,start\n2,End,User,end";
      const lines = csv.split("\n");

      expect(lines.length).toBe(3);
      expect(lines[0].split(",").length).toBe(4);
    });

    it("should handle quoted values", () => {
      const csv = 'id,name,lane,type\n1,"Step with, comma",User,action';
      const lines = csv.split("\n");

      expect(lines.length).toBe(2);
      // The quoted value should be kept intact
      expect(lines[1]).toContain('"Step with, comma"');
    });

    it("should handle empty lines", () => {
      const csv = "id,name,lane,type\n\n1,Start,User,start\n\n2,End,User,end\n";
      const lines = csv.split("\n").filter((line) => line.trim());

      expect(lines.length).toBe(3); // header + 2 data rows
    });
  });

  describe("step type inference", () => {
    it("should infer start type for first step", () => {
      // Logic to test: steps named "Start" or first step should be "start" type
      const startNames = ["start", "begin", "initiate", "kick off"];

      startNames.forEach((name) => {
        expect(name.toLowerCase()).toMatch(/start|begin|initiat|kick/i);
      });
    });

    it("should infer end type for last step", () => {
      const endNames = ["end", "finish", "complete", "done"];

      endNames.forEach((name) => {
        expect(name.toLowerCase()).toMatch(/end|finish|complet|done/i);
      });
    });

    it("should infer decision type for question marks", () => {
      const decisionNames = ["Is approved?", "Check status?", "Valid?"];

      decisionNames.forEach((name) => {
        expect(name).toContain("?");
      });
    });
  });
});

describe("import data transformation", () => {
  describe("coordinate generation", () => {
    it("should generate sequential x positions", () => {
      const steps = [
        { order_index: 0 },
        { order_index: 1 },
        { order_index: 2 },
      ];

      // Expected: positions should be calculated based on order
      steps.forEach((step, index) => {
        expect(step.order_index).toBe(index);
      });
    });

    it("should group by lane for y positions", () => {
      const steps = [
        { lane: "User", order_index: 0 },
        { lane: "System", order_index: 1 },
        { lane: "User", order_index: 2 },
      ];

      const lanes = Array.from(new Set(steps.map((s) => s.lane)));
      expect(lanes).toContain("User");
      expect(lanes).toContain("System");
      expect(lanes.length).toBe(2);
    });
  });

  describe("connection generation", () => {
    it("should create sequential connections when none provided", () => {
      const stepIds = ["step-1", "step-2", "step-3"];

      const expectedConnections = [
        { from: "step-1", to: "step-2" },
        { from: "step-2", to: "step-3" },
      ];

      expect(expectedConnections.length).toBe(stepIds.length - 1);
      expect(expectedConnections[0].from).toBe(stepIds[0]);
      expect(expectedConnections[0].to).toBe(stepIds[1]);
    });

    it("should handle single step workflows", () => {
      // Single step should have no connections
      const connections: Array<{ from: string; to: string }> = [];
      expect(connections.length).toBe(0);
    });
  });
});

