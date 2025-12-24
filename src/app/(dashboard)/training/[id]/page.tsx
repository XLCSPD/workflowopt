"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Slider } from "@/components/ui/slider";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  CheckCircle,
  BookOpen,
  RotateCcw,
  EyeOff,
  Zap,
  Factory,
  Brain,
  Unplug,
  TrendingDown,
  PackageX,
  Target,
  Lightbulb,
  AlertTriangle,
  Loader2,
  GraduationCap,
  GitBranch,
  Users,
  Sparkles,
  Rocket,
  ArrowRight,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { markTrainingComplete, getTrainingContentById } from "@/lib/services/training";
import { PdfSlideDeck, LabInstructionsPanel, type LabInstructions } from "@/components/training";
import type { TrainingContent } from "@/types";

// PDF Deck content type
interface PdfDeckContent {
  deckType: "pdf";
  pdfUrls: string[];
  title?: string;
  lab?: LabInstructions;
}

// Enhanced slides content type
interface EnhancedDeckContent {
  deckType?: "enhanced";
  slides: EnhancedSlide[];
}

// Supabase Storage URL
const SUPABASE_STORAGE_URL = "https://rnmgqwsujxqvsdlfdscw.supabase.co/storage/v1/object/public";

// Icon mapping for slides
const iconMap: Record<string, LucideIcon> = {
  "eye-off": EyeOff,
  "zap": Zap,
  "factory": Factory,
  "brain": Brain,
  "unplug": Unplug,
  "trending-down": TrendingDown,
  "package-x": PackageX,
  "target": Target,
  "lightbulb": Lightbulb,
  "alert": AlertTriangle,
  "graduation-cap": GraduationCap,
  "git-branch": GitBranch,
  "users": Users,
  "sparkles": Sparkles,
  "rocket": Rocket,
  "clipboard-list": ClipboardList,
  "arrow-right": ArrowRight,
  "check-circle": CheckCircle,
};

// Color mapping for waste type badges
// Brand-only waste badge colors - mapped to Versatex palette
const wasteColors: Record<string, string> = {
  gold: "bg-brand-gold/15 text-brand-gold border-brand-gold/40",
  navy: "bg-brand-navy/15 text-brand-navy border-brand-navy/40",
  emerald: "bg-brand-emerald/15 text-brand-emerald border-brand-emerald/40",
  charcoal: "bg-brand-charcoal/15 text-brand-charcoal border-brand-charcoal/40",
};

// Feature color gradients for modern slides
// Brand-only feature showcase colors - Versatex palette
const featureColors: Record<string, { bg: string; icon: string; border: string }> = {
  gold: { bg: "from-brand-gold/10 to-brand-gold/5", icon: "text-brand-gold", border: "border-brand-gold/30" },
  navy: { bg: "from-brand-navy/10 to-brand-navy/5", icon: "text-brand-navy", border: "border-brand-navy/30" },
  emerald: { bg: "from-brand-emerald/10 to-brand-emerald/5", icon: "text-brand-emerald", border: "border-brand-emerald/30" },
  charcoal: { bg: "from-brand-charcoal/10 to-brand-charcoal/5", icon: "text-brand-charcoal", border: "border-brand-charcoal/30" },
};

// Journey phase colors
// Brand color palette for phases - using only Versatex brand colors
const phaseColors: Record<string, string> = {
  gold: "bg-brand-gold",
  navy: "bg-brand-navy",
  emerald: "bg-brand-emerald",
  charcoal: "bg-brand-charcoal",
  platinum: "bg-brand-platinum",
};

// Slide type definitions
interface SlideBase {
  layout: string;
  title: string;
}

interface TitleSlide extends SlideBase {
  layout: "title";
  subtitle: string;
  tagline: string;
}

interface ContextSlide extends SlideBase {
  layout: "context";
  intro: string;
  bullets: { icon: string; label: string; text: string }[];
}

interface OverviewSlide extends SlideBase {
  layout: "overview";
  intro: string;
  columns?: {
    header: string;
    items: { letter: string; name: string; desc: string }[];
  }[];
  // Alternative format: simple items list (for TIMWOODS slides)
  subtitle?: string;
  items?: { icon: string; name: string; description: string }[];
}

interface SplitCardSlide extends SlideBase {
  layout: "split-card";
  // Original format: cards array for DOWNTIME slides
  cards?: {
    letter: string;
    name: string;
    color: string;
    definition: string;
    examples: string[];
    impact: string;
  }[];
  // New format: description + wasteExample for feature deep-dive slides
  description?: string;
  wasteExample?: {
    title: string;
    color: string;
    items: { icon: string; label: string; text: string }[];
  };
}

interface EmergingSlide extends SlideBase {
  layout: "emerging";
  intro?: string;
  // Original format: wastes array
  wastes?: { icon: string; name: string; desc: string; impact: string }[];
  // New format: subtitle + impact + examples
  subtitle?: string;
  impact?: string;
  examples?: { label: string; text: string }[];
}

interface ActionSlide extends SlideBase {
  layout: "action";
  subtitle: string;
  intro: string;
  steps: { number: string; title: string; desc: string }[];
}

interface ConclusionSlide extends SlideBase {
  layout: "conclusion";
  points: string[];
  cta: string;
}

// New modern slide types for App Overview
interface JourneySlide extends SlideBase {
  layout: "journey";
  intro: string;
  phases: { number: string; icon: string; name: string; desc: string; color: string }[];
}

interface FeatureShowcaseSlide extends SlideBase {
  layout: "feature-showcase";
  subtitle: string;
  icon: string;
  description: string;
  highlights: string[];
  color: string;
}

interface HandsOnSlide extends SlideBase {
  layout: "hands-on";
  subtitle: string;
  intro: string;
  labSteps: { step: string; action: string; detail: string }[];
}

type EnhancedSlide = TitleSlide | ContextSlide | OverviewSlide | SplitCardSlide | EmergingSlide | ActionSlide | ConclusionSlide | JourneySlide | FeatureShowcaseSlide | HandsOnSlide;

