"use client";

import { ReactNode, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Layers,
  Lightbulb,
  GitBranch,
  Layout,
  FileBarChart,
  Download,
  Play,
  History,
  RefreshCw,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { PresenceUser, AgentRun } from "@/types";
import type { StudioStage } from "@/types";

// ============================================
// TYPES
// ============================================

export interface StudioShellProps {
  sessionId: string;
  sessionName: string;
  processName?: string;
  currentStage: StudioStage;
  children: ReactNode;
  presenceUsers?: PresenceUser[];
  agentRuns?: AgentRun[];
  isRunningAgent?: boolean;
  onRunAgent?: () => void;
  canRunAgent?: boolean;
  sidebar?: ReactNode;
  rightDrawer?: ReactNode;
}

// ============================================
// STAGE CONFIG
// ============================================

const stages: Array<{
  key: StudioStage;
  label: string;
  shortLabel: string;
  icon: typeof Layers;
  description: string;
}> = [
  {
    key: "synthesis",
    label: "Synthesis Hub",
    shortLabel: "Synthesis",
    icon: Layers,
    description: "Cluster observations into themes",
  },
  {
    key: "solutions",
    label: "Solution Builder",
    shortLabel: "Solutions",
    icon: Lightbulb,
    description: "Generate and refine solutions",
  },
  {
    key: "designer",
    label: "Future State Designer",
    shortLabel: "Designer",
    icon: Layout,
    description: "Design the future state process",
  },
  {
    key: "compare",
    label: "Compare & Value",
    shortLabel: "Compare",
    icon: FileBarChart,
    description: "Compare current vs future state",
  },
  {
    key: "sequencing",
    label: "Roadmap Builder",
    shortLabel: "Sequencing",
    icon: GitBranch,
    description: "Plan implementation waves",
  },
  {
    key: "export",
    label: "Export",
    shortLabel: "Export",
    icon: Download,
    description: "Export deliverables",
  },
];

// ============================================
// COMPONENT
// ============================================

export function StudioShell({
  sessionId,
  sessionName,
  processName,
  currentStage,
  children,
  presenceUsers = [],
  agentRuns = [],
  isRunningAgent = false,
  onRunAgent,
  canRunAgent = true,
  sidebar,
  rightDrawer,
}: StudioShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStageIndex = useMemo(
    () => stages.findIndex((s) => s.key === currentStage),
    [currentStage]
  );

  const _latestAgentRun = useMemo(() => {
    const stageType = currentStage === "designer" ? "design" : currentStage;
    return agentRuns
      .filter((r) => r.agent_type === stageType)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  }, [agentRuns, currentStage]);
  void _latestAgentRun; // Reserved for future status display

  const navigateToStage = (stage: StudioStage) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("stage", stage);
    router.push(`/future-state/${sessionId}?${params.toString()}`);
  };

  const otherUsers = presenceUsers.filter((u) => u.id !== undefined).slice(0, 5);
  const hiddenUserCount = Math.max(0, presenceUsers.length - 5);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Top Navigation Rail */}
        <div className="shrink-0 border-b bg-white">
          {/* Session Info Row */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
            <div className="flex items-center gap-3">
              <Link href="/future-state">
                <Button variant="ghost" size="sm" className="gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="font-semibold text-brand-navy line-clamp-1">{sessionName}</h1>
                {processName && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{processName}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Presence Avatars */}
              {otherUsers.length > 0 && (
                <div className="flex items-center gap-1">
                  <div className="flex -space-x-2">
                    {otherUsers.map((user) => (
                      <Tooltip key={user.id}>
                        <TooltipTrigger asChild>
                          <Avatar className="h-7 w-7 border-2 border-white ring-2 ring-emerald-400/50">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback className="text-[10px] bg-brand-gold text-brand-navy">
                              {user.name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{user.name}</p>
                          {user.currentStage && (
                            <p className="text-xs text-muted-foreground">
                              Viewing {user.currentStage}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                  {hiddenUserCount > 0 && (
                    <span className="text-xs text-muted-foreground">+{hiddenUserCount}</span>
                  )}
                </div>
              )}

              {/* Agent Run History */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    <History className="h-4 w-4" />
                    <span className="hidden sm:inline">Runs</span>
                    {agentRuns.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                        {agentRuns.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel>Agent Run History</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {agentRuns.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No agent runs yet
                    </div>
                  ) : (
                    agentRuns.slice(0, 10).map((run) => (
                      <DropdownMenuItem key={run.id} className="flex items-start gap-2 py-2">
                        {run.status === "succeeded" ? (
                          <Check className="h-4 w-4 text-emerald-500 mt-0.5" />
                        ) : run.status === "failed" ? (
                          <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                        ) : run.status === "running" ? (
                          <Loader2 className="h-4 w-4 text-brand-gold animate-spin mt-0.5" />
                        ) : (
                          <RefreshCw className="h-4 w-4 text-muted-foreground mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium capitalize">
                            {run.agent_type} Agent
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(run.created_at).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                            {run.model && ` • ${run.model}`}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Run Agent Button */}
              {onRunAgent && (
                <Button
                  onClick={onRunAgent}
                  disabled={!canRunAgent || isRunningAgent}
                  size="sm"
                  className="gap-1.5 bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                >
                  {isRunningAgent ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Run Agent
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Stage Stepper */}
          <div className="flex items-center px-4 py-2 gap-2 overflow-x-auto">
            {stages.map((stage, index) => {
              const isActive = stage.key === currentStage;
              const isPast = index < currentStageIndex;
              const Icon = stage.icon;

              return (
                <button
                  key={stage.key}
                  onClick={() => navigateToStage(stage.key)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-all shrink-0",
                    isActive
                      ? "bg-brand-gold/20 text-brand-navy font-medium"
                      : isPast
                      ? "text-brand-navy/70 hover:bg-muted"
                      : "text-muted-foreground hover:bg-muted hover:text-brand-navy"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full transition-all",
                      isActive
                        ? "bg-brand-gold text-brand-navy"
                        : isPast
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isPast ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <span className="text-sm hidden lg:inline">{stage.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Sidebar */}
          {sidebar && (
            <aside className="hidden lg:flex w-72 shrink-0 border-r bg-white overflow-y-auto">
              {sidebar}
            </aside>
          )}

          {/* Main Canvas */}
          <main className="flex-1 overflow-auto bg-brand-platinum/30">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStage}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Right Drawer */}
          {rightDrawer && (
            <aside className="hidden xl:flex w-80 shrink-0 border-l bg-white overflow-y-auto">
              {rightDrawer}
            </aside>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ============================================
// STAGE LANDING COMPONENT
// ============================================

interface StageLandingProps {
  stage: StudioStage;
  title: string;
  description: string;
  icon: typeof Layers;
  stats?: Array<{ label: string; value: number | string }>;
  actions?: ReactNode;
  children?: ReactNode;
}

export function StageLanding({
  title,
  description,
  icon: Icon,
  stats,
  actions,
  children,
}: StageLandingProps) {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-brand-gold/10">
            <Icon className="h-6 w-6 text-brand-gold" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-brand-navy">{title}</h2>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </motion.div>

      {/* Stats */}
      {stats && stats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {stats.map((stat, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border p-4 text-center shadow-sm"
            >
              <p className="text-2xl font-bold text-brand-navy">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Content */}
      {children && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

