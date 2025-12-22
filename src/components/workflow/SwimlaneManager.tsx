"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ProcessLane, ProcessStep } from "@/types";
import { GripVertical, Plus, Trash2 } from "lucide-react";

type LaneColorOption = {
  id: string;
  label: string;
  bg: string | null;
  border: string | null;
};

const LANE_COLOR_OPTIONS: LaneColorOption[] = [
  { id: "default", label: "Default", bg: null, border: null },
  { id: "blue", label: "Blue", bg: "#DBEAFE", border: "#3B82F6" },
  { id: "green", label: "Green", bg: "#DCFCE7", border: "#22C55E" },
  { id: "amber", label: "Amber", bg: "#FEF3C7", border: "#F59E0B" },
  { id: "pink", label: "Pink", bg: "#FCE7F3", border: "#EC4899" },
  { id: "indigo", label: "Indigo", bg: "#E0E7FF", border: "#6366F1" },
  { id: "cyan", label: "Cyan", bg: "#CFFAFE", border: "#06B6D4" },
  { id: "red", label: "Red", bg: "#FEE2E2", border: "#EF4444" },
  { id: "purple", label: "Purple", bg: "#F3E8FF", border: "#A855F7" },
];

function laneColorIdForLane(lane: ProcessLane): string {
  const bg = lane.bg_color ?? null;
  const border = lane.border_color ?? null;
  const match = LANE_COLOR_OPTIONS.find((o) => o.bg === bg && o.border === border);
  return match?.id ?? "default";
}

