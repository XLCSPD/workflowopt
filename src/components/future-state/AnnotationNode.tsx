"use client";

import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  StickyNote,
  Shield,
  Lightbulb,
  AlertTriangle,
  Info,
  X,
  GripVertical,
  Check,
} from "lucide-react";
import type { AnnotationType, AnnotationPriority } from "@/types/design-studio";

// ============================================
// TYPES
// ============================================

interface AnnotationNodeData {
  id: string;
  type: AnnotationType;
  title: string;
  content?: string | null;
  priority: AnnotationPriority;
  resolved: boolean;
  isAttached: boolean; // True if attached to a node
  nodeId?: string | null;
  isSelected?: boolean;
  isEditMode?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onResolve?: (id: string, resolved: boolean) => void;
}

// ============================================
// CONSTANTS
// ============================================

const typeConfig: Record<AnnotationType, {
  icon: typeof StickyNote;
  bgColor: string;
  borderColor: string;
  iconColor: string;
  textColor: string;
  label: string;
}> = {
  note: {
    icon: StickyNote,
    bgColor: "bg-amber-50",
    borderColor: "border-amber-300",
    iconColor: "text-amber-600",
    textColor: "text-amber-800",
    label: "Note",
  },
  guardrail: {
    icon: Shield,
    bgColor: "bg-red-50",
    borderColor: "border-red-300",
    iconColor: "text-red-600",
    textColor: "text-red-800",
    label: "Guardrail",
  },
  assumption: {
    icon: Lightbulb,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    iconColor: "text-blue-600",
    textColor: "text-blue-800",
    label: "Assumption",
  },
  risk: {
    icon: AlertTriangle,
    bgColor: "bg-orange-50",
    borderColor: "border-orange-300",
    iconColor: "text-orange-600",
    textColor: "text-orange-800",
    label: "Risk",
  },
  instruction: {
    icon: Info,
    bgColor: "bg-green-50",
    borderColor: "border-green-300",
    iconColor: "text-green-600",
    textColor: "text-green-800",
    label: "Instruction",
  },
};

const priorityConfig: Record<AnnotationPriority, { label: string; color: string }> = {
  low: { label: "Low", color: "text-slate-500" },
  medium: { label: "Medium", color: "text-amber-600" },
  high: { label: "High", color: "text-orange-600" },
  critical: { label: "Critical", color: "text-red-600" },
};

// ============================================
// FLOATING ANNOTATION NODE (for canvas)
// ============================================

function AnnotationNodeComponent({ data }: NodeProps<AnnotationNodeData>) {
  const [isHovered, setIsHovered] = useState(false);
  const config = typeConfig[data.type];
  const Icon = config.icon;
  const priority = priorityConfig[data.priority];

  return (
    <div
      className={cn(
        "relative min-w-[180px] max-w-[240px] rounded-lg border-2 shadow-md transition-all",
        config.bgColor,
        config.borderColor,
        data.isSelected && "ring-2 ring-brand-gold ring-offset-2",
        data.resolved && "opacity-60"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drag handle (edit mode only) */}
      {data.isEditMode && (
        <Handle
          type="source"
          position={Position.Top}
          className="!bg-transparent !border-0 !w-full !h-2 !top-0 cursor-grab"
        />
      )}

      {/* Header */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 border-b",
        config.borderColor
      )}>
        {data.isEditMode && (
          <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
        )}
        <Icon className={cn("h-4 w-4", config.iconColor)} />
        <span className={cn("text-xs font-medium", config.textColor)}>
          {config.label}
        </span>
        {data.priority !== "medium" && (
          <span className={cn("text-xs ml-auto", priority.color)}>
            {priority.label}
          </span>
        )}
        
        {/* Resolved checkbox */}
        {(data.type === "guardrail" || data.type === "risk" || data.type === "assumption") && (
          <Checkbox
            checked={data.resolved}
            onCheckedChange={(checked) => {
              data.onResolve?.(data.id, checked as boolean);
            }}
            className="ml-auto h-4 w-4"
          />
        )}
      </div>

      {/* Content */}
      <div className="px-3 py-2">
        <p className={cn(
          "text-sm font-medium line-clamp-2",
          config.textColor,
          data.resolved && "line-through"
        )}>
          {data.title}
        </p>
        {data.content && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
            {data.content}
          </p>
        )}
      </div>

      {/* Actions (visible on hover in edit mode) */}
      {data.isEditMode && isHovered && (
        <div className="absolute -top-2 -right-2 flex gap-1">
          <Button
            variant="destructive"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete?.(data.id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Resolved badge */}
      {data.resolved && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
          <Check className="h-3 w-3" />
          Resolved
        </div>
      )}
    </div>
  );
}

