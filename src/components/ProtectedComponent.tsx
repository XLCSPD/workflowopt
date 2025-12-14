"use client";

import { ReactNode } from "react";
import { usePermissions, type Permissions } from "@/lib/hooks/usePermissions";
import type { UserRole } from "@/types";

type PermissionKey = keyof Omit<
  Permissions,
  "isAuthenticated" | "isLoading" | "role" | "isAdmin" | "isFacilitator" | "isParticipant"
>;

interface ProtectedComponentProps {
  children: ReactNode;
  /**
   * The permission required to render the children
   */
  permission?: PermissionKey;
  /**
   * Minimum role required (alternative to permission)
   */
  minRole?: UserRole;
  /**
   * Fallback content to show when permission is denied
   */
  fallback?: ReactNode;
  /**
   * Whether to show nothing (not even fallback) when loading
   */
  hideWhileLoading?: boolean;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  facilitator: 2,
  participant: 1,
};

/**
 * Component to conditionally render children based on user permissions
 *
 * @example
 * // Using permission check
 * <ProtectedComponent permission="canManageUsers">
 *   <Button>Manage Users</Button>
 * </ProtectedComponent>
 *
 * @example
 * // Using minimum role
 * <ProtectedComponent minRole="facilitator">
 *   <Button>Create Session</Button>
 * </ProtectedComponent>
 *
 * @example
 * // With fallback
 * <ProtectedComponent permission="canEditWorkflows" fallback={<span>View Only</span>}>
 *   <Button>Edit Workflow</Button>
 * </ProtectedComponent>
 */
export function ProtectedComponent({
  children,
  permission,
  minRole,
  fallback = null,
  hideWhileLoading = false,
}: ProtectedComponentProps) {
  const permissions = usePermissions();

  // Handle loading state
  if (permissions.isLoading) {
    return hideWhileLoading ? null : <>{fallback}</>;
  }

  // Check if user is authenticated
  if (!permissions.isAuthenticated) {
    return <>{fallback}</>;
  }

  // Check permission if specified
  if (permission && !permissions[permission]) {
    return <>{fallback}</>;
  }

  // Check minimum role if specified
  if (minRole && permissions.role) {
    const userLevel = ROLE_HIERARCHY[permissions.role];
    const requiredLevel = ROLE_HIERARCHY[minRole];
    if (userLevel < requiredLevel) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

/**
 * Hook-based alternative for more complex conditional rendering
 * Returns a function to check if content should be shown
 */
export function useProtected() {
  const permissions = usePermissions();

  const canShow = (
    options: { permission?: PermissionKey; minRole?: UserRole }
  ): boolean => {
    if (!permissions.isAuthenticated) return false;

    if (options.permission && !permissions[options.permission]) {
      return false;
    }

    if (options.minRole && permissions.role) {
      const userLevel = ROLE_HIERARCHY[permissions.role];
      const requiredLevel = ROLE_HIERARCHY[options.minRole];
      if (userLevel < requiredLevel) {
        return false;
      }
    }

    return true;
  };

  return { canShow, ...permissions };
}

