"use client";

import { useMemo, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  ConnectionMode,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { StepNode } from "./StepNode";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Flame } from "lucide-react";
import type { ProcessStep } from "@/types";

const nodeTypes = {
  stepNode: StepNode,
};

interface ProcessMapProps {
  steps: ProcessStep[];
  connections: { source: string; target: string }[];
  observations?: Record<string, { count: number; priorityScore: number }>;
  selectedStepId?: string | null;
  onStepClick?: (stepId: string) => void;
  showHeatmap?: boolean;
  onToggleHeatmap?: (show: boolean) => void;
}

const SWIMLANE_COLORS: Record<string, { bg: string; border: string }> = {
  "Premier Health": { bg: "#DBEAFE", border: "#3B82F6" },
  Versatex: { bg: "#DCFCE7", border: "#22C55E" },
  Merchant: { bg: "#FEF3C7", border: "#F59E0B" },
};

const SWIMLANE_HEIGHT = 140;
const SWIMLANE_PADDING = 20;

export function ProcessMap({
  steps,
  connections,
  observations = {},
  selectedStepId,
  onStepClick,
  showHeatmap = false,
  onToggleHeatmap,
}: ProcessMapProps) {
  // Group steps by lane
  const swimlanes = useMemo(() => {
    const laneMap = new Map<string, ProcessStep[]>();
    steps.forEach((step) => {
      const existing = laneMap.get(step.lane) || [];
      laneMap.set(step.lane, [...existing, step]);
    });
    return Array.from(laneMap.entries()).map(([name, laneSteps]) => ({
      name,
      steps: laneSteps.sort((a, b) => a.order_index - b.order_index),
    }));
  }, [steps]);

  // Generate nodes
  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];

    swimlanes.forEach((lane, laneIndex) => {
      const yOffset = laneIndex * SWIMLANE_HEIGHT + SWIMLANE_PADDING;

      lane.steps.forEach((step) => {
        const obs = observations[step.id] || { count: 0, priorityScore: 0 };
        
        let heatmapIntensity: "low" | "medium" | "high" | "critical" | undefined;
        if (showHeatmap && obs.priorityScore > 0) {
          if (obs.priorityScore >= 15) heatmapIntensity = "critical";
          else if (obs.priorityScore >= 10) heatmapIntensity = "high";
          else if (obs.priorityScore >= 5) heatmapIntensity = "medium";
          else heatmapIntensity = "low";
        }

        nodes.push({
          id: step.id,
          type: "stepNode",
          position: {
            x: step.position_x || 100,
            y: step.position_y || yOffset + 50,
          },
          data: {
            step,
            isSelected: selectedStepId === step.id,
            observationCount: obs.count,
            priorityScore: obs.priorityScore,
            heatmapIntensity,
            onClick: () => onStepClick?.(step.id),
          },
        });
      });
    });

    return nodes;
  }, [swimlanes, observations, selectedStepId, showHeatmap, onStepClick]);

  // Generate edges
  const initialEdges: Edge[] = useMemo(() => {
    return connections.map((conn, idx) => ({
      id: `edge-${idx}`,
      source: conn.source,
      target: conn.target,
      type: "smoothstep",
      animated: false,
      style: { stroke: "#545454", strokeWidth: 2 },
    }));
  }, [connections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when props change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  return (
    <div className="h-full w-full relative">
      {/* Swimlane Labels */}
      <div className="absolute left-0 top-0 bottom-0 w-32 z-10 bg-white border-r border-border">
        {swimlanes.map((lane) => {
          const colors = SWIMLANE_COLORS[lane.name] || {
            bg: "#F1F5F9",
            border: "#94A3B8",
          };
          return (
            <div
              key={lane.name}
              className="flex items-center justify-center border-b"
              style={{
                height: SWIMLANE_HEIGHT,
                backgroundColor: colors.bg,
                borderLeftWidth: 4,
                borderLeftColor: colors.border,
              }}
            >
              <span className="font-medium text-sm text-brand-navy -rotate-0 whitespace-nowrap">
                {lane.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* React Flow Canvas */}
      <div className="absolute left-32 right-0 top-0 bottom-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#e5e7eb" gap={20} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(node) => {
              const intensity = node.data?.heatmapIntensity;
              if (intensity === "critical") return "#EF4444";
              if (intensity === "high") return "#F97316";
              if (intensity === "medium") return "#EAB308";
              if (intensity === "low") return "#22C55E";
              return "#94A3B8";
            }}
            maskColor="rgba(255, 255, 255, 0.8)"
            className="bg-white border border-border rounded-lg"
          />

          {/* Heatmap Toggle Panel */}
          <Panel position="top-right" className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white rounded-lg border border-border px-3 py-2 shadow-sm">
              <Flame className={`h-4 w-4 ${showHeatmap ? "text-orange-500" : "text-muted-foreground"}`} />
              <Label htmlFor="heatmap-toggle" className="text-sm font-medium cursor-pointer">
                Heatmap
              </Label>
              <Switch
                id="heatmap-toggle"
                checked={showHeatmap}
                onCheckedChange={onToggleHeatmap}
              />
            </div>
          </Panel>

          {/* Legend */}
          {showHeatmap && (
            <Panel position="bottom-right" className="bg-white rounded-lg border border-border p-3 shadow-sm">
              <p className="text-xs font-medium mb-2">Priority Score</p>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-green-50 border-green-500 text-green-700 text-xs">
                  Low (1-4)
                </Badge>
                <Badge variant="outline" className="bg-yellow-50 border-yellow-500 text-yellow-700 text-xs">
                  Medium (5-9)
                </Badge>
                <Badge variant="outline" className="bg-orange-50 border-orange-500 text-orange-700 text-xs">
                  High (10-14)
                </Badge>
                <Badge variant="outline" className="bg-red-50 border-red-500 text-red-700 text-xs">
                  Critical (15+)
                </Badge>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}

