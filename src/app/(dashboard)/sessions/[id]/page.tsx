"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { ProcessMap } from "@/components/workflow/ProcessMap";
import { StepDetailPanel } from "@/components/workflow/StepDetailPanel";
import { WasteTaggingPanel } from "@/components/waste/WasteTaggingPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Users,
  Eye,
  Clock,
  AlertTriangle,
  StopCircle,
  BookOpen,
} from "lucide-react";
import type { ProcessStep, WasteType } from "@/types";

// Mock data
const mockSession = {
  id: "1",
  name: "PH Procurement Waste Walk v1",
  status: "active",
  facilitator: "Ayo Sasore",
  startedAt: "2024-01-15T10:30:00Z",
};

const mockParticipants = [
  { id: "1", name: "Ayo Sasore", role: "facilitator", isActive: true },
  { id: "2", name: "Jane Doe", role: "participant", isActive: true },
  { id: "3", name: "John Smith", role: "participant", isActive: true },
  { id: "4", name: "Sarah Wilson", role: "participant", isActive: false },
];

const mockSteps: ProcessStep[] = [
  { id: "101", process_id: "1", step_name: "Start: Project & Materials", description: "Premier Health has project and receives material list", lane: "Premier Health", step_type: "start", order_index: 1, position_x: 100, position_y: 80, created_at: "", updated_at: "" },
  { id: "102", process_id: "1", step_name: "Create QR in IPEX", description: "Create Quote Request for items", lane: "Premier Health", step_type: "action", order_index: 2, position_x: 280, position_y: 80, created_at: "", updated_at: "" },
  { id: "103", process_id: "1", step_name: "Submit QR", description: "Submit QR for pricing", lane: "Premier Health", step_type: "action", order_index: 3, position_x: 460, position_y: 80, created_at: "", updated_at: "" },
  { id: "104", process_id: "1", step_name: "Select Merchant & Approve", description: "Make merchant selection and approve QR", lane: "Premier Health", step_type: "decision", order_index: 7, position_x: 820, position_y: 80, created_at: "", updated_at: "" },
  { id: "105", process_id: "1", step_name: "Receive Tracking", description: "Receive shipping/tracking updates", lane: "Premier Health", step_type: "action", order_index: 14, position_x: 1000, position_y: 80, created_at: "", updated_at: "" },
  { id: "106", process_id: "1", step_name: "Goods Receipt", description: "Complete Goods Receipt", lane: "Premier Health", step_type: "action", order_index: 16, position_x: 1180, position_y: 80, created_at: "", updated_at: "" },
  { id: "107", process_id: "1", step_name: "Authorize Payment", description: "Authorize PO payment", lane: "Premier Health", step_type: "action", order_index: 17, position_x: 1360, position_y: 80, created_at: "", updated_at: "" },
  { id: "201", process_id: "1", step_name: "Source Pricing", description: "Source pricing from merchants", lane: "Versatex", step_type: "action", order_index: 4, position_x: 280, position_y: 220, created_at: "", updated_at: "" },
  { id: "202", process_id: "1", step_name: "Send Options", description: "Send to client for selection", lane: "Versatex", step_type: "action", order_index: 5, position_x: 460, position_y: 220, created_at: "", updated_at: "" },
  { id: "203", process_id: "1", step_name: "Accounting Entry", description: "Initiate accounting entry", lane: "Versatex", step_type: "action", order_index: 8, position_x: 640, position_y: 220, created_at: "", updated_at: "" },
  { id: "204", process_id: "1", step_name: "Send PO to Merchant", description: "Send PO for fulfillment", lane: "Versatex", step_type: "action", order_index: 9, position_x: 820, position_y: 220, created_at: "", updated_at: "" },
  { id: "205", process_id: "1", step_name: "Pay Merchant", description: "Pay merchant(s)", lane: "Versatex", step_type: "action", order_index: 12, position_x: 1000, position_y: 220, created_at: "", updated_at: "" },
  { id: "206", process_id: "1", step_name: "Receive Tracking", description: "Receive shipping details", lane: "Versatex", step_type: "action", order_index: 13, position_x: 1180, position_y: 220, created_at: "", updated_at: "" },
  { id: "207", process_id: "1", step_name: "Close PO", description: "Close PO(s)", lane: "Versatex", step_type: "end", order_index: 18, position_x: 1360, position_y: 220, created_at: "", updated_at: "" },
  { id: "301", process_id: "1", step_name: "Accept PO", description: "Merchant accepts PO", lane: "Merchant", step_type: "action", order_index: 10, position_x: 820, position_y: 360, created_at: "", updated_at: "" },
  { id: "302", process_id: "1", step_name: "Ship Items", description: "Merchant ships items", lane: "Merchant", step_type: "action", order_index: 11, position_x: 1000, position_y: 360, created_at: "", updated_at: "" },
  { id: "303", process_id: "1", step_name: "Deliver to Client", description: "Deliver orders", lane: "Merchant", step_type: "action", order_index: 15, position_x: 1180, position_y: 360, created_at: "", updated_at: "" },
];

const mockConnections = [
  { source: "101", target: "102" },
  { source: "102", target: "103" },
  { source: "103", target: "201" },
  { source: "201", target: "202" },
  { source: "202", target: "104" },
  { source: "104", target: "203" },
  { source: "203", target: "204" },
  { source: "204", target: "301" },
  { source: "301", target: "302" },
  { source: "302", target: "205" },
  { source: "205", target: "206" },
  { source: "206", target: "105" },
  { source: "105", target: "106" },
  { source: "303", target: "106" },
  { source: "106", target: "107" },
  { source: "107", target: "207" },
];

