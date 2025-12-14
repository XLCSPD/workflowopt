import { Loader2 } from "lucide-react";

export default function WorkflowDetailLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <div className="px-6 py-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-muted animate-pulse rounded" />
            <div className="h-9 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>

      {/* Stats bar skeleton */}
      <div className="px-6 py-3 border-b bg-muted/30 flex items-center gap-4">
        <div className="h-6 w-20 bg-muted animate-pulse rounded" />
        <div className="h-6 w-24 bg-muted animate-pulse rounded" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
          <p className="text-muted-foreground">Loading workflow...</p>
        </div>
      </div>
    </div>
  );
}

