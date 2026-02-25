"use client";

import React, { useState, useCallback, useRef, useMemo, Suspense, lazy } from "react";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ImagePlus,
  X,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  CheckCircle,
  FileImage,
  FileText,
  Sparkles,
  Layers,
  ArrowRightLeft,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  importWorkflow,
  type WorkflowImportData,
} from "@/lib/services/workflowImport";
import type { ProcessStep } from "@/types";
import { computeLaneLayouts, getNodeYInLane, IMPORT_CONFIG } from "@/lib/layout/swimlaneLayout";

// Lazy-load ProcessMap to avoid loading ReactFlow/Dagre unless the preview step is reached
const ProcessMap = lazy(() =>
  import("@/components/workflow/ProcessMap").then((mod) => ({
    default: mod.ProcessMap,
  }))
);

// Error boundary to catch ProcessMap rendering errors without crashing the whole page
class PreviewErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("[ImageImport] Preview render error:", error);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mb-3" />
          <p className="text-sm font-medium mb-1">Preview failed to render</p>
          <p className="text-xs text-muted-foreground mb-3">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            className="text-xs text-brand-gold underline"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================
// TYPES
// ============================================

interface WorkflowImageImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (processId: string) => void;
}

type ImageImportStep = "upload" | "processing" | "preview" | "importing";

interface UploadedImage {
  id: string;
  file: File;
  base64: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  previewUrl: string;
  pageLabel: string;
}

interface AnalysisResult {
  data: WorkflowImportData;
  confidence: "high" | "medium" | "low";
  warnings: string[];
  model: string;
  provider: string;
}

// ============================================
// CONSTANTS
// ============================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_IMAGES = 10;
const MAX_IMAGE_DIMENSION = 7680; // Stay under Anthropic's 8000px limit
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const ACCEPTED_EXTENSIONS = ".png,.jpg,.jpeg,.webp,.gif,.pdf";

const STEP_WIDTH = 180;
const STEP_GAP = 40;

// ============================================
// HELPERS
// ============================================

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:image/...;base64, prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function extractPdfPages(file: File): Promise<UploadedImage[]> {
  // Use the minified ESM build to avoid webpack runtime conflicts
  // (pdf.mjs embeds its own __webpack_require__ which clashes with Next.js webpack)
  const pdfjs = await import("pdfjs-dist/build/pdf.min.mjs");

  // Set worker source (CDN with matching version)
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }

  const arrayBuffer = await file.arrayBuffer();

  let pdf;
  try {
    pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ImageImport] PDF load error:", msg);
    if (msg.toLowerCase().includes("password")) {
      throw new Error("This PDF is password-protected. Please remove the password and try again.");
    }
    throw new Error(`Could not read PDF: ${msg}`);
  }

  if (pdf.numPages === 0) {
    throw new Error("The PDF has no pages.");
  }

  const images: UploadedImage[] = [];
  const pageCount = Math.min(pdf.numPages, MAX_IMAGES);

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    if (images.length >= MAX_IMAGES) break;

    const page = await pdf.getPage(pageNum);
    // Always render at 2.0x for text clarity
    const scale = 2.0;
    const viewport = page.getViewport({ scale });
    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = viewport.width;
    fullCanvas.height = viewport.height;
    const fullCtx = fullCanvas.getContext("2d");
    if (!fullCtx) continue;

    await page.render({ canvas: fullCanvas, viewport }).promise;

    // If the rendered page fits within the API limit, use it directly
    if (viewport.width <= MAX_IMAGE_DIMENSION && viewport.height <= MAX_IMAGE_DIMENSION) {
      const dataUrl = fullCanvas.toDataURL("image/png");
      images.push({
        id: crypto.randomUUID(),
        file,
        base64: dataUrl.split(",")[1],
        mediaType: "image/png",
        previewUrl: dataUrl,
        pageLabel: pageCount > 1 ? `Page ${pageNum}` : "Full page",
      });
    } else {
      // Tile the page into sections that each fit within the limit
      const cols = Math.ceil(viewport.width / MAX_IMAGE_DIMENSION);
      const rows = Math.ceil(viewport.height / MAX_IMAGE_DIMENSION);
      const tileW = Math.ceil(viewport.width / cols);
      const tileH = Math.ceil(viewport.height / rows);
      const totalTiles = cols * rows;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (images.length >= MAX_IMAGES) break;

          const sx = col * tileW;
          const sy = row * tileH;
          const sw = Math.min(tileW, viewport.width - sx);
          const sh = Math.min(tileH, viewport.height - sy);

          const tileCanvas = document.createElement("canvas");
          tileCanvas.width = sw;
          tileCanvas.height = sh;
          const tileCtx = tileCanvas.getContext("2d");
          if (!tileCtx) continue;

          tileCtx.drawImage(fullCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

          const dataUrl = tileCanvas.toDataURL("image/png");
          const tileIndex = row * cols + col + 1;
          images.push({
            id: crypto.randomUUID(),
            file,
            base64: dataUrl.split(",")[1],
            mediaType: "image/png",
            previewUrl: dataUrl,
            pageLabel: `Page ${pageNum} (section ${tileIndex}/${totalTiles})`,
          });
        }
      }
    }
  }

  return images;
}

