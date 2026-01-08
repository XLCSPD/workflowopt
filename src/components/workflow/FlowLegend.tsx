"use client";

import { useState } from "react";
import {
  Database,
  FileText,
  CheckCircle,
  Cpu,
  Bell,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { FlowType } from "@/types";
import { FLOW_TYPE_CONFIG } from "@/types/informationFlow";
import { cn } from "@/lib/utils";

// Flow type icons
const FLOW_TYPE_ICONS: Record<FlowType, LucideIcon> = {
  data: Database,
  document: FileText,
  approval: CheckCircle,
  system: Cpu,
  notification: Bell,
};

interface FlowLegendProps {
  visibleTypes: Set<FlowType>;
  onToggleType: (type: FlowType) => void;
  onToggleAll: (visible: boolean) => void;
  flowCounts?: Record<FlowType, number>;
  className?: string;
}

export function FlowLegend({
  visibleTypes,
  onToggleType,
  onToggleAll,
  flowCounts,
  className,
}: FlowLegendProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const allTypes: FlowType[] = ["data", "document", "approval", "system", "notification"];
  const allVisible = allTypes.every((type) => visibleTypes.has(type));
  const noneVisible = visibleTypes.size === 0;
  const totalFlows = flowCounts
    ? Object.values(flowCounts).reduce((sum, count) => sum + count, 0)
    : 0;

  return (
    <div
      className={cn(
        "bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border",
        "overflow-hidden transition-all duration-200",
        className
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Information Flows</span>
          {totalFlows > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalFlows}
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Toggle All */}
          <div className="flex items-center justify-between py-1 border-b">
            <span className="text-xs text-muted-foreground">Show/Hide All</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleAll(true)}
                disabled={allVisible}
                className="h-6 px-2 text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleAll(false)}
                disabled={noneVisible}
                className="h-6 px-2 text-xs"
              >
                <EyeOff className="h-3 w-3 mr-1" />
                None
              </Button>
            </div>
          </div>

          {/* Flow Types */}
          <div className="space-y-1">
            {allTypes.map((type) => {
              const config = FLOW_TYPE_CONFIG[type];
              const Icon = FLOW_TYPE_ICONS[type];
              const isVisible = visibleTypes.has(type);
              const count = flowCounts?.[type] || 0;

              return (
                <label
                  key={type}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer",
                    "hover:bg-muted/50 transition-colors",
                    !isVisible && "opacity-50"
                  )}
                >
                  <Checkbox
                    checked={isVisible}
                    onCheckedChange={() => onToggleType(type)}
                  />
                  <div
                    className="w-4 h-0.5 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <Icon
                    className="h-4 w-4"
                    color={config.color}
                  />
                  <span className="text-sm flex-1">{config.label}</span>
                  {count > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {count}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
