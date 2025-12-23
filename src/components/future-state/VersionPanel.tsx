"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronDown,
  Save,
  History,
  RotateCcw,
  Lock,
  Unlock,
  Clock,
  User,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface FutureStateVersion {
  id: string;
  name: string;
  description?: string;
  version: number;
  status: "draft" | "published";
  is_locked: boolean;
  parent_version_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  creator?: { id: string; full_name: string };
}

interface VersionPanelProps {
  sessionId: string;
  currentVersionId: string | null;
  onVersionSelect: (versionId: string) => void;
  onSaveAsNewVersion: (name: string, description?: string) => Promise<string | null>;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => Promise<void>;
  className?: string;
}

export function VersionPanel({
  sessionId,
  currentVersionId,
  onVersionSelect,
  onSaveAsNewVersion,
  isDirty,
  isSaving,
  onSave,
  className,
}: VersionPanelProps) {
  const [versions, setVersions] = useState<FutureStateVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [newVersionName, setNewVersionName] = useState("");
  const [newVersionDescription, setNewVersionDescription] = useState("");
  const [savingAs, setSavingAs] = useState(false);

  // Fetch versions
  useEffect(() => {
    async function fetchVersions() {
      try {
        const response = await fetch(`/api/future-state/versions?sessionId=${sessionId}`);
        if (response.ok) {
          const { versions } = await response.json();
          setVersions(versions || []);
        }
      } catch (error) {
        console.error("Error fetching versions:", error);
      } finally {
        setLoading(false);
      }
    }

    if (sessionId) {
      fetchVersions();
    }
  }, [sessionId]);

  // Get current version
  const currentVersion = versions.find((v) => v.id === currentVersionId);

  // Handle save as new version
  const handleSaveAs = async () => {
    if (!newVersionName.trim()) return;

    setSavingAs(true);
    try {
      const newVersionId = await onSaveAsNewVersion(
        newVersionName.trim(),
        newVersionDescription.trim() || undefined
      );

      if (newVersionId) {
        // Refresh versions list
        const response = await fetch(`/api/future-state/versions?sessionId=${sessionId}`);
        if (response.ok) {
          const { versions } = await response.json();
          setVersions(versions || []);
        }

        setSaveAsOpen(false);
        setNewVersionName("");
        setNewVersionDescription("");
      }
    } finally {
      setSavingAs(false);
    }
  };

  // Handle restore version
  const handleRestore = async (versionId: string) => {
    // Create a new version from the old one
    const versionToRestore = versions.find((v) => v.id === versionId);
    if (!versionToRestore) return;

    setNewVersionName(`Restored from v${versionToRestore.version}`);
    setNewVersionDescription(`Restored from: ${versionToRestore.name}`);
    setSaveAsOpen(true);
  };

  // Handle lock/unlock
  const handleToggleLock = async (versionId: string, lock: boolean) => {
    try {
      const response = await fetch("/api/future-state/versions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId, updates: { isLocked: lock } }),
      });

      if (response.ok) {
        setVersions((prev) =>
          prev.map((v) => (v.id === versionId ? { ...v, is_locked: lock } : v))
        );
      }
    } catch (error) {
      console.error("Error toggling lock:", error);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Version Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="min-w-[140px]" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : currentVersion ? (
              <>
                <History className="h-4 w-4 mr-2" />
                v{currentVersion.version}
                {currentVersion.is_locked && <Lock className="h-3 w-3 ml-1 text-amber-500" />}
                <ChevronDown className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                <History className="h-4 w-4 mr-2" />
                No versions
                <ChevronDown className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          {versions.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No versions available
            </div>
          ) : (
            <>
              {versions.map((version) => {
                const isCurrent = version.id === currentVersionId;
                return (
                  <DropdownMenuItem
                    key={version.id}
                    className={cn(
                      "flex flex-col items-start py-2",
                      isCurrent && "bg-accent"
                    )}
                    onClick={() => {
                      if (!isCurrent) {
                        onVersionSelect(version.id);
                      }
                    }}
                  >
                    <div className="flex items-center w-full">
                      <span className="font-medium">v{version.version}</span>
                      {version.is_locked && (
                        <Lock className="h-3 w-3 ml-1 text-amber-500" />
                      )}
                      {version.status === "published" && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Published
                        </Badge>
                      )}
                      {isCurrent && (
                        <Badge className="ml-auto text-xs">Current</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate w-full">
                      {version.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                      {version.creator && (
                        <>
                          <User className="h-3 w-3 ml-2" />
                          {version.creator.full_name}
                        </>
                      )}
                    </div>
                  </DropdownMenuItem>
                );
              })}

              <DropdownMenuSeparator />

              {/* Version Actions */}
              {currentVersion && !currentVersion.is_locked && (
                <DropdownMenuItem onClick={() => handleToggleLock(currentVersion.id, true)}>
                  <Lock className="h-4 w-4 mr-2" />
                  Lock Version
                </DropdownMenuItem>
              )}

              {currentVersion && currentVersion.is_locked && (
                <DropdownMenuItem onClick={() => handleToggleLock(currentVersion.id, false)}>
                  <Unlock className="h-4 w-4 mr-2" />
                  Unlock Version
                </DropdownMenuItem>
              )}

              {versions.length > 1 && currentVersion && (
                <DropdownMenuItem onClick={() => handleRestore(currentVersion.id)}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore This Version
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save Button */}
      <Button
        variant={isDirty ? "default" : "outline"}
        size="sm"
        onClick={onSave}
        disabled={isSaving || !isDirty}
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save
          </>
        )}
      </Button>

      {/* Save As Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setSaveAsOpen(true)}
        disabled={!currentVersionId}
      >
        Save As...
      </Button>

      {/* Save As Dialog */}
      <Dialog open={saveAsOpen} onOpenChange={setSaveAsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as New Version</DialogTitle>
            <DialogDescription>
              Create a new version based on the current state. The new version will be an
              independent copy that can be modified without affecting the original.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="version-name">Version Name</Label>
              <Input
                id="version-name"
                placeholder="e.g., Added automation steps"
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="version-description">Description (optional)</Label>
              <Textarea
                id="version-description"
                placeholder="Describe what changed in this version..."
                value={newVersionDescription}
                onChange={(e) => setNewVersionDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveAsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAs} disabled={savingAs || !newVersionName.trim()}>
              {savingAs ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Version"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dirty Indicator */}
      {isDirty && (
        <Badge variant="outline" className="text-amber-600 border-amber-300">
          Unsaved changes
        </Badge>
      )}
    </div>
  );
}

