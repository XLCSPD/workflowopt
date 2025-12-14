"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  GitCompare,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import {
  compareSessions,
  getComparableSessions,
  getProcessesWithSessions,
} from "@/lib/services/comparison";
import type { ComparisonResult } from "@/lib/services/comparison";

interface SelectableSession {
  id: string;
  name: string;
  status: string;
  created_at: string;
  process: { id: string; name: string };
}

export default function SessionComparisonPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  
  const [processes, setProcesses] = useState<{ id: string; name: string }[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<string>("all");
  const [sessions, setSessions] = useState<SelectableSession[]>([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

  // Load processes
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [processData, sessionData] = await Promise.all([
          getProcessesWithSessions(),
          getComparableSessions(),
        ]);
        setProcesses(processData);
        setSessions(sessionData);
      } catch (error) {
        console.error("Failed to load data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load sessions.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [toast]);

  // Load sessions when process filter changes
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const processId = selectedProcess === "all" ? undefined : selectedProcess;
        const data = await getComparableSessions(processId);
        setSessions(data);
        setSelectedSessionIds([]);
        setComparisonResult(null);
      } catch (error) {
        console.error("Failed to load sessions:", error);
      }
    };
    if (!isLoading) {
      loadSessions();
    }
  }, [selectedProcess, isLoading]);

  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessionIds((prev) =>
      prev.includes(sessionId)
        ? prev.filter((id) => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const handleCompare = async () => {
    if (selectedSessionIds.length < 2) {
      toast({
        variant: "destructive",
        title: "Select sessions",
        description: "Please select at least 2 sessions to compare.",
      });
      return;
    }

    try {
      setIsComparing(true);
      const result = await compareSessions(selectedSessionIds);
      setComparisonResult(result);
    } catch (error) {
      console.error("Comparison failed:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to compare sessions.",
      });
    } finally {
      setIsComparing(false);
    }
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getChangeColor = (change: number, inverseGood = false) => {
    const isGood = inverseGood ? change > 0 : change < 0;
    if (isGood) return "text-green-600";
    if (change !== 0) return "text-red-600";
    return "text-gray-600";
  };

  // Prepare chart data
  const observationTrendData = comparisonResult?.sessions.map((s) => ({
    name: format(new Date(s.createdAt), "MMM d"),
    observations: s.observationCount,
    avgPriority: s.avgPriority,
  })) || [];

  const wasteComparisonData = comparisonResult ? (() => {
    const allWasteTypes = new Set<string>();
    comparisonResult.sessions.forEach((s) => {
      s.wasteDistribution.forEach((w) => allWasteTypes.add(w.name));
    });

    return Array.from(allWasteTypes).map((wasteName) => {
      const dataPoint: Record<string, string | number> = { name: wasteName };
      comparisonResult.sessions.forEach((s, idx) => {
        const waste = s.wasteDistribution.find((w) => w.name === wasteName);
        dataPoint[`session${idx + 1}`] = waste?.percentage || 0;
      });
      return dataPoint;
    });
  })() : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Session Comparison"
        description="Compare waste identification across multiple sessions"
        actions={
          <Button asChild variant="ghost">
            <Link href="/analytics">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Analytics
            </Link>
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Selection Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Select Sessions to Compare
            </CardTitle>
            <CardDescription>
              Choose 2 or more sessions from the same workflow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-xs">
                <Select value={selectedProcess} onValueChange={setSelectedProcess}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by workflow" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Workflows</SelectItem>
                    {processes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCompare}
                disabled={selectedSessionIds.length < 2 || isComparing}
                className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
              >
                {isComparing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <GitCompare className="mr-2 h-4 w-4" />
                )}
                Compare Sessions
              </Button>
            </div>

            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {sessions.map((session) => (
                <label
                  key={session.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedSessionIds.includes(session.id)
                      ? "border-brand-gold bg-brand-gold/10"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    checked={selectedSessionIds.includes(session.id)}
                    onCheckedChange={() => toggleSessionSelection(session.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{session.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.process.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(session.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <Badge
                    variant={session.status === "completed" ? "secondary" : "default"}
                    className={
                      session.status === "active"
                        ? "bg-brand-emerald text-white"
                        : ""
                    }
                  >
                    {session.status}
                  </Badge>
                </label>
              ))}
            </div>

            {sessions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No sessions available for comparison.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comparison Results */}
        {comparisonResult && (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    Observation Count Change
                    {getChangeIcon(comparisonResult.improvementMetrics.observationChange)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${getChangeColor(
                      comparisonResult.improvementMetrics.observationChange
                    )}`}
                  >
                    {comparisonResult.improvementMetrics.observationChange > 0
                      ? "+"
                      : ""}
                    {comparisonResult.improvementMetrics.observationChange}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fewer is better (less waste found)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    Avg Priority Change
                    {getChangeIcon(comparisonResult.improvementMetrics.priorityChange)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${getChangeColor(
                      comparisonResult.improvementMetrics.priorityChange
                    )}`}
                  >
                    {comparisonResult.improvementMetrics.priorityChange > 0
                      ? "+"
                      : ""}
                    {comparisonResult.improvementMetrics.priorityChange.toFixed(1)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Lower priority indicates improvement
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    Digital Waste Change
                    {getChangeIcon(comparisonResult.improvementMetrics.digitalChange)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${getChangeColor(
                      comparisonResult.improvementMetrics.digitalChange
                    )}`}
                  >
                    {comparisonResult.improvementMetrics.digitalChange > 0
                      ? "+"
                      : ""}
                    {comparisonResult.improvementMetrics.digitalChange.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Shift in digital vs physical waste
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Observation Trends Over Time</CardTitle>
                <CardDescription>
                  Track how waste identification has changed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={observationTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="observations"
                        name="Observations"
                        stroke="#FFC000"
                        strokeWidth={2}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="avgPriority"
                        name="Avg Priority"
                        stroke="#003366"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Waste Type Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Waste Type Distribution Comparison</CardTitle>
                <CardDescription>
                  How waste type percentages have changed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={wasteComparisonData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="name" width={120} />
                      <Tooltip formatter={(value: number) => `${value}%`} />
                      <Legend />
                      {comparisonResult.sessions.map((_, idx) => (
                        <Bar
                          key={idx}
                          dataKey={`session${idx + 1}`}
                          name={comparisonResult.sessions[idx].sessionName}
                          fill={
                            idx === 0
                              ? "#FFC000"
                              : idx === 1
                              ? "#003366"
                              : idx === 2
                              ? "#10B981"
                              : "#8B5CF6"
                          }
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Improvements and Declines */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <TrendingDown className="h-5 w-5" />
                    Top Improvements
                  </CardTitle>
                  <CardDescription>
                    Waste types that decreased the most
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {comparisonResult.improvementMetrics.topImprovements.length > 0 ? (
                    <ul className="space-y-2">
                      {comparisonResult.improvementMetrics.topImprovements.map(
                        (improvement, idx) => (
                          <li
                            key={idx}
                            className="flex items-center gap-2 p-2 rounded bg-green-50"
                          >
                            <ArrowRight className="h-4 w-4 text-green-600" />
                            <span className="text-sm">{improvement}</span>
                          </li>
                        )
                      )}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No significant improvements detected
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <TrendingUp className="h-5 w-5" />
                    Areas of Concern
                  </CardTitle>
                  <CardDescription>
                    Waste types that increased the most
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {comparisonResult.improvementMetrics.topDeclines.length > 0 ? (
                    <ul className="space-y-2">
                      {comparisonResult.improvementMetrics.topDeclines.map(
                        (decline, idx) => (
                          <li
                            key={idx}
                            className="flex items-center gap-2 p-2 rounded bg-red-50"
                          >
                            <ArrowRight className="h-4 w-4 text-red-600" />
                            <span className="text-sm">{decline}</span>
                          </li>
                        )
                      )}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No significant declines detected
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

