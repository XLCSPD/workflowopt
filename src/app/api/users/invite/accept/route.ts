import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type AcceptInviteBody = {
  invitationId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Prefer the user's chosen/display name from auth metadata (set during invite acceptance).
    // We'll mirror it into public.users so names reliably show up in joins (e.g. observations.user).
    const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
    const metaNameRaw =
      (typeof meta.name === "string" && meta.name) ||
      (typeof meta.full_name === "string" && meta.full_name) ||
      (typeof meta.display_name === "string" && meta.display_name) ||
      "";
    const metaName = metaNameRaw.trim() ? metaNameRaw.trim() : undefined;

    const body = (await request.json().catch(() => ({}))) as AcceptInviteBody;

    const invitationIdFromMeta =
      (authUser.user_metadata as Record<string, unknown> | null | undefined)?.invitation_id;
    const invitationId =
      typeof body.invitationId === "string"
        ? body.invitationId
        : typeof invitationIdFromMeta === "string"
          ? invitationIdFromMeta
          : undefined;

    const adminSupabase = createAdminSupabaseClient();

    // Find the invitation to accept. If we have an ID, prefer it; otherwise fallback to email.
    const { data: invitation, error: invitationError } = invitationId
      ? await adminSupabase
          .from("user_invitations")
          .select("id, email, role, org_id, status")
          .eq("id", invitationId)
          .single()
      : await adminSupabase
          .from("user_invitations")
          .select("id, email, role, org_id, status")
          .eq("email", authUser.email)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

    if (invitationError) {
      return NextResponse.json({ error: "Failed to find invitation" }, { status: 500 });
    }

    if (!invitation) {
      return NextResponse.json(
        { error: "No pending invitation found for this account" },
        { status: 404 }
      );
    }

    if (invitation.email.toLowerCase() !== authUser.email.toLowerCase()) {
      return NextResponse.json({ error: "Invitation does not match user" }, { status: 403 });
    }

    // Mark as accepted (idempotent)
    const { error: acceptError } = await adminSupabase
      .from("user_invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id)
      .eq("email", authUser.email);

    if (acceptError) {
      return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
    }

    // Ensure public.users has org_id/role aligned to the invitation.
    // This covers edge cases where the trigger didn't populate org_id or role.
    const { error: userUpdateError } = await adminSupabase
      .from("users")
      .update({
        org_id: invitation.org_id ?? null,
        role: invitation.role ?? "participant",
        ...(metaName ? { name: metaName } : {}),
      })
      .eq("id", authUser.id);

    if (userUpdateError) {
      return NextResponse.json(
        { error: "Invitation accepted, but failed to update user profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Accept invite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

