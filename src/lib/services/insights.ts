import { getSupabaseClient } from "@/lib/supabase/client";
import type { WasteType } from "@/types";

const supabase = getSupabaseClient();

// ============================================
// TYPES
// ============================================

export interface InsightRecommendation {
  id: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  effort: "quick_win" | "easy" | "moderate" | "significant";
  category: "process" | "waste_reduction" | "digital_optimization" | "training";
  wasteTypes?: string[];
  affectedSteps?: string[];
  suggestedActions: string[];
}

export interface SessionInsights {
  sessionId: string;
  generatedAt: string;
  summary: {
    totalObservations: number;
    avgPriority: number;
    topWasteType: string;
    improvementPotential: "high" | "medium" | "low";
  };
  recommendations: InsightRecommendation[];
  keyFindings: string[];
  riskAreas: string[];
}

// ============================================
// INSIGHT GENERATION (Client-side)
// ============================================

/**
 * Generate AI-powered insights from session data
 * Uses server-side API for LLM processing
 */
export async function generateSessionInsights(
  sessionId: string
): Promise<SessionInsights | null> {
  try {
    const response = await fetch("/api/insights/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to generate insights");
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to generate insights:", error);
    return null;
  }
}

/**
 * Get cached insights for a session if they exist
 */
export async function getCachedInsights(
  sessionId: string
): Promise<SessionInsights | null> {
  try {
    const { data, error } = await supabase
      .from("session_insights")
      .select("insights, created_at")
      .eq("session_id", sessionId)
      .single();

    if (error || !data) return null;

    // Check if insights are still fresh (less than 24 hours old)
    const createdAt = new Date(data.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      return null; // Insights are stale
    }

    return data.insights as SessionInsights;
  } catch {
    return null;
  }
}

// ============================================
// LOCAL INSIGHT GENERATION (Fallback)
// ============================================

interface ObservationData {
  id: string;
  notes: string | null;
  is_digital: boolean;
  is_physical: boolean;
  priority_score: number | null;
  frequency_score: number | null;
  impact_score: number | null;
  ease_score: number | null;
  step: { step_name: string; lane: string } | null;
  waste_types: WasteType[];
}

/**
 * Generate basic insights without AI (fallback)
 */
