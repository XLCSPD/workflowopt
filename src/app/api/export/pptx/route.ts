import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rateLimit, exportRateLimit } from "@/lib/rate-limit";

// Define interfaces for data types
interface WasteType {
  id: string;
  name: string;
  code: string;
}

interface User {
  id: string;
  name: string;
}

interface Observation {
  id: string;
  step_id: string | null;
  notes: string | null;
  is_digital: boolean;
  is_physical: boolean;
  frequency_score: number | null;
  impact_score: number | null;
  ease_score: number | null;
  priority_score: number | null;
  created_at: string;
  user: User | null;
  waste_types: WasteType[];
}

interface Session {
  id: string;
  name: string;
  status: string;
  created_at: string;
  process: {
    name: string;
  } | null;
}

interface ExportSections {
  wasteDistribution: boolean;
  heatmap: boolean;
  topOpportunities: boolean;
  participantActivity: boolean;
  rawData: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, sections } = body as {
      sessionId: string;
      sections: ExportSections;
    };

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Get session data
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Apply rate limiting
    const rateLimitResult = rateLimit(authUser.id, exportRateLimit);
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

    // Fetch session with process name
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select(`
        id,
        name,
        status,
        created_at,
        process:processes(name)
      `)
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Fetch observations with waste types
    const { data: observations } = await supabase
      .from("observations")
      .select(`
        id,
        step_id,
        notes,
        is_digital,
        is_physical,
        frequency_score,
        impact_score,
        ease_score,
        priority_score,
        created_at,
        user:users(id, name),
        observation_waste_links(
          waste_type:waste_types(id, name, code)
        )
      `)
      .eq("session_id", sessionId);

    // Transform observations to include waste_types array
    const transformedObservations: Observation[] = (observations || []).map(
      (obs) => ({
        id: obs.id,
        step_id: obs.step_id,
        notes: obs.notes,
        is_digital: obs.is_digital,
        is_physical: obs.is_physical,
        frequency_score: obs.frequency_score,
        impact_score: obs.impact_score,
        ease_score: obs.ease_score,
        priority_score: obs.priority_score,
        created_at: obs.created_at,
        user: Array.isArray(obs.user) ? (obs.user[0] as User | undefined) || null : (obs.user as User | null),
        waste_types:
          (obs.observation_waste_links as unknown as Array<{ waste_type: WasteType | WasteType[] | null }>)
            ?.map((link) => {
              const wt = link.waste_type;
              if (Array.isArray(wt)) return wt[0] || null;
              return wt;
            })
            .filter((wt): wt is WasteType => wt !== null) || [],
      })
    );

    // Calculate waste distribution
    const wasteDistribution = calculateWasteDistribution(transformedObservations);

    // Dynamic import of pptxgenjs for server-side use
    const PptxGenJS = (await import("pptxgenjs")).default;

    // Create presentation
    const pres = new PptxGenJS();
    pres.author = "Process Optimization Tool";
    pres.title = `Session Report: ${session.name}`;
    pres.subject = "Waste Walk Session Results";

    // Brand colors
    const brandGold = "FFC000";
    const brandNavy = "102A43";
    const lightGray = "F5F5F5";

    // =========================================
    // SLIDE 1: Title Slide
    // =========================================
    const titleSlide = pres.addSlide();
    titleSlide.background = { color: brandNavy };

    titleSlide.addText("Session Results Report", {
      x: 0.5,
      y: 2,
      w: 9,
      h: 1,
      fontSize: 36,
      bold: true,
      color: brandGold,
      align: "center",
    });

    titleSlide.addText(session.name, {
      x: 0.5,
      y: 3.2,
      w: 9,
      h: 0.6,
      fontSize: 24,
      color: "FFFFFF",
      align: "center",
    });

    const processName = (session as unknown as Session).process?.name || "Workflow";
    titleSlide.addText(`Process: ${processName}`, {
      x: 0.5,
      y: 4,
      w: 9,
      h: 0.5,
      fontSize: 16,
      color: "AAAAAA",
      align: "center",
    });

    titleSlide.addText(
      `Generated: ${new Date().toLocaleDateString()}`,
      {
        x: 0.5,
        y: 4.8,
        w: 9,
        h: 0.4,
        fontSize: 12,
        color: "888888",
        align: "center",
      }
    );

    // =========================================
    // SLIDE 2: Summary Statistics
    // =========================================
    const summarySlide = pres.addSlide();

    summarySlide.addText("Session Summary", {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 28,
      bold: true,
      color: brandNavy,
    });

    // Stats cards
    const totalObs = transformedObservations.length;
    const avgPriority =
      totalObs > 0
        ? (
            transformedObservations.reduce(
              (sum, o) => sum + (o.priority_score || 0),
              0
            ) / totalObs
          ).toFixed(1)
        : "0";
    const digitalCount = transformedObservations.filter((o) => o.is_digital).length;
    const digitalPct =
      totalObs > 0 ? Math.round((digitalCount / totalObs) * 100) : 0;

    const stats = [
      { label: "Total Observations", value: totalObs.toString(), color: "4A90D9" },
      { label: "Avg Priority Score", value: avgPriority, color: "50C878" },
      { label: "Digital Waste %", value: `${digitalPct}%`, color: "FF6B6B" },
      { label: "Waste Types Found", value: wasteDistribution.length.toString(), color: brandGold },
    ];

    stats.forEach((stat, i) => {
      const x = 0.5 + (i % 2) * 4.5;
      const y = 1.2 + Math.floor(i / 2) * 1.8;

      summarySlide.addShape("rect", {
        x,
        y,
        w: 4,
        h: 1.5,
        fill: { color: lightGray },
        line: { color: stat.color, width: 2 },
      });

      summarySlide.addText(stat.value, {
        x,
        y: y + 0.2,
        w: 4,
        h: 0.8,
        fontSize: 36,
        bold: true,
        color: brandNavy,
        align: "center",
      });

      summarySlide.addText(stat.label, {
        x,
        y: y + 0.9,
        w: 4,
        h: 0.4,
        fontSize: 14,
        color: "666666",
        align: "center",
      });
    });

    // =========================================
    // SLIDE 3: Waste Distribution
    // =========================================
    if (sections.wasteDistribution && wasteDistribution.length > 0) {
      const distSlide = pres.addSlide();

      distSlide.addText("Waste Distribution", {
        x: 0.5,
        y: 0.3,
        w: 9,
        h: 0.6,
        fontSize: 28,
        bold: true,
        color: brandNavy,
      });

      // Create table data
      const tableData: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
        [
          { text: "Waste Type", options: { bold: true, fill: { color: brandGold } } },
          { text: "Count", options: { bold: true, fill: { color: brandGold } } },
          { text: "Percentage", options: { bold: true, fill: { color: brandGold } } },
        ],
      ];

      wasteDistribution.slice(0, 10).forEach((item, i) => {
        tableData.push([
          { text: item.name, options: { fill: { color: i % 2 === 0 ? "FFFFFF" : lightGray } } },
          { text: item.count.toString(), options: { fill: { color: i % 2 === 0 ? "FFFFFF" : lightGray } } },
          { text: `${item.percentage}%`, options: { fill: { color: i % 2 === 0 ? "FFFFFF" : lightGray } } },
        ]);
      });

      distSlide.addTable(tableData, {
        x: 0.5,
        y: 1.2,
        w: 9,
        colW: [4, 2.5, 2.5],
        border: { color: "CCCCCC", pt: 0.5 },
        fontFace: "Arial",
        fontSize: 12,
      });
    }

    // =========================================
    // SLIDE 4: Top Opportunities
    // =========================================
    if (sections.topOpportunities && transformedObservations.length > 0) {
      const oppSlide = pres.addSlide();

      oppSlide.addText("Top Improvement Opportunities", {
        x: 0.5,
        y: 0.3,
        w: 9,
        h: 0.6,
        fontSize: 28,
        bold: true,
        color: brandNavy,
      });

      // Get top observations by priority
      const topObs = [...transformedObservations]
        .filter((o) => o.priority_score && o.priority_score > 0)
        .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
        .slice(0, 5);

      if (topObs.length > 0) {
        topObs.forEach((obs, i) => {
          const y = 1.2 + i * 0.9;

          oppSlide.addShape("rect", {
            x: 0.5,
            y,
            w: 9,
            h: 0.8,
            fill: { color: i % 2 === 0 ? lightGray : "FFFFFF" },
          });

          oppSlide.addText(`${i + 1}.`, {
            x: 0.6,
            y: y + 0.15,
            w: 0.5,
            h: 0.5,
            fontSize: 16,
            bold: true,
            color: brandGold,
          });

          oppSlide.addText(
            obs.waste_types.map((wt) => wt.name).join(", ") || "Unknown",
            {
              x: 1.2,
              y: y + 0.1,
              w: 5,
              h: 0.35,
              fontSize: 14,
              bold: true,
              color: brandNavy,
            }
          );

          oppSlide.addText(obs.notes?.slice(0, 60) || "No notes", {
            x: 1.2,
            y: y + 0.4,
            w: 6,
            h: 0.35,
            fontSize: 11,
            color: "666666",
          });

          oppSlide.addText(`Priority: ${obs.priority_score || 0}`, {
            x: 7.5,
            y: y + 0.2,
            w: 1.8,
            h: 0.4,
            fontSize: 12,
            bold: true,
            color: "FF6B6B",
            align: "right",
          });
        });
      }
    }

    // =========================================
    // SLIDE 5: Raw Data (if enabled)
    // =========================================
    if (sections.rawData && transformedObservations.length > 0) {
      const dataSlide = pres.addSlide();

      dataSlide.addText("Observation Details", {
        x: 0.5,
        y: 0.3,
        w: 9,
        h: 0.6,
        fontSize: 28,
        bold: true,
        color: brandNavy,
      });

      const tableData: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
        [
          { text: "Waste Types", options: { bold: true, fill: { color: brandGold } } },
          { text: "Digital", options: { bold: true, fill: { color: brandGold } } },
          { text: "Priority", options: { bold: true, fill: { color: brandGold } } },
          { text: "Notes", options: { bold: true, fill: { color: brandGold } } },
        ],
      ];

      transformedObservations.slice(0, 15).forEach((obs, i) => {
        tableData.push([
          {
            text: obs.waste_types.map((wt) => wt.code).join(", ") || "-",
            options: { fill: { color: i % 2 === 0 ? "FFFFFF" : lightGray } },
          },
          {
            text: obs.is_digital ? "Yes" : "No",
            options: { fill: { color: i % 2 === 0 ? "FFFFFF" : lightGray } },
          },
          {
            text: (obs.priority_score || 0).toString(),
            options: { fill: { color: i % 2 === 0 ? "FFFFFF" : lightGray } },
          },
          {
            text: (obs.notes || "").slice(0, 30) + ((obs.notes?.length || 0) > 30 ? "..." : ""),
            options: { fill: { color: i % 2 === 0 ? "FFFFFF" : lightGray } },
          },
        ]);
      });

      dataSlide.addTable(tableData, {
        x: 0.5,
        y: 1,
        w: 9,
        colW: [2.5, 1.5, 1.5, 3.5],
        border: { color: "CCCCCC", pt: 0.5 },
        fontFace: "Arial",
        fontSize: 10,
      });

      if (transformedObservations.length > 15) {
        dataSlide.addText(
          `Showing 15 of ${transformedObservations.length} observations. Export to CSV for complete data.`,
          {
            x: 0.5,
            y: 4.8,
            w: 9,
            h: 0.3,
            fontSize: 10,
            color: "888888",
            italic: true,
          }
        );
      }
    }

    // =========================================
    // SLIDE 6: Thank You / Next Steps
    // =========================================
    const endSlide = pres.addSlide();
    endSlide.background = { color: brandNavy };

    endSlide.addText("Next Steps", {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 0.8,
      fontSize: 36,
      bold: true,
      color: brandGold,
      align: "center",
    });

    const nextSteps = [
      "Review high-priority observations with stakeholders",
      "Create action items for top improvement opportunities",
      "Schedule follow-up session to measure improvements",
      "Share this report with process owners",
    ];

    nextSteps.forEach((step, i) => {
      endSlide.addText(`${i + 1}. ${step}`, {
        x: 1.5,
        y: 2.8 + i * 0.5,
        w: 7,
        h: 0.4,
        fontSize: 16,
        color: "FFFFFF",
      });
    });

    endSlide.addText("Process Optimization Tool", {
      x: 0.5,
      y: 4.8,
      w: 9,
      h: 0.4,
      fontSize: 12,
      color: "888888",
      align: "center",
    });

    // Generate the PPTX file
    const pptxBuffer = await pres.write({ outputType: "arraybuffer" });

    // Return as downloadable file
    return new NextResponse(pptxBuffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="session-${sessionId}-report.pptx"`,
      },
    });
  } catch (error) {
    console.error("PPTX generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PowerPoint file" },
      { status: 500 }
    );
  }
}

// Helper function to calculate waste distribution
function calculateWasteDistribution(
  observations: Observation[]
): Array<{ name: string; count: number; percentage: number }> {
  const wasteMap = new Map<string, { name: string; count: number }>();

  observations.forEach((obs) => {
    obs.waste_types.forEach((wt) => {
      const existing = wasteMap.get(wt.id);
      if (existing) {
        existing.count++;
      } else {
        wasteMap.set(wt.id, { name: wt.name, count: 1 });
      }
    });
  });

  const total = Array.from(wasteMap.values()).reduce((sum, w) => sum + w.count, 0);

  return Array.from(wasteMap.values())
    .map((w) => ({
      name: w.name,
      count: w.count,
      percentage: total > 0 ? Math.round((w.count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

