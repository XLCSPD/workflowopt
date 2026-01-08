"use client";

import { useState, useCallback } from "react";
import { MiniMap, Panel, Node } from "reactflow";
import { Map, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CollapsibleMiniMapProps {
  nodeColor?: (node: Node) => string;
  maskColor?: string;
  defaultCollapsed?: boolean;
}

const STORAGE_KEY = "processmap-minimap-collapsed";

function getStoredCollapsedState(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      return stored === "true";
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

function storeCollapsedState(collapsed: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  } catch {
    // Ignore storage errors
  }
}

export function CollapsibleMiniMap({
  nodeColor,
  maskColor = "rgba(255, 255, 255, 0.8)",
  defaultCollapsed = false,
}: CollapsibleMiniMapProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = getStoredCollapsedState();
    return stored !== null ? stored : defaultCollapsed;
  });

  const handleToggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      storeCollapsedState(newValue);
      return newValue;
    });
  }, []);

  // When collapsed, show only a button to expand
  if (isCollapsed) {
    return (
      <Panel position="bottom-right">
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggle}
          className="w-10 h-10 p-0 bg-white shadow-sm border border-border rounded-lg hover:bg-gray-50"
          title="Show minimap"
        >
          <Map className="h-4 w-4 text-muted-foreground" />
        </Button>
      </Panel>
    );
  }

  // When expanded, show the MiniMap with a collapse button overlay
  return (
    <Panel position="bottom-right">
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          className="absolute -top-2 -right-2 z-10 w-6 h-6 p-0 bg-white border border-border rounded-full shadow-sm hover:bg-gray-100"
          title="Hide minimap"
        >
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
        <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
          <MiniMap
            nodeColor={nodeColor}
            maskColor={maskColor}
            className="!m-0 !static !border-0 !rounded-none"
            style={{ position: 'static' }}
          />
        </div>
      </div>
    </Panel>
  );
}
