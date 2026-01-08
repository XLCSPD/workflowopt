"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, GripVertical, ArrowDownToLine, ArrowUpFromLine, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  getStepIO,
  createStepIO,
  updateStepIO,
  deleteStepIO,
} from "@/lib/services/informationFlows";
import type { StepIOWithFlow, IOType, InformationFlowWithRelations, CreateStepIOInput } from "@/types";

interface StepIOPanelProps {
  stepId: string;
  stepName: string;
  informationFlows?: InformationFlowWithRelations[];
  className?: string;
  defaultOpen?: boolean;
}

interface IOItemFormData {
  name: string;
  description: string;
  data_type: string;
  source_destination: string;
  is_required: boolean;
  linked_flow_id: string;
}

const DEFAULT_FORM_DATA: IOItemFormData = {
  name: "",
  description: "",
  data_type: "",
  source_destination: "",
  is_required: true,
  linked_flow_id: "",
};

export function StepIOPanel({
  stepId,
  stepName,
  informationFlows = [],
  className,
  defaultOpen = false,
}: StepIOPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [ioItems, setIoItems] = useState<StepIOWithFlow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState<IOType | null>(null);
  const [formData, setFormData] = useState<IOItemFormData>(DEFAULT_FORM_DATA);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load step I/O items
  const loadStepIO = useCallback(async () => {
    if (!stepId) return;
    setIsLoading(true);
    try {
      const items = await getStepIO(stepId);
      setIoItems(items);
    } catch (error) {
      console.error("Failed to load step I/O:", error);
    } finally {
      setIsLoading(false);
    }
  }, [stepId]);

  useEffect(() => {
    if (isOpen) {
      loadStepIO();
    }
  }, [isOpen, loadStepIO]);

  // Filter flows that can be linked (incoming for inputs, outgoing for outputs)
  const getAvailableFlows = (ioType: IOType) => {
    return informationFlows.filter((flow) => {
      if (ioType === "input") {
        // For inputs, show flows where this step is the target
        return flow.target_step_id === stepId;
      } else {
        // For outputs, show flows where this step is the source
        return flow.source_step_id === stepId;
      }
    });
  };

  const handleStartAdd = (ioType: IOType) => {
    setIsAdding(ioType);
    setFormData(DEFAULT_FORM_DATA);
    setEditingId(null);
  };

  const handleStartEdit = (item: StepIOWithFlow) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      description: item.description || "",
      data_type: item.data_type || "",
      source_destination: item.source_destination || "",
      is_required: item.is_required,
      linked_flow_id: item.linked_flow_id || "",
    });
    setIsAdding(null);
  };

  const handleCancel = () => {
    setIsAdding(null);
    setEditingId(null);
    setFormData(DEFAULT_FORM_DATA);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setIsSaving(true);
    try {
      if (editingId) {
        // Update existing
        await updateStepIO(editingId, {
          name: formData.name,
          description: formData.description || undefined,
          data_type: formData.data_type || undefined,
          source_destination: formData.source_destination || undefined,
          is_required: formData.is_required,
          linked_flow_id: formData.linked_flow_id || undefined,
        });
      } else if (isAdding) {
        // Create new
        const input: CreateStepIOInput = {
          step_id: stepId,
          io_type: isAdding,
          name: formData.name,
          description: formData.description || undefined,
          data_type: formData.data_type || undefined,
          source_destination: formData.source_destination || undefined,
          is_required: formData.is_required,
          linked_flow_id: formData.linked_flow_id || undefined,
          order_index: ioItems.filter((i) => i.io_type === isAdding).length,
        };
        await createStepIO(input);
      }

      await loadStepIO();
      handleCancel();
    } catch (error) {
      console.error("Failed to save step I/O:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteStepIO(itemId);
      await loadStepIO();
    } catch (error) {
      console.error("Failed to delete step I/O:", error);
    }
  };

  const inputs = ioItems.filter((i) => i.io_type === "input");
  const outputs = ioItems.filter((i) => i.io_type === "output");

  const renderIOItem = (item: StepIOWithFlow) => {
    const isEditing = editingId === item.id;
    const availableFlows = getAvailableFlows(item.io_type);

    if (isEditing) {
      return renderForm(item.io_type, availableFlows);
    }

    return (
      <div
        key={item.id}
        className={cn(
          "flex items-start gap-2 p-2 rounded-md border bg-muted/30",
          "hover:bg-muted/50 transition-colors group"
        )}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 cursor-grab" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{item.name}</span>
            {item.is_required && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                Required
              </Badge>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {item.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {item.data_type && <span className="bg-muted px-1 rounded">{item.data_type}</span>}
            {item.source_destination && <span>from {item.source_destination}</span>}
            {item.linked_flow && (
              <span className="flex items-center gap-1 text-blue-600">
                <Link2 className="h-3 w-3" />
                {item.linked_flow.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => handleStartEdit(item)}
          >
            <span className="sr-only">Edit</span>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {item.io_type}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove &quot;{item.name}&quot; from the step. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  };

  const renderForm = (ioType: IOType, availableFlows: InformationFlowWithRelations[]) => (
    <div className="p-3 rounded-md border bg-white space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={ioType === "input" ? "Customer Order" : "Processed Data"}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data Type</Label>
          <Select
            value={formData.data_type}
            onValueChange={(value) => setFormData({ ...formData, data_type: value })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="form">Form</SelectItem>
              <SelectItem value="document">Document</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="database">Database Record</SelectItem>
              <SelectItem value="api">API Data</SelectItem>
              <SelectItem value="file">File</SelectItem>
              <SelectItem value="verbal">Verbal</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">
          {ioType === "input" ? "Source" : "Destination"}
        </Label>
        <Input
          value={formData.source_destination}
          onChange={(e) => setFormData({ ...formData, source_destination: e.target.value })}
          placeholder={ioType === "input" ? "e.g., Customer Portal" : "e.g., ERP System"}
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Description</Label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description..."
          className="h-8 text-sm"
        />
      </div>

      {availableFlows.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs">Link to Information Flow</Label>
          <Select
            value={formData.linked_flow_id || "none"}
            onValueChange={(value) => setFormData({ ...formData, linked_flow_id: value === "none" ? "" : value })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select flow (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {availableFlows.map((flow) => (
                <SelectItem key={flow.id} value={flow.id}>
                  {flow.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            id={`required-${ioType}`}
            checked={formData.is_required}
            onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
          />
          <Label htmlFor={`required-${ioType}`} className="text-xs cursor-pointer">
            Required
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving || !formData.name.trim()}>
            {isSaving ? "Saving..." : editingId ? "Update" : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center justify-between p-3 rounded-lg border",
            "hover:bg-muted/50 transition-colors text-left",
            isOpen && "bg-muted/30"
          )}
        >
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              <ArrowDownToLine className="h-4 w-4 text-green-600" />
              <ArrowUpFromLine className="h-4 w-4 text-blue-600" />
            </div>
            <span className="font-medium text-sm">Inputs & Outputs</span>
            {(inputs.length > 0 || outputs.length > 0) && (
              <Badge variant="secondary" className="text-xs">
                I:{inputs.length} O:{outputs.length}
              </Badge>
            )}
          </div>
          <svg
            className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-3 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : (
          <>
            {/* Inputs Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowDownToLine className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Inputs</span>
                  <span className="text-xs text-muted-foreground">
                    (What does {stepName} receive?)
                  </span>
                </div>
                {isAdding !== "input" && !editingId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStartAdd("input")}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Input
                  </Button>
                )}
              </div>

              <div className="space-y-2 pl-6">
                {inputs.map(renderIOItem)}
                {isAdding === "input" && renderForm("input", getAvailableFlows("input"))}
                {inputs.length === 0 && isAdding !== "input" && (
                  <p className="text-xs text-muted-foreground italic py-2">
                    No inputs defined. Click &quot;Add Input&quot; to add one.
                  </p>
                )}
              </div>
            </div>

            {/* Outputs Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowUpFromLine className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Outputs</span>
                  <span className="text-xs text-muted-foreground">
                    (What does {stepName} produce?)
                  </span>
                </div>
                {isAdding !== "output" && !editingId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStartAdd("output")}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Output
                  </Button>
                )}
              </div>

              <div className="space-y-2 pl-6">
                {outputs.map(renderIOItem)}
                {isAdding === "output" && renderForm("output", getAvailableFlows("output"))}
                {outputs.length === 0 && isAdding !== "output" && (
                  <p className="text-xs text-muted-foreground italic py-2">
                    No outputs defined. Click &quot;Add Output&quot; to add one.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
