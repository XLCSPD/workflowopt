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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  CheckCircle,
  Clock,
  Video,
  FileText,
  BookOpen,
  HelpCircle,
  ArrowRight,
  Lock,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getTrainingContentWithProgress,
  getOverallTrainingProgress,
} from "@/lib/services/training";
import type { TrainingContentWithProgress } from "@/lib/services/training";

const getTypeIcon = (type: string) => {
  switch (type) {
    case "video":
      return Video;
    case "slides":
      return FileText;
    case "article":
      return BookOpen;
    case "quiz":
      return HelpCircle;
    default:
      return FileText;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-brand-emerald text-white">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      );
    case "in_progress":
      return (
        <Badge className="bg-brand-gold text-brand-navy">
          <Play className="w-3 h-3 mr-1" />
          In Progress
        </Badge>
      );
    case "locked":
      return (
        <Badge variant="secondary">
          <Lock className="w-3 h-3 mr-1" />
          Locked
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          <Clock className="w-3 h-3 mr-1" />
          Available
        </Badge>
      );
  }
};

export default function TrainingPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [modules, setModules] = useState<TrainingContentWithProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState({
    total: 0,
    completed: 0,
    percentage: 0,
  });
  const [activeTab, setActiveTab] = useState("all");

  // Fetch training content with progress
  useEffect(() => {
    const loadTraining = async () => {
      try {
        setIsLoading(true);
        const [content, progress] = await Promise.all([
          getTrainingContentWithProgress(),
          getOverallTrainingProgress(),
        ]);
        setModules(content);
        setOverallProgress(progress);
      } catch (error) {
        console.error("Failed to load training:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load training content.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTraining();
  }, [toast]);

  const filteredModules =
    activeTab === "all"
      ? modules
      : modules.filter((m) => m.type === activeTab);

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Training Library"
        description="Master Lean waste identification with our comprehensive training modules"
        actions={
          <Button asChild variant="outline">
            <Link href="/training/cheat-sheet">
              <BookOpen className="mr-2 h-4 w-4" />
              Waste Cheat Sheet
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
          <>
            {/* Progress Overview */}
            <Card className="bg-gradient-to-r from-brand-navy to-brand-navy/90 text-white">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Your Training Progress</h2>
                    <p className="text-white/80">
                      {overallProgress.completed} of {overallProgress.total} modules
                      completed
                    </p>
                  </div>
                  <div className="w-full md:w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overall Progress</span>
                      <span className="font-bold">{overallProgress.percentage}%</span>
                    </div>
                    <Progress
                      value={overallProgress.percentage}
                      className="h-3 bg-white/20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Module Filters */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-muted/50">
                <TabsTrigger value="all">All Modules</TabsTrigger>
                <TabsTrigger value="video">
                  <Video className="w-4 h-4 mr-2" />
                  Videos
                </TabsTrigger>
                <TabsTrigger value="slides">
                  <FileText className="w-4 h-4 mr-2" />
                  Slides
                </TabsTrigger>
                <TabsTrigger value="article">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Articles
                </TabsTrigger>
                <TabsTrigger value="quiz">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Quizzes
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-6 space-y-8">
                {(() => {
                  const appOverviewModules = filteredModules.filter((m) =>
                    m.title.toLowerCase().includes("app overview")
                  );
                  const coreModules = filteredModules.filter(
                    (m) => !m.title.toLowerCase().includes("app overview")
                  );

                  const renderModuleCard = (module: TrainingContentWithProgress, isAppOverview: boolean) => {
                    const Icon = getTypeIcon(module.type);
                    const isDisabled = module.status === "locked";

                    return (
                      <Card
                        key={module.id}
                        className={`transition-all duration-200 ${
                          isAppOverview 
                            ? "border-brand-gold/30 bg-brand-gold/5" 
                            : ""
                        } ${
                          isDisabled
                            ? "opacity-60"
                            : isAppOverview 
                              ? "hover:shadow-md hover:border-brand-gold cursor-pointer"
                              : "hover:shadow-md cursor-pointer"
                        }`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-2 rounded-lg ${
                                  module.status === "completed"
                                    ? "bg-brand-emerald/10"
                                    : module.status === "in_progress"
                                    ? "bg-brand-gold/20"
                                    : isAppOverview
                                    ? "bg-brand-gold/10"
                                    : "bg-muted"
                                }`}
                              >
                                <Icon
                                  className={`h-5 w-5 ${
                                    module.status === "completed"
                                      ? "text-brand-emerald"
                                      : module.status === "in_progress" || isAppOverview
                                      ? "text-brand-gold"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              </div>
                              <div>
                                <CardTitle className="text-base">
                                  {module.title}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {module.duration_minutes || 10} min
                                </div>
                              </div>
                            </div>
                            {getStatusBadge(module.status)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <CardDescription>{module.description}</CardDescription>

                          <Button
                            asChild={!isDisabled}
                            variant={
                              module.status === "completed" ? "outline" : "default"
                            }
                            className={`w-full ${
                              module.status === "in_progress"
                                ? "bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                                : ""
                            }`}
                            disabled={isDisabled}
                          >
                            {isDisabled ? (
                              <span>
                                <Lock className="mr-2 h-4 w-4" />
                                Complete previous modules
                              </span>
                            ) : (
                              <Link href={`/training/${module.id}`}>
                                {module.status === "completed" ? (
                                  <>
                                    Review Module
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                  </>
                                ) : module.status === "in_progress" ? (
                                  <>
                                    <Play className="mr-2 h-4 w-4" />
                                    Continue Learning
                                  </>
                                ) : (
                                  <>
                                    Start Module
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                  </>
                                )}
                              </Link>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  };

                  return (
                    <>
                      {/* Getting Started Section - App Overview Modules */}
                      {appOverviewModules.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-1 bg-brand-gold rounded-full" />
                            <div>
                              <h3 className="text-lg font-semibold text-brand-navy">
                                Getting Started
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Start here to learn the basics of ProcessOpt
                              </p>
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            {appOverviewModules.map((module) => renderModuleCard(module, true))}
                          </div>
                        </div>
                      )}

                      {/* Divider between sections */}
                      {appOverviewModules.length > 0 && coreModules.length > 0 && (
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-3 text-muted-foreground">
                              Core Training Modules
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Core Training Modules */}
                      {coreModules.length > 0 && (
                        <div className="grid gap-4 md:grid-cols-2">
                          {coreModules.map((module) => renderModuleCard(module, false))}
                        </div>
                      )}

                      {filteredModules.length === 0 && (
                        <div className="text-center py-12">
                          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                          <p className="text-muted-foreground">
                            No training modules found for this category.
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
