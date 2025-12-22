"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { StageLanding } from "./StudioShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileBarChart,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { FutureState, FutureStateNode, ProcessStep, SolutionCard } from "@/types";

interface CompareViewProps {
  sessionId: string;
}

interface MetricComparison {
  label: string;
  current: number | string;
  future: number | string;
  change: number;
  unit?: string;
  isGood: boolean;
}

export function CompareView({ sessionId }: CompareViewProps) {
  const [futureStates, setFutureStates] = useState<FutureState[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<string>("");
  const [selectedState, setSelectedState] = useState<
    (FutureState & { nodes: FutureStateNode[] }) | null
  >(null);
  const [currentSteps, setCurrentSteps] = useState<ProcessStep[]>([]);
  const [solutions, setSolutions] = useState<SolutionCard[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = getSupabaseClient();

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      // Get session to find process_id
      const { data: session } = await supabase
        .from("sessions")
        .select("process_id")
        .eq("id", sessionId)
        .single();

      if (!session) return;

      const [statesRes, stepsRes, solutionsRes] = await Promise.all([
        supabase
          .from("future_states")
          .select("*")
          .eq("session_id", sessionId)
          .order("version", { ascending: false }),
        supabase
          .from("process_steps")
          .select("*")
          .eq("process_id", session.process_id),
        supabase
          .from("solution_cards")
          .select("*")
          .eq("session_id", sessionId)
          .eq("status", "accepted"),
      ]);

      if (statesRes.data) setFutureStates(statesRes.data);
      if (stepsRes.data) setCurrentSteps(stepsRes.data);
      if (solutionsRes.data) setSolutions(solutionsRes.data);

      // Auto-select first future state
      if (statesRes.data && statesRes.data.length > 0) {
        setSelectedStateId(statesRes.data[0].id);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, supabase]);

  // Fetch selected state with nodes
  useEffect(() => {
    if (!selectedStateId) return;

    async function fetchSelectedState() {
      const { data } = await supabase
        .from("future_states")
        .select(`
          *,
          nodes:future_state_nodes(*)
        `)
        .eq("id", selectedStateId)
        .single();

      if (data) {
        setSelectedState(data as FutureState & { nodes: FutureStateNode[] });
      }
    }

    fetchSelectedState();
  }, [selectedStateId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate metrics
  const metrics = useMemo<MetricComparison[]>(() => {
    if (!selectedState || currentSteps.length === 0) return [];

    const futureNodes = selectedState.nodes || [];

    // Step counts
    const currentStepCount = currentSteps.length;
    const futureStepCount = futureNodes.filter((n) => n.action !== "remove").length;
    const stepChange = futureStepCount - currentStepCount;

    // Time calculations
    const currentLeadTime = currentSteps.reduce(
      (sum, s) => sum + (s.lead_time_minutes || 0),
      0
    );
    const futureLeadTime = futureNodes
      .filter((n) => n.action !== "remove")
      .reduce((sum, n) => sum + (n.lead_time_minutes || 0), 0);
    const leadTimeChange = currentLeadTime > 0 
      ? ((futureLeadTime - currentLeadTime) / currentLeadTime) * 100 
      : 0;

    const currentCycleTime = currentSteps.reduce(
      (sum, s) => sum + (s.cycle_time_minutes || 0),
      0
    );
    const futureCycleTime = futureNodes
      .filter((n) => n.action !== "remove")
      .reduce((sum, n) => sum + (n.cycle_time_minutes || 0), 0);
    const cycleTimeChange = currentCycleTime > 0 
      ? ((futureCycleTime - currentCycleTime) / currentCycleTime) * 100 
      : 0;

    // Changes
    const removedCount = futureNodes.filter((n) => n.action === "remove").length;
    const modifiedCount = futureNodes.filter((n) => n.action === "modify").length;
    const newCount = futureNodes.filter((n) => n.action === "new").length;

    return [
      {
        label: "Process Steps",
        current: currentStepCount,
        future: futureStepCount,
        change: stepChange,
        unit: "steps",
        isGood: stepChange <= 0,
      },
      {
        label: "Total Lead Time",
        current: currentLeadTime,
        future: futureLeadTime,
        change: Math.round(leadTimeChange),
        unit: "min",
        isGood: leadTimeChange <= 0,
      },
      {
        label: "Total Cycle Time",
        current: currentCycleTime,
        future: futureCycleTime,
        change: Math.round(cycleTimeChange),
        unit: "min",
        isGood: cycleTimeChange <= 0,
      },
      {
        label: "Steps Eliminated",
        current: 0,
        future: removedCount,
        change: removedCount,
        unit: "",
        isGood: true,
      },
      {
        label: "Steps Modified",
        current: 0,
        future: modifiedCount,
        change: modifiedCount,
        unit: "",
        isGood: true,
      },
      {
        label: "New Steps",
        current: 0,
        future: newCount,
        change: newCount,
        unit: "",
        isGood: true,
      },
    ];
  }, [selectedState, currentSteps]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <StageLanding
      stage="compare"
      title="Compare & Value Case"
      description="Compare current vs future state and build the value case"
      icon={FileBarChart}
      stats={[
        { label: "Future States", value: futureStates.length },
        { label: "Solutions Applied", value: solutions.length },
        { label: "Current Steps", value: currentSteps.length },
        {
          label: "Future Steps",
          value: selectedState?.nodes?.filter((n) => n.action !== "remove").length || 0,
        },
      ]}
      actions={
        futureStates.length > 0 && (
          <Select value={selectedStateId} onValueChange={setSelectedStateId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select version" />
            </SelectTrigger>
            <SelectContent>
              {futureStates.map((fs) => (
                <SelectItem key={fs.id} value={fs.id}>
                  {fs.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }
    >
      {futureStates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileBarChart className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No future states to compare
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
              Design a future state first to see comparison metrics
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={cn(
                    "transition-all",
                    metric.isGood && metric.change !== 0 && "border-emerald-200 bg-emerald-50/30",
                    !metric.isGood && metric.change !== 0 && "border-amber-200 bg-amber-50/30"
                  )}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground font-normal">
                      {metric.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold text-brand-navy">
                          {metric.future}
                          {metric.unit && (
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                              {metric.unit}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          from {metric.current} {metric.unit}
                        </p>
                      </div>
                      {metric.change !== 0 && (
                        <div
                          className={cn(
                            "flex items-center gap-1 text-sm font-medium",
                            metric.isGood ? "text-emerald-600" : "text-amber-600"
                          )}
                        >
                          {metric.change > 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          {Math.abs(metric.change)}
                          {metric.label.includes("Time") && "%"}
                        </div>
                      )}
                      {metric.change === 0 && (
                        <Minus className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Solutions Applied */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Solutions Applied ({solutions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Solution</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Effort</TableHead>
                    <TableHead>Expected Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {solutions.map((solution) => (
                    <TableRow key={solution.id}>
                      <TableCell className="font-medium">{solution.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {solution.bucket}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {solution.effort_level || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {solution.expected_impact || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {solutions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No solutions applied
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Value Case Summary */}
          <Card className="border-brand-gold/30 bg-brand-gold/5">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2 text-brand-navy">
                <TrendingUp className="h-4 w-4 text-brand-gold" />
                Value Case Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-medium">Key Improvements</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {metrics
                      .filter((m) => m.isGood && m.change !== 0)
                      .map((m) => (
                        <li key={m.label} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                          {m.label}: {m.change > 0 ? "+" : ""}
                          {m.change}
                          {m.label.includes("Time") ? "%" : ` ${m.unit}`}
                        </li>
                      ))}
                    {metrics.filter((m) => m.isGood && m.change !== 0).length === 0 && (
                      <li className="text-muted-foreground">No changes yet</li>
                    )}
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Considerations</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {metrics
                      .filter((m) => !m.isGood && m.change !== 0)
                      .map((m) => (
                        <li key={m.label} className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          {m.label}: +{m.change}
                          {m.label.includes("Time") ? "%" : ` ${m.unit}`}
                        </li>
                      ))}
                    {metrics.filter((m) => !m.isGood && m.change !== 0).length === 0 && (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        All metrics improved or unchanged
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </StageLanding>
  );
}

