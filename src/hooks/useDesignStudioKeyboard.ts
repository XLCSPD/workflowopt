"use client";

import { useEffect, useCallback } from "react";
import type { DesignStudioActions, DesignStudioState } from "@/types/design-studio";

interface UseDesignStudioKeyboardProps {
  state: DesignStudioState;
  actions: DesignStudioActions;
  enabled?: boolean;
  onDelete?: () => void;
}

/**
 * Hook for handling keyboard shortcuts in the Design Studio
 * 
 * Shortcuts:
 * - Ctrl/Cmd + Z: Undo
 * - Ctrl/Cmd + Shift + Z: Redo
 * - Ctrl/Cmd + Y: Redo (alternative)
 * - Ctrl/Cmd + S: Save
 * - Ctrl/Cmd + D: Duplicate selected
 * - Ctrl/Cmd + C: Copy
 * - Ctrl/Cmd + V: Paste
 * - Ctrl/Cmd + X: Cut
 * - Ctrl/Cmd + A: Select all
 * - Delete/Backspace: Delete selected
 * - Escape: Deselect all / Cancel operation
 */
export function useDesignStudioKeyboard({
  state,
  actions,
  enabled = true,
  onDelete,
}: UseDesignStudioKeyboardProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Only handle shortcuts when in edit mode
      if (!enabled || !state.isEditMode) return;

      // Ignore if typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      // Escape - Deselect all or cancel active tool
      if (event.key === "Escape") {
        event.preventDefault();
        if (state.activeTool) {
          actions.setActiveTool(null);
        } else {
          actions.deselectAll();
        }
        return;
      }

      // Delete/Backspace - Delete selected
      if (event.key === "Delete" || event.key === "Backspace") {
        // Only if something is selected
        if (
          state.selectedNodeIds.length > 0 ||
          state.selectedEdgeId ||
          state.selectedAnnotationId
        ) {
          event.preventDefault();
          onDelete?.();
        }
        return;
      }

      // Modifier-based shortcuts
      if (modifier) {
        switch (event.key.toLowerCase()) {
          case "z":
            event.preventDefault();
            if (event.shiftKey) {
              // Ctrl/Cmd + Shift + Z = Redo
              if (actions.canRedo()) {
                actions.redo();
              }
            } else {
              // Ctrl/Cmd + Z = Undo
              if (actions.canUndo()) {
                actions.undo();
              }
            }
            break;

          case "y":
            // Ctrl/Cmd + Y = Redo (Windows style)
            event.preventDefault();
            if (actions.canRedo()) {
              actions.redo();
            }
            break;

          case "s":
            // Ctrl/Cmd + S = Save
            event.preventDefault();
            actions.save();
            break;

          case "d":
            // Ctrl/Cmd + D = Duplicate
            event.preventDefault();
            if (state.selectedNodeIds.length === 1) {
              actions.duplicateNode(state.selectedNodeIds[0]);
            }
            break;

          case "c":
            // Ctrl/Cmd + C = Copy
            event.preventDefault();
            actions.copy();
            break;

          case "v":
            // Ctrl/Cmd + V = Paste
            event.preventDefault();
            actions.paste();
            break;

          case "x":
            // Ctrl/Cmd + X = Cut
            event.preventDefault();
            actions.cut();
            break;

          case "a":
            // Ctrl/Cmd + A = Select all
            // This is handled by the canvas component which knows all node IDs
            event.preventDefault();
            break;
        }
      }
    },
    [state, actions, enabled, onDelete]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    // Expose for manual triggering if needed
    triggerUndo: () => actions.canUndo() && actions.undo(),
    triggerRedo: () => actions.canRedo() && actions.redo(),
    triggerSave: () => actions.save(),
  };
}

/**
 * Format a keyboard shortcut for display
 */
export function formatShortcut(keys: string[]): string {
  const isMac = typeof navigator !== "undefined" && 
                navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  
  return keys
    .map((key) => {
      switch (key.toLowerCase()) {
        case "mod":
          return isMac ? "⌘" : "Ctrl";
        case "shift":
          return isMac ? "⇧" : "Shift";
        case "alt":
          return isMac ? "⌥" : "Alt";
        case "ctrl":
          return isMac ? "⌃" : "Ctrl";
        case "delete":
          return isMac ? "⌫" : "Del";
        case "backspace":
          return "⌫";
        case "escape":
          return "Esc";
        case "enter":
          return "↵";
        default:
          return key.toUpperCase();
      }
    })
    .join(isMac ? "" : "+");
}

/**
 * Keyboard shortcuts reference for help display
 */
export const KEYBOARD_SHORTCUTS = [
  { keys: ["mod", "z"], action: "Undo" },
  { keys: ["mod", "shift", "z"], action: "Redo" },
  { keys: ["mod", "s"], action: "Save" },
  { keys: ["mod", "d"], action: "Duplicate selected" },
  { keys: ["mod", "c"], action: "Copy" },
  { keys: ["mod", "v"], action: "Paste" },
  { keys: ["mod", "x"], action: "Cut" },
  { keys: ["delete"], action: "Delete selected" },
  { keys: ["escape"], action: "Deselect / Cancel" },
];

