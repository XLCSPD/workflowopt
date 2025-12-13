"use client";

import { Clock, User, Tag, Paperclip, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ProcessStep, ObservationWithWasteTypes } from "@/types";

interface StepDetailPanelProps {
  step: ProcessStep | null;
  observations: ObservationWithWasteTypes[];
  isOpen: boolean;
  onClose: () => void;
  onStartTagging: () => void;
  sessionActive?: boolean;
}

export function StepDetailPanel({
  step,
  observations,
  isOpen,
  onClose,
  onStartTagging,
  sessionActive = false,
}: StepDetailPanelProps) {
  if (!step) return null;

  const totalPriority = observations.reduce(
    (sum, obs) => sum + obs.priority_score,
    0
  );

  const wasteTypeCounts = observations.reduce((acc, obs) => {
    obs.waste_types?.forEach((wt) => {
      acc[wt.name] = (acc[wt.name] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[500px] p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-lg">{step.step_name}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{step.lane}</Badge>
                <Badge variant="secondary" className="capitalize">
                  {step.step_type}
                </Badge>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="p-6 space-y-6">
            {/* Description */}
            {step.description && (
              <div>
                <h4 className="text-sm font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            )}

            {/* Time Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Lead Time</span>
                </div>
                <p className="font-semibold">
                  {step.lead_time_minutes
                    ? `${step.lead_time_minutes} min`
                    : "Not set"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Cycle Time</span>
                </div>
                <p className="font-semibold">
                  {step.cycle_time_minutes
                    ? `${step.cycle_time_minutes} min`
                    : "Not set"}
                </p>
              </div>
            </div>

            <Separator />

            {/* Waste Summary */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Waste Observations
                </h4>
                <Badge
                  variant={observations.length > 0 ? "destructive" : "secondary"}
                >
                  {observations.length} observation
                  {observations.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              {observations.length > 0 ? (
                <div className="space-y-4">
                  {/* Priority Score */}
                  <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-orange-800">
                        Total Priority Score
                      </span>
                      <span className="text-2xl font-bold text-orange-600">
                        {totalPriority}
                      </span>
                    </div>
                  </div>

                  {/* Waste Type Breakdown */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Waste Types Identified
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(wasteTypeCounts).map(([name, count]) => (
                        <Badge key={name} variant="outline">
                          {name} ({count})
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Recent Observations */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Recent Observations
                    </p>
                    <div className="space-y-2">
                      {observations.slice(0, 3).map((obs) => (
                        <div
                          key={obs.id}
                          className="p-3 rounded-lg border bg-white text-sm"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {obs.user?.name || "Unknown"}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{
                                borderColor:
                                  obs.priority_score >= 15
                                    ? "#EF4444"
                                    : obs.priority_score >= 10
                                    ? "#F97316"
                                    : "#EAB308",
                              }}
                            >
                              Score: {obs.priority_score}
                            </Badge>
                          </div>
                          {obs.notes && (
                            <p className="text-muted-foreground line-clamp-2">
                              {obs.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No waste observations yet</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Attachments */}
            <div>
              <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                <Paperclip className="h-4 w-4" />
                Attachments
              </h4>
              <div className="text-center py-4 text-muted-foreground border-2 border-dashed rounded-lg">
                <p className="text-sm">No attachments</p>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <Button
            onClick={onStartTagging}
            className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
            disabled={!sessionActive}
          >
            {sessionActive ? (
              <>
                <Tag className="mr-2 h-4 w-4" />
                Tag Waste
              </>
            ) : (
              "Start a session to tag waste"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

