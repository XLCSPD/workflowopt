"use client";

import { useState } from "react";
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
} from "lucide-react";

interface Workflow {
  id: string;
  name: string;
  description: string;
  stepCount: number;
  laneCount: number;
  sessionCount: number;
  lastUpdated: string;
  createdBy: string;
}

const mockWorkflows: Workflow[] = [
  {
    id: "1",
    name: "Premier Health & Versatex Procurement Workflow",
    description: "End-to-end procurement workflow between Premier Health, Versatex, and Merchants for medical supplies and equipment.",
    stepCount: 17,
    laneCount: 3,
    sessionCount: 5,
    lastUpdated: "2024-01-15",
    createdBy: "Ayo Sasore",
  },
  {
    id: "2",
    name: "Claims Intake Processing",
    description: "Healthcare claims intake and initial processing workflow.",
    stepCount: 12,
    laneCount: 2,
    sessionCount: 3,
    lastUpdated: "2024-01-10",
    createdBy: "Jane Doe",
  },
  {
    id: "3",
    name: "Invoice Approval Process",
    description: "Multi-level approval process for vendor invoices.",
    stepCount: 8,
    laneCount: 4,
    sessionCount: 1,
    lastUpdated: "2024-01-05",
    createdBy: "John Smith",
  },
];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>(mockWorkflows);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({ name: "", description: "" });

  const filteredWorkflows = workflows.filter(
    (workflow) =>
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateWorkflow = () => {
    if (!newWorkflow.name.trim()) return;

    const workflow: Workflow = {
      id: Date.now().toString(),
      name: newWorkflow.name,
      description: newWorkflow.description,
      stepCount: 0,
      laneCount: 0,
      sessionCount: 0,
      lastUpdated: new Date().toISOString().split("T")[0],
      createdBy: "Current User",
    };

    setWorkflows([workflow, ...workflows]);
    setNewWorkflow({ name: "", description: "" });
    setIsCreateDialogOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Workflow Library"
        description="Manage and analyze your process workflows"
        actions={
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
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateWorkflow}
                  className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                >
                  Create Workflow
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
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
                        by {workflow.createdBy}
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
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {workflow.description}
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
                    Updated {new Date(workflow.lastUpdated).toLocaleDateString()}
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

        {filteredWorkflows.length === 0 && (
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
      </div>
    </div>
  );
}

