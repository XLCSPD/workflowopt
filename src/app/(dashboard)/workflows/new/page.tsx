"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, GitBranch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createProcess } from "@/lib/services/workflowEditor";

export default function NewWorkflowPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a workflow name.",
      });
      return;
    }

    setIsCreating(true);
    try {
      const process = await createProcess({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      });

      toast({
        title: "Workflow created",
        description: "Your new workflow has been created successfully.",
      });

      router.push(`/workflows/${process.id}`);
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

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Create New Workflow"
        description="Design a new process workflow for waste identification"
      />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/workflows"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Workflows
          </Link>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-gold/20 flex items-center justify-center">
                  <GitBranch className="h-5 w-5 text-brand-gold" />
                </div>
                <div>
                  <CardTitle>Workflow Details</CardTitle>
                  <CardDescription>
                    Enter the basic information for your workflow
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Workflow Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Purchase Order Approval"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Choose a descriptive name for your workflow
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the purpose and scope of this workflow..."
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Add context to help participants understand this
                  workflow
                </p>
              </div>

              <div className="bg-brand-platinum/50 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2">What happens next?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>
                    • After creation, you&apos;ll be taken to the workflow editor
                  </li>
                  <li>• Add steps and connections to build your process map</li>
                  <li>• Define swimlanes to organize steps by role</li>
                  <li>
                    • Once complete, you can create sessions for waste walks
                  </li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => router.push("/workflows")}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={isCreating || !form.name.trim()}
                  className="flex-1 bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

