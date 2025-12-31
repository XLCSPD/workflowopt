"use client";

/**
 * CopyWorkflowDialog
 * Implements AC-2.1/2.2/2.3, AC-5.1/5.2 from PRD_Copy_Workflow_Feature.md
 * 
 * - Modal that opens without navigation (AC-2.1)
 * - Default name: "{Original} (Copy)" (AC-2.2)
 * - Source selection: Current vs Future State (AC-2.3)
 * - Redirect to edit mode on success (AC-5.1)
 * - Toast messaging (AC-5.2)
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Copy, GitBranch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  copyWorkflow,
  getWorkflowFutureStates,
  generateCopyName,
  type FutureStateSource,
  type CopySourceType,
} from "@/lib/services/workflowCopy";

interface CopyWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: {
    id: string;
    name: string;
    description?: string;
  };
  /** Callback after successful copy - can be used to refresh list */
  onSuccess?: (newWorkflowId: string) => void;
}

export function CopyWorkflowDialog({
  open,
  onOpenChange,
  workflow,
  onSuccess,
}: CopyWorkflowDialogProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<CopySourceType>("current");
  const [selectedFutureStateId, setSelectedFutureStateId] = useState<string | null>(null);

  // Loading states
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [futureStates, setFutureStates] = useState<FutureStateSource[]>([]);

  // Initialize form when dialog opens (AC-2.2: default name)
  useEffect(() => {
    if (open) {
      setName(generateCopyName(workflow.name));
      setSourceType("current");
      setSelectedFutureStateId(null);
      setIsSubmitting(false);

      // Fetch future states for source selection (AC-2.3)
      setIsLoadingSources(true);
      getWorkflowFutureStates(workflow.id)
        .then((states) => {
          setFutureStates(states);
        })
        .catch(console.error)
        .finally(() => setIsLoadingSources(false));
    }
  }, [open, workflow.id, workflow.name]);

  // Handle source type change
  const handleSourceTypeChange = useCallback((value: string) => {
    if (value === "current") {
      setSourceType("current");
      setSelectedFutureStateId(null);
    } else {
      // value is a future state ID
      setSourceType("future_state");
      setSelectedFutureStateId(value);
    }
  }, []);

  // Handle copy submission
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Please enter a name for the copied workflow.",
      });
      return;
    }

    setIsSubmitting(true);

    const result = await copyWorkflow({
      sourceProcessId: workflow.id,
      newName: name.trim(),
      sourceType,
      futureStateId: selectedFutureStateId || undefined,
    });

    if (!result.success) {
      setIsSubmitting(false);
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: result.error || "Could not copy workflow. Please try again.",
      });
      return;
    }

    // Success (AC-5.2: confirmation message)
    toast({
      title: "Workflow copied",
      description: "You're now editing a copy — the original remains unchanged.",
    });

    onOpenChange(false);
    onSuccess?.(result.newWorkflowId!);

    // Redirect to new workflow in edit mode (AC-5.1)
    router.push(`/workflows/${result.newWorkflowId}?mode=edit`);
  };

  const currentSourceValue = sourceType === "current" ? "current" : selectedFutureStateId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-brand-gold" />
            Copy Workflow
          </DialogTitle>
          <DialogDescription>
            Create a new workflow based on &quot;{workflow.name}&quot;. The copy will include all
            steps, connections, and swimlanes, but no session or observation data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Workflow Name */}
          <div className="space-y-2">
            <Label htmlFor="copy-name">New Workflow Name</Label>
            <Input
              id="copy-name"
              placeholder="Enter name for the copy..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          {/* Source Selection (AC-2.3) */}
          <div className="space-y-2">
            <Label>Copy From</Label>
            {isLoadingSources ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading sources...
              </div>
            ) : (
              <Select
                value={currentSourceValue || "current"}
                onValueChange={handleSourceTypeChange}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4" />
                      Current State
                    </div>
                  </SelectItem>
                  {futureStates.length > 0 && (
                    <>
                      {futureStates.map((fs) => (
                        <SelectItem key={fs.id} value={fs.id}>
                          <div className="flex items-center gap-2">
                            <span className="text-brand-gold">⚡</span>
                            {fs.name} (v{fs.version}) - {fs.node_count} nodes
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              {sourceType === "current"
                ? "Copy will duplicate the current workflow structure."
                : "Copy will create a new workflow from the selected future state design."}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim()}
            className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Copying...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Workflow
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

