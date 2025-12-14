"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar, MobileSidebarTrigger } from "@/components/layout/Sidebar";
import { useAuthStore } from "@/lib/stores/authStore";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import type { User } from "@/types";
import { VersatexLogo } from "@/components/branding/VersatexLogo";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isLoading, setUser, setLoading } = useAuthStore();
  const supabase = getSupabaseClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        
        if (!authSession) {
          router.push("/login");
          return;
        }

        // Get user profile from database
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", authSession.user.id)
          .single();

        if (profile) {
          setUser(profile);
        } else {
          // Create user profile if doesn't exist
          const newProfile: Partial<User> = {
            id: authSession.user.id,
            email: authSession.user.email!,
            name: authSession.user.user_metadata.name || authSession.user.email!.split("@")[0],
            role: "participant" as const,
          };
          
          await supabase.from("users").insert(newProfile);
          setUser(newProfile as User);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string) => {
        if (event === "SIGNED_OUT") {
          setUser(null);
          router.push("/login");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, router, setUser, setLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-platinum">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
          <p className="text-brand-charcoal">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-brand-platinum/30">
      {/* Desktop Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center h-14 px-4 border-b bg-white">
          <MobileSidebarTrigger />
          <Link href="/dashboard" className="flex items-center gap-2 ml-3">
            <VersatexLogo variant="sidebar" priority className="w-7 h-7 rounded-lg" />
            <span className="font-semibold text-brand-navy text-sm">ProcessOpt</span>
          </Link>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

