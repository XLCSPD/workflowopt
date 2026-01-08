"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import {
  Database,
  FileText,
  CheckCircle,
  Cpu,
  Bell,
  Trash2,
  Link2,
  AlertTriangle,
  Zap,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { FlowStylePicker } from "./FlowStylePicker";
import type {
  InformationFlowWithRelations,
  CreateInformationFlowInput,
  UpdateInformationFlowInput,
  FlowType,
  FlowStatus,
  WasteType,
  Observation,
  FlowStyleOverride,
} from "@/types";
import {
  FLOW_TYPE_CONFIG,
  QUALITY_THRESHOLDS,
  getQualityLevel,
  getQualityColor,
} from "@/types/informationFlow";
import { cn } from "@/lib/utils";

// Flow type icons
const FLOW_TYPE_ICONS: Record<FlowType, LucideIcon> = {
  data: Database,
  document: FileText,
  approval: CheckCircle,
  system: Cpu,
  notification: Bell,
};

// Form schema
const flowFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  flow_type: z.enum(["data", "document", "approval", "system", "notification"]),
  status: z.enum(["active", "deprecated", "proposed"]),
  volume_per_day: z.number().optional(),
  frequency: z.string().optional(),
  is_automated: z.boolean(),
  is_real_time: z.boolean(),
  completeness_score: z.number().min(1).max(5).optional(),
  accuracy_score: z.number().min(1).max(5).optional(),
  timeliness_score: z.number().min(1).max(5).optional(),
});

type FlowFormValues = z.infer<typeof flowFormSchema>;

interface FlowDetailPanelProps {
  // Mode: "create" for new flows, "edit" for existing flows
  mode: "create" | "edit";
  // For edit mode - the existing flow to edit
  flow?: InformationFlowWithRelations | null;
  // For create mode - the connection info
  sourceStepId?: string;
  targetStepId?: string;
  processId?: string;
  isOpen: boolean;
  onClose: () => void;
  // For create mode
  onCreate?: (input: CreateInformationFlowInput) => Promise<void>;
  // For edit mode
  onSave?: (flowId: string, updates: UpdateInformationFlowInput) => Promise<void>;
  onDelete?: (flowId: string) => Promise<void>;
  wasteTypes: WasteType[];
  observations: Observation[];
  sourceStepName?: string;
  targetStepName?: string;
}

