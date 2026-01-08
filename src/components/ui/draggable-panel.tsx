"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface Position {
  x: number;
  y: number;
}

type AnchorCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface DraggablePanelProps {
  id: string;
  children: React.ReactNode;
  defaultPosition?: Position;
  anchor?: AnchorCorner; // Which corner to anchor to (default: bottom-left)
  className?: string;
  dragHandleClassName?: string;
  containerRef?: React.RefObject<HTMLDivElement>; // Optional container for boundary constraints
}

const STORAGE_PREFIX = "processmap-panel-position-";

function getStoredPosition(id: string): Position | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function storePosition(id: string, position: Position) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(position));
  } catch {
    // Ignore storage errors
  }
}

export function DraggablePanel({
  id,
  children,
  defaultPosition = { x: 20, y: 20 },
  anchor = "bottom-left",
  className,
  dragHandleClassName,
  // containerRef is reserved for future boundary constraints
}: DraggablePanelProps) {
  const [position, setPosition] = useState<Position>(() => {
    return getStoredPosition(id) || defaultPosition;
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle mouse/touch move
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!dragStartRef.current || !panelRef.current) return;

    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;

    // For right-anchored panels, invert X delta (moving mouse right should decrease right offset)
    // For bottom-anchored panels, invert Y delta (moving mouse down should decrease bottom offset)
    const xMultiplier = anchor.includes("right") ? -1 : 1;
    const yMultiplier = anchor.includes("bottom") ? -1 : 1;

    let newX = dragStartRef.current.posX + (deltaX * xMultiplier);
    let newY = dragStartRef.current.posY + (deltaY * yMultiplier);

    // Constrain to reasonable bounds (minimum offset from edges)
    const minOffset = 10;
    const maxOffset = 500; // Don't allow dragging too far from anchor corner

    newX = Math.max(minOffset, Math.min(newX, maxOffset));
    newY = Math.max(minOffset, Math.min(newY, maxOffset));

    setPosition({ x: newX, y: newY });
  }, [anchor]);

  // Handle mouse/touch end
  const handleEnd = useCallback(() => {
    if (dragStartRef.current) {
      setIsDragging(false);
      dragStartRef.current = null;
      // Store position on drag end
      setPosition((pos) => {
        storePosition(id, pos);
        return pos;
      });
    }
  }, [id]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      posX: position.x,
      posY: position.y,
    };
  }, [position]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  }, [handleMove]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Add/remove global event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Calculate position styles based on anchor
  const getPositionStyles = (): React.CSSProperties => {
    switch (anchor) {
      case "top-left":
        return { left: position.x, top: position.y };
      case "top-right":
        return { right: position.x, top: position.y };
      case "bottom-left":
        return { left: position.x, bottom: position.y };
      case "bottom-right":
        return { right: position.x, bottom: position.y };
      default:
        return { left: position.x, bottom: position.y };
    }
  };

  return (
    <div
      ref={panelRef}
      className={cn(
        "absolute z-[5]",
        isDragging && "select-none",
        className
      )}
      style={getPositionStyles()}
    >
      {/* Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={cn(
          "flex items-center justify-center w-full h-5 rounded-t-lg cursor-grab active:cursor-grabbing",
          "bg-muted/90 hover:bg-muted border border-b-0 border-border/50",
          "transition-colors",
          dragHandleClassName
        )}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
      {/* Content */}
      <div className="rounded-b-lg shadow-lg border border-t-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
