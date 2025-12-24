"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Clipboard,
  Check,
  ExternalLink,
  Beaker,
  GitBranch,
  Eye,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface LabObservation {
  stepHint: string;
  wasteHint: string;
  priorityHint: "low" | "medium" | "high";
  text: string;
}

export interface LabDeepLink {
  label: string;
  href: string;
}

export interface LabInstructions {
  workflowName: string;
  swimlanes: string[];
  steps: string[];
  observations: LabObservation[];
  deepLinks?: LabDeepLink[];
}

interface LabInstructionsPanelProps {
  lab: LabInstructions;
  className?: string;
}

export function LabInstructionsPanel({ lab, className }: LabInstructionsPanelProps) {
  const { toast } = useToast();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["workflow", "observations"])
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast({
        title: "Copied to clipboard",
        description: "Paste this into your observation notes.",
      });
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Please select and copy manually.",
      });
    }
  };

  const priorityColors = {
    low: "bg-blue-100 text-blue-700 border-blue-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    high: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <Card className={cn("border-brand-gold/30 bg-brand-gold/5", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-brand-navy">
          <Beaker className="h-5 w-5 text-brand-gold" />
          Hands-On Lab
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Links */}
        {lab.deepLinks && lab.deepLinks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {lab.deepLinks.map((link, index) => (
              <Button key={index} asChild variant="outline" size="sm">
                <Link href={link.href}>
                  <ExternalLink className="mr-1.5 h-3 w-3" />
                  {link.label}
                </Link>
              </Button>
            ))}
          </div>
        )}

        {/* Workflow Section */}
        <Collapsible
          open={expandedSections.has("workflow")}
          onOpenChange={() => toggleSection("workflow")}
        >
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 hover:bg-muted/50 rounded px-2 -mx-2">
            {expandedSections.has("workflow") ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <GitBranch className="h-4 w-4 text-brand-gold" />
            <span className="font-medium">Build the Workflow</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 pl-6 space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Workflow Name:</p>
              <p className="font-medium text-brand-navy">{lab.workflowName}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Swimlanes:</p>
              <div className="flex flex-wrap gap-1.5">
                {lab.swimlanes.map((lane, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {lane}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Steps (in order):</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                {lab.steps.map((step, index) => (
                  <li key={index} className="text-brand-navy">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Observations Section */}
        <Collapsible
          open={expandedSections.has("observations")}
          onOpenChange={() => toggleSection("observations")}
        >
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 hover:bg-muted/50 rounded px-2 -mx-2">
            {expandedSections.has("observations") ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Eye className="h-4 w-4 text-brand-gold" />
            <span className="font-medium">Sample Observations</span>
            <Badge variant="outline" className="ml-auto text-xs">
              {lab.observations.length}
            </Badge>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 pl-6 space-y-3">
            {lab.observations.map((obs, index) => (
              <div
                key={index}
                className="border rounded-lg p-3 bg-white space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs">
                      Step: {obs.stepHint}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Waste: {obs.wasteHint}
                    </Badge>
                    <Badge
                      className={cn(
                        "text-xs border",
                        priorityColors[obs.priorityHint]
                      )}
                    >
                      {obs.priorityHint}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => copyToClipboard(obs.text, index)}
                  >
                    {copiedIndex === index ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Clipboard className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{obs.text}</p>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Next Steps */}
        <Collapsible
          open={expandedSections.has("next")}
          onOpenChange={() => toggleSection("next")}
        >
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 hover:bg-muted/50 rounded px-2 -mx-2">
            {expandedSections.has("next") ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Layers className="h-4 w-4 text-brand-gold" />
            <span className="font-medium">After the Lab</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 pl-6">
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Navigate to Future State Studio</li>
              <li>Select your session and run Synthesis</li>
              <li>Review generated themes</li>
              <li>Continue to Solutions and Roadmap stages</li>
            </ol>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