export function FlowDetailPanel({
  mode,
  flow,
  sourceStepId,
  targetStepId,
  processId,
  isOpen,
  onClose,
  onCreate,
  onSave,
  onDelete,
  wasteTypes,
  observations,
  sourceStepName,
  targetStepName,
}: FlowDetailPanelProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedWasteTypeIds, setSelectedWasteTypeIds] = useState<string[]>([]);
  const [selectedObservationIds, setSelectedObservationIds] = useState<string[]>([]);
  const [styleOverride, setStyleOverride] = useState<FlowStyleOverride>({});

  const isCreateMode = mode === "create";

  const form = useForm<FlowFormValues>({
    resolver: zodResolver(flowFormSchema),
    defaultValues: {
      name: "",
      description: "",
      flow_type: "data",
      status: "active",
      is_automated: false,
      is_real_time: false,
    },
  });

  // Reset form when flow changes or when switching modes
  useEffect(() => {
    if (isCreateMode) {
      // Reset to defaults for create mode
      form.reset({
        name: "",
        description: "",
        flow_type: "data",
        status: "active",
        is_automated: false,
        is_real_time: false,
        completeness_score: 3,
        accuracy_score: 3,
        timeliness_score: 3,
      });
      setSelectedWasteTypeIds([]);
      setSelectedObservationIds([]);
      setStyleOverride({});
    } else if (flow) {
      // Populate from existing flow for edit mode
      // Use nullish coalescing to ensure boolean fields have valid values
      form.reset({
        name: flow.name || "",
        description: flow.description || "",
        flow_type: flow.flow_type || "data",
        status: flow.status || "active",
        volume_per_day: flow.volume_per_day ?? undefined,
        frequency: flow.frequency || "",
        is_automated: flow.is_automated ?? false,
        is_real_time: flow.is_real_time ?? false,
        completeness_score: flow.completeness_score ?? 3,
        accuracy_score: flow.accuracy_score ?? 3,
        timeliness_score: flow.timeliness_score ?? 3,
      });
      setSelectedWasteTypeIds(flow.waste_types?.map((w) => w.id) || []);
      setSelectedObservationIds(flow.observations?.map((o) => o.id) || []);
      setStyleOverride(flow.metadata?.style || {});
    }
  }, [flow, form, isCreateMode, isOpen]);

  const handleSubmit = async (values: FlowFormValues) => {
    console.log("FlowDetailPanel: handleSubmit called with values:", values);
    setIsSaving(true);
    try {
      if (isCreateMode) {
        // Create new flow
        if (!onCreate || !sourceStepId || !targetStepId || !processId) {
          console.error("Missing required props for create mode:", { onCreate: !!onCreate, sourceStepId, targetStepId, processId });
          return;
        }
        await onCreate({
          process_id: processId,
          source_step_id: sourceStepId,
          target_step_id: targetStepId,
          name: values.name,
          description: values.description,
          flow_type: values.flow_type,
          status: values.status,
          volume_per_day: values.volume_per_day,
          frequency: values.frequency,
          is_automated: values.is_automated,
          is_real_time: values.is_real_time,
          completeness_score: values.completeness_score,
          accuracy_score: values.accuracy_score,
          timeliness_score: values.timeliness_score,
          metadata: { style: styleOverride },
          state_type: "current",
          waste_type_ids: selectedWasteTypeIds,
          observation_ids: selectedObservationIds,
        });
      } else {
        // Update existing flow
        if (!flow || !onSave) {
          console.error("Missing required props for edit mode:", { flow: !!flow, onSave: !!onSave });
          return;
        }
        console.log("FlowDetailPanel: Calling onSave for flow:", flow.id);
        await onSave(flow.id, {
          ...values,
          metadata: { ...flow.metadata, style: styleOverride },
          waste_type_ids: selectedWasteTypeIds,
          observation_ids: selectedObservationIds,
        });
        console.log("FlowDetailPanel: onSave completed successfully");
      }
      onClose();
    } catch (error) {
      console.error("Failed to save flow:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!flow || !onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(flow.id);
      onClose();
    } catch (error) {
      console.error("Failed to delete flow:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleWasteType = (wasteTypeId: string) => {
    setSelectedWasteTypeIds((prev) =>
      prev.includes(wasteTypeId)
        ? prev.filter((id) => id !== wasteTypeId)
        : [...prev, wasteTypeId]
    );
  };

  const toggleObservation = (observationId: string) => {
    setSelectedObservationIds((prev) =>
      prev.includes(observationId)
        ? prev.filter((id) => id !== observationId)
        : [...prev, observationId]
    );
  };

  // Calculate quality score
  const qualityScore =
    (form.watch("completeness_score") || 3) +
    (form.watch("accuracy_score") || 3) +
    (form.watch("timeliness_score") || 3);
  const qualityLevel = getQualityLevel(qualityScore);
  const qualityColor = getQualityColor(qualityScore);

  const flowType = form.watch("flow_type");
  const FlowIcon = FLOW_TYPE_ICONS[flowType];
  const typeConfig = FLOW_TYPE_CONFIG[flowType];

  // In edit mode, require a flow
  if (!isCreateMode && !flow) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[450px] sm:max-w-[450px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${typeConfig.color}20` }}
            >
              <FlowIcon className="h-5 w-5" color={typeConfig.color} />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-lg">
                {isCreateMode ? "Create Information Flow" : flow?.name}
              </SheetTitle>
              <SheetDescription className="text-sm">
                {sourceStepName && targetStepName && (
                  <span>
                    {sourceStepName} → {targetStepName}
                  </span>
                )}
              </SheetDescription>
            </div>
            <Badge
              variant="outline"
              style={{
                borderColor: typeConfig.color,
                color: typeConfig.color,
              }}
            >
              {typeConfig.label}
            </Badge>
          </div>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(handleSubmit, (errors) => {
          console.error("Form validation errors:", errors);
        })} className="space-y-6">
          <Accordion
            type="multiple"
            defaultValue={["basic", "quality", "appearance"]}
            className="w-full"
          >
            {/* Basic Information */}
            <AccordionItem value="basic">
              <AccordionTrigger className="text-sm font-medium">
                Basic Information
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Flow Name *</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="e.g., Customer Order Data"
                    disabled={false}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                    placeholder="Describe what information flows..."
                    rows={3}
                    disabled={false}
                  />
                </div>

                {/* Flow Type */}
                <div className="space-y-2">
                  <Label>Flow Type</Label>
                  <Select
                    value={flowType}
                    onValueChange={(value) =>
                      form.setValue("flow_type", value as FlowType)
                    }
                    disabled={false}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FLOW_TYPE_CONFIG).map(([type, config]) => {
                        const Icon = FLOW_TYPE_ICONS[type as FlowType];
                        return (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              <Icon
                                className="h-4 w-4"
                                color={config.color}
                              />
                              {config.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.watch("status")}
                    onValueChange={(value) =>
                      form.setValue("status", value as FlowStatus)
                    }
                    disabled={false}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="proposed">Proposed</SelectItem>
                      <SelectItem value="deprecated">Deprecated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Frequency */}
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={form.watch("frequency") || ""}
                    onValueChange={(value) => form.setValue("frequency", value)}
                    disabled={false}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="real-time">Real-time</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="on-demand">On-demand</SelectItem>
                      <SelectItem value="batch">Batch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Toggles */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="automated">Automated</Label>
                  </div>
                  <Switch
                    id="automated"
                    checked={form.watch("is_automated")}
                    onCheckedChange={(checked) =>
                      form.setValue("is_automated", checked)
                    }
                    disabled={false}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="realtime">Real-time</Label>
                  </div>
                  <Switch
                    id="realtime"
                    checked={form.watch("is_real_time")}
                    onCheckedChange={(checked) =>
                      form.setValue("is_real_time", checked)
                    }
                    disabled={false}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Quality Scores */}
            <AccordionItem value="quality">
              <AccordionTrigger className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  Quality Scores
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: qualityColor,
                      color: qualityColor,
                    }}
                  >
                    {qualityScore}/15 - {QUALITY_THRESHOLDS[qualityLevel].label}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-6 pt-2">
                {/* Completeness */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Completeness</Label>
                    <span className="text-sm font-medium">
                      {form.watch("completeness_score") || 3}
                    </span>
                  </div>
                  <Slider
                    value={[form.watch("completeness_score") || 3]}
                    onValueChange={([value]) =>
                      form.setValue("completeness_score", value)
                    }
                    min={1}
                    max={5}
                    step={1}
                    disabled={false}
                  />
                  <p className="text-xs text-muted-foreground">
                    Does the information contain all required fields?
                  </p>
                </div>

                {/* Accuracy */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Accuracy</Label>
                    <span className="text-sm font-medium">
                      {form.watch("accuracy_score") || 3}
                    </span>
                  </div>
                  <Slider
                    value={[form.watch("accuracy_score") || 3]}
                    onValueChange={([value]) =>
                      form.setValue("accuracy_score", value)
                    }
                    min={1}
                    max={5}
                    step={1}
                    disabled={false}
                  />
                  <p className="text-xs text-muted-foreground">
                    Is the information correct and reliable?
                  </p>
                </div>

                {/* Timeliness */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Timeliness</Label>
                    <span className="text-sm font-medium">
                      {form.watch("timeliness_score") || 3}
                    </span>
                  </div>
                  <Slider
                    value={[form.watch("timeliness_score") || 3]}
                    onValueChange={([value]) =>
                      form.setValue("timeliness_score", value)
                    }
                    min={1}
                    max={5}
                    step={1}
                    disabled={false}
                  />
                  <p className="text-xs text-muted-foreground">
                    Is the information delivered on time?
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Appearance */}
            <AccordionItem value="appearance">
              <AccordionTrigger className="text-sm font-medium">
                Appearance
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                <FlowStylePicker
                  flowType={flowType}
                  value={styleOverride}
                  onChange={setStyleOverride}
                  disabled={false}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Waste Tags */}
            <AccordionItem value="waste">
              <AccordionTrigger className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  Waste Tags
                  {selectedWasteTypeIds.length > 0 && (
                    <Badge variant="secondary">
                      {selectedWasteTypeIds.length}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                <div className="grid grid-cols-2 gap-2">
                  {wasteTypes.map((wasteType) => {
                    const isSelected = selectedWasteTypeIds.includes(wasteType.id);
                    return (
                      <button
                        key={wasteType.id}
                        type="button"
                        onClick={() => toggleWasteType(wasteType.id)}
                        disabled={false}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md border text-left text-sm",
                          "transition-colors",
                          isSelected
                            ? "border-amber-500 bg-amber-50 text-amber-900"
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        <AlertTriangle
                          className={cn(
                            "h-4 w-4 flex-shrink-0",
                            isSelected ? "text-amber-500" : "text-muted-foreground"
                          )}
                        />
                        <span className="truncate">{wasteType.code}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedWasteTypeIds.length > 0 && (
                  <div className="mt-3 p-2 rounded-md bg-amber-50 border border-amber-200">
                    <p className="text-xs text-amber-800">
                      <strong>Tagged wastes:</strong>{" "}
                      {wasteTypes
                        .filter((w) => selectedWasteTypeIds.includes(w.id))
                        .map((w) => w.name)
                        .join(", ")}
                    </p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Linked Observations */}
            <AccordionItem value="observations">
              <AccordionTrigger className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  Linked Observations
                  {selectedObservationIds.length > 0 && (
                    <Badge variant="secondary">
                      {selectedObservationIds.length}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                {observations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No observations available to link.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {observations.map((observation) => {
                      const isSelected = selectedObservationIds.includes(
                        observation.id
                      );
                      return (
                        <button
                          key={observation.id}
                          type="button"
                          onClick={() => toggleObservation(observation.id)}
                          disabled={false}
                          className={cn(
                            "w-full flex items-start gap-2 p-2 rounded-md border text-left text-sm",
                            "transition-colors",
                            isSelected
                              ? "border-brand-gold bg-brand-gold/10"
                              : "border-border hover:bg-muted/50"
                          )}
                        >
                          <Link2
                            className={cn(
                              "h-4 w-4 flex-shrink-0 mt-0.5",
                              isSelected
                                ? "text-brand-gold"
                                : "text-muted-foreground"
                            )}
                          />
                          <span className="line-clamp-2">
                            {observation.notes || "Observation without notes"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Separator />

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isCreateMode ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? "Creating..." : "Create Flow"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Information Flow?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete &quot;{flow?.name}&quot; and all
                        associated waste tags and observation links. This action
                        cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
