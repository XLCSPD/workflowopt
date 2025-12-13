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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  ArrowLeft,
  AlertCircle,
  Copy,
  Clock,
  UserMinus,
  Truck,
  Package,
  Move,
  Layers,
  Unlink,
  FileWarning,
  ToggleLeft,
  Database,
  Split,
  Hourglass,
} from "lucide-react";

interface WasteType {
  code: string;
  name: string;
  description: string;
  category: "core_lean" | "digital";
  digitalExamples: string[];
  icon: React.ElementType;
  color: string;
}

const wasteTypes: WasteType[] = [
  {
    code: "D",
    name: "Defects",
    description: "Errors, rework, mistakes that require correction",
    category: "core_lean",
    digitalExamples: [
      "Data entry errors",
      "System bugs",
      "Incorrect file formats",
      "Wrong data in reports",
    ],
    icon: AlertCircle,
    color: "#EF4444",
  },
  {
    code: "O",
    name: "Overproduction",
    description: "Producing more than needed or before needed",
    category: "core_lean",
    digitalExamples: [
      "Excessive email chains",
      "Unnecessary reports",
      "Duplicate data entry",
      "Creating documents nobody uses",
    ],
    icon: Copy,
    color: "#F97316",
  },
  {
    code: "W",
    name: "Waiting",
    description: "Idle time waiting for the next step",
    category: "core_lean",
    digitalExamples: [
      "System load times",
      "Waiting for approvals",
      "Queue delays",
      "Slow application response",
    ],
    icon: Clock,
    color: "#EAB308",
  },
  {
    code: "N",
    name: "Non-utilized Talent",
    description: "Underutilizing people skills and knowledge",
    category: "core_lean",
    digitalExamples: [
      "Manual data entry by skilled workers",
      "Underused automation capabilities",
      "Knowledge silos",
    ],
    icon: UserMinus,
    color: "#8B5CF6",
  },
  {
    code: "T",
    name: "Transportation",
    description: "Unnecessary movement of materials or information",
    category: "core_lean",
    digitalExamples: [
      "Multiple system handoffs",
      "Email forwarding chains",
      "Data migration between systems",
    ],
    icon: Truck,
    color: "#3B82F6",
  },
  {
    code: "I",
    name: "Inventory",
    description: "Excess stock or backlog",
    category: "core_lean",
    digitalExamples: [
      "Email backlogs",
      "Unprocessed tickets",
      "Pending approvals queue",
      "Outdated files",
    ],
    icon: Package,
    color: "#06B6D4",
  },
  {
    code: "M",
    name: "Motion",
    description: "Unnecessary movement of people",
    category: "core_lean",
    digitalExamples: [
      "Switching between applications",
      "Multiple clicks for simple tasks",
      "Searching for files",
    ],
    icon: Move,
    color: "#10B981",
  },
  {
    code: "E",
    name: "Extra Processing",
    description: "Processing beyond what customer requires",
    category: "core_lean",
    digitalExamples: [
      "Multiple approval layers",
      "Redundant data validation",
      "Over-formatting documents",
    ],
    icon: Layers,
    color: "#EC4899",
  },
  {
    code: "IW",
    name: "Integration Waste",
    description: "Friction from disconnected systems requiring manual bridges",
    category: "digital",
    digitalExamples: [
      "Manual data transfer between systems",
      "Re-keying information",
      "Export/import processes",
    ],
    icon: Unlink,
    color: "#7C3AED",
  },
  {
    code: "DO",
    name: "Digital Overproduction",
    description: "Creating digital artifacts nobody uses",
    category: "digital",
    digitalExamples: [
      "Unused dashboards",
      "Reports nobody reads",
      "Features nobody uses",
    ],
    icon: FileWarning,
    color: "#DC2626",
  },
  {
    code: "UF",
    name: "Unused Features",
    description: "Software capabilities that go unutilized",
    category: "digital",
    digitalExamples: [
      "Disabled automation",
      "Unused integrations",
      "Ignored alerts",
    ],
    icon: ToggleLeft,
    color: "#0891B2",
  },
  {
    code: "ED",
    name: "Excess Data",
    description: "Storing or processing more data than needed",
    category: "digital",
    digitalExamples: [
      "Redundant fields",
      "Duplicate records",
      "Obsolete data retention",
    ],
    icon: Database,
    color: "#4F46E5",
  },
  {
    code: "FW",
    name: "Fragmented Workflows",
    description: "Broken processes across multiple tools",
    category: "digital",
    digitalExamples: [
      "Process steps in different systems",
      "Information scattered across platforms",
    ],
    icon: Split,
    color: "#9333EA",
  },
  {
    code: "DW",
    name: "Digital Waiting",
    description: "Technology-induced delays",
    category: "digital",
    digitalExamples: [
      "System synchronization delays",
      "Batch processing wait times",
      "API timeout issues",
    ],
    icon: Hourglass,
    color: "#CA8A04",
  },
];

export default function CheatSheetPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredWastes = wasteTypes.filter((waste) => {
    const matchesSearch =
      waste.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      waste.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      waste.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      waste.digitalExamples.some((ex) =>
        ex.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesTab =
      activeTab === "all" ||
      (activeTab === "core_lean" && waste.category === "core_lean") ||
      (activeTab === "digital" && waste.category === "digital");

    return matchesSearch && matchesTab;
  });

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Waste Type Cheat Sheet"
        description="Quick reference guide for all Lean waste types"
        actions={
          <Button asChild variant="ghost">
            <Link href="/training">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Training
            </Link>
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search waste types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="core_lean">DOWNTIME</TabsTrigger>
              <TabsTrigger value="digital">Digital</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* DOWNTIME Acronym */}
        {(activeTab === "all" || activeTab === "core_lean") && !searchQuery && (
          <Card className="bg-brand-navy text-white">
            <CardHeader>
              <CardTitle>Remember: DOWNTIME</CardTitle>
              <CardDescription className="text-white/70">
                The 8 traditional Lean wastes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {["D", "O", "W", "N", "T", "I", "M", "E"].map((letter) => {
                  const waste = wasteTypes.find((w) => w.code === letter);
                  return (
                    <div
                      key={letter}
                      className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2"
                    >
                      <span
                        className="font-bold text-lg"
                        style={{ color: waste?.color }}
                      >
                        {letter}
                      </span>
                      <span className="text-sm">{waste?.name}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Waste Types Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredWastes.map((waste) => {
            const Icon = waste.icon;
            return (
              <Card key={waste.code} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${waste.color}20` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: waste.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{waste.name}</CardTitle>
                        <Badge
                          variant="outline"
                          className="font-mono"
                          style={{
                            borderColor: waste.color,
                            color: waste.color,
                          }}
                        >
                          {waste.code}
                        </Badge>
                      </div>
                      <Badge
                        variant="secondary"
                        className="mt-1 text-xs"
                      >
                        {waste.category === "core_lean" ? "Core Lean" : "Digital"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {waste.description}
                  </p>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Digital Examples:
                    </p>
                    <ul className="space-y-1">
                      {waste.digitalExamples.map((example) => (
                        <li
                          key={example}
                          className="text-sm flex items-start gap-2"
                        >
                          <span
                            className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: waste.color }}
                          />
                          {example}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredWastes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No waste types found matching your search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

