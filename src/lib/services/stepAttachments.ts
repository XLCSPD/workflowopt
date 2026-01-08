import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  StepAttachment,
  StepAttachmentWithUser,
  CreateStepAttachmentInput,
  UpdateStepAttachmentInput,
} from "@/types";
import { uploadStepAttachment, deleteFile, getFileUrl } from "./storage";

const supabase = getSupabaseClient();

// ============================================
// FETCH ATTACHMENTS
// ============================================

/**
 * Get all attachments for a process step
 */
export async function getStepAttachments(
  stepId: string
): Promise<StepAttachmentWithUser[]> {
  const { data, error } = await supabase
    .from("step_attachments")
    .select(
      `
      *,
      user:users!uploaded_by(id, name, email)
    `
    )
    .eq("step_id", stepId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get all attachments for a future state node
 */
export async function getNodeAttachments(
  nodeId: string
): Promise<StepAttachmentWithUser[]> {
  const { data, error } = await supabase
    .from("step_attachments")
    .select(
      `
      *,
      user:users!uploaded_by(id, name, email)
    `
    )
    .eq("node_id", nodeId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single attachment by ID
 */
export async function getAttachment(
  attachmentId: string
): Promise<StepAttachmentWithUser | null> {
  const { data, error } = await supabase
    .from("step_attachments")
    .select(
      `
      *,
      user:users!uploaded_by(id, name, email)
    `
    )
    .eq("id", attachmentId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }
  return data;
}

// ============================================
// UPLOAD ATTACHMENT
// ============================================

interface UploadAttachmentParams {
  file: File;
  stepId?: string;
  nodeId?: string;
  processId: string;
  description?: string;
  category?: StepAttachment["category"];
}

/**
 * Upload a file and create an attachment record
 */
export async function uploadAttachment({
  file,
  stepId,
  nodeId,
  processId,
  description,
  category = "other",
}: UploadAttachmentParams): Promise<StepAttachment> {
  if (!stepId && !nodeId) {
    throw new Error("Either stepId or nodeId must be provided");
  }

  // Upload file to storage
  const entityId = stepId || nodeId!;
  const { path } = await uploadStepAttachment(file, processId, entityId);

  // Create attachment record
  const input: CreateStepAttachmentInput = {
    step_id: stepId,
    node_id: nodeId,
    filename: path.split("/").pop() || file.name,
    original_filename: file.name,
    file_path: path,
    file_size: file.size,
    mime_type: file.type || undefined,
    description,
    category,
  };

  const { data, error } = await supabase
    .from("step_attachments")
    .insert(input)
    .select()
    .single();

  if (error) {
    // Try to clean up the uploaded file if database insert fails
    try {
      await deleteFile("step-attachments", path);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }

  return data;
}

/**
 * Upload multiple files at once
 */
export async function uploadMultipleAttachments(
  params: Omit<UploadAttachmentParams, "file"> & { files: File[] }
): Promise<StepAttachment[]> {
  const results: StepAttachment[] = [];

  for (const file of params.files) {
    const attachment = await uploadAttachment({
      ...params,
      file,
    });
    results.push(attachment);
  }

  return results;
}

// ============================================
// UPDATE ATTACHMENT
// ============================================

/**
 * Update attachment metadata (description, category)
 */
export async function updateAttachment(
  attachmentId: string,
  input: UpdateStepAttachmentInput
): Promise<StepAttachment> {
  const { data, error } = await supabase
    .from("step_attachments")
    .update(input)
    .eq("id", attachmentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// DELETE ATTACHMENT
// ============================================

/**
 * Delete an attachment and its file from storage
 */
export async function deleteAttachment(attachmentId: string): Promise<void> {
  // First, get the attachment to find the file path
  const attachment = await getAttachment(attachmentId);
  if (!attachment) {
    throw new Error("Attachment not found");
  }

  // Delete from database
  const { error } = await supabase
    .from("step_attachments")
    .delete()
    .eq("id", attachmentId);

  if (error) throw error;

  // Delete file from storage
  try {
    await deleteFile("step-attachments", attachment.file_path);
  } catch {
    // Log but don't throw - the database record is already deleted
    console.warn(
      `Failed to delete file from storage: ${attachment.file_path}`
    );
  }
}

// ============================================
// UTILITIES
// ============================================

/**
 * Get the public URL for an attachment
 */
export function getAttachmentUrl(filePath: string): string {
  return getFileUrl("step-attachments", filePath);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get file icon based on mime type
 */
export function getFileIconType(
  mimeType?: string
): "image" | "pdf" | "document" | "spreadsheet" | "video" | "file" {
  if (!mimeType) return "file";

  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("video/")) return "video";
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "text/csv"
  ) {
    return "spreadsheet";
  }
  if (
    mimeType.includes("document") ||
    mimeType.includes("word") ||
    mimeType === "text/plain"
  ) {
    return "document";
  }

  return "file";
}

/**
 * Check if a file can be previewed inline
 */
export function canPreviewInline(mimeType?: string): boolean {
  if (!mimeType) return false;
  return (
    mimeType.startsWith("image/") ||
    mimeType === "application/pdf" ||
    mimeType.startsWith("video/")
  );
}
