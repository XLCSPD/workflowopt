"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ============================================
// TYPES
// ============================================

export interface ChatMessage {
  id: string;
  role: "ai" | "user";
  content: string;
  timestamp: Date;
  questionId?: string;
  required?: boolean;
  isTyping?: boolean;
}

interface StepDesignChatProps {
  sessionId: string;
  futureStateId: string;
  nodeId: string;
  userId: string;
  nodeName: string;
  initialQuestions?: Array<{
    id: string;
    question: string;
    required: boolean;
    answer?: string;
  }>;
  existingContext?: {
    purpose?: string;
    inputs?: string[];
    outputs?: string[];
    constraints?: string[];
  };
  onContextComplete: () => void;
  onGenerateDesign: () => Promise<void>;
}

// ============================================
// CHAT COMPONENT
// ============================================

export function StepDesignChat({
  sessionId: _sessionId,
  futureStateId: _futureStateId,
  nodeId,
  userId,
  nodeName,
  initialQuestions = [],
  existingContext: _existingContext,
  onContextComplete,
  onGenerateDesign,
}: StepDesignChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [allQuestionsAnswered, setAllQuestionsAnswered] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize chat with first question
  useEffect(() => {
    if (messages.length === 0) {
      const introMessage: ChatMessage = {
        id: "intro",
        role: "ai",
        content: `I'll help you design the "${nodeName}" step. Let me ask a few questions to understand your needs better.`,
        timestamp: new Date(),
      };

      setMessages([introMessage]);

      // Show first question after intro
      if (initialQuestions.length > 0) {
        setTimeout(() => {
          addAIQuestion(0);
        }, 800);
      } else {
        // No questions needed, offer to generate
        setTimeout(() => {
          const readyMessage: ChatMessage = {
            id: "ready",
            role: "ai",
            content: "I have enough context to generate design options. Would you like me to proceed?",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, readyMessage]);
          setAllQuestionsAnswered(true);
        }, 800);
      }
    }
  }, [initialQuestions, nodeName, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input after AI message
  useEffect(() => {
    if (!isProcessing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isProcessing]);

  const addAIQuestion = useCallback((index: number) => {
    if (index >= initialQuestions.length) {
      // All questions answered
      const completeMessage: ChatMessage = {
        id: "complete",
        role: "ai",
        content: "Great! I have all the context I need. Let me generate some design options for you...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, completeMessage]);
      setAllQuestionsAnswered(true);
      onContextComplete();
      return;
    }

    const question = initialQuestions[index];
    
    // Check if this question was already answered
    if (question.answer) {
      // Skip to next question
      setCurrentQuestionIndex(index + 1);
      addAIQuestion(index + 1);
      return;
    }

    // Add typing indicator first
    const typingId = `typing-${index}`;
    setMessages((prev) => [
      ...prev,
      {
        id: typingId,
        role: "ai",
        content: "",
        timestamp: new Date(),
        isTyping: true,
      },
    ]);

    // After a brief delay, replace with actual question
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === typingId
            ? {
                ...m,
                content: question.question,
                questionId: question.id,
                required: question.required,
                isTyping: false,
              }
            : m
        )
      );
      setCurrentQuestionIndex(index);
    }, 600);
  }, [initialQuestions, onContextComplete]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsProcessing(true);

    // Save the answer to the current question
    const currentQuestion = initialQuestions[currentQuestionIndex];
    if (currentQuestion) {
      try {
        await fetch("/api/future-state/step-design/context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nodeId,
            questionId: currentQuestion.id,
            answer: userMessage.content,
            userId,
          }),
        });
      } catch (error) {
        console.error("Error saving answer:", error);
      }
    }

    // Small delay for natural feel
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Move to next question
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < initialQuestions.length) {
      addAIQuestion(nextIndex);
    } else {
      // All questions answered
      const completeMessage: ChatMessage = {
        id: "complete",
        role: "ai",
        content: "Perfect! I now have all the context I need. Generating your design options...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, completeMessage]);
      setAllQuestionsAnswered(true);
      onContextComplete();
      
      // Auto-trigger design generation
      setIsGenerating(true);
      try {
        await onGenerateDesign();
      } finally {
        setIsGenerating(false);
      }
    }

    setIsProcessing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleGenerateClick = async () => {
    setIsGenerating(true);
    const generatingMessage: ChatMessage = {
      id: "generating",
      role: "ai",
      content: "Generating design options based on your context...",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, generatingMessage]);

    try {
      await onGenerateDesign();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-muted/30 to-background">
      {/* Chat Header */}
      <div className="shrink-0 px-4 py-3 border-b bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-gold to-brand-gold/70 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-brand-navy" />
          </div>
          <div>
            <h3 className="text-sm font-medium">Step Design Assistant</h3>
            <p className="text-xs text-muted-foreground">
              Gathering context for {nodeName}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
        <div className="space-y-4 max-w-lg mx-auto">
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "ai" && (
                  <div className="flex gap-2 max-w-[85%]">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-brand-gold/20 to-brand-gold/10 flex items-center justify-center mt-0.5">
                      <Sparkles className="h-3.5 w-3.5 text-brand-gold" />
                    </div>
                    <div className="space-y-1">
                      <div
                        className={cn(
                          "rounded-2xl rounded-tl-md px-4 py-2.5 text-sm",
                          "bg-white border shadow-sm"
                        )}
                      >
                        {message.isTyping ? (
                          <div className="flex items-center gap-1 py-1">
                            <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                      {message.required && !message.isTyping && (
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                          Required
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {message.role === "user" && (
                  <div className="max-w-[85%]">
                    <div
                      className={cn(
                        "rounded-2xl rounded-tr-md px-4 py-2.5 text-sm",
                        "bg-brand-navy text-white"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Generation Progress */}
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex gap-2 max-w-[85%]">
                <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-brand-gold/20 to-brand-gold/10 flex items-center justify-center">
                  <Loader2 className="h-3.5 w-3.5 text-brand-gold animate-spin" />
                </div>
                <div className="rounded-2xl rounded-tl-md px-4 py-3 bg-white border shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 space-y-1.5">
                      <p className="text-sm font-medium">Generating design options...</p>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-brand-gold to-brand-gold/70 rounded-full"
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 3, ease: "easeInOut" }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Analyzing context and generating 2-3 options...
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="shrink-0 border-t bg-white p-4">
        {allQuestionsAnswered && !isGenerating ? (
          <Button
            onClick={handleGenerateClick}
            className="w-full bg-gradient-to-r from-brand-gold to-brand-gold/80 hover:from-brand-gold/90 hover:to-brand-gold/70 text-brand-navy font-medium"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Design Options
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isProcessing ? "Processing..." : "Type your answer..."}
              disabled={isProcessing || isGenerating}
              className="flex-1 rounded-full px-4 border-muted-foreground/20 focus-visible:ring-brand-gold"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isProcessing || isGenerating}
              size="icon"
              className="rounded-full bg-brand-navy hover:bg-brand-navy/90 shrink-0"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {/* Context hint */}
        {!allQuestionsAnswered && initialQuestions.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3" />
            <span>
              Question {Math.min(currentQuestionIndex + 1, initialQuestions.length)} of {initialQuestions.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// COMPACT CHAT TRIGGER
// ============================================

interface ChatTriggerProps {
  hasUnansweredQuestions: boolean;
  questionCount: number;
  onClick: () => void;
}

export function StepDesignChatTrigger({
  hasUnansweredQuestions,
  questionCount,
  onClick,
}: ChatTriggerProps) {
  if (!hasUnansweredQuestions) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "w-full p-3 rounded-lg border-2 border-dashed",
        "border-amber-300 bg-amber-50/50 hover:bg-amber-50",
        "flex items-center gap-3 transition-colors"
      )}
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-gold to-brand-gold/70 flex items-center justify-center">
        <Sparkles className="h-5 w-5 text-brand-navy" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-medium text-brand-navy">
          Answer {questionCount} question{questionCount > 1 ? "s" : ""} to improve design
        </p>
        <p className="text-xs text-muted-foreground">
          Quick chat with AI to gather context
        </p>
      </div>
      <Badge className="bg-amber-100 text-amber-700 border-amber-200">
        <AlertCircle className="h-3 w-3 mr-1" />
        Needs input
      </Badge>
    </motion.button>
  );
}

