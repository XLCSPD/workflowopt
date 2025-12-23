"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  X,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Loader2,
  Check,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Target,
  Inbox,
  Cog,
  GitFork,
  Package,
  Shield,
  Clock,
  Lightbulb,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { StepDesignChat } from "./StepDesignChat";
import type {
  FutureStateNode,
  StepContext,
  StepDesignVersion,
  StepDesignOption,
  DesignAssumption,
  SolutionCard,
  ProcessStep,
  StepContextData,
  StepDesignData,
} from "@/types";

interface StepDesignPanelProps {
  sessionId: string;
  futureStateId: string;
  nodeId: string;
  userId: string;
  onClose: () => void;
  onNodeUpdated?: () => void;
}

interface StepDesignState {
  node: FutureStateNode | null;
  context: StepContext | null;
  versions: StepDesignVersion[];
  latestVersion: StepDesignVersion | null;
  options: StepDesignOption[];
  assumptions: DesignAssumption[];
  linkedSolution: SolutionCard | null;
  sourceStep: ProcessStep | null;
}

export function StepDesignPanel({
  sessionId,
  futureStateId,
  nodeId,
  userId,
  onClose,
  onNodeUpdated,
}: StepDesignPanelProps) {
  const [state, setState] = useState<StepDesignState>({
    node: null,
    context: null,
    versions: [],
    latestVersion: null,
    options: [],
    assumptions: [],
    linkedSolution: null,
    sourceStep: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [researchMode, setResearchMode] = useState(false);
  const [selectedTab, setSelectedTab] = useState("options");
  const [pendingQuestions, setPendingQuestions] = useState<Array<{
    id: string;
    question: string;
    required: boolean;
    answer: string;
  }>>([]);
  const [contextNotes, setContextNotes] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["purpose", "inputs", "actions"])
  );
  const mountedRef = useRef(true);
  const fetchIdRef = useRef(0);
  const { toast } = useToast();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const currentFetchId = ++fetchIdRef.current;

    const fetchData = async () => {
      // Validate props before fetching
      if (!sessionId || !futureStateId || !nodeId) {
        if (mountedRef.current) {
          setError(`Missing required props`);
          setLoading(false);
        }
        return;
      }
      
    setLoading(true);
      setError(null);
      
      const url = `/api/future-state/step-design?sessionId=${sessionId}&futureStateId=${futureStateId}&nodeId=${nodeId}`;
      console.log("[StepDesignPanel] Fetching:", url, "fetchId:", currentFetchId);
      
      try {
        const response = await fetch(url);
        
        // Check if this is still the latest request and component is still mounted
        if (fetchIdRef.current !== currentFetchId || !mountedRef.current) {
          console.log("[StepDesignPanel] Ignoring stale response, fetchId:", currentFetchId);
          return;
        }
      
      if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.error || `Failed to fetch step design data (${response.status})`);
          console.error("Failed to fetch step design data:", response.status, errorData);
          setLoading(false);
        return;
      }

      const data = await response.json();
        
        // Double-check we're still the latest request
        if (fetchIdRef.current !== currentFetchId || !mountedRef.current) {
          console.log("[StepDesignPanel] Ignoring stale data, fetchId:", currentFetchId);
          return;
        }
        
        console.log("[StepDesignPanel] Data loaded successfully, fetchId:", currentFetchId);
        
      setState({
        node: data.node,
        context: data.context,
        versions: data.versions || [],
        latestVersion: data.latestVersion || null,
        options: data.options || [],
        assumptions: data.assumptions || [],
        linkedSolution: data.linkedSolution,
        sourceStep: data.sourceStep,
      });

      // Load pending questions from context
      const contextJson = data.context?.context_json as StepContextData | undefined;
      if (contextJson?.questions) {
        const unanswered = contextJson.questions
          .filter((q) => !q.answer)
          .map((q) => ({
            id: q.id,
            question: q.question,
            required: q.required,
            answer: "",
          }));
        setPendingQuestions(unanswered);
      }

      // Load context notes
      if (data.context?.notes) {
        setContextNotes(data.context.notes);
      }
        
      setLoading(false);
      } catch (err) {
        if (fetchIdRef.current !== currentFetchId || !mountedRef.current) {
          return;
        }
        
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        console.error("[StepDesignPanel] Fetch error:", err);
        setError(errorMessage);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [sessionId, futureStateId, nodeId]);

  // Refetch function for manual refresh (e.g., after saving)
  const refetchData = useCallback(async () => {
    const currentFetchId = ++fetchIdRef.current;
    
    if (!sessionId || !futureStateId || !nodeId) return;
    
    setLoading(true);
    setError(null);
    
    const url = `/api/future-state/step-design?sessionId=${sessionId}&futureStateId=${futureStateId}&nodeId=${nodeId}`;
    console.log("[StepDesignPanel] Refetching:", url);
    
    try {
      const response = await fetch(url);
      
      if (fetchIdRef.current !== currentFetchId || !mountedRef.current) return;
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || `Failed to fetch step design data (${response.status})`);
        setLoading(false);
        return;
      }

      const data = await response.json();
      
      if (fetchIdRef.current !== currentFetchId || !mountedRef.current) return;
      
      setState({
        node: data.node,
        context: data.context,
        versions: data.versions || [],
        latestVersion: data.latestVersion || null,
        options: data.options || [],
        assumptions: data.assumptions || [],
        linkedSolution: data.linkedSolution,
        sourceStep: data.sourceStep,
      });

      const contextJson = data.context?.context_json as StepContextData | undefined;
      if (contextJson?.questions) {
        const unanswered = contextJson.questions
          .filter((q) => !q.answer)
          .map((q) => ({
            id: q.id,
            question: q.question,
            required: q.required,
            answer: "",
          }));
        setPendingQuestions(unanswered);
      }

      if (data.context?.notes) {
        setContextNotes(data.context.notes);
      }
      
      setLoading(false);
    } catch (err) {
      if (fetchIdRef.current !== currentFetchId || !mountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("[StepDesignPanel] Refetch error:", err);
      setError(errorMessage);
      setLoading(false);
    }
  }, [sessionId, futureStateId, nodeId]);

  const handleRunAgent = async () => {
    setIsRunning(true);
    try {
      console.log("[StepDesignPanel] Starting step design agent...");
      const response = await fetch("/api/future-state/step-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          futureStateId,
          nodeId,
          researchMode,
          userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[StepDesignPanel] Step design error:", errorData);
        toast({
          variant: "destructive",
          title: "Step Design Failed",
          description: errorData.error || "Failed to generate step design. Check console for details.",
        });
        return;
      }

      const result = await response.json();
      console.log("[StepDesignPanel] Step design completed:", result);
      
      // Update state with new options
      setState((prev) => ({
        ...prev,
        latestVersion: result.version,
        options: result.options,
        versions: [result.version, ...prev.versions],
      }));

      // Handle new questions if any - automatically open chat
      if (result.questions?.length > 0) {
        toast({
          title: "Questions Needed",
          description: `AI needs ${result.questions.length} answer(s) to generate better design options.`,
        });
        setPendingQuestions(
          result.questions.map((q: { id: string; question: string; required: boolean }) => ({
            id: q.id,
            question: q.question,
            required: q.required,
            answer: "",
          }))
        );
        setSelectedTab("context");
        setShowChat(true); // Automatically open chat for Q&A
      } else if (result.options?.length > 0) {
        toast({
          title: "Design Options Generated",
          description: `Successfully generated ${result.options.length} design option(s).`,
        });
        // Successfully generated options - switch to Options tab
        setSelectedTab("options");
        setShowChat(false);
        setPendingQuestions([]); // Clear any answered questions
      }
    } catch (error) {
      console.error("[StepDesignPanel] Error running step design agent:", error);
      toast({
        variant: "destructive",
        title: "Step Design Error",
        description: error instanceof Error ? error.message : "Network error occurred. Please try again.",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSelectOption = async (optionId: string) => {
    if (!state.latestVersion) return;

    try {
      const response = await fetch("/api/future-state/step-design/select-option", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId: state.latestVersion.id,
          optionId,
          userId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Select option error:", error);
        return;
      }

      // Update local state
      setState((prev) => ({
        ...prev,
        latestVersion: prev.latestVersion
          ? { ...prev.latestVersion, selected_option_id: optionId, status: "accepted" }
          : null,
        node: prev.node
          ? {
              ...prev.node,
              step_design_status: "step_design_complete",
              active_step_design_version_id: prev.latestVersion?.id,
            }
          : null,
      }));

      onNodeUpdated?.();
    } catch (error) {
      console.error("Error selecting option:", error);
    }
  };

  const handleSaveContext = async () => {
    // Answer questions
    const answeredQuestions = pendingQuestions.filter((q) => q.answer.trim());
    
    for (const q of answeredQuestions) {
      await fetch("/api/future-state/step-design/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId,
          questionId: q.id,
          answer: q.answer,
          userId,
        }),
      });
    }

    // Save notes
    if (contextNotes !== (state.context?.notes || "")) {
      await fetch("/api/future-state/step-design/context", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          futureStateId,
          nodeId,
          notes: contextNotes,
          userId,
        }),
      });
    }

    // Refresh data
    await refetchData();
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const getAssumptionsForOption = (optionId: string) => {
    return state.assumptions.filter((a) => a.option_id === optionId);
  };

  // Debug: Log render state
  console.log("[StepDesignPanel] Render state:", { loading, error, hasNode: !!state.node, nodeId, sessionId, futureStateId });

  if (loading) {
    return (
      <div className="p-4 space-y-4 bg-white h-full">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h3 className="font-semibold text-brand-navy">Step Design</h3>
            <p className="text-xs text-muted-foreground">Loading step design data...</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Fetching design options...</span>
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-4 bg-white h-full">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-red-600">Error Loading Step Design</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm font-medium">Failed to load step design data</p>
          </div>
          <p className="text-xs text-red-600 mt-2">{error}</p>
        </div>
        <Button onClick={refetchData} variant="outline" className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (!state.node) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Node not found</p>
        <Button onClick={onClose} className="mt-4">Close</Button>
      </div>
    );
  }

  const actionBadgeColor = {
    keep: "bg-gray-100 text-gray-700",
    modify: "bg-blue-100 text-blue-700",
    remove: "bg-red-100 text-red-700",
    new: "bg-emerald-100 text-emerald-700",
  };

  const designStatusBadge = {
    strategy_only: { label: "Strategy Only", color: "bg-gray-100 text-gray-600" },
    needs_step_design: { label: "Needs Design", color: "bg-amber-100 text-amber-700" },
    step_design_complete: { label: "Design Complete", color: "bg-emerald-100 text-emerald-700" },
  };

  const status = designStatusBadge[state.node.step_design_status];
  const selectedOption = state.options.find(
    (o) => o.id === state.latestVersion?.selected_option_id
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header - No close button here, Sheet provides one */}
      <div className="shrink-0 p-4 pb-3 border-b bg-white">
        <div className="pr-8"> {/* Leave space for Sheet's close button */}
            <h3 className="font-semibold text-brand-navy truncate">{state.node.name}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={actionBadgeColor[state.node.action]}>
                {state.node.action}
              </Badge>
              <Badge className={status.color}>{status.label}</Badge>
              <span className="text-xs text-muted-foreground">{state.node.lane}</span>
            </div>
        </div>

        {/* Linked Solution */}
        {state.linkedSolution && (
          <div className="mt-3 p-2 bg-brand-gold/10 rounded-md text-xs">
            <div className="flex items-center gap-1 text-brand-navy font-medium">
              <Lightbulb className="h-3 w-3" />
              Linked Solution
            </div>
            <p className="mt-1 text-brand-navy/80">{state.linkedSolution.title}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="shrink-0 mx-4 mt-2 grid w-auto grid-cols-3">
          <TabsTrigger value="options" className="text-xs">
            Options
            {state.options.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1">
                {state.options.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="context" className="text-xs">
            Context
            {pendingQuestions.length > 0 && (
              <Badge className="ml-1 h-4 px-1 bg-amber-100 text-amber-700">
                {pendingQuestions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            History
          </TabsTrigger>
        </TabsList>

        {/* Options Tab */}
        <TabsContent value="options" className="flex-1 overflow-y-auto p-4 pt-3 space-y-3 m-0 data-[state=active]:flex data-[state=active]:flex-col">
          {/* Chat Prompt for Pending Questions */}
          {pendingQuestions.length > 0 && state.node.step_design_status !== "step_design_complete" && (
            <motion.button
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => {
                setSelectedTab("context");
                setShowChat(true);
              }}
              className={cn(
                "w-full p-3 rounded-lg border-2 border-dashed",
                "border-amber-300 bg-amber-50/50 hover:bg-amber-50",
                "flex items-center gap-3 transition-colors text-left"
              )}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-gold to-brand-gold/70 flex items-center justify-center shrink-0">
                <MessageSquare className="h-4 w-4 text-brand-navy" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-navy">
                  Answer {pendingQuestions.length} question{pendingQuestions.length > 1 ? "s" : ""} for better results
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Chat with AI to provide context
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-600 shrink-0" />
            </motion.button>
          )}

          {/* Run Agent Section */}
          {state.node.step_design_status !== "step_design_complete" && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm">Run Step Design Assist</h4>
                    <p className="text-xs text-muted-foreground">
                      AI will generate 2-3 design options
                    </p>
                  </div>
                  <Button
                    onClick={handleRunAgent}
                    disabled={isRunning}
                    size="sm"
                    className="gap-1.5"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Designing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="research-mode"
                    checked={researchMode}
                    onCheckedChange={setResearchMode}
                  />
                  <Label htmlFor="research-mode" className="text-xs cursor-pointer">
                    Research Mode (include industry patterns)
                  </Label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selected Option Display */}
          {selectedOption && (
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <CardTitle className="text-sm">Selected: {selectedOption.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">{selectedOption.summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Option Cards */}
          <AnimatePresence mode="popLayout">
            {state.options.map((option) => (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <StepDesignOptionCard
                  option={option}
                  assumptions={getAssumptionsForOption(option.id)}
                  isSelected={option.id === state.latestVersion?.selected_option_id}
                  onSelect={() => handleSelectOption(option.id)}
                  expandedSections={expandedSections}
                  onToggleSection={toggleSection}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {state.options.length === 0 && state.node.step_design_status !== "step_design_complete" && (
            <div className="text-center py-8 text-muted-foreground">
              <Cog className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No design options yet</p>
              <p className="text-xs">Run the Step Design Assist to generate options</p>
            </div>
          )}
        </TabsContent>

        {/* Context Tab */}
        <TabsContent value="context" className="flex-1 flex flex-col min-h-0 m-0">
          {/* Chat Mode - Full Height */}
          {showChat && pendingQuestions.length > 0 ? (
            <div className="flex-1 flex flex-col min-h-0">
              <StepDesignChat
                sessionId={sessionId}
                futureStateId={futureStateId}
                nodeId={nodeId}
                userId={userId}
                nodeName={state.node?.name || "Step"}
                initialQuestions={pendingQuestions}
                onContextComplete={() => {
                  setPendingQuestions([]);
                  refetchData();
                }}
                onGenerateDesign={async () => {
                  await handleRunAgent();
                  setShowChat(false);
                  setSelectedTab("options");
                }}
                    />
                  </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Chat Trigger for Pending Questions */}
              {pendingQuestions.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setShowChat(true)}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 border-dashed",
                    "border-amber-300 bg-gradient-to-br from-amber-50/80 to-amber-100/50",
                    "hover:from-amber-50 hover:to-amber-100/70",
                    "flex items-center gap-4 transition-all duration-200"
                  )}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-gold to-brand-gold/70 flex items-center justify-center shrink-0 shadow-md">
                    <Sparkles className="h-6 w-6 text-brand-navy" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-brand-navy">
                      AI needs {pendingQuestions.length} answer{pendingQuestions.length > 1 ? "s" : ""} to design this step
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Quick chat to gather context → better design options
                    </p>
                  </div>
                  <Badge className="bg-amber-200 text-amber-800 border-amber-300 shrink-0">
                    <HelpCircle className="h-3 w-3 mr-1" />
                    Start Chat
                  </Badge>
                </motion.button>
          )}

          {/* Notes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Notes & Context
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={contextNotes}
                onChange={(e) => setContextNotes(e.target.value)}
                placeholder="Add any additional context or notes about this step..."
                className="min-h-[100px] text-sm"
              />
            </CardContent>
          </Card>

          {/* Source Step Info */}
          {state.sourceStep && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Current State Reference</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                <p><span className="font-medium">Name:</span> {state.sourceStep.step_name}</p>
                {state.sourceStep.description && (
                  <p><span className="font-medium">Description:</span> {state.sourceStep.description}</p>
                )}
                {state.sourceStep.lead_time_minutes && (
                  <p><span className="font-medium">Lead Time:</span> {state.sourceStep.lead_time_minutes} min</p>
                )}
                {state.sourceStep.cycle_time_minutes && (
                  <p><span className="font-medium">Cycle Time:</span> {state.sourceStep.cycle_time_minutes} min</p>
                )}
              </CardContent>
            </Card>
          )}

              {contextNotes !== (state.context?.notes || "") && (
          <Button onClick={handleSaveContext} className="w-full" size="sm">
                  Save Notes
          </Button>
              )}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
          {state.versions.map((version) => (
            <Card key={version.id} className={cn(
              version.id === state.latestVersion?.id && "border-brand-gold"
            )}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Version {version.version}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(version.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      version.status === "accepted" && "bg-emerald-100 text-emerald-700 border-emerald-200",
                      version.status === "archived" && "bg-gray-100 text-gray-500"
                    )}
                  >
                    {version.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {state.versions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No design history yet</p>
            </div>
          )}
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ============================================
// STEP DESIGN OPTION CARD
// ============================================

interface StepDesignOptionCardProps {
  option: StepDesignOption;
  assumptions: DesignAssumption[];
  isSelected: boolean;
  onSelect: () => void;
  expandedSections: Set<string>;
  onToggleSection: (section: string) => void;
}

function StepDesignOptionCard({
  option,
  assumptions,
  isSelected,
  onSelect,
  expandedSections,
  onToggleSection,
}: StepDesignOptionCardProps) {
  const design = option.design_json as StepDesignData;
  const confidencePercent = Math.round(option.confidence * 100);

  const sections = [
    { key: "purpose", label: "Purpose", icon: Target, content: design.purpose },
    { key: "inputs", label: "Inputs", icon: Inbox, content: design.inputs },
    { key: "actions", label: "Actions", icon: ArrowRight, content: design.actions },
    { key: "decisions", label: "Decisions", icon: GitFork, content: design.decisions },
    { key: "outputs", label: "Outputs", icon: Package, content: design.outputs },
    { key: "controls", label: "Controls", icon: Shield, content: design.controls },
  ];

  return (
    <Card className={cn(
      "transition-all",
      isSelected && "ring-2 ring-emerald-400 bg-emerald-50/30"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {option.option_key}
            </Badge>
            <CardTitle className="text-sm">{option.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                confidencePercent >= 80
                  ? "bg-emerald-100 text-emerald-700"
                  : confidencePercent >= 50
                  ? "bg-amber-100 text-amber-700"
                  : "bg-red-100 text-red-700"
              )}
            >
              {confidencePercent}% confidence
            </Badge>
          </div>
        </div>
        <CardDescription className="text-xs">{option.summary}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Changes */}
        {option.changes && (
          <div className="text-xs">
            <p className="font-medium text-muted-foreground mb-1">Changes from Current</p>
            <p className="text-foreground">{option.changes}</p>
          </div>
        )}

        {/* Waste Addressed / Risks */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {option.waste_addressed.length > 0 && (
            <div>
              <p className="font-medium text-emerald-600 mb-1">Waste Addressed</p>
              <div className="flex flex-wrap gap-1">
                {option.waste_addressed.map((w, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] bg-emerald-50">
                    {w}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {option.risks.length > 0 && (
            <div>
              <p className="font-medium text-amber-600 mb-1">Risks</p>
              <div className="flex flex-wrap gap-1">
                {option.risks.map((r, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] bg-amber-50">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pattern Labels (if research mode) */}
        {option.pattern_labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {option.pattern_labels.map((label, i) => (
              <Badge key={i} className="text-[10px] bg-purple-100 text-purple-700">
                {label}
              </Badge>
            ))}
          </div>
        )}

        {/* Progressive Disclosure Sections */}
        <div className="space-y-1 pt-2 border-t">
          {sections.map((section) => {
            if (!section.content || (Array.isArray(section.content) && section.content.length === 0)) {
              return null;
            }
            const isExpanded = expandedSections.has(section.key);
            const Icon = section.icon;

            return (
              <Collapsible
                key={section.key}
                open={isExpanded}
                onOpenChange={() => onToggleSection(section.key)}
              >
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-xs py-1 hover:bg-muted/50 rounded px-1">
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{section.label}</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6 py-1 text-xs text-muted-foreground">
                  {typeof section.content === "string" ? (
                    <p>{section.content}</p>
                  ) : Array.isArray(section.content) ? (
                    <ul className="space-y-1">
                      {section.content.map((item, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-muted-foreground/50">•</span>
                          <span>
                            {typeof item === "string"
                              ? item
                              : "name" in item
                              ? item.name
                              : "description" in item
                              ? item.description
                              : JSON.stringify(item)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>

        {/* Timing */}
        {design.timing && (
          <div className="flex items-center gap-4 text-xs pt-2 border-t">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span>Lead: {design.timing.estimated_lead_time_minutes ?? "N/A"} min</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span>Cycle: {design.timing.estimated_cycle_time_minutes ?? "N/A"} min</span>
            </div>
          </div>
        )}

        {/* Assumptions */}
        {assumptions.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-xs py-1 hover:bg-muted/50 rounded px-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <span className="font-medium">Assumptions ({assumptions.length})</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {assumptions.map((a) => (
                <div key={a.id} className="text-xs bg-amber-50 p-2 rounded border border-amber-100">
                  <p className="font-medium">{a.assumption}</p>
                  {a.risk_if_wrong && (
                    <p className="text-amber-700 mt-1">Risk: {a.risk_if_wrong}</p>
                  )}
                  {a.validation_method && (
                    <p className="text-muted-foreground mt-1">Validate: {a.validation_method}</p>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Select Button */}
        {!isSelected && (
          <Button
            onClick={onSelect}
            variant="outline"
            size="sm"
            className="w-full mt-2"
          >
            <Check className="h-4 w-4 mr-1" />
            Select This Option
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

