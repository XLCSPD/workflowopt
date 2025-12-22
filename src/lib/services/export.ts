import { getSessionById } from "./sessions";
import { getObservationsBySession } from "./observations";
import { getWasteDistribution, getWasteByLane, getTopHotspots } from "./analytics";
import type { ReactFlowInstance, Node as ReactFlowNode } from "reactflow";
import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  InsightTheme,
  SolutionCard,
  ImplementationWave,
  FutureState,
  FutureStateNode,
  StepDesignVersion,
  StepDesignOption,
  DesignAssumption,
} from "@/types";

export interface ExportSections {
  wasteDistribution: boolean;
  heatmap: boolean;
  topOpportunities: boolean;
  participantActivity: boolean;
  rawData: boolean;
}

export interface FutureStateExportSections {
  executiveSummary: boolean;
  futureStateDiagram: boolean;
  solutionRegister: boolean;
  roadmap: boolean;
  themeAnalysis: boolean;
  comparisonMetrics: boolean;
  stepDesignSpecs: boolean;
  traceabilityMatrix: boolean;
  implementationNotes: boolean;
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

function getReactFlowBounds(nodes: ReactFlowNode[]): { minX: number; minY: number; maxX: number; maxY: number } {
  // Uses node width/height when available; falls back to reasonable defaults.
  const fallbackW = 200;
  const fallbackH = 90;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const n of nodes) {
    const pos = (n as unknown as { positionAbsolute?: { x: number; y: number } }).positionAbsolute ?? n.position;
    const w = (n.width ?? (n as unknown as { measured?: { width?: number } }).measured?.width ?? fallbackW) as number;
    const h = (n.height ?? (n as unknown as { measured?: { height?: number } }).measured?.height ?? fallbackH) as number;

    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + w);
    maxY = Math.max(maxY, pos.y + h);
  }

  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  return { minX, minY, maxX, maxY };
}

async function nextAnimationFrame(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Wraps a promise with a timeout.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
    ),
  ]);
}

function canvasHasInk(canvas: HTMLCanvasElement): boolean {
  // Fast “blank page” detection by sampling pixels.
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return true;

  const w = canvas.width;
  const h = canvas.height;
  if (w <= 0 || h <= 0) return false;

  // Sample a grid of pixels; if any pixel is not near-white, consider it non-blank.
  const stepX = Math.max(1, Math.floor(w / 40));
  const stepY = Math.max(1, Math.floor(h / 40));
  for (let y = 0; y < h; y += stepY) {
    for (let x = 0; x < w; x += stepX) {
      const d = ctx.getImageData(x, y, 1, 1).data;
      // Treat as “ink” if any channel is noticeably below white
      if (d[0] < 245 || d[1] < 245 || d[2] < 245) return true;
    }
  }
  return false;
}

