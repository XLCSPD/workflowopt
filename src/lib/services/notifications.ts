import { getSupabaseClient } from "@/lib/supabase/client";

const supabase = getSupabaseClient();

// ============================================
// TYPES
// ============================================

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "session_started" | "session_ended" | "observation_added" | "invitation" | "system";
  read: boolean;
  data?: Record<string, unknown>;
  created_at: string;
}

export interface NotificationPreferences {
  session_updates: boolean;
  observation_updates: boolean;
  invitation_updates: boolean;
  browser_notifications: boolean;
}

// ============================================
// BROWSER NOTIFICATION PERMISSION
// ============================================

/**
 * Check if browser notifications are supported
 */
export function isBrowserNotificationSupported(): boolean {
  return "Notification" in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isBrowserNotificationSupported()) {
    return "unsupported";
  }
  return Notification.permission;
}

/**
 * Request permission for browser notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isBrowserNotificationSupported()) {
    return "unsupported";
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Show a browser notification
 */
export function showBrowserNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    data?: Record<string, unknown>;
    onClick?: () => void;
  }
): void {
  if (!isBrowserNotificationSupported() || Notification.permission !== "granted") {
    return;
  }

  const notification = new Notification(title, {
    body: options?.body,
    icon: options?.icon || "/favicon.ico",
    tag: options?.tag,
    data: options?.data,
  });

  if (options?.onClick) {
    notification.onclick = () => {
      window.focus();
      options.onClick?.();
      notification.close();
    };
  }

  // Auto close after 5 seconds
  setTimeout(() => notification.close(), 5000);
}

// ============================================
// DATABASE NOTIFICATIONS
// ============================================

/**
 * Get notifications for the current user
 */
export async function getNotifications(limit = 20): Promise<Notification[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch notifications:", error);
    return [];
  }

  return data || [];
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) return 0;
  return count || 0;
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);

  if (error) {
    console.error("Failed to mark notification as read:", error);
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) {
    console.error("Failed to mark all notifications as read:", error);
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) {
    console.error("Failed to delete notification:", error);
  }
}

/**
 * Delete all read notifications
 */
export async function deleteReadNotifications(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", user.id)
    .eq("read", true);

  if (error) {
    console.error("Failed to delete read notifications:", error);
  }
}

// ============================================
// NOTIFICATION PREFERENCES
// ============================================

const DEFAULT_PREFERENCES: NotificationPreferences = {
  session_updates: true,
  observation_updates: true,
  invitation_updates: true,
  browser_notifications: false,
};

/**
 * Get notification preferences for the current user
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return DEFAULT_PREFERENCES;

  const { data, error } = await supabase
    .from("user_notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return DEFAULT_PREFERENCES;
  }

  return {
    session_updates: data.session_updates ?? DEFAULT_PREFERENCES.session_updates,
    observation_updates: data.observation_updates ?? DEFAULT_PREFERENCES.observation_updates,
    invitation_updates: data.invitation_updates ?? DEFAULT_PREFERENCES.invitation_updates,
    browser_notifications: data.browser_notifications ?? DEFAULT_PREFERENCES.browser_notifications,
  };
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("user_notification_preferences")
    .upsert({
      user_id: user.id,
      ...preferences,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (error) {
    console.error("Failed to update notification preferences:", error);
    throw error;
  }
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to realtime notifications
 */
export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: Notification) => void
) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload: { new: Record<string, unknown> }) => {
        onNotification(payload.new as unknown as Notification);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================
// NOTIFICATION CREATION (for use in other services)
// ============================================

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: Notification["type"];
  data?: Record<string, unknown>;
}

/**
 * Create a notification for a user
 * This is typically called from server-side code or Edge Functions
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<Notification | null> {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
      data: input.data,
      read: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create notification:", error);
    return null;
  }

  return data;
}

/**
 * Notify session participants of an event
 */
export async function notifySessionParticipants(
  sessionId: string,
  title: string,
  message: string,
  type: Notification["type"],
  excludeUserId?: string
): Promise<void> {
  // Get session participants
  const { data: participants } = await supabase
    .from("session_participants")
    .select("user_id")
    .eq("session_id", sessionId);

  if (!participants || participants.length === 0) return;

  const notifications = participants
    .filter((p: { user_id: string }) => p.user_id !== excludeUserId)
    .map((p: { user_id: string }) => ({
      user_id: p.user_id,
      title,
      message,
      type,
      data: { session_id: sessionId },
      read: false,
    }));

  if (notifications.length === 0) return;

  const { error } = await supabase.from("notifications").insert(notifications);

  if (error) {
    console.error("Failed to notify participants:", error);
  }
}

