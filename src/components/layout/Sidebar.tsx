"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  GraduationCap,
  GitBranch,
  Users,
  BarChart3,
  Settings,
  LogOut,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import { VersatexLogo } from "@/components/branding/VersatexLogo";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Training",
    href: "/training",
    icon: GraduationCap,
  },
  {
    title: "Workflows",
    href: "/workflows",
    icon: GitBranch,
  },
  {
    title: "Sessions",
    href: "/sessions",
    icon: Users,
  },
  {
    title: "Future State Studio",
    href: "/future-state",
    icon: Sparkles,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
];

const adminItems = [
  {
    title: "Admin",
    href: "/admin",
    icon: Settings,
  },
];

// Mobile sidebar trigger button component
export function MobileSidebarTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close sheet when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-72">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation Menu</SheetTitle>
        </SheetHeader>
        <MobileSidebarContent onClose={() => setIsOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

// Mobile sidebar content
function MobileSidebarContent({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const supabase = getSupabaseClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    router.push("/login");
    onClose();
  };

  const handleNavClick = () => {
    onClose();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        <Link
          href="/dashboard"
          className="flex items-center gap-2"
          onClick={handleNavClick}
        >
          <VersatexLogo variant="sidebar" priority />
          <span className="font-semibold text-brand-navy">ProcessOpt</span>
        </Link>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                "hover:bg-brand-gold/10",
                isActive
                  ? "bg-brand-gold/20 text-brand-navy font-medium"
                  : "text-brand-charcoal hover:text-brand-navy"
              )}
            >
              <Icon
                className={cn("h-5 w-5 flex-shrink-0", isActive && "text-brand-gold")}
              />
              <span>{item.title}</span>
            </Link>
          );
        })}

        {user?.role === "admin" && (
          <>
            <Separator className="my-3" />
            {adminItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    "hover:bg-brand-gold/10",
                    isActive
                      ? "bg-brand-gold/20 text-brand-navy font-medium"
                      : "text-brand-charcoal hover:text-brand-navy"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 flex-shrink-0",
                      isActive && "text-brand-gold"
                    )}
                  />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Cheat Sheet Quick Access */}
      <div className="p-3">
        <Link
          href="/training/cheat-sheet"
          onClick={handleNavClick}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
            "bg-brand-platinum text-brand-charcoal hover:bg-brand-gold/20 hover:text-brand-navy"
          )}
        >
          <BookOpen className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">Waste Cheat Sheet</span>
        </Link>
      </div>

      <Separator />

      {/* User Profile */}
      <div className="p-3">
        <div className="flex items-center gap-3 p-2 rounded-lg">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.avatar_url} />
            <AvatarFallback className="bg-brand-gold text-brand-navy text-sm font-medium">
              {user?.name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-brand-navy truncate">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.role || "Participant"}
            </p>
          </div>
          <Link href="/settings" onClick={handleNavClick}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-brand-navy"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Desktop sidebar
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const supabase = getSupabaseClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    router.push("/login");
  };

  const NavLink = ({
    item,
  }: {
    item: { title: string; href: string; icon: React.ElementType };
  }) => {
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;

    const linkContent = (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
          "hover:bg-brand-gold/10",
          isActive
            ? "bg-brand-gold/20 text-brand-navy font-medium"
            : "text-brand-charcoal hover:text-brand-navy"
        )}
      >
        <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-brand-gold")} />
        {!isCollapsed && <span>{item.title}</span>}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.title}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen bg-white border-r border-border transition-all duration-300",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <Link
            href="/dashboard"
            className={cn("flex items-center gap-2", isCollapsed && "justify-center w-full")}
          >
            <VersatexLogo variant="sidebar" priority />
            {!isCollapsed && <span className="font-semibold text-brand-navy">ProcessOpt</span>}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}

          {user?.role === "admin" && (
            <>
              <Separator className="my-3" />
              {adminItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </>
          )}
        </nav>

        {/* Cheat Sheet Quick Access */}
        <div className="p-3">
          <Link
            href="/training/cheat-sheet"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
              "bg-brand-platinum text-brand-charcoal hover:bg-brand-gold/20 hover:text-brand-navy"
            )}
          >
            <BookOpen className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm">Waste Cheat Sheet</span>}
          </Link>
        </div>

        <Separator />

        {/* User Profile */}
        <div className="p-3">
          <div
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg",
              isCollapsed && "justify-center"
            )}
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.avatar_url} />
              <AvatarFallback className="bg-brand-gold text-brand-navy text-sm font-medium">
                {user?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-navy truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.role || "Participant"}
                </p>
              </div>
            )}
            {!isCollapsed && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/settings">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-brand-navy"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>Settings</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sign out</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
