import { getSupabaseClient } from "@/lib/supabase/client";
import type { Organization, User, UserRole } from "@/types";

const supabase = getSupabaseClient();

// ============================================
// USER QUERIES
// ============================================

export async function getOrganizationUsers(): Promise<User[]> {
  // First get the current user's org_id
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) throw new Error("Not authenticated");

  const { data: currentUser, error: currentUserError } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", authUser.id)
    .single();

  if (currentUserError) throw currentUserError;

  // If user has no org, return just the current user
  if (!currentUser?.org_id) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id);
    
    if (error) throw error;
    return data || [];
  }

  // Get all users in the same organization
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("org_id", currentUser.org_id)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;

  return getUserById(authUser.id);
}

// ============================================
// USER MUTATIONS
// ============================================

export async function updateUserRole(userId: string, role: UserRole): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, "name" | "avatar_url">>
): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeUserFromOrganization(userId: string): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({ org_id: null })
    .eq("id", userId);

  if (error) throw error;
}

// ============================================
// USER INVITATION (via API route)
// ============================================

export interface InvitationResult {
  success: boolean;
  message: string;
  invitationId?: string;
  userId?: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  status: "pending" | "accepted" | "expired" | "cancelled" | "failed";
  created_at: string;
  invited_by: string;
  inviter?: { name: string };
}

export async function inviteUser(
  email: string, 
  role: UserRole = "participant"
): Promise<InvitationResult> {
  try {
    const response = await fetch("/api/users/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, role }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error || "Failed to send invitation",
      };
    }

    return {
      success: true,
      message: data.message || "Invitation sent successfully",
      invitationId: data.invitationId,
      userId: data.userId,
    };
  } catch (error) {
    console.error("Failed to invite user:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to invite user" 
    };
  }
}

export async function getPendingInvitations(): Promise<Invitation[]> {
  try {
    const response = await fetch("/api/users/invite", {
      method: "GET",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch invitations");
    }

    return data.invitations || [];
  } catch (error) {
    console.error("Failed to fetch invitations:", error);
    return [];
  }
}

export async function cancelInvitation(invitationId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/users/invite?id=${invitationId}`, {
      method: "DELETE",
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to cancel invitation:", error);
    return false;
  }
}

// ============================================
// ADMIN (GLOBAL) USER MANAGEMENT (via API routes)
// ============================================

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  org_id: string | null;
  org_name: string | null;
  created_at: string;
  updated_at: string;
  banned_until: string | null;
  last_sign_in_at: string | null;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  page: number;
  perPage: number;
  total: number;
}

export async function getAllUsersAdmin(params?: {
  q?: string;
  orgId?: string;
  page?: number;
  perPage?: number;
}): Promise<AdminUsersResponse> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.orgId) qs.set("orgId", params.orgId);
  if (typeof params?.page === "number") qs.set("page", String(params.page));
  if (typeof params?.perPage === "number") qs.set("perPage", String(params.perPage));

  const res = await fetch(`/api/admin/users?${qs.toString()}`, { method: "GET" });
  const data = (await res.json().catch(() => ({}))) as Partial<AdminUsersResponse> & {
    error?: string;
  };

  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch users");
  }

  return {
    users: data.users || [],
    page: data.page || 1,
    perPage: data.perPage || 25,
    total: data.total ?? (data.users?.length || 0),
  };
}

export async function updateUserAdmin(
  userId: string,
  updates: Partial<Pick<AdminUser, "name" | "role" | "org_id">> & { disabled?: boolean }
): Promise<boolean> {
  const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Failed to update user");
  }

  return true;
}

export async function getAllOrganizationsAdmin(): Promise<Organization[]> {
  const res = await fetch("/api/admin/organizations", { method: "GET" });
  const data = (await res.json().catch(() => ({}))) as { organizations?: Organization[]; error?: string };
  if (!res.ok) throw new Error(data.error || "Failed to fetch organizations");
  return data.organizations || [];
}

// ============================================
// ROLE HELPERS
// ============================================

export function getRoleBadgeVariant(role: UserRole): "default" | "secondary" | "destructive" | "outline" {
  switch (role) {
    case "admin":
      return "default";
    case "facilitator":
      return "secondary";
    case "participant":
    default:
      return "outline";
  }
}

export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "facilitator":
      return "Facilitator";
    case "participant":
      return "Participant";
    default:
      return role;
  }
}