// Training data
const trainingData = {
  "1": {
    id: "1",
    title: "Introduction to Lean Waste",
    type: "video",
    content: {
      videoUrl: `${SUPABASE_STORAGE_URL}/training-videos/Waste_in_Your_Workflow.mp4`,
      transcript: "This video introduces the concept of waste in your workflow and explains how identifying and eliminating waste can dramatically improve process efficiency. You'll learn about the traditional DOWNTIME wastes and how they apply to modern digital workflows.",
    },
  },
  "2": {
    id: "2",
    title: "DOWNTIME Wastes Explained",
    type: "slides",
    content: {
      slides: [
        {
          layout: "title",
          title: "Digital Lean",
          subtitle: "Eliminating Waste in Modern Workflows",
          tagline: "A Guide to the 8 Wastes in a Digital Context",
        },
        {
          layout: "context",
          title: "The Hidden Factory",
          intro: "Lean principles originated in manufacturing to remove physical waste. However, modern waste is digital, invisible, and often accepted as 'normal.'",
          bullets: [
            { icon: "eye-off", label: "Invisible Friction", text: "Unlike a pile of scrap metal, digital waste hides in servers and inboxes" },
            { icon: "zap", label: "Velocity of Waste", text: "Technology allows us to create waste faster (e.g., 'Reply All' to 500 people)" },
            { icon: "factory", label: "The Cost", text: "Accepted delays and data errors create a 'Hidden Factory' of continuous rework" },
          ],
        },
        {
          layout: "overview",
          title: "The 8 Wastes: D.O.W.N.T.I.M.E.",
          intro: "To identify waste (Muda), we use the acronym DOWNTIME. In a digital environment, these physical wastes translate into information bottlenecks.",
          columns: [
            {
              header: "D.O.W.N.",
              items: [
                { letter: "D", name: "Defects", desc: "Data errors & bugs" },
                { letter: "O", name: "Overproduction", desc: "Reports no one reads" },
                { letter: "W", name: "Waiting", desc: "System latency" },
                { letter: "N", name: "Non-Utilized Talent", desc: "Poor training" },
              ],
            },
            {
              header: "T.I.M.E.",
              items: [
                { letter: "T", name: "Transportation", desc: "Digital handoffs" },
                { letter: "I", name: "Inventory", desc: "Backlogs & files" },
                { letter: "M", name: "Motion", desc: "Clicks & navigation" },
                { letter: "E", name: "Extra Processing", desc: "Re-entering data" },
              ],
            },
          ],
        },
        {
          layout: "split-card",
          title: "Defects & Overproduction",
          cards: [
            {
              letter: "D",
              name: "Defects",
              color: "red",
              definition: "Digital flaws requiring rework. This initiates a 'Hidden Factory' of continuous checking and validation.",
              examples: ["Data entry errors", "Software bugs", "Incomplete form submissions", "Incorrect file formats"],
              impact: "The cost of rework compounds the initial waste and delays value delivery.",
            },
            {
              letter: "O",
              name: "Overproduction",
              color: "orange",
              definition: "The 'Mother of all waste' — generating information sooner or in greater quantity than required.",
              examples: ["Reports that are never read", "CC'ing everyone on emails", "Collecting unused data", "Excessive dashboards"],
              impact: "Directly leads to excess Inventory and Waiting waste.",
            },
          ],
        },
        {
          layout: "split-card",
          title: "Waiting & Non-Utilized Talent",
          cards: [
            {
              letter: "W",
              name: "Waiting",
              color: "yellow",
              definition: "Idle time where work is stalled. Often masked as 'system processing time' or accepted as unavoidable.",
              examples: ["System loading/latency", "Pending approvals", "Stalled workflows", "Waiting for signatures"],
              impact: "Delays directly hinder timely decision-making and operational agility.",
            },
            {
              letter: "N",
              name: "Non-Utilized Talent",
              color: "purple",
              definition: "Failing to harness employee skills or knowledge, often by excluding them from system design.",
              examples: ["Manual work by skilled staff", "Excluding users from UI design", "Lack of tool training", "Ignoring improvement ideas"],
              impact: "Leads to poorly designed systems that generate further waste.",
            },
          ],
        },
        {
          layout: "split-card",
          title: "Transportation & Inventory",
          cards: [
            {
              letter: "T",
              name: "Transportation",
              color: "blue",
              definition: "Unnecessary movement of data. High transportation waste indicates poor system integration.",
              examples: ["Manual data transfer (Excel to ERP)", "Excessive email attachments", "Multiple electronic handoffs", "Hand-carrying paper for signatures"],
              impact: "A direct proxy for measuring system connectivity and integration gaps.",
            },
            {
              letter: "I",
              name: "Inventory",
              color: "teal",
              definition: "Accumulation of excess Work-In-Process (WIP). Digital inventory hides deep systemic problems.",
              examples: ["Unread email backlog", "Unprocessed support tickets", "Obsolete files on server", "Pending approval queues"],
              impact: "The 'Sea of Inventory' masks true cycle time and creates bottlenecks.",
            },
          ],
        },
        {
          layout: "split-card",
          title: "Motion & Extra Processing",
          cards: [
            {
              letter: "M",
              name: "Motion",
              color: "indigo",
              definition: "Unnecessary movement by people (clicks). A direct indicator of poor User Interface (UI) design.",
              examples: ["Excessive clicking/scrolling", "Switching between screens", "Searching for files", "Multiple logins required"],
              impact: "Leads to lost productivity, user frustration, and increased error likelihood.",
            },
            {
              letter: "E",
              name: "Extra Processing",
              color: "pink",
              definition: "Performing work beyond what is required. Often done to compensate for upstream defects.",
              examples: ["Re-entering data across systems", "Unnecessary report formatting", "Redundant approval layers", "Over-engineering solutions"],
              impact: "Stems from lack of confidence in upstream processes.",
            },
          ],
        },
        {
          layout: "emerging",
          title: "Emerging Digital Wastes",
          intro: "The velocity of digital transformation has introduced new categories of waste that specifically undermine strategic agility and innovation.",
          wastes: [
            { icon: "brain", name: "Overthinking", desc: "Analysis paralysis; obsession with perfect data stalling execution", impact: "Stalls innovation and reduces speed-to-market" },
            { icon: "unplug", name: "Integration Waste", desc: "Inefficiencies from disconnected systems requiring manual reconciliation", impact: "Causes pervasive data integrity issues and operational friction" },
            { icon: "trending-down", name: "Innovation Debt", desc: "The opportunity cost of postponing essential digital transformation", impact: "Creates competitive disadvantage and forces manual workarounds" },
            { icon: "package-x", name: "Unused Features", desc: "Paying for software tools or modules that are never adopted", impact: "Purely financial waste with no ROI" },
          ],
        },
        {
          layout: "action",
          title: "Detection & Action",
          subtitle: "From Gemba to Data",
          intro: "While traditional Lean uses 'Gemba Walks' (observation), digital waste requires data-driven diagnostics.",
          steps: [
            { number: "1", title: "Process Mining", desc: "Analyze system event logs to visualize actual process flows and identify bottlenecks" },
            { number: "2", title: "Value Stream Mapping", desc: "Map the end-to-end information flow to highlight non-value-added steps" },
            { number: "3", title: "Standardization", desc: "Implement 'Pull Systems' and error-proofing (Poka-Yoke) to stabilize workflows" },
          ],
        },
        {
          layout: "conclusion",
          title: "Key Takeaways",
          points: [
            "Digital waste is invisible but equally costly as physical waste",
            "Use DOWNTIME to systematically identify waste in your workflows",
            "Technology often digitizes and amplifies existing wastes",
            "Elimination requires data-driven diagnostics and continuous improvement",
            "Foster a culture of Kaizen — small, frequent improvements",
          ],
          cta: "Start identifying waste in your processes today!",
        },
      ],
    },
  },
  "3": {
    id: "3",
    title: "Digital Waste in Modern Workflows",
    type: "article",
    content: {
      body: `
# Digital Waste in Modern Workflows

In today's digital-first work environment, traditional Lean waste concepts have evolved to include new forms of waste unique to digital workflows.

## Integration Waste (IW)
Friction from disconnected systems requiring manual bridges. This includes manual data transfer between systems, re-keying information, and export/import processes.

## Digital Overproduction (DO)
Creating digital artifacts nobody uses, such as unused dashboards, reports nobody reads, and features nobody uses.

## Unused Features (UF)
Software capabilities that go unutilized, including disabled automation, unused integrations, and ignored alerts.

## Excess Data (ED)
Storing or processing more data than needed, like redundant fields, duplicate records, and obsolete data retention.

## Fragmented Workflows (FW)
Broken processes across multiple tools where process steps exist in different systems and information is scattered across platforms.

## Digital Waiting (DW)
Technology-induced delays such as system synchronization delays, batch processing wait times, and API timeout issues.

---

By recognizing these digital-specific wastes alongside traditional DOWNTIME wastes, you can more effectively optimize modern workflows.
      `,
    },
  },
  "4": {
    id: "4",
    title: "Waste Identification Quiz",
    type: "quiz",
    content: {
      questions: [
        {
          id: "q1",
          text: "Which waste type involves waiting for approvals?",
          options: ["Defects", "Waiting", "Motion", "Transportation"],
          correct: "Waiting",
        },
        {
          id: "q2",
          text: "Multiple system handoffs is an example of which waste?",
          options: ["Motion", "Transportation", "Extra Processing", "Inventory"],
          correct: "Transportation",
        },
        {
          id: "q3",
          text: "Unused dashboard features represent which digital waste?",
          options: ["Excess Data", "Unused Features", "Integration Waste", "Fragmented Workflows"],
          correct: "Unused Features",
        },
        {
          id: "q4",
          text: "Manual data transfer between systems is an example of?",
          options: ["Motion", "Defects", "Integration Waste", "Digital Waiting"],
          correct: "Integration Waste",
        },
        {
          id: "q5",
          text: "What does the 'N' in DOWNTIME stand for?",
          options: ["No Value", "Non-utilized Talent", "Negligence", "Notifications"],
          correct: "Non-utilized Talent",
        },
      ],
    },
  },
  // App Overview Guided Walkthrough - Comprehensive Enhanced Slides
  "app-overview": {
    id: "app-overview",
    title: "ProcessOpt App Overview (Guided Walkthrough)",
    type: "slides",
    content: {
      slides: [
        // SLIDE 1: Title
        {
          layout: "title",
          title: "ProcessOpt",
          subtitle: "AI-Powered Lean Process Optimization",
          tagline: "Identify waste • Quantify impact • Design the future state",
        },
        // SLIDE 2: What is ProcessOpt
        {
          layout: "context",
          title: "What is ProcessOpt?",
          intro: "ProcessOpt is an AI-powered platform that helps organizations identify waste in their workflows and design optimized future states using Lean methodology.",
          bullets: [
            { icon: "target", label: "Find Hidden Waste", text: "Structured waste walks with the TIMWOODS framework uncover the 40% of work time lost to invisible process friction" },
            { icon: "brain", label: "AI-Powered Analysis", text: "Machine learning synthesizes team observations to surface root causes and generate prioritized recommendations" },
            { icon: "rocket", label: "Design Future States", text: "Transform scattered insights into actionable roadmaps with side-by-side current vs. future state visualization" },
          ],
        },
        // SLIDE 3: The TIMWOODS Framework
        {
          layout: "overview",
          title: "The 8 Wastes: TIMWOODS",
          subtitle: "The foundation of Lean waste identification",
          intro: "TIMWOODS is a mnemonic for the 8 types of process waste. Master these to spot inefficiencies hiding in plain sight.",
          items: [
            { icon: "unplug", name: "Transportation", description: "Unnecessary movement of materials or information (email chains, file transfers)" },
            { icon: "package-x", name: "Inventory", description: "Excess work-in-progress, backlogs, or queued requests waiting to be processed" },
            { icon: "trending-down", name: "Motion", description: "Unnecessary movement of people (walking to printers, searching through folders)" },
            { icon: "eye-off", name: "Waiting", description: "Idle time and delays from approval bottlenecks, system loading, or handoff gaps" },
          ],
        },
        // SLIDE 4: TIMWOODS continued
        {
          layout: "overview",
          title: "The 8 Wastes: TIMWOODS (cont.)",
          subtitle: "The remaining four waste types",
          intro: "These wastes often hide in knowledge work and digital processes—they're less visible but equally impactful.",
          items: [
            { icon: "factory", name: "Overproduction", description: "Producing more than needed: unused reports, extra copies, features nobody uses" },
            { icon: "zap", name: "Overprocessing", description: "Doing more work than required: excessive approvals, over-documentation, redundant checks" },
            { icon: "alert", name: "Defects", description: "Errors requiring rework or correction: data entry mistakes, returns, failed handoffs" },
            { icon: "brain", name: "Skills Underutilization", description: "Not leveraging employee capabilities: manual tasks that could be automated, siloed expertise" },
          ],
        },
        // SLIDE 5: The ProcessOpt Methodology
        {
          layout: "journey",
          title: "The ProcessOpt Methodology",
          intro: "A structured four-phase approach takes you from training through to optimized process design. Each phase builds on the previous.",
          phases: [
            { number: "1", icon: "graduation-cap", name: "Learn", desc: "Complete training modules on waste identification and the TIMWOODS framework", color: "gold" },
            { number: "2", icon: "git-branch", name: "Define", desc: "Create visual workflow maps with swimlanes, steps, and context for AI", color: "navy" },
            { number: "3", icon: "users", name: "Analyze", desc: "Run collaborative waste walk sessions to capture observations", color: "emerald" },
            { number: "4", icon: "sparkles", name: "Optimize", desc: "Use Future State Studio for AI synthesis and process redesign", color: "gold" },
          ],
        },
        // SLIDE 6: User Roles
        {
          layout: "context",
          title: "User Roles & Permissions",
          intro: "ProcessOpt supports three user roles, each with specific capabilities to support your organization's improvement efforts.",
          bullets: [
            { icon: "users", label: "Participant", text: "Join sessions, tag waste observations, complete training modules, and contribute insights during waste walks" },
            { icon: "clipboard-list", label: "Facilitator", text: "All Participant permissions plus create/manage sessions and workflows, view analytics, and guide teams" },
            { icon: "lightbulb", label: "Admin", text: "Full access including user management, organization settings, waste type configuration, and training content" },
          ],
        },
        // SLIDE 7: Training Module Deep Dive
        {
          layout: "split-card",
          title: "Training Module",
          description: "The Training Hub ensures all team members understand waste identification methodology before conducting waste walks.",
          wasteExample: {
            title: "Training Structure",
            color: "gold",
            items: [
              { icon: "graduation-cap", label: "Getting Started", text: "Introduction to Lean, 8 Wastes Overview, Using ProcessOpt" },
              { icon: "target", label: "Deep Dive Modules", text: "Individual waste type courses with examples and scenarios" },
              { icon: "zap", label: "Assessments", text: "Knowledge quizzes with immediate feedback and retry options" },
              { icon: "lightbulb", label: "Cheat Sheet", text: "Printable quick-reference guide for use during waste walks" },
            ],
          },
        },
        // SLIDE 8: Workflow Builder Deep Dive
        {
          layout: "split-card",
          title: "Workflow Builder",
          description: "Define the processes you want to analyze. A workflow is the foundation for all waste identification activities.",
          wasteExample: {
            title: "Key Capabilities",
            color: "navy",
            items: [
              { icon: "git-branch", label: "Swimlane Diagrams", text: "Add horizontal lanes for departments (Customer, Sales, Finance, etc.)" },
              { icon: "target", label: "Process Steps", text: "Define actions with drag-and-drop positioning and connection arrows" },
              { icon: "brain", label: "Context Drawer", text: "Add stakeholders, systems, metrics, and overview for AI understanding" },
              { icon: "sparkles", label: "AI Quick Fill", text: "Enter a description and let AI generate structured context automatically" },
            ],
          },
        },
        // SLIDE 9: Waste Walk Sessions Deep Dive
        {
          layout: "split-card",
          title: "Waste Walk Sessions",
          description: "Sessions are collaborative activities where teams systematically identify waste in a workflow with real-time observation capture.",
          wasteExample: {
            title: "Session Features",
            color: "emerald",
            items: [
              { icon: "users", label: "Real-Time Collaboration", text: "See participant activity with live presence indicators and activity feed" },
              { icon: "target", label: "Heatmap Overlay", text: "Visual intensity map shows waste concentration: green (low) to red (critical)" },
              { icon: "clipboard-list", label: "Structured Observations", text: "Capture notes, waste types, priority (1-10), and attach photo evidence" },
              { icon: "zap", label: "Session Controls", text: "Pause, end, reopen, or archive sessions as your waste walk progresses" },
            ],
          },
        },
        // SLIDE 10: Future State Studio Overview
        {
          layout: "context",
          title: "Future State Studio",
          intro: "Transform waste walk observations into an optimized future state design using a structured 6-stage AI-powered workflow.",
          bullets: [
            { icon: "sparkles", label: "AI Synthesis", text: "The AI analyzes all observations, groups them into themes, and identifies root cause hypotheses for each pattern" },
            { icon: "lightbulb", label: "Solution Generation", text: "Generate actionable solutions categorized as Eliminate, Modify, or Create—each linked to specific themes" },
            { icon: "rocket", label: "Roadmap & Design", text: "Sequence solutions into implementation waves and visualize the redesigned process with change annotations" },
          ],
        },
        // SLIDE 11: The 6 Stages of Future State
        {
          layout: "overview",
          title: "The 6 Stages of Future State",
          subtitle: "From observations to implementation-ready design",
          intro: "Each stage builds on the previous, transforming raw observations into a comprehensive improvement plan.",
          items: [
            { icon: "sparkles", name: "1. Synthesis Hub", description: "AI groups observations into themes with root cause hypotheses. Confirm, reject, or edit each theme." },
            { icon: "lightbulb", name: "2. Solution Builder", description: "Generate solutions (Eliminate/Modify/Create) linked to confirmed themes. Accept or reject each proposal." },
            { icon: "clipboard-list", name: "3. Roadmap Builder", description: "Sequence accepted solutions into implementation waves based on dependencies and complexity." },
            { icon: "git-branch", name: "4. Designer", description: "Visualize the redesigned process with Keep/Modify/Remove/New annotations on each step." },
          ],
        },
        // SLIDE 12: Future State Stages continued
        {
          layout: "context",
          title: "Future State Studio (cont.)",
          intro: "The final stages help you compare, validate, and export your work for stakeholder communication.",
          bullets: [
            { icon: "target", label: "5. Compare View", text: "Side-by-side visualization of current vs. future state with change highlighting and summary statistics" },
            { icon: "rocket", label: "6. Export Panel", text: "Generate PowerPoint presentations, PDF reports, or JSON data exports for stakeholders and integrations" },
            { icon: "brain", label: "Step Design Panel", text: "Click any future step to open AI-guided design: answer questions, review options, and refine specifications" },
          ],
        },
        // SLIDE 13: Writing Good Observations
        {
          layout: "emerging",
          title: "Writing Quality Observations",
          subtitle: "The quality of your observations directly impacts AI analysis",
          impact: "Good observations are specific, measurable, and include context about frequency, duration, and downstream effects.",
          examples: [
            { label: "Good ✓", text: "Invoice approval takes 3 days because it requires 2 manager signatures for amounts over $500, creating a bottleneck when managers are unavailable." },
            { label: "Bad ✗", text: "Slow approval" },
            { label: "Good ✓", text: "Customer service reps manually re-enter order data into 3 separate systems, averaging 4 minutes per order with a 12% error rate." },
            { label: "Bad ✗", text: "Too much data entry" },
          ],
        },
        // SLIDE 14: Heatmap & Priority Scoring
        {
          layout: "overview",
          title: "Understanding the Heatmap",
          subtitle: "Priority scores drive visual waste intensity",
          intro: "The heatmap overlay on workflow steps shows waste concentration based on observation priority scores. Use this to identify hotspots.",
          items: [
            { icon: "target", name: "Green (1-3)", description: "Low waste concentration. Monitor for changes but not urgent action required." },
            { icon: "lightbulb", name: "Yellow (4-6)", description: "Medium waste. Investigate further and consider for improvement backlog." },
            { icon: "zap", name: "Orange (7-8)", description: "High waste. Prioritize for near-term action in your improvement plan." },
            { icon: "alert", name: "Red (9-10)", description: "Critical waste. Urgent attention required—significant impact on operations." },
          ],
        },
        // SLIDE 15: Hands-On Lab
        {
          layout: "hands-on",
          title: "Hands-On Lab",
          subtitle: "Build Your First Complete Cycle",
          intro: "Practice the full ProcessOpt workflow by creating a demo 'Request → Approve → Fulfill' process.",
          labSteps: [
            { step: "1", action: "Create Workflow", detail: "Go to Workflows → New Workflow. Name it 'Demo: Request to Fulfillment' and add 3 swimlanes: Requester, Approver, Operations" },
            { step: "2", action: "Add 10 Process Steps", detail: "Submit Request → Validate Data → Clarify Details → Log Request → Review Requirements → Approve/Reject → Notify Requester → Fulfill Order → Confirm Delivery → Close Ticket" },
            { step: "3", action: "Add Context", detail: "Open the Context Drawer (📋). Add stakeholders, systems used (email, ticketing system), and metrics (current cycle time: 5 days)" },
            { step: "4", action: "Start Waste Walk", detail: "Click 'Start Session' from the workflow. Invite a colleague or work solo to log observations." },
            { step: "5", action: "Log 5 Observations", detail: "Examples: Waiting between Submit and Validate (2 days); Manual re-entry in Log step (Defects); Multiple approval layers (Overprocessing)" },
            { step: "6", action: "Run AI Synthesis", detail: "Open Future State Studio → Run Synthesis → Review themes → Confirm valid themes → Generate Solutions" },
          ],
        },
        // SLIDE 16: Best Practices for Facilitators
        {
          layout: "context",
          title: "Best Practices: Facilitators",
          intro: "As a session facilitator, your preparation and guidance directly impact the quality of waste identification.",
          bullets: [
            { icon: "clipboard-list", label: "Prepare Thoroughly", text: "Ensure workflow is complete and accurate. Add rich context for AI. Invite all relevant stakeholders before the session." },
            { icon: "users", label: "Guide the Session", text: "Encourage all participants to contribute. Ask probing questions. Document specific examples, not generalities." },
            { icon: "target", label: "Quality Over Quantity", text: "Focus on detailed, actionable observations. Include impact statements: how does this waste affect customers or employees?" },
          ],
        },
        // SLIDE 17: Best Practices for Participants
        {
          layout: "context",
          title: "Best Practices: Participants",
          intro: "Participants drive the waste walk's success. Come prepared and observe objectively for the best results.",
          bullets: [
            { icon: "graduation-cap", label: "Come Prepared", text: "Complete training modules first. Review the waste cheat sheet. Understand the process being analyzed before the session." },
            { icon: "target", label: "Observe Objectively", text: "Focus on the process, not people. Look for systemic issues. Consider upstream and downstream effects of waste." },
            { icon: "lightbulb", label: "Provide Context", text: "Explain why something is wasteful. Include frequency and duration. Note any workarounds currently being used." },
          ],
        },
        // SLIDE 18: Quick Start Summary
        {
          layout: "action",
          title: "Your 30-Minute Quick Start",
          subtitle: "Get results in your first session",
          intro: "Follow these four steps to complete a full optimization cycle and see immediate value from ProcessOpt.",
          steps: [
            { number: "1", title: "Pick a Process", desc: "Choose a frustrating, repetitive process your team knows well. Start with 5-15 steps across 2-4 swimlanes." },
            { number: "2", title: "Map & Add Context", desc: "Create the workflow with accurate steps. Use the Context Drawer to add stakeholders, systems, and current metrics." },
            { number: "3", title: "Walk & Observe", desc: "Spend 20 minutes with your team logging observations. Tag waste types and rate priority. Aim for 5-10 quality observations." },
            { number: "4", title: "Synthesize & Design", desc: "Run AI synthesis to find patterns. Confirm themes, generate solutions, and visualize your future state design." },
          ],
        },
        // SLIDE 19: Conclusion
        {
          layout: "conclusion",
          title: "You're Ready to Optimize!",
          points: [
            "ProcessOpt implements Lean methodology with AI-powered analysis",
            "The 8 wastes (TIMWOODS) are your framework for finding hidden inefficiencies",
            "Follow the flow: Learn → Define → Analyze → Optimize",
            "Quality observations lead to better AI insights and actionable solutions",
            "Start small: one process, one team, one improvement—then scale",
            "Continuous improvement compounds: small wins lead to big transformations",
          ],
          cta: "Head to the Workflows module and create your first process map!",
        },
      ],
    },
  },
};

