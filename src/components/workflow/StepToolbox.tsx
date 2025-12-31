"use client";

import { useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { StepType } from "@/types";
import { cn } from "@/lib/utils";
import { Play, Square, Diamond, CircleDot, MousePointer2, GripHorizontal, X } from "lucide-react";

export const STEP_TOOLBOX_MIME = "application/x-workflow-step-type";

type Tool = {
  type: StepType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const TOOLS: Tool[] = [
  { type: "start", label: "Start", icon: Play },
  { type: "action", label: "Action", icon: MousePointer2 },
  { type: "decision", label: "Decision", icon: Diamond },
  { type: "subprocess", label: "Subprocess", icon: CircleDot },
  { type: "end", label: "End", icon: Square },
];

interface StepToolboxProps {
  className?: string;
  defaultPosition?: { x: number; y: number };
  onClose?: () => void;
}

export function StepToolbox({ className, defaultPosition, onClose }: StepToolboxProps) {
  // Position state - starts at default or centered at bottom
  const [position, setPosition] = useState(defaultPosition || { x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const toolboxRef = useRef<HTMLDivElement>(null);

  // Handle drag start on the grip handle
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      posX: position.x,
      posY: position.y,
    };

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!dragRef.current) return;
      
      const moveClientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const moveClientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      
      const deltaX = moveClientX - dragRef.current.startX;
      const deltaY = moveClientY - dragRef.current.startY;
      
      setPosition({
        x: dragRef.current.posX + deltaX,
        y: dragRef.current.posY + deltaY,
      });
    };

    const handleEnd = () => {
      setIsDragging(false);
      dragRef.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
  }, [position]);

  return (
    <Card 
      ref={toolboxRef}
      className={cn(
        "p-2 bg-brand-platinum/95 border shadow-lg backdrop-blur-sm",
        isDragging && "cursor-grabbing opacity-90",
        className
      )}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
      }}
    >
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        <div 
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded transition-colors"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          title="Drag to move"
        >
          <GripHorizontal className="h-4 w-4 text-gray-400" />
        </div>
        
        {/* Tool buttons */}
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <Button
              key={t.type}
              type="button"
              variant="outline"
              size="sm"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(STEP_TOOLBOX_MIME, t.type);
                e.dataTransfer.effectAllowed = "copy";
              }}
              className="bg-white hover:bg-brand-gold/10 transition-colors"
              title={`Drag ${t.label} onto canvas`}
            >
              <Icon className="h-4 w-4 mr-2 text-brand-navy" />
              <span className="text-sm">{t.label}</span>
            </Button>
          );
        })}

        {/* Close button (optional) */}
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="ml-1 p-1 h-auto"
            title="Close toolbox"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </Button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Drag a step type onto the canvas to add it.
      </p>
    </Card>
  );
}
