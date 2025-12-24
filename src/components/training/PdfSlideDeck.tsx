"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface PdfSlideDeckProps {
  /** Array of PDF URLs to display as a deck */
  pdfUrls: string[];
  /** Optional title for the deck */
  title?: string;
  /** Called when page changes */
  onPageChange?: (pageNumber: number, totalPages: number) => void;
  /** Called when the user reaches the last page */
  onComplete?: () => void;
  /** Initial page number (1-indexed) */
  initialPage?: number;
  /** Optional className for the container */
  className?: string;
}

export function PdfSlideDeck({
  pdfUrls,
  title,
  onPageChange,
  onComplete,
  initialPage = 1,
  className,
}: PdfSlideDeckProps) {
  const [currentPdfIndex, setCurrentPdfIndex] = useState(
    Math.min(initialPage - 1, pdfUrls.length - 1)
  );
  const [loading, setLoading] = useState(true);
  const totalPdfs = pdfUrls.length;

  // Notify parent of changes
  useEffect(() => {
    onPageChange?.(currentPdfIndex + 1, totalPdfs);
    if (currentPdfIndex === totalPdfs - 1) {
      onComplete?.();
    }
  }, [currentPdfIndex, totalPdfs, onPageChange, onComplete]);

  const goToNext = useCallback(() => {
    setCurrentPdfIndex((prev) => Math.min(prev + 1, totalPdfs - 1));
    setLoading(true);
  }, [totalPdfs]);

  const goToPrevious = useCallback(() => {
    setCurrentPdfIndex((prev) => Math.max(0, prev - 1));
    setLoading(true);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious]);

  const progress = totalPdfs > 0 ? ((currentPdfIndex + 1) / totalPdfs) * 100 : 0;
  const currentPdfUrl = pdfUrls[currentPdfIndex];

  // Show fallback if no PDFs
  if (!pdfUrls || pdfUrls.length === 0) {
    return (
      <Card className={cn("max-w-4xl mx-auto", className)}>
        <CardContent className="pt-6 text-center space-y-4">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No PDF documents available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header with title and progress */}
      <div className="shrink-0 bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          {title && <h2 className="font-semibold text-brand-navy">{title}</h2>}
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Document {currentPdfIndex + 1} of {totalPdfs}
            </span>
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href={currentPdfUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </a>
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* PDF Viewer using iframe */}
      <div className="flex-1 relative bg-muted/30 min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-gold mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading document...</p>
            </div>
          </div>
        )}
        
        <iframe
          key={currentPdfUrl}
          src={`${currentPdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
          className="w-full h-full border-0"
          title={`PDF Document ${currentPdfIndex + 1}`}
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
        />
      </div>

      {/* Navigation Controls */}
      {totalPdfs > 1 && (
        <div className="shrink-0 bg-white border-t px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={goToPrevious}
              disabled={currentPdfIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous Document
            </Button>

            <div className="flex gap-2">
              {pdfUrls.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentPdfIndex(idx);
                    setLoading(true);
                  }}
                  className={cn(
                    "w-3 h-3 rounded-full transition-colors",
                    idx === currentPdfIndex
                      ? "bg-brand-gold"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                  aria-label={`Go to document ${idx + 1}`}
                />
              ))}
            </div>

            <Button
              onClick={goToNext}
              disabled={currentPdfIndex === totalPdfs - 1}
            >
              Next Document
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Keyboard hint */}
      <div className="shrink-0 bg-muted/50 px-4 py-2 text-center">
        <p className="text-xs text-muted-foreground">
          Use <kbd className="px-1.5 py-0.5 bg-white rounded border text-xs">←</kbd>{" "}
          <kbd className="px-1.5 py-0.5 bg-white rounded border text-xs">→</kbd> to navigate between documents
        </p>
      </div>
    </div>
  );
}
