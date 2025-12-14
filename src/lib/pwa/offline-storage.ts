"use client";

const DB_NAME = "processopt-offline";
const DB_VERSION = 1;
const OBSERVATIONS_STORE = "offline-observations";

/**
 * Open the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(OBSERVATIONS_STORE)) {
        const store = db.createObjectStore(OBSERVATIONS_STORE, { keyPath: "id" });
        store.createIndex("session_id", "data.session_id");
        store.createIndex("created_at", "created_at");
      }
    };
  });
}

// ============================================
// OFFLINE OBSERVATION STORAGE
// ============================================

export interface OfflineObservation {
  id: string;
  data: {
    session_id: string;
    step_id: string;
    waste_type_ids: string[];
    notes?: string;
    is_digital: boolean;
    is_physical: boolean;
    frequency_score?: number;
    impact_score?: number;
    ease_score?: number;
  };
  created_at: string;
  synced: boolean;
}

/**
 * Save an observation for offline sync
 */
export async function saveOfflineObservation(
  observation: Omit<OfflineObservation, "id" | "created_at" | "synced">
): Promise<string> {
  const db = await openDatabase();

  const id = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const record: OfflineObservation = {
    id,
    data: observation.data,
    created_at: new Date().toISOString(),
    synced: false,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(OBSERVATIONS_STORE, "readwrite");
    const store = tx.objectStore(OBSERVATIONS_STORE);
    const request = store.add(record);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      // Request background sync if available
      if ("serviceWorker" in navigator && "sync" in ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then((registration) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (registration as any).sync.register("sync-observations");
        });
      }
      resolve(id);
    };
  });
}

/**
 * Get all pending offline observations
 */
export async function getOfflineObservations(): Promise<OfflineObservation[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(OBSERVATIONS_STORE, "readonly");
    const store = tx.objectStore(OBSERVATIONS_STORE);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Get offline observations for a specific session
 */
export async function getOfflineObservationsBySession(
  sessionId: string
): Promise<OfflineObservation[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(OBSERVATIONS_STORE, "readonly");
    const store = tx.objectStore(OBSERVATIONS_STORE);
    const index = store.index("session_id");
    const request = index.getAll(sessionId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Count pending offline observations
 */
export async function countOfflineObservations(): Promise<number> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(OBSERVATIONS_STORE, "readonly");
    const store = tx.objectStore(OBSERVATIONS_STORE);
    const request = store.count();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Mark an observation as synced
 */
export async function markObservationSynced(id: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(OBSERVATIONS_STORE, "readwrite");
    const store = tx.objectStore(OBSERVATIONS_STORE);
    const getRequest = store.get(id);

    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (record) {
        record.synced = true;
        const putRequest = store.put(record);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      } else {
        resolve();
      }
    };
  });
}

/**
 * Delete an offline observation
 */
export async function deleteOfflineObservation(id: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(OBSERVATIONS_STORE, "readwrite");
    const store = tx.objectStore(OBSERVATIONS_STORE);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Clear all synced observations
 */
export async function clearSyncedObservations(): Promise<void> {
  const observations = await getOfflineObservations();
  const synced = observations.filter((o) => o.synced);

  for (const obs of synced) {
    await deleteOfflineObservation(obs.id);
  }
}

/**
 * Sync all pending observations
 */
export async function syncOfflineObservations(): Promise<{
  synced: number;
  failed: number;
}> {
  const observations = await getOfflineObservations();
  const pending = observations.filter((o) => !o.synced);

  if (pending.length === 0) {
    return { synced: 0, failed: 0 };
  }

  try {
    // Transform observations for the API
    const observationsToSync = pending.map((obs) => ({
      id: obs.id,
      session_id: obs.data.session_id,
      step_id: obs.data.step_id,
      notes: obs.data.notes,
      is_digital: obs.data.is_digital,
      is_physical: obs.data.is_physical,
      frequency_score: obs.data.frequency_score || 3,
      impact_score: obs.data.impact_score || 3,
      ease_score: obs.data.ease_score || 3,
      waste_type_ids: obs.data.waste_type_ids,
      created_at: obs.created_at,
    }));

    // Batch sync all observations
    const response = await fetch("/api/observations/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ observations: observationsToSync }),
    });

    if (!response.ok) {
      throw new Error("Sync failed");
    }

    const result = await response.json();

    // Remove successfully synced observations from IndexedDB
    for (const obs of pending) {
      const wasFailed = result.errors?.some(
        (e: { id: string }) => e.id === obs.id
      );
      if (!wasFailed) {
        await deleteOfflineObservation(obs.id);
      }
    }

    return {
      synced: result.synced || 0,
      failed: result.failed || 0,
    };
  } catch (error) {
    console.error("Sync error:", error);
    return { synced: 0, failed: pending.length };
  }
}

// ============================================
// ONLINE/OFFLINE STATUS
// ============================================

/**
 * Check if currently online
 */
export function isOnline(): boolean {
  if (typeof window === "undefined") return true;
  return navigator.onLine;
}

/**
 * Subscribe to online/offline status changes
 */
export function subscribeToNetworkStatus(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}

