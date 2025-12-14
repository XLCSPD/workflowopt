"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Search, HelpCircle, Check, CheckCheck, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteReadNotifications,
  subscribeToNotifications,
  type Notification,
} from "@/lib/services/notifications";
import { useAuthStore } from "@/lib/stores/authStore";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function Header({ title, description, actions }: HeaderProps) {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        getNotifications(10),
        getUnreadCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load on mount and when dropdown opens
  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, loadNotifications]);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToNotifications(user.id, (notification) => {
      setNotifications((prev) => [notification, ...prev.slice(0, 9)]);
      setUnreadCount((prev) => prev + 1);
    });

    return unsubscribe;
  }, [user]);

  // Handle mark as read
  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  // Handle clear read notifications
  const handleClearRead = async () => {
    await deleteReadNotifications();
    setNotifications((prev) => prev.filter((n) => !n.read));
  };

  // Format time ago
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const readNotifications = notifications.filter((n) => n.read);
  const hasReadNotifications = readNotifications.length > 0;

  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 min-h-16 py-3 sm:py-0 px-4 sm:px-6 bg-white border-b border-border">
      <div className="flex-1 min-w-0">
        <h1 className="text-lg sm:text-xl font-semibold text-brand-navy truncate">{title}</h1>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end w-full sm:w-auto">
        {/* Search - hidden on mobile */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="w-48 xl:w-64 pl-9 h-9 bg-brand-platinum/50 border-0 focus-visible:ring-brand-gold"
          />
        </div>

        {/* Actions slot */}
        {actions}

        {/* Help - hidden on small mobile */}
        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 hidden sm:flex">
          <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        </Button>

        {/* Notifications */}
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 relative">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 p-0 flex items-center justify-center text-[10px] sm:text-xs bg-brand-gold text-brand-navy">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 sm:w-80">
            <div className="flex items-center justify-between px-2">
              <DropdownMenuLabel className="py-2">Notifications</DropdownMenuLabel>
              {notifications.length > 0 && (
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={(e) => {
                        e.preventDefault();
                        handleMarkAllAsRead();
                      }}
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      Read all
                    </Button>
                  )}
                  {hasReadNotifications && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        handleClearRead();
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear read
                    </Button>
                  )}
                </div>
              )}
            </div>
            <DropdownMenuSeparator />
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <ScrollArea className="max-h-80">
                {notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      "flex flex-col items-start gap-1 p-3 cursor-pointer",
                      !notification.read && "bg-brand-gold/5"
                    )}
                    onClick={() => {
                      if (!notification.read) {
                        handleMarkAsRead(notification.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between w-full gap-2">
                      <span className="font-medium text-sm">{notification.title}</span>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-brand-gold flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {notification.message}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70">
                      {formatTimeAgo(notification.created_at)}
                    </span>
                  </DropdownMenuItem>
                ))}
              </ScrollArea>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

