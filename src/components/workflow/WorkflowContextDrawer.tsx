"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Target,
  Zap,
  Users,
  Monitor,
  Clock,
  Lock,
  BarChart3,
  Sparkles,
  Save,
  Loader2,
  Plus,
  X,
  Check,
  FileText,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type {
  WorkflowContextWithRelations,
  ContextCompleteness,
  UpsertWorkflowContextInput,
  UpsertWorkflowStakeholderInput,
  UpsertWorkflowSystemInput,
  UpsertWorkflowMetricInput,
} from "@/types";

// ============================================
// PROGRESS RING COMPONENT
// ============================================

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

function ProgressRing({
  progress,
  size = 40,
  strokeWidth = 3,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  // Color based on progress
  const getColor = () => {
    if (progress < 25) return "#EF4444"; // Red
    if (progress < 50) return "#F97316"; // Orange
    if (progress < 75) return "#FFC000"; // Gold (50% opacity feel)
    return "#FFC000"; // Full gold
  };

  return (
    <svg
      width={size}
      height={size}
      className={cn("transform -rotate-90", className)}
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/30"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={getColor()}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="progress-ring-circle"
        style={
          {
            "--progress-offset": offset,
          } as React.CSSProperties
        }
      />
    </svg>
  );
}

// ============================================
// TAG INPUT COMPONENT
// ============================================

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

function TagInput({ value, onChange, placeholder, className }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (!value.includes(inputValue.trim())) {
        onChange([...value, inputValue.trim()]);
      }
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5 p-2 min-h-[80px] border rounded-md bg-background focus-within:ring-2 focus-within:ring-brand-gold/30 focus-within:border-brand-gold transition-all",
        className
      )}
    >
      {value.map((tag, index) => (
        <Badge
          key={`${tag}-${index}`}
          variant="secondary"
          className="context-tag flex items-center gap-1 px-2 py-0.5 bg-brand-gold/10 text-brand-navy border-brand-gold/20 hover:bg-brand-gold/20"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="ml-1 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : "Add more..."}
        className="flex-1 min-w-[120px] border-0 p-0 h-6 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
      />
    </div>
  );
}

// ============================================
// DYNAMIC LIST COMPONENT
// ============================================

interface DynamicListItem {
  id?: string;
  [key: string]: string | number | undefined;
}

interface DynamicListProps<T extends DynamicListItem> {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (
    item: T,
    index: number,
    onChange: (updates: Partial<T>) => void
  ) => React.ReactNode;
  createEmpty: () => T;
  addLabel?: string;
}

function DynamicList<T extends DynamicListItem>({
  items,
  onChange,
  renderItem,
  createEmpty,
  addLabel = "Add item",
}: DynamicListProps<T>) {
  const handleAdd = () => {
    onChange([...items, createEmpty()]);
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, updates: Partial<T>) => {
    onChange(
      items.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={item.id || index}
          className="context-tag relative group p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <button
            type="button"
            onClick={() => handleRemove(index)}
            className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          {renderItem(item, index, (updates) =>
            handleItemChange(index, updates)
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAdd}
        className="w-full border-dashed hover:border-brand-gold hover:bg-brand-gold/5"
      >
        <Plus className="h-4 w-4 mr-2" />
        {addLabel}
      </Button>
    </div>
  );
}

// ============================================
// MAIN DRAWER COMPONENT
// ============================================

interface WorkflowContextDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processId: string;
  workflowName: string;
}

export function WorkflowContextDrawer({
  open,
  onOpenChange,
  processId,
  workflowName,
}: WorkflowContextDrawerProps) {
  const { toast } = useToast();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateDescription, setGenerateDescription] = useState("");
  const [completeness, setCompleteness] = useState<ContextCompleteness | null>(
    null
  );

  // Form state
  const [context, setContext] = useState<UpsertWorkflowContextInput>({
    purpose: "",
    business_value: "",
    trigger_events: [],
    end_outcomes: [],
    volume_frequency: "",
    sla_targets: "",
    compliance_requirements: [],
    known_pain_points: [],
    previous_improvement_attempts: [],
    constraints: [],
    assumptions: [],
  });

  const [stakeholders, setStakeholders] = useState<
    UpsertWorkflowStakeholderInput[]
  >([]);
  const [systems, setSystems] = useState<UpsertWorkflowSystemInput[]>([]);
  const [metrics, setMetrics] = useState<UpsertWorkflowMetricInput[]>([]);

  // Fetch context on open
  const fetchContext = useCallback(async () => {
    if (!processId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/workflows/${processId}/context`);
      if (response.ok) {
        const data = await response.json();
        setCompleteness(data.completeness);

        if (data.context) {
          const ctx = data.context as WorkflowContextWithRelations;
          setContext({
            purpose: ctx.purpose || "",
            business_value: ctx.business_value || "",
            trigger_events: ctx.trigger_events || [],
            end_outcomes: ctx.end_outcomes || [],
            volume_frequency: ctx.volume_frequency || "",
            sla_targets: ctx.sla_targets || "",
            compliance_requirements: ctx.compliance_requirements || [],
            known_pain_points: ctx.known_pain_points || [],
            previous_improvement_attempts:
              ctx.previous_improvement_attempts || [],
            constraints: ctx.constraints || [],
            assumptions: ctx.assumptions || [],
          });
          setStakeholders(
            ctx.stakeholders.map((s) => ({
              id: s.id,
              role: s.role,
              responsibilities: s.responsibilities,
              pain_points: s.pain_points,
              order_index: s.order_index,
            }))
          );
          setSystems(
            ctx.systems.map((s) => ({
              id: s.id,
              name: s.name,
              role: s.role,
              integration_notes: s.integration_notes,
              order_index: s.order_index,
            }))
          );
          setMetrics(
            ctx.metrics.map((m) => ({
              id: m.id,
              name: m.name,
              current_value: m.current_value,
              target_value: m.target_value,
              order_index: m.order_index,
            }))
          );
        }
      }
    } catch (error) {
      console.error("Error fetching context:", error);
    } finally {
      setIsLoading(false);
    }
  }, [processId]);

  useEffect(() => {
    if (open) {
      fetchContext();
    }
  }, [open, fetchContext]);

  // Save handler
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/workflows/${processId}/context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          stakeholders,
          systems,
          metrics,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCompleteness(data.completeness);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        toast({
          title: "Context saved",
          description: "Workflow context has been saved successfully.",
        });
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      console.error("Error saving context:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save workflow context.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // AI Generate handler
  const handleGenerate = async () => {
    if (!generateDescription.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch(
        `/api/workflows/${processId}/context/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: generateDescription }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const gen = data.generated;

        // Merge generated data
        setContext((prev) => ({
          ...prev,
          purpose: gen.purpose || prev.purpose,
          business_value: gen.business_value || prev.business_value,
          trigger_events: gen.trigger_events || prev.trigger_events,
          end_outcomes: gen.end_outcomes || prev.end_outcomes,
          volume_frequency: gen.volume_frequency || prev.volume_frequency,
          sla_targets: gen.sla_targets || prev.sla_targets,
          compliance_requirements:
            gen.compliance_requirements || prev.compliance_requirements,
          constraints: gen.constraints || prev.constraints,
          assumptions: gen.assumptions || prev.assumptions,
        }));

        if (gen.stakeholders?.length) {
          setStakeholders(
            gen.stakeholders.map(
              (
                s: { role: string; responsibilities?: string; pain_points?: string },
                i: number
              ) => ({
                role: s.role,
                responsibilities: s.responsibilities,
                pain_points: s.pain_points,
                order_index: i,
              })
            )
          );
        }

        if (gen.systems?.length) {
          setSystems(
            gen.systems.map(
              (
                s: { name: string; role?: string; integration_notes?: string },
                i: number
              ) => ({
                name: s.name,
                role: s.role,
                integration_notes: s.integration_notes,
                order_index: i,
              })
            )
          );
        }

        if (gen.metrics?.length) {
          setMetrics(
            gen.metrics.map(
              (
                m: { name: string; current_value?: string; target_value?: string },
                i: number
              ) => ({
                name: m.name,
                current_value: m.current_value,
                target_value: m.target_value,
                order_index: i,
              })
            )
          );
        }

        setShowGenerateModal(false);
        setGenerateDescription("");
        toast({
          title: "Context generated",
          description: "AI has filled in the context. Review and save.",
        });
      } else {
        throw new Error("Failed to generate");
      }
    } catch (error) {
      console.error("Error generating context:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate context. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Section configuration
  const sections = [
    {
      id: "purpose",
      title: "Purpose & Value",
      icon: Target,
      required: true,
      description: "What this workflow accomplishes and why it matters",
    },
    {
      id: "triggers",
      title: "Triggers & Outcomes",
      icon: Zap,
      required: true,
      description: "What starts this workflow and what it produces",
    },
    {
      id: "stakeholders",
      title: "Stakeholders",
      icon: Users,
      required: false,
      description: "Key roles and their responsibilities",
    },
    {
      id: "systems",
      title: "Systems & Tools",
      icon: Monitor,
      required: false,
      description: "Technology involved in this workflow",
    },
    {
      id: "operations",
      title: "Operational Details",
      icon: Clock,
      required: false,
      description: "Volume, timing, and compliance requirements",
    },
    {
      id: "constraints",
      title: "Constraints & Metrics",
      icon: Lock,
      required: false,
      description: "Limitations, assumptions, and success measures",
    },
  ];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[480px] p-0 gap-0 flex flex-col"
        >
          {/* Header */}
          <div className="shrink-0 bg-gradient-to-r from-brand-navy to-brand-navy/90 text-white p-6">
            <SheetHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <FileText className="h-5 w-5" />
                    </div>
                    {completeness && (
                      <div className="absolute -bottom-1 -right-1">
                        <ProgressRing
                          progress={completeness.overallScore}
                          size={24}
                          strokeWidth={2}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <SheetTitle className="text-white text-lg">
                      Workflow Context
                    </SheetTitle>
                    <SheetDescription className="text-white/70 text-sm">
                      {workflowName}
                    </SheetDescription>
                  </div>
                </div>
                {completeness && (
                  <Badge
                    variant="secondary"
                    className="bg-white/10 text-white border-white/20"
                  >
                    {completeness.overallScore}% Complete
                  </Badge>
                )}
              </div>
            </SheetHeader>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-16 shimmer-loading rounded-lg"
                    />
                  ))}
                </div>
              ) : (
                <>
                  {/* AI Generate Button */}
                  <Button
                    variant="outline"
                    className="w-full border-dashed border-brand-gold/50 text-brand-gold hover:bg-brand-gold/5 hover:border-brand-gold"
                    onClick={() => setShowGenerateModal(true)}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Quick Fill with AI
                  </Button>

                  {/* Accordion Sections */}
                  <Accordion
                    type="multiple"
                    defaultValue={["purpose", "triggers"]}
                    className="space-y-3"
                  >
                    {sections.map((section, index) => (
                      <AccordionItem
                        key={section.id}
                        value={section.id}
                        className="context-section border rounded-lg overflow-hidden"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                section.required
                                  ? "bg-brand-gold/20 text-brand-gold"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              <section.icon className="h-4 w-4" />
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {section.title}
                                </span>
                                {section.required && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {section.description}
                              </span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          {section.id === "purpose" && (
                            <div className="space-y-4 pt-2">
                              <div className="context-field space-y-2">
                                <Label className="text-xs font-medium flex items-center gap-2">
                                  What does this workflow accomplish?
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <AlertCircle className="h-3 w-3 text-muted-foreground" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="max-w-xs text-xs">
                                          Describe the primary goal in 1-2
                                          sentences
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </Label>
                                <Textarea
                                  value={context.purpose}
                                  onChange={(e) =>
                                    setContext({
                                      ...context,
                                      purpose: e.target.value,
                                    })
                                  }
                                  placeholder="e.g., Process purchase orders from requisition to vendor payment"
                                  className="min-h-[80px] resize-none"
                                />
                              </div>
                              <div className="context-field space-y-2">
                                <Label className="text-xs font-medium">
                                  Why does this workflow matter? (Business
                                  value)
                                </Label>
                                <Textarea
                                  value={context.business_value}
                                  onChange={(e) =>
                                    setContext({
                                      ...context,
                                      business_value: e.target.value,
                                    })
                                  }
                                  placeholder="e.g., Ensures timely procurement, maintains vendor relationships, controls spending"
                                  className="min-h-[80px] resize-none"
                                />
                              </div>
                            </div>
                          )}

                          {section.id === "triggers" && (
                            <div className="space-y-4 pt-2">
                              <div className="context-field space-y-2">
                                <Label className="text-xs font-medium">
                                  What initiates this workflow?
                                </Label>
                                <TagInput
                                  value={context.trigger_events || []}
                                  onChange={(tags) =>
                                    setContext({
                                      ...context,
                                      trigger_events: tags,
                                    })
                                  }
                                  placeholder="Type and press Enter (e.g., 'Customer submits order')"
                                />
                              </div>
                              <div className="context-field space-y-2">
                                <Label className="text-xs font-medium">
                                  What are the successful outcomes?
                                </Label>
                                <TagInput
                                  value={context.end_outcomes || []}
                                  onChange={(tags) =>
                                    setContext({
                                      ...context,
                                      end_outcomes: tags,
                                    })
                                  }
                                  placeholder="Type and press Enter (e.g., 'Order shipped to customer')"
                                />
                              </div>
                            </div>
                          )}

                          {section.id === "stakeholders" && (
                            <div className="pt-2">
                              <DynamicList
                                items={stakeholders}
                                onChange={setStakeholders}
                                createEmpty={() => ({
                                  role: "",
                                  responsibilities: "",
                                  pain_points: "",
                                  order_index: stakeholders.length,
                                })}
                                addLabel="Add stakeholder"
                                renderItem={(item, _, onChange) => (
                                  <div className="space-y-3 pr-6">
                                    <Input
                                      value={item.role}
                                      onChange={(e) =>
                                        onChange({ role: e.target.value })
                                      }
                                      placeholder="Role (e.g., Procurement Manager)"
                                      className="font-medium"
                                    />
                                    <Textarea
                                      value={item.responsibilities || ""}
                                      onChange={(e) =>
                                        onChange({
                                          responsibilities: e.target.value,
                                        })
                                      }
                                      placeholder="Responsibilities..."
                                      className="min-h-[60px] resize-none text-sm"
                                    />
                                    <Input
                                      value={item.pain_points || ""}
                                      onChange={(e) =>
                                        onChange({ pain_points: e.target.value })
                                      }
                                      placeholder="Known pain points..."
                                      className="text-sm"
                                    />
                                  </div>
                                )}
                              />
                            </div>
                          )}

                          {section.id === "systems" && (
                            <div className="pt-2">
                              <DynamicList
                                items={systems}
                                onChange={setSystems}
                                createEmpty={() => ({
                                  name: "",
                                  role: "",
                                  integration_notes: "",
                                  order_index: systems.length,
                                })}
                                addLabel="Add system"
                                renderItem={(item, _, onChange) => (
                                  <div className="space-y-3 pr-6">
                                    <Input
                                      value={item.name}
                                      onChange={(e) =>
                                        onChange({ name: e.target.value })
                                      }
                                      placeholder="System name (e.g., SAP, Salesforce)"
                                      className="font-medium"
                                    />
                                    <Input
                                      value={item.role || ""}
                                      onChange={(e) =>
                                        onChange({ role: e.target.value })
                                      }
                                      placeholder="Role in workflow..."
                                      className="text-sm"
                                    />
                                    <Input
                                      value={item.integration_notes || ""}
                                      onChange={(e) =>
                                        onChange({
                                          integration_notes: e.target.value,
                                        })
                                      }
                                      placeholder="Integration notes..."
                                      className="text-sm"
                                    />
                                  </div>
                                )}
                              />
                            </div>
                          )}

                          {section.id === "operations" && (
                            <div className="space-y-4 pt-2">
                              <div className="context-field space-y-2">
                                <Label className="text-xs font-medium">
                                  Volume & Frequency
                                </Label>
                                <Input
                                  value={context.volume_frequency || ""}
                                  onChange={(e) =>
                                    setContext({
                                      ...context,
                                      volume_frequency: e.target.value,
                                    })
                                  }
                                  placeholder="e.g., ~50 orders/day, peaks on Mondays"
                                />
                              </div>
                              <div className="context-field space-y-2">
                                <Label className="text-xs font-medium">
                                  SLA / Time Targets
                                </Label>
                                <Input
                                  value={context.sla_targets || ""}
                                  onChange={(e) =>
                                    setContext({
                                      ...context,
                                      sla_targets: e.target.value,
                                    })
                                  }
                                  placeholder="e.g., Must complete within 24 hours"
                                />
                              </div>
                              <div className="context-field space-y-2">
                                <Label className="text-xs font-medium">
                                  Compliance Requirements
                                </Label>
                                <TagInput
                                  value={context.compliance_requirements || []}
                                  onChange={(tags) =>
                                    setContext({
                                      ...context,
                                      compliance_requirements: tags,
                                    })
                                  }
                                  placeholder="e.g., HIPAA, SOX, GDPR"
                                />
                              </div>
                            </div>
                          )}

                          {section.id === "constraints" && (
                            <div className="space-y-4 pt-2">
                              <div className="context-field space-y-2">
                                <Label className="text-xs font-medium">
                                  Constraints (things that cannot change)
                                </Label>
                                <TagInput
                                  value={context.constraints || []}
                                  onChange={(tags) =>
                                    setContext({
                                      ...context,
                                      constraints: tags,
                                    })
                                  }
                                  placeholder="e.g., Cannot change ERP system"
                                />
                              </div>
                              <div className="context-field space-y-2">
                                <Label className="text-xs font-medium">
                                  Assumptions
                                </Label>
                                <TagInput
                                  value={context.assumptions || []}
                                  onChange={(tags) =>
                                    setContext({
                                      ...context,
                                      assumptions: tags,
                                    })
                                  }
                                  placeholder="e.g., All staff have system access"
                                />
                              </div>
                              <Separator className="my-4" />
                              <div className="space-y-2">
                                <Label className="text-xs font-medium flex items-center gap-2">
                                  <BarChart3 className="h-3.5 w-3.5" />
                                  Success Metrics
                                </Label>
                                <DynamicList
                                  items={metrics}
                                  onChange={setMetrics}
                                  createEmpty={() => ({
                                    name: "",
                                    current_value: "",
                                    target_value: "",
                                    order_index: metrics.length,
                                  })}
                                  addLabel="Add metric"
                                  renderItem={(item, _, onChange) => (
                                    <div className="grid grid-cols-3 gap-2 pr-6">
                                      <Input
                                        value={item.name}
                                        onChange={(e) =>
                                          onChange({ name: e.target.value })
                                        }
                                        placeholder="Metric name"
                                        className="col-span-3 font-medium"
                                      />
                                      <Input
                                        value={item.current_value || ""}
                                        onChange={(e) =>
                                          onChange({
                                            current_value: e.target.value,
                                          })
                                        }
                                        placeholder="Current"
                                        className="text-sm"
                                      />
                                      <div className="flex items-center justify-center text-muted-foreground">
                                        →
                                      </div>
                                      <Input
                                        value={item.target_value || ""}
                                        onChange={(e) =>
                                          onChange({
                                            target_value: e.target.value,
                                          })
                                        }
                                        placeholder="Target"
                                        className="text-sm"
                                      />
                                    </div>
                                  )}
                                />
                              </div>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="shrink-0 border-t bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  "flex-1 bg-brand-gold hover:bg-brand-gold/90 text-brand-navy",
                  saveSuccess && "save-success"
                )}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Context
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* AI Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-brand-gold to-brand-gold/80 p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-brand-navy" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-brand-navy">
                    Quick Fill with AI
                  </h3>
                  <p className="text-sm text-brand-navy/70">
                    Describe your workflow and let AI fill in the details
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <Textarea
                value={generateDescription}
                onChange={(e) => setGenerateDescription(e.target.value)}
                placeholder="Describe your workflow in a few sentences... For example: 'This is our purchase order approval process. It starts when a department head submits a requisition and ends when the PO is sent to the vendor. Key stakeholders include procurement, finance, and department managers. We use SAP for tracking and typically process about 50 orders per day.'"
                className="min-h-[160px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                The more detail you provide, the better the AI can fill in the
                context fields. You can always edit the results.
              </p>
            </div>
            <div className="border-t bg-muted/30 p-4 flex items-center gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowGenerateModal(false);
                  setGenerateDescription("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !generateDescription.trim()}
                className="flex-1 bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Context
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================
// TRIGGER BUTTON COMPONENT
// ============================================

interface ContextTriggerButtonProps {
  completeness: number;
  onClick: () => void;
  className?: string;
}

export function ContextTriggerButton({
  completeness,
  onClick,
  className,
}: ContextTriggerButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            onClick={onClick}
            className={cn(
              "h-12 w-12 rounded-full bg-white shadow-lg border border-border hover:bg-brand-gold/10 context-trigger-button relative",
              completeness >= 75 && "animate-glow-pulse",
              className
            )}
            aria-label="Open workflow context"
          >
            <div className="relative">
              <FileText className="h-5 w-5 text-brand-navy" />
              <div className="absolute -top-1 -right-1">
                <ProgressRing
                  progress={completeness}
                  size={16}
                  strokeWidth={2}
                />
              </div>
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="font-medium">
          <div className="flex items-center gap-2">
            <span>Workflow Context</span>
            <Badge variant="secondary" className="text-xs">
              {completeness}%
            </Badge>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

