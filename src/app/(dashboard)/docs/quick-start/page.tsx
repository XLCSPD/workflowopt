"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Rocket,
  GraduationCap,
  GitBranch,
  Users,
  Sparkles,
  BookOpen,
  Eye,
  Target,
  Zap,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  duration: string;
  content: React.ReactNode;
  action?: {
    label: string;
    href: string;
  };
}

const quickStartSteps: Step[] = [
  {
    id: "welcome",
    title: "Welcome to ProcessOpt!",
    description: "Let's get you started in 5 minutes",
    icon: Rocket,
    duration: "30 sec",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          ProcessOpt helps you identify and eliminate waste in your business processes using Lean principles and AI assistance.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-brand-gold/30 bg-brand-gold/5">
            <CardContent className="p-4 text-center">
              <Eye className="h-8 w-8 mx-auto mb-2 text-brand-gold" />
              <h4 className="font-semibold">Identify</h4>
              <p className="text-xs text-muted-foreground">Spot waste in processes</p>
            </CardContent>
          </Card>
          <Card className="border-brand-navy/30 bg-brand-navy/5">
            <CardContent className="p-4 text-center">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-brand-navy" />
              <h4 className="font-semibold">Analyze</h4>
              <p className="text-xs text-muted-foreground">AI-powered insights</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-4 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
              <h4 className="font-semibold">Improve</h4>
              <p className="text-xs text-muted-foreground">Design future states</p>
            </CardContent>
          </Card>
        </div>
      </div>
    ),
  },
  {
    id: "training",
    title: "Complete Your Training",
    description: "Learn to identify waste types",
    icon: GraduationCap,
    duration: "15-30 min",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Before joining waste walks, learn the 8 types of waste (DOWNTIME):
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { code: "D", name: "Defects", color: "bg-red-100 text-red-700" },
            { code: "O", name: "Overproduction", color: "bg-orange-100 text-orange-700" },
            { code: "W", name: "Waiting", color: "bg-yellow-100 text-yellow-700" },
            { code: "N", name: "Non-utilized Talent", color: "bg-lime-100 text-lime-700" },
            { code: "T", name: "Transportation", color: "bg-green-100 text-green-700" },
            { code: "I", name: "Inventory", color: "bg-teal-100 text-teal-700" },
            { code: "M", name: "Motion", color: "bg-blue-100 text-blue-700" },
            { code: "E", name: "Extra Processing", color: "bg-purple-100 text-purple-700" },
          ].map((waste) => (
            <div key={waste.code} className={`p-3 rounded-lg ${waste.color}`}>
              <span className="text-2xl font-bold">{waste.code}</span>
              <p className="text-xs font-medium">{waste.name}</p>
            </div>
          ))}
        </div>
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-brand-gold" />
              <div>
                <p className="font-medium">Waste Cheat Sheet</p>
                <p className="text-sm text-muted-foreground">
                  Keep this handy during sessions for quick reference
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    ),
    action: {
      label: "Start Training",
      href: "/training",
    },
  },
  {
    id: "workflows",
    title: "Explore Workflows",
    description: "Understand your process maps",
    icon: GitBranch,
    duration: "2 min",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Workflows are visual maps of your business processes. They show:
        </p>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg border">
            <div className="w-8 h-8 rounded bg-brand-gold/20 flex items-center justify-center">
              <span className="text-sm font-bold">□</span>
            </div>
            <div>
              <p className="font-medium">Steps</p>
              <p className="text-sm text-muted-foreground">Tasks, decisions, and events in your process</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg border">
            <div className="w-8 h-8 rounded bg-brand-navy/20 flex items-center justify-center">
              <span className="text-sm font-bold">═</span>
            </div>
            <div>
              <p className="font-medium">Lanes (Swimlanes)</p>
              <p className="text-sm text-muted-foreground">Who performs each step (roles/departments)</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg border">
            <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center">
              <span className="text-sm font-bold">→</span>
            </div>
            <div>
              <p className="font-medium">Connections</p>
              <p className="text-sm text-muted-foreground">How steps flow together</p>
            </div>
          </div>
        </div>
      </div>
    ),
    action: {
      label: "View Workflows",
      href: "/workflows",
    },
  },
  {
    id: "sessions",
    title: "Join a Waste Walk",
    description: "Participate in collaborative sessions",
    icon: Users,
    duration: "1-2 hours",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          During a waste walk session, you&apos;ll tag observations on process steps:
        </p>
        <ol className="space-y-3">
          {[
            { step: 1, text: "Click on a process step in the map" },
            { step: 2, text: "Click 'Add Observation'" },
            { step: 3, text: "Select waste type(s) that apply" },
            { step: 4, text: "Add notes describing what you observed" },
            { step: 5, text: "Rate frequency, impact, and ease to fix" },
            { step: 6, text: "Save your observation" },
          ].map((item) => (
            <li key={item.step} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-gold text-brand-navy font-bold flex items-center justify-center text-sm">
                {item.step}
              </div>
              <span>{item.text}</span>
            </li>
          ))}
        </ol>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Pro Tip</p>
                <p className="text-sm text-amber-700">
                  Capture everything you see – don&apos;t filter. The more observations, the better the analysis!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    ),
    action: {
      label: "View Sessions",
      href: "/sessions",
    },
  },
  {
    id: "future-state",
    title: "Use Future State Studio",
    description: "Let AI help optimize your process",
    icon: Sparkles,
    duration: "30-60 min",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          After completing a session, use the AI-powered studio to design improvements:
        </p>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
          <div className="space-y-4">
            {[
              { num: 1, name: "Synthesis", desc: "AI groups observations into themes" },
              { num: 2, name: "Solutions", desc: "AI generates improvement ideas" },
              { num: 3, name: "Sequencing", desc: "Plan implementation waves" },
              { num: 4, name: "Designer", desc: "Design the future process" },
              { num: 5, name: "Compare", desc: "See before vs. after" },
              { num: 6, name: "Export", desc: "Download deliverables" },
            ].map((stage) => (
              <div key={stage.num} className="flex items-center gap-4 relative">
                <div className="w-8 h-8 rounded-full bg-brand-gold text-brand-navy font-bold flex items-center justify-center text-sm z-10">
                  {stage.num}
                </div>
                <div>
                  <p className="font-medium">{stage.name}</p>
                  <p className="text-sm text-muted-foreground">{stage.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    action: {
      label: "Open Studio",
      href: "/future-state",
    },
  },
  {
    id: "done",
    title: "You're Ready!",
    description: "Start improving your processes",
    icon: CheckCircle2,
    duration: "",
    content: (
      <div className="space-y-6">
        <div className="text-center py-6">
          <div className="w-20 h-20 rounded-full bg-emerald-100 mx-auto mb-4 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h3 className="text-xl font-semibold text-brand-navy mb-2">
            Congratulations!
          </h3>
          <p className="text-muted-foreground">
            You now know the basics of ProcessOpt. Here&apos;s your recommended path:
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <GraduationCap className="h-8 w-8 text-brand-gold mb-3" />
              <h4 className="font-semibold">Complete Training</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Finish all modules to master waste identification
              </p>
              <Link href="/training">
                <Button size="sm" variant="outline" className="w-full">
                  Go to Training
                </Button>
              </Link>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <Users className="h-8 w-8 text-brand-navy mb-3" />
              <h4 className="font-semibold">Join a Session</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Participate in a waste walk with your team
              </p>
              <Link href="/sessions">
                <Button size="sm" variant="outline" className="w-full">
                  View Sessions
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        <Separator />
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Need more details? Check out the full documentation.
          </p>
          <Link href="/docs">
            <Button variant="outline">
              <BookOpen className="mr-2 h-4 w-4" />
              Full User Guide
            </Button>
          </Link>
        </div>
      </div>
    ),
  },
];

export default function QuickStartPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const step = quickStartSteps[currentStep];
  const progress = ((currentStep + 1) / quickStartSteps.length) * 100;

  const handleNext = () => {
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    if (currentStep < quickStartSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (index: number) => {
    setCurrentStep(index);
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Quick Start Guide"
        description="Get started with ProcessOpt in 5 minutes"
        actions={
          <Link href="/docs">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Docs
            </Button>
          </Link>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Step {currentStep + 1} of {quickStartSteps.length}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}% complete
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center mb-8 overflow-x-auto pb-2">
            <div className="flex gap-2">
              {quickStartSteps.map((s, index) => {
                const Icon = s.icon;
                const isActive = index === currentStep;
                const isCompleted = completedSteps.has(index);
                return (
                  <button
                    key={s.id}
                    onClick={() => handleStepClick(index)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      isActive
                        ? "bg-brand-gold/20 text-brand-navy"
                        : isCompleted
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {isCompleted && !isActive ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium hidden sm:inline">
                      {s.title.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-brand-gold/20 flex items-center justify-center">
                        <step.icon className="h-6 w-6 text-brand-gold" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{step.title}</CardTitle>
                        <CardDescription>{step.description}</CardDescription>
                      </div>
                    </div>
                    {step.duration && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {step.duration}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>{step.content}</CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            <div className="flex gap-3">
              {step.action && (
                <Link href={step.action.href}>
                  <Button variant="outline">
                    {step.action.label}
                  </Button>
                </Link>
              )}
              {currentStep < quickStartSteps.length - 1 ? (
                <Button onClick={handleNext} className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy">
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Link href="/dashboard">
                  <Button className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

