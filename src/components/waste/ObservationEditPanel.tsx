"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  AlertCircle,
  Copy,
  Clock,
  UserMinus,
  Truck,
  Package,
  Move,
  Layers,
  Unlink,
  FileWarning,
  ToggleLeft,
  Database,
  Split,
  Hourglass,
  Calculator,
  Trash2,
  User,
} from "lucide-react";
import type { WasteType } from "@/types";
import type { ObservationWithDetails } from "@/lib/services/observations";
import { formatDistanceToNow } from "date-fns";

const editObservationSchema = z.object({
  notes: z.string().optional(),
  isDigital: z.boolean(),
  isPhysical: z.boolean(),
  frequencyScore: z.number().min(1).max(5),
  impactScore: z.number().min(1).max(5),
  easeScore: z.number().min(1).max(5),
  wasteTypeIds: z.array(z.string()).min(1, "Select at least one waste type"),
});

type EditObservationFormData = z.infer<typeof editObservationSchema>;

interface ObservationEditPanelProps {
  observation: ObservationWithDetails | null;
  wasteTypes: WasteType[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (observationId: string, data: EditObservationFormData) => void;
  onDelete: (observationId: string) => void;
  isSaving?: boolean;
  isDeleting?: boolean;
  currentUserId?: string;
}

const wasteIcons: Record<string, React.ElementType> = {
  D: AlertCircle,
  O: Copy,
  W: Clock,
  N: UserMinus,
  T: Truck,
  I: Package,
  M: Move,
  E: Layers,
  IW: Unlink,
  DO: FileWarning,
  UF: ToggleLeft,
  ED: Database,
  FW: Split,
  DW: Hourglass,
};

const wasteColors: Record<string, string> = {
  D: "#EF4444",
  O: "#F97316",
  W: "#EAB308",
  N: "#8B5CF6",
  T: "#3B82F6",
  I: "#06B6D4",
  M: "#10B981",
  E: "#EC4899",
  IW: "#7C3AED",
  DO: "#DC2626",
  UF: "#0891B2",
  ED: "#4F46E5",
  FW: "#9333EA",
  DW: "#CA8A04",
};

export function ObservationEditPanel({
  observation,
  wasteTypes,
  isOpen,
  onClose,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
  currentUserId,
}: ObservationEditPanelProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const form = useForm<EditObservationFormData>({
    resolver: zodResolver(editObservationSchema),
    defaultValues: {
      notes: "",
      isDigital: true,
      isPhysical: false,
      frequencyScore: 3,
      impactScore: 3,
      easeScore: 3,
      wasteTypeIds: [],
    },
  });

  // Reset form when observation changes
  useEffect(() => {
    if (observation) {
      form.reset({
        notes: observation.notes || "",
        isDigital: observation.is_digital,
        isPhysical: observation.is_physical,
        frequencyScore: observation.frequency_score,
        impactScore: observation.impact_score,
        easeScore: observation.ease_score,
        wasteTypeIds: observation.waste_types?.map((wt) => wt.id) || [],
      });
    }
  }, [observation, form]);

  const frequencyScore = form.watch("frequencyScore");
  const impactScore = form.watch("impactScore");
  const easeScore = form.watch("easeScore");
  const priorityScore = frequencyScore * impactScore * (6 - easeScore);

  const handleSubmit = (data: EditObservationFormData) => {
    if (observation) {
      onSave(observation.id, data);
    }
  };

  const handleDelete = () => {
    if (observation) {
      onDelete(observation.id);
      setIsDeleteDialogOpen(false);
    }
  };

  if (!observation) return null;

  const isOwner = currentUserId === observation.user_id;
  const canEdit = isOwner;
  const canDelete = isOwner;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:w-[600px] p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle>{canEdit ? "Edit Observation" : "View Observation"}</SheetTitle>
          <SheetDescription className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              <span>{observation.user?.name || "Unknown"}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(observation.created_at), { addSuffix: true })}
              </span>
            </div>
            <Badge
              variant="outline"
              className={
                observation.priority_score >= 15
                  ? "border-red-500 text-red-600"
                  : observation.priority_score >= 10
                  ? "border-orange-500 text-orange-600"
                  : "border-yellow-500 text-yellow-600"
              }
            >
              Priority Score: {observation.priority_score}
            </Badge>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="p-6 space-y-6">
              {/* Waste Type Selection */}
              <FormField
                control={form.control}
                name="wasteTypeIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Waste Types *</FormLabel>
                    <FormDescription>
                      {canEdit ? "Select all waste types that apply" : "Selected waste types"}
                    </FormDescription>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {wasteTypes.map((wt) => {
                        const Icon = wasteIcons[wt.code] || AlertCircle;
                        const color = wasteColors[wt.code] || "#6B7280";
                        const isSelected = field.value.includes(wt.id);

                        return (
                          <label
                            key={wt.id}
                            className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                              isSelected
                                ? "border-2 bg-opacity-10"
                                : "hover:bg-muted/50"
                            } ${!canEdit ? "cursor-default" : "cursor-pointer"}`}
                            style={{
                              borderColor: isSelected ? color : undefined,
                              backgroundColor: isSelected ? `${color}10` : undefined,
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              disabled={!canEdit}
                              onCheckedChange={(checked) => {
                                if (!canEdit) return;
                                if (checked) {
                                  field.onChange([...field.value, wt.id]);
                                } else {
                                  field.onChange(
                                    field.value.filter((id) => id !== wt.id)
                                  );
                                }
                              }}
                            />
                            <Icon className="h-4 w-4" style={{ color }} />
                            <span className="text-sm font-medium">{wt.name}</span>
                            <Badge variant="outline" className="ml-auto text-xs">
                              {wt.code}
                            </Badge>
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Nature Toggle */}
              <div className="space-y-2">
                <Label>Nature of Waste</Label>
                <div className="flex gap-4">
                  <FormField
                    control={form.control}
                    name="isDigital"
                    render={({ field }) => (
                      <label className={`flex items-center gap-2 ${canEdit ? "cursor-pointer" : "cursor-default"}`}>
                        <Checkbox
                          checked={field.value}
                          disabled={!canEdit}
                          onCheckedChange={field.onChange}
                        />
                        <span className="text-sm">Digital</span>
                      </label>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isPhysical"
                    render={({ field }) => (
                      <label className={`flex items-center gap-2 ${canEdit ? "cursor-pointer" : "cursor-default"}`}>
                        <Checkbox
                          checked={field.value}
                          disabled={!canEdit}
                          onCheckedChange={field.onChange}
                        />
                        <span className="text-sm">Physical</span>
                      </label>
                    )}
                  />
                </div>
              </div>

              {/* Scoring Sliders */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="frequencyScore"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between">
                        <FormLabel>Frequency</FormLabel>
                        <span className="text-sm font-medium">{field.value}/5</span>
                      </div>
                      <FormDescription className="text-xs">
                        How often does this waste occur?
                      </FormDescription>
                      <FormControl>
                        <Slider
                          min={1}
                          max={5}
                          step={1}
                          disabled={!canEdit}
                          value={[field.value]}
                          onValueChange={([value]) => field.onChange(value)}
                          className="mt-2"
                        />
                      </FormControl>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Rare</span>
                        <span>Constant</span>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="impactScore"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between">
                        <FormLabel>Impact</FormLabel>
                        <span className="text-sm font-medium">{field.value}/5</span>
                      </div>
                      <FormDescription className="text-xs">
                        How significant is the impact on the process?
                      </FormDescription>
                      <FormControl>
                        <Slider
                          min={1}
                          max={5}
                          step={1}
                          disabled={!canEdit}
                          value={[field.value]}
                          onValueChange={([value]) => field.onChange(value)}
                          className="mt-2"
                        />
                      </FormControl>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Minor</span>
                        <span>Severe</span>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="easeScore"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between">
                        <FormLabel>Ease to Fix</FormLabel>
                        <span className="text-sm font-medium">{field.value}/5</span>
                      </div>
                      <FormDescription className="text-xs">
                        How easy is this to resolve?
                      </FormDescription>
                      <FormControl>
                        <Slider
                          min={1}
                          max={5}
                          step={1}
                          disabled={!canEdit}
                          value={[field.value]}
                          onValueChange={([value]) => field.onChange(value)}
                          className="mt-2"
                        />
                      </FormControl>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Difficult</span>
                        <span>Easy</span>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Priority Score Display */}
              <div className="p-4 rounded-lg bg-brand-gold/10 border border-brand-gold/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-brand-gold" />
                    <span className="font-medium">Priority Score</span>
                  </div>
                  <span className="text-2xl font-bold text-brand-navy">
                    {priorityScore}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Frequency × Impact × (6 - Ease) = {frequencyScore} × {impactScore} × {6 - easeScore}
                </p>
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what you observed..."
                        className="min-h-[100px]"
                        disabled={!canEdit}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>

        <SheetFooter className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <div className="flex w-full justify-between">
            {canDelete && (
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isSaving || isDeleting}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Observation</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this observation? This action cannot be undone.
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
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={onClose} disabled={isSaving || isDeleting}>
                {canEdit ? "Cancel" : "Close"}
              </Button>
              {canEdit && (
                <Button
                  onClick={form.handleSubmit(handleSubmit)}
                  className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                  disabled={isSaving || isDeleting}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

