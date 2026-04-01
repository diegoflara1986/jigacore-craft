import { useAuth } from "@/lib/auth";
import { useProjectMembers, ProjectMember } from "@/hooks/useProjects";

// Maps RLS function names to allowed roles
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

export function usePermissions(projectId?: string) {
  const { profile } = useAuth();
  const { data: members } = useProjectMembers(projectId);

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

  const getPermissionLabel = (level: PermissionLevel): string => {
    return PERMISSION_LABELS[level];
  };

  return {
    userRole,
    hasPermission,
    getMembersWithPermission,
    getPermissionLabel,
    members,
  };
}
