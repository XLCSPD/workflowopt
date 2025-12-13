"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { ProcessMap } from "@/components/workflow/ProcessMap";
import { StepDetailPanel } from "@/components/workflow/StepDetailPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Play,
  Edit,
  MoreVertical,
  Download,
  Share2,
} from "lucide-react";
import type { ProcessStep } from "@/types";

// Mock data for the Premier Health workflow
const mockWorkflow = {
  id: "1",
  name: "Premier Health & Versatex Procurement Workflow",
  description: "End-to-end procurement workflow between Premier Health, Versatex, and Merchants for medical supplies and equipment.",
};

const mockSteps: ProcessStep[] = [
  { id: "101", process_id: "1", step_name: "Start: Project & Materials", description: "Premier Health has project and receives material list", lane: "Premier Health", step_type: "start", order_index: 1, position_x: 100, position_y: 80, created_at: "", updated_at: "" },
  { id: "102", process_id: "1", step_name: "Create QR in IPEX", description: "Create Quote Request for items", lane: "Premier Health", step_type: "action", order_index: 2, position_x: 280, position_y: 80, created_at: "", updated_at: "" },
  { id: "103", process_id: "1", step_name: "Submit QR", description: "Submit QR for pricing", lane: "Premier Health", step_type: "action", order_index: 3, position_x: 460, position_y: 80, created_at: "", updated_at: "" },
  { id: "104", process_id: "1", step_name: "Select Merchant & Approve", description: "Make merchant selection and approve QR", lane: "Premier Health", step_type: "decision", order_index: 7, position_x: 820, position_y: 80, created_at: "", updated_at: "" },
  { id: "105", process_id: "1", step_name: "Receive Tracking", description: "Receive shipping/tracking updates", lane: "Premier Health", step_type: "action", order_index: 14, position_x: 1000, position_y: 80, created_at: "", updated_at: "" },
  { id: "106", process_id: "1", step_name: "Goods Receipt", description: "Complete Goods Receipt", lane: "Premier Health", step_type: "action", order_index: 16, position_x: 1180, position_y: 80, created_at: "", updated_at: "" },
  { id: "107", process_id: "1", step_name: "Authorize Payment", description: "Authorize PO payment to Versatex", lane: "Premier Health", step_type: "action", order_index: 17, position_x: 1360, position_y: 80, created_at: "", updated_at: "" },
  { id: "201", process_id: "1", step_name: "Source Pricing", description: "Source pricing from merchants", lane: "Versatex", step_type: "action", order_index: 4, position_x: 280, position_y: 220, created_at: "", updated_at: "" },
  { id: "202", process_id: "1", step_name: "Send Options", description: "Send to client for selection", lane: "Versatex", step_type: "action", order_index: 5, position_x: 460, position_y: 220, created_at: "", updated_at: "" },
  { id: "203", process_id: "1", step_name: "Accounting Entry", description: "Initiate accounting entry", lane: "Versatex", step_type: "action", order_index: 8, position_x: 640, position_y: 220, created_at: "", updated_at: "" },
  { id: "204", process_id: "1", step_name: "Send PO to Merchant", description: "Send PO for fulfillment", lane: "Versatex", step_type: "action", order_index: 9, position_x: 820, position_y: 220, created_at: "", updated_at: "" },
  { id: "205", process_id: "1", step_name: "Pay Merchant", description: "Pay merchant(s)", lane: "Versatex", step_type: "action", order_index: 12, position_x: 1000, position_y: 220, created_at: "", updated_at: "" },
  { id: "206", process_id: "1", step_name: "Receive Tracking", description: "Receive shipping details from merchant", lane: "Versatex", step_type: "action", order_index: 13, position_x: 1180, position_y: 220, created_at: "", updated_at: "" },
  { id: "207", process_id: "1", step_name: "Close PO", description: "Close PO(s)", lane: "Versatex", step_type: "end", order_index: 18, position_x: 1360, position_y: 220, created_at: "", updated_at: "" },
  { id: "301", process_id: "1", step_name: "Accept PO", description: "Merchant accepts PO", lane: "Merchant", step_type: "action", order_index: 10, position_x: 820, position_y: 360, created_at: "", updated_at: "" },
  { id: "302", process_id: "1", step_name: "Ship Items", description: "Merchant ships items", lane: "Merchant", step_type: "action", order_index: 11, position_x: 1000, position_y: 360, created_at: "", updated_at: "" },
  { id: "303", process_id: "1", step_name: "Deliver to Client", description: "Deliver orders to Premier Health", lane: "Merchant", step_type: "action", order_index: 15, position_x: 1180, position_y: 360, created_at: "", updated_at: "" },
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

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const selectedStep = mockSteps.find((s) => s.id === selectedStepId) || null;

  const handleStepClick = (stepId: string) => {
    setSelectedStepId(stepId);
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setSelectedStepId(null);
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title={mockWorkflow.name}
        description={mockWorkflow.description}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/workflows">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button
              asChild
              className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
            >
              <Link href={`/sessions/new?workflow=${params.id}`}>
                <Play className="mr-2 h-4 w-4" />
                Start Waste Walk
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Workflow
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Stats Bar */}
      <div className="px-6 py-3 border-b bg-muted/30 flex items-center gap-4">
        <Badge variant="secondary">{mockSteps.length} Steps</Badge>
        <Badge variant="secondary">3 Swimlanes</Badge>
        <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
          {Object.values(mockObservations).reduce((sum, o) => sum + o.count, 0)} Observations
        </Badge>
        <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50">
          Total Priority: {Object.values(mockObservations).reduce((sum, o) => sum + o.priorityScore, 0)}
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

      {/* Step Detail Panel */}
      <StepDetailPanel
        step={selectedStep}
        observations={[]}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        onStartTagging={() => {
          router.push(`/sessions/new?workflow=${params.id}&step=${selectedStepId}`);
        }}
        sessionActive={false}
      />
    </div>
  );
}