const mockObservations: Record<string, { count: number; priorityScore: number }> = {
  "203": { count: 3, priorityScore: 18 },
  "102": { count: 2, priorityScore: 15 },
  "201": { count: 1, priorityScore: 12 },
  "204": { count: 1, priorityScore: 8 },
};

const mockWasteTypes: WasteType[] = [
  { id: "1", code: "D", name: "Defects", description: "Errors requiring correction", category: "core_lean", digital_examples: [], created_at: "", updated_at: "" },
  { id: "2", code: "O", name: "Overproduction", description: "Producing more than needed", category: "core_lean", digital_examples: [], created_at: "", updated_at: "" },
  { id: "3", code: "W", name: "Waiting", description: "Idle time waiting", category: "core_lean", digital_examples: [], created_at: "", updated_at: "" },
  { id: "4", code: "T", name: "Transportation", description: "Unnecessary movement", category: "core_lean", digital_examples: [], created_at: "", updated_at: "" },
  { id: "5", code: "IW", name: "Integration Waste", description: "Disconnected systems", category: "digital", digital_examples: [], created_at: "", updated_at: "" },
  { id: "6", code: "DW", name: "Digital Waiting", description: "Technology delays", category: "digital", digital_examples: [], created_at: "", updated_at: "" },
];

const mockRecentActivity = [
  { id: "1", user: "Jane Doe", step: "Accounting Entry", waste: "Waiting", time: "2 min ago" },
  { id: "2", user: "John Smith", step: "Create QR in IPEX", waste: "Defects", time: "5 min ago" },
  { id: "3", user: "Ayo Sasore", step: "Source Pricing", waste: "Integration Waste", time: "8 min ago" },
];

export default function SessionDetailPage() {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isTaggingPanelOpen, setIsTaggingPanelOpen] = useState(false);

  const selectedStep = mockSteps.find((s) => s.id === selectedStepId) || null;

  const handleStepClick = (stepId: string) => {
    setSelectedStepId(stepId);
    setIsDetailPanelOpen(true);
  };

  const handleStartTagging = () => {
    setIsDetailPanelOpen(false);
    setIsTaggingPanelOpen(true);
  };

  const handleSubmitObservation = () => {
    setIsTaggingPanelOpen(false);
    setSelectedStepId(null);
  };

  const totalObservations = Object.values(mockObservations).reduce(
    (sum, o) => sum + o.count,
    0
  );

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Header
          title={mockSession.name}
          description="Active waste walk session"
          actions={
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/training/cheat-sheet">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Cheat Sheet
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/sessions">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
              <Button variant="destructive" size="sm">
                <StopCircle className="mr-2 h-4 w-4" />
                End Session
              </Button>
            </div>
          }
        />

        {/* Stats Bar */}
        <div className="px-6 py-3 border-b bg-muted/30 flex items-center gap-4">
          <Badge className="bg-brand-emerald text-white">
            <span className="animate-pulse mr-1">●</span> Active
          </Badge>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Started {new Date(mockSession.startedAt).toLocaleTimeString()}
          </span>
          <Badge variant="outline">
            <Users className="h-3 w-3 mr-1" />
            {mockParticipants.filter((p) => p.isActive).length} active
          </Badge>
          <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
            <Eye className="h-3 w-3 mr-1" />
            {totalObservations} observations
          </Badge>
        </div>

        {/* Process Map */}
        <div className="flex-1">
          <ProcessMap
            steps={mockSteps}
            connections={mockConnections}
            observations={mockObservations}
            selectedStepId={selectedStepId}
            onStepClick={handleStepClick}
            showHeatmap={showHeatmap}
            onToggleHeatmap={setShowHeatmap}
          />
        </div>
      </div>

      {/* Side Panel */}
      <div className="w-80 border-l bg-white flex flex-col">
        {/* Participants */}
        <div className="p-4 border-b">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Participants ({mockParticipants.length})
          </h3>
          <div className="space-y-2">
            {mockParticipants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50"
              >
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-brand-gold/20 text-brand-navy text-xs">
                      {participant.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {participant.isActive && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-brand-emerald rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{participant.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {participant.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Recent Activity
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {mockRecentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="p-3 rounded-lg bg-muted/50 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{activity.user}</span>
                    <span className="text-xs text-muted-foreground">
                      {activity.time}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tagged <span className="text-orange-600">{activity.waste}</span>{" "}
                    on <span className="font-medium">{activity.step}</span>
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Step Detail Panel */}
      <StepDetailPanel
        step={selectedStep}
        observations={[]}
        isOpen={isDetailPanelOpen}
        onClose={() => {
          setIsDetailPanelOpen(false);
          setSelectedStepId(null);
        }}
        onStartTagging={handleStartTagging}
        sessionActive={true}
      />

      {/* Waste Tagging Panel */}
      <WasteTaggingPanel
        step={selectedStep}
        wasteTypes={mockWasteTypes}
        isOpen={isTaggingPanelOpen}
        onClose={() => {
          setIsTaggingPanelOpen(false);
          setSelectedStepId(null);
        }}
        onSubmit={handleSubmitObservation}
      />
    </div>
  );
}

