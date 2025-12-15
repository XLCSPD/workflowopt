"use client";

import { useMemo, useEffect, useCallback, useRef, useState } from "react";
import ReactFlow, {
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useViewport,
  ReactFlowProvider,
  ReactFlowInstance,
  Node,
  Edge,
  NodeChange,
  ConnectionMode,
  Panel,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import Dagre from "@dagrejs/dagre";
import { StepNode } from "./StepNode";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Flame, LayoutGrid, RotateCcw, Lock, ZoomIn, ZoomOut } from "lucide-react";
import type { ProcessStep } from "@/types";

const nodeTypes = {
  stepNode: StepNode,
};

interface ProcessMapProps {
  workflowId: string;
  steps: ProcessStep[];
  connections: { source: string; target: string }[];
  observations?: Record<string, { count: number; priorityScore: number }>;
  selectedStepId?: string | null;
  onStepClick?: (stepId: string) => void;
  showHeatmap?: boolean;
  onToggleHeatmap?: (show: boolean) => void;
  isEditMode?: boolean;
  onConnect?: (sourceId: string, targetId: string) => void;
  onDeleteConnection?: (sourceId: string, targetId: string) => void;
  onReactFlowInit?: (instance: ReactFlowInstance) => void;
}

// Helper to get localStorage key for a workflow
function getLayoutStorageKey(workflowId: string): string {
  return `workflow-layout-${workflowId}`;
}

// Color palette for swimlanes - cycles through these colors for dynamic lanes
const SWIMLANE_COLOR_PALETTE = [
  { bg: "#DBEAFE", border: "#3B82F6" }, // Blue
  { bg: "#DCFCE7", border: "#22C55E" }, // Green
  { bg: "#FEF3C7", border: "#F59E0B" }, // Amber
  { bg: "#FCE7F3", border: "#EC4899" }, // Pink
  { bg: "#E0E7FF", border: "#6366F1" }, // Indigo
  { bg: "#CFFAFE", border: "#06B6D4" }, // Cyan
  { bg: "#FEE2E2", border: "#EF4444" }, // Red
  { bg: "#F3E8FF", border: "#A855F7" }, // Purple
];

// Get color for a swimlane based on its index
function getSwimlaneColor(laneName: string, laneIndex: number): { bg: string; border: string } {
  return SWIMLANE_COLOR_PALETTE[laneIndex % SWIMLANE_COLOR_PALETTE.length];
}

const SWIMLANE_HEIGHT = 120;
const NODE_WIDTH = 160;
const NODE_HEIGHT = 70;

// Calculate the Y center position for a swimlane
function getSwimlaneYCenter(laneIndex: number): number {
  return laneIndex * SWIMLANE_HEIGHT + SWIMLANE_HEIGHT / 2 - NODE_HEIGHT / 2;
}

