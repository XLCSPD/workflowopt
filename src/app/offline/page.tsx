"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WifiOff, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-platinum/30 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
            <WifiOff className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl">You&apos;re Offline</CardTitle>
          <CardDescription>
            It looks like you&apos;ve lost your internet connection. Some features may be unavailable until you reconnect.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-medium text-sm mb-2">Available Offline:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• View cached pages and data</li>
              <li>• Access previously loaded workflows</li>
              <li>• Review training materials</li>
              <li>• Queue observations for sync</li>
            </ul>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-medium text-sm mb-2">Unavailable Offline:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Real-time collaboration</li>
              <li>• New data sync</li>
              <li>• User authentication</li>
              <li>• File uploads</li>
            </ul>
          </div>
          
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={handleRetry} className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-navy">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
          </div>
          
          <p className="text-xs text-center text-muted-foreground pt-2">
            Your offline observations will be automatically synced when you reconnect.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