export async function generateLocalInsights(
  sessionId: string
): Promise<SessionInsights> {
  // Fetch observations
  const { data: observations, error } = await supabase
    .from("observations")
    .select(`
      id,
      notes,
      is_digital,
      is_physical,
      priority_score,
      frequency_score,
      impact_score,
      ease_score,
      step:process_steps(step_name, lane),
      observation_waste_links(
        waste_type:waste_types(id, name, code, category)
      )
    `)
    .eq("session_id", sessionId);

  if (error || !observations) {
    throw new Error("Failed to fetch observations");
  }

  // Transform data
  const transformedObs: ObservationData[] = observations.map((obs) => ({
    id: obs.id,
    notes: obs.notes,
    is_digital: obs.is_digital,
    is_physical: obs.is_physical,
    priority_score: obs.priority_score,
    frequency_score: obs.frequency_score,
    impact_score: obs.impact_score,
    ease_score: obs.ease_score,
    step: obs.step as { step_name: string; lane: string } | null,
    waste_types: (obs.observation_waste_links as Array<{ waste_type: WasteType | null }>)
      ?.map((link) => link.waste_type)
      .filter((wt): wt is WasteType => wt !== null) || [],
  }));

  // Calculate metrics
  const totalObs = transformedObs.length;
  const avgPriority = totalObs > 0
    ? transformedObs.reduce((sum, o) => sum + (o.priority_score || 0), 0) / totalObs
    : 0;

  // Count waste types
  const wasteTypeCounts = new Map<string, number>();
  transformedObs.forEach((obs) => {
    obs.waste_types.forEach((wt) => {
      wasteTypeCounts.set(wt.name, (wasteTypeCounts.get(wt.name) || 0) + 1);
    });
  });

  const topWasteType = [...wasteTypeCounts.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  // Determine improvement potential
  let improvementPotential: "high" | "medium" | "low" = "low";
  if (avgPriority > 30 || totalObs > 20) {
    improvementPotential = "high";
  } else if (avgPriority > 15 || totalObs > 10) {
    improvementPotential = "medium";
  }

  // Generate recommendations
  const recommendations = generateRecommendationsFromData(transformedObs, wasteTypeCounts);

  // Generate key findings
  const keyFindings = generateKeyFindings(transformedObs, wasteTypeCounts);

  // Identify risk areas
  const riskAreas = identifyRiskAreas(transformedObs);

  return {
    sessionId,
    generatedAt: new Date().toISOString(),
    summary: {
      totalObservations: totalObs,
      avgPriority: Math.round(avgPriority * 10) / 10,
      topWasteType,
      improvementPotential,
    },
    recommendations,
    keyFindings,
    riskAreas,
  };
}

function generateRecommendationsFromData(
  observations: ObservationData[],
  wasteTypeCounts: Map<string, number>
): InsightRecommendation[] {
  const recommendations: InsightRecommendation[] = [];

  // High-priority observations recommendation
  const highPriorityObs = observations.filter(
    (o) => o.priority_score && o.priority_score > 30
  );
  if (highPriorityObs.length > 0) {
    recommendations.push({
      id: "high-priority",
      title: "Address High-Priority Issues",
      description: `${highPriorityObs.length} observation(s) have a priority score above 30, indicating critical improvement opportunities.`,
      impact: "high",
      effort: "moderate",
      category: "waste_reduction",
      suggestedActions: [
        "Form a cross-functional team to analyze root causes",
        "Create action items for each high-priority observation",
        "Set target dates for resolution",
        "Schedule follow-up session to verify improvements",
      ],
    });
  }

  // Digital waste recommendation
  const digitalObs = observations.filter((o) => o.is_digital);
  const digitalPct = observations.length > 0
    ? (digitalObs.length / observations.length) * 100
    : 0;

  if (digitalPct > 50) {
    recommendations.push({
      id: "digital-waste",
      title: "Digital Transformation Opportunity",
      description: `${Math.round(digitalPct)}% of waste is digital. Consider automation or system improvements.`,
      impact: "high",
      effort: "significant",
      category: "digital_optimization",
      suggestedActions: [
        "Audit existing digital tools and integrations",
        "Identify repetitive manual tasks for automation",
        "Evaluate workflow management software",
        "Consider RPA (Robotic Process Automation) for routine tasks",
      ],
    });
  }

  // Top waste type recommendation
  const topWasteEntries = [...wasteTypeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (topWasteEntries.length > 0) {
    const [topWaste, count] = topWasteEntries[0];
    recommendations.push({
      id: "top-waste",
      title: `Focus on ${topWaste} Reduction`,
      description: `${topWaste} is the most common waste type with ${count} occurrence(s). Targeted efforts here will have the greatest impact.`,
      impact: "high",
      effort: "moderate",
      category: "waste_reduction",
      wasteTypes: [topWaste],
      suggestedActions: [
        `Conduct root cause analysis for ${topWaste} waste`,
        "Implement quick wins identified during the session",
        "Train team members on recognizing and preventing this waste",
        "Establish metrics to track reduction over time",
      ],
    });
  }

  // Quick wins recommendation
  const quickWinObs = observations.filter(
    (o) => o.ease_score && o.ease_score <= 2 && o.impact_score && o.impact_score >= 3
  );
  if (quickWinObs.length > 0) {
    recommendations.push({
      id: "quick-wins",
      title: "Pursue Quick Wins",
      description: `${quickWinObs.length} observation(s) are low effort but high impact. These should be prioritized for immediate implementation.`,
      impact: "medium",
      effort: "quick_win",
      category: "process",
      suggestedActions: [
        "Assign owners to each quick win",
        "Implement changes within the next sprint/week",
        "Document before/after states",
        "Celebrate wins to build momentum",
      ],
    });
  }

  // Training recommendation
  const hasVariedWaste = wasteTypeCounts.size > 5;
  if (hasVariedWaste) {
    recommendations.push({
      id: "training",
      title: "Enhance Waste Awareness Training",
      description: "Many different waste types were identified, indicating broad improvement potential through better awareness.",
      impact: "medium",
      effort: "easy",
      category: "training",
      suggestedActions: [
        "Schedule team training on waste identification",
        "Share session results with stakeholders",
        "Create visual guides for common waste types",
        "Establish regular waste walk cadence",
      ],
    });
  }

  return recommendations;
}

function generateKeyFindings(
  observations: ObservationData[],
  wasteTypeCounts: Map<string, number>
): string[] {
  const findings: string[] = [];

  const totalObs = observations.length;
  if (totalObs === 0) {
    return ["No observations were recorded in this session."];
  }

  // Total observations
  findings.push(`${totalObs} waste observation(s) were recorded during this session.`);

  // Digital vs Physical
  const digitalCount = observations.filter((o) => o.is_digital).length;
  const physicalCount = observations.filter((o) => o.is_physical).length;
  if (digitalCount > physicalCount) {
    findings.push(
      `Digital waste (${digitalCount}) is more prevalent than physical waste (${physicalCount}).`
    );
  } else if (physicalCount > digitalCount) {
    findings.push(
      `Physical waste (${physicalCount}) is more prevalent than digital waste (${digitalCount}).`
    );
  }

  // Top waste types
  const topWastes = [...wasteTypeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  if (topWastes.length > 0) {
    const wasteList = topWastes.map(([name, count]) => `${name} (${count})`).join(", ");
    findings.push(`Top waste types: ${wasteList}.`);
  }

  // Lanes with most issues
  const laneCounts = new Map<string, number>();
  observations.forEach((obs) => {
    if (obs.step?.lane) {
      laneCounts.set(obs.step.lane, (laneCounts.get(obs.step.lane) || 0) + 1);
    }
  });
  const topLanes = [...laneCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);
  if (topLanes.length > 0) {
    findings.push(
      `Most affected swimlane(s): ${topLanes.map(([l, c]) => `${l} (${c})`).join(", ")}.`
    );
  }

  return findings;
}

function identifyRiskAreas(observations: ObservationData[]): string[] {
  const risks: string[] = [];

  // High frequency + high impact observations
  const criticalObs = observations.filter(
    (o) =>
      o.frequency_score &&
      o.frequency_score >= 4 &&
      o.impact_score &&
      o.impact_score >= 4
  );
  if (criticalObs.length > 0) {
    risks.push(
      `${criticalObs.length} critical issue(s) with high frequency and high impact require immediate attention.`
    );
  }

  // Steps with multiple issues
  const stepCounts = new Map<string, number>();
  observations.forEach((obs) => {
    if (obs.step?.step_name) {
      stepCounts.set(
        obs.step.step_name,
        (stepCounts.get(obs.step.step_name) || 0) + 1
      );
    }
  });
  const problematicSteps = [...stepCounts.entries()].filter(([, c]) => c >= 3);
  if (problematicSteps.length > 0) {
    risks.push(
      `${problematicSteps.length} step(s) have 3+ waste observations and may be process bottlenecks.`
    );
  }

  // Very low ease scores (hard to fix)
  const hardToFix = observations.filter((o) => o.ease_score && o.ease_score >= 4);
  if (hardToFix.length > 3) {
    risks.push(
      `${hardToFix.length} observation(s) are difficult to address and may require significant resources.`
    );
  }

  return risks;
}

