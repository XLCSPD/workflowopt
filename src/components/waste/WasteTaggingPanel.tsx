"use client";

import { useState } from "react";
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
  Upload,
  X,
  Calculator,
} from "lucide-react";
import type { ProcessStep, WasteType } from "@/types";

const wasteTaggingSchema = z.object({
  notes: z.string().optional(),
  isDigital: z.boolean(),
  isPhysical: z.boolean(),
  frequencyScore: z.number().min(1).max(5),
  impactScore: z.number().min(1).max(5),
  easeScore: z.number().min(1).max(5),
  wasteTypeIds: z.array(z.string()).min(1, "Select at least one waste type"),
});

type WasteTaggingFormData = z.infer<typeof wasteTaggingSchema>;

interface WasteTaggingPanelProps {
  step: ProcessStep | null;
  wasteTypes: WasteType[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: WasteTaggingFormData) => void;
  isSubmitting?: boolean;
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

export function WasteTaggingPanel({
  step,
  wasteTypes,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: WasteTaggingPanelProps) {
  const [attachments, setAttachments] = useState<File[]>([]);

  const form = useForm<WasteTaggingFormData>({
    resolver: zodResolver(wasteTaggingSchema),
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

  const frequencyScore = form.watch("frequencyScore");
  const impactScore = form.watch("impactScore");
  const easeScore = form.watch("easeScore");
  const priorityScore = frequencyScore * impactScore * (6 - easeScore);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = (data: WasteTaggingFormData) => {
    onSubmit(data);
    form.reset();
    setAttachments([]);
  };

  if (!step) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:w-[600px] p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle>Tag Waste</SheetTitle>
          <SheetDescription>
            <span className="font-medium text-brand-navy">{step.step_name}</span>
            <Badge variant="outline" className="ml-2">{step.lane}</Badge>
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
                      Select all waste types that apply
                    </FormDescription>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {wasteTypes.map((wt) => {
                        const Icon = wasteIcons[wt.code] || AlertCircle;
                        const color = wasteColors[wt.code] || "#6B7280";
                        const isSelected = field.value.includes(wt.id);

                        return (
                          <label
                            key={wt.id}
                            className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? "border-2 bg-opacity-10"
                                : "hover:bg-muted/50"
                            }`}
                            style={{
                              borderColor: isSelected ? color : undefined,
                              backgroundColor: isSelected ? `${color}10` : undefined,
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
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
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={field.value}
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
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={field.value}
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
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* File Upload */}
              <div className="space-y-2">
                <Label>Evidence (Screenshots/Files)</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </span>
                  </label>
                </div>
                {attachments.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {attachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-muted rounded"
                      >
                        <span className="text-sm truncate">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeAttachment(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>
          </Form>
        </ScrollArea>

        <SheetFooter className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={form.handleSubmit(handleSubmit)}
            className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Observation"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

