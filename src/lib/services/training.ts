import { getSupabaseClient } from "@/lib/supabase/client";
import type { TrainingContent, TrainingProgress } from "@/types";

const supabase = getSupabaseClient();

export interface TrainingContentWithProgress extends TrainingContent {
  progress?: TrainingProgress;
  status: "completed" | "in_progress" | "available" | "locked";
}

// ============================================
// TRAINING CONTENT
// ============================================

export async function getTrainingContent() {
  const { data, error } = await supabase
    .from("training_content")
    .select("*")
    .order("order_index", { ascending: true });

  if (error) throw error;
  return data as TrainingContent[];
}

export async function getTrainingContentById(id: string) {
  const { data, error } = await supabase
    .from("training_content")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as TrainingContent;
}

export async function createTrainingContent(content: Omit<TrainingContent, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("training_content")
    .insert(content)
    .select()
    .single();

  if (error) throw error;
  return data as TrainingContent;
}

export async function updateTrainingContent(id: string, updates: Partial<TrainingContent>) {
  const { data, error } = await supabase
    .from("training_content")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as TrainingContent;
}

export async function deleteTrainingContent(id: string) {
  const { error } = await supabase
    .from("training_content")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ============================================
// TRAINING PROGRESS
// ============================================

export async function getUserTrainingProgress() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("training_progress")
    .select("*")
    .eq("user_id", user.id);

  if (error) throw error;
  return data as TrainingProgress[];
}

export async function getTrainingProgressByContent(contentId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("training_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("content_id", contentId)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows found
  return data as TrainingProgress | null;
}

export async function updateTrainingProgress(
  contentId: string,
  updates: {
    completed?: boolean;
    quiz_score?: number;
  }
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check if progress exists
  const existing = await getTrainingProgressByContent(contentId);

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from("training_progress")
      .update({
        ...updates,
        completed_at: updates.completed ? new Date().toISOString() : existing.completed_at,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return data as TrainingProgress;
  } else {
    // Create new
    const { data, error } = await supabase
      .from("training_progress")
      .insert({
        user_id: user.id,
        content_id: contentId,
        completed: updates.completed || false,
        quiz_score: updates.quiz_score,
        completed_at: updates.completed ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as TrainingProgress;
  }
}

export async function markTrainingComplete(contentId: string, quizScore?: number) {
  return updateTrainingProgress(contentId, {
    completed: true,
    quiz_score: quizScore,
  });
}

// ============================================
// TRAINING WITH PROGRESS
// ============================================

export async function getTrainingContentWithProgress(): Promise<TrainingContentWithProgress[]> {
  const [content, progress] = await Promise.all([
    getTrainingContent(),
    getUserTrainingProgress(),
  ]);

  const progressMap = new Map(progress.map(p => [p.content_id, p]));

  // Identify "App Overview" modules - these are always available (never locked)
  const isAppOverviewModule = (title: string) => 
    title.toLowerCase().includes("app overview");

  // Determine status based on order and completion
  const result: TrainingContentWithProgress[] = [];
  let previousCompleted = true;

  for (const item of content) {
    const itemProgress = progressMap.get(item.id);
    let status: TrainingContentWithProgress["status"];

    if (itemProgress?.completed) {
      status = "completed";
    } else if (itemProgress) {
      status = "in_progress";
    } else if (previousCompleted || isAppOverviewModule(item.title)) {
      // App Overview modules are always available, regardless of prior completion
      status = "available";
    } else {
      status = "locked";
    }

    result.push({
      ...item,
      progress: itemProgress || undefined,
      status,
    });

    // Update previousCompleted for next iteration
    // App Overview modules don't affect the lock chain for other modules
    if (!isAppOverviewModule(item.title)) {
      previousCompleted = itemProgress?.completed || false;
    }
  }

  return result;
}

export async function getOverallTrainingProgress() {
  const contentWithProgress = await getTrainingContentWithProgress();
  
  const total = contentWithProgress.length;
  const completed = contentWithProgress.filter(c => c.status === "completed").length;
  const inProgress = contentWithProgress.filter(c => c.status === "in_progress").length;
  
  return {
    total,
    completed,
    inProgress,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

