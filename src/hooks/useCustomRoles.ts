import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const fromTable = (table: string) => (supabase as any).from(table);

export interface CustomRole {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_system_role: boolean;
  is_active: boolean;
  base_role: string | null;
  created_by: string | null;
  created_at: string;
  user_count?: number;
}

export interface RolePermission {
  id: string;
  role_id: string;
  module: string;
  action: string;
  is_allowed: boolean;
}

export interface RoleIncidentPermission {
  id: string;
  role_id: string;
  can_create: boolean;
  can_manage: boolean;
  can_close: boolean;
}

export const PERMISSION_MODULES = [
  { module: "projects", label: "Proyectos", icon: "📁", actions: [
    { action: "view", label: "Ver proyectos asignados" },
    { action: "create", label: "Crear nuevos proyectos" },
    { action: "edit", label: "Editar proyectos" },
    { action: "delete", label: "Eliminar proyectos" },
    { action: "archive", label: "Archivar y restaurar proyectos" },
  ]},
  { module: "backlog", label: "Backlog / Historias de Usuario", icon: "📋", actions: [
    { action: "view", label: "Ver historias de usuario" },
    { action: "create", label: "Crear historias de usuario" },
    { action: "edit", label: "Editar historias de usuario" },
    { action: "delete", label: "Eliminar historias de usuario" },
  ]},
  { module: "sprints", label: "Sprints", icon: "🏃", actions: [
    { action: "view", label: "Ver sprints" },
    { action: "create", label: "Crear sprints" },
    { action: "edit", label: "Editar sprints" },
    { action: "delete", label: "Eliminar sprints" },
    { action: "manage", label: "Iniciar y completar sprints" },
  ]},
  { module: "kanban", label: "Tablero Kanban", icon: "📌", actions: [
    { action: "view", label: "Ver el tablero" },
    { action: "move_cards", label: "Mover tarjetas entre columnas" },
  ]},
  { module: "epics", label: "Épicas", icon: "🗂️", actions: [
    { action: "view", label: "Ver épicas" },
    { action: "create", label: "Crear épicas" },
    { action: "edit", label: "Editar épicas" },
    { action: "delete", label: "Eliminar épicas" },
  ]},
  { module: "estimation", label: "Estimación", icon: "📊", actions: [
    { action: "view", label: "Ver sesiones de estimación" },
    { action: "vote", label: "Votar en estimaciones" },
    { action: "manage", label: "Gestionar sesiones (crear, moderar)" },
    { action: "close", label: "Cerrar sesiones y aplicar puntos" },
  ]},
  { module: "time", label: "Tiempo", icon: "⏱️", actions: [
    { action: "view_own", label: "Ver mis registros de tiempo" },
    { action: "view_team", label: "Ver tiempo de todo el equipo" },
    { action: "log", label: "Registrar tiempo" },
    { action: "approve", label: "Aprobar registros del equipo" },
  ]},
  { module: "costs", label: "Costos", icon: "💰", actions: [
    { action: "view", label: "Ver costos del proyecto" },
    { action: "configure", label: "Configurar tarifas" },
  ]},
  { module: "incidents", label: "Incidentes", icon: "🐛", actions: [
    { action: "view", label: "Ver incidentes" },
    { action: "create", label: "Crear incidentes (requiere ser miembro del proyecto)" },
    { action: "manage", label: "Gestionar incidentes (evaluar, cambiar estado)" },
    { action: "close", label: "Cerrar incidentes (aprobar cierre)" },
  ]},
  { module: "reports", label: "Reportes", icon: "📈", actions: [
    { action: "view_basic", label: "Ver reportes básicos" },
    { action: "view_financial", label: "Ver reportes financieros" },
    { action: "export", label: "Exportar reportes" },
  ]},
  { module: "members", label: "Equipo del Proyecto", icon: "👥", actions: [
    { action: "view", label: "Ver miembros" },
    { action: "add", label: "Agregar miembros" },
    { action: "remove", label: "Remover miembros" },
    { action: "change_role", label: "Cambiar roles de miembros" },
  ]},
  { module: "settings", label: "Configuración", icon: "⚙️", actions: [
    { action: "view", label: "Ver configuración" },
    { action: "edit_workspace", label: "Editar configuración del workspace" },
    { action: "edit_project", label: "Editar configuración del proyecto" },
  ]},
  { module: "users", label: "Usuarios", icon: "👤", actions: [
    { action: "view", label: "Ver usuarios del workspace" },
    { action: "invite", label: "Invitar usuarios" },
    { action: "deactivate", label: "Desactivar usuarios" },
    { action: "change_role", label: "Cambiar roles de usuarios" },
  ]},
  { module: "audit", label: "Auditoría", icon: "📋", actions: [
    { action: "view", label: "Ver log de auditoría" },
  ]},
  { module: "billing", label: "Facturación", icon: "💳", actions: [
    { action: "view", label: "Ver facturación" },
    { action: "manage", label: "Gestionar suscripción" },
  ]},
];