async function captureWorkflowPagedTiles(args: {
  chartElement: HTMLElement;
  reactFlowInstance: ReactFlowInstance;
  zoom?: number;
  canvasScale?: number;
  padding?: number;
  overlapPx?: number;
}): Promise<string[]> {
  const { chartElement, reactFlowInstance } = args;
  const zoom = args.zoom ?? 1;
  const canvasScale = args.canvasScale ?? 2;
  // Edges/arrowheads often extend beyond node bounds; give extra margin.
  const padding = args.padding ?? 200;
  // Overlap ensures connectors that cross page seams appear on both pages.
  const overlapPx = args.overlapPx ?? 240;

  // html-to-image is significantly more reliable than html2canvas for SVG markers
  // (React Flow arrowheads are SVG markers and often go missing with html2canvas).
  // Keep html2canvas as a fallback.
  type HtmlToImageOptions = {
    backgroundColor?: string;
    pixelRatio?: number;
    cacheBust?: boolean;
    width?: number;
    height?: number;
    filter?: (node: HTMLElement) => boolean;
  };

  let toCanvas: ((node: HTMLElement, options?: HtmlToImageOptions) => Promise<HTMLCanvasElement>) | null = null;
  try {
    const mod = await import("html-to-image");
    toCanvas = mod.toCanvas as unknown as (node: HTMLElement, options?: HtmlToImageOptions) => Promise<HTMLCanvasElement>;
  } catch {
    // ignore (fallback to html2canvas)
  }
  const html2canvas = (await import("html2canvas")).default;

  // Quick font readiness (prevents late font swaps clipping)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fonts = (document as any).fonts as { ready?: Promise<unknown> } | undefined;
  if (fonts?.ready) {
    try {
      await Promise.race([fonts.ready, new Promise((r) => setTimeout(r, 800))]);
    } catch {
      // ignore
    }
  }

  document.documentElement.classList.add("workflow-exporting");

  // Hide overlays
  const hideSelectors = [".react-flow__panel", ".react-flow__minimap", ".react-flow__controls"];
  const hidden: Array<{ el: HTMLElement; visibility: string }> = [];
  for (const sel of hideSelectors) {
    chartElement.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      hidden.push({ el, visibility: el.style.visibility });
      el.style.visibility = "hidden";
    });
  }

  const originalViewport = reactFlowInstance.getViewport();

  try {
    const nodes = reactFlowInstance.getNodes();
    const bounds = getReactFlowBounds(nodes as unknown as ReactFlowNode[]);
    const padded = {
      minX: bounds.minX - padding,
      minY: bounds.minY - padding,
      maxX: bounds.maxX + padding,
      maxY: bounds.maxY + padding,
    };

    const flowEl = chartElement.querySelector<HTMLElement>(".react-flow") ?? chartElement;
    const viewportPxW = Math.max(1, flowEl.clientWidth);
    const viewportPxH = Math.max(1, flowEl.clientHeight);
    const tileWorldW = viewportPxW / zoom;
    const tileWorldH = viewportPxH / zoom;
    const overlapWorld = overlapPx / zoom;

    const totalW = Math.max(0, padded.maxX - padded.minX);
    const totalH = Math.max(0, padded.maxY - padded.minY);

    const stepW = Math.max(1, tileWorldW - overlapWorld);
    const stepH = Math.max(1, tileWorldH - overlapWorld);

    const cols = Math.max(1, Math.ceil(Math.max(0, totalW - overlapWorld) / stepW));
    const rows = Math.max(1, Math.ceil(Math.max(0, totalH - overlapWorld) / stepH));

    const images: string[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const originX = Math.min(padded.minX + c * stepW, padded.maxX - tileWorldW);
        const originY = Math.min(padded.minY + r * stepH, padded.maxY - tileWorldH);

        reactFlowInstance.setViewport(
          { x: -originX * zoom, y: -originY * zoom, zoom },
          { duration: 0 }
        );

        // Let ReactFlow + our swimlane overlay (useViewport) fully sync
        await nextAnimationFrame();
        await nextAnimationFrame();
        // Edges + marker arrowheads can lag behind viewport changes a bit.
        await new Promise((res) => setTimeout(res, 350));

        const filter = (node: HTMLElement) => {
          const cl = node.classList;
          if (!cl) return true;
          return !(
            cl.contains("react-flow__minimap") ||
            cl.contains("react-flow__controls") ||
            cl.contains("react-flow__panel")
          );
        };

        const canvas = await withTimeout(
          (async () => {
            if (toCanvas) {
              return await toCanvas(chartElement, {
                backgroundColor: "#ffffff",
                pixelRatio: canvasScale,
                cacheBust: true,
                width: chartElement.clientWidth,
                height: chartElement.clientHeight,
                filter,
              });
            }
            return await html2canvas(chartElement, {
              backgroundColor: "#ffffff",
              scale: canvasScale,
              useCORS: true,
              logging: false,
              width: chartElement.clientWidth,
              height: chartElement.clientHeight,
              allowTaint: true,
              foreignObjectRendering: false,
              ignoreElements: (el) => !filter(el as unknown as HTMLElement),
            });
          })(),
          20000,
          "Capture tile timed out"
        );

        // Skip truly blank tiles (helps avoid “blank pages”)
        if (!canvasHasInk(canvas)) continue;

        images.push(canvas.toDataURL("image/png"));
      }
    }

    return images;
  } finally {
    reactFlowInstance.setViewport(originalViewport, { duration: 0 });
    for (const h of hidden) h.el.style.visibility = h.visibility;
    document.documentElement.classList.remove("workflow-exporting");
  }
}

