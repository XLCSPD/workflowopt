"use client";

import { useState } from "react";
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
} from "lucide-react";

// Mock training data
const trainingData = {
  "1": {
    id: "1",
    title: "Introduction to Lean Waste",
    type: "video",
    content: {
      videoUrl: "/videos/intro-to-lean.mp4",
      transcript: "Welcome to the introduction to Lean waste identification...",
    },
  },
  "2": {
    id: "2",
    title: "DOWNTIME Wastes Explained",
    type: "slides",
    content: {
      slides: [
        {
          title: "What is DOWNTIME?",
          content:
            "DOWNTIME is an acronym that helps us remember the 8 types of waste in Lean methodology. Each letter represents a specific type of waste that can occur in any process.",
          image: null,
        },
        {
          title: "D - Defects",
          content:
            "Defects are errors or mistakes that require rework. In digital workflows, this includes data entry errors, system bugs, and incorrect file formats.",
          image: null,
        },
        {
          title: "O - Overproduction",
          content:
            "Overproduction means creating more than needed or before needed. Examples include excessive email chains and unnecessary reports.",
          image: null,
        },
        {
          title: "W - Waiting",
          content:
            "Waiting is idle time between process steps. In digital work, this includes system load times, waiting for approvals, and slow application response.",
          image: null,
        },
        {
          title: "N - Non-utilized Talent",
          content:
            "This waste occurs when we don't fully use people's skills. Examples include manual data entry by skilled workers and underused automation.",
          image: null,
        },
        {
          title: "T - Transportation",
          content:
            "Transportation waste is unnecessary movement of materials or information, like multiple system handoffs and email forwarding chains.",
          image: null,
        },
        {
          title: "I - Inventory",
          content:
            "Inventory waste includes excess stock or backlogs such as email backlogs, unprocessed tickets, and pending approval queues.",
          image: null,
        },
        {
          title: "M - Motion",
          content:
            "Motion waste is unnecessary movement of people, including switching between applications and multiple clicks for simple tasks.",
          image: null,
        },
        {
          title: "E - Extra Processing",
          content:
            "Extra processing means doing more than what the customer requires, like multiple approval layers and redundant data validation.",
          image: null,
        },
        {
          title: "Summary",
          content:
            "Remember DOWNTIME: Defects, Overproduction, Waiting, Non-utilized Talent, Transportation, Inventory, Motion, Extra Processing. Use this framework to identify waste in your workflows!",
          image: null,
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

export default function TrainingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.id as string;
  const trainingModule = trainingData[moduleId as keyof typeof trainingData];

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);

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
    ? (trainingModule.content as { slides: { title: string; content: string; image: null }[] }).slides 
    : [];
  const questions = trainingModule.type === "quiz" 
    ? (trainingModule.content as { questions: { id: string; text: string; options: string[]; correct: string }[] }).questions 
    : [];
  const totalSlides = slides.length;
  const progress = trainingModule.type === "slides" ? ((currentSlide + 1) / totalSlides) * 100 : 0;

  const handleQuizSubmit = () => {
    setShowResults(true);
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
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-0">
              <div className="relative aspect-video bg-black rounded-t-lg flex items-center justify-center">
                <div className="text-white text-center">
                  <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-muted">Video player placeholder</p>
                </div>
                {/* Video Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                    </Button>
                    <div className="flex-1">
                      <Progress value={35} className="h-1" />
                    </div>
                    <span className="text-white text-sm">5:15 / 15:00</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20"
                      onClick={() => setIsMuted(!isMuted)}
                    >
                      {isMuted ? (
                        <VolumeX className="h-5 w-5" />
                      ) : (
                        <Volume2 className="h-5 w-5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20"
                    >
                      <Maximize className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-2">Transcript</h2>
                <p className="text-muted-foreground">{(trainingModule.content as { transcript: string }).transcript}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Slides Content */}
        {trainingModule.type === "slides" && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Slide {currentSlide + 1} of {totalSlides}
              </span>
              <Progress value={progress} className="w-48 h-2" />
            </div>

            <Card className="min-h-[400px]">
              <CardHeader>
                <CardTitle className="text-2xl">
                  {slides[currentSlide].title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed">
                  {slides[currentSlide].content}
                </p>
              </CardContent>
            </Card>

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
                  onClick={() => router.push("/training")}
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
                  __html: (trainingModule.content as { body: string }).body.replace(/\n/g, "<br />"),
                }}
              />
              <div className="mt-8 pt-6 border-t">
                <Button
                  className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy"
                  onClick={() => router.push("/training")}
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

