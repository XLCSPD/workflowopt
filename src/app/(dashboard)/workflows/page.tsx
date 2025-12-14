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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getAllWorkflowsWithStats,
  createProcess,
  deleteProcess,
} from "@/lib/services/workflows";
import { WorkflowImportDialog } from "@/components/workflow/WorkflowImportDialog";
import type { Process } from "@/types";

interface WorkflowWithStats extends Process {
  stepCount: number;
  laneCount: number;
  sessionCount: number;
}

export default function WorkflowsPage() {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<WorkflowWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({ name: "", description: "" });

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

  // Handle import success
  const handleImportSuccess = useCallback(
    (processId: string) => {
      // Refresh the workflows list
      loadWorkflows();
    },
    [loadWorkflows]
  );

  const filteredWorkflows = workflows.filter(
    (workflow) =>
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (workflow.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

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

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
          </div>
        ) : (
          <>
            {/* Workflow Grid */}
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
