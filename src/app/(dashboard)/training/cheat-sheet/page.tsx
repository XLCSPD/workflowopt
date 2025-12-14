"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  AlertCircle,
  Copy,
  Clock,
  UserMinus,
  Truck,
  Package,
  Move,
  Layers,
  Unlink,
  FileWarning,
  ToggleLeft,
  Database,
  Split,
  Hourglass,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getWasteTypes } from "@/lib/services/wasteTypes";
import type { WasteType } from "@/types";

const wasteIcons: Record<string, React.ElementType> = {
  D: AlertCircle,
  O: Copy,
  W: Clock,
  N: UserMinus,
  T: Truck,
  I: Package,
  M: Move,
  E: Layers,
  IW: Unlink,
  DO: FileWarning,
  UF: ToggleLeft,
  ED: Database,
  FW: Split,
  DW: Hourglass,
};

const wasteColors: Record<string, string> = {
  D: "#EF4444",
  O: "#F97316",
  W: "#EAB308",
  N: "#8B5CF6",
  T: "#3B82F6",
  I: "#06B6D4",
  M: "#10B981",
  E: "#EC4899",
  IW: "#7C3AED",
  DO: "#DC2626",
  UF: "#0891B2",
  ED: "#4F46E5",
  FW: "#9333EA",
  DW: "#CA8A04",
};

export default function CheatSheetPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [activeTab, setActiveTab] = useState("core_lean");

  // Fetch waste types from Supabase
  useEffect(() => {
    const loadWasteTypes = async () => {
      try {
        setIsLoading(true);
        const data = await getWasteTypes();
        setWasteTypes(data);
      } catch (error) {
        console.error("Failed to load waste types:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load waste types.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadWasteTypes();
  }, [toast]);

  const coreLeanWastes = wasteTypes.filter((wt) => wt.category === "core_lean");
  const digitalWastes = wasteTypes.filter((wt) => wt.category === "digital");

  const filteredWastes = activeTab === "core_lean" ? coreLeanWastes : digitalWastes;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Waste Type Cheat Sheet"
        description="Quick reference guide for all Lean waste types"
        actions={
          <Button asChild variant="ghost">
            <Link href="/training">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Training
            </Link>
          </Button>
        }
      />

      <div className="flex-1 p-6 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="core_lean">
              DOWNTIME Wastes ({coreLeanWastes.length})
            </TabsTrigger>
            <TabsTrigger value="digital">
              Digital Wastes ({digitalWastes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <div className="grid gap-4 md:grid-cols-2 pb-6">
              {filteredWastes.map((waste) => {
                const Icon = wasteIcons[waste.code] || AlertCircle;
                const color = wasteColors[waste.code] || "#6B7280";

                return (
                  <Card key={waste.id} className="overflow-hidden">
                    <CardHeader
                      className="pb-3"
                      style={{ borderLeft: `4px solid ${color}` }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: `${color}20` }}
                          >
                            <Icon className="h-5 w-5" style={{ color }} />
                          </div>
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {waste.name}
                              <Badge variant="outline">{waste.code}</Badge>
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {waste.category === "core_lean"
                                ? "Core Lean Waste"
                                : "Digital Waste"}
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-1">Description</p>
                        <p className="text-sm text-muted-foreground">
                          {waste.description}
                        </p>
                      </div>

                      {waste.digital_examples &&
                        waste.digital_examples.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">
                              Digital Examples
                            </p>
                            <ul className="space-y-1">
                              {waste.digital_examples.map((example, idx) => (
                                <li
                                  key={idx}
                                  className="text-sm text-muted-foreground flex items-start gap-2"
                                >
                                  <span
                                    className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  {example}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredWastes.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No waste types found in this category.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
