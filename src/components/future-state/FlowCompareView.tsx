"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowRight,
  Plus,
  Minus,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  GitCompare,
  Database,
  FileText,
  CheckCircle,
  Cpu,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  getFlowsByProcess,
  getFlowsByFutureState,
  getFlowComparison,
  createFlowComparison,
} from "@/lib/services/informationFlows";
import { FLOW_TYPE_CONFIG } from "@/types/informationFlow";
import type {
  InformationFlowWithRelations,
  FlowComparisonSnapshot,
  FlowComparisonItem,
  FlowType,
} from "@/types";

interface FlowCompareViewProps {
  sessionId: string;
  processId: string;
  futureStateId: string;
  className?: string;
}

const FLOW_TYPE_ICONS: Record<FlowType, React.ElementType> = {
  data: Database,
  document: FileText,
  approval: CheckCircle,
  system: Cpu,
  notification: Bell,
};

export function FlowCompareView({
  sessionId,
  processId,
  futureStateId,
  className,
}: FlowCompareViewProps) {
  const [currentFlows, setCurrentFlows] = useState<InformationFlowWithRelations[]>([]);
  const [futureFlows, setFutureFlows] = useState<InformationFlowWithRelations[]>([]);
  const [comparison, setComparison] = useState<FlowComparisonSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "eliminated" | "modified" | "added">("overview");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [current, future, existingComparison] = await Promise.all([
        getFlowsByProcess(processId),
        getFlowsByFutureState(futureStateId),
        getFlowComparison(sessionId, futureStateId),
      ]);

      setCurrentFlows(current);
      setFutureFlows(future);
      setComparison(existingComparison);
    } catch (error) {
      console.error("Failed to load flow comparison data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [processId, futureStateId, sessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerateComparison = async () => {
    setIsGenerating(true);
    try {
      const newComparison = await createFlowComparison(sessionId, futureStateId);
      setComparison(newComparison);
    } catch (error) {
      console.error("Failed to generate comparison:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderFlowItem = (flow: InformationFlowWithRelations, variant: "current" | "future") => {
    const config = FLOW_TYPE_CONFIG[flow.flow_type];
    const Icon = FLOW_TYPE_ICONS[flow.flow_type];

    return (
      <div
        key={flow.id}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border",
          variant === "current" ? "bg-gray-50" : "bg-emerald-50 border-emerald-200"
        )}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <Icon className="h-4 w-4" style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{flow.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className="text-xs" style={{ borderColor: config.color, color: config.color }}>
              {config.label}
            </Badge>
            {flow.quality_score && (
              <span className="text-xs text-muted-foreground">
                Quality: {flow.quality_score}/15
              </span>
            )}
          </div>
        </div>
        {flow.waste_types && flow.waste_types.length > 0 && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">
            {flow.waste_types.length} waste
          </Badge>
        )}
      </div>
    );
  };

  const renderComparisonItem = (item: FlowComparisonItem) => {
    const getIcon = () => {
      switch (item.change_type) {
        case "eliminated":
          return <Minus className="h-4 w-4 text-red-500" />;
        case "added":
          return <Plus className="h-4 w-4 text-green-500" />;
        case "modified":
          return <RefreshCw className="h-4 w-4 text-blue-500" />;
        default:
          return <CheckCircle2 className="h-4 w-4 text-gray-400" />;
      }
    };

    const getColor = () => {
      switch (item.change_type) {
        case "eliminated":
          return "border-red-200 bg-red-50";
        case "added":
          return "border-green-200 bg-green-50";
        case "modified":
          return "border-blue-200 bg-blue-50";
        default:
          return "border-gray-200 bg-gray-50";
      }
    };

    return (
      <div
        key={item.current_flow_id || item.future_flow_id || item.name}
        className={cn("flex items-center gap-3 p-3 rounded-lg border", getColor())}
      >
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{item.name}</p>
          {item.quality_change !== undefined && item.quality_change !== 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              {item.quality_change > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span
                className={cn(
                  "text-xs",
                  item.quality_change > 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {item.quality_change > 0 ? "+" : ""}{item.quality_change} quality
              </span>
            </div>
          )}
          {item.waste_changes && (item.waste_changes.removed.length > 0 || item.waste_changes.added.length > 0) && (
            <div className="flex flex-wrap gap-1 mt-1">
              {item.waste_changes.removed.map((waste) => (
                <Badge key={waste} variant="outline" className="text-xs text-red-600 border-red-300">
                  -{waste}
                </Badge>
              ))}
              {item.waste_changes.added.map((waste) => (
                <Badge key={waste} variant="outline" className="text-xs text-amber-600 border-amber-300">
                  +{waste}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Badge variant="outline" className="capitalize text-xs">
          {item.change_type}
        </Badge>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitCompare className="h-5 w-5 text-brand-gold" />
          <div>
            <h3 className="font-semibold">Information Flow Comparison</h3>
            <p className="text-sm text-muted-foreground">
              Compare current vs future state information flows
            </p>
          </div>
        </div>
        <Button
          onClick={handleGenerateComparison}
          disabled={isGenerating}
          variant="outline"
          size="sm"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : comparison ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </>
          ) : (
            <>
              <GitCompare className="h-4 w-4 mr-2" />
              Generate Comparison
            </>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current</span>
              <span className="text-2xl font-bold">{currentFlows.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">information flows</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Future</span>
              <span className="text-2xl font-bold text-emerald-600">{futureFlows.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">information flows</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Eliminated</span>
              <span className="text-2xl font-bold text-red-600">
                {comparison?.eliminated_flows || 0}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">flows removed</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Quality</span>
              <span className={cn(
                "text-2xl font-bold",
                (comparison?.avg_quality_improvement || 0) >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {comparison?.avg_quality_improvement
                  ? `${comparison.avg_quality_improvement > 0 ? "+" : ""}${comparison.avg_quality_improvement.toFixed(1)}`
                  : "N/A"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">avg improvement</p>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Details */}
      {comparison ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Flow Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="text-xs">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="eliminated" className="text-xs">
                  Eliminated ({comparison.comparison_data.eliminated.length})
                </TabsTrigger>
                <TabsTrigger value="modified" className="text-xs">
                  Modified ({comparison.comparison_data.modified.length})
                </TabsTrigger>
                <TabsTrigger value="added" className="text-xs">
                  Added ({comparison.comparison_data.added.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                {/* Change Distribution */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Minus className="h-4 w-4 text-red-500" />
                      Eliminated
                    </span>
                    <span>{comparison.comparison_data.eliminated.length}</span>
                  </div>
                  <Progress
                    value={
                      (comparison.comparison_data.eliminated.length /
                        Math.max(currentFlows.length, 1)) *
                      100
                    }
                    className="h-2"
                  />

                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-blue-500" />
                      Modified
                    </span>
                    <span>{comparison.comparison_data.modified.length}</span>
                  </div>
                  <Progress
                    value={
                      (comparison.comparison_data.modified.length /
                        Math.max(currentFlows.length, 1)) *
                      100
                    }
                    className="h-2"
                  />

                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-green-500" />
                      Added
                    </span>
                    <span>{comparison.comparison_data.added.length}</span>
                  </div>
                  <Progress
                    value={
                      (comparison.comparison_data.added.length /
                        Math.max(futureFlows.length, 1)) *
                      100
                    }
                    className="h-2"
                  />

                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-gray-400" />
                      Unchanged
                    </span>
                    <span>{comparison.comparison_data.unchanged.length}</span>
                  </div>
                  <Progress
                    value={
                      (comparison.comparison_data.unchanged.length /
                        Math.max(currentFlows.length, 1)) *
                      100
                    }
                    className="h-2"
                  />
                </div>

                {/* Key Metrics */}
                {comparison.waste_reduction_count && comparison.waste_reduction_count > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                    <AlertTriangle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        {comparison.waste_reduction_count} waste types reduced
                      </p>
                      <p className="text-xs text-green-600">
                        Information flow improvements address identified waste
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="eliminated" className="mt-4">
                <div className="space-y-2">
                  {comparison.comparison_data.eliminated.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No flows eliminated in the future state
                    </p>
                  ) : (
                    comparison.comparison_data.eliminated.map(renderComparisonItem)
                  )}
                </div>
              </TabsContent>

              <TabsContent value="modified" className="mt-4">
                <div className="space-y-2">
                  {comparison.comparison_data.modified.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No flows modified in the future state
                    </p>
                  ) : (
                    comparison.comparison_data.modified.map(renderComparisonItem)
                  )}
                </div>
              </TabsContent>

              <TabsContent value="added" className="mt-4">
                <div className="space-y-2">
                  {comparison.comparison_data.added.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No new flows added in the future state
                    </p>
                  ) : (
                    comparison.comparison_data.added.map(renderComparisonItem)
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <GitCompare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="mb-2">No comparison generated yet</p>
              <p className="text-sm mb-4">
                Click &quot;Generate Comparison&quot; to analyze differences between current and future state flows
              </p>
              <Button onClick={handleGenerateComparison} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <GitCompare className="h-4 w-4 mr-2" />
                    Generate Comparison
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Side-by-Side Flow Lists */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-gray-500" />
              Current State Flows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {currentFlows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No information flows defined
                </p>
              ) : (
                currentFlows.map((flow) => renderFlowItem(flow, "current"))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-emerald-500" />
              Future State Flows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {futureFlows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No information flows defined
                </p>
              ) : (
                futureFlows.map((flow) => renderFlowItem(flow, "future"))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
