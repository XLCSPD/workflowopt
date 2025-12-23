"use client";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Plus,
  Play,
  Square,
  Diamond,
  CircleDot,
  Octagon,
  Layers,
  StickyNote,
  LayoutGrid,
  Maximize2,
  ZoomIn,
  Undo2,
  Redo2,
} from "lucide-react";
import type { StepType } from "@/types";

interface CanvasContextMenuProps {
  children: React.ReactNode;
  position: { x: number; y: number };
  onAddStep: (type: StepType, position: { x: number; y: number }) => void;
  onAddLane: () => void;
  onAddNote: (position: { x: number; y: number }) => void;
  onAutoLayout: () => void;
  onFitView: () => void;
  onResetZoom: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  disabled?: boolean;
}

const stepTypes: { type: StepType; label: string; icon: typeof Square }[] = [
  { type: "start", label: "Start", icon: Play },
  { type: "action", label: "Task", icon: Square },
  { type: "decision", label: "Decision", icon: Diamond },
  { type: "subprocess", label: "Subprocess", icon: CircleDot },
  { type: "end", label: "End", icon: Octagon },
];

export function CanvasContextMenu({
  children,
  position,
  onAddStep,
  onAddLane,
  onAddNote,
  onAutoLayout,
  onFitView,
  onResetZoom,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  disabled = false,
}: CanvasContextMenuProps) {
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Plus className="h-4 w-4 mr-2" />
            Add Step Here
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {stepTypes.map((step) => {
              const Icon = step.icon;
              return (
                <ContextMenuItem
                  key={step.type}
                  onClick={() => onAddStep(step.type, position)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {step.label}
                </ContextMenuItem>
              );
            })}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem onClick={onAddLane}>
          <Layers className="h-4 w-4 mr-2" />
          Add Swimlane
        </ContextMenuItem>

        <ContextMenuItem onClick={() => onAddNote(position)}>
          <StickyNote className="h-4 w-4 mr-2" />
          Add Note Here
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onAutoLayout}>
          <LayoutGrid className="h-4 w-4 mr-2" />
          Auto Layout
        </ContextMenuItem>

        <ContextMenuItem onClick={onFitView}>
          <Maximize2 className="h-4 w-4 mr-2" />
          Fit View
        </ContextMenuItem>

        <ContextMenuItem onClick={onResetZoom}>
          <ZoomIn className="h-4 w-4 mr-2" />
          Reset Zoom
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onUndo} disabled={!canUndo}>
          <Undo2 className="h-4 w-4 mr-2" />
          Undo
          <span className="ml-auto text-xs text-muted-foreground">⌘Z</span>
        </ContextMenuItem>

        <ContextMenuItem onClick={onRedo} disabled={!canRedo}>
          <Redo2 className="h-4 w-4 mr-2" />
          Redo
          <span className="ml-auto text-xs text-muted-foreground">⌘⇧Z</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

