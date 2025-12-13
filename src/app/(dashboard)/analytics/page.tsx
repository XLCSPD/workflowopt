"use client";

import { useState } from "react";
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
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Zap,
  Target,
  Layers,
} from "lucide-react";

// Mock data
const wasteTypeData = [
  { name: "Waiting", value: 28, color: "#EAB308" },
  { name: "Integration Waste", value: 22, color: "#7C3AED" },
  { name: "Defects", value: 18, color: "#EF4444" },
  { name: "Overproduction", value: 12, color: "#F97316" },
  { name: "Motion", value: 10, color: "#10B981" },
  { name: "Extra Processing", value: 10, color: "#EC4899" },
];

const wasteByLaneData = [
  { lane: "Premier Health", digital: 15, physical: 8 },
  { lane: "Versatex", digital: 22, physical: 5 },
  { lane: "Merchant", digital: 8, physical: 4 },
];

const topHotspots = [
  {
    rank: 1,
    step: "Accounting Entry",
    lane: "Versatex",
    wasteTypes: ["Waiting", "Integration Waste"],
    priorityScore: 18,
    effort: "low",
  },
  {
    rank: 2,
    step: "Create QR in IPEX",
    lane: "Premier Health",
    wasteTypes: ["Defects", "Motion"],
    priorityScore: 15,
    effort: "medium",
  },
  {
    rank: 3,
    step: "Source Pricing",
    lane: "Versatex",
    wasteTypes: ["Integration Waste"],
    priorityScore: 12,
    effort: "high",
  },
  {
    rank: 4,
    step: "Send PO to Merchant",
    lane: "Versatex",
    wasteTypes: ["Waiting"],
    priorityScore: 8,
    effort: "low",
  },
  {
    rank: 5,
    step: "Submit QR",
    lane: "Premier Health",
    wasteTypes: ["Extra Processing"],
    priorityScore: 6,
    effort: "medium",
  },
];

const insights = [
  {
    id: "1",
    type: "quick_win",
    title: "Automate Accounting Entry",
    description: "High impact, low effort improvement opportunity. Automating the accounting entry could reduce waiting time by 40%.",
    step: "Accounting Entry",
    impact: "high",
    effort: "low",
  },
  {
    id: "2",
    type: "hotspot",
    title: "IPEX System Issues",
    description: "Multiple defects reported during QR creation. Consider system training or UI improvements.",
    step: "Create QR in IPEX",
    impact: "medium",
    effort: "medium",
  },
  {
    id: "3",
    type: "trend",
    title: "Integration Waste Increasing",
    description: "Integration waste has increased 25% compared to last session. Review system connections.",
    step: "Multiple",
    impact: "high",
    effort: "high",
  },
];

export default function AnalyticsPage() {
  const [selectedSession, setSelectedSession] = useState("all");

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Analytics & Insights"
        description="Visualize waste patterns and identify improvement opportunities"
        actions={
          <div className="flex items-center gap-2">
            <Select value={selectedSession} onValueChange={setSelectedSession}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                <SelectItem value="1">PH Procurement v1</SelectItem>
                <SelectItem value="2">Claims Intake Review</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Observations
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">47</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-brand-emerald" />
                +12% from last session
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Priority Score
              </CardTitle>
              <Target className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12.4</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-brand-emerald" />
                -8% improvement
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Digital Waste %
              </CardTitle>
              <Layers className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">68%</div>
              <p className="text-xs text-muted-foreground">
                vs 32% physical waste
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Quick Wins
              </CardTitle>
              <Zap className="h-4 w-4 text-brand-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground">
                High impact, low effort items
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Waste Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Waste Type Distribution</CardTitle>
              <CardDescription>Breakdown by waste category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={wasteTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                      labelLine={true}
                    >
                      {wasteTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {wasteTypeData.map((item) => (
                  <Badge
                    key={item.name}
                    variant="outline"
                    style={{ borderColor: item.color, color: item.color }}
                  >
                    {item.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Waste by Lane */}
          <Card>
            <CardHeader>
              <CardTitle>Waste by Swimlane</CardTitle>
              <CardDescription>Digital vs Physical waste per lane</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wasteByLaneData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="lane" type="category" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="digital" name="Digital" fill="#7C3AED" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="physical" name="Physical" fill="#10B981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Hotspots */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Top Waste Hotspots
              </CardTitle>
              <CardDescription>
                Prioritized list of improvement opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topHotspots.map((item) => (
                  <div
                    key={item.rank}
                    className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        item.rank === 1
                          ? "bg-red-500"
                          : item.rank === 2
                          ? "bg-orange-500"
                          : item.rank === 3
                          ? "bg-yellow-500"
                          : "bg-gray-400"
                      }`}
                    >
                      {item.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.step}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.lane} • {item.wasteTypes.join(", ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{item.priorityScore}</p>
                      <Badge
                        variant={
                          item.effort === "low"
                            ? "default"
                            : item.effort === "medium"
                            ? "secondary"
                            : "outline"
                        }
                        className={
                          item.effort === "low"
                            ? "bg-brand-emerald text-white"
                            : ""
                        }
                      >
                        {item.effort} effort
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-brand-gold" />
                Generated Insights
              </CardTitle>
              <CardDescription>
                AI-powered recommendations based on observations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      insight.type === "quick_win"
                        ? "border-l-brand-emerald bg-brand-emerald/5"
                        : insight.type === "hotspot"
                        ? "border-l-red-500 bg-red-50"
                        : "border-l-blue-500 bg-blue-50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{insight.title}</h4>
                      <Badge
                        variant="outline"
                        className={
                          insight.type === "quick_win"
                            ? "border-brand-emerald text-brand-emerald"
                            : insight.type === "hotspot"
                            ? "border-red-500 text-red-500"
                            : "border-blue-500 text-blue-500"
                        }
                      >
                        {insight.type.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {insight.description}
                    </p>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{insight.step}</Badge>
                      <Badge variant="outline">
                        Impact: {insight.impact}
                      </Badge>
                      <Badge variant="outline">
                        Effort: {insight.effort}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