function importDataToPreviewProps(data: WorkflowImportData): {
  steps: ProcessStep[];
  connections: { source: string; target: string; label?: string }[];
  lanes: string[];
} {
  const lanes = data.lanes || Array.from(new Set(data.steps.map((s) => s.lane)));
  const laneIndices = new Map(lanes.map((l, i) => [l, i]));

  // Compute lane layouts for positioning
  const laneLayouts = computeLaneLayouts(lanes, new Map(), new Map(), IMPORT_CONFIG);

  const stepsByLane = new Map<string, typeof data.steps>();
  data.steps.forEach((step) => {
    const arr = stepsByLane.get(step.lane) || [];
    arr.push(step);
    stepsByLane.set(step.lane, arr);
  });

  const processSteps: ProcessStep[] = [];
  let globalOrder = 0;

  stepsByLane.forEach((laneSteps, lane) => {
    const sorted = [...laneSteps].sort(
      (a, b) => (a.order || 0) - (b.order || 0)
    );
    sorted.forEach((step, idx) => {
      const laneIndex = laneIndices.get(lane) || 0;
      const ll = laneLayouts[laneIndex];
      processSteps.push({
        id: step.id,
        process_id: "image-import-preview",
        step_name: step.name,
        description: step.description,
        lane: step.lane,
        step_type: step.type || "action",
        order_index: globalOrder++,
        lead_time_minutes: step.lead_time_minutes,
        cycle_time_minutes: step.cycle_time_minutes,
        position_x: STEP_GAP + idx * (STEP_WIDTH + STEP_GAP),
        position_y: ll ? getNodeYInLane(ll, 0, IMPORT_CONFIG) : 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });
  });

  const connections = (data.connections || []).map((c) => ({
    source: c.from,
    target: c.to,
    label: c.label,
  }));

  return { steps: processSteps, connections, lanes };
}

function getConfidenceBadgeColor(
  confidence: "high" | "medium" | "low"
): string {
  switch (confidence) {
    case "high":
      return "bg-green-100 text-green-800 border-green-300";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "low":
      return "bg-red-100 text-red-800 border-red-300";
  }
}

// ============================================
// COMPONENT
// ============================================

export function WorkflowImageImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: WorkflowImageImportDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step state
  const [currentStep, setCurrentStep] = useState<ImageImportStep>("upload");

  // Upload state
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [userHint, setUserHint] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Processing state
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [processingSuggestions, setProcessingSuggestions] = useState<string[]>(
    []
  );

  // Preview state
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [workflowName, setWorkflowName] = useState("");

  // Import state
  const [isImporting, setIsImporting] = useState(false);

  // ============================================
  // Reset
  // ============================================

  const resetDialog = useCallback(() => {
    setCurrentStep("upload");
    setUploadedImages([]);
    setUserHint("");
    setIsDragOver(false);
    setIsLoadingFiles(false);
    setProcessingError(null);
    setProcessingSuggestions([]);
    setAnalysisResult(null);
    setWorkflowName("");
    setIsImporting(false);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        resetDialog();
      }
      onOpenChange(open);
    },
    [onOpenChange, resetDialog]
  );

  // ============================================
  // File handling
  // ============================================

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      setIsLoadingFiles(true);

      try {
        const newImages: UploadedImage[] = [];

        for (const file of fileArray) {
          // Check total limit
          if (uploadedImages.length + newImages.length >= MAX_IMAGES) {
            toast({
              title: "Image limit reached",
              description: `Maximum ${MAX_IMAGES} images allowed`,
              variant: "destructive",
            });
            break;
          }

          // Handle PDF
          if (file.type === "application/pdf") {
            try {
              const pages = await extractPdfPages(file);
              const remaining =
                MAX_IMAGES - uploadedImages.length - newImages.length;
              newImages.push(...pages.slice(0, remaining));
            } catch (err) {
              const detail = err instanceof Error ? err.message : "Unknown error";
              console.error("[ImageImport] PDF extraction failed:", detail);
              toast({
                title: "PDF extraction failed",
                description: detail.startsWith("Could not read PDF") || detail.startsWith("This PDF")
                  ? detail
                  : `Could not extract pages from "${file.name}". ${detail}`,
                variant: "destructive",
              });
            }
            continue;
          }

          // Validate image type
          if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
            toast({
              title: "Unsupported file type",
              description: `"${file.name}" is not a supported image format`,
              variant: "destructive",
            });
            continue;
          }

          // Validate file size
          if (file.size > MAX_FILE_SIZE) {
            toast({
              title: "File too large",
              description: `"${file.name}" exceeds 10MB limit`,
              variant: "destructive",
            });
            continue;
          }

          const base64 = await fileToBase64(file);
          const previewUrl = URL.createObjectURL(file);

          newImages.push({
            id: crypto.randomUUID(),
            file,
            base64,
            mediaType: file.type as UploadedImage["mediaType"],
            previewUrl,
            pageLabel: `Image ${uploadedImages.length + newImages.length + 1}`,
          });
        }

        if (newImages.length > 0) {
          setUploadedImages((prev) => [...prev, ...newImages]);
        }
      } catch (err) {
        console.error("[ImageImport] File processing error:", err);
        toast({
          title: "File processing error",
          description: "An error occurred while processing your file. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingFiles(false);
      }
    },
    [uploadedImages.length, toast]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
      // Reset input so the same file can be selected again
      e.target.value = "";
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const removeImage = useCallback((id: string) => {
    setUploadedImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) {
        URL.revokeObjectURL(img.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  // ============================================
  // AI Analysis
  // ============================================

  const handleAnalyze = useCallback(async () => {
    setCurrentStep("processing");
    setProcessingError(null);
    setProcessingSuggestions([]);

    try {
      const response = await fetch("/api/workflows/image-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: uploadedImages.map((img) => ({
            base64: img.base64,
            mediaType: img.mediaType,
            pageLabel: img.pageLabel,
          })),
          userHint: userHint.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setProcessingError(
          result.error || "Failed to analyze images"
        );
        setProcessingSuggestions(result.suggestions || []);
        return;
      }

      setAnalysisResult({
        data: result.data,
        confidence: result.confidence,
        warnings: result.warnings || [],
        model: result.model,
        provider: result.provider,
      });
      setWorkflowName(result.data.name || "Imported Workflow");
      setCurrentStep("preview");
    } catch {
      setProcessingError(
        "Failed to connect to the analysis service. Please try again."
      );
    }
  }, [uploadedImages, userHint]);

  // ============================================
  // Import
  // ============================================

  const handleImport = useCallback(async () => {
    if (!analysisResult?.data) return;

    setCurrentStep("importing");
    setIsImporting(true);

    try {
      const dataToImport: WorkflowImportData = {
        ...analysisResult.data,
        name: workflowName.trim() || analysisResult.data.name,
      };

      const result = await importWorkflow(dataToImport);

      if (!result.success) {
        toast({
          title: "Import failed",
          description: result.errors?.join(", ") || "Unknown error",
          variant: "destructive",
        });
        setCurrentStep("preview");
        setIsImporting(false);
        return;
      }

      toast({
        title: "Workflow imported",
        description: `Created "${dataToImport.name}" with ${result.steps?.length || 0} steps`,
      });

      handleOpenChange(false);

      if (result.process?.id) {
        onSuccess?.(result.process.id);
        router.push(`/workflows/${result.process.id}`);
      }
    } catch {
      toast({
        title: "Import failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setCurrentStep("preview");
    } finally {
      setIsImporting(false);
    }
  }, [
    analysisResult,
    workflowName,
    handleOpenChange,
    onSuccess,
    router,
    toast,
  ]);

  // ============================================
  // Preview data (wrapped in try-catch to avoid page crash on bad AI data)
  // ============================================

  const { previewProps, previewError } = useMemo(() => {
    if (!analysisResult?.data) return { previewProps: null, previewError: null };
    try {
      return { previewProps: importDataToPreviewProps(analysisResult.data), previewError: null };
    } catch (err) {
      console.error("[ImageImport] Failed to generate preview:", err);
      return {
        previewProps: null,
        previewError: err instanceof Error ? err.message : "Failed to generate workflow preview",
      };
    }
  }, [analysisResult?.data]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5" />
            Import Workflow from Image
          </DialogTitle>
          <DialogDescription>
            Upload flowchart images or PDF documents to automatically convert
            them into a swimlane workflow
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {currentStep === "upload" && (
          <div className="flex-1 space-y-4 overflow-y-auto">
            {/* Drop zone */}
            <div
              className={`
                relative border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer
                text-center
                ${
                  isDragOver
                    ? "border-brand-gold bg-brand-gold/5"
                    : "border-gray-300 hover:border-gray-400"
                }
              `}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                multiple
                className="hidden"
                onChange={handleFileInputChange}
              />
              <ImagePlus className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">
                {isDragOver
                  ? "Drop images here..."
                  : "Click or drag images to upload"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, WebP, GIF, or PDF (max 10MB each, up to{" "}
                {MAX_IMAGES} images)
              </p>
              {isLoadingFiles && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-gold" />
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {uploadedImages.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Uploaded ({uploadedImages.length}/{MAX_IMAGES})
                </Label>
                <div className="flex flex-wrap gap-3">
                  {uploadedImages.map((img) => (
                    <div
                      key={img.id}
                      className="relative group rounded-lg border overflow-hidden"
                      style={{ width: 100, height: 80 }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.previewUrl}
                        alt={img.pageLabel}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                        {img.pageLabel}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(img.id);
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hint input */}
            <div className="space-y-2">
              <Label htmlFor="hint" className="text-sm font-medium">
                Context hint{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="hint"
                placeholder='e.g., "This is a procurement approval workflow" or "Drawn on whiteboard during meeting"'
                value={userHint}
                onChange={(e) => setUserHint(e.target.value)}
              />
            </div>

            {/* Info banner */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Tips for best results</AlertTitle>
              <AlertDescription className="text-xs">
                Clear text, distinct shapes (rectangles, diamonds, ovals), and
                visible arrows produce the most accurate results. Hand-drawn
                sketches work too, but digital diagrams are more reliable.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 2: Processing */}
        {currentStep === "processing" && !processingError && (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-brand-gold mb-4" />
            <p className="text-lg font-medium">Analyzing image{uploadedImages.length > 1 ? "s" : ""} with AI...</p>
            <p className="text-sm text-muted-foreground mt-1">
              Detecting shapes, text, connections, and swimlanes
            </p>
          </div>
        )}

        {/* Step 2 error state */}
        {currentStep === "processing" && processingError && (
          <div className="flex-1 space-y-4 py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Analysis failed</AlertTitle>
              <AlertDescription>{processingError}</AlertDescription>
            </Alert>

            {processingSuggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Suggestions:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {processingSuggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Preview - data error */}
        {currentStep === "preview" && analysisResult && previewError && (
          <div className="flex-1 space-y-4 py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Preview generation failed</AlertTitle>
              <AlertDescription>{previewError}</AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              The AI analysis completed but the workflow data could not be
              visualized. You can go back and try again with a clearer image.
            </p>
          </div>
        )}

        {/* Step 3: Preview */}
        {currentStep === "preview" && analysisResult && previewProps && !previewError && (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Split pane */}
            <div className="flex-1 grid grid-cols-5 gap-4 min-h-0">
              {/* Left: Original images */}
              <div className="col-span-2 flex flex-col min-h-0">
                <Label className="text-sm font-medium mb-2 flex items-center gap-1">
                  <FileImage className="h-3.5 w-3.5" />
                  Original Image{uploadedImages.length > 1 ? "s" : ""}
                </Label>
                <ScrollArea className="flex-1 rounded-lg border bg-gray-50">
                  <div className="p-3 space-y-3">
                    {uploadedImages.map((img) => (
                      <div key={img.id}>
                        {uploadedImages.length > 1 && (
                          <p className="text-xs text-muted-foreground mb-1">
                            {img.pageLabel}
                          </p>
                        )}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.previewUrl}
                          alt={img.pageLabel}
                          className="w-full rounded border"
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Right: React Flow preview */}
              <div className="col-span-3 flex flex-col min-h-0">
                <Label className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Detected Workflow
                </Label>
                <div className="flex-1 rounded-lg border bg-white overflow-hidden min-h-[300px]">
                  <PreviewErrorBoundary>
                    <Suspense
                      fallback={
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="h-6 w-6 animate-spin text-brand-gold" />
                        </div>
                      }
                    >
                      <ProcessMap
                        workflowId="image-import-preview"
                        steps={previewProps.steps}
                        connections={previewProps.connections}
                        lanes={previewProps.lanes}
                        isEditMode={false}
                      />
                    </Suspense>
                  </PreviewErrorBoundary>
                </div>
              </div>
            </div>

            {/* Bottom info bar */}
            <div className="space-y-3">
              {/* Stats + confidence */}
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="outline" className="gap-1">
                  <Layers className="h-3 w-3" />
                  {previewProps.steps.length} steps
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {previewProps.lanes.length} swimlane
                  {previewProps.lanes.length !== 1 ? "s" : ""}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <ArrowRightLeft className="h-3 w-3" />
                  {previewProps.connections.length} connection
                  {previewProps.connections.length !== 1 ? "s" : ""}
                </Badge>
                <Badge
                  variant="outline"
                  className={`gap-1 ${getConfidenceBadgeColor(analysisResult.confidence)}`}
                >
                  {analysisResult.confidence === "high"
                    ? "High"
                    : analysisResult.confidence === "medium"
                      ? "Medium"
                      : "Low"}{" "}
                  confidence
                </Badge>
              </div>

              {/* Warnings */}
              {analysisResult.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Notes</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside text-xs space-y-0.5">
                      {analysisResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Workflow name */}
              <div className="flex items-center gap-3">
                <Label
                  htmlFor="workflow-name"
                  className="text-sm font-medium whitespace-nowrap"
                >
                  Workflow name:
                </Label>
                <Input
                  id="workflow-name"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Importing */}
        {currentStep === "importing" && (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-brand-gold mb-4" />
            <p className="text-lg font-medium">Creating workflow...</p>
            <p className="text-sm text-muted-foreground">
              Saving {analysisResult?.data?.steps?.length || 0} steps and{" "}
              {analysisResult?.data?.connections?.length || 0} connections
            </p>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="gap-2">
          {currentStep === "upload" && (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAnalyze}
                disabled={uploadedImages.length === 0 || isLoadingFiles}
                className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Analyze Image{uploadedImages.length > 1 ? "s" : ""}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}

          {currentStep === "processing" && processingError && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentStep("upload");
                  setProcessingError(null);
                  setProcessingSuggestions([]);
                }}
              >
                Back
              </Button>
              <Button
                onClick={handleAnalyze}
                className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
              >
                Retry
              </Button>
            </>
          )}

          {currentStep === "preview" && (
            <>
              <Button
                variant="outline"
                onClick={() => setCurrentStep("upload")}
              >
                Back
              </Button>
              {!previewError && (
                <Button
                  onClick={handleImport}
                  disabled={isImporting || !workflowName.trim()}
                  className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Import Workflow
                </Button>
              )}
              {previewError && (
                <Button
                  onClick={handleAnalyze}
                  className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                >
                  Retry Analysis
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
