import { getSessionById } from "./sessions";
import { getObservationsBySession } from "./observations";
import { getWasteDistribution, getWasteByLane, getTopHotspots } from "./analytics";

export interface ExportSections {
  wasteDistribution: boolean;
  heatmap: boolean;
  topOpportunities: boolean;
  participantActivity: boolean;
  rawData: boolean;
}

// ============================================
// CHART CAPTURE
// ============================================

export async function captureChartAsImage(elementId: string): Promise<string | null> {
  const element = document.getElementById(elementId);
  if (!element) return null;

  try {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2,
    });
    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Failed to capture chart:", error);
    return null;
  }
}

// ============================================
// PDF EXPORT
// ============================================

export async function exportToPDF(
  sessionId: string,
  sections: ExportSections
): Promise<void> {
  // Dynamic imports to avoid bundling issues
  const jsPDFModule = await import("jspdf");
  const jsPDF = jsPDFModule.default;
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default;

  const [session, observations, distribution, laneStats, hotspots] = await Promise.all([
    getSessionById(sessionId),
    getObservationsBySession(sessionId),
    getWasteDistribution(sessionId),
    getWasteByLane(sessionId),
    getTopHotspots(sessionId, 10),
  ]);

  if (!session) throw new Error("Session not found");

  const doc = new jsPDF();
  // Ensure autoTable is attached
  void autoTable;
  let yPosition = 20;

  // Brand colors
  const brandGold = [255, 192, 0] as [number, number, number];
  const brandNavy = [16, 42, 67] as [number, number, number];

  // Title
  doc.setFontSize(24);
  doc.setTextColor(...brandNavy);
  doc.text("Session Results Report", 20, yPosition);
  yPosition += 10;

  // Session info
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Session: ${session.name}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Date: ${new Date(session.created_at).toLocaleDateString()}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Status: ${session.status}`, 20, yPosition);
  yPosition += 15;

  // Summary stats
  doc.setFontSize(16);
  doc.setTextColor(...brandNavy);
  doc.text("Summary", 20, yPosition);
  yPosition += 8;

  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(`Total Observations: ${observations.length}`, 20, yPosition);
  yPosition += 6;

  const avgPriority = observations.length > 0
    ? (observations.reduce((sum, o) => sum + (o.priority_score || 0), 0) / observations.length).toFixed(1)
    : "0";
  doc.text(`Average Priority Score: ${avgPriority}`, 20, yPosition);
  yPosition += 6;

  const digitalCount = observations.filter((o) => o.is_digital).length;
  const digitalPercentage = observations.length > 0
    ? Math.round((digitalCount / observations.length) * 100)
    : 0;
  doc.text(`Digital Waste: ${digitalPercentage}%`, 20, yPosition);
  yPosition += 15;

  // Waste Distribution
  if (sections.wasteDistribution && distribution.length > 0) {
    doc.setFontSize(16);
    doc.setTextColor(...brandNavy);
    doc.text("Waste Distribution", 20, yPosition);
    yPosition += 10;

    autoTable(doc, {
      startY: yPosition,
      head: [["Waste Type", "Percentage"]],
      body: distribution.map((d) => [d.name, `${d.percentage}%`]),
      headStyles: {
        fillColor: brandGold,
        textColor: brandNavy,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // Lane Statistics
  if (sections.heatmap && laneStats.length > 0) {
    if (yPosition > 230) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(...brandNavy);
    doc.text("Observations by Lane", 20, yPosition);
    yPosition += 10;

    autoTable(doc, {
      startY: yPosition,
      head: [["Lane", "Digital", "Physical", "Total"]],
      body: laneStats.map((l) => [l.lane, l.digital.toString(), l.physical.toString(), (l.digital + l.physical).toString()]),
      headStyles: {
        fillColor: brandGold,
        textColor: brandNavy,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // Top Hotspots
  if (sections.topOpportunities && hotspots.length > 0) {
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(...brandNavy);
    doc.text("Top Improvement Opportunities", 20, yPosition);
    yPosition += 10;

    autoTable(doc, {
      startY: yPosition,
      head: [["Step", "Observations", "Priority Score", "Effort"]],
      body: hotspots.map((h) => [
        h.step_name,
        h.observation_count.toString(),
        h.priority_score.toString(),
        h.effort,
      ]),
      headStyles: {
        fillColor: brandGold,
        textColor: brandNavy,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // Raw Observations Data
  if (sections.rawData && observations.length > 0) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(16);
    doc.setTextColor(...brandNavy);
    doc.text("All Observations", 20, yPosition);
    yPosition += 10;

    autoTable(doc, {
      startY: yPosition,
      head: [["Step", "Waste Types", "Priority", "Digital", "Notes"]],
      body: observations.map((o) => [
        o.step_id?.slice(0, 8) || "N/A",
        o.waste_types?.map((wt) => wt.name).join(", ") || "N/A",
        o.priority_score?.toString() || "0",
        o.is_digital ? "Yes" : "No",
        (o.notes || "").slice(0, 30) + ((o.notes?.length || 0) > 30 ? "..." : ""),
      ]),
      headStyles: {
        fillColor: brandGold,
        textColor: brandNavy,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        4: { cellWidth: 50 },
      },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount} | Generated ${new Date().toLocaleDateString()}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  // Download
  doc.save(`session-${sessionId}-report.pdf`);
}

// ============================================
// WORKFLOW PDF EXPORT
// ============================================

export interface WorkflowExportWorkflow {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowExportStep {
  id: string;
  process_id?: string;
  step_name: string;
  description?: string | null;
  lane: string;
  step_type: string;
  order_index: number;
  lead_time_minutes?: number | null;
  cycle_time_minutes?: number | null;
  position_x?: number | null;
  position_y?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowExportConnection {
  id?: string;
  source: string;
  target: string;
}

function safePdfFilename(value: string): string {
  const base =
    value
      .trim()
      .replace(/[^\w\-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "workflow";
  return base.endsWith(".pdf") ? base : `${base}.pdf`;
}

async function getImageAspectRatio(dataUrl: string): Promise<number | null> {
  // Returns height / width
  try {
    // eslint-disable-next-line no-restricted-globals
    const img = new Image();
    img.decoding = "async";
    img.src = dataUrl;
    await img.decode();
    if (!img.naturalWidth || !img.naturalHeight) return null;
    return img.naturalHeight / img.naturalWidth;
  } catch {
    return null;
  }
}

export async function exportWorkflowToPDF(args: {
  workflow: WorkflowExportWorkflow;
  steps: WorkflowExportStep[];
  connections: WorkflowExportConnection[];
  filename?: string;
  chartElementId?: string;
}): Promise<void> {
  const { workflow, steps, connections, filename, chartElementId } = args;

  // Dynamic imports to avoid bundling issues
  const jsPDFModule = await import("jspdf");
  const jsPDF = jsPDFModule.default;
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default;

  const doc = new jsPDF();
  // Ensure autoTable is attached
  void autoTable;

  // Brand colors
  const brandGold = [255, 192, 0] as [number, number, number];
  const brandNavy = [16, 42, 67] as [number, number, number];

  let yPosition = 20;

  doc.setFontSize(22);
  doc.setTextColor(...brandNavy);
  doc.text("Workflow Export", 20, yPosition);
  yPosition += 10;

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Workflow: ${workflow.name}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Workflow ID: ${workflow.id}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPosition);
  yPosition += 10;

  // Optional: process map snapshot
  if (chartElementId) {
    const img = await captureChartAsImage(chartElementId);
    if (img) {
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const maxW = pageWidth - margin * 2;
      const maxH = pageHeight - yPosition - 20;

      // Maintain aspect ratio based on the captured image.
      // If we can't determine it, fall back to a conservative 16:9-ish ratio.
      const aspect = (await getImageAspectRatio(img)) ?? 9 / 16;
      const h = Math.min(maxH, maxW * aspect);

      doc.setDrawColor(230, 230, 230);
      doc.rect(margin, yPosition, maxW, h);
      doc.addImage(img, "PNG", margin, yPosition, maxW, h);
      yPosition += h + 12;
    }
  }

  // Summary
  doc.setFontSize(16);
  doc.setTextColor(...brandNavy);
  doc.text("Summary", 20, yPosition);
  yPosition += 8;

  const laneCounts = steps.reduce<Record<string, number>>((acc, s) => {
    acc[s.lane] = (acc[s.lane] || 0) + 1;
    return acc;
  }, {});

  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(`Steps: ${steps.length}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Connections: ${connections.length}`, 20, yPosition);
  yPosition += 6;
  doc.text(
    `Lanes: ${Object.keys(laneCounts).length > 0 ? Object.keys(laneCounts).join(", ") : "N/A"}`,
    20,
    yPosition
  );
  yPosition += 12;

  // Steps table
  doc.setFontSize(16);
  doc.setTextColor(...brandNavy);
  doc.text("Steps", 20, yPosition);
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [
      [
        "Order",
        "Step",
        "Lane",
        "Type",
        "Lead (min)",
        "Cycle (min)",
        "Description",
      ],
    ],
    body: [...steps]
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map((s) => [
        String(s.order_index ?? ""),
        s.step_name,
        s.lane,
        s.step_type,
        s.lead_time_minutes != null ? String(s.lead_time_minutes) : "",
        s.cycle_time_minutes != null ? String(s.cycle_time_minutes) : "",
        (s.description || "").slice(0, 60) + ((s.description?.length || 0) > 60 ? "..." : ""),
      ]),
    headStyles: {
      fillColor: brandGold,
      textColor: brandNavy,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      6: { cellWidth: 60 },
    },
  });

  yPosition =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  // Connections table
  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  }

  const stepNameById = steps.reduce<Record<string, string>>((acc, s) => {
    acc[s.id] = s.step_name;
    return acc;
  }, {});

  doc.setFontSize(16);
  doc.setTextColor(...brandNavy);
  doc.text("Connections", 20, yPosition);
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [["From", "To"]],
    body: connections.map((c) => [
      stepNameById[c.source] || c.source,
      stepNameById[c.target] || c.target,
    ]),
    headStyles: {
      fillColor: brandGold,
      textColor: brandNavy,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount} | Generated ${new Date().toLocaleDateString()}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  doc.save(safePdfFilename(filename || workflow.name));
}

// ============================================
// PPTX EXPORT (via server-side API)
// ============================================

export async function exportToPPTX(
  sessionId: string,
  sections: ExportSections
): Promise<void> {
  try {
    const response = await fetch("/api/export/pptx", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId, sections }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to generate PowerPoint file");
    }

    // Get the blob from the response
    const blob = await response.blob();

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-${sessionId}-report.pptx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("PPTX export error:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to export PowerPoint file");
  }
}

// ============================================
// CSV EXPORT
// ============================================

export async function exportToCSV(sessionId: string): Promise<void> {
  const observations = await getObservationsBySession(sessionId);

  const headers = [
    "Step ID",
    "Waste Types",
    "Notes",
    "Digital",
    "Physical",
    "Frequency",
    "Impact",
    "Ease",
    "Priority Score",
    "User",
    "Created At",
  ];

  const rows = observations.map((obs) => [
    obs.step_id || "",
    obs.waste_types?.map((wt) => wt.name).join("; ") || "",
    (obs.notes || "").replace(/,/g, ";").replace(/\n/g, " "),
    obs.is_digital ? "Yes" : "No",
    obs.is_physical ? "Yes" : "No",
    obs.frequency_score?.toString() || "",
    obs.impact_score?.toString() || "",
    obs.ease_score?.toString() || "",
    obs.priority_score?.toString() || "",
    obs.user?.name || "",
    new Date(obs.created_at).toISOString(),
  ]);

  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `session-${sessionId}-observations.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
