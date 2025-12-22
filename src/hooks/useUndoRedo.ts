import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Generic undo/redo stack that stores immutable snapshots.
 *
 * This hook is intentionally UI-framework-only; persistence is handled by callers.
 */
export function useUndoRedo<T>(options?: { limit?: number }) {
  const limit = options?.limit ?? 50;

  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);

  // Keep a ref of the latest pushed snapshot so we can avoid duplicate pushes.
  const lastPushedRef = useRef<string | null>(null);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  useEffect(() => {
    pastRef.current = past;
  }, [past]);

  useEffect(() => {
    futureRef.current = future;
  }, [future]);

  const clear = useCallback(() => {
    setPast([]);
    setFuture([]);
    pastRef.current = [];
    futureRef.current = [];
    lastPushedRef.current = null;
  }, []);

  const pushSnapshot = useCallback(
    (snapshot: T) => {
      // Attempt to de-dupe identical pushes (best-effort; caller should pass stable snapshots).
      // We use JSON stringify because snapshots are plain data (steps/connections) in this app.
      // If stringify fails (circular), we skip de-dupe and push anyway.
      let key: string | null = null;
      try {
        key = JSON.stringify(snapshot);
      } catch {
        key = null;
      }

      if (key && lastPushedRef.current === key) return;
      if (key) lastPushedRef.current = key;

      setPast((prev) => {
        const next = [...prev, snapshot];
        return next.length > limit ? next.slice(next.length - limit) : next;
      });
      setFuture([]);
    },
    [limit]
  );

  const undo = useCallback((): T | null => {
    const prev = pastRef.current;
    if (prev.length === 0) return null;
    const snapshot = prev[prev.length - 1] ?? null;
    pastRef.current = prev.slice(0, -1);
    setPast(pastRef.current);
    return snapshot;
  }, []);

  const redo = useCallback((): T | null => {
    const prev = futureRef.current;
    if (prev.length === 0) return null;
    const snapshot = prev[prev.length - 1] ?? null;
    futureRef.current = prev.slice(0, -1);
    setFuture(futureRef.current);
    return snapshot;
  }, []);

  // Internal helpers for callers that want symmetric stacks.
  // We expose these as stable callbacks so the workflow page can keep redo accurate.
  const pushRedoSnapshot = useCallback(
    (snapshot: T) => {
      setFuture((prev) => {
        const next = [...prev, snapshot];
        return next.length > limit ? next.slice(next.length - limit) : next;
      });
    },
    [limit]
  );

  const pushUndoSnapshot = useCallback(
    (snapshot: T) => {
      setPast((prev) => {
        const next = [...prev, snapshot];
        return next.length > limit ? next.slice(next.length - limit) : next;
      });
    },
    [limit]
  );

  return useMemo(
    () => ({
      canUndo,
      canRedo,
      undo,
      redo,
      pushSnapshot,
      pushUndoSnapshot,
      pushRedoSnapshot,
      clear,
    }),
    [canUndo, canRedo, undo, redo, pushSnapshot, pushUndoSnapshot, pushRedoSnapshot, clear]
  );
}
