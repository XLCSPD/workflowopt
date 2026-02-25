/**
 * Shared swim lane layout computation module.
 *
 * Centralises lane-height logic that was previously duplicated across
 * ProcessMap, HorizontalFlowView, workflowImport, and WorkflowImageImportDialog.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Per-lane computed layout information. */
export interface LaneLayout {
  name: string;
  yOffset: number;              // cumulative Y start of this lane (px)
  height: number;               // final rendered height (max of auto & custom)
  autoHeight: number;           // auto-computed height from content
  customHeight: number | null;  // user override from DB (null = auto)
  rowCount: number;             // auto-computed number of rows (1-maxRows)
}

/** View-specific sizing constants. */
export interface SwimlaneSizingConfig {
  nodeWidth: number;
  nodeHeight: number;
  rowGap: number;        // vertical gap between stacked nodes
  lanePaddingY: number;  // top/bottom padding inside a lane
  laneGap: number;       // gap between consecutive lanes
  minLaneHeight: number; // minimum height for any lane (matches legacy constants)
  maxRows: number;       // cap for auto row count
}

// ---------------------------------------------------------------------------
// Preset configs
// ---------------------------------------------------------------------------

export const PROCESS_MAP_CONFIG: SwimlaneSizingConfig = {
  nodeWidth: 160,
  nodeHeight: 70,
  rowGap: 20,
  lanePaddingY: 15,
  laneGap: 0,
  minLaneHeight: 120,
  maxRows: 3,
};

export const HORIZONTAL_FLOW_CONFIG: SwimlaneSizingConfig = {
  nodeWidth: 220,
  nodeHeight: 110,
  rowGap: 20,
  lanePaddingY: 15,
  laneGap: 10,
  minLaneHeight: 140,
  maxRows: 3,
};

export const IMPORT_CONFIG: SwimlaneSizingConfig = {
  nodeWidth: 180,
  nodeHeight: 70,
  rowGap: 20,
  lanePaddingY: 15,
  laneGap: 0,
  minLaneHeight: 120,
  maxRows: 3,
};

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * After running Dagre, bucket nodes into columns per lane based on their X
 * position. Two nodes whose X values are within `columnWidth` of each other
 * are considered to be in the same column.
 */
export function buildColumnAssignments(
  nodes: Array<{ id: string; lane: string; dagreX: number }>,
  columnWidth: number
): {
  laneColumnNodes: Map<string, Map<number, string[]>>;
  laneColumnCounts: Map<string, Map<number, number>>;
} {
  const laneColumnNodes = new Map<string, Map<number, string[]>>();
  const laneColumnCounts = new Map<string, Map<number, number>>();

  for (const node of nodes) {
    const col = Math.round(node.dagreX / columnWidth);

    if (!laneColumnNodes.has(node.lane)) {
      laneColumnNodes.set(node.lane, new Map());
      laneColumnCounts.set(node.lane, new Map());
    }

    const colNodes = laneColumnNodes.get(node.lane)!;
    const colCounts = laneColumnCounts.get(node.lane)!;

    if (!colNodes.has(col)) {
      colNodes.set(col, []);
      colCounts.set(col, 0);
    }

    colNodes.get(col)!.push(node.id);
    colCounts.set(col, colCounts.get(col)! + 1);
  }

  return { laneColumnNodes, laneColumnCounts };
}

/**
 * Compute the auto-height for a lane given a row count and sizing config.
 */
function computeAutoHeight(rowCount: number, config: SwimlaneSizingConfig): number {
  const contentHeight =
    rowCount * config.nodeHeight + (rowCount - 1) * config.rowGap + 2 * config.lanePaddingY;
  return Math.max(config.minLaneHeight, contentHeight);
}

/**
 * Compute per-lane layouts (heights + cumulative Y offsets).
 *
 * @param laneNames        Ordered list of lane names.
 * @param laneColumnCounts Map of lane → (column → node count). Empty map = 1 row per lane.
 * @param customHeights    Map of lane name → user-set custom_height (null = auto).
 * @param config           View-specific sizing constants.
 */
