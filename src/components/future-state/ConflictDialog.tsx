"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, RefreshCw, XCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConflictInfo {
  entityType: string;
  entityId: string;
  entityName: string;
  localRevision: number;
  serverRevision: number;
  conflictingUser?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  localChanges: Record<string, unknown>;
  serverChanges: Record<string, unknown>;
}

interface ConflictDialogProps {
  conflict: ConflictInfo | null;
  onResolve: (action: "discard" | "overwrite" | "merge") => void;
  onCancel: () => void;
}

export function ConflictDialog({ conflict, onResolve, onCancel }: ConflictDialogProps) {
  const [isResolving, setIsResolving] = useState(false);

  const handleResolve = async (action: "discard" | "overwrite" | "merge") => {
    setIsResolving(true);
    try {
      await onResolve(action);
    } finally {
      setIsResolving(false);
    }
  };

  if (!conflict) return null;

  return (
    <Dialog open={!!conflict} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Conflict Detected</DialogTitle>
          </div>
          <DialogDescription>
            The {conflict.entityType} &quot;{conflict.entityName}&quot; was modified by another user
            while you were editing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Conflicting user info */}
          {conflict.conflictingUser && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={conflict.conflictingUser.avatar_url} />
                <AvatarFallback>
                  {conflict.conflictingUser.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{conflict.conflictingUser.name}</p>
                <p className="text-sm text-muted-foreground">
                  Made changes to this {conflict.entityType}
                </p>
              </div>
            </div>
          )}

          {/* Version info */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
            <div className="text-center">
              <p className="text-muted-foreground">Your version</p>
              <Badge variant="secondary">v{conflict.localRevision}</Badge>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="text-center">
              <p className="text-muted-foreground">Server version</p>
              <Badge variant="default">v{conflict.serverRevision}</Badge>
            </div>
          </div>

          {/* Resolution options */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Choose how to resolve:</p>
            <div className="grid gap-2">
              <Button
                variant="outline"
                className="justify-start h-auto py-3"
                onClick={() => handleResolve("discard")}
                disabled={isResolving}
              >
                <XCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">Discard my changes</p>
                  <p className="text-xs text-muted-foreground">
                    Keep the server version and lose your local changes
                  </p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto py-3 border-amber-200 hover:bg-amber-50"
                onClick={() => handleResolve("overwrite")}
                disabled={isResolving}
              >
                <RefreshCw className="h-4 w-4 mr-2 text-amber-600" />
                <div className="text-left">
                  <p className="font-medium">Overwrite with my changes</p>
                  <p className="text-xs text-muted-foreground">
                    Replace the server version with your changes
                  </p>
                </div>
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={isResolving}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// LOCK EXPIRED DIALOG
// ============================================

interface LockExpiredDialogProps {
  isOpen: boolean;
  entityName: string;
  lockedByUser?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  onRetry: () => void;
  onCancel: () => void;
}

export function LockExpiredDialog({
  isOpen,
  entityName,
  lockedByUser,
  onRetry,
  onCancel,
}: LockExpiredDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => onCancel()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Lock Expired</DialogTitle>
          </div>
          <DialogDescription>
            Your editing lock on &quot;{entityName}&quot; has expired.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {lockedByUser && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={lockedByUser.avatar_url} />
                <AvatarFallback>{lockedByUser.name?.charAt(0) || "?"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{lockedByUser.name}</p>
                <p className="text-sm text-muted-foreground">
                  Has acquired the lock
                </p>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            You can try to re-acquire the lock, or cancel and let the other user continue editing.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try to Re-acquire Lock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// CONNECTION STATUS INDICATOR
// ============================================

interface ConnectionStatusProps {
  isConnected: boolean;
  isReconnecting?: boolean;
  onRetry?: () => void;
}

export function ConnectionStatus({
  isConnected,
  isReconnecting,
  onRetry,
}: ConnectionStatusProps) {
  if (isConnected) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg",
        isReconnecting
          ? "bg-amber-100 text-amber-800 border border-amber-200"
          : "bg-red-100 text-red-800 border border-red-200"
      )}
    >
      {isReconnecting ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Reconnecting...</span>
        </>
      ) : (
        <>
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Connection lost</span>
          {onRetry && (
            <Button variant="ghost" size="sm" onClick={onRetry} className="ml-2 h-7 px-2">
              Retry
            </Button>
          )}
        </>
      )}
    </div>
  );
}

