"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/lib/stores/authStore";
import type { UserRole } from "@/types";

export interface Permissions {
  // View permissions
  canViewDashboard: boolean;
  canViewTraining: boolean;
  canViewWorkflows: boolean;
  canViewSessions: boolean;
  canViewAnalytics: boolean;
  canViewAdmin: boolean;

  // Action permissions
  canEditWorkflows: boolean;
  canCreateSessions: boolean;
  canJoinSessions: boolean;
  canTagWaste: boolean;
  canManageUsers: boolean;
  canManageOrganization: boolean;
  canManageWasteTypes: boolean;
  canManageTrainingContent: boolean;
  canExportData: boolean;

  // Role checks
  isAdmin: boolean;
  isFacilitator: boolean;
  isParticipant: boolean;

  // User state
  isAuthenticated: boolean;
  isLoading: boolean;
  role: UserRole | null;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  facilitator: 2,
  participant: 1,
};

/**
 * Hook to check user permissions based on their role
 * Uses the authStore to get the current user's role
 */
export function usePermissions(): Permissions {
  const { user, isLoading } = useAuthStore();

  const permissions = useMemo<Permissions>(() => {
    const role = user?.role ?? null;
    const isAuthenticated = !!user;

    // Role checks
    const isAdmin = role === "admin";
    const isFacilitator = role === "facilitator";
    const isParticipant = role === "participant";

    // Helper to check if user has at least a certain role level
    const hasMinRole = (minRole: UserRole): boolean => {
      if (!role) return false;
      return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
    };

    return {
      // View permissions - all authenticated users can view these
      canViewDashboard: isAuthenticated,
      canViewTraining: isAuthenticated,
      canViewWorkflows: isAuthenticated,
      canViewSessions: isAuthenticated,
      canViewAnalytics: isAuthenticated,

      // Admin page - admin only
      canViewAdmin: isAdmin,

      // Edit permissions - facilitator and above
      canEditWorkflows: hasMinRole("facilitator"),
      canCreateSessions: hasMinRole("facilitator"),
      canExportData: hasMinRole("facilitator"),

      // All authenticated users can do these
      canJoinSessions: isAuthenticated,
      canTagWaste: isAuthenticated,

      // Admin-only actions
      canManageUsers: isAdmin,
      canManageOrganization: isAdmin,
      canManageWasteTypes: isAdmin,
      canManageTrainingContent: isAdmin,

      // Role checks
      isAdmin,
      isFacilitator,
      isParticipant,

      // State
      isAuthenticated,
      isLoading,
      role,
    };
  }, [user, isLoading]);

  return permissions;
}

/**
 * Check if a role can perform an action
 * Can be used server-side or in non-React contexts
 */
export function checkPermission(
  role: UserRole | null | undefined,
  permission: keyof Omit<Permissions, "isAuthenticated" | "isLoading" | "role" | "isAdmin" | "isFacilitator" | "isParticipant">
): boolean {
  if (!role) return false;

  const isAdmin = role === "admin";
  const hasMinRole = (minRole: UserRole): boolean => {
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
  };

  switch (permission) {
    // View permissions
    case "canViewDashboard":
    case "canViewTraining":
    case "canViewWorkflows":
    case "canViewSessions":
    case "canViewAnalytics":
    case "canJoinSessions":
    case "canTagWaste":
      return true;

    // Admin only
    case "canViewAdmin":
    case "canManageUsers":
    case "canManageOrganization":
    case "canManageWasteTypes":
    case "canManageTrainingContent":
      return isAdmin;

    // Facilitator and above
    case "canEditWorkflows":
    case "canCreateSessions":
    case "canExportData":
      return hasMinRole("facilitator");

    default:
      return false;
  }
}

/**
 * Get the minimum role required for a route
 */
export function getRouteMinRole(pathname: string): UserRole | null {
  // Admin routes
  if (pathname.startsWith("/admin")) {
    return "admin";
  }

  // Routes that require facilitator or above
  if (pathname.includes("/workflows/") && pathname.includes("/edit")) {
    return "facilitator";
  }

  // Session creation
  if (pathname === "/sessions/new") {
    return "facilitator";
  }

  // All other dashboard routes - any authenticated user
  return null;
}

