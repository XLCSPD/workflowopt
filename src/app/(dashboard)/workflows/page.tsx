"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  GitBranch,
  MoreVertical,
  Edit,
  Trash2,
  Play,
  Users,
  Clock,
  ArrowRight,
  Loader2,
  Upload,
  LayoutGrid,
  List,
  ArrowUpDown,
  Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getAllWorkflowsWithStats,
  createProcess,
  deleteProcess,
} from "@/lib/services/workflows";
import { WorkflowImportDialog } from "@/components/workflow/WorkflowImportDialog";
import { CopyWorkflowDialog } from "@/components/workflow/CopyWorkflowDialog";
import type { Process } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuthStore } from "@/lib/stores/authStore";

interface WorkflowWithStats extends Process {
  stepCount: number;
  laneCount: number;
  sessionCount: number;
}

type ViewMode = "grid" | "list";
type SortKey = "updated_at" | "name" | "stepCount" | "laneCount" | "sessionCount";
type SortDir = "asc" | "desc";

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  // Dates (ISO strings)
  if (typeof a === "string" && typeof b === "string") {
    const aTime = Date.parse(a);
    const bTime = Date.parse(b);
    if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) return aTime - bTime;
    return a.localeCompare(b);
  }

  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export default function WorkflowsPage() {
  const { toast } = useToast();
  useAuthStore(); // Auth store for potential future use
  const [workflows, setWorkflows] = useState<WorkflowWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({ name: "", description: "" });

  // Copy workflow dialog state (AC-1.1)
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [workflowToCopy, setWorkflowToCopy] = useState<WorkflowWithStats | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [laneFilter, setLaneFilter] = useState<"all" | "1" | "2" | "3" | "4+">("all");
  const [stepsFilter, setStepsFilter] = useState<"all" | "0-5" | "6-10" | "11-20" | "21+">("all");
  const [sessionsFilter, setSessionsFilter] = useState<"all" | "0" | "1+">("all");

  // Handler to open copy dialog (AC-1.1)
  const handleOpenCopyDialog = useCallback((workflow: WorkflowWithStats) => {
    setWorkflowToCopy(workflow);
    setIsCopyDialogOpen(true);
  }, []);


  const loadWorkflows = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getAllWorkflowsWithStats();
      setWorkflows(data);
    } catch (error) {
      console.error("Failed to load workflows:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load workflows. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Fetch workflows on mount
  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  // Persist view mode
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("workflows.viewMode");
      if (saved === "grid" || saved === "list") setViewMode(saved);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("workflows.viewMode", viewMode);
    } catch {
      // ignore
    }
  }, [viewMode]);

  // Handle import success
  const handleImportSuccess = useCallback(() => {
    // Refresh the workflows list
    loadWorkflows();
  }, [loadWorkflows]);

  const filteredWorkflows = workflows
    .filter((workflow) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        workflow.name.toLowerCase().includes(q) ||
        (workflow.description?.toLowerCase().includes(q) ?? false)
      );
    })
    .filter((workflow) => {
      if (laneFilter === "all") return true;
      if (laneFilter === "4+") return workflow.laneCount >= 4;
      return workflow.laneCount === Number(laneFilter);
    })
    .filter((workflow) => {
      if (stepsFilter === "all") return true;
      if (stepsFilter === "0-5") return workflow.stepCount >= 0 && workflow.stepCount <= 5;
      if (stepsFilter === "6-10") return workflow.stepCount >= 6 && workflow.stepCount <= 10;
      if (stepsFilter === "11-20") return workflow.stepCount >= 11 && workflow.stepCount <= 20;
      return workflow.stepCount >= 21;
    })
    .filter((workflow) => {
      if (sessionsFilter === "all") return true;
      if (sessionsFilter === "0") return workflow.sessionCount === 0;
      return workflow.sessionCount >= 1;
    })
    .sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const cmp = compareValues(aVal, bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "name" ? "asc" : "desc");
  };

  const handleCreateWorkflow = async () => {
    if (!newWorkflow.name.trim()) return;

    try {
      setIsCreating(true);
      const created = await createProcess({
        name: newWorkflow.name,
        description: newWorkflow.description,
      });

      // Add to list with empty stats
      setWorkflows([
        {
          ...created,
          stepCount: 0,
          laneCount: 0,
          sessionCount: 0,
        },
        ...workflows,
      ]);

      setNewWorkflow({ name: "", description: "" });
      setIsCreateDialogOpen(false);

      toast({
        title: "Workflow created",
        description: "Your new workflow has been created successfully.",
      });
    } catch (error) {
      console.error("Failed to create workflow:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create workflow. Please try again.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    try {
      await deleteProcess(id);
      setWorkflows(workflows.filter((w) => w.id !== id));
      toast({
        title: "Workflow deleted",
        description: "The workflow has been deleted successfully.",
      });
    } catch (error) {
      console.error("Failed to delete workflow:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete workflow. Please try again.",
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Workflow Library"
        description="Manage and analyze your process workflows"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy">
                  <Plus className="mr-2 h-4 w-4" />
                  New Workflow
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Workflow</DialogTitle>
                <DialogDescription>
                  Add a new process workflow to your library
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Workflow Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Order Processing Workflow"
                    value={newWorkflow.name}
                    onChange={(e) =>
                      setNewWorkflow({ ...newWorkflow, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this workflow does..."
                    value={newWorkflow.description}
                    onChange={(e) =>
                      setNewWorkflow({
                        ...newWorkflow,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateWorkflow}
                  className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                  disabled={isCreating || !newWorkflow.name.trim()}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Workflow"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      {/* Import Dialog */}
      <WorkflowImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onSuccess={handleImportSuccess}
      />

      {/* Copy Workflow Dialog (AC-1.1) */}
      {workflowToCopy && (
        <CopyWorkflowDialog
          open={isCopyDialogOpen}
          onOpenChange={(open) => {
            setIsCopyDialogOpen(open);
            if (!open) setWorkflowToCopy(null);
          }}
          workflow={workflowToCopy}
          onSuccess={() => {
            // Refresh the list after copy
            loadWorkflows();
          }}
        />
      )}

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Search + View/Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant={viewMode === "grid" ? "default" : "outline"}
                className={viewMode === "grid" ? "bg-brand-navy text-white hover:bg-brand-navy/90" : "bg-white"}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Grid
              </Button>
              <Button
                type="button"
                variant={viewMode === "list" ? "default" : "outline"}
                className={viewMode === "list" ? "bg-brand-navy text-white hover:bg-brand-navy/90" : "bg-white"}
                onClick={() => setViewMode("list")}
              >
                <List className="mr-2 h-4 w-4" />
                List
              </Button>

              {/* Quick filters (List view is where these shine, but apply to both) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-white">
                    Lanes: {laneFilter}
                    <ArrowUpDown className="ml-2 h-4 w-4 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {(["all", "1", "2", "3", "4+"] as const).map((v) => (
                    <DropdownMenuItem key={v} onClick={() => setLaneFilter(v)}>
                      {v === "all" ? "All lanes" : v === "4+" ? "4+ lanes" : `${v} lane${v === "1" ? "" : "s"}`}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-white">
                    Steps: {stepsFilter}
                    <ArrowUpDown className="ml-2 h-4 w-4 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {(["all", "0-5", "6-10", "11-20", "21+"] as const).map((v) => (
                    <DropdownMenuItem key={v} onClick={() => setStepsFilter(v)}>
                      {v === "all" ? "All steps" : `${v} steps`}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-white">
                    Sessions: {sessionsFilter}
                    <ArrowUpDown className="ml-2 h-4 w-4 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setSessionsFilter("all")}>All</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSessionsFilter("0")}>0 sessions</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSessionsFilter("1+")}>1+ sessions</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {(laneFilter !== "all" || stepsFilter !== "all" || sessionsFilter !== "all") && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setLaneFilter("all");
                    setStepsFilter("all");
                    setSessionsFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
          </div>
        ) : (
          <>
            {/* Workflow Grid */}
            {viewMode === "grid" ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredWorkflows.map((workflow) => (
                <Card
                  key={workflow.id}
                  className="group hover:shadow-md transition-all duration-200"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-brand-navy/10">
                          <GitBranch className="h-5 w-5 text-brand-navy" />
                        </div>
                        <div>
                          <CardTitle className="text-base line-clamp-1">
                            {workflow.name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            by {workflow.created_by || "Unknown"}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/workflows/${workflow.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenCopyDialog(workflow)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy workflow
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteWorkflow(workflow.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {workflow.description || "No description provided"}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {workflow.stepCount} steps
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {workflow.laneCount} lanes
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Users className="mr-1 h-3 w-3" />
                        {workflow.sessionCount} sessions
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Updated {new Date(workflow.updated_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button asChild variant="outline" className="flex-1">
                        <Link href={`/workflows/${workflow.id}`}>
                          View Workflow
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        asChild
                        className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                      >
                        <Link href={`/sessions/new?workflow=${workflow.id}`}>
                          <Play className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border bg-white overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[260px]">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 font-medium"
                          onClick={() => toggleSort("name")}
                        >
                          Workflow
                          <ArrowUpDown className="h-4 w-4 opacity-60" />
                        </button>
                      </TableHead>
                      <TableHead className="min-w-[320px]">Description</TableHead>
                      <TableHead>
                        <button type="button" className="inline-flex items-center gap-2" onClick={() => toggleSort("stepCount")}>
                          Steps
                          <ArrowUpDown className="h-4 w-4 opacity-60" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button type="button" className="inline-flex items-center gap-2" onClick={() => toggleSort("laneCount")}>
                          Lanes
                          <ArrowUpDown className="h-4 w-4 opacity-60" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button type="button" className="inline-flex items-center gap-2" onClick={() => toggleSort("sessionCount")}>
                          Sessions
                          <ArrowUpDown className="h-4 w-4 opacity-60" />
                        </button>
                      </TableHead>
                      <TableHead className="min-w-[140px]">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2"
                          onClick={() => toggleSort("updated_at")}
                        >
                          Updated
                          <ArrowUpDown className="h-4 w-4 opacity-60" />
                        </button>
                      </TableHead>
                      <TableHead className="min-w-[220px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWorkflows.map((workflow) => (
                      <TableRow key={workflow.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-brand-navy/10">
                              <GitBranch className="h-4 w-4 text-brand-navy" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate">{workflow.name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                by {workflow.created_by || "Unknown"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <span className="line-clamp-2">
                            {workflow.description || "No description provided"}
                          </span>
                        </TableCell>
                        <TableCell>{workflow.stepCount}</TableCell>
                        <TableCell>{workflow.laneCount}</TableCell>
                        <TableCell>{workflow.sessionCount}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(workflow.updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button asChild variant="outline" size="sm" className="bg-white">
                              <Link href={`/workflows/${workflow.id}`}>
                                View
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              asChild
                              size="sm"
                              className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                            >
                              <Link href={`/sessions/new?workflow=${workflow.id}`}>
                                <Play className="h-4 w-4" />
                              </Link>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/workflows/${workflow.id}`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenCopyDialog(workflow)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy workflow
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteWorkflow(workflow.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {filteredWorkflows.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <GitBranch className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No workflows found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? "Try adjusting your search query"
                    : "Create your first workflow to get started"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Workflow
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
