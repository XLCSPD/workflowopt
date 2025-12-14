import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rateLimit, insightsRateLimit } from "@/lib/rate-limit";

interface WasteType {
  id: string;
  name: string;
  code: string;
  category: string;
}

interface Observation {
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

interface InsightRecommendation {
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

interface SessionInsights {
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
  aiGenerated: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Apply rate limiting
    const rateLimitResult = rateLimit(authUser.id, insightsRateLimit);
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
          },
        }
      );
    }

    // Check for cached insights
    const { data: cached } = await supabase
      .from("session_insights")
      .select("insights, created_at")
      .eq("session_id", sessionId)
      .single();

    if (cached) {
      const createdAt = new Date(cached.created_at);
      const hoursDiff =
        (new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      if (hoursDiff < 24) {
        return NextResponse.json(cached.insights);
      }
    }

    // Fetch observations for the session
    const { data: observations, error: obsError } = await supabase
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

    if (obsError || !observations) {
      return NextResponse.json(
        { error: "Failed to fetch observations" },
        { status: 500 }
      );
    }

    // Transform observations
    const transformedObs: Observation[] = observations.map((obs) => ({
      id: obs.id,
      notes: obs.notes,
      is_digital: obs.is_digital,
      is_physical: obs.is_physical,
      priority_score: obs.priority_score,
      frequency_score: obs.frequency_score,
      impact_score: obs.impact_score,
      ease_score: obs.ease_score,
      step: Array.isArray(obs.step) ? (obs.step[0] as { step_name: string; lane: string } | undefined) || null : (obs.step as { step_name: string; lane: string } | null),
      waste_types:
        (obs.observation_waste_links as unknown as Array<{ waste_type: WasteType | WasteType[] | null }>)
          ?.map((link) => {
            const wt = link.waste_type;
            if (Array.isArray(wt)) return wt[0] || null;
            return wt;
          })
          .filter((wt): wt is WasteType => wt !== null) || [],
    }));

    // Try to generate AI insights if API key is available
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    let insights: SessionInsights;

    if (openaiKey) {
      insights = await generateOpenAIInsights(sessionId, transformedObs, openaiKey);
    } else if (anthropicKey) {
      insights = await generateAnthropicInsights(sessionId, transformedObs, anthropicKey);
    } else {
      // Generate local insights without AI
      insights = generateLocalInsights(sessionId, transformedObs);
    }

    // Cache the insights
    await supabase.from("session_insights").upsert({
      session_id: sessionId,
      insights,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(insights);
  } catch (error) {
    console.error("Insight generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}

async function generateOpenAIInsights(
  sessionId: string,
  observations: Observation[],
  apiKey: string
): Promise<SessionInsights> {
  const prompt = buildPrompt(observations);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a Lean process improvement expert analyzing waste walk session data. 
            Provide actionable insights and recommendations based on the observations.
            Always respond with valid JSON matching the expected schema.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error("OpenAI API error");
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content in response");
    }

    const parsed = JSON.parse(content);
    return {
      sessionId,
      generatedAt: new Date().toISOString(),
      summary: parsed.summary || generateSummary(observations),
      recommendations: parsed.recommendations || [],
      keyFindings: parsed.keyFindings || [],
      riskAreas: parsed.riskAreas || [],
      aiGenerated: true,
    };
  } catch (error) {
    console.error("OpenAI error:", error);
    // Fallback to local generation
    return generateLocalInsights(sessionId, observations);
  }
}

async function generateAnthropicInsights(
  sessionId: string,
  observations: Observation[],
  apiKey: string
): Promise<SessionInsights> {
  const prompt = buildPrompt(observations);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `You are a Lean process improvement expert. ${prompt}
            
            Respond with valid JSON only, no other text.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error("Anthropic API error");
    }

    const data = await response.json();
    const content = data.content[0]?.text;

    if (!content) {
      throw new Error("No content in response");
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      sessionId,
      generatedAt: new Date().toISOString(),
      summary: parsed.summary || generateSummary(observations),
      recommendations: parsed.recommendations || [],
      keyFindings: parsed.keyFindings || [],
      riskAreas: parsed.riskAreas || [],
      aiGenerated: true,
    };
  } catch (error) {
    console.error("Anthropic error:", error);
    return generateLocalInsights(sessionId, observations);
  }
}

function buildPrompt(observations: Observation[]): string {
  const summary = generateSummary(observations);

  // Count waste types
  const wasteTypeCounts: Record<string, number> = {};
  observations.forEach((obs) => {
    obs.waste_types.forEach((wt) => {
      wasteTypeCounts[wt.name] = (wasteTypeCounts[wt.name] || 0) + 1;
    });
  });

  // Count by lane
  const laneCounts: Record<string, number> = {};
  observations.forEach((obs) => {
    if (obs.step?.lane) {
      laneCounts[obs.step.lane] = (laneCounts[obs.step.lane] || 0) + 1;
    }
  });

  return `
Analyze this waste walk session data and provide actionable insights.

Session Summary:
- Total Observations: ${summary.totalObservations}
- Average Priority Score: ${summary.avgPriority}
- Top Waste Type: ${summary.topWasteType}
- Digital Observations: ${observations.filter((o) => o.is_digital).length}
- Physical Observations: ${observations.filter((o) => o.is_physical).length}

Waste Type Distribution:
${Object.entries(wasteTypeCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([type, count]) => `- ${type}: ${count}`)
  .join("\n")}

Observations by Lane:
${Object.entries(laneCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([lane, count]) => `- ${lane}: ${count}`)
  .join("\n")}

Sample Notes from Observations:
${observations
  .filter((o) => o.notes)
  .slice(0, 5)
  .map((o) => `- "${o.notes}"`)
  .join("\n")}

Provide your analysis as JSON with this structure:
{
  "summary": {
    "totalObservations": number,
    "avgPriority": number,
    "topWasteType": "string",
    "improvementPotential": "high" | "medium" | "low"
  },
  "recommendations": [
    {
      "id": "unique-id",
      "title": "Recommendation Title",
      "description": "Detailed description",
      "impact": "high" | "medium" | "low",
      "effort": "quick_win" | "easy" | "moderate" | "significant",
      "category": "process" | "waste_reduction" | "digital_optimization" | "training",
      "suggestedActions": ["Action 1", "Action 2", "Action 3"]
    }
  ],
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"],
  "riskAreas": ["Risk 1", "Risk 2"]
}
`;
}

function generateSummary(observations: Observation[]): {
  totalObservations: number;
  avgPriority: number;
  topWasteType: string;
  improvementPotential: "high" | "medium" | "low";
} {
  const totalObs = observations.length;
  const avgPriority =
    totalObs > 0
      ? observations.reduce((sum, o) => sum + (o.priority_score || 0), 0) / totalObs
      : 0;

  const wasteTypeCounts = new Map<string, number>();
  observations.forEach((obs) => {
    obs.waste_types.forEach((wt) => {
      wasteTypeCounts.set(wt.name, (wasteTypeCounts.get(wt.name) || 0) + 1);
    });
  });

  const topWasteType =
    Array.from(wasteTypeCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  let improvementPotential: "high" | "medium" | "low" = "low";
  if (avgPriority > 30 || totalObs > 20) {
    improvementPotential = "high";
  } else if (avgPriority > 15 || totalObs > 10) {
    improvementPotential = "medium";
  }

  return {
    totalObservations: totalObs,
    avgPriority: Math.round(avgPriority * 10) / 10,
    topWasteType,
    improvementPotential,
  };
}

function generateLocalInsights(
  sessionId: string,
  observations: Observation[]
): SessionInsights {
  const summary = generateSummary(observations);

  const wasteTypeCounts = new Map<string, number>();
  observations.forEach((obs) => {
    obs.waste_types.forEach((wt) => {
      wasteTypeCounts.set(wt.name, (wasteTypeCounts.get(wt.name) || 0) + 1);
    });
  });

  const recommendations: InsightRecommendation[] = [];

  // High priority recommendation
  const highPriorityObs = observations.filter(
    (o) => o.priority_score && o.priority_score > 30
  );
  if (highPriorityObs.length > 0) {
    recommendations.push({
      id: "high-priority",
      title: "Address High-Priority Issues",
      description: `${highPriorityObs.length} observation(s) have high priority scores and require immediate attention.`,
      impact: "high",
      effort: "moderate",
      category: "waste_reduction",
      suggestedActions: [
        "Form a cross-functional team to analyze root causes",
        "Create action items for each high-priority observation",
        "Set target dates for resolution",
      ],
    });
  }

  // Digital waste
  const digitalPct =
    observations.length > 0
      ? (observations.filter((o) => o.is_digital).length / observations.length) * 100
      : 0;

  if (digitalPct > 50) {
    recommendations.push({
      id: "digital-optimization",
      title: "Digital Process Optimization",
      description: `${Math.round(digitalPct)}% of waste is digital. Consider system improvements and automation.`,
      impact: "high",
      effort: "significant",
      category: "digital_optimization",
      suggestedActions: [
        "Audit existing digital workflows",
        "Identify automation opportunities",
        "Evaluate integration possibilities",
      ],
    });
  }

  // Top waste type
  if (summary.topWasteType !== "N/A") {
    const count = wasteTypeCounts.get(summary.topWasteType) || 0;
    recommendations.push({
      id: "top-waste",
      title: `Reduce ${summary.topWasteType} Waste`,
      description: `${summary.topWasteType} is the most common waste type with ${count} occurrence(s).`,
      impact: "high",
      effort: "moderate",
      category: "waste_reduction",
      wasteTypes: [summary.topWasteType],
      suggestedActions: [
        `Conduct root cause analysis for ${summary.topWasteType}`,
        "Implement targeted countermeasures",
        "Track reduction metrics",
      ],
    });
  }

  // Key findings
  const keyFindings: string[] = [];
  keyFindings.push(
    `${summary.totalObservations} waste observations were recorded during this session.`
  );

  const digitalCount = observations.filter((o) => o.is_digital).length;
  const physicalCount = observations.filter((o) => o.is_physical).length;
  keyFindings.push(
    `Waste breakdown: ${digitalCount} digital, ${physicalCount} physical.`
  );

  if (wasteTypeCounts.size > 0) {
    const topWastes = Array.from(wasteTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    keyFindings.push(
      `Top waste types: ${topWastes.map(([n, c]) => `${n} (${c})`).join(", ")}.`
    );
  }

  // Risk areas
  const riskAreas: string[] = [];
  const criticalObs = observations.filter(
    (o) =>
      o.frequency_score &&
      o.frequency_score >= 4 &&
      o.impact_score &&
      o.impact_score >= 4
  );
  if (criticalObs.length > 0) {
    riskAreas.push(
      `${criticalObs.length} critical issue(s) with high frequency and impact.`
    );
  }

  const hardToFix = observations.filter((o) => o.ease_score && o.ease_score >= 4);
  if (hardToFix.length > 3) {
    riskAreas.push(
      `${hardToFix.length} issue(s) are difficult to address and require significant effort.`
    );
  }

  return {
    sessionId,
    generatedAt: new Date().toISOString(),
    summary,
    recommendations,
    keyFindings,
    riskAreas,
    aiGenerated: false,
  };
}