function SortableLaneRow({
  lane,
  disabled,
  stepsInLane,
  onRename,
  onDelete,
  onDeleteMoveSteps,
  destinationLanes,
  onColorChange,
}: {
  lane: ProcessLane;
  disabled: boolean;
  stepsInLane: number;
  onRename: (laneId: string, oldName: string, newName: string) => void;
  onDelete: (laneId: string) => void;
  onDeleteMoveSteps: (laneId: string, destinationLaneId: string) => void;
  destinationLanes: ProcessLane[];
  onColorChange: (laneId: string, colors: { bg_color: string | null; border_color: string | null }) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lane.id,
    disabled,
  });

  const [draft, setDraft] = useState(lane.name);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteDestinationId, setDeleteDestinationId] = useState<string | null>(null);

  useEffect(() => {
    setDraft(lane.name);
  }, [lane.name]);

  useEffect(() => {
    if (!deleteOpen) return;
    const first = destinationLanes[0]?.id ?? null;
    setDeleteDestinationId(first);
  }, [deleteOpen, destinationLanes]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-background px-3 py-2",
        isDragging && "opacity-70"
      )}
    >
      <button
        type="button"
        className={cn(
          "text-muted-foreground hover:text-foreground",
          disabled && "opacity-40 cursor-not-allowed"
        )}
        aria-label="Reorder lane"
        {...attributes}
        {...listeners}
        disabled={disabled}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1">
        <Input
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const next = draft.trim();
            if (!next) {
              setDraft(lane.name);
              return;
            }
            if (next !== lane.name) onRename(lane.id, lane.name, next);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setDraft(lane.name);
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="h-9"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {stepsInLane} step{stepsInLane === 1 ? "" : "s"}
        </p>
      </div>

      <div className="w-[140px]">
        <Select
          value={laneColorIdForLane(lane)}
          disabled={disabled}
          onValueChange={(val) => {
            const opt = LANE_COLOR_OPTIONS.find((o) => o.id === val);
            if (!opt) return;
            onColorChange(lane.id, { bg_color: opt.bg, border_color: opt.border });
          }}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Color" />
          </SelectTrigger>
          <SelectContent>
            {LANE_COLOR_OPTIONS.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-sm border"
                    style={{
                      backgroundColor: o.bg ?? "transparent",
                      borderColor: o.border ?? "hsl(var(--border))",
                    }}
                  />
                  <span>{o.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || (stepsInLane > 0 && destinationLanes.length === 0)}
        onClick={() => {
          if (stepsInLane > 0) {
            setDeleteOpen(true);
          } else {
            onDelete(lane.id);
          }
        }}
        title={
          stepsInLane > 0
            ? destinationLanes.length === 0
              ? "Add another lane to move steps into"
              : "Move steps to another lane and delete"
            : "Delete lane"
        }
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete swimlane</DialogTitle>
            <DialogDescription>
              This lane has {stepsInLane} step{stepsInLane === 1 ? "" : "s"}. Choose where to move them, then delete the
              lane.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Move steps to</Label>
            <Select
              value={deleteDestinationId ?? ""}
              onValueChange={(v) => setDeleteDestinationId(v)}
              disabled={disabled || destinationLanes.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a destination lane" />
              </SelectTrigger>
              <SelectContent>
                {destinationLanes.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={disabled || !deleteDestinationId}
              onClick={() => {
                if (!deleteDestinationId) return;
                onDeleteMoveSteps(lane.id, deleteDestinationId);
                setDeleteOpen(false);
              }}
            >
              Move steps and delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function SwimlaneManager({
  open,
  onOpenChange,
  lanes,
  steps,
  isSaving,
  onAddLane,
  onReorder,
  onRename,
  onDelete,
  onDeleteMoveSteps,
  onUpdateLaneColor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lanes: ProcessLane[];
  steps: ProcessStep[];
  isSaving: boolean;
  onAddLane: (name: string) => Promise<void>;
  onReorder: (orderedLaneIds: string[]) => Promise<void>;
  onRename: (laneId: string, oldName: string, newName: string) => Promise<void>;
  onDelete: (laneId: string) => Promise<void>;
  onDeleteMoveSteps: (laneId: string, destinationLaneId: string) => Promise<void>;
  onUpdateLaneColor: (laneId: string, colors: { bg_color: string | null; border_color: string | null }) => Promise<void>;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const [localIds, setLocalIds] = useState<string[]>(lanes.map((l) => l.id));
  const [newLaneName, setNewLaneName] = useState("");

  useEffect(() => {
    setLocalIds(lanes.map((l) => l.id));
  }, [lanes]);

  const lanesById = useMemo(() => new Map(lanes.map((l) => [l.id, l])), [lanes]);

  const orderedLanes = useMemo(() => {
    return localIds.map((id) => lanesById.get(id)).filter(Boolean) as ProcessLane[];
  }, [lanesById, localIds]);

  const stepsByLane = useMemo(() => {
    const map: Record<string, number> = {};
    steps.forEach((s) => {
      map[s.lane] = (map[s.lane] || 0) + 1;
    });
    return map;
  }, [steps]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const oldIndex = localIds.indexOf(String(active.id));
    const newIndex = localIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(localIds, oldIndex, newIndex);
    setLocalIds(next);
    await onReorder(next);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:w-[520px]">
        <SheetHeader>
          <SheetTitle>Swimlanes</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-lane">Add swimlane</Label>
            <div className="flex gap-2">
              <Input
                id="new-lane"
                value={newLaneName}
                placeholder="e.g., Finance"
                disabled={isSaving}
                onChange={(e) => setNewLaneName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const name = newLaneName.trim();
                    if (!name) return;
                    void onAddLane(name).then(() => setNewLaneName(""));
                  }
                }}
              />
              <Button
                type="button"
                className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                disabled={isSaving || !newLaneName.trim()}
                onClick={() => {
                  const name = newLaneName.trim();
                  if (!name) return;
                  void onAddLane(name).then(() => setNewLaneName(""));
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: lane order is shared across your org for this workflow.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Drag to reorder. Rename inline (updates all steps in that lane).
            </p>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={localIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {orderedLanes.map((lane) => {
                    const stepsInLane = stepsByLane[lane.name] || 0;
                    const destinationLanes = orderedLanes.filter((l) => l.id !== lane.id);

                    return (
                      <SortableLaneRow
                        key={lane.id}
                        lane={lane}
                        disabled={isSaving}
                        stepsInLane={stepsInLane}
                        destinationLanes={destinationLanes}
                        onRename={(laneId, oldName, newName) => void onRename(laneId, oldName, newName)}
                        onDelete={(laneId) => void onDelete(laneId)}
                        onDeleteMoveSteps={(laneId, destinationLaneId) =>
                          void onDeleteMoveSteps(laneId, destinationLaneId)
                        }
                        onColorChange={(laneId, colors) => void onUpdateLaneColor(laneId, colors)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              Lanes with steps can be deleted by moving those steps into another lane.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
