import { getSupabaseClient } from "@/lib/supabase/client";
import { getWasteDistribution, getWasteByLane, getTopHotspots } from "./analytics";
import { getSessionObservationSummary } from "./observations";
import type { WasteDistribution, LaneStats, TopHotspot } from "./analytics";

const supabase = getSupabaseClient();

export interface SessionComparisonData {
  sessionId: string;
  sessionName: string;
  processName: string;
  createdAt: string;
  observationCount: number;
  avgPriority: number;
  digitalPercentage: number;
  wasteDistribution: WasteDistribution[];
  laneStats: LaneStats[];
  topHotspots: TopHotspot[];
}

export interface ComparisonResult {
  sessions: SessionComparisonData[];
  improvementMetrics: {
    observationChange: number;
    priorityChange: number;
    digitalChange: number;
    topImprovements: string[];
    topDeclines: string[];
  };
}

// ============================================
// SESSION COMPARISON
// ============================================

// ---------------------------------------------------------------------------
// Backwards-compatible APIs (used by unit tests)
// ---------------------------------------------------------------------------

type ObservationForCompare = {
  priority_score: number;
  is_digital: boolean;
  is_physical: boolean;
  observation_waste_links?: { waste_type?: { id: string; name: string } }[];
};

export interface SessionMetricsForCompare {
  totalObservations: number;
  avgPriority: number;
  digitalPercentage: number;
  topWasteTypes: { name: string; count: number }[];
}

export interface SessionMetricsComparison {
  session1: SessionMetricsForCompare;
  session2: SessionMetricsForCompare;
  differences: {
    observationsDelta: number;
    priorityDelta: number;
    digitalDelta: number;
  };
}

function computeMetrics(observations: ObservationForCompare[]): SessionMetricsForCompare {
  const total = observations.length;
  const avgPriority =
    total === 0
      ? 0
      : observations.reduce((sum, o) => sum + (o.priority_score || 0), 0) / total;

  const digitalCount = observations.filter((o) => !!o.is_digital).length;
  const digitalPercentage = total === 0 ? 0 : (digitalCount / total) * 100;

  const wasteCounts = new Map<string, number>();
  observations.forEach((o) => {
    (o.observation_waste_links || []).forEach((link) => {
      const name = link?.waste_type?.name;
      if (!name) return;
      wasteCounts.set(name, (wasteCounts.get(name) || 0) + 1);
    });
  });

  const topWasteTypes = Array.from(wasteCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalObservations: total,
    avgPriority,
    digitalPercentage,
    topWasteTypes,
  };
}

function percentDelta(before: number, after: number): number {
  if (before === 0) return after > 0 ? 100 : 0;
  return ((after - before) / before) * 100;
}

export async function compareSessionMetrics(
  session1Id: string,
  session2Id: string
): Promise<SessionMetricsComparison> {
  const { data: obs1, error: err1 } = await supabase
    .from("observations")
    .select("priority_score,is_digital,is_physical,observation_waste_links(waste_type(id,name))")
    .eq("session_id", session1Id);
  if (err1) throw err1;

  const { data: obs2, error: err2 } = await supabase
    .from("observations")
    .select("priority_score,is_digital,is_physical,observation_waste_links(waste_type(id,name))")
    .eq("session_id", session2Id);
  if (err2) throw err2;

  const session1 = computeMetrics((obs1 as unknown as ObservationForCompare[]) || []);
  const session2 = computeMetrics((obs2 as unknown as ObservationForCompare[]) || []);

  return {
    session1,
    session2,
    differences: {
      observationsDelta: percentDelta(session1.totalObservations, session2.totalObservations),
      priorityDelta: session2.avgPriority - session1.avgPriority,
      digitalDelta: session2.digitalPercentage - session1.digitalPercentage,
    },
  };
}

export function getComparisonSuggestions(metrics: SessionMetricsComparison): string[] {
  const suggestions: string[] = [];
  const { observationsDelta, priorityDelta, digitalDelta } = metrics.differences;

  if (observationsDelta < 0) suggestions.push("Fewer observations were recorded, indicating reduced waste detection or improved process flow.");
  if (observationsDelta > 0) suggestions.push("More observations were recorded; review hotspots and prioritize high-impact waste types.");

  if (priorityDelta < 0) suggestions.push("Average priority decreased; continue reinforcing the improvements that lowered severity.");
  if (priorityDelta > 0) suggestions.push("Average priority increased; focus on the highest-priority waste drivers first.");

  if (digitalDelta > 10) suggestions.push("Digital waste increased noticeably; examine handoffs, rework loops, and system friction.");
  if (digitalDelta < -10) suggestions.push("Digital waste decreased; standardize the changes that reduced digital friction.");

  return suggestions;
}

