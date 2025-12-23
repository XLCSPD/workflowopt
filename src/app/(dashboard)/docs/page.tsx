"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Rocket,
  GraduationCap,
  GitBranch,
  Users,
  Sparkles,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronRight,
  Search,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";

// Table of Contents structure
const tableOfContents = [
  {
    id: "introduction",
    title: "Introduction",
    icon: BookOpen,
    sections: [
      { id: "what-is-processopt", title: "What is ProcessOpt?" },
      { id: "core-concepts", title: "Core Concepts" },
      { id: "user-roles", title: "User Roles" },
    ],
  },
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Rocket,
    sections: [
      { id: "first-login", title: "First Login" },
      { id: "navigation", title: "Navigation" },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: BarChart3,
    sections: [
      { id: "quick-stats", title: "Quick Stats" },
      { id: "widgets", title: "Key Widgets" },
    ],
  },
  {
    id: "training",
    title: "Training",
    icon: GraduationCap,
    sections: [
      { id: "training-overview", title: "Overview" },
      { id: "completing-modules", title: "Completing Modules" },
      { id: "waste-cheat-sheet", title: "Waste Cheat Sheet" },
    ],
  },
  {
    id: "workflows",
    title: "Workflows",
    icon: GitBranch,
    sections: [
      { id: "what-is-workflow", title: "What is a Workflow?" },
      { id: "creating-workflows", title: "Creating Workflows" },
      { id: "workflow-context", title: "Workflow Context" },
    ],
  },
  {
    id: "sessions",
    title: "Sessions",
    icon: Users,
    sections: [
      { id: "session-overview", title: "Overview" },
      { id: "creating-sessions", title: "Creating Sessions" },
      { id: "adding-observations", title: "Adding Observations" },
    ],
  },
  {
    id: "future-state",
    title: "Future State Studio",
    icon: Sparkles,
    sections: [
      { id: "studio-overview", title: "Overview" },
      { id: "synthesis", title: "1. Synthesis Hub" },
      { id: "solutions", title: "2. Solution Builder" },
      { id: "sequencing", title: "3. Roadmap Builder" },
      { id: "designer", title: "4. Designer" },
      { id: "compare-export", title: "5-6. Compare & Export" },
    ],
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: BarChart3,
    sections: [
      { id: "analytics-overview", title: "Overview" },
      { id: "charts", title: "Charts & Metrics" },
      { id: "hotspots", title: "Hotspots" },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    icon: Settings,
    sections: [
      { id: "personal-settings", title: "Personal Settings" },
      { id: "admin-panel", title: "Admin Panel" },
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: HelpCircle,
    sections: [
      { id: "common-issues", title: "Common Issues" },
      { id: "faqs", title: "FAQs" },
    ],
  },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("introduction");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-col h-full">
      <Header
        title="User Guide"
        description="Complete documentation for the Versatex Process Optimization Platform"
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r bg-white hidden lg:flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search docs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <ScrollArea className="flex-1 p-4">
            <nav className="space-y-1">
              {tableOfContents.map((chapter) => {
                const Icon = chapter.icon;
                const isActive = activeSection === chapter.id;
                return (
                  <div key={chapter.id}>
                    <button
                      onClick={() => setActiveSection(chapter.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? "bg-brand-gold/20 text-brand-navy font-medium"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {chapter.title}
                    </button>
                    {isActive && (
                      <div className="ml-6 mt-1 space-y-1">
                        {chapter.sections.map((section) => (
                          <a
                            key={section.id}
                            href={`#${section.id}`}
                            className="block px-3 py-1.5 text-sm text-muted-foreground hover:text-brand-navy transition-colors"
                          >
                            {section.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6 lg:p-8">
            {/* Quick Start Banner */}
            <Card className="mb-8 bg-gradient-to-r from-brand-gold/20 to-brand-gold/5 border-brand-gold/30">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-brand-navy mb-2">
                      New to ProcessOpt?
                    </h2>
                    <p className="text-muted-foreground mb-4">
                      Get started in 5 minutes with our quick start guide.
                    </p>
                    <Link href="/docs/quick-start">
                      <Button className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy">
                        <Rocket className="mr-2 h-4 w-4" />
                        Quick Start Guide
                      </Button>
                    </Link>
                  </div>
                  <Rocket className="h-16 w-16 text-brand-gold/50" />
                </div>
              </CardContent>
            </Card>

            {/* Introduction Section */}
            <section id="introduction" className="mb-12">
              <h1 className="text-3xl font-bold text-brand-navy mb-4">
                Introduction
              </h1>

              <div id="what-is-processopt" className="mb-8">
                <h2 className="text-2xl font-semibold text-brand-navy mb-3">
                  What is ProcessOpt?
                </h2>
                <p className="text-muted-foreground mb-4">
                  ProcessOpt is a Lean process improvement platform that helps teams:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
                  <li><strong>Identify waste</strong> in business processes through collaborative &quot;waste walks&quot;</li>
                  <li><strong>Analyze observations</strong> using AI-powered insights</li>
                  <li><strong>Design future states</strong> with intelligent automation assistance</li>
                  <li><strong>Track improvements</strong> over time with comprehensive analytics</li>
                </ul>
              </div>

              <div id="core-concepts" className="mb-8">
                <h2 className="text-2xl font-semibold text-brand-navy mb-3">
                  Core Concepts
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { term: "Workflow", desc: "A visual map of your business process with steps, lanes, and connections" },
                    { term: "Session", desc: "A collaborative waste walk activity where participants tag observations" },
                    { term: "Observation", desc: "A documented instance of waste found at a process step" },
                    { term: "Waste Types", desc: "DOWNTIME categories: Defects, Overproduction, Waiting, Non-utilized Talent, Transportation, Inventory, Motion, Extra Processing" },
                    { term: "Future State", desc: "The optimized version of a process after applying solutions" },
                    { term: "Theme", desc: "A cluster of related observations grouped by root cause" },
                  ].map((item) => (
                    <Card key={item.term}>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-brand-navy">{item.term}</h3>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div id="user-roles" className="mb-8">
                <h2 className="text-2xl font-semibold text-brand-navy mb-3">
                  User Roles
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">Role</th>
                        <th className="text-left p-3 font-semibold">Permissions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-3"><Badge variant="secondary">Participant</Badge></td>
                        <td className="p-3 text-sm text-muted-foreground">Complete training, join sessions, add observations</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3"><Badge className="bg-brand-navy">Facilitator</Badge></td>
                        <td className="p-3 text-sm text-muted-foreground">All Participant abilities + create workflows/sessions, view analytics, export reports</td>
                      </tr>
                      <tr>
                        <td className="p-3"><Badge className="bg-brand-gold text-brand-navy">Admin</Badge></td>
                        <td className="p-3 text-sm text-muted-foreground">All Facilitator abilities + manage users, configure waste types, system settings</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <Separator className="my-8" />

            {/* Getting Started Section */}
            <section id="getting-started" className="mb-12">
              <h1 className="text-3xl font-bold text-brand-navy mb-4">
                Getting Started
              </h1>

              <div id="first-login" className="mb-8">
                <h2 className="text-2xl font-semibold text-brand-navy mb-3">
                  First Login
                </h2>
                <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                  <li><strong>Receive invitation email</strong> → Click the link to set your password</li>
                  <li><strong>Log in</strong> at the app URL with your email and password</li>
                  <li><strong>Complete your training</strong> → This teaches you waste identification</li>
                  <li><strong>Explore the Dashboard</strong> → Your central hub for all activities</li>
                </ol>
              </div>

              <div id="navigation" className="mb-8">
                <h2 className="text-2xl font-semibold text-brand-navy mb-3">
                  Navigation
                </h2>
                <p className="text-muted-foreground mb-4">
                  The sidebar (left side) provides access to all sections:
                </p>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {[
                    { icon: BarChart3, name: "Dashboard", desc: "Overview & quick actions" },
                    { icon: GraduationCap, name: "Training", desc: "Learning modules" },
                    { icon: GitBranch, name: "Workflows", desc: "Process maps" },
                    { icon: Users, name: "Sessions", desc: "Waste walks" },
                    { icon: Sparkles, name: "Future State Studio", desc: "AI optimization" },
                    { icon: BarChart3, name: "Analytics", desc: "Insights & reports" },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <item.icon className="h-5 w-5 text-brand-gold" />
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <Separator className="my-8" />

            {/* Future State Studio Section */}
            <section id="future-state" className="mb-12">
              <h1 className="text-3xl font-bold text-brand-navy mb-4">
                Future State Studio
              </h1>
              <p className="text-muted-foreground mb-6">
                The AI-powered optimization workspace. This is where observations become solutions.
              </p>

              <div id="studio-overview" className="mb-8">
                <h2 className="text-2xl font-semibold text-brand-navy mb-3">
                  Overview
                </h2>
                <p className="text-muted-foreground mb-4">
                  The studio guides you through 6 stages:
                </p>
                <div className="space-y-3">
                  {[
                    { num: 1, name: "Synthesis", desc: "AI clusters observations into themes" },
                    { num: 2, name: "Solutions", desc: "AI generates solution recommendations" },
                    { num: 3, name: "Sequencing", desc: "Solutions grouped into implementation waves" },
                    { num: 4, name: "Designer", desc: "Visual future state process map" },
                    { num: 5, name: "Compare", desc: "Side-by-side current vs. future" },
                    { num: 6, name: "Export", desc: "Download deliverables" },
                  ].map((stage) => (
                    <div key={stage.num} className="flex items-center gap-4 p-4 rounded-lg border">
                      <div className="w-10 h-10 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-navy font-bold">
                        {stage.num}
                      </div>
                      <div>
                        <h3 className="font-semibold">{stage.name}</h3>
                        <p className="text-sm text-muted-foreground">{stage.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div id="synthesis" className="mb-8">
                <h2 className="text-2xl font-semibold text-brand-navy mb-3">
                  1. Synthesis Hub
                </h2>
                <p className="text-muted-foreground mb-4">
                  The AI analyzes all observations and clusters them into meaningful themes:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>Click <strong>&quot;Run Agent&quot;</strong> to analyze observations</li>
                  <li>AI groups observations into themes with root causes</li>
                  <li>Review each theme and its linked observations</li>
                  <li>Approve themes to proceed to Solutions</li>
                </ol>
              </div>

              <div id="solutions" className="mb-8">
                <h2 className="text-2xl font-semibold text-brand-navy mb-3">
                  2. Solution Builder
                </h2>
                <p className="text-muted-foreground mb-4">
                  Solutions are categorized into three buckets:
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="border-red-200 bg-red-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-red-700">Eliminate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-red-600">Remove wasteful steps entirely</p>
                    </CardContent>
                  </Card>
                  <Card className="border-amber-200 bg-amber-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-amber-700">Modify</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-amber-600">Improve existing processes</p>
                    </CardContent>
                  </Card>
                  <Card className="border-emerald-200 bg-emerald-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-emerald-700">Create</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-emerald-600">Add new capabilities</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div id="designer" className="mb-8">
                <h2 className="text-2xl font-semibold text-brand-navy mb-3">
                  4. Designer
                </h2>
                <p className="text-muted-foreground mb-4">
                  The visual future state process map. Click on steps to use <strong>Step Design Assist</strong>:
                </p>
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Step Design Panel</h4>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li>• <strong>Options tab</strong> – View 2-3 AI-generated design alternatives</li>
                      <li>• <strong>Context tab</strong> – Provide additional information via chat</li>
                      <li>• <strong>History tab</strong> – See previous design versions</li>
                    </ul>
                    <Separator className="my-3" />
                    <p className="text-sm text-muted-foreground">
                      Each option includes: purpose, inputs, actions, outputs, controls, timing estimates, waste addressed, risks, and confidence score.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <Separator className="my-8" />

            {/* Troubleshooting Section */}
            <section id="troubleshooting" className="mb-12">
              <h1 className="text-3xl font-bold text-brand-navy mb-4">
                Troubleshooting
              </h1>

              <div id="common-issues" className="mb-8">
                <h2 className="text-2xl font-semibold text-brand-navy mb-3">
                  Common Issues
                </h2>
                <div className="space-y-4">
                  {[
                    { problem: "Can't log in", solution: "Use 'Forgot Password' link, check email" },
                    { problem: "Module locked", solution: "Complete prerequisite modules first" },
                    { problem: "Can't create sessions", solution: "Need Facilitator role – contact admin" },
                    { problem: "AI not generating", solution: "Check API key configuration in environment" },
                    { problem: "Export not working", solution: "Ensure session is completed" },
                    { problem: "Side panel content cut off", solution: "Try refreshing the page or resizing the window" },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-lg border">
                      <div className="w-2 h-2 rounded-full bg-red-400 mt-2" />
                      <div>
                        <p className="font-medium">{item.problem}</p>
                        <p className="text-sm text-muted-foreground">{item.solution}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div id="faqs" className="mb-8">
                <h2 className="text-2xl font-semibold text-brand-navy mb-3">
                  FAQs
                </h2>
                <Tabs defaultValue="general" className="w-full">
                  <TabsList>
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="sessions">Sessions</TabsTrigger>
                    <TabsTrigger value="ai">AI Features</TabsTrigger>
                  </TabsList>
                  <TabsContent value="general" className="space-y-4 mt-4">
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold">How do I reset my password?</h4>
                        <p className="text-sm text-muted-foreground">Click &quot;Forgot Password&quot; on the login page and follow email instructions.</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold">Why can&apos;t I see the Admin panel?</h4>
                        <p className="text-sm text-muted-foreground">Only users with Admin role have access. Contact your administrator.</p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="sessions" className="space-y-4 mt-4">
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold">How long should a waste walk take?</h4>
                        <p className="text-sm text-muted-foreground">Typically 1-2 hours depending on process complexity and team size.</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold">Can I edit observations after submitting?</h4>
                        <p className="text-sm text-muted-foreground">Yes, click on any observation in the session to edit or delete it.</p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="ai" className="space-y-4 mt-4">
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold">What if the AI doesn&apos;t generate good options?</h4>
                        <p className="text-sm text-muted-foreground">Add more context in the Context tab, or try regenerating with Research Mode enabled.</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold">How does the AI use workflow context?</h4>
                        <p className="text-sm text-muted-foreground">The AI considers your workflow&apos;s purpose, constraints, stakeholders, and success metrics when generating solutions.</p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </section>

            {/* Footer */}
            <div className="mt-12 p-6 rounded-lg bg-muted/50 text-center">
              <p className="text-muted-foreground mb-4">
                Need more help? Click the <strong>?</strong> icon in the header for contextual help.
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/training/cheat-sheet">
                  <Button variant="outline">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Waste Cheat Sheet
                  </Button>
                </Link>
                <Link href="/training">
                  <Button variant="outline">
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Training
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

