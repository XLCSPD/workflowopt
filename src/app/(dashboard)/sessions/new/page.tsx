"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Play, Users, GitBranch, Loader2 } from "lucide-react";

const sessionSchema = z.object({
  name: z.string().min(3, "Session name must be at least 3 characters"),
  workflowId: z.string().min(1, "Please select a workflow"),
});

type SessionFormData = z.infer<typeof sessionSchema>;

const mockWorkflows = [
  { id: "1", name: "Premier Health & Versatex Procurement Workflow", stepCount: 17 },
  { id: "2", name: "Claims Intake Processing", stepCount: 12 },
  { id: "3", name: "Invoice Approval Process", stepCount: 8 },
];

export default function NewSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedWorkflow = searchParams.get("workflow");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      name: "",
      workflowId: preselectedWorkflow || "",
    },
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Navigate to the new session
    router.push(`/sessions/1`);
  };

  const selectedWorkflow = mockWorkflows.find(
    (w) => w.id === form.watch("workflowId")
  );

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Create Waste Walk Session"
        description="Set up a new session to identify waste in your workflow"
        actions={
          <Button asChild variant="ghost">
            <Link href="/sessions">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-gold" />
                Session Details
              </CardTitle>
              <CardDescription>
                Configure your waste walk session settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Q1 Procurement Review"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Give your session a descriptive name
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="workflowId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Workflow</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a workflow to analyze" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {mockWorkflows.map((workflow) => (
                              <SelectItem key={workflow.id} value={workflow.id}>
                                <div className="flex items-center gap-2">
                                  <GitBranch className="h-4 w-4" />
                                  {workflow.name}
                                  <span className="text-muted-foreground">
                                    ({workflow.stepCount} steps)
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the workflow you want to analyze for waste
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedWorkflow && (
                    <div className="p-4 rounded-lg bg-brand-platinum/50 border">
                      <h4 className="font-medium mb-2">Selected Workflow</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedWorkflow.name}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedWorkflow.stepCount} steps to review
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Create & Start Session
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

