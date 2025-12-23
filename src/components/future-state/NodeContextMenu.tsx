"use client";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Pencil,
  Sparkles,
  Copy,
  Link,
  StickyNote,
  Shield,
  Trash2,
  ArrowRightLeft,
  CircleDot,
  Square,
  XCircle,
  PlusCircle,
} from "lucide-react";
import type { NodeAction } from "@/types";

interface NodeContextMenuProps {
  children: React.ReactNode;
  nodeId: string;
  nodeName: string;
  currentAction: NodeAction;
  onEditDesign: () => void;
  onGenerateAI: () => void;
  onChangeAction: (action: NodeAction) => void;
  onDuplicate: () => void;
  onConnectTo: () => void;
  onAddNote: () => void;
  onAddGuardrail: () => void;
  onDelete: () => void;
  disabled?: boolean;
}

const actionConfig: Record<NodeAction, { icon: typeof Square; label: string; color: string }> = {
  keep: { icon: CircleDot, label: "Keep", color: "text-slate-600" },
  modify: { icon: Pencil, label: "Modify", color: "text-amber-600" },
  remove: { icon: XCircle, label: "Remove", color: "text-red-600" },
  new: { icon: PlusCircle, label: "New", color: "text-emerald-600" },
};

export function NodeContextMenu({
  children,
  nodeId,
  nodeName,
  currentAction,
  onEditDesign,
  onGenerateAI,
  onChangeAction,
  onDuplicate,
  onConnectTo,
  onAddNote,
  onAddGuardrail,
  onDelete,
  disabled = false,
}: NodeContextMenuProps) {
  // Void usage to avoid lint warning
  void nodeId;

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground truncate">
          {nodeName}
        </div>
        <ContextMenuSeparator />

        <ContextMenuItem onClick={onEditDesign}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit Step Design
        </ContextMenuItem>

        <ContextMenuItem onClick={onGenerateAI}>
          <Sparkles className="h-4 w-4 mr-2" />
          Generate AI Design
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Change Action
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {(Object.keys(actionConfig) as NodeAction[]).map((action) => {
              const config = actionConfig[action];
              const Icon = config.icon;
              const isActive = currentAction === action;

              return (
                <ContextMenuItem
                  key={action}
                  onClick={() => onChangeAction(action)}
                  className={isActive ? "bg-accent" : ""}
                >
                  <Icon className={`h-4 w-4 mr-2 ${config.color}`} />
                  {config.label}
                  {isActive && <span className="ml-auto text-xs">✓</span>}
                </ContextMenuItem>
              );
            })}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </ContextMenuItem>

        <ContextMenuItem onClick={onConnectTo}>
          <Link className="h-4 w-4 mr-2" />
          Connect to...
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onAddNote}>
          <StickyNote className="h-4 w-4 mr-2" />
          Add Note
        </ContextMenuItem>

        <ContextMenuItem onClick={onAddGuardrail}>
          <Shield className="h-4 w-4 mr-2" />
          Add Guardrail
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={onDelete}
          className="text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Step
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

