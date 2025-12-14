"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Users,
  GitBranch,
  Clock,
  MoreVertical,
  Play,
  Pause,
  CheckCircle,
  Archive,
  ArrowRight,
  Eye,
  Trash2,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  getSessions,
  startSession,
  endSession,
  archiveSession,
  deleteSession,
} from "@/lib/services/sessions";
import type { SessionWithDetails } from "@/lib/services/sessions";

const getStatusConfig = (status: string) => {
  switch (status) {
    case "active":
      return {
        label: "Active",
        variant: "default" as const,
        className: "bg-brand-emerald text-white",
        icon: Play,
      };
    case "completed":
      return {
        label: "Completed",
        variant: "secondary" as const,
        className: "",
        icon: CheckCircle,
      };
    case "draft":
      return {
        label: "Draft",
        variant: "outline" as const,
        className: "",
        icon: Clock,
      };
    case "archived":
      return {
        label: "Archived",
        variant: "secondary" as const,
        className: "opacity-60",
        icon: Archive,
      };
    default:
      return {
        label: status,
        variant: "outline" as const,
        className: "",
        icon: Clock,
      };
  }
};

export default function SessionsPage() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  // Fetch sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const data = await getSessions();
      setSessions(data);
    } catch (error) {
      console.error("Failed to load sessions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load sessions. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSession = async (id: string) => {
    try {
      await startSession(id);
      await loadSessions();
      toast({
        title: "Session started",
        description: "The session is now active.",
      });
    } catch (error) {
      console.error("Failed to start session:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start session.",
      });
    }
  };

  const handleEndSession = async (id: string) => {
    try {
      await endSession(id);
      await loadSessions();
      toast({
        title: "Session ended",
        description: "The session has been completed.",
      });
    } catch (error) {
      console.error("Failed to end session:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to end session.",
      });
    }
  };

  const handleArchiveSession = async (id: string) => {
    try {
      await archiveSession(id);
      await loadSessions();
      toast({
        title: "Session archived",
        description: "The session has been archived.",
      });
    } catch (error) {
      console.error("Failed to archive session:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to archive session.",
      });
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await deleteSession(id);
      setSessions(sessions.filter((s) => s.id !== id));
      toast({
        title: "Session deleted",
        description: "The session has been deleted.",
      });
    } catch (error) {
      console.error("Failed to delete session:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete session.",
      });
    }
  };

  const filteredSessions =
    activeTab === "all"
      ? sessions
      : sessions.filter((s) => s.status === activeTab);

  const getStatusCounts = () => ({
    all: sessions.length,
    active: sessions.filter((s) => s.status === "active").length,
    draft: sessions.filter((s) => s.status === "draft").length,
    completed: sessions.filter((s) => s.status === "completed").length,
  });

  const counts = getStatusCounts();

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Waste Walk Sessions"
        description="Manage your waste identification sessions"
        actions={
          <Button
            asChild
            className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
          >
            <Link href="/sessions/new">
              <Plus className="mr-2 h-4 w-4" />
              New Session
            </Link>
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All Sessions ({counts.all})</TabsTrigger>
              <TabsTrigger value="active">Active ({counts.active})</TabsTrigger>
              <TabsTrigger value="draft">Draft ({counts.draft})</TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({counts.completed})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <div className="space-y-4">
                {filteredSessions.map((session) => {
                  const statusConfig = getStatusConfig(session.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <Card
                      key={session.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3">
                              <Badge className={statusConfig.className}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                              <h3 className="font-semibold text-lg">
                                {session.name}
                              </h3>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <GitBranch className="h-4 w-4" />
                                {session.process?.name || "Unknown Workflow"}
                              </span>
                            </div>

                            <div className="flex items-center gap-6 text-sm">
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                {session.participant_count || 0} participants
                              </span>
                              <span className="flex items-center gap-1 text-orange-600">
                                <Eye className="h-4 w-4" />
                                {session.observation_count || 0} observations
                              </span>
                              <span className="text-muted-foreground">
                                Facilitator: {session.facilitator?.name || "Unknown"}
                              </span>
                            </div>

                            <div className="text-xs text-muted-foreground">
                              Created{" "}
                              {formatDistanceToNow(new Date(session.created_at), {
                                addSuffix: true,
                              })}
                              {session.started_at &&
                                ` • Started ${formatDistanceToNow(
                                  new Date(session.started_at),
                                  { addSuffix: true }
                                )}`}
                              {session.ended_at &&
                                ` • Ended ${formatDistanceToNow(
                                  new Date(session.ended_at),
                                  { addSuffix: true }
                                )}`}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {session.status === "draft" && (
                              <Button
                                size="sm"
                                className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                                onClick={() => handleStartSession(session.id)}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Start
                              </Button>
                            )}
                            {session.status === "active" && (
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/sessions/${session.id}`}>
                                  Join Session
                                  <ArrowRight className="h-4 w-4 ml-1" />
                                </Link>
                              </Button>
                            )}
                            {session.status === "completed" && (
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/sessions/${session.id}/results`}>
                                  View Results
                                  <ArrowRight className="h-4 w-4 ml-1" />
                                </Link>
                              </Button>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/sessions/${session.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                {session.status === "active" && (
                                  <DropdownMenuItem
                                    onClick={() => handleEndSession(session.id)}
                                  >
                                    <Pause className="mr-2 h-4 w-4" />
                                    End Session
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleArchiveSession(session.id)}
                                >
                                  <Archive className="mr-2 h-4 w-4" />
                                  Archive
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteSession(session.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {filteredSessions.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No sessions found</h3>
                    <p className="text-muted-foreground mb-4">
                      Create a new waste walk session to get started
                    </p>
                    <Button asChild>
                      <Link href="/sessions/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Session
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
