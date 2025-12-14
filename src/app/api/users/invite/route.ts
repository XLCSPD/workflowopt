import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { rateLimit, inviteRateLimit } from "@/lib/rate-limit";
import type { UserRole } from "@/types";

interface InviteRequest {
  email: string;
  role?: UserRole;
}

export async function POST(request: NextRequest) {
  try {
    // Get user for rate limiting
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Apply rate limiting
    const rateLimitResult = rateLimit(authUser.id, inviteRateLimit);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: `Rate limit exceeded. Please try again in ${rateLimitResult.reset} seconds.`,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
            "Retry-After": rateLimitResult.reset.toString(),
          },
        }
      );
    }

    // Parse request body
    const body: InviteRequest = await request.json();
    const { email, role = "participant" } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    // Get current user's profile to check permissions and org
    const { data: currentUser, error: userError } = await supabase
      .from("users")
      .select("id, role, org_id")
      .eq("id", authUser.id)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Only admins can invite users
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can invite users" },
        { status: 403 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, email, org_id")
      .eq("email", email)
      .single();

    if (existingUser) {
      // User exists - check if they're already in an org
      if (existingUser.org_id) {
        return NextResponse.json(
          { error: "User is already part of an organization" },
          { status: 400 }
        );
      }

      // Add existing user to current org
      const { error: updateError } = await supabase
        .from("users")
        .update({ org_id: currentUser.org_id, role })
        .eq("id", existingUser.id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to add user to organization" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "User added to organization",
        userId: existingUser.id,
      });
    }

    // User doesn't exist - send invitation email using admin client
    try {
      const adminSupabase = createAdminSupabaseClient();

      // Create pending invitation record
      const { data: invitation, error: inviteRecordError } = await supabase
        .from("user_invitations")
        .insert({
          email,
          role,
          org_id: currentUser.org_id,
          invited_by: currentUser.id,
          status: "pending",
        })
        .select()
        .single();

      if (inviteRecordError) {
        console.error("Failed to create invitation record:", inviteRecordError);
        // Continue anyway - the invitation can still be sent
      }

      // Send invitation email
      const { error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            role,
            org_id: currentUser.org_id,
            invitation_id: invitation?.id,
          },
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/register`,
        }
      );

      if (inviteError) {
        // Update invitation status to failed
        if (invitation) {
          await supabase
            .from("user_invitations")
            .update({ status: "failed" })
            .eq("id", invitation.id);
        }

        console.error("Failed to send invitation:", inviteError);
        return NextResponse.json(
          { error: inviteError.message || "Failed to send invitation email" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Invitation sent successfully",
        invitationId: invitation?.id,
      });
    } catch (adminError) {
      console.error("Admin client error:", adminError);
      return NextResponse.json(
        {
          error: "Email invitations require server configuration. Please ensure SUPABASE_SERVICE_ROLE_KEY is set.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Invite user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to list pending invitations
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get current user's org
    const { data: currentUser } = await supabase
      .from("users")
      .select("org_id, role")
      .eq("id", authUser.id)
      .single();

    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can view invitations" },
        { status: 403 }
      );
    }

    // Get pending invitations for the org
    const { data: invitations, error } = await supabase
      .from("user_invitations")
      .select(`
        id,
        email,
        role,
        status,
        created_at,
        invited_by,
        inviter:users!user_invitations_invited_by_fkey(name)
      `)
      .eq("org_id", currentUser.org_id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch invitations" },
        { status: 500 }
      );
    }

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error("Get invitations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE endpoint to cancel an invitation
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("id");

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify user is admin
    const { data: currentUser } = await supabase
      .from("users")
      .select("org_id, role")
      .eq("id", authUser.id)
      .single();

    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can cancel invitations" },
        { status: 403 }
      );
    }

    // Delete the invitation (only if it belongs to the same org)
    const { error } = await supabase
      .from("user_invitations")
      .delete()
      .eq("id", invitationId)
      .eq("org_id", currentUser.org_id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to cancel invitation" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Invitation cancelled",
    });
  } catch (error) {
    console.error("Delete invitation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