// Format time in MM:SS
function formatTime(seconds: number): string {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function TrainingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const moduleId = params.id as string;

  // Database content state
  const [dbContent, setDbContent] = useState<TrainingContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch content from database
  useEffect(() => {
    const loadContent = async () => {
      try {
        setIsLoading(true);
        const content = await getTrainingContentById(moduleId);
        setDbContent(content);
      } catch (error) {
        console.error("Failed to load training content:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadContent();
  }, [moduleId]);

  // Merge database content with hardcoded data for complex slides
  const trainingModule = useMemo(() => {
    if (!dbContent) return null;
    
    // For slides with complex layouts (module 2), use hardcoded slide content
    // but use database for title and other metadata
    // NOTE: training routes now use Supabase UUID ids, while `trainingData` is keyed by
    // legacy numeric ids ("1", "2", ...). Match by title/type to find the rich deck.
    const hardcodedData =
      trainingData[moduleId as keyof typeof trainingData] ??
      (Object.values(trainingData).find(
        (m) => m.title === dbContent.title && m.type === dbContent.type
      ) as (typeof trainingData)[keyof typeof trainingData] | undefined);

    if (dbContent.type === "slides" && hardcodedData?.type === "slides") {
      return {
        id: dbContent.id,
        title: dbContent.title,
        type: dbContent.type,
        content: hardcodedData.content, // Use hardcoded complex slides
      };
    }
    
    // For video, article, quiz - use database content
    // Normalize JSONB content (Supabase returns object, but keep a safe fallback)
    let content: unknown = dbContent.content;
    if (typeof content === "string") {
      try {
        content = JSON.parse(content);
      } catch {
        // leave as-is
      }
    }
    
    // Handle video URLs - convert relative paths to full Supabase Storage URLs
    if (dbContent.type === "video" && typeof content === "object" && content !== null) {
      const videoContent = { ...(content as { videoUrl?: string; transcript?: string }) };
      if (videoContent.videoUrl && !videoContent.videoUrl.startsWith("http")) {
        // Convert relative path to full Supabase Storage URL
        const relativePath = videoContent.videoUrl.startsWith("/") 
          ? videoContent.videoUrl.slice(1) 
          : videoContent.videoUrl;
        videoContent.videoUrl = `${SUPABASE_STORAGE_URL}/${relativePath}`;
      }
      content = videoContent;
    }
    
    return {
      id: dbContent.id,
      title: dbContent.title,
      type: dbContent.type,
      content,
    };
  }, [dbContent, moduleId]);

  // Video state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);

  // Slides state
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

  // Check if this is a PDF deck (don't access slides array for PDF decks)
  const isPdfDeckForProgress = trainingModule?.type === "slides" && 
    (trainingModule.content as PdfDeckContent)?.deckType === "pdf";
  
  // Get total slides for progress calculation (only for enhanced slides, not PDF decks)
  const slidesForProgress = trainingModule?.type === "slides" && !isPdfDeckForProgress
    ? ((trainingModule.content as unknown) as { slides: EnhancedSlide[] })?.slides ?? []
    : [];
  const totalSlidesForProgress = slidesForProgress.length;

  // Load saved slide position on mount
  useEffect(() => {
    if (trainingModule?.type === "slides" && typeof window !== "undefined") {
      const stored = localStorage.getItem(`training_progress_${moduleId}`);
      if (stored) {
        const { currentSlide: savedSlide } = JSON.parse(stored);
        if (savedSlide !== undefined && savedSlide < totalSlidesForProgress) {
          setCurrentSlide(savedSlide);
        }
      }
    }
  }, [moduleId, trainingModule?.type, totalSlidesForProgress]);

  // Save slide progress to localStorage
  useEffect(() => {
    if (trainingModule?.type === "slides" && totalSlidesForProgress > 0 && typeof window !== "undefined") {
      const progressPercent = Math.round(((currentSlide + 1) / totalSlidesForProgress) * 100);
      const isCompleted = currentSlide === totalSlidesForProgress - 1;
      localStorage.setItem(`training_progress_${moduleId}`, JSON.stringify({
        currentSlide,
        progress: progressPercent,
        completed: isCompleted,
        lastUpdated: new Date().toISOString(),
      }));
    }
  }, [currentSlide, moduleId, totalSlidesForProgress, trainingModule?.type]);
  const [showResults, setShowResults] = useState(false);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setIsVideoEnded(true);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [trainingModule?.type]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      try {
        setVideoLoadError(null);
        await video.play();
      } catch (err) {
        console.error("Video play failed:", err, {
          src: video.currentSrc || video.src,
          error: video.error,
          readyState: video.readyState,
          networkState: video.networkState,
        });
        setVideoLoadError("Video failed to start. Please try again.");
        toast({
          variant: "destructive",
          title: "Video error",
          description:
            "The video couldn't start. This is usually a loading/format issue—try Refresh. If it persists, we can inspect the exact browser error code.",
        });
      }
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = value[0];
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };

  const restartVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    setIsVideoEnded(false);
    void togglePlay();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Loading..." />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
        </div>
      </div>
    );
  }

  if (!trainingModule) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Module Not Found" />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">
                This training module could not be found.
              </p>
              <Button asChild>
                <Link href="/training">Back to Training</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Determine if this is a PDF deck or enhanced slides
  const isPdfDeck = trainingModule.type === "slides" && 
    (trainingModule.content as PdfDeckContent)?.deckType === "pdf";
  
  const pdfDeckContent = isPdfDeck 
    ? (trainingModule.content as PdfDeckContent) 
    : null;
  
  const slides = trainingModule.type === "slides" && !isPdfDeck
    ? ((trainingModule.content as unknown) as EnhancedDeckContent).slides 
    : [];
  const questions = trainingModule.type === "quiz" 
    ? ((trainingModule.content as unknown) as { questions: { id: string; text: string; options: string[]; correct: string }[] }).questions 
    : [];
  const totalSlides = slides.length;
  const progress = trainingModule.type === "slides" && !isPdfDeck ? ((currentSlide + 1) / totalSlides) * 100 : 0;
  const currentSlideData = slides[currentSlide] as EnhancedSlide | undefined;

  const handleQuizSubmit = async () => {
    setShowResults(true);
    const score = calculateScore();
    try {
      await markTrainingComplete(moduleId, score);
      toast({
        title: "Quiz completed",
        description: `You scored ${score}%. Your progress has been saved.`,
      });
    } catch (error) {
      console.error("Failed to save quiz progress:", error);
    }
  };

  const handleMarkComplete = async () => {
    try {
      await markTrainingComplete(moduleId);
      toast({
        title: "Module completed",
        description: "Your progress has been saved.",
      });
      router.push("/training");
    } catch (error) {
      console.error("Failed to save progress:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save progress.",
      });
    }
  };

  const calculateScore = () => {
    if (trainingModule.type !== "quiz") return 0;
    let correct = 0;
    questions.forEach((q: { id: string; correct: string }) => {
      if (quizAnswers[q.id] === q.correct) correct++;
    });
    return Math.round((correct / questions.length) * 100);
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title={trainingModule.title}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/training/cheat-sheet">
                <BookOpen className="mr-2 h-4 w-4" />
                Cheat Sheet
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/training">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 overflow-auto">
        {/* Video Content */}
        {trainingModule.type === "video" && (
          <Card className="max-w-4xl mx-auto overflow-hidden">
            <CardContent className="p-0">
              <div className="relative aspect-video bg-black rounded-t-lg overflow-hidden group">
                {/* Video Element */}
                <video
                  ref={videoRef}
                  src={((trainingModule.content as unknown) as { videoUrl: string }).videoUrl}
                  className="w-full h-full object-contain"
                  playsInline
                  preload="metadata"
                  crossOrigin="anonymous"
                  onClick={togglePlay}
                  onError={() => {
                    const video = videoRef.current;
                    console.error("Video element error:", {
                      src: video?.currentSrc || video?.src,
                      error: video?.error,
                      readyState: video?.readyState,
                      networkState: video?.networkState,
                    });
                    setVideoLoadError("Video failed to load.");
                    toast({
                      variant: "destructive",
                      title: "Video failed to load",
                      description:
                        "We couldn't load the video stream. This is usually a URL/permission/codec issue.",
                    });
                  }}
                />

                {/* Play overlay when paused/ended */}
                {(!isPlaying || isVideoEnded) && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
                    onClick={isVideoEnded ? restartVideo : togglePlay}
                  >
                    <div className="bg-brand-gold/90 rounded-full p-6 hover:bg-brand-gold transition-colors">
                      {isVideoEnded ? (
                        <RotateCcw className="h-12 w-12 text-brand-navy" />
                      ) : (
                        <Play className="h-12 w-12 text-brand-navy ml-1" />
                      )}
                    </div>
                  </div>
                )}

                {/* Video Controls - show on hover or when paused */}
                <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-12 transition-opacity duration-300 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                  {videoLoadError && (
                    <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                      {videoLoadError}{" "}
                      <button
                        type="button"
                        className="underline underline-offset-2"
                        onClick={() => {
                          const video = videoRef.current;
                          if (video) {
                            // force reload
                            video.load();
                          }
                        }}
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  {/* Progress bar */}
                  <div className="mb-3">
                    <Slider
                      value={[currentTime]}
                      max={duration || 100}
                      step={0.1}
                      onValueChange={handleSeek}
                      className="cursor-pointer [&_[role=slider]]:bg-brand-gold [&_[role=slider]]:border-brand-gold [&_.bg-primary]:bg-brand-gold"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Play/Pause */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 h-8 w-8"
                      onClick={togglePlay}
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                    </Button>

                    {/* Volume */}
                    <div className="flex items-center gap-2 group/volume">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20 h-8 w-8"
                        onClick={toggleMute}
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="h-5 w-5" />
                        ) : (
                          <Volume2 className="h-5 w-5" />
                        )}
                      </Button>
                      <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-200">
                        <Slider
                          value={[isMuted ? 0 : volume]}
                          max={1}
                          step={0.01}
                          onValueChange={handleVolumeChange}
                          className="cursor-pointer [&_[role=slider]]:bg-white [&_[role=slider]]:border-white [&_.bg-primary]:bg-white"
                        />
                      </div>
                    </div>

                    {/* Time display */}
                    <span className="text-white text-sm font-mono flex-1">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>

                    {/* Fullscreen */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 h-8 w-8"
                      onClick={toggleFullscreen}
                    >
                      <Maximize className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Video info and actions */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">About This Video</h2>
                  {isVideoEnded && (
                    <Button
                      className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                      onClick={handleMarkComplete}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark as Complete
                    </Button>
                  )}
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {((trainingModule.content as unknown) as { transcript: string }).transcript}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PDF Slide Deck Content */}
        {trainingModule.type === "slides" && isPdfDeck && pdfDeckContent && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="grid lg:grid-cols-[1fr,350px] gap-6 h-[calc(100vh-14rem)]">
              {/* PDF Viewer */}
              <div className="bg-white rounded-xl border overflow-hidden">
                <PdfSlideDeck
                  pdfUrls={pdfDeckContent.pdfUrls}
                  title={pdfDeckContent.title}
                  onComplete={handleMarkComplete}
                />
              </div>
              
              {/* Lab Instructions Panel (if available) */}
              {pdfDeckContent.lab && (
                <div className="overflow-auto">
                  <LabInstructionsPanel lab={pdfDeckContent.lab} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Slides Content (legacy/curated decks) */}
        {trainingModule.type === "slides" && !isPdfDeck && currentSlideData && (
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Slide {currentSlide + 1} of {totalSlides}
              </span>
              <Progress value={progress} className="w-48 h-2" />
            </div>

            {/* Title Slide */}
            {currentSlideData.layout === "title" && (
              <Card className="min-h-[450px] bg-gradient-to-br from-brand-navy to-brand-navy/90 text-white overflow-hidden">
                <CardContent className="flex flex-col items-center justify-center h-full py-16 text-center relative">
                  <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-10 left-10 w-32 h-32 border border-white rounded-full" />
                    <div className="absolute bottom-20 right-20 w-48 h-48 border border-white rounded-full" />
                    <div className="absolute top-1/2 left-1/4 w-24 h-24 border border-white rounded-full" />
                  </div>
                  <h1 className="text-5xl font-bold mb-4">{currentSlideData.title}</h1>
                  <div className="w-24 h-1 bg-brand-gold rounded mb-6" />
                  <p className="text-2xl text-white/90 mb-2">{(currentSlideData as TitleSlide).subtitle}</p>
                  <p className="text-lg text-brand-gold">{(currentSlideData as TitleSlide).tagline}</p>
                </CardContent>
              </Card>
            )}

            {/* Context Slide */}
            {currentSlideData.layout === "context" && (
              <Card className="min-h-[450px]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-3xl text-brand-navy">{currentSlideData.title}</CardTitle>
                  <CardDescription className="text-base mt-2">
                    {(currentSlideData as ContextSlide).intro}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {(currentSlideData as ContextSlide).bullets.map((bullet, idx) => {
                    const IconComponent = iconMap[bullet.icon] || AlertTriangle;
                    return (
                      <div key={idx} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border border-border/50">
                        <div className="p-2 rounded-lg bg-brand-gold/10">
                          <IconComponent className="h-6 w-6 text-brand-gold" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-brand-navy">{bullet.label}</h4>
                          <p className="text-muted-foreground">{bullet.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Overview Slide */}
            {currentSlideData.layout === "overview" && (() => {
              const overviewData = currentSlideData as OverviewSlide;
              const hasColumns = overviewData.columns && overviewData.columns.length > 0;
              const hasItems = overviewData.items && overviewData.items.length > 0;
              
              return (
                <Card className="min-h-[450px] bg-gradient-to-br from-brand-platinum/50 to-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-3xl text-brand-navy">{currentSlideData.title}</CardTitle>
                    {overviewData.subtitle && (
                      <p className="text-lg font-medium text-brand-gold">{overviewData.subtitle}</p>
                    )}
                    <CardDescription className="text-base mt-2 text-brand-charcoal">
                      {overviewData.intro}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {/* Original columns format (DOWNTIME slide 2) */}
                    {hasColumns && (
                      <div className="grid md:grid-cols-2 gap-6">
                        {overviewData.columns!.map((column, colIdx) => (
                          <div key={colIdx} className="space-y-3">
                            <h3 className="text-xl font-bold text-brand-gold border-b-2 border-brand-gold pb-2">
                              {column.header}
                            </h3>
                            <div className="space-y-2">
                              {column.items.map((item, itemIdx) => (
                                <div key={itemIdx} className="flex items-center gap-3 p-3 rounded-lg bg-white hover:bg-brand-gold/5 border border-brand-gold/10 transition-colors">
                                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-navy text-white font-bold text-lg">
                                    {item.letter}
                                  </span>
                                  <div>
                                    <p className="font-semibold text-brand-charcoal">{item.name}</p>
                                    <p className="text-sm text-brand-charcoal/70">{item.desc}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* New items format (TIMWOODS slides) */}
                    {hasItems && (
                      <div className="grid md:grid-cols-2 gap-4">
                        {overviewData.items!.map((item, idx) => {
                          const IconComponent = iconMap[item.icon] || Target;
                          return (
                            <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-white border border-brand-gold/20 hover:border-brand-gold/40 hover:shadow-md transition-all">
                              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-brand-navy shrink-0">
                                <IconComponent className="h-6 w-6 text-brand-gold" />
                              </div>
                              <div>
                                <h4 className="font-bold text-brand-navy text-lg">{item.name}</h4>
                                <p className="text-sm text-brand-charcoal/80 mt-1 leading-relaxed">{item.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Split Card Slide */}
            {currentSlideData.layout === "split-card" && (() => {
              const splitData = currentSlideData as SplitCardSlide;
              const hasCards = splitData.cards && splitData.cards.length > 0;
              const hasWasteExample = splitData.wasteExample;
              
              return (
                <Card className="min-h-[450px] bg-gradient-to-br from-brand-platinum/50 to-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-3xl text-brand-navy">{currentSlideData.title}</CardTitle>
                    {splitData.description && (
                      <CardDescription className="text-base mt-2 text-brand-charcoal">
                        {splitData.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-4">
                    {/* Original cards format (DOWNTIME slides) */}
                    {hasCards && (
                      <div className="grid md:grid-cols-2 gap-6">
                        {splitData.cards!.map((card, cardIdx) => (
                          <div key={cardIdx} className="rounded-xl border-2 overflow-hidden bg-card">
                            <div className={`p-4 ${wasteColors[card.color] || wasteColors.gold} border-b`}>
                              <div className="flex items-center gap-3">
                                <span className="flex items-center justify-center w-12 h-12 rounded-full bg-white/80 font-bold text-2xl">
                                  {card.letter}
                                </span>
                                <h3 className="text-xl font-bold">{card.name}</h3>
                              </div>
                            </div>
                            <div className="p-4 space-y-4">
                              <p className="text-sm leading-relaxed">{card.definition}</p>
                              <div>
                                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Digital Examples</h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {card.examples.map((example, exIdx) => (
                                    <Badge key={exIdx} variant="secondary" className="text-xs">
                                      {example}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="pt-2 border-t">
                                <p className="text-xs text-muted-foreground italic">
                                  <span className="font-semibold text-brand-charcoal">Impact:</span> {card.impact}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* New wasteExample format (feature deep-dive slides) */}
                    {hasWasteExample && (
                      <div className="space-y-4">
                        <div className={`p-4 rounded-xl border-2 ${featureColors[splitData.wasteExample!.color]?.border || 'border-brand-gold/30'} ${featureColors[splitData.wasteExample!.color]?.bg || 'from-brand-gold/10 to-brand-gold/5'} bg-gradient-to-br`}>
                          <h3 className="text-lg font-bold text-brand-navy mb-4">{splitData.wasteExample!.title}</h3>
                          <div className="grid md:grid-cols-2 gap-3">
                            {splitData.wasteExample!.items.map((item, idx) => {
                              const IconComponent = iconMap[item.icon] || Target;
                              return (
                                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-white/80 border border-white">
                                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-navy shrink-0">
                                    <IconComponent className="h-5 w-5 text-brand-gold" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-brand-navy">{item.label}</h4>
                                    <p className="text-sm text-brand-charcoal/80">{item.text}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Emerging Wastes Slide */}
            {currentSlideData.layout === "emerging" && (() => {
              const emergingData = currentSlideData as EmergingSlide;
              const hasWastes = emergingData.wastes && emergingData.wastes.length > 0;
              const hasExamples = emergingData.examples && emergingData.examples.length > 0;
              
              return (
                <Card className="min-h-[450px] bg-gradient-to-br from-brand-platinum/50 to-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-3xl text-brand-navy">{currentSlideData.title}</CardTitle>
                    {emergingData.subtitle && (
                      <p className="text-lg font-medium text-brand-gold">{emergingData.subtitle}</p>
                    )}
                    {emergingData.intro && (
                      <CardDescription className="text-base mt-2 text-brand-charcoal">
                        {emergingData.intro}
                      </CardDescription>
                    )}
                    {emergingData.impact && (
                      <p className="text-base mt-2 text-brand-charcoal leading-relaxed">
                        {emergingData.impact}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-4">
                    {/* Original wastes format */}
                    {hasWastes && (
                      <div className="grid md:grid-cols-2 gap-4">
                        {emergingData.wastes!.map((waste, wasteIdx) => {
                          const IconComponent = iconMap[waste.icon] || AlertTriangle;
                          return (
                            <div key={wasteIdx} className="p-4 rounded-xl bg-gradient-to-br from-brand-navy/5 to-brand-navy/10 border border-brand-navy/20">
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-brand-navy/10">
                                  <IconComponent className="h-6 w-6 text-brand-navy" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-bold text-brand-navy">{waste.name}</h4>
                                  <p className="text-sm text-brand-charcoal/80 mt-1">{waste.desc}</p>
                                  <p className="text-xs text-brand-gold mt-2 font-medium">
                                    → {waste.impact}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* New examples format (good/bad observation examples) */}
                    {hasExamples && (
                      <div className="space-y-3">
                        {emergingData.examples!.map((example, idx) => {
                          const isGood = example.label.toLowerCase().includes("good");
                          return (
                            <div key={idx} className={`p-4 rounded-xl border-2 ${isGood ? 'bg-brand-emerald/5 border-brand-emerald/30' : 'bg-brand-charcoal/5 border-brand-charcoal/20'}`}>
                              <span className={`text-sm font-bold ${isGood ? 'text-brand-emerald' : 'text-brand-charcoal'}`}>
                                {example.label}
                              </span>
                              <p className="text-brand-charcoal mt-1 leading-relaxed">{example.text}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Action Slide */}
            {currentSlideData.layout === "action" && (
              <Card className="min-h-[450px]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-3xl text-brand-navy">{currentSlideData.title}</CardTitle>
                  <CardDescription className="text-lg text-brand-gold font-medium">
                    {(currentSlideData as ActionSlide).subtitle}
                  </CardDescription>
                  <p className="text-base text-muted-foreground mt-2">
                    {(currentSlideData as ActionSlide).intro}
                  </p>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {(currentSlideData as ActionSlide).steps.map((step, stepIdx) => (
                      <div key={stepIdx} className="flex items-start gap-4 p-5 rounded-xl bg-muted/30 border border-border/50 hover:border-brand-gold/50 transition-colors">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-brand-gold text-brand-navy font-bold text-xl shrink-0">
                          {step.number}
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-brand-navy">{step.title}</h4>
                          <p className="text-muted-foreground mt-1">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Conclusion Slide */}
            {currentSlideData.layout === "conclusion" && (
              <Card className="min-h-[450px] bg-gradient-to-br from-brand-platinum to-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-3xl text-brand-navy">{currentSlideData.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-6">
                  <div className="space-y-3">
                    {(currentSlideData as ConclusionSlide).points.map((point, pointIdx) => (
                      <div key={pointIdx} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-brand-gold/20">
                        <CheckCircle className="h-5 w-5 text-brand-emerald shrink-0" />
                        <p className="text-brand-charcoal">{point}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-6 rounded-xl bg-brand-gold/10 border-2 border-brand-gold/30 text-center">
                    <Lightbulb className="h-8 w-8 text-brand-gold mx-auto mb-2" />
                    <p className="text-xl font-bold text-brand-navy">
                      {(currentSlideData as ConclusionSlide).cta}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Journey Slide - Horizontal Timeline */}
            {currentSlideData.layout === "journey" && (
              <Card className="min-h-[450px] bg-gradient-to-br from-brand-platinum to-white overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-3xl text-brand-navy">{currentSlideData.title}</CardTitle>
                  <CardDescription className="text-base mt-2 text-brand-charcoal">
                    {(currentSlideData as JourneySlide).intro}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-8">
                  <div className="relative">
                    {/* Connection line - brand gold gradient */}
                    <div className="absolute top-8 left-0 right-0 h-1 bg-gradient-to-r from-brand-gold via-brand-emerald to-brand-navy rounded-full" />
                    
                    <div className="grid grid-cols-4 gap-6 relative">
                      {(currentSlideData as JourneySlide).phases.map((phase, idx) => {
                        const IconComponent = iconMap[phase.icon] || Target;
                        const isGold = phase.color === "gold";
                        return (
                          <div key={idx} className="flex flex-col items-center text-center">
                            <div className={`relative z-10 w-16 h-16 rounded-full ${phaseColors[phase.color] || 'bg-brand-gold'} flex items-center justify-center shadow-lg ring-4 ring-white`}>
                              <IconComponent className={`h-7 w-7 ${isGold ? 'text-brand-navy' : 'text-white'}`} />
                            </div>
                            <div className="mt-4 space-y-1">
                              <span className="text-xs font-bold text-brand-charcoal/60 uppercase tracking-wider">
                                Phase {phase.number}
                              </span>
                              <h4 className="text-lg font-bold text-brand-navy">{phase.name}</h4>
                              <p className="text-sm text-brand-charcoal/80">{phase.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Feature Showcase Slide */}
            {currentSlideData.layout === "feature-showcase" && (() => {
              const slideData = currentSlideData as FeatureShowcaseSlide;
              const colors = featureColors[slideData.color] || featureColors.gold;
              const IconComponent = iconMap[slideData.icon] || Target;
              
              return (
                <Card className={`min-h-[450px] bg-gradient-to-br ${colors.bg} border-2 ${colors.border} overflow-hidden`}>
                  <CardContent className="pt-8 pb-8">
                    <div className="flex flex-col lg:flex-row gap-8 items-center">
                      {/* Icon and Title */}
                      <div className="lg:w-1/3 text-center lg:text-left">
                        <div className={`inline-flex p-6 rounded-2xl bg-white shadow-lg mb-4`}>
                          <IconComponent className={`h-16 w-16 ${colors.icon}`} />
                        </div>
                        <h2 className="text-3xl font-bold text-brand-navy mb-2">{slideData.title}</h2>
                        <p className={`text-lg font-medium ${colors.icon}`}>{slideData.subtitle}</p>
                      </div>
                      
                      {/* Description and Highlights */}
                      <div className="lg:w-2/3 space-y-6">
                        <p className="text-lg text-brand-charcoal leading-relaxed">
                          {slideData.description}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {slideData.highlights.map((highlight, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-white/80 border border-white">
                              <CheckCircle className={`h-5 w-5 ${colors.icon} shrink-0`} />
                              <span className="text-sm font-medium text-brand-charcoal">{highlight}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Hands-On Lab Slide */}
            {currentSlideData.layout === "hands-on" && (
              <Card className="min-h-[450px] bg-gradient-to-br from-brand-gold/10 via-brand-platinum to-white border-2 border-brand-gold/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-brand-gold">
                      <ClipboardList className="h-6 w-6 text-brand-navy" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-brand-navy">{currentSlideData.title}</CardTitle>
                      <p className="text-brand-gold font-semibold">{(currentSlideData as HandsOnSlide).subtitle}</p>
                    </div>
                  </div>
                  <CardDescription className="text-base text-brand-charcoal">
                    {(currentSlideData as HandsOnSlide).intro}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {(currentSlideData as HandsOnSlide).labSteps.map((labStep, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-white border border-brand-gold/20 hover:border-brand-gold/50 hover:shadow-md transition-all">
                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-brand-navy text-brand-gold font-bold text-sm shrink-0 shadow-sm">
                          {labStep.step}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-brand-navy">{labStep.action}</h4>
                          <p className="text-sm text-brand-charcoal/80 mt-1 leading-snug">{labStep.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                disabled={currentSlide === 0}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              {currentSlide === totalSlides - 1 ? (
                <Button
                  className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                  onClick={handleMarkComplete}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete Module
                </Button>
              ) : (
                <Button
                  onClick={() =>
                    setCurrentSlide(Math.min(totalSlides - 1, currentSlide + 1))
                  }
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Article Content */}
        {trainingModule.type === "article" && (
          <Card className="max-w-3xl mx-auto">
            <CardContent className="pt-6 prose prose-gray max-w-none">
              <div
                dangerouslySetInnerHTML={{
                  __html: ((trainingModule.content as unknown) as { body: string }).body.replace(/\n/g, "<br />"),
                }}
              />
              <div className="mt-8 pt-6 border-t">
                <Button
                  className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                  onClick={handleMarkComplete}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Complete
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quiz Content */}
        {trainingModule.type === "quiz" && (
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle>Waste Identification Quiz</CardTitle>
              <CardDescription>
                Test your knowledge of Lean waste types
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {showResults ? (
                <div className="text-center py-8">
                  <div
                    className={`text-6xl font-bold mb-4 ${
                      calculateScore() >= 80
                        ? "text-brand-emerald"
                        : calculateScore() >= 60
                        ? "text-brand-gold"
                        : "text-destructive"
                    }`}
                  >
                    {calculateScore()}%
                  </div>
                  <p className="text-lg mb-6">
                    {calculateScore() >= 80
                      ? "Excellent! You've mastered waste identification!"
                      : calculateScore() >= 60
                      ? "Good job! Review the cheat sheet to improve."
                      : "Keep learning! Review the training materials."}
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button variant="outline" onClick={() => {
                      setQuizAnswers({});
                      setShowResults(false);
                    }}>
                      Retry Quiz
                    </Button>
                    <Button asChild>
                      <Link href="/training">Back to Training</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {questions.map((question: { id: string; text: string; options: string[]; correct: string }, idx: number) => (
                    <div key={question.id} className="space-y-3">
                      <p className="font-medium">
                        {idx + 1}. {question.text}
                      </p>
                      <div className="space-y-2 pl-4">
                        {question.options.map((option: string) => (
                          <label
                            key={option}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              quizAnswers[question.id] === option
                                ? "bg-brand-gold/10 border-brand-gold"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            <input
                              type="radio"
                              name={question.id}
                              value={option}
                              checked={quizAnswers[question.id] === option}
                              onChange={() =>
                                setQuizAnswers({
                                  ...quizAnswers,
                                  [question.id]: option,
                                })
                              }
                              className="accent-brand-gold"
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <Button
                    className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                    onClick={handleQuizSubmit}
                    disabled={Object.keys(quizAnswers).length < questions.length}
                  >
                    Submit Quiz
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

