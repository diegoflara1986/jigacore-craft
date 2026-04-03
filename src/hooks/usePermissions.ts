import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useProjectMembers, ProjectMember } from "@/hooks/useProjects";

const fromTable = (table: string) => (supabase as any).from(table);

export interface RoleInfo {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_system_role: boolean;
}

export interface PermissionDeniedState {
  open: boolean;
  actionLabel: string;
  requiredPermission: string;
  allowedMembers: ProjectMember[];
}

export function usePermissions(projectId?: string) {
  const { profile } = useAuth();
  const { data: members } = useProjectMembers(projectId);

  const [denied, setDenied] = useState<PermissionDeniedState>({
    open: false, actionLabel: "", requiredPermission: "", allowedMembers: [],
  });

  const roleId = profile?.role_id;
  const baseRole = profile?.role ?? "external_user";
  const isSuperAdmin = baseRole === "super_admin";

  // Fetch all permissions for the user's role (cached)
  const { data: permissionSet } = useQuery({
    queryKey: ["role-permissions-set", roleId],
    enabled: !!roleId && !isSuperAdmin,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await fromTable("role_permissions")
        .select("module, action")
        .eq("role_id", roleId!)
        .eq("is_allowed", true);
      if (error) throw error;
      const set = new Set<string>();
      (data ?? []).forEach((p: any) => set.add(`${p.module}:${p.action}`));
      return set;
    },
  });

  // Fetch incident permissions
  const { data: incidentPerms } = useQuery({
    queryKey: ["role-incident-perms", roleId],
    enabled: !!roleId && !isSuperAdmin,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await fromTable("role_incident_permissions")
        .select("can_create, can_manage, can_close")
        .eq("role_id", roleId!)
        .maybeSingle();
      if (error) throw error;
      return data ?? { can_create: false, can_manage: false, can_close: false };
    },
  });

  // Fetch role info
  const { data: roleInfo } = useQuery({
    queryKey: ["custom-role-info", roleId],
    enabled: !!roleId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await fromTable("custom_roles")
        .select("id, name, description, color, icon, is_system_role")
        .eq("id", roleId!)
        .single();
      if (error) throw error;
      return data as RoleInfo;
    },
  });

  const hasPermission = useCallback((module: string, action: string): boolean => {
    if (isSuperAdmin) return true;
    if (!permissionSet) return false;
    return permissionSet.has(`${module}:${action}`);
  }, [isSuperAdmin, permissionSet]);

  const hasIncidentPermission = useCallback((permission: "can_create" | "can_manage" | "can_close"): boolean => {
    if (isSuperAdmin || baseRole === "admin") return true;
    if (!incidentPerms) return false;
    return (incidentPerms as any)[permission] ?? false;
  }, [isSuperAdmin, baseRole, incidentPerms]);

  const guardAction = useCallback(
    (module: string, action: string, actionLabel: string, callback: () => void) => {
      if (hasPermission(module, action)) {
        callback();
      } else {
        setDenied({
          open: true,
          actionLabel,
          requiredPermission: `${module}:${action}`,
          allowedMembers: [],
        });
      }
    },
    [hasPermission]
  );

  const closeDenied = useCallback(() => {
    setDenied(prev => ({ ...prev, open: false }));
  }, []);

  return {
    userRole: roleInfo ?? null,
    baseRole,
    hasPermission,
    hasIncidentPermission,
    guardAction,
    denied,
    closeDenied,
    isLoading: !isSuperAdmin && !permissionSet && !!roleId,
  };
}
