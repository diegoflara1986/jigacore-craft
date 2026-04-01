import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useProjectMembers, ProjectMember } from "@/hooks/useProjects";

const ROLE_GROUPS = {
  admin: ["admin", "super_admin"],
  management: ["admin", "super_admin", "project_manager"],
  lead: ["admin", "super_admin", "project_manager", "team_lead"],
  team: [
    "admin", "super_admin", "project_manager", "team_lead",
    "developer", "qa", "designer", "architect", "analyst",
  ],
} as const;

export type PermissionLevel = keyof typeof ROLE_GROUPS;

const PERMISSION_LABELS: Record<PermissionLevel, string> = {
  admin: "Administrador",
  management: "Project Manager o superior",
  lead: "Team Lead o superior",
  team: "Miembro del equipo",
};

export interface PermissionDeniedState {
  open: boolean;
  actionLabel: string;
  requiredRoleLabel: string;
  allowedMembers: ProjectMember[];
}

export function usePermissions(projectId?: string) {
  const { profile } = useAuth();
  const { data: members } = useProjectMembers(projectId);

  const [denied, setDenied] = useState<PermissionDeniedState>({
    open: false, actionLabel: "", requiredRoleLabel: "", allowedMembers: [],
  });

  const userRole = profile?.role ?? "external_user";

  const hasPermission = (level: PermissionLevel): boolean => {
    return (ROLE_GROUPS[level] as readonly string[]).includes(userRole);
  };

  const getMembersWithPermission = (level: PermissionLevel): ProjectMember[] => {
    if (!members) return [];
    const roles = ROLE_GROUPS[level] as readonly string[];
    return members.filter(
      (m) => m.profiles && roles.includes(m.profiles.role)
    );
  };

  /** Wrap an action: if allowed, run callback; otherwise show denied dialog */
  const guardAction = useCallback(
    (level: PermissionLevel, actionLabel: string, callback: () => void) => {
      if ((ROLE_GROUPS[level] as readonly string[]).includes(userRole)) {
        callback();
      } else {
        const allowed = members?.filter(
          (m) => m.profiles && (ROLE_GROUPS[level] as readonly string[]).includes(m.profiles.role)
        ) ?? [];
        setDenied({
          open: true,
          actionLabel,
          requiredRoleLabel: PERMISSION_LABELS[level],
          allowedMembers: allowed,
        });
      }
    },
    [userRole, members]
  );

  const closeDenied = useCallback(() => {
    setDenied((prev) => ({ ...prev, open: false }));
  }, []);

  return {
    userRole,
    hasPermission,
    getMembersWithPermission,
    guardAction,
    denied,
    closeDenied,
  };
}