export function useCustomRoles() {
  return useQuery({
    queryKey: ["custom-roles"],
    queryFn: async () => {
      const { data, error } = await fromTable("custom_roles")
        .select("*")
        .order("is_system_role", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as CustomRole[];
    },
  });
}

export function useCustomRolesWithCount() {
  return useQuery({
    queryKey: ["custom-roles-with-count"],
    queryFn: async () => {
      const { data: roles, error } = await fromTable("custom_roles")
        .select("*")
        .order("is_system_role", { ascending: false })
        .order("name");
      if (error) throw error;

      // Get user counts per role_id
      const { data: profiles } = await supabase
        .from("profiles")
        .select("role_id")
        .not("role_id", "is", null);

      const countMap: Record<string, number> = {};
      (profiles ?? []).forEach((p: any) => {
        countMap[p.role_id] = (countMap[p.role_id] ?? 0) + 1;
      });

      return ((roles ?? []) as CustomRole[]).map(r => ({
        ...r,
        user_count: countMap[r.id] ?? 0,
      }));
    },
  });
}

export function useRolePermissions(roleId: string | null) {
  return useQuery({
    queryKey: ["role-permissions-detail", roleId],
    enabled: !!roleId,
    queryFn: async () => {
      const { data, error } = await fromTable("role_permissions")
        .select("*")
        .eq("role_id", roleId!);
      if (error) throw error;
      return (data ?? []) as RolePermission[];
    },
  });
}

export function useRoleIncidentPermissions(roleId: string | null) {
  return useQuery({
    queryKey: ["role-incident-perms-detail", roleId],
    enabled: !!roleId,
    queryFn: async () => {
      const { data, error } = await fromTable("role_incident_permissions")
        .select("*")
        .eq("role_id", roleId!)
        .maybeSingle();
      if (error) throw error;
      return data as RoleIncidentPermission | null;
    },
  });
}

export function useCreateCustomRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string;
      color: string;
      icon: string;
      workspace_id: string;
      created_by: string;
      base_role_id?: string; // copy perms from this role
    }) => {
      const { base_role_id, ...roleData } = params;
      const { data: role, error } = await fromTable("custom_roles").insert(roleData).select().single();
      if (error) throw error;

      // Copy permissions from base role if specified
      if (base_role_id) {
        const { data: basePerms } = await fromTable("role_permissions")
          .select("module, action, is_allowed")
          .eq("role_id", base_role_id);

        if (basePerms?.length) {
          await fromTable("role_permissions").insert(
            basePerms.map((p: any) => ({ role_id: role.id, module: p.module, action: p.action, is_allowed: p.is_allowed }))
          );
        }

        const { data: baseIncident } = await fromTable("role_incident_permissions")
          .select("can_create, can_manage, can_close")
          .eq("role_id", base_role_id)
          .maybeSingle();

        if (baseIncident) {
          await fromTable("role_incident_permissions").insert({
            role_id: role.id,
            can_create: baseIncident.can_create,
            can_manage: baseIncident.can_manage,
            can_close: baseIncident.can_close,
          });
        }
      } else {
        // Create empty incident permissions
        await fromTable("role_incident_permissions").insert({
          role_id: role.id, can_create: false, can_manage: false, can_close: false,
        });
      }

      return role as CustomRole;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-roles"] });
      qc.invalidateQueries({ queryKey: ["custom-roles-with-count"] });
    },
  });
}

export function useUpdateCustomRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; name?: string; description?: string; color?: string; icon?: string }) => {
      const { id, ...updates } = params;
      const { error } = await fromTable("custom_roles").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-roles"] });
      qc.invalidateQueries({ queryKey: ["custom-roles-with-count"] });
      qc.invalidateQueries({ queryKey: ["custom-role-info"] });
    },
  });
}

export function useDeleteCustomRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; migrateToRoleId?: string }) => {
      if (params.migrateToRoleId) {
        // Migrate users first
        await supabase.from("profiles")
          .update({ role_id: params.migrateToRoleId } as any)
          .eq("role_id" as any, params.id);
      }
      const { error } = await fromTable("custom_roles").delete().eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-roles"] });
      qc.invalidateQueries({ queryKey: ["custom-roles-with-count"] });
      qc.invalidateQueries({ queryKey: ["workspace-users"] });
    },
  });
}

export function useUpdateRolePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { roleId: string; module: string; action: string; isAllowed: boolean }) => {
      const { data: existing } = await fromTable("role_permissions")
        .select("id")
        .eq("role_id", params.roleId)
        .eq("module", params.module)
        .eq("action", params.action)
        .maybeSingle();

      if (existing) {
        await fromTable("role_permissions")
          .update({ is_allowed: params.isAllowed })
          .eq("id", existing.id);
      } else {
        await fromTable("role_permissions").insert({
          role_id: params.roleId,
          module: params.module,
          action: params.action,
          is_allowed: params.isAllowed,
        });
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["role-permissions-detail", vars.roleId] });
      qc.invalidateQueries({ queryKey: ["role-permissions-set"] });
    },
  });
}

export function useUpdateRoleIncidentPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { roleId: string; field: "can_create" | "can_manage" | "can_close"; value: boolean }) => {
      const { data: existing } = await fromTable("role_incident_permissions")
        .select("id")
        .eq("role_id", params.roleId)
        .maybeSingle();

      if (existing) {
        await fromTable("role_incident_permissions")
          .update({ [params.field]: params.value })
          .eq("id", existing.id);
      } else {
        await fromTable("role_incident_permissions").insert({
          role_id: params.roleId,
          [params.field]: params.value,
        });
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["role-incident-perms-detail", vars.roleId] });
      qc.invalidateQueries({ queryKey: ["role-incident-perms"] });
    },
  });
}
