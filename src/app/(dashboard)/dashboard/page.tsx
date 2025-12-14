"use client";

import { useState, useEffect } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  GitBranch,
  Users,
  TrendingUp,
  ArrowRight,
  Play,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/lib/stores/authStore";
import { useToast } from "@/hooks/use-toast";
import { getDashboardStats, getRecentSessions, getTopHotspots } from "@/lib/services/analytics";
import { getOverallTrainingProgress, getTrainingContentWithProgress } from "@/lib/services/training";
import { formatDistanceToNow } from "date-fns";

interface DashboardStats {
  trainingProgress: number;
  totalWorkflows: number;
  activeSessions: number;
  wasteIdentified: number;
}

interface RecentSession {
  id: string;
  name: string;
  workflow_name: string;
  status: string;
  participant_count: number;
  created_at: string;
}

interface TopHotspot {
  rank: number;
  step_name: string;
  lane: string;
  waste_types: string[];
  priority_score: number;
}

interface TrainingModule {
  id: string;
  title: string;
  status: "completed" | "in_progress" | "available" | "locked";
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    trainingProgress: 0,
    totalWorkflows: 0,
    activeSessions: 0,
    wasteIdentified: 0,
  });
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [topHotspots, setTopHotspots] = useState<TopHotspot[]>([]);
  const [trainingModules, setTrainingModules] = useState<TrainingModule[]>([]);

  // Fetch dashboard data
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setIsLoading(true);

        const [dashboardStats, sessions, hotspots, trainingProgress, trainingContent] =
          await Promise.all([
            getDashboardStats(),
            getRecentSessions(3),
            getTopHotspots(undefined, 3),
            getOverallTrainingProgress(),
            getTrainingContentWithProgress(),
          ]);

        setStats({
          trainingProgress: trainingProgress.percentage,
          totalWorkflows: dashboardStats.totalWorkflows,
          activeSessions: dashboardStats.activeSessions,
          wasteIdentified: dashboardStats.wasteIdentified,
        });

        setRecentSessions(
          sessions.map((s: { id: string; name: string; workflow_name?: string; process?: { name: string }; status: string; participant_count?: number; created_at: string }) => ({
            id: s.id,
            name: s.name,
            workflow_name: s.workflow_name || s.process?.name || "Unknown Workflow",
            status: s.status,
            participant_count: s.participant_count || 0,
            created_at: s.created_at,
          }))
        );

        setTopHotspots(hotspots);

        setTrainingModules(
          trainingContent.slice(0, 3).map((m: { id: string; title: string; status: "completed" | "in_progress" | "available" | "locked" }) => ({
            id: m.id,
            title: m.title,
            status: m.status,
          }))
        );
      } catch (error) {
        console.error("Failed to load dashboard:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load dashboard data.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [toast]);

  const statCards = [
    {
      title: "Training Progress",
      value: `${stats.trainingProgress}%`,
      description: "Complete the training modules",
      icon: GraduationCap,
      color: "text-brand-gold",
      bgColor: "bg-brand-gold/10",
      href: "/training",
    },
    {
      title: "Workflows",
      value: stats.totalWorkflows.toString(),
      description: "Process workflows available",
      icon: GitBranch,
      color: "text-brand-navy",
      bgColor: "bg-brand-navy/10",
      href: "/workflows",
    },
    {
      title: "Active Sessions",
      value: stats.activeSessions.toString(),
      description: "Ongoing waste walks",
      icon: Users,
      color: "text-brand-emerald",
      bgColor: "bg-brand-emerald/10",
      href: "/sessions",
    },
    {
      title: "Waste Identified",
      value: stats.wasteIdentified.toString(),
      description: "Total observations recorded",
      icon: AlertTriangle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      href: "/analytics",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title={`Welcome back, ${user?.name?.split(" ")[0] || "User"}!`}
        description="Here's what's happening with your process optimization efforts"
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            asChild
            className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy font-medium"
          >
            <Link href="/training">
              <Play className="mr-2 h-4 w-4" />
              Continue Training
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sessions/new">
              <Users className="mr-2 h-4 w-4" />
              Start New Waste Walk
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-brand-navy">
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Training Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-brand-gold" />
                Training Progress
              </CardTitle>
              <CardDescription>
                Complete the training to master waste identification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-medium">{stats.trainingProgress}%</span>
                </div>
                <Progress value={stats.trainingProgress} className="h-2" />
              </div>

              <div className="space-y-3">
                {trainingModules.map((module) => (
                  <div
                    key={module.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      module.status === "in_progress"
                        ? "bg-brand-gold/10 border border-brand-gold/20"
                        : "bg-brand-platinum/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          module.status === "completed"
                            ? "bg-brand-emerald/20"
                            : module.status === "in_progress"
                            ? "bg-brand-gold/20"
                            : "bg-muted"
                        }`}
                      >
                        {module.status === "completed" ? (
                          <span className="text-brand-emerald text-sm">✓</span>
                        ) : module.status === "in_progress" ? (
                          <Play className="h-3 w-3 text-brand-gold" />
                        ) : (
                          <Clock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <span
                        className={`text-sm ${
                          module.status === "in_progress"
                            ? "font-medium"
                            : module.status === "locked"
                            ? "text-muted-foreground"
                            : ""
                        }`}
                      >
                        {module.title}
                      </span>
                    </div>
                    <Badge
                      variant={
                        module.status === "completed"
                          ? "secondary"
                          : module.status === "in_progress"
                          ? "default"
                          : "outline"
                      }
                      className={
                        module.status === "completed"
                          ? "bg-brand-emerald/10 text-brand-emerald"
                          : module.status === "in_progress"
                          ? "bg-brand-gold text-brand-navy"
                          : ""
                      }
                    >
                      {module.status === "completed"
                        ? "Completed"
                        : module.status === "in_progress"
                        ? "In Progress"
                        : "Upcoming"}
                    </Badge>
                  </div>
                ))}
              </div>

              <Button asChild variant="outline" className="w-full">
                <Link href="/training">
                  Continue Training
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-navy" />
                Recent Sessions
              </CardTitle>
              <CardDescription>
                Your latest waste walk sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentSessions.length > 0 ? (
                recentSessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="space-y-1">
                        <p className="font-medium text-brand-navy">
                          {session.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {session.workflow_name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {session.participant_count} participants
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            session.status === "active" ? "default" : "secondary"
                          }
                          className={
                            session.status === "active"
                              ? "bg-brand-emerald text-white"
                              : ""
                          }
                        >
                          {session.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(session.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No sessions yet</p>
                  <Button asChild variant="link" className="mt-2">
                    <Link href="/sessions/new">Create your first session</Link>
                  </Button>
                </div>
              )}

              <Button asChild variant="outline" className="w-full">
                <Link href="/sessions">
                  View All Sessions
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Top Waste Hotspots */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Top Waste Hotspots
            </CardTitle>
            <CardDescription>
              Process steps with the highest waste priority scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topHotspots.length > 0 ? (
              <div className="space-y-3">
                {topHotspots.map((item) => (
                  <div
                    key={item.rank}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          item.rank === 1
                            ? "bg-red-500"
                            : item.rank === 2
                            ? "bg-orange-500"
                            : "bg-yellow-500"
                        }`}
                      >
                        {item.rank}
                      </div>
                      <div>
                        <p className="font-medium">{item.step_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.lane} •{" "}
                          {item.waste_types.slice(0, 2).join(", ")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{item.priority_score}</p>
                      <p className="text-xs text-muted-foreground">
                        Priority Score
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No waste hotspots identified yet</p>
                <p className="text-sm">
                  Start a waste walk session to identify improvement opportunities
                </p>
              </div>
            )}

            <Button asChild variant="outline" className="w-full mt-4">
              <Link href="/analytics">
                View Full Analytics
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
