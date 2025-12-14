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
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { markTrainingComplete, getTrainingContentById } from "@/lib/services/training";
import type { TrainingContent } from "@/types";

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
};

// Color mapping for waste type badges
const wasteColors: Record<string, string> = {
  red: "bg-red-500/10 text-red-600 border-red-500/30",
  orange: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  yellow: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  purple: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  blue: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  teal: "bg-teal-500/10 text-teal-600 border-teal-500/30",
  indigo: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
  pink: "bg-pink-500/10 text-pink-600 border-pink-500/30",
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
  columns: {
    header: string;
    items: { letter: string; name: string; desc: string }[];
  }[];
}

interface SplitCardSlide extends SlideBase {
  layout: "split-card";
  cards: {
    letter: string;
    name: string;
    color: string;
    definition: string;
    examples: string[];
    impact: string;
  }[];
}

interface EmergingSlide extends SlideBase {
  layout: "emerging";
  intro: string;
  wastes: { icon: string; name: string; desc: string; impact: string }[];
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

type EnhancedSlide = TitleSlide | ContextSlide | OverviewSlide | SplitCardSlide | EmergingSlide | ActionSlide | ConclusionSlide;

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

  // Get total slides for progress calculation
  const slidesForProgress = trainingModule?.type === "slides" 
    ? ((trainingModule.content as unknown) as { slides: EnhancedSlide[] }).slides 
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

  const slides = trainingModule.type === "slides" 
    ? ((trainingModule.content as unknown) as { slides: EnhancedSlide[] }).slides 
    : [];
  const questions = trainingModule.type === "quiz" 
    ? ((trainingModule.content as unknown) as { questions: { id: string; text: string; options: string[]; correct: string }[] }).questions 
    : [];
  const totalSlides = slides.length;
  const progress = trainingModule.type === "slides" ? ((currentSlide + 1) / totalSlides) * 100 : 0;
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

        {/* Slides Content */}
        {trainingModule.type === "slides" && currentSlideData && (
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
            {currentSlideData.layout === "overview" && (
              <Card className="min-h-[450px]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-3xl text-brand-navy">{currentSlideData.title}</CardTitle>
                  <CardDescription className="text-base mt-2">
                    {(currentSlideData as OverviewSlide).intro}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    {(currentSlideData as OverviewSlide).columns.map((column, colIdx) => (
                      <div key={colIdx} className="space-y-3">
                        <h3 className="text-xl font-bold text-brand-gold border-b-2 border-brand-gold pb-2">
                          {column.header}
                        </h3>
                        <div className="space-y-2">
                          {column.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-navy text-white font-bold text-lg">
                                {item.letter}
                              </span>
                              <div>
                                <p className="font-semibold text-brand-charcoal">{item.name}</p>
                                <p className="text-sm text-muted-foreground">{item.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Split Card Slide */}
            {currentSlideData.layout === "split-card" && (
              <Card className="min-h-[450px]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-3xl text-brand-navy">{currentSlideData.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    {(currentSlideData as SplitCardSlide).cards.map((card, cardIdx) => (
                      <div key={cardIdx} className="rounded-xl border-2 overflow-hidden bg-card">
                        <div className={`p-4 ${wasteColors[card.color] || wasteColors.blue} border-b`}>
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
                </CardContent>
              </Card>
            )}

            {/* Emerging Wastes Slide */}
            {currentSlideData.layout === "emerging" && (
              <Card className="min-h-[450px]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-3xl text-brand-navy">{currentSlideData.title}</CardTitle>
                  <CardDescription className="text-base mt-2">
                    {(currentSlideData as EmergingSlide).intro}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    {(currentSlideData as EmergingSlide).wastes.map((waste, wasteIdx) => {
                      const IconComponent = iconMap[waste.icon] || AlertTriangle;
                      return (
                        <div key={wasteIdx} className="p-4 rounded-xl bg-gradient-to-br from-brand-navy/5 to-brand-navy/10 border border-brand-navy/20">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-brand-navy/10">
                              <IconComponent className="h-6 w-6 text-brand-navy" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-brand-navy">{waste.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{waste.desc}</p>
                              <p className="text-xs text-brand-gold mt-2 font-medium">
                                → {waste.impact}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

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

