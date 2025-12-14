import { getSupabaseClient } from "@/lib/supabase/client";
import { getWasteTypes } from "./wasteTypes";

const supabase = getSupabaseClient();

export interface WasteDistribution {
  name: string;
  code: string;
  count: number;
  percentage: number;
  color: string;
}

export interface LaneStats {
  lane: string;
  observations: number;
  priority: number;
  digital: number;
  physical: number;
}

export interface TopHotspot {
  rank: number;
  step_id: string;
  step_name: string;
  lane: string;
  waste_types: string[];
  priority_score: number;
  observation_count: number;
  effort: "low" | "medium" | "high";
}

export interface Insight {
  id: string;
  type: "quick_win" | "hotspot" | "trend";
  title: string;
  description: string;
  step?: string;
  impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
}

// ============================================
// ANALYTICS QUERIES
// ============================================

export async function getWasteDistribution(sessionId?: string) {
  const wasteTypes = await getWasteTypes();
  
  let query = supabase
    .from("observation_waste_links")
    .select(`
      waste_type_id,
      observation:observations!inner(session_id)
    `);

  if (sessionId) {
    query = query.eq("observation.session_id", sessionId);
  }

  const { data: links, error } = await query;
  if (error) throw error;

  // Count by waste type
  const counts: Record<string, number> = {};
  links?.forEach((link: { waste_type_id: string }) => {
    counts[link.waste_type_id] = (counts[link.waste_type_id] || 0) + 1;
  });

  const total = Object.values(counts).reduce((sum, c) => sum + c, 0);

  const distribution: WasteDistribution[] = wasteTypes
    .map(wt => ({
      name: wt.name,
      code: wt.code,
      count: counts[wt.id] || 0,
      percentage: total > 0 ? Math.round(((counts[wt.id] || 0) / total) * 100) : 0,
      color: wt.color || "#6B7280",
    }))
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count);

  return distribution;
}

export async function getWasteByLane(sessionId?: string) {
  let query = supabase
    .from("observations")
    .select(`
      *,
      step:process_steps!inner(lane)
    `);

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }

  const { data: observations, error } = await query;
  if (error) throw error;

  // Aggregate by lane
  const laneStats: Record<string, LaneStats> = {};

  interface ObservationWithStep {
    step?: { lane: string };
    priority_score: number;
    is_digital: boolean;
    is_physical: boolean;
  }

  observations?.forEach((obs: ObservationWithStep) => {
    const lane = obs.step?.lane || "Unknown";
    if (!laneStats[lane]) {
      laneStats[lane] = { lane, observations: 0, priority: 0, digital: 0, physical: 0 };
    }
    laneStats[lane].observations += 1;
    laneStats[lane].priority += obs.priority_score;
    if (obs.is_digital) laneStats[lane].digital += 1;
    if (obs.is_physical) laneStats[lane].physical += 1;
  });

  return Object.values(laneStats).sort((a, b) => b.priority - a.priority);
}

export async function getTopHotspots(sessionId?: string, limit = 10): Promise<TopHotspot[]> {
  let query = supabase
    .from("observations")
    .select(`
      *,
      step:process_steps!inner(id, step_name, lane)
    `);

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }

  const { data: observations, error } = await query;
  if (error) throw error;

  // Aggregate by step
  const stepStats: Record<string, {
    step_id: string;
    step_name: string;
    lane: string;
    priority_score: number;
    observation_count: number;
    avg_ease: number;
    waste_types: Set<string>;
  }> = {};

  for (const obs of observations || []) {
    const stepId = obs.step?.id;
    if (!stepId) continue;

    if (!stepStats[stepId]) {
      stepStats[stepId] = {
        step_id: stepId,
        step_name: obs.step.step_name,
        lane: obs.step.lane,
        priority_score: 0,
        observation_count: 0,
        avg_ease: 0,
        waste_types: new Set(),
      };
    }

    stepStats[stepId].priority_score += obs.priority_score;
    stepStats[stepId].observation_count += 1;
    stepStats[stepId].avg_ease += obs.ease_score;

    // Get waste types for this observation
    const { data: links } = await supabase
      .from("observation_waste_links")
      .select("waste_type:waste_types(name)")
      .eq("observation_id", obs.id);

    links?.forEach((link: { waste_type?: { name?: string } }) => {
      if (link.waste_type?.name) {
        stepStats[stepId].waste_types.add(link.waste_type.name);
      }
    });
  }

  // Calculate effort based on average ease score
  const hotspots: TopHotspot[] = Object.values(stepStats)
    .map((stat) => {
      const avgEase = stat.observation_count > 0 
        ? stat.avg_ease / stat.observation_count 
        : 3;
      
      let effort: "low" | "medium" | "high";
      if (avgEase >= 4) effort = "low";
      else if (avgEase >= 2.5) effort = "medium";
      else effort = "high";

      return {
        rank: 0,
        step_id: stat.step_id,
        step_name: stat.step_name,
        lane: stat.lane,
        waste_types: Array.from(stat.waste_types),
        priority_score: stat.priority_score,
        observation_count: stat.observation_count,
        effort,
      };
    })
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, limit)
    .map((h, idx) => ({ ...h, rank: idx + 1 }));

  return hotspots;
}

