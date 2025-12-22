"use client";

import { useState } from "react";
import { StageLanding } from "./StudioShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Download,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image,
  Loader2,
  CheckCircle,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  exportFutureStateSummaryPDF,
  exportSolutionRegister,
  exportRoadmapCSV,
  exportStepDesignSpecsPDF,
  exportTraceabilityMatrix,
  exportImplementationNotes,
} from "@/lib/services/export";

interface ExportPanelProps {
  sessionId: string;
  sessionName: string;
}

interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: typeof FileText;
  format: string;
  included: boolean;
}

const exportOptions: ExportOption[] = [
  {
    id: "executive-summary",
    label: "Executive Summary",
    description: "High-level overview of findings and recommendations",
    icon: FileText,
    format: "PDF",
    included: true,
  },
  {
    id: "future-state-diagram",
    label: "Future State Diagram",
    description: "Visual process map with changes highlighted",
    icon: Image,
    format: "PNG/SVG",
    included: true,
  },
  {
    id: "solution-register",
    label: "Solution Register",
    description: "Complete list of solutions with details and sequencing",
    icon: FileSpreadsheet,
    format: "CSV",
    included: true,
  },
  {
    id: "roadmap",
    label: "Implementation Roadmap",
    description: "Wave-based implementation timeline with step-level items",
    icon: Presentation,
    format: "CSV",
    included: true,
  },
  {
    id: "step-design-specs",
    label: "Step Design Specifications",
    description: "Detailed step-level design specs with inputs, actions, outputs, and controls",
    icon: FileText,
    format: "PDF",
    included: true,
  },
  {
    id: "traceability-matrix",
    label: "Traceability Matrix",
    description: "Solution → Node → Step Design → Assumptions mapping",
    icon: FileSpreadsheet,
    format: "CSV",
    included: true,
  },
  {
    id: "implementation-notes",
    label: "Implementation Notes",
    description: "Per-step implementation details with timing, risks, and dependencies",
    icon: FileSpreadsheet,
    format: "CSV",
    included: false,
  },
  {
    id: "theme-analysis",
    label: "Theme Analysis Report",
    description: "Detailed breakdown of waste themes and root causes",
    icon: FileText,
    format: "PDF",
    included: false,
  },
  {
    id: "comparison-metrics",
    label: "Comparison Metrics",
    description: "Current vs future state metrics and value case",
    icon: FileSpreadsheet,
    format: "CSV",
    included: false,
  },
];

export function ExportPanel({ sessionId, sessionName }: ExportPanelProps) {
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(
    new Set(exportOptions.filter((o) => o.included).map((o) => o.id))
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const toggleOption = (id: string) => {
    const newSelected = new Set(selectedOptions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedOptions(newSelected);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportComplete(false);
    setExportError(null);

    try {
      const exports: Promise<void>[] = [];

      if (selectedOptions.has("executive-summary")) {
        exports.push(exportFutureStateSummaryPDF(sessionId));
      }

      if (selectedOptions.has("solution-register")) {
        exports.push(exportSolutionRegister(sessionId));
      }

      if (selectedOptions.has("roadmap")) {
        exports.push(exportRoadmapCSV(sessionId));
      }

      if (selectedOptions.has("step-design-specs")) {
        exports.push(exportStepDesignSpecsPDF(sessionId));
      }

      if (selectedOptions.has("traceability-matrix")) {
        exports.push(exportTraceabilityMatrix(sessionId));
      }

      if (selectedOptions.has("implementation-notes")) {
        exports.push(exportImplementationNotes(sessionId));
      }

      // Execute all selected exports
      await Promise.all(exports);

      setExportComplete(true);
    } catch (error) {
      console.error("Export error:", error);
      setExportError(error instanceof Error ? error.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const selectedCount = selectedOptions.size;

  return (
    <StageLanding
      stage="export"
      title="Export Deliverables"
      description="Generate and download your Future State Studio deliverables"
      icon={Download}
      stats={[{ label: "Selected Items", value: selectedCount }]}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Export Options */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-medium text-brand-navy">Select Deliverables</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {exportOptions.map((option, index) => {
              const isSelected = selectedOptions.has(option.id);
              const Icon = option.icon;

              return (
                <motion.div
                  key={option.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      isSelected && "border-brand-gold bg-brand-gold/5"
                    )}
                    onClick={() => toggleOption(option.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOption(option.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-sm">{option.label}</CardTitle>
                          </div>
                          <CardDescription className="mt-1 text-xs">
                            {option.description}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {option.format}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Export Summary */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Package
              </CardTitle>
              <CardDescription>
                {sessionName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selected Items */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Included ({selectedCount})
                </Label>
                <div className="space-y-1">
                  {exportOptions
                    .filter((o) => selectedOptions.has(o.id))
                    .map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center justify-between text-sm py-1 border-b last:border-0"
                      >
                        <span className="text-muted-foreground">{option.label}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {option.format}
                        </Badge>
                      </div>
                    ))}
                  {selectedCount === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No items selected
                    </p>
                  )}
                </div>
              </div>

              {/* Export Button */}
              <Button
                onClick={handleExport}
                disabled={isExporting || selectedCount === 0}
                className="w-full gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : exportComplete ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Export Complete
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export Package
                  </>
                )}
              </Button>

              {exportComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg"
                >
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Export successful!</span>
                  </div>
                  <p className="text-xs text-emerald-600 mt-1">
                    Your files have been generated and downloaded.
                  </p>
                </motion.div>
              )}

              {exportError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Export failed</span>
                  </div>
                  <p className="text-xs text-red-600 mt-1">{exportError}</p>
                </motion.div>
              )}

              {/* Note */}
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-4 w-4 shrink-0 text-brand-gold" />
                <p>
                  Exports include AI-generated insights, solution recommendations, and
                  future state designs from your session.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </StageLanding>
  );
}

