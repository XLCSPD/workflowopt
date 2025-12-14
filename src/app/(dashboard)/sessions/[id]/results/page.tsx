"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
} from "recharts";
import {
  ArrowLeft,
  Download,
  FileText,
  FileSpreadsheet,
  Presentation,
  CheckCircle,
  Clock,
  Users,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { differenceInMinutes } from "date-fns";
import { getSessionById } from "@/lib/services/sessions";
import {
  getWasteDistribution,
  getWasteByLane,
} from "@/lib/services/analytics";
import { getSessionObservationSummary } from "@/lib/services/observations";
import { exportToPDF, exportToPPTX, exportToCSV } from "@/lib/services/export";
import type { Session } from "@/types";
import type { WasteDistribution, LaneStats } from "@/lib/services/analytics";

export default function SessionResultsPage() {
  const params = useParams();
  const { toast } = useToast();
  const sessionId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [wasteDistribution, setWasteDistribution] = useState<WasteDistribution[]>([]);
  const [laneStats, setLaneStats] = useState<LaneStats[]>([]);
  const [summary, setSummary] = useState<{
    totalCount: number;
    avgPriority: number;
    digitalPercentage: number;
  } | null>(null);

  const [exportFormat, setExportFormat] = useState("pdf");
  const [exportSections, setExportSections] = useState({
    wasteDistribution: true,
    heatmap: true,
    topOpportunities: true,
    participantActivity: false,
    rawData: false,
  });
  const [isExporting, setIsExporting] = useState(false);

  // Load session results
  useEffect(() => {
    const loadResults = async () => {
      try {
        setIsLoading(true);

        const [sessionData, distribution, lanes, observations] = await Promise.all([
          getSessionById(sessionId),
          getWasteDistribution(sessionId),
          getWasteByLane(sessionId),
          getSessionObservationSummary(sessionId),
        ]);

        setSession(sessionData);
        setWasteDistribution(distribution);
        setLaneStats(lanes);
        setSummary({
          totalCount: observations.totalCount,
          avgPriority: observations.avgPriority,
          digitalPercentage: observations.digitalPercentage,
        });
      } catch (error) {
        console.error("Failed to load results:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load session results.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadResults();
  }, [sessionId, toast]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      switch (exportFormat) {
        case "pdf":
          await exportToPDF(sessionId, exportSections);
          toast({
            title: "Export complete",
            description: "PDF report has been downloaded.",
          });
          break;
        case "pptx":
          await exportToPPTX(sessionId, exportSections);
          toast({
            title: "Export complete",
            description: "PowerPoint presentation has been downloaded.",
          });
          break;
        case "csv":
          await exportToCSV(sessionId);
          toast({
            title: "Export complete",
            description: "CSV file has been downloaded.",
          });
          break;
        default:
          toast({
            variant: "destructive",
            title: "Error",
            description: "Unknown export format.",
          });
      }
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Failed to export data. Please try again.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const toggleSection = (section: keyof typeof exportSections) => {
    setExportSections({
      ...exportSections,
      [section]: !exportSections[section],
    });
  };

  // Calculate session duration
  const getDuration = () => {
    if (!session?.started_at || !session?.ended_at) return "N/A";
    const minutes = differenceInMinutes(
      new Date(session.ended_at),
      new Date(session.started_at)
    );
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground mb-4">Session not found</p>
        <Button asChild>
          <Link href="/sessions">Back to Sessions</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Session Results"
        description={session.name}
        actions={
          <Button asChild variant="ghost">
            <Link href="/sessions">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sessions
            </Link>
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Session Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-brand-emerald" />
                  {session.name}
                </CardTitle>
                <CardDescription>
                  {(session as Session & { process?: { name: string } }).process?.name || "Workflow"}
                </CardDescription>
              </div>
              <Badge className="bg-brand-emerald text-white">
                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Users className="h-4 w-4" />
                  Observations
                </div>
                <p className="text-xl font-bold">{summary?.totalCount || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  Avg Priority
                </div>
                <p className="text-xl font-bold">
                  {summary?.avgPriority?.toFixed(1) || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Clock className="h-4 w-4" />
                  Duration
                </div>
                <p className="text-xl font-bold">{getDuration()}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  Digital Waste %
                </div>
                <p className="text-xl font-bold">
                  {summary?.digitalPercentage?.toFixed(0) || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Waste Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Waste Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {wasteDistribution.length > 0 ? (
                <>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={wasteDistribution.map(w => ({ ...w, value: w.percentage }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="percentage"
                          nameKey="name"
                        >
                          {wasteDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`${value}%`, "Percentage"]}
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
                        {item.name}: {item.percentage}%
                      </Badge>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No waste data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Waste by Lane */}
          <Card>
            <CardHeader>
              <CardTitle>Observations by Lane</CardTitle>
            </CardHeader>
            <CardContent>
              {laneStats.length > 0 ? (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={laneStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="lane" />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="observations"
                        name="Observations"
                        fill="#FFC000"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No lane data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Report
            </CardTitle>
            <CardDescription>
              Download session results in your preferred format
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Format Selection */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Choose Format</Label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setExportFormat("pdf")}
                    className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                      exportFormat === "pdf"
                        ? "border-brand-gold bg-brand-gold/10"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <FileText
                      className={`h-8 w-8 ${
                        exportFormat === "pdf"
                          ? "text-brand-gold"
                          : "text-muted-foreground"
                      }`}
                    />
                    <span className="font-medium">PDF</span>
                  </button>
                  <button
                    onClick={() => setExportFormat("csv")}
                    className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                      exportFormat === "csv"
                        ? "border-brand-gold bg-brand-gold/10"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <FileSpreadsheet
                      className={`h-8 w-8 ${
                        exportFormat === "csv"
                          ? "text-brand-gold"
                          : "text-muted-foreground"
                      }`}
                    />
                    <span className="font-medium">CSV</span>
                  </button>
                  <button
                    onClick={() => setExportFormat("pptx")}
                    className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                      exportFormat === "pptx"
                        ? "border-brand-gold bg-brand-gold/10"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <Presentation
                      className={`h-8 w-8 ${
                        exportFormat === "pptx"
                          ? "text-brand-gold"
                          : "text-muted-foreground"
                      }`}
                    />
                    <span className="font-medium">PPTX</span>
                  </button>
                </div>
              </div>

              {/* Section Selection */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Include Sections</Label>
                <div className="space-y-3">
                  {[
                    { key: "wasteDistribution", label: "Waste Distribution Charts" },
                    { key: "heatmap", label: "Process Heatmap" },
                    { key: "topOpportunities", label: "Top Opportunities" },
                    { key: "participantActivity", label: "Participant Activity Log" },
                    { key: "rawData", label: "Raw Observation Data" },
                  ].map((section) => (
                    <label
                      key={section.key}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <Checkbox
                        checked={
                          exportSections[section.key as keyof typeof exportSections]
                        }
                        onCheckedChange={() =>
                          toggleSection(section.key as keyof typeof exportSections)
                        }
                      />
                      <span>{section.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <Button
              onClick={handleExport}
              className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Generate & Download {exportFormat.toUpperCase()}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
