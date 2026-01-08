import { getSupabaseClient } from "@/lib/supabase/client";

const supabase = getSupabaseClient();

export type StorageBucket = "training-content" | "observation-attachments" | "step-attachments" | "avatars";

// ============================================
// FILE UPLOAD
// ============================================

export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  file: File
): Promise<{ url: string; path: string }> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) throw error;

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

export async function uploadTrainingContent(file: File, moduleId: string) {
  const ext = file.name.split(".").pop();
  const path = `${moduleId}/${Date.now()}.${ext}`;
  return uploadFile("training-content", path, file);
}

export async function uploadObservationAttachment(
  file: File,
  sessionId: string,
  observationId: string
) {
  const ext = file.name.split(".").pop();
  const path = `${sessionId}/${observationId}/${Date.now()}.${ext}`;
  return uploadFile("observation-attachments", path, file);
}

export async function uploadAvatar(file: File, userId: string) {
  const ext = file.name.split(".").pop();
  const path = `${userId}/avatar.${ext}`;
  return uploadFile("avatars", path, file);
}

export async function uploadStepAttachment(
  file: File,
  processId: string,
  stepId: string
) {
  const ext = file.name.split(".").pop();
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const path = `${processId}/${stepId}/${uniqueId}.${ext}`;
  return uploadFile("step-attachments", path, file);
}

// ============================================
// FILE MANAGEMENT
// ============================================

export async function deleteFile(bucket: StorageBucket, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

export async function listFiles(bucket: StorageBucket, folder: string) {
  const { data, error } = await supabase.storage.from(bucket).list(folder);
  if (error) throw error;
  return data;
}

export function getFileUrl(bucket: StorageBucket, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ============================================
// SIGNED URLs (for private buckets)
// ============================================

export async function getSignedUrl(
  bucket: StorageBucket,
  path: string,
  expiresInSeconds = 3600
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error) throw error;
  return data.signedUrl;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function generateUniquePath(folder: string, filename: string) {
  const ext = filename.split(".").pop();
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return `${folder}/${uniqueId}.${ext}`;
}

export function getFileExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() || "";
}

export function isImageFile(filename: string) {
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
  return imageExtensions.includes(getFileExtension(filename));
}

export function isVideoFile(filename: string) {
  const videoExtensions = ["mp4", "webm", "ogg", "mov"];
  return videoExtensions.includes(getFileExtension(filename));
}

export function isPDFFile(filename: string) {
  return getFileExtension(filename) === "pdf";
}

// ============================================
// BATCH UPLOADS
// ============================================

export async function uploadMultipleFiles(
  bucket: StorageBucket,
  files: { file: File; path: string }[]
) {
  const results = await Promise.all(
    files.map(({ file, path }) => uploadFile(bucket, path, file))
  );
  return results;
}

export async function uploadObservationAttachments(
  files: File[],
  sessionId: string,
  observationId: string
) {
  const uploads = files.map((file, index) => ({
    file,
    path: `${sessionId}/${observationId}/${Date.now()}-${index}.${getFileExtension(
      file.name
    )}`,
  }));
  return uploadMultipleFiles("observation-attachments", uploads);
}

