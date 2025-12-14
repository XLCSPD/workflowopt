"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, WifiOff } from "lucide-react";

interface PWAProviderProps {
  children: React.ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const { toast } = useToast();
  const [isInstallable, setIsInstallable] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [online, setOnline] = useState(true);
  const [isPWA, setIsPWA] = useState(false);

  // Check if running as PWA (client-side only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isStandalone = 
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches;
      setIsPWA(isStandalone);
    }
  }, []);

  // Handle install
  const handleInstall = useCallback(async () => {
    const { showInstallPrompt } = await import("@/lib/pwa/register-sw");
    const installed = await showInstallPrompt();
    if (installed) {
      setIsInstallable(false);
    }
  }, []);

  // Handle update
  const handleUpdate = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    }
  }, [registration]);

  // Register service worker and setup event listeners (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    let mounted = true;

    const init = async () => {
      try {
        const { registerServiceWorker, setupInstallPrompt } = await import("@/lib/pwa/register-sw");
        
        const reg = await registerServiceWorker();
        if (mounted && reg) {
          setRegistration(reg);
        }

        setupInstallPrompt();
      } catch (error) {
        console.error("[PWA] Init error:", error);
      }
    };

    init();

    // Listen for install prompt availability
    const handleInstallable = () => setIsInstallable(true);
    const handleInstalled = () => {
      setIsInstallable(false);
      toast({
        title: "App Installed",
        description: "Process Optimization is now installed on your device.",
      });
    };

    // Listen for updates
    const handleUpdateAvailable = (event: Event) => {
      setHasUpdate(true);
      setRegistration((event as CustomEvent).detail);
    };

    window.addEventListener("pwa-installable", handleInstallable);
    window.addEventListener("pwa-installed", handleInstalled);
    window.addEventListener("sw-update-available", handleUpdateAvailable);

    return () => {
      mounted = false;
      window.removeEventListener("pwa-installable", handleInstallable);
      window.removeEventListener("pwa-installed", handleInstalled);
      window.removeEventListener("sw-update-available", handleUpdateAvailable);
    };
  }, [toast]);

  // Network status handling (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    setOnline(navigator.onLine);

    const handleOnline = async () => {
      setOnline(true);
      toast({
        title: "Back Online",
        description: "Your connection has been restored.",
      });

      // Try to sync offline observations
      try {
        const { countOfflineObservations, syncOfflineObservations } = await import("@/lib/pwa/offline-storage");
        const pendingCount = await countOfflineObservations();
        if (pendingCount > 0) {
          toast({
            title: "Syncing",
            description: `Syncing ${pendingCount} offline observation(s)...`,
          });

          const result = await syncOfflineObservations();
          if (result.synced > 0) {
            toast({
              title: "Sync Complete",
              description: `${result.synced} observation(s) synced successfully.`,
            });
          }
          if (result.failed > 0) {
            toast({
              variant: "destructive",
              title: "Sync Error",
              description: `${result.failed} observation(s) failed to sync.`,
            });
          }
        }
      } catch (error) {
        console.error("[PWA] Sync error:", error);
      }
    };

    const handleOffline = () => {
      setOnline(false);
      toast({
        title: "You're Offline",
        description: "Don't worry, your work will be saved and synced when you reconnect.",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [toast]);

  return (
    <>
      {children}

      {/* Offline indicator */}
      {!online && (
        <div className="fixed bottom-4 left-4 z-50">
          <div className="bg-orange-100 text-orange-800 px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm">
            <WifiOff className="h-4 w-4" />
            <span>Offline Mode</span>
          </div>
        </div>
      )}

      {/* Install prompt */}
      {isInstallable && !isPWA && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            onClick={handleInstall}
            className="bg-brand-gold hover:bg-brand-gold/90 text-brand-navy shadow-lg"
          >
            <Download className="mr-2 h-4 w-4" />
            Install App
          </Button>
        </div>
      )}

      {/* Update available */}
      {hasUpdate && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            onClick={handleUpdate}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Update Available
          </Button>
        </div>
      )}
    </>
  );
}

/**
 * Hook to check network status
 */
export function useNetworkStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    setOnline(navigator.onLine);

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { online };
}

/**
 * Component to show network status
 */
export function NetworkStatusIndicator() {
  const { online } = useNetworkStatus();

  if (online) {
    return (
      <div className="flex items-center gap-1 text-green-600 text-sm">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        <span>Online</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-orange-600 text-sm">
      <WifiOff className="h-3 w-3" />
      <span>Offline</span>
    </div>
  );
}

