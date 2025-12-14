import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// ============================================
// Types
// ============================================

interface OfflineObservation {
  id: string;
  session_id: string;
  step_id: string;
  notes?: string;
  is_digital: boolean;
  is_physical: boolean;
  frequency_score: number;
  impact_score: number;
  ease_score: number;
  waste_type_ids: string[];
  created_at: string;
}

interface SyncRequest {
  observations: OfflineObservation[];
}

interface SyncResult {
  synced: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

// ============================================
// POST - Sync offline observations
// ============================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SyncRequest = await request.json();
    const { observations } = body;

    if (!observations || !Array.isArray(observations)) {
      return NextResponse.json(
        { error: "Invalid request: observations array required" },
        { status: 400 }
      );
    }

    if (observations.length === 0) {
      return NextResponse.json({ synced: 0, failed: 0, errors: [] });
    }

    // Validate all observations belong to accessible sessions
    const sessionIds = Array.from(new Set(observations.map((o) => o.session_id)));
    const { data: accessibleSessions } = await supabase
      .from("sessions")
      .select("id")
      .in("id", sessionIds);

    const accessibleSessionIds = new Set(
      accessibleSessions?.map((s) => s.id) || []
    );

    const result: SyncResult = {
      synced: 0,
      failed: 0,
      errors: [],
    };

    // Process each observation
    for (const obs of observations) {
      try {
        // Check session access
        if (!accessibleSessionIds.has(obs.session_id)) {
          result.failed++;
          result.errors.push({
            id: obs.id,
            error: "Session not accessible",
          });
          continue;
        }

        // Validate scores
        if (
          obs.frequency_score < 1 ||
          obs.frequency_score > 5 ||
          obs.impact_score < 1 ||
          obs.impact_score > 5 ||
          obs.ease_score < 1 ||
          obs.ease_score > 5
        ) {
          result.failed++;
          result.errors.push({
            id: obs.id,
            error: "Invalid score values (must be 1-5)",
          });
          continue;
        }

        // Check for duplicate (already synced)
        const { data: existing } = await supabase
          .from("observations")
          .select("id")
          .eq("id", obs.id)
          .single();

        if (existing) {
          // Already exists, skip
          result.synced++;
          continue;
        }

        // Insert observation
        const { data: newObs, error: obsError } = await supabase
          .from("observations")
          .insert({
            id: obs.id,
            session_id: obs.session_id,
            step_id: obs.step_id,
            user_id: user.id,
            notes: obs.notes,
            is_digital: obs.is_digital,
            is_physical: obs.is_physical,
            frequency_score: obs.frequency_score,
            impact_score: obs.impact_score,
            ease_score: obs.ease_score,
            created_at: obs.created_at,
          })
          .select()
          .single();

        if (obsError) {
          result.failed++;
          result.errors.push({
            id: obs.id,
            error: obsError.message,
          });
          continue;
        }

        // Insert waste type links
        if (obs.waste_type_ids && obs.waste_type_ids.length > 0) {
          const wasteLinks = obs.waste_type_ids.map((wasteTypeId) => ({
            observation_id: newObs.id,
            waste_type_id: wasteTypeId,
          }));

          const { error: linkError } = await supabase
            .from("observation_waste_links")
            .insert(wasteLinks);

          if (linkError) {
            console.error("Failed to insert waste links:", linkError);
            // Don't fail the whole observation, just log
          }
        }

        result.synced++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          id: obs.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync observations" },
      { status: 500 }
    );
  }
}

// ============================================
// GET - Get pending observations for user
// ============================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("session_id");

    let query = supabase
      .from("observations")
      .select(
        `
        *,
        observation_waste_links(waste_type_id)
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (sessionId) {
      query = query.eq("session_id", sessionId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch observations:", error);
      return NextResponse.json(
        { error: "Failed to fetch observations" },
        { status: 500 }
      );
    }

    // Transform to include waste_type_ids array
    const observations = data?.map((obs) => ({
      ...obs,
      waste_type_ids: obs.observation_waste_links?.map(
        (link: { waste_type_id: string }) => link.waste_type_id
      ) || [],
    }));

    return NextResponse.json({ observations });
  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch observations" },
      { status: 500 }
    );
  }
}

