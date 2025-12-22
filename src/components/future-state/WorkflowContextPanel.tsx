"use client";

import { MiniProcessMap } from "./MiniProcessMap";
import type { ProcessStep, ObservationWithWasteTypes } from "@/types";

interface WorkflowContextPanelProps {
  sessionId: string;
  currentSteps: ProcessStep[];
  connections: Array<{ source: string; target: string }>;
  observations: ObservationWithWasteTypes[];
  onStepClick?: (stepId: string) => void;
  highlightedStepId?: string | null;
  impactedStepIds?: string[];
  onViewSession?: () => void;
}

export function WorkflowContextPanel({
  sessionId,
  currentSteps,
  connections,
  observations,
  onStepClick,
  highlightedStepId,
  impactedStepIds = [],
  onViewSession,
}: WorkflowContextPanelProps) {
  return (
    <MiniProcessMap
      sessionId={sessionId}
      currentSteps={currentSteps}
      connections={connections}
      observations={observations}
      impactedStepIds={impactedStepIds}
      highlightedStepId={highlightedStepId}
      onStepClick={onStepClick}
      onViewSession={onViewSession}
    />
  );
}