export function computeLaneLayouts(
  laneNames: string[],
  laneColumnCounts: Map<string, Map<number, number>>,
  customHeights: Map<string, number | null>,
  config: SwimlaneSizingConfig
): LaneLayout[] {
  const layouts: LaneLayout[] = [];
  let yOffset = 0;

  for (const name of laneNames) {
    const colCounts = laneColumnCounts.get(name);
    let maxInColumn = 1;
    if (colCounts) {
      colCounts.forEach((count) => {
        if (count > maxInColumn) maxInColumn = count;
      });
    }

    const rowCount = Math.min(Math.max(1, maxInColumn), config.maxRows);
    const autoHeight = computeAutoHeight(rowCount, config);
    const custom = customHeights.get(name) ?? null;
    const height = custom !== null ? Math.max(autoHeight, custom) : autoHeight;

    layouts.push({ name, yOffset, height, autoHeight, customHeight: custom, rowCount });
    yOffset += height + config.laneGap;
  }

  return layouts;
}

/**
 * Return the Y position for a node at a given row index within its lane.
 */
export function getNodeYInLane(
  laneLayout: LaneLayout,
  rowIndex: number,
  config: SwimlaneSizingConfig
): number {
  return laneLayout.yOffset + config.lanePaddingY + rowIndex * (config.nodeHeight + config.rowGap);
}

/**
 * Determine which lane index a Y coordinate falls into, using variable-height
 * lane layouts. Returns the lane index (clamped to valid range).
 */
export function getLaneIndexForY(y: number, laneLayouts: LaneLayout[]): number {
  if (laneLayouts.length === 0) return 0;

  for (let i = 0; i < laneLayouts.length; i++) {
    const ll = laneLayouts[i];
    if (y < ll.yOffset + ll.height) return i;
  }

  // Past the last lane — return last index
  return laneLayouts.length - 1;
}

/**
 * Compute lane layouts from actual saved/dragged node positions.
 * Groups nodes by lane, finds the vertical span of nodes in each lane,
 * and derives required heights.
 */
export function computeLaneLayoutsFromPositions(
  laneNames: string[],
  nodesByLane: Map<string, Array<{ y: number }>>,
  customHeights: Map<string, number | null>,
  config: SwimlaneSizingConfig
): LaneLayout[] {
  const layouts: LaneLayout[] = [];
  let yOffset = 0;

  for (const name of laneNames) {
    const nodes = nodesByLane.get(name) || [];

    let rowCount = 1;
    if (nodes.length > 0) {
      // Find the vertical span of nodes relative to the lane's top
      const minY = Math.min(...nodes.map((n) => n.y));
      const maxY = Math.max(...nodes.map((n) => n.y));
      const span = maxY - minY;
      // Estimate how many rows that span represents
      if (config.nodeHeight + config.rowGap > 0) {
        rowCount = Math.min(
          config.maxRows,
          Math.max(1, Math.round(span / (config.nodeHeight + config.rowGap)) + 1)
        );
      }
    }

    const autoHeight = computeAutoHeight(rowCount, config);
    const custom = customHeights.get(name) ?? null;
    const height = custom !== null ? Math.max(autoHeight, custom) : autoHeight;

    layouts.push({ name, yOffset, height, autoHeight, customHeight: custom, rowCount });
    yOffset += height + config.laneGap;
  }

  return layouts;
}

/**
 * Build a Map<laneName, customHeight | null> from a ProcessLane-like array.
 */
export function buildCustomHeightsMap(
  lanes: Array<{ name: string; custom_height?: number | null }>
): Map<string, number | null> {
  const map = new Map<string, number | null>();
  for (const lane of lanes) {
    map.set(lane.name, lane.custom_height ?? null);
  }
  return map;
}
