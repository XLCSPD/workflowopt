"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  X,
  ArrowRight,
  Rocket,
  GraduationCap,
  GitBranch,
  Users,
  BarChart3,
  Settings,
  Shield,
  ChevronLeft,
  BookOpen,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import {
  helpSections,
  searchHelpContent,
  getHelpTopic,
  getPageHelp,
  type HelpTopic,
} from "@/lib/help/content";

// Simple markdown-like renderer for help content
function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.trim().split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm">{item}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const flushCode = () => {
    if (codeContent.length > 0) {
      elements.push(
        <pre key={`code-${elements.length}`} className="bg-muted p-3 rounded text-xs overflow-x-auto my-2">
          <code>{codeContent.join("\n")}</code>
        </pre>
      );
      codeContent = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Code block handling
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      return;
    }

    // Empty line
    if (!trimmed) {
      flushList();
      return;
    }

    // Headers
    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={`h2-${index}`} className="text-base font-semibold mt-4 mb-2">
          {trimmed.slice(3)}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={`h3-${index}`} className="text-sm font-medium mt-3 mb-1">
          {trimmed.slice(4)}
        </h3>
      );
      return;
    }

    // List items
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listItems.push(trimmed.slice(2));
      return;
    }

    // Numbered list
    if (/^\d+\.\s/.test(trimmed)) {
      const text = trimmed.replace(/^\d+\.\s/, "");
      listItems.push(text);
      return;
    }

    // Regular paragraph
    flushList();
    // Handle inline formatting
    const formattedLine = trimmed
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 rounded text-xs">$1</code>');
    
    elements.push(
      <p 
        key={`p-${index}`} 
        className="text-sm my-2"
        dangerouslySetInnerHTML={{ __html: formattedLine }}
      />
    );
  });

  flushList();
  flushCode();

  return <div className="space-y-1">{elements}</div>;
}

// Icon mapping for sections
const sectionIcons: Record<string, React.ElementType> = {
  "getting-started": Rocket,
  training: GraduationCap,
  workflows: GitBranch,
  sessions: Users,
  "future-state": Sparkles,
  analytics: BarChart3,
  settings: Settings,
  admin: Shield,
};

interface HelpDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpDrawer({ open, onOpenChange }: HelpDrawerProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
  const [view, setView] = useState<"home" | "search" | "topic">("home");

  // Get page-specific help
  const pageHelp = useMemo(() => getPageHelp(pathname), [pathname]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchHelpContent(searchQuery);
  }, [searchQuery]);

  // Reset state when drawer opens
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSelectedTopic(null);
      setView("home");
    }
  }, [open]);

  // Handle search input
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      setView("search");
      setSelectedTopic(null);
    } else {
      setView("home");
    }
  }, []);

  // Handle topic selection
  const handleTopicSelect = useCallback((topicId: string) => {
    const topic = getHelpTopic(topicId);
    if (topic) {
      setSelectedTopic(topic);
      setView("topic");
    }
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (view === "topic") {
      setSelectedTopic(null);
      setView(searchQuery.trim() ? "search" : "home");
    }
  }, [view, searchQuery]);

  // Render home view with context-aware content
  const renderHomeView = () => (
    <div className="space-y-6">
      {/* Page-specific quick actions */}
      {pageHelp && pageHelp.quickActions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Quick Actions
          </h3>
          <div className="space-y-2">
            {pageHelp.quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                onClick={() => onOpenChange(false)}
              >
                <Button
                  variant="outline"
                  className="w-full justify-between h-auto py-3"
                >
                  <div className="text-left">
                    <div className="font-medium">{action.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {action.description}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Featured topics for current page */}
      {pageHelp && pageHelp.featuredTopics.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Help for this page
          </h3>
          <div className="space-y-2">
            {pageHelp.featuredTopics.map((topicId) => {
              const topic = getHelpTopic(topicId);
              if (!topic) return null;
              return (
                <button
                  key={topicId}
                  onClick={() => handleTopicSelect(topicId)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="font-medium text-sm">{topic.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {topic.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Separator />

      {/* All help sections */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          All Topics
        </h3>
        <Accordion type="single" collapsible className="w-full">
          {helpSections.map((section) => {
            const Icon = sectionIcons[section.id] || BookOpen;
            return (
              <AccordionItem key={section.id} value={section.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{section.title}</span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {section.topics.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-1 pl-6">
                    {section.topics.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => handleTopicSelect(topic.id)}
                        className="w-full text-left p-2 rounded hover:bg-muted/50 transition-colors text-sm"
                      >
                        {topic.title}
                      </button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      {/* External documentation link */}
      <Separator />
      <div className="pt-2">
        <Link
          href="/docs"
          target="_blank"
          onClick={() => onOpenChange(false)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          View full documentation
        </Link>
      </div>
    </div>
  );

  // Render search results view
  const renderSearchView = () => (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for
        &quot;{searchQuery}&quot;
      </div>
      {searchResults.length > 0 ? (
        <div className="space-y-2">
          {searchResults.map((topic) => (
            <button
              key={topic.id}
              onClick={() => handleTopicSelect(topic.id)}
              className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="font-medium text-sm">{topic.title}</div>
              <div className="text-xs text-muted-foreground line-clamp-2">
                {topic.description}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No results found</p>
          <p className="text-xs">Try different keywords</p>
        </div>
      )}
    </div>
  );

  // Render topic detail view
  const renderTopicView = () => {
    if (!selectedTopic) return null;

    return (
      <div className="space-y-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <div>
          <h2 className="text-lg font-semibold">{selectedTopic.title}</h2>
          <p className="text-sm text-muted-foreground">
            {selectedTopic.description}
          </p>
        </div>

        <Separator />

        <div className="max-w-none">
          <SimpleMarkdown content={selectedTopic.content} />
        </div>

        {selectedTopic.relatedTopics && selectedTopic.relatedTopics.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Related Topics
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedTopic.relatedTopics.map((topicId) => {
                  const topic = getHelpTopic(topicId);
                  if (!topic) return null;
                  return (
                    <Button
                      key={topicId}
                      variant="outline"
                      size="sm"
                      onClick={() => handleTopicSelect(topicId)}
                    >
                      {topic.title}
                    </Button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle>Help</SheetTitle>
          </div>
          <SheetDescription className="sr-only">
            Search and browse help topics
          </SheetDescription>

          {/* Search input */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search help..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          {view === "home" && renderHomeView()}
          {view === "search" && renderSearchView()}
          {view === "topic" && renderTopicView()}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

