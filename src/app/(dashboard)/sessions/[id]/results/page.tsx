"use client";

import { useState } from "react";
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

// Mock data
const mockSessionResults = {
  id: "2",
  name: "Claims Intake Review",
  workflowName: "Claims Intake Processing",
  status: "completed",
  facilitator: "Jane Doe",
  participantCount: 6,
  observationCount: 28,
  startedAt: "2024-01-10T09:30:00Z",
  endedAt: "2024-01-10T12:00:00Z",
  duration: "2h 30m",
};

const wasteTypeData = [
  { name: "Waiting", value: 32, color: "#EAB308" },
  { name: "Integration Waste", value: 25, color: "#7C3AED" },
  { name: "Defects", value: 18, color: "#EF4444" },
  { name: "Overproduction", value: 15, color: "#F97316" },
  { name: "Motion", value: 10, color: "#10B981" },
];

const wasteByLaneData = [
  { lane: "Intake", observations: 12, priority: 45 },
  { lane: "Review", observations: 10, priority: 38 },
  { lane: "Processing", observations: 6, priority: 22 },
];

export default function SessionResultsPage() {
  const [exportFormat, setExportFormat] = useState("pdf");
  const [exportSections, setExportSections] = useState({
    wasteDistribution: true,
    heatmap: true,
    topOpportunities: true,
    participantActivity: false,
    rawData: false,
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    // Simulate export
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsExporting(false);
    // In real implementation, this would trigger a download
    alert(`Export complete! Format: ${exportFormat.toUpperCase()}`);
  };

  const toggleSection = (section: keyof typeof exportSections) => {
    setExportSections({
      ...exportSections,
      [section]: !exportSections[section],
    });
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Session Results"
        description={mockSessionResults.name}
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
                  {mockSessionResults.name}
                </CardTitle>
                <CardDescription>{mockSessionResults.workflowName}</CardDescription>
              </div>
              <Badge className="bg-brand-emerald text-white">Completed</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Users className="h-4 w-4" />
                  Participants
                </div>
                <p className="text-xl font-bold">{mockSessionResults.participantCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  Observations
                </div>
                <p className="text-xl font-bold">{mockSessionResults.observationCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Clock className="h-4 w-4" />
                  Duration
                </div>
                <p className="text-xl font-bold">{mockSessionResults.duration}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  Facilitator
                </div>
                <p className="text-xl font-bold">{mockSessionResults.facilitator}</p>
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
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={wasteTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
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
                    {item.name}: {item.value}%
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Waste by Lane */}
          <Card>
            <CardHeader>
              <CardTitle>Observations by Lane</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wasteByLaneData}>
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
                    {
                      key: "wasteDistribution",
                      label: "Waste Distribution Charts",
                    },
                    { key: "heatmap", label: "Process Heatmap" },
                    { key: "topOpportunities", label: "Top Opportunities" },
                    {
                      key: "participantActivity",
                      label: "Participant Activity Log",
                    },
                    { key: "rawData", label: "Raw Observation Data" },
                  ].map((section) => (
                    <label
                      key={section.key}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <Checkbox
                        checked={
                          exportSections[
                            section.key as keyof typeof exportSections
                          ]
                        }
                        onCheckedChange={() =>
                          toggleSection(
                            section.key as keyof typeof exportSections
                          )
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

