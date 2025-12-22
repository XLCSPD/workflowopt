import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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

  return { ok: true as const };
}

export async function GET() {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.ok) return adminCheck.response;

    const adminSupabase = createAdminSupabaseClient();
    const { data, error } = await adminSupabase
      .from("organizations")
      .select("id,name,created_at,updated_at")
      .order("name", { ascending: true });

    if (error) {
      console.error("Admin organizations list error:", error);
      return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 });
    }

    return NextResponse.json({ organizations: data || [] });
  } catch (e) {
    console.error("Admin organizations list error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}