export async function exportWorkflowToPDF(args: {
  workflow: WorkflowExportWorkflow;
  steps: WorkflowExportStep[];
  connections: WorkflowExportConnection[];
  filename?: string;
  chartElementId?: string;
  reactFlowInstance?: ReactFlowInstance;
}): Promise<void> {
  const { workflow, steps, connections, filename, chartElementId, reactFlowInstance } = args;

  // Dynamic imports to avoid bundling issues
  const jsPDFModule = await import("jspdf");
  const jsPDF = jsPDFModule.default;
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default;

  // Use landscape to make workflow pages more legible.
  const doc = new jsPDF({ orientation: "landscape" });
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

  // Workflow diagram (end-to-end, paged, legible)
  if (chartElementId && reactFlowInstance) {
    const chartEl = document.getElementById(chartElementId);
    if (chartEl && chartEl.clientWidth > 0 && chartEl.clientHeight > 0) {
      try {
        const tiles = await captureWorkflowPagedTiles({
          chartElement: chartEl,
          reactFlowInstance,
          zoom: 1, // Keep nodes readable; we page horizontally/vertically as needed
          canvasScale: 2,
          padding: 220,
          overlapPx: 260,
        });

        // Draw tiles. Each tile is exactly the on-screen viewport, so we scale to page once.
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const maxW = pageWidth - margin * 2;
        const maxHFirst = pageHeight - yPosition - margin;
        const aspect = chartEl.clientHeight / chartEl.clientWidth;

        for (let i = 0; i < tiles.length; i++) {
          const img = tiles[i];
          const yStart = i === 0 ? yPosition : margin;
          const maxH = i === 0 ? maxHFirst : pageHeight - yStart - margin;

          let drawW = maxW;
          let drawH = drawW * aspect;
          if (drawH > maxH) {
            drawH = maxH;
            drawW = drawH / aspect;
          }
          const xStart = margin + (maxW - drawW) / 2;

          doc.addImage(img, "PNG", xStart, yStart, drawW, drawH);

          if (i < tiles.length - 1) doc.addPage("a4", "landscape");
        }

        // Tables on a fresh page after the diagram tiles.
        doc.addPage("a4", "landscape");
        yPosition = 20;
      } catch (e) {
        console.error("Workflow diagram capture failed:", e);
        // Continue without diagram (tables still export)
      }
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

// ============================================
// FUTURE STATE STUDIO EXPORTS
// ============================================

interface FutureStateStudioData {
  session: { id: string; name: string };
  themes: InsightTheme[];
  solutions: SolutionCard[];
  waves: Array<ImplementationWave & { solutions?: SolutionCard[] }>;
  futureStates: Array<FutureState & { nodes?: FutureStateNode[] }>;
  currentStepCount: number;
}

async function fetchFutureStateStudioData(sessionId: string): Promise<FutureStateStudioData | null> {
  const supabase = getSupabaseClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, name, process_id")
    .eq("id", sessionId)
    .single();

  if (!session) return null;

  const [themesRes, solutionsRes, wavesRes, futureStatesRes, stepsRes] = await Promise.all([
    supabase
      .from("insight_themes")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at"),
    supabase
      .from("solution_cards")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at"),
    supabase
      .from("implementation_waves")
      .select(`
        *,
        wave_solutions(
          solution:solution_cards(*)
        )
      `)
      .eq("session_id", sessionId)
      .order("order_index"),
    supabase
      .from("future_states")
      .select(`
        *,
        nodes:future_state_nodes(*)
      `)
      .eq("session_id", sessionId)
      .order("version", { ascending: false }),
    supabase
      .from("process_steps")
      .select("id")
      .eq("process_id", session.process_id),
  ]);

  return {
    session: { id: session.id, name: session.name },
    themes: (themesRes.data || []) as InsightTheme[],
    solutions: (solutionsRes.data || []) as SolutionCard[],
    waves: (wavesRes.data || []).map((w: ImplementationWave & { wave_solutions?: Array<{ solution: SolutionCard }> }) => ({
      ...w,
      solutions: (w.wave_solutions || []).map((ws) => ws.solution) || [],
    })) as Array<ImplementationWave & { solutions?: SolutionCard[] }>,
    futureStates: (futureStatesRes.data || []) as Array<FutureState & { nodes?: FutureStateNode[] }>,
    currentStepCount: stepsRes.data?.length || 0,
  };
}

/**
 * Export Future State Studio Executive Summary PDF
 */
export async function exportFutureStateSummaryPDF(sessionId: string): Promise<void> {
  const data = await fetchFutureStateStudioData(sessionId);
  if (!data) throw new Error("Session not found");

  const jsPDFModule = await import("jspdf");
  const jsPDF = jsPDFModule.default;
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default;

  const doc = new jsPDF();
  void autoTable;

  const brandGold = [255, 192, 0] as [number, number, number];
  const brandNavy = [16, 42, 67] as [number, number, number];
  let yPosition = 20;

  // Title
  doc.setFontSize(24);
  doc.setTextColor(...brandNavy);
  doc.text("Future State Studio", 20, yPosition);
  yPosition += 10;
  doc.setFontSize(16);
  doc.text("Executive Summary", 20, yPosition);
  yPosition += 10;

  // Session info
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Session: ${data.session.name}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPosition);
  yPosition += 15;

  // Key Metrics
  doc.setFontSize(16);
  doc.setTextColor(...brandNavy);
  doc.text("Key Metrics", 20, yPosition);
  yPosition += 10;

  const latestFutureState = data.futureStates[0];
  const futureNodes = latestFutureState?.nodes || [];
  const removedCount = futureNodes.filter((n) => n.action === "remove").length;
  const modifiedCount = futureNodes.filter((n) => n.action === "modify").length;
  const newCount = futureNodes.filter((n) => n.action === "new").length;
  const futureStepCount = futureNodes.filter((n) => n.action !== "remove").length;

  autoTable(doc, {
    startY: yPosition,
    head: [["Metric", "Value"]],
    body: [
      ["Themes Identified", data.themes.length.toString()],
      ["Solutions Proposed", data.solutions.length.toString()],
      ["Solutions Accepted", data.solutions.filter((s) => s.status === "accepted").length.toString()],
      ["Implementation Waves", data.waves.length.toString()],
      ["Current Process Steps", data.currentStepCount.toString()],
      ["Future Process Steps", futureStepCount.toString()],
      ["Steps Eliminated", removedCount.toString()],
      ["Steps Modified", modifiedCount.toString()],
      ["New Steps", newCount.toString()],
    ],
    headStyles: {
      fillColor: brandGold,
      textColor: brandNavy,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: { 0: { fontStyle: "bold" } },
  });

  yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // Themes Summary
  if (data.themes.length > 0) {
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(...brandNavy);
    doc.text("Identified Themes", 20, yPosition);
    yPosition += 10;

    autoTable(doc, {
      startY: yPosition,
      head: [["Theme", "Status", "Confidence"]],
      body: data.themes.map((t) => [
        t.name,
        t.status,
        t.confidence || "N/A",
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

  // Solutions Summary
  if (data.solutions.filter((s) => s.status === "accepted").length > 0) {
    if (yPosition > 180) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(...brandNavy);
    doc.text("Accepted Solutions", 20, yPosition);
    yPosition += 10;

    const acceptedSolutions = data.solutions.filter((s) => s.status === "accepted");
    autoTable(doc, {
      startY: yPosition,
      head: [["Solution", "Type", "Effort", "Wave"]],
      body: acceptedSolutions.map((s) => [
        s.title,
        s.bucket,
        s.effort_level || "N/A",
        s.recommended_wave || "N/A",
      ]),
      headStyles: {
        fillColor: brandGold,
        textColor: brandNavy,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount} | Future State Studio | ${new Date().toLocaleDateString()}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  doc.save(`${data.session.name}-executive-summary.pdf`);
}

/**
 * Export Solution Register to Excel/CSV
 */
export async function exportSolutionRegister(sessionId: string): Promise<void> {
  const data = await fetchFutureStateStudioData(sessionId);
  if (!data) throw new Error("Session not found");

  const headers = [
    "Solution",
    "Type",
    "Description",
    "Expected Impact",
    "Effort Level",
    "Risks",
    "Dependencies",
    "Recommended Wave",
    "Status",
  ];

  const rows = data.solutions.map((s) => [
    s.title,
    s.bucket,
    (s.description || "").replace(/,/g, ";").replace(/\n/g, " "),
    (s.expected_impact || "").replace(/,/g, ";").replace(/\n/g, " "),
    s.effort_level || "",
    (s.risks || []).join("; "),
    (s.dependencies || []).join("; "),
    s.recommended_wave || "",
    s.status,
  ]);

  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.session.name}-solution-register.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export Implementation Roadmap to CSV (for import into presentation tools)
 */
export async function exportRoadmapCSV(sessionId: string): Promise<void> {
  const data = await fetchFutureStateStudioData(sessionId);
  if (!data) throw new Error("Session not found");

  const headers = [
    "Wave Name",
    "Wave Order",
    "Start Estimate",
    "End Estimate",
    "Solution",
    "Solution Type",
    "Solution Status",
    "Effort Level",
  ];

  const rows: string[][] = [];

  data.waves.forEach((wave) => {
    const waveSolutions = wave.solutions || [];
    if (waveSolutions.length === 0) {
      // Add wave with no solutions
      rows.push([
        wave.name,
        wave.order_index?.toString() || "",
        wave.start_estimate || "",
        wave.end_estimate || "",
        "",
        "",
        "",
        "",
      ]);
    } else {
      // Add row for each solution in the wave
      waveSolutions.forEach((sol) => {
        rows.push([
          wave.name,
          wave.order_index?.toString() || "",
          wave.start_estimate || "",
          wave.end_estimate || "",
          sol.title,
          sol.bucket,
          sol.status,
          sol.effort_level || "",
        ]);
      });
    }
  });

  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.session.name}-implementation-roadmap.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export Step Design Specifications to PDF
 */
export async function exportStepDesignSpecsPDF(sessionId: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  // Fetch session info
  const { data: session } = await supabase
    .from("sessions")
    .select("id, name")
    .eq("id", sessionId)
    .single();

  if (!session) throw new Error("Session not found");

  // Fetch future state with nodes and step designs
  const { data: futureStates } = await supabase
    .from("future_states")
    .select(`
      *,
      nodes:future_state_nodes(
        *,
        step_design_versions:step_design_versions(
          *,
          options:step_design_options(
            *,
            assumptions:design_assumptions(*)
          )
        )
      )
    `)
    .eq("session_id", sessionId)
    .order("version", { ascending: false })
    .limit(1);

  const latestFutureState = futureStates?.[0];
  if (!latestFutureState) throw new Error("No future state found");

  const jsPDFModule = await import("jspdf");
  const jsPDF = jsPDFModule.default;
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default;

  const doc = new jsPDF();
  void autoTable;

  const brandGold = [255, 192, 0] as [number, number, number];
  const brandNavy = [16, 42, 67] as [number, number, number];
  let yPosition = 20;

  // Title
  doc.setFontSize(24);
  doc.setTextColor(...brandNavy);
  doc.text("Step Design Specifications", 20, yPosition);
  yPosition += 10;

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Session: ${session.name}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Future State: ${latestFutureState.name}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPosition);
  yPosition += 15;

  // Process each node with step design
  const nodesWithDesign = (latestFutureState.nodes as Array<FutureStateNode & { 
    step_design_versions?: Array<StepDesignVersion & { 
      options?: Array<StepDesignOption & { assumptions?: DesignAssumption[] }> 
    }> 
  }>)?.filter(
    (n) => n.step_design_status === "step_design_complete" && n.step_design_versions?.length
  ) || [];

  if (nodesWithDesign.length === 0) {
    doc.setFontSize(12);
    doc.text("No step designs have been completed yet.", 20, yPosition);
  } else {
    for (const node of nodesWithDesign) {
      if (yPosition > 220) {
        doc.addPage();
        yPosition = 20;
      }

      const latestVersion = node.step_design_versions?.[0];
      const selectedOption = latestVersion?.options?.find(
        (o) => o.id === latestVersion.selected_option_id
      );

      if (!selectedOption) continue;

      const designJson = selectedOption.design_json as {
        purpose?: string;
        inputs?: Array<{ name: string; description?: string }>;
        actions?: Array<{ order: number; description: string }>;
        outputs?: Array<{ name: string; description?: string }>;
        controls?: Array<{ type: string; description: string }>;
        timing?: { estimated_lead_time_minutes?: number; estimated_cycle_time_minutes?: number };
      };

      // Node header
      doc.setFontSize(14);
      doc.setTextColor(...brandNavy);
      doc.text(`Step: ${node.name}`, 20, yPosition);
      yPosition += 6;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Lane: ${node.lane} | Action: ${node.action} | Option: ${selectedOption.option_key}`, 20, yPosition);
      yPosition += 8;

      // Purpose
      if (designJson.purpose) {
        doc.setFontSize(11);
        doc.setTextColor(...brandNavy);
        doc.text("Purpose:", 20, yPosition);
        yPosition += 5;
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const purposeLines = doc.splitTextToSize(designJson.purpose, 170);
        doc.text(purposeLines, 20, yPosition);
        yPosition += purposeLines.length * 5 + 5;
      }

      // Inputs
      if (designJson.inputs?.length) {
        autoTable(doc, {
          startY: yPosition,
          head: [["Input", "Description"]],
          body: designJson.inputs.map((i) => [i.name, i.description || ""]),
          headStyles: { fillColor: brandGold, textColor: brandNavy, fontStyle: "bold", fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          margin: { left: 20 },
        });
        yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
      }

      // Actions
      if (designJson.actions?.length) {
        autoTable(doc, {
          startY: yPosition,
          head: [["#", "Action"]],
          body: designJson.actions
            .sort((a, b) => a.order - b.order)
            .map((a) => [a.order.toString(), a.description]),
          headStyles: { fillColor: brandGold, textColor: brandNavy, fontStyle: "bold", fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          margin: { left: 20 },
        });
        yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
      }

      // Outputs
      if (designJson.outputs?.length) {
        autoTable(doc, {
          startY: yPosition,
          head: [["Output", "Description"]],
          body: designJson.outputs.map((o) => [o.name, o.description || ""]),
          headStyles: { fillColor: brandGold, textColor: brandNavy, fontStyle: "bold", fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          margin: { left: 20 },
        });
        yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
      }

      // Controls
      if (designJson.controls?.length) {
        autoTable(doc, {
          startY: yPosition,
          head: [["Control Type", "Description"]],
          body: designJson.controls.map((c) => [c.type, c.description]),
          headStyles: { fillColor: brandGold, textColor: brandNavy, fontStyle: "bold", fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          margin: { left: 20 },
        });
        yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
      }

      // Assumptions
      if (selectedOption.assumptions?.length) {
        autoTable(doc, {
          startY: yPosition,
          head: [["Assumption", "Risk if Wrong", "Validation"]],
          body: selectedOption.assumptions.map((a) => [
            a.assumption,
            a.risk_if_wrong || "",
            a.validation_method || "",
          ]),
          headStyles: { fillColor: [255, 243, 205] as [number, number, number], textColor: brandNavy, fontStyle: "bold", fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          margin: { left: 20 },
        });
        yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
      }

      yPosition += 10;
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount} | Step Design Specs | ${new Date().toLocaleDateString()}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  doc.save(`${session.name}-step-design-specs.pdf`);
}

/**
 * Export Traceability Matrix (Solution → Node → Step Design → Assumptions)
 */
export async function exportTraceabilityMatrix(sessionId: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  // Fetch session info
  const { data: session } = await supabase
    .from("sessions")
    .select("id, name")
    .eq("id", sessionId)
    .single();

  if (!session) throw new Error("Session not found");

  // Fetch solutions
  const { data: solutions } = await supabase
    .from("solution_cards")
    .select("id, title, bucket, status")
    .eq("session_id", sessionId)
    .eq("status", "accepted");

  // Fetch future state with nodes and step designs
  const { data: futureStates } = await supabase
    .from("future_states")
    .select(`
      *,
      nodes:future_state_nodes(
        *,
        step_design_versions:step_design_versions(
          *,
          options:step_design_options(
            *,
            assumptions:design_assumptions(*)
          )
        )
      )
    `)
    .eq("session_id", sessionId)
    .order("version", { ascending: false })
    .limit(1);

  const latestFutureState = futureStates?.[0];

  const headers = [
    "Solution",
    "Solution Type",
    "Node",
    "Node Lane",
    "Node Action",
    "Step Design Option",
    "Design Status",
    "Confidence",
    "Assumption",
    "Risk if Wrong",
    "Validation Method",
    "Validated",
  ];

  const rows: string[][] = [];

  // Create traceability rows
  (solutions || []).forEach((solution: { id: string; title: string; bucket: string; status: string }) => {
    // Find nodes linked to this solution
    const linkedNodes = (latestFutureState?.nodes as Array<FutureStateNode & { 
      step_design_versions?: Array<StepDesignVersion & { 
        options?: Array<StepDesignOption & { assumptions?: DesignAssumption[] }> 
      }> 
    }> || []).filter(
      (n) => n.linked_solution_id === solution.id
    );

    if (linkedNodes.length === 0) {
      rows.push([
        solution.title,
        solution.bucket,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
    } else {
      linkedNodes.forEach((node) => {
        const latestVersion = node.step_design_versions?.[0];
        const selectedOption = latestVersion?.options?.find(
          (o) => o.id === latestVersion.selected_option_id
        );

        if (!selectedOption) {
          rows.push([
            solution.title,
            solution.bucket,
            node.name,
            node.lane,
            node.action,
            "",
            node.step_design_status || "strategy_only",
            "",
            "",
            "",
            "",
            "",
          ]);
        } else {
          const assumptions = selectedOption.assumptions || [];
          if (assumptions.length === 0) {
            rows.push([
              solution.title,
              solution.bucket,
              node.name,
              node.lane,
              node.action,
              selectedOption.title,
              node.step_design_status || "step_design_complete",
              `${Math.round(selectedOption.confidence * 100)}%`,
              "",
              "",
              "",
              "",
            ]);
          } else {
            assumptions.forEach((assumption, idx) => {
              rows.push([
                idx === 0 ? solution.title : "",
                idx === 0 ? solution.bucket : "",
                idx === 0 ? node.name : "",
                idx === 0 ? node.lane : "",
                idx === 0 ? node.action : "",
                idx === 0 ? selectedOption.title : "",
                idx === 0 ? (node.step_design_status || "step_design_complete") : "",
                idx === 0 ? `${Math.round(selectedOption.confidence * 100)}%` : "",
                assumption.assumption,
                assumption.risk_if_wrong || "",
                assumption.validation_method || "",
                assumption.validated ? "Yes" : "No",
              ]);
            });
          }
        }
      });
    }
  });

  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${session.name}-traceability-matrix.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export Implementation Notes per Step (CSV)
 */
export async function exportImplementationNotes(sessionId: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  // Fetch session info
  const { data: session } = await supabase
    .from("sessions")
    .select("id, name")
    .eq("id", sessionId)
    .single();

  if (!session) throw new Error("Session not found");

  // Fetch future state with nodes, step designs, and context
  const { data: futureStates } = await supabase
    .from("future_states")
    .select(`
      *,
      nodes:future_state_nodes(
        *,
        step_context:step_context(*),
        step_design_versions:step_design_versions(
          *,
          options:step_design_options(*)
        )
      )
    `)
    .eq("session_id", sessionId)
    .order("version", { ascending: false })
    .limit(1);

  const latestFutureState = futureStates?.[0];
  if (!latestFutureState) throw new Error("No future state found");

  const headers = [
    "Step Name",
    "Lane",
    "Action",
    "Design Status",
    "Purpose",
    "Changes from Current",
    "Lead Time (min)",
    "Cycle Time (min)",
    "Risks",
    "Dependencies",
    "Context Notes",
  ];

  const rows: string[][] = [];

  ((latestFutureState.nodes as Array<FutureStateNode & { 
    step_context?: Array<{ notes?: string; context_json?: { purpose?: string } }>;
    step_design_versions?: Array<StepDesignVersion & { options?: StepDesignOption[] }> 
  }>) || []).forEach((node) => {
    const latestVersion = node.step_design_versions?.[0];
    const selectedOption = latestVersion?.options?.find(
      (o) => o.id === latestVersion.selected_option_id
    );
    const context = node.step_context?.[0];
    const designJson = selectedOption?.design_json as { 
      purpose?: string; 
      timing?: { estimated_lead_time_minutes?: number; estimated_cycle_time_minutes?: number } 
    } | undefined;

    rows.push([
      node.name,
      node.lane,
      node.action,
      node.step_design_status || "strategy_only",
      designJson?.purpose || context?.context_json?.purpose || "",
      selectedOption?.changes || "",
      designJson?.timing?.estimated_lead_time_minutes?.toString() || node.lead_time_minutes?.toString() || "",
      designJson?.timing?.estimated_cycle_time_minutes?.toString() || node.cycle_time_minutes?.toString() || "",
      (selectedOption?.risks || []).join("; ").replace(/,/g, ";"),
      (selectedOption?.dependencies || []).join("; ").replace(/,/g, ";"),
      (context?.notes || "").replace(/,/g, ";").replace(/\n/g, " "),
    ]);
  });

  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${session.name}-implementation-notes.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export complete Future State Studio package
 */
export async function exportFutureStateStudioPackage(
  sessionId: string,
  sections: FutureStateExportSections
): Promise<void> {
  const exports: Promise<void>[] = [];

  if (sections.executiveSummary) {
    exports.push(exportFutureStateSummaryPDF(sessionId));
  }

  if (sections.solutionRegister) {
    exports.push(exportSolutionRegister(sessionId));
  }

  if (sections.roadmap) {
    exports.push(exportRoadmapCSV(sessionId));
  }

  if (sections.stepDesignSpecs) {
    exports.push(exportStepDesignSpecsPDF(sessionId));
  }

  if (sections.traceabilityMatrix) {
    exports.push(exportTraceabilityMatrix(sessionId));
  }

  if (sections.implementationNotes) {
    exports.push(exportImplementationNotes(sessionId));
  }

  // Execute all exports
  await Promise.all(exports);
}
