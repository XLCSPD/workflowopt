import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types";

type UpdateAdminUserBody = {
  name?: string;
  role?: UserRole;
  org_id?: string | null;
  disabled?: boolean;
};

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", authUser.id)
    .single();

  if (error || !profile) {
    return { ok: false as const, response: NextResponse.json({ error: "User profile not found" }, { status: 404 }) };
  }

  if (profile.role !== "admin") {
    return { ok: false as const, response: NextResponse.json({ error: "Only admins can access this resource" }, { status: 403 }) };
  }

  return { ok: true as const, authUserId: authUser.id };
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.ok) return adminCheck.response;

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as UpdateAdminUserBody;

    const updates: Record<string, unknown> = {};
    if (typeof body.name === "string") updates.name = body.name.trim();
    if (typeof body.role === "string") updates.role = body.role;
    if ("org_id" in body) updates.org_id = body.org_id ?? null;

    const adminSupabase = createAdminSupabaseClient();

    // Update app profile (public.users)
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await adminSupabase.from("users").update(updates).eq("id", id);
      if (updateError) {
        console.error("Admin user update error:", updateError);
        return NextResponse.json({ error: "Failed to update user profile" }, { status: 500 });
      }
    }

    // Disable/enable login via auth ban.
    // Use a long ban duration for \"disabled\". Unban via 'none'.
    if (typeof body.disabled === "boolean") {
      const ban_duration = body.disabled ? "87600h" : "none"; // ~10 years
      const { error: authError } = await adminSupabase.auth.admin.updateUserById(id, {
        ban_duration,
      });
      if (authError) {
        console.error("Admin auth update error:", authError);
        return NextResponse.json({ error: "Failed to update user auth status" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin user update error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

