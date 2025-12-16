"use client";

import { useState, useCallback, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  FileJson,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Download,
  ArrowRight,
  Copy,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  parseJSON,
  parseCSV,
  parsePremierHealthCSV,
  importWorkflow,
  generateSampleJSON,
  generateSampleCSV,
  type ImportValidationResult,
} from "@/lib/services/workflowImport";

interface WorkflowImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (processId: string) => void;
}

type ImportTab = "json" | "csv";
type ImportStep = "upload" | "preview" | "importing";

export function WorkflowImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: WorkflowImportDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const connectionsFileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [activeTab, setActiveTab] = useState<ImportTab>("json");
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");
  const [isImporting, setIsImporting] = useState(false);

  // JSON state
  const [jsonContent, setJsonContent] = useState("");

  // CSV state
  const [csvContent, setCsvContent] = useState("");
  const [connectionsCsvContent, setConnectionsCsvContent] = useState("");
  const [hasConnectionsFile, setHasConnectionsFile] = useState(false);

  // Validation results
  const [validationResult, setValidationResult] =
    useState<ImportValidationResult | null>(null);

  // Workflow name override
  const [workflowName, setWorkflowName] = useState("");

  // Reset all state
  const resetState = useCallback(() => {
    setActiveTab("json");
    setCurrentStep("upload");
    setIsImporting(false);
    setJsonContent("");
    setCsvContent("");
    setConnectionsCsvContent("");
    setHasConnectionsFile(false);
    setValidationResult(null);
    setWorkflowName("");
  }, []);

  // Handle dialog close
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        resetState();
      }
      onOpenChange(open);
    },
    [onOpenChange, resetState]
  );

  // File upload handlers
  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>, type: "main" | "connections") => {
      const file = event.target.files?.[0];
      if (!file) return;

      const content = await file.text();

      if (type === "main") {
        if (file.name.endsWith(".json")) {
          setActiveTab("json");
          setJsonContent(content);
        } else if (file.name.endsWith(".csv")) {
          setActiveTab("csv");
          setCsvContent(content);
          // Extract workflow name from filename
          const baseName = file.name.replace(/\.csv$/i, "");
          setWorkflowName(baseName);
        }
      } else {
        setConnectionsCsvContent(content);
        setHasConnectionsFile(true);
      }
    },
    []
  );

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      const content = await file.text();

      if (file.name.endsWith(".json")) {
        setActiveTab("json");
        setJsonContent(content);
      } else if (file.name.endsWith(".csv")) {
        setActiveTab("csv");
        setCsvContent(content);
        const baseName = file.name.replace(/\.csv$/i, "");
        setWorkflowName(baseName);
      }
    },
    []
  );

  // Validate and preview
  const handleValidate = useCallback(() => {
    let result: ImportValidationResult;

    if (activeTab === "json") {
      result = parseJSON(jsonContent);
    } else {
      // Try Premier Health format first, then standard CSV
      result = parsePremierHealthCSV(csvContent, workflowName || "Imported Workflow");

      // If connections file provided, re-parse with connections
      if (hasConnectionsFile && connectionsCsvContent) {
        result = parseCSV(csvContent, {
          hasConnections: true,
          connectionsCsvContent,
        });
      }
    }

    // Apply workflow name override
    if (result.valid && result.data && workflowName) {
      result.data.name = workflowName;
    }

    setValidationResult(result);

    if (result.valid) {
      setCurrentStep("preview");
    } else {
      const first =
        result.errors[0]?.message ||
        (result.errors[0]?.field ? `${result.errors[0]?.field}: invalid` : undefined) ||
        "Could not validate the import file.";
      toast({
        variant: "destructive",
        title: "Validation failed",
        description: `${first} (${result.errors.length} error${
          result.errors.length === 1 ? "" : "s"
        }). Scroll down to see details.`,
      });
    }
  }, [
    activeTab,
    jsonContent,
    csvContent,
    connectionsCsvContent,
    hasConnectionsFile,
    workflowName,
    toast,
  ]);

  // Execute import
  const handleImport = useCallback(async () => {
    if (!validationResult?.valid || !validationResult.data) return;

    setIsImporting(true);
    setCurrentStep("importing");

    try {
      const result = await importWorkflow(validationResult.data);

      if (result.success && result.process) {
        toast({
          title: "Workflow imported successfully!",
          description: `Created "${result.process.name}" with ${result.steps?.length || 0} steps.`,
        });
        handleOpenChange(false);
        onSuccess?.(result.process.id);
        router.push(`/workflows/${result.process.id}`);
      } else {
        toast({
          variant: "destructive",
          title: "Import failed",
          description: result.errors?.join(", ") || "Unknown error",
        });
        setCurrentStep("preview");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
      setCurrentStep("preview");
    } finally {
      setIsImporting(false);
    }
  }, [validationResult, toast, handleOpenChange, onSuccess, router]);

  // Download sample files
  const handleDownloadSample = useCallback(
    (format: "json" | "csv") => {
      if (format === "json") {
        const sample = generateSampleJSON();
        const blob = new Blob([sample], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "sample-workflow.json";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const { steps, connections } = generateSampleCSV();

        // Download steps
        const stepsBlob = new Blob([steps], { type: "text/csv" });
        const stepsUrl = URL.createObjectURL(stepsBlob);
        const stepsLink = document.createElement("a");
        stepsLink.href = stepsUrl;
        stepsLink.download = "sample-workflow-steps.csv";
        stepsLink.click();
        URL.revokeObjectURL(stepsUrl);

        // Download connections
        setTimeout(() => {
          const connsBlob = new Blob([connections], { type: "text/csv" });
          const connsUrl = URL.createObjectURL(connsBlob);
          const connsLink = document.createElement("a");
          connsLink.href = connsUrl;
          connsLink.download = "sample-workflow-connections.csv";
          connsLink.click();
          URL.revokeObjectURL(connsUrl);
        }, 100);
      }

      toast({
        title: "Sample downloaded",
        description: `Sample ${format.toUpperCase()} file(s) downloaded.`,
      });
    },
    [toast]
  );

  // Copy sample to textarea
  const handleCopySample = useCallback(() => {
    if (activeTab === "json") {
      setJsonContent(generateSampleJSON());
    } else {
      const { steps } = generateSampleCSV();
      setCsvContent(steps);
    }
  }, [activeTab]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-brand-gold" />
            Import Workflow
          </DialogTitle>
          <DialogDescription>
            Upload a JSON or CSV file to create a new workflow with steps and connections.
          </DialogDescription>
        </DialogHeader>

        {currentStep === "upload" && (
          <div className="flex-1 overflow-auto">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ImportTab)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="json" className="flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  JSON
                </TabsTrigger>
                <TabsTrigger value="csv" className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV
                </TabsTrigger>
              </TabsList>

              <TabsContent value="json" className="space-y-4 mt-4">
                {/* Drop zone */}
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-brand-gold hover:bg-brand-gold/5 transition-colors"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.csv"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, "main")}
                  />
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium">Drag & drop a file here, or click to browse</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Supports .json and .csv files
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or paste JSON content
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="json-content">JSON Content</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopySample}
                        className="text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Load Sample
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadSample("json")}
                        className="text-xs"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download Sample
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    id="json-content"
                    placeholder='{"name": "My Workflow", "steps": [...], "connections": [...]}'
                    className="font-mono text-sm h-48"
                    value={jsonContent}
                    onChange={(e) => setJsonContent(e.target.value)}
                  />
                </div>

                {/* Schema hint */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>JSON Schema</AlertTitle>
                  <AlertDescription className="text-xs mt-2">
                    <code className="block bg-muted p-2 rounded text-xs overflow-x-auto">
                      {`{
  "name": "Workflow Name",
  "description": "Optional description",
  "lanes": ["Lane1", "Lane2"],
  "steps": [
    { "id": "step-1", "name": "Step Name", "lane": "Lane1", "type": "action", "description": "..." }
  ],
  "connections": [
    { "from": "step-1", "to": "step-2", "label": "Optional" }
  ]
}`}
                    </code>
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="csv" className="space-y-4 mt-4">
                {/* Workflow name input */}
                <div className="space-y-2">
                  <Label htmlFor="workflow-name">Workflow Name</Label>
                  <Input
                    id="workflow-name"
                    placeholder="Enter workflow name"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                  />
                </div>

                {/* Steps CSV */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="csv-content">Steps CSV</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopySample}
                        className="text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Load Sample
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadSample("csv")}
                        className="text-xs"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download Sample
                      </Button>
                    </div>
                  </div>

                  {/* File upload for CSV */}
                  <div
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-brand-gold hover:bg-brand-gold/5 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "main")}
                    />
                    <FileSpreadsheet className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm">Click to upload steps CSV file</p>
                  </div>

                  <Textarea
                    id="csv-content"
                    placeholder="id,name,lane,type,description,order"
                    className="font-mono text-sm h-32"
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                  />
                </div>

                {/* Connections CSV (optional) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="connections-csv">Connections CSV (Optional)</Label>
                    {hasConnectionsFile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setConnectionsCsvContent("");
                          setHasConnectionsFile(false);
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>

                  {!hasConnectionsFile ? (
                    <div
                      className="border border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-brand-gold hover:bg-brand-gold/5 transition-colors"
                      onClick={() => connectionsFileInputRef.current?.click()}
                    >
                      <input
                        ref={connectionsFileInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "connections")}
                      />
                      <p className="text-sm text-muted-foreground">
                        Click to upload connections CSV (or steps will be connected sequentially)
                      </p>
                    </div>
                  ) : (
                    <Textarea
                      id="connections-csv"
                      placeholder="from,to,label"
                      className="font-mono text-sm h-24"
                      value={connectionsCsvContent}
                      onChange={(e) => setConnectionsCsvContent(e.target.value)}
                    />
                  )}
                </div>

                {/* CSV format hint */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Supported CSV Formats</AlertTitle>
                  <AlertDescription className="text-xs mt-2 space-y-2">
                    <p>
                      <strong>Standard format:</strong> id, name, lane, type, description, order
                    </p>
                    <p>
                      <strong>Premier Health format:</strong> Step, Owner, Action / Process Step,
                      Interaction / Trigger
                    </p>
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>

            {/* Validation errors */}
            {validationResult && !validationResult.valid && (
              <div className="mt-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Validation Errors</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {validationResult.errors.map((error, idx) => (
                        <li key={idx} className="text-sm">
                          {error.row && <Badge variant="outline" className="mr-1">Row {error.row}</Badge>}
                          {error.field && <Badge variant="secondary" className="mr-1">{error.field}</Badge>}
                          {error.message}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        )}

        {currentStep === "preview" && validationResult?.data && (
          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="space-y-4 pr-4">
              {/* Workflow info */}
              <div className="space-y-2">
                <Label htmlFor="preview-name">Workflow Name</Label>
                <Input
                  id="preview-name"
                  value={validationResult.data.name}
                  onChange={(e) => {
                    if (validationResult.data) {
                      setValidationResult({
                        ...validationResult,
                        data: { ...validationResult.data, name: e.target.value },
                      });
                    }
                  }}
                />
              </div>

              {validationResult.data.description && (
                <p className="text-sm text-muted-foreground">
                  {validationResult.data.description}
                </p>
              )}

              <Separator />

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-brand-navy">
                    {validationResult.data.steps.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Steps</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-brand-navy">
                    {validationResult.data.lanes?.length ||
                      new Set(validationResult.data.steps.map((s) => s.lane)).size}
                  </p>
                  <p className="text-xs text-muted-foreground">Swimlanes</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-brand-navy">
                    {validationResult.data.connections?.length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Connections</p>
                </div>
              </div>

              {/* Warnings */}
              {validationResult.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Warnings</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {validationResult.warnings.map((warning, idx) => (
                        <li key={idx} className="text-sm">
                          {warning.message}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Steps preview */}
              <div>
                <Label className="mb-2 block">Steps Preview</Label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Name</th>
                        <th className="px-3 py-2 text-left font-medium">Lane</th>
                        <th className="px-3 py-2 text-left font-medium">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationResult.data.steps.slice(0, 10).map((step, idx) => (
                        <tr key={step.id} className={idx % 2 === 0 ? "" : "bg-muted/30"}>
                          <td className="px-3 py-2">{step.name}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline">{step.lane}</Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="secondary" className="capitalize">
                              {step.type}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {validationResult.data.steps.length > 10 && (
                    <div className="px-3 py-2 bg-muted text-center text-sm text-muted-foreground">
                      ... and {validationResult.data.steps.length - 10} more steps
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        )}

        {currentStep === "importing" && (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-brand-gold mb-4" />
            <p className="text-lg font-medium">Importing workflow...</p>
            <p className="text-sm text-muted-foreground">
              Creating {validationResult?.data?.steps.length || 0} steps and{" "}
              {validationResult?.data?.connections?.length || 0} connections
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {currentStep === "upload" && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleValidate}
                disabled={
                  (activeTab === "json" && !jsonContent.trim()) ||
                  (activeTab === "csv" && !csvContent.trim())
                }
                className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
              >
                Validate & Preview
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}

          {currentStep === "preview" && (
            <>
              <Button variant="outline" onClick={() => setCurrentStep("upload")}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting}
                className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Import Workflow
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

