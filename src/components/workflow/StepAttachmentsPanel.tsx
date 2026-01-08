"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Paperclip,
  Upload,
  Download,
  Trash2,
  File,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  Video,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { StepAttachmentWithUser, AttachmentCategory } from "@/types";
import {
  getStepAttachments,
  uploadAttachment,
  deleteAttachment,
  updateAttachment,
  getAttachmentUrl,
  formatFileSize,
  getFileIconType,
} from "@/lib/services/stepAttachments";

interface StepAttachmentsPanelProps {
  stepId: string;
  processId: string;
  defaultOpen?: boolean;
}

const CATEGORY_OPTIONS: { value: AttachmentCategory; label: string }[] = [
  { value: "documentation", label: "Documentation" },
  { value: "screenshot", label: "Screenshot" },
  { value: "diagram", label: "Diagram" },
  { value: "template", label: "Template" },
  { value: "reference", label: "Reference" },
  { value: "other", label: "Other" },
];

const FileIcon = ({ mimeType }: { mimeType?: string }) => {
  const type = getFileIconType(mimeType);
  switch (type) {
    case "image":
      return <ImageIcon className="h-4 w-4 text-green-500" />;
    case "pdf":
      return <FileText className="h-4 w-4 text-red-500" />;
    case "document":
      return <FileText className="h-4 w-4 text-blue-500" />;
    case "spreadsheet":
      return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
    case "video":
      return <Video className="h-4 w-4 text-purple-500" />;
    default:
      return <File className="h-4 w-4 text-gray-500" />;
  }
};

export function StepAttachmentsPanel({
  stepId,
  processId,
  defaultOpen = false,
}: StepAttachmentsPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [attachments, setAttachments] = useState<StepAttachmentWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StepAttachmentWithUser | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load attachments when panel opens
  useEffect(() => {
    if (isOpen && stepId) {
      loadAttachments();
    }
  }, [isOpen, stepId]);

  const loadAttachments = async () => {
    setIsLoading(true);
    try {
      const data = await getStepAttachments(stepId);
      setAttachments(data);
    } catch (error) {
      console.error("Failed to load attachments:", error);
      toast({
        title: "Error",
        description: "Failed to load attachments",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setIsUploading(true);
      const uploadedFiles: StepAttachmentWithUser[] = [];

      try {
        for (const file of Array.from(files)) {
          // Check file size (max 10MB)
          if (file.size > 10 * 1024 * 1024) {
            toast({
              title: "File too large",
              description: `${file.name} exceeds 10MB limit`,
              variant: "destructive",
            });
            continue;
          }

          const attachment = await uploadAttachment({
            file,
            stepId,
            processId,
            category: "other",
          });

          uploadedFiles.push(attachment as StepAttachmentWithUser);
        }

        if (uploadedFiles.length > 0) {
          setAttachments((prev) => [...uploadedFiles, ...prev]);
          toast({
            title: "Uploaded",
            description: `${uploadedFiles.length} file${uploadedFiles.length > 1 ? "s" : ""} uploaded`,
          });
        }
      } catch (error) {
        console.error("Upload failed:", error);
        toast({
          title: "Upload failed",
          description: "Failed to upload one or more files",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [stepId, processId, toast]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDownload = (attachment: StepAttachmentWithUser) => {
    const url = getAttachmentUrl(attachment.file_path);
    window.open(url, "_blank");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteAttachment(deleteTarget.id);
      setAttachments((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      toast({
        title: "Deleted",
        description: "Attachment deleted successfully",
      });
    } catch (error) {
      console.error("Delete failed:", error);
      toast({
        title: "Delete failed",
        description: "Failed to delete attachment",
        variant: "destructive",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleCategoryChange = async (
    attachment: StepAttachmentWithUser,
    category: AttachmentCategory
  ) => {
    try {
      await updateAttachment(attachment.id, { category });
      setAttachments((prev) =>
        prev.map((a) => (a.id === attachment.id ? { ...a, category } : a))
      );
    } catch (error) {
      console.error("Update failed:", error);
      toast({
        title: "Update failed",
        description: "Failed to update category",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left"
      >
        <h4 className="text-sm font-medium flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <Paperclip className="h-4 w-4" />
          Attachments
          {attachments.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {attachments.length}
            </Badge>
          )}
        </h4>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">
          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer
              ${isDragOver
                ? "border-brand-gold bg-brand-gold/5"
                : "border-gray-300 hover:border-gray-400"
              }
            `}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
            {isUploading ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Uploading...</span>
              </div>
            ) : (
              <>
                <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drop files here or click to upload
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max 10MB per file
                </p>
              </>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Attachments List */}
          {!isLoading && attachments.length > 0 && (
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 p-2 rounded-lg border bg-white hover:bg-gray-50"
                >
                  {/* File Icon / Preview */}
                  <div className="flex-shrink-0">
                    {attachment.mime_type?.startsWith("image/") ? (
                      <img
                        src={getAttachmentUrl(attachment.file_path)}
                        alt={attachment.original_filename}
                        className="h-10 w-10 object-cover rounded"
                      />
                    ) : (
                      <div className="h-10 w-10 flex items-center justify-center bg-gray-100 rounded">
                        <FileIcon mimeType={attachment.mime_type} />
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      title={attachment.original_filename}
                    >
                      {attachment.original_filename}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(attachment.file_size)}</span>
                      <span>•</span>
                      <Select
                        value={attachment.category}
                        onValueChange={(value) =>
                          handleCategoryChange(
                            attachment,
                            value as AttachmentCategory
                          )
                        }
                      >
                        <SelectTrigger className="h-5 w-auto border-none p-0 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDownload(attachment)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(attachment)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && attachments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No attachments yet
            </p>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.original_filename}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