export async function getQuickWins(sessionId?: string, limit = 5): Promise<TopHotspot[]> {
  const hotspots = await getTopHotspots(sessionId, 20);
  
  // Quick wins = high priority + low effort
  return hotspots
    .filter(h => h.effort === "low" && h.priority_score >= 5)
    .slice(0, limit);
}

export async function generateInsights(sessionId?: string): Promise<Insight[]> {
  const [hotspots, distribution, laneStats, quickWins] = await Promise.all([
    getTopHotspots(sessionId, 5),
    getWasteDistribution(sessionId),
    getWasteByLane(sessionId),
    getQuickWins(sessionId),
  ]);

  const insights: Insight[] = [];

  // Quick wins
  quickWins.forEach((qw, idx) => {
    insights.push({
      id: `quick-win-${idx}`,
      type: "quick_win",
      title: `Quick Win: ${qw.step_name}`,
      description: `High impact opportunity with low implementation effort. Priority score: ${qw.priority_score}.`,
      step: qw.step_name,
      impact: qw.priority_score >= 15 ? "high" : qw.priority_score >= 8 ? "medium" : "low",
      effort: qw.effort,
    });
  });

  // Top hotspots
  if (hotspots.length > 0) {
    const top = hotspots[0];
    insights.push({
      id: "hotspot-1",
      type: "hotspot",
      title: `Top Hotspot: ${top.step_name}`,
      description: `Highest priority waste area with ${top.observation_count} observations and a total priority score of ${top.priority_score}.`,
      step: top.step_name,
      impact: "high",
      effort: top.effort,
    });
  }

  // Distribution trends
  if (distribution.length > 0) {
    const topWaste = distribution[0];
    if (topWaste.percentage >= 25) {
      insights.push({
        id: "trend-1",
        type: "trend",
        title: `${topWaste.name} is Dominant`,
        description: `${topWaste.name} waste accounts for ${topWaste.percentage}% of all observations. Consider focused improvement initiatives.`,
        impact: "high",
        effort: "medium",
      });
    }
  }

  // Digital vs Physical
  const digitalLane = laneStats.reduce((sum, l) => sum + l.digital, 0);
  const physicalLane = laneStats.reduce((sum, l) => sum + l.physical, 0);
  const totalObs = digitalLane + physicalLane;
  
  if (totalObs > 0) {
    const digitalPercentage = Math.round((digitalLane / totalObs) * 100);
    if (digitalPercentage >= 60) {
      insights.push({
        id: "trend-2",
        type: "trend",
        title: "Predominantly Digital Waste",
        description: `${digitalPercentage}% of waste is digital in nature. Focus on system integration and automation improvements.`,
        impact: "medium",
        effort: "medium",
      });
    }
  }

  return insights;
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getDashboardStats() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get user's org_id
  const { data: userProfile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  const orgId = userProfile?.org_id;

  // Workflows count
  let workflowQuery = supabase.from("processes").select("id", { count: "exact" });
  if (orgId) workflowQuery = workflowQuery.eq("org_id", orgId);
  const { count: workflowCount } = await workflowQuery;

  // Active sessions count
  const sessionQuery = supabase
    .from("sessions")
    .select("id", { count: "exact" })
    .eq("status", "active");
  const { count: activeSessionCount } = await sessionQuery;

  // Total observations
  const { count: observationCount } = await supabase
    .from("observations")
    .select("id", { count: "exact" });

  // Training progress
  const { data: allContent } = await supabase
    .from("training_content")
    .select("id");
  
  const { data: completedProgress } = await supabase
    .from("training_progress")
    .select("id")
    .eq("user_id", user.id)
    .eq("completed", true);

  const trainingProgress = allContent && allContent.length > 0
    ? Math.round(((completedProgress?.length || 0) / allContent.length) * 100)
    : 0;

  return {
    trainingProgress,
    totalWorkflows: workflowCount || 0,
    activeSessions: activeSessionCount || 0,
    wasteIdentified: observationCount || 0,
  };
}

export async function getRecentSessions(limit = 5) {
  const { data, error } = await supabase
    .from("sessions")
    .select(`
      *,
      process:processes(name)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  // Get participant counts
  interface SessionData {
    id: string;
    name: string;
    status: string;
    created_at: string;
    process?: { name: string };
  }

  const sessionsWithCounts = await Promise.all(
    (data || []).map(async (session: SessionData) => {
      const { count } = await supabase
        .from("session_participants")
        .select("id", { count: "exact" })
        .eq("session_id", session.id);

      return {
        ...session,
        participant_count: count || 0,
        workflow_name: session.process?.name || "Unknown Workflow",
      };
    })
  );

  return sessionsWithCounts;
}

