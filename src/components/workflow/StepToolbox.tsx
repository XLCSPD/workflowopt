"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { StepType } from "@/types";
import { cn } from "@/lib/utils";
import { Play, Square, Diamond, CircleDot, MousePointer2 } from "lucide-react";

export const STEP_TOOLBOX_MIME = "application/x-workflow-step-type";

type Tool = {
  type: StepType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const TOOLS: Tool[] = [
  { type: "start", label: "Start", icon: Play },
  { type: "action", label: "Action", icon: MousePointer2 },
  { type: "decision", label: "Decision", icon: Diamond },
  { type: "subprocess", label: "Subprocess", icon: CircleDot },
  { type: "end", label: "End", icon: Square },
];

export function StepToolbox({ className }: { className?: string }) {
  return (
    <Card className={cn("p-2 bg-brand-platinum/60 border", className)}>
      <div className="flex items-center gap-2">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <Button
              key={t.type}
              type="button"
              variant="outline"
              size="sm"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(STEP_TOOLBOX_MIME, t.type);
                e.dataTransfer.effectAllowed = "copy";
              }}
              className="bg-white"
              title="Drag onto canvas"
            >
              <Icon className="h-4 w-4 mr-2 text-brand-navy" />
              <span className="text-sm">{t.label}</span>
            </Button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Drag a step type onto the canvas to add it.
      </p>
    </Card>
  );
}
