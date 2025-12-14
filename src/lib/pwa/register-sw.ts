"use client";

/**
 * Register the service worker for PWA functionality
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.log("[PWA] Service workers not supported");
    return null;
  }

  // Only register in production
  if (process.env.NODE_ENV !== "production") {
    console.log("[PWA] Skipping SW registration in development");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    console.log("[PWA] Service Worker registered:", registration.scope);

    // Check for updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          // New content is available
          console.log("[PWA] New content available, refresh to update");
          
          // Dispatch custom event for UI to handle
          window.dispatchEvent(
            new CustomEvent("sw-update-available", { detail: registration })
          );
        }
      });
    });

    return registration;
  } catch (error) {
    console.error("[PWA] Service Worker registration failed:", error);
    return null;
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
      console.log("[PWA] Service Worker unregistered");
      return true;
    }
    return false;
  } catch (error) {
    console.error("[PWA] Service Worker unregistration failed:", error);
    return false;
  }
}

/**
 * Check if an update is available
 */
export async function checkForUpdate(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      console.log("[PWA] Checked for updates");
    }
  } catch (error) {
    console.error("[PWA] Update check failed:", error);
  }
}

/**
 * Skip waiting and activate new service worker
 */
export function skipWaiting(registration: ServiceWorkerRegistration): void {
  const waitingWorker = registration.waiting;
  if (waitingWorker) {
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  }
}

/**
 * Check if the app can be installed (PWA)
 */
export function isInstallable(): boolean {
  // Check for beforeinstallprompt support
  return "BeforeInstallPromptEvent" in window;
}

/**
 * Install prompt event handler
 */
let deferredPrompt: Event | null = null;

export function setupInstallPrompt(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Dispatch custom event for UI to handle
    window.dispatchEvent(new CustomEvent("pwa-installable"));
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    console.log("[PWA] App installed");
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent("pwa-installed"));
  });
}

/**
 * Show the install prompt
 */
export async function showInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prompt = deferredPrompt as any;
  prompt.prompt();

  const result = await prompt.userChoice;
  deferredPrompt = null;

  return result.outcome === "accepted";
}

/**
 * Check if the app is running as installed PWA
 */
export function isRunningAsPWA(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    // iOS Safari specific
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

