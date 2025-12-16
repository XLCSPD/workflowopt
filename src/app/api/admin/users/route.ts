import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types";

type AdminUserRow = {
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
};

function clampInt(value: string | null, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

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

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.ok) return adminCheck.response;

    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();
    const orgId = (url.searchParams.get("orgId") || "").trim();
    const page = clampInt(url.searchParams.get("page"), 1, 1, 10_000);
    const perPage = clampInt(url.searchParams.get("perPage"), 25, 1, 25); // keep auth lookups bounded

    const adminSupabase = createAdminSupabaseClient();

    // Base query from public.users (source of app roles + org assignment)
    let query = adminSupabase
      .from("users")
      .select(
        "id,name,email,role,org_id,created_at,updated_at,organizations(name)",
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (q) {
      // Search name OR email (case-insensitive)
      // Note: commas separate OR conditions in supabase filter syntax.
      query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
    }

    if (orgId) {
      query = query.eq("org_id", orgId);
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data: users, error, count } = await query.range(from, to);
    if (error) {
      console.error("Admin users list error:", error);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    // Enrich with auth metadata (ban + last sign-in). Supabase auth admin lacks batch lookup by ids,
    // so we do bounded per-page lookups.
    const authLookups = await Promise.all(
      (users || []).map(async (u) => {
        const { data, error: authErr } = await adminSupabase.auth.admin.getUserById(u.id);
        if (authErr) {
          return { id: u.id, banned_until: null, last_sign_in_at: null };
        }
        const authUser =
          (data.user as unknown as { banned_until?: string | null; last_sign_in_at?: string | null } | null) ??
          null;
        return {
          id: u.id,
          banned_until: authUser?.banned_until ?? null,
          last_sign_in_at: authUser?.last_sign_in_at ?? null,
        };
      })
    );
    const authById = new Map(authLookups.map((a) => [a.id, a]));

    const rows: AdminUserRow[] = (users || []).map((u) => {
      const orgName = (u as unknown as { organizations?: { name?: string } | null }).organizations?.name ?? null;
      const auth = authById.get(u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        org_id: u.org_id ?? null,
        org_name: orgName,
        created_at: u.created_at,
        updated_at: u.updated_at,
        banned_until: auth?.banned_until ?? null,
        last_sign_in_at: auth?.last_sign_in_at ?? null,
      };
    });

    return NextResponse.json({
      users: rows,
      page,
      perPage,
      total: count ?? rows.length,
    });
  } catch (e) {
    console.error("Admin users list error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

