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

