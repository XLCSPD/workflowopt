"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Play,
  Square,
  Diamond,
  CircleDot,
  Octagon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  StickyNote,
  Shield,
  Lightbulb,
  AlertTriangle,
  Info,
  Plus,
  GripVertical,
  Layers,
  MessageSquare,
  MousePointer2,
} from "lucide-react";
// Note: useDesignStudio will be used when full context integration is ready
// import { useDesignStudio } from "./DesignStudioContext";
import type { StepType } from "@/types";
import type { AnnotationType, LaneColor, FutureStateLane, ActiveTool } from "@/types/design-studio";

// ============================================
// CONSTANTS
// ============================================

export const STEP_TOOLBOX_MIME = "application/x-future-state-step-type";
export const ANNOTATION_TOOLBOX_MIME = "application/x-future-state-annotation-type";

interface StepToolItem {
  type: StepType;
  label: string;
  icon: typeof Play;
  description: string;
}

interface AnnotationToolItem {
  type: AnnotationType;
  label: string;
  icon: typeof StickyNote;
  color: string;
  description: string;
}

const STEP_TOOLS: StepToolItem[] = [
  { type: "start", label: "Start", icon: Play, description: "Process beginning" },
  { type: "action", label: "Task", icon: Square, description: "Work activity" },
  { type: "decision", label: "Decision", icon: Diamond, description: "Branching point" },
  { type: "subprocess", label: "Subprocess", icon: CircleDot, description: "Nested process" },
  { type: "end", label: "End", icon: Octagon, description: "Process completion" },
];

const ANNOTATION_TOOLS: AnnotationToolItem[] = [
  { type: "note", label: "Note", icon: StickyNote, color: "text-amber-600 bg-amber-50", description: "General notes" },
  { type: "guardrail", label: "Guardrail", icon: Shield, color: "text-red-600 bg-red-50", description: "Constraints & rules" },
  { type: "assumption", label: "Assumption", icon: Lightbulb, color: "text-blue-600 bg-blue-50", description: "Design assumptions" },
  { type: "risk", label: "Risk", icon: AlertTriangle, color: "text-orange-600 bg-orange-50", description: "Known risks" },
  { type: "instruction", label: "Instruction", icon: Info, color: "text-green-600 bg-green-50", description: "User guidance" },
];

const LANE_COLORS: { value: LaneColor; label: string; class: string }[] = [
  { value: "blue", label: "Blue", class: "bg-blue-400" },
  { value: "emerald", label: "Green", class: "bg-emerald-400" },
  { value: "amber", label: "Amber", class: "bg-amber-400" },
  { value: "purple", label: "Purple", class: "bg-purple-400" },
  { value: "rose", label: "Rose", class: "bg-rose-400" },
  { value: "slate", label: "Gray", class: "bg-slate-400" },
  { value: "cyan", label: "Cyan", class: "bg-cyan-400" },
  { value: "orange", label: "Orange", class: "bg-orange-400" },
];

// ============================================
// COMPONENT PROPS
// ============================================