export async function getSessionComparisonData(sessionId: string): Promise<SessionComparisonData> {
  // Get session details
  const { data: session, error } = await supabase
    .from("sessions")
    .select(`
      *,
      process:processes(name)
    `)
    .eq("id", sessionId)
    .single();

  if (error) throw error;

  // Get all metrics
  const [summary, distribution, lanes, hotspots] = await Promise.all([
    getSessionObservationSummary(sessionId),
    getWasteDistribution(sessionId),
    getWasteByLane(sessionId),
    getTopHotspots(sessionId, 5),
  ]);

  return {
    sessionId,
    sessionName: session.name,
    processName: session.process?.name || "Unknown Process",
    createdAt: session.created_at,
    observationCount: summary.totalCount,
    avgPriority: summary.avgPriority,
    digitalPercentage: summary.digitalPercentage,
    wasteDistribution: distribution,
    laneStats: lanes,
    topHotspots: hotspots,
  };
}

export async function compareSessions(sessionIds: string[]): Promise<ComparisonResult> {
  // Get data for all sessions
  const sessionsData = await Promise.all(
    sessionIds.map((id) => getSessionComparisonData(id))
  );

  // Sort by creation date
  sessionsData.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Calculate improvement metrics if we have at least 2 sessions
  const improvementMetrics = {
    observationChange: 0,
    priorityChange: 0,
    digitalChange: 0,
    topImprovements: [] as string[],
    topDeclines: [] as string[],
  };

  if (sessionsData.length >= 2) {
    const first = sessionsData[0];
    const last = sessionsData[sessionsData.length - 1];

    improvementMetrics.observationChange = last.observationCount - first.observationCount;
    improvementMetrics.priorityChange = last.avgPriority - first.avgPriority;
    improvementMetrics.digitalChange = last.digitalPercentage - first.digitalPercentage;

    // Find improvements and declines in waste types
    const firstWasteMap = new Map(first.wasteDistribution.map(w => [w.name, w.percentage]));
    const lastWasteMap = new Map(last.wasteDistribution.map(w => [w.name, w.percentage]));

    const allWasteTypes = new Set([...Array.from(firstWasteMap.keys()), ...Array.from(lastWasteMap.keys())]);
    const changes: { name: string; change: number }[] = [];

    allWasteTypes.forEach((name) => {
      const firstPct = firstWasteMap.get(name) || 0;
      const lastPct = lastWasteMap.get(name) || 0;
      changes.push({ name, change: lastPct - firstPct });
    });

    // Sort to find top improvements (decrease in waste) and declines (increase in waste)
    changes.sort((a, b) => a.change - b.change);
    
    improvementMetrics.topImprovements = changes
      .filter(c => c.change < 0)
      .slice(0, 3)
      .map(c => `${c.name}: ${Math.abs(c.change).toFixed(1)}% decrease`);

    improvementMetrics.topDeclines = changes
      .filter(c => c.change > 0)
      .slice(-3)
      .reverse()
      .map(c => `${c.name}: ${c.change.toFixed(1)}% increase`);
  }

  return {
    sessions: sessionsData,
    improvementMetrics,
  };
}

// ============================================
// SESSION LISTS FOR COMPARISON
// ============================================

export async function getComparableSessions(processId?: string) {
  let query = supabase
    .from("sessions")
    .select(`
      id,
      name,
      status,
      created_at,
      process:processes(id, name)
    `)
    .in("status", ["completed", "active"])
    .order("created_at", { ascending: false });

  if (processId) {
    query = query.eq("process_id", processId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data;
}

export async function getProcessesWithSessions() {
  const { data, error } = await supabase
    .from("processes")
    .select(`
      id,
      name,
      sessions:sessions(count)
    `);

  if (error) throw error;

  // Filter to only processes with sessions
  return data?.filter((p: { sessions?: { count: number }[] }) => (p.sessions?.[0]?.count ?? 0) > 0) || [];
}

