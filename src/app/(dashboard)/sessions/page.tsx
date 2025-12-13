"use client";

import { useState } from "react";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Session {
  id: string;
  name: string;
  workflowId: string;
  workflowName: string;
  status: "draft" | "active" | "completed" | "archived";
  facilitator: string;
  participantCount: number;
  observationCount: number;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
}

const mockSessions: Session[] = [
  {
    id: "1",
    name: "PH Procurement Waste Walk v1",
    workflowId: "1",
    workflowName: "Premier Health & Versatex Procurement Workflow",
    status: "active",
    facilitator: "Ayo Sasore",
    participantCount: 4,
    observationCount: 12,
    createdAt: "2024-01-15T10:00:00Z",
    startedAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "2",
    name: "Claims Intake Review",
    workflowId: "2",
    workflowName: "Claims Intake Processing",
    status: "completed",
    facilitator: "Jane Doe",
    participantCount: 6,
    observationCount: 28,
    createdAt: "2024-01-10T09:00:00Z",
    startedAt: "2024-01-10T09:30:00Z",
    endedAt: "2024-01-10T12:00:00Z",
  },
  {
    id: "3",
    name: "Invoice Process Analysis",
    workflowId: "3",
    workflowName: "Invoice Approval Process",
    status: "draft",
    facilitator: "John Smith",
    participantCount: 0,
    observationCount: 0,
    createdAt: "2024-01-18T14:00:00Z",
  },
];

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
  const [activeTab, setActiveTab] = useState("all");

  const filteredSessions =
    activeTab === "all"
      ? mockSessions
      : mockSessions.filter((s) => s.status === activeTab);

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
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              All Sessions ({mockSessions.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({mockSessions.filter((s) => s.status === "active").length})
            </TabsTrigger>
            <TabsTrigger value="draft">
              Draft ({mockSessions.filter((s) => s.status === "draft").length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({mockSessions.filter((s) => s.status === "completed").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="space-y-4">
              {filteredSessions.map((session) => {
                const statusConfig = getStatusConfig(session.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <Card key={session.id} className="hover:shadow-md transition-shadow">
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
                              {session.workflowName}
                            </span>
                          </div>

                          <div className="flex items-center gap-6 text-sm">
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              {session.participantCount} participants
                            </span>
                            <span className="flex items-center gap-1 text-orange-600">
                              <Eye className="h-4 w-4" />
                              {session.observationCount} observations
                            </span>
                            <span className="text-muted-foreground">
                              Facilitator: {session.facilitator}
                            </span>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Created{" "}
                            {formatDistanceToNow(new Date(session.createdAt), {
                              addSuffix: true,
                            })}
                            {session.startedAt &&
                              ` • Started ${formatDistanceToNow(
                                new Date(session.startedAt),
                                { addSuffix: true }
                              )}`}
                            {session.endedAt &&
                              ` • Ended ${formatDistanceToNow(
                                new Date(session.endedAt),
                                { addSuffix: true }
                              )}`}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {session.status === "draft" && (
                            <Button
                              size="sm"
                              className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
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
                                <DropdownMenuItem>
                                  <Pause className="mr-2 h-4 w-4" />
                                  End Session
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem>
                                <Archive className="mr-2 h-4 w-4" />
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
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
      </div>
    </div>
  );
}