// Auto-layout function using Dagre
function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  swimlanes: { name: string; steps: ProcessStep[] }[]
): { nodes: Node[]; edges: Edge[] } {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ 
    rankdir: "LR", 
    nodesep: 40, 
    ranksep: 80,
    marginx: 40,
    marginy: 20,
  });

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  // Run the layout algorithm
  Dagre.layout(g);

  // Create lane name to index mapping
  const laneIndexMap: Record<string, number> = {};
  swimlanes.forEach((lane, idx) => {
    laneIndexMap[lane.name] = idx;
  });

  // Apply layout positions while respecting swimlanes
  const layoutedNodes = nodes.map((node) => {
    const dagreNode = g.node(node.id);
    const lane = node.data.step?.lane;
    const laneIndex = laneIndexMap[lane] ?? 0;
    
    return {
      ...node,
      position: {
        x: dagreNode.x - NODE_WIDTH / 2,
        y: getSwimlaneYCenter(laneIndex),
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// Inner component that uses useReactFlow
function ProcessMapInner({
  workflowId,
  steps,
  connections,
  observations = {},
  selectedStepId,
  onStepClick,
  showHeatmap = false,
  onToggleHeatmap,
  isEditMode = false,
  onConnect,
  onDeleteConnection,
  onReactFlowInit,
}: ProcessMapProps) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const viewport = useViewport();
  
  // Use ref to avoid recreating nodes when onStepClick changes
  const onStepClickRef = useRef(onStepClick);
  onStepClickRef.current = onStepClick;

  // Track if layout has been saved
  const [hasLayoutSaved, setHasLayoutSaved] = useState(false);

  // Load saved positions from localStorage
  const savedPositions = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(getLayoutStorageKey(workflowId));
      if (saved) {
        return JSON.parse(saved) as Record<string, { x: number; y: number }>;
      }
    } catch (e) {
      console.error('Failed to load saved layout:', e);
    }
    return null;
  }, [workflowId]);

  // Check if we have a saved layout on mount
  useEffect(() => {
    setHasLayoutSaved(savedPositions !== null);
  }, [savedPositions]);

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

  // Create stable click handler
  const handleNodeClick = useCallback((stepId: string) => {
    onStepClickRef.current?.(stepId);
  }, []);

  // Generate initial node positions - now checks for saved positions first
  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];

    swimlanes.forEach((lane, laneIndex) => {
      lane.steps.forEach((step, stepIndex) => {
        // Check for saved position first
        const savedPos = savedPositions?.[step.id];
        
        nodes.push({
          id: step.id,
          type: "stepNode",
          position: savedPos || {
            x: step.position_x || (40 + stepIndex * (NODE_WIDTH + 40)),
            y: step.position_y || getSwimlaneYCenter(laneIndex),
          },
          data: {
            step,
            isSelected: false,
            observationCount: 0,
            priorityScore: 0,
            heatmapIntensity: undefined,
            onClick: () => handleNodeClick(step.id),
          },
        });
      });
    });

    return nodes;
  }, [swimlanes, handleNodeClick, savedPositions]);

  // Generate edges
  const initialEdges: Edge[] = useMemo(() => {
    return connections.map((conn, idx) => ({
      id: `edge-${idx}`,
      source: conn.source,
      target: conn.target,
      type: "smoothstep",
      animated: false,
      style: { stroke: "#545454", strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#545454",
      },
    }));
  }, [connections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Only reset positions when steps data changes (not on selection/heatmap changes)
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Update node data (selection, heatmap, observations) without changing positions
  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        const obs = observations[node.id] || { count: 0, priorityScore: 0 };
        
        let heatmapIntensity: "low" | "medium" | "high" | "critical" | undefined;
        if (showHeatmap && obs.priorityScore > 0) {
          if (obs.priorityScore >= 15) heatmapIntensity = "critical";
          else if (obs.priorityScore >= 10) heatmapIntensity = "high";
          else if (obs.priorityScore >= 5) heatmapIntensity = "medium";
          else heatmapIntensity = "low";
        }

        return {
          ...node,
          data: {
            ...node.data,
            isSelected: selectedStepId === node.id,
            observationCount: obs.count,
            priorityScore: obs.priorityScore,
            heatmapIntensity,
          },
        };
      })
    );
  }, [selectedStepId, observations, showHeatmap, setNodes]);

  // Save layout to localStorage
  const saveLayout = useCallback((nodesToSave: Node[]) => {
    if (typeof window === 'undefined') return;
    try {
      const positions: Record<string, { x: number; y: number }> = {};
      nodesToSave.forEach((node) => {
        positions[node.id] = node.position;
      });
      localStorage.setItem(getLayoutStorageKey(workflowId), JSON.stringify(positions));
      setHasLayoutSaved(true);
    } catch (e) {
      console.error('Failed to save layout:', e);
    }
  }, [workflowId]);

  // Clear saved layout
  const clearLayout = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(getLayoutStorageKey(workflowId));
      setHasLayoutSaved(false);
      // Reset to initial positions
      const resetNodes: Node[] = [];
      swimlanes.forEach((lane, laneIndex) => {
        lane.steps.forEach((step, stepIndex) => {
          resetNodes.push({
            id: step.id,
            type: "stepNode",
            position: {
              x: step.position_x || (40 + stepIndex * (NODE_WIDTH + 40)),
              y: step.position_y || getSwimlaneYCenter(laneIndex),
            },
            data: {
              step,
              isSelected: selectedStepId === step.id,
              observationCount: observations[step.id]?.count || 0,
              priorityScore: observations[step.id]?.priorityScore || 0,
              heatmapIntensity: undefined,
              onClick: () => handleNodeClick(step.id),
            },
          });
        });
      });
      setNodes(resetNodes);
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 50);
    } catch (e) {
      console.error('Failed to clear layout:', e);
    }
  }, [workflowId, swimlanes, selectedStepId, observations, handleNodeClick, setNodes, fitView]);

  // Handle node changes - save when dragging ends
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      
      // Check if any node finished dragging
      const dragEnd = changes.some(
        (change) => change.type === 'position' && change.dragging === false
      );
      
      if (dragEnd) {
        // Save after a small delay to get final positions
        setTimeout(() => {
          setNodes((currentNodes) => {
            saveLayout(currentNodes);
            return currentNodes;
          });
        }, 50);
      }
    },
    [onNodesChange, saveLayout, setNodes]
  );

  // Auto-layout handler - now saves after layout
  const handleAutoLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      swimlanes
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    
    // Save the new layout
    saveLayout(layoutedNodes);
    
    // Fit view after layout with a small delay
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 300 });
    }, 50);
  }, [nodes, edges, swimlanes, setNodes, setEdges, fitView, saveLayout]);

  // Calculate the scaled height for each swimlane based on viewport zoom
  const scaledSwimlaneHeight = SWIMLANE_HEIGHT * viewport.zoom;

  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* Swimlane Labels - synced with React Flow viewport */}
      <div 
        className="absolute left-0 top-0 w-32 z-10 bg-white border-r border-border"
        style={{
          transform: `translateY(${viewport.y}px)`,
        }}
      >
        {swimlanes.map((lane, laneIndex) => {
          const colors = getSwimlaneColor(lane.name, laneIndex);
          return (
            <div
              key={lane.name}
              className="flex items-center justify-center border-b transition-all duration-75"
              style={{
                height: scaledSwimlaneHeight,
                backgroundColor: colors.bg,
                borderLeftWidth: 4,
                borderLeftColor: colors.border,
              }}
            >
              <span 
                className="font-medium text-brand-navy whitespace-nowrap"
                style={{
                  fontSize: `${Math.max(10, 14 * viewport.zoom)}px`,
                }}
              >
                {lane.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* React Flow Canvas */}
      <div className="absolute left-32 right-0 top-0 bottom-0">
        {/* Swimlane Background Bands - positioned in viewport space */}
        <div 
          className="absolute left-0 right-0 pointer-events-none z-0"
          style={{
            transform: `translateY(${viewport.y}px)`,
          }}
        >
          {swimlanes.map((lane, laneIndex) => {
            const colors = getSwimlaneColor(lane.name, laneIndex);
            return (
              <div
                key={lane.name}
                className="w-full border-b transition-all duration-75"
                style={{
                  height: scaledSwimlaneHeight,
                  backgroundColor: colors.bg,
                  opacity: 0.3,
                  borderColor: colors.border,
                  borderStyle: "dashed",
                }}
              />
            );
          })}
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={onReactFlowInit}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={isEditMode}
          nodesConnectable={isEditMode}
          elementsSelectable={isEditMode || !!onStepClick}
          onNodeClick={(_event, node) => {
            if (!isEditMode && onStepClick) {
              onStepClick(node.id);
            }
          }}
          onConnect={isEditMode ? (params) => {
            if (params.source && params.target && onConnect) {
              onConnect(params.source, params.target);
            }
          } : undefined}
          onEdgeClick={isEditMode ? (_event, edge) => {
            if (onDeleteConnection && confirm("Delete this connection?")) {
              onDeleteConnection(edge.source, edge.target);
            }
          } : undefined}
        >
          <Background color="#e5e7eb" gap={20} />
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

          {/* Controls Panel */}
          <Panel position="top-right" className="flex items-center gap-2">
            {isEditMode && (
              <div className="flex items-center gap-1 bg-orange-50 text-orange-700 rounded-lg border border-orange-200 px-2 py-1.5 shadow-sm">
                <span className="text-xs font-medium">Drag nodes to reposition. Click edges to delete.</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoLayout}
              className="bg-white shadow-sm"
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Auto Layout
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => zoomOut()}
              className="bg-white shadow-sm"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => zoomIn()}
              className="bg-white shadow-sm"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            {hasLayoutSaved && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearLayout}
                className="bg-white shadow-sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            )}
            {hasLayoutSaved && (
              <div className="flex items-center gap-1 bg-green-50 text-green-700 rounded-lg border border-green-200 px-2 py-1.5 shadow-sm">
                <Lock className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Layout Saved</span>
              </div>
            )}
            {!isEditMode && (
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
            )}
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

// Main exported component wrapped with ReactFlowProvider
export function ProcessMap(props: ProcessMapProps) {
  return (
    <ReactFlowProvider>
      <ProcessMapInner {...props} />
    </ReactFlowProvider>
  );
}

