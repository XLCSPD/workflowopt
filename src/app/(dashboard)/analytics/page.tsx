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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Lightbulb,
  Target,
  Zap,
  AlertTriangle,
  Loader2,
  GitCompare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getWasteDistribution,
  getWasteByLane,
  getTopHotspots,
  generateInsights,
} from "@/lib/services/analytics";
import { getSessions } from "@/lib/services/sessions";
import type { WasteDistribution, LaneStats, TopHotspot, Insight } from "@/lib/services/analytics";
import type { SessionWithDetails } from "@/lib/services/sessions";

export default function AnalyticsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string>("all");
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [wasteDistribution, setWasteDistribution] = useState<WasteDistribution[]>([]);
  const [laneStats, setLaneStats] = useState<LaneStats[]>([]);
  const [topHotspots, setTopHotspots] = useState<TopHotspot[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);

  // Fetch sessions for the dropdown
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const data = await getSessions();
        setSessions(data);
      } catch (error) {
        console.error("Failed to load sessions:", error);
      }
    };
    loadSessions();
  }, []);

  // Fetch analytics data when session selection changes
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setIsLoading(true);
        const sessionId = selectedSession === "all" ? undefined : selectedSession;

        const [distribution, lanes, hotspots, generatedInsights] = await Promise.all([
          getWasteDistribution(sessionId),
          getWasteByLane(sessionId),
          getTopHotspots(sessionId, 5),
          generateInsights(sessionId),
        ]);

        setWasteDistribution(distribution);
        setLaneStats(lanes);
        setTopHotspots(hotspots);
        setInsights(generatedInsights);
      } catch (error) {
        console.error("Failed to load analytics:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load analytics data.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, [selectedSession, toast]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "quick_win":
        return <Zap className="h-4 w-4 text-green-500" />;
      case "hotspot":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "trend":
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default:
        return <Lightbulb className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getInsightBadgeColor = (type: string) => {
    switch (type) {
      case "quick_win":
        return "bg-green-100 text-green-700 border-green-200";
      case "hotspot":
        return "bg-red-100 text-red-700 border-red-200";
      case "trend":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "";
    }
  };

  const totalObservations = wasteDistribution.reduce((sum, w) => sum + w.count, 0);

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Analytics Dashboard"
        description="Insights and trends from your waste identification sessions"
        actions={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Select value={selectedSession} onValueChange={setSelectedSession}>
              <SelectTrigger className="w-full sm:w-[200px] lg:w-[250px]">
                <SelectValue placeholder="Select session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/analytics/compare">
                <GitCompare className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Compare Sessions</span>
                <span className="sm:hidden">Compare</span>
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    Total Observations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalObservations}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    Waste Types Found
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {wasteDistribution.length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    Lanes Affected
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{laneStats.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    Quick Wins Available
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {insights.filter((i) => i.type === "quick_win").length}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Waste Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Waste Type Distribution</CardTitle>
                  <CardDescription>
                    Breakdown of identified waste by type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {wasteDistribution.length > 0 ? (
                    <>
                      <div className="h-[250px] sm:h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={wasteDistribution.map(w => ({ ...w, [w.name]: w.percentage }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={2}
                              dataKey="percentage"
                              nameKey="name"
                              label
                              labelLine
                            >
                              {wasteDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number) => [
                                `${value}%`,
                                "Percentage",
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4 justify-center">
                        {wasteDistribution.map((item) => (
                          <Badge
                            key={item.name}
                            variant="outline"
                            style={{ borderColor: item.color, color: item.color }}
                          >
                            {item.code}: {item.count}
                          </Badge>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No waste data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Waste by Lane */}
              <Card>
                <CardHeader>
                  <CardTitle>Observations by Swimlane</CardTitle>
                  <CardDescription>
                    Which process lanes have the most waste
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {laneStats.length > 0 ? (
                    <div className="h-[250px] sm:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={laneStats} layout="vertical" margin={{ left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="lane" width={80} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="digital"
                            name="Digital"
                            fill="#3B82F6"
                            stackId="a"
                          />
                          <Bar
                            dataKey="physical"
                            name="Physical"
                            fill="#10B981"
                            stackId="a"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No lane data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Hotspots */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-orange-500" />
                  Top Waste Hotspots
                </CardTitle>
                <CardDescription>
                  Process steps with highest priority scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topHotspots.length > 0 ? (
                  <div className="space-y-4">
                    {topHotspots.map((hotspot) => (
                      <div
                        key={hotspot.rank}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                              hotspot.rank === 1
                                ? "bg-red-500"
                                : hotspot.rank === 2
                                ? "bg-orange-500"
                                : hotspot.rank === 3
                                ? "bg-yellow-500"
                                : "bg-gray-400"
                            }`}
                          >
                            {hotspot.rank}
                          </div>
                          <div>
                            <p className="font-medium">{hotspot.step_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {hotspot.lane}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {hotspot.waste_types.slice(0, 3).map((wt) => (
                              <Badge
                                key={wt}
                                variant="outline"
                                className="text-xs"
                              >
                                {wt}
                              </Badge>
                            ))}
                            {hotspot.waste_types.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{hotspot.waste_types.length - 3}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold">
                              {hotspot.priority_score}
                            </p>
                            <Badge
                              variant="outline"
                              className={
                                hotspot.effort === "low"
                                  ? "text-green-600 border-green-300"
                                  : hotspot.effort === "medium"
                                  ? "text-yellow-600 border-yellow-300"
                                  : "text-red-600 border-red-300"
                              }
                            >
                              {hotspot.effort} effort
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No hotspots identified yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI-Generated Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Generated Insights
                </CardTitle>
                <CardDescription>
                  AI-powered recommendations based on your data
                </CardDescription>
              </CardHeader>
              <CardContent>
                {insights.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {insights.map((insight) => (
                      <div
                        key={insight.id}
                        className="p-4 rounded-lg border bg-gradient-to-br from-white to-muted/30"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {getInsightIcon(insight.type)}
                          <Badge
                            variant="outline"
                            className={getInsightBadgeColor(insight.type)}
                          >
                            {insight.type === "quick_win"
                              ? "Quick Win"
                              : insight.type === "hotspot"
                              ? "Hotspot"
                              : "Trend"}
                          </Badge>
                        </div>
                        <h4 className="font-medium mb-1">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {insight.description}
                        </p>
                        <div className="flex gap-2 mt-3">
                          <Badge variant="secondary" className="text-xs">
                            Impact: {insight.impact}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            Effort: {insight.effort}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Not enough data to generate insights</p>
                    <p className="text-sm">
                      Complete more waste walk sessions to see recommendations
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