interface FutureStateToolboxProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  lanes: FutureStateLane[];
  onAddLane: (name: string, color: LaneColor) => void;
  className?: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function FutureStateToolbox({
  isCollapsed,
  onToggleCollapse,
  lanes,
  onAddLane,
  className,
}: FutureStateToolboxProps) {
  // Local state for active tool (will be replaced by context when fully integrated)
  const [activeTool, setActiveTool] = useState<ActiveTool | null>(null);
  const [stepsOpen, setStepsOpen] = useState(true);
  const [lanesOpen, setLanesOpen] = useState(true);
  const [annotationsOpen, setAnnotationsOpen] = useState(true);
  const [newLaneName, setNewLaneName] = useState("");
  const [newLaneColor, setNewLaneColor] = useState<LaneColor>("blue");
  const [showAddLane, setShowAddLane] = useState(false);

  // Handle drag start for step types
  const handleStepDragStart = (e: React.DragEvent, stepType: StepType) => {
    e.dataTransfer.setData(STEP_TOOLBOX_MIME, stepType);
    e.dataTransfer.effectAllowed = "copy";
    
    // Set active tool for click-to-place mode
    setActiveTool({ type: "create_node", stepType });
  };

  // Handle drag start for annotation types
  const handleAnnotationDragStart = (e: React.DragEvent, annotationType: AnnotationType) => {
    e.dataTransfer.setData(ANNOTATION_TOOLBOX_MIME, annotationType);
    e.dataTransfer.effectAllowed = "copy";
    
    // Set active tool for click-to-place mode
    setActiveTool({ type: "create_annotation", annotationType });
  };

  // Handle step tool click (for click-to-place mode)
  const handleStepClick = (stepType: StepType) => {
    if (activeTool?.type === "create_node" && activeTool.stepType === stepType) {
      // Deselect if clicking same tool
      setActiveTool(null);
    } else {
      setActiveTool({ type: "create_node", stepType });
    }
  };

  // Handle annotation tool click
  const handleAnnotationClick = (annotationType: AnnotationType) => {
    if (activeTool?.type === "create_annotation" && activeTool.annotationType === annotationType) {
      setActiveTool(null);
    } else {
      setActiveTool({ type: "create_annotation", annotationType });
    }
  };

  // Handle add lane
  const handleAddLane = () => {
    if (newLaneName.trim()) {
      onAddLane(newLaneName.trim(), newLaneColor);
      setNewLaneName("");
      setNewLaneColor("blue");
      setShowAddLane(false);
    }
  };

  // Collapsed view
  if (isCollapsed) {
    return (
      <div className={cn("flex flex-col items-center py-2 bg-white border-r w-10", className)}>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Expand Toolbox</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator className="my-2 w-6" />

        {/* Quick access icons when collapsed */}
        <TooltipProvider delayDuration={100}>
          <div className="flex flex-col gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8",
                    activeTool?.type === "select" && "bg-accent"
                  )}
                  onClick={() => setActiveTool({ type: "select" })}
                >
                  <MousePointer2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Select</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8",
                    activeTool?.type === "create_node" && "bg-accent"
                  )}
                >
                  <Square className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Add Step</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Layers className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Swimlanes</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8",
                    activeTool?.type === "create_annotation" && "bg-accent"
                  )}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Add Annotation</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    );
  }

  // Expanded view
  return (
    <div className={cn("flex flex-col bg-white border-r w-56", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-sm font-semibold text-brand-navy">Toolbox</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-6 w-6"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {/* Select Tool */}
        <Button
          variant={activeTool?.type === "select" || !activeTool ? "secondary" : "ghost"}
          size="sm"
          className="w-full justify-start"
          onClick={() => setActiveTool({ type: "select" })}
        >
          <MousePointer2 className="h-4 w-4 mr-2" />
          Select
        </Button>

        <Separator />

        {/* Steps Section */}
        <Collapsible open={stepsOpen} onOpenChange={setStepsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-1 px-1 hover:bg-accent rounded text-sm font-medium">
            <span>Steps</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", !stepsOpen && "-rotate-90")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1 space-y-1">
            {STEP_TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool?.type === "create_node" && 
                               activeTool.stepType === tool.type;
              
              return (
                <TooltipProvider key={tool.type} delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start cursor-grab active:cursor-grabbing"
                        draggable
                        onDragStart={(e) => handleStepDragStart(e, tool.type)}
                        onClick={() => handleStepClick(tool.type)}
                      >
                        <Icon className="h-4 w-4 mr-2 text-brand-navy" />
                        <span className="text-sm">{tool.label}</span>
                        {isActive && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            Active
                          </Badge>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{tool.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Drag or click, then click canvas
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Lanes Section */}
        <Collapsible open={lanesOpen} onOpenChange={setLanesOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-1 px-1 hover:bg-accent rounded text-sm font-medium">
            <span>Swimlanes</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", !lanesOpen && "-rotate-90")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1 space-y-1">
            {/* Existing lanes */}
            {lanes.length > 0 ? (
              <div className="space-y-1">
                {lanes.map((lane) => (
                  <div
                    key={lane.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded text-sm bg-accent/50"
                  >
                    <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        lane.color === "blue" && "bg-blue-400",
                        lane.color === "emerald" && "bg-emerald-400",
                        lane.color === "amber" && "bg-amber-400",
                        lane.color === "purple" && "bg-purple-400",
                        lane.color === "rose" && "bg-rose-400",
                        lane.color === "slate" && "bg-slate-400",
                        lane.color === "cyan" && "bg-cyan-400",
                        lane.color === "orange" && "bg-orange-400"
                      )}
                    />
                    <span className="truncate flex-1">{lane.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground px-2">
                No custom lanes yet
              </p>
            )}

            {/* Add lane form */}
            {showAddLane ? (
              <div className="space-y-2 p-2 bg-accent/30 rounded">
                <input
                  type="text"
                  placeholder="Lane name"
                  value={newLaneName}
                  onChange={(e) => setNewLaneName(e.target.value)}
                  className="w-full px-2 py-1 text-sm border rounded"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddLane();
                    if (e.key === "Escape") setShowAddLane(false);
                  }}
                />
                <div className="flex gap-1 flex-wrap">
                  {LANE_COLORS.map((color) => (
                    <button
                      key={color.value}
                      className={cn(
                        "w-5 h-5 rounded-full border-2",
                        color.class,
                        newLaneColor === color.value ? "border-brand-navy" : "border-transparent"
                      )}
                      onClick={() => setNewLaneColor(color.value)}
                      title={color.label}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="default" onClick={handleAddLane} className="flex-1">
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddLane(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => setShowAddLane(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Lane
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Annotations Section */}
        <Collapsible open={annotationsOpen} onOpenChange={setAnnotationsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-1 px-1 hover:bg-accent rounded text-sm font-medium">
            <span>Annotations</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", !annotationsOpen && "-rotate-90")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1 space-y-1">
            {ANNOTATION_TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool?.type === "create_annotation" && 
                               activeTool.annotationType === tool.type;
              
              return (
                <TooltipProvider key={tool.type} delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start cursor-grab active:cursor-grabbing"
                        draggable
                        onDragStart={(e) => handleAnnotationDragStart(e, tool.type)}
                        onClick={() => handleAnnotationClick(tool.type)}
                      >
                        <div className={cn("p-1 rounded mr-2", tool.color)}>
                          <Icon className="h-3 w-3" />
                        </div>
                        <span className="text-sm">{tool.label}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{tool.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Footer hint */}
      <div className="p-2 border-t bg-accent/30">
        <p className="text-xs text-muted-foreground text-center">
          Drag onto canvas or click to place
        </p>
      </div>
    </div>
  );
}