// ============================================
// ATTACHED ANNOTATION BADGE (for step nodes)
// ============================================

interface AnnotationBadgeProps {
  annotation: {
    id: string;
    type: AnnotationType;
    title: string;
    priority: AnnotationPriority;
    resolved: boolean;
  };
  onClick?: () => void;
  onResolve?: (resolved: boolean) => void;
  compact?: boolean;
}

export function AnnotationBadge({
  annotation,
  onClick,
  onResolve,
  compact = false,
}: AnnotationBadgeProps) {
  const config = typeConfig[annotation.type];
  const Icon = config.icon;

  if (compact) {
    // Icon-only mode for tight spaces
    return (
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center justify-center h-5 w-5 rounded",
          config.bgColor,
          config.borderColor,
          "border",
          annotation.resolved && "opacity-50"
        )}
        title={annotation.title}
      >
        <Icon className={cn("h-3 w-3", config.iconColor)} />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs",
        config.bgColor,
        config.borderColor,
        config.textColor,
        "border",
        annotation.resolved && "opacity-50 line-through"
      )}
    >
      <Icon className={cn("h-3 w-3", config.iconColor)} />
      <span className="truncate max-w-[100px]">{annotation.title}</span>
      {(annotation.type === "guardrail" || annotation.type === "risk") && (
        <Checkbox
          checked={annotation.resolved}
          onCheckedChange={(checked) => {
            onResolve?.(checked as boolean);
          }}
          className="h-3 w-3 ml-1"
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </button>
  );
}

// ============================================
// ANNOTATION LIST (for panels)
// ============================================

interface AnnotationListProps {
  annotations: Array<{
    id: string;
    type: AnnotationType;
    title: string;
    content?: string | null;
    priority: AnnotationPriority;
    resolved: boolean;
  }>;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onResolve?: (id: string, resolved: boolean) => void;
  emptyMessage?: string;
}

export function AnnotationList({
  annotations,
  onEdit,
  onDelete,
  onResolve,
  emptyMessage = "No annotations",
}: AnnotationListProps) {
  if (annotations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {annotations.map((annotation) => {
        const config = typeConfig[annotation.type];
        const Icon = config.icon;

        return (
          <div
            key={annotation.id}
            className={cn(
              "flex items-start gap-2 p-2 rounded border",
              config.bgColor,
              config.borderColor,
              annotation.resolved && "opacity-60"
            )}
          >
            <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", config.iconColor)} />
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium",
                config.textColor,
                annotation.resolved && "line-through"
              )}>
                {annotation.title}
              </p>
              {annotation.content && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {annotation.content}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {(annotation.type === "guardrail" || annotation.type === "risk" || annotation.type === "assumption") && (
                <Checkbox
                  checked={annotation.resolved}
                  onCheckedChange={(checked) => {
                    onResolve?.(annotation.id, checked as boolean);
                  }}
                  className="h-4 w-4"
                />
              )}
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onEdit(annotation.id)}
                >
                  <StickyNote className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-red-600 hover:text-red-700"
                  onClick={() => onDelete(annotation.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// EXPORTS
// ============================================

export const AnnotationNode = memo(AnnotationNodeComponent);
export { typeConfig as ANNOTATION_TYPE_CONFIG, priorityConfig as ANNOTATION_PRIORITY_CONFIG };

