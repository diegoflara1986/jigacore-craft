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


export const PERMISSION_MODULES = [
  { module: "proyectos", label: "Proyectos", icon: "📁",
    scope: { field: "proyectos_scope",
             options: ["solo_asignados", "todos"],
             required: true },
    actions: [
      { action: "ver", label: "Ver proyectos" },
      { action: "crear", label: "Crear proyectos" },
      { action: "editar", label: "Editar proyectos" },
      { action: "eliminar", label: "Eliminar proyectos" },
      { action: "archivar", label: "Archivar y desarchivar" },
      { action: "duplicar", label: "Duplicar proyecto" },
    ]
  },
  { module: "mi_trabajo", label: "Mi Trabajo", icon: "📋",
    scope: { field: "mi_trabajo_scope",
             options: ["solo_propios", "todos"],
             required: true },
    actions: [
      { action: "ver", label: "Ver trabajo" },
    ]
  },
  { module: "equipo", label: "Equipo del Proyecto", icon: "👥",
    actions: [
      { action: "ver", label: "Ver miembros" },
      { action: "agregar", label: "Agregar miembros" },
      { action: "eliminar", label: "Eliminar miembros" },
      { action: "cambiar_rol", label: "Cambiar roles de miembros" },
    ]
  },
  { module: "backlog", label: "Backlog / Historias", icon: "📋",
    actions: [
      { action: "ver", label: "Ver historias" },
      { action: "crear", label: "Crear historias" },
      { action: "editar", label: "Editar historias" },
      { action: "eliminar", label: "Eliminar historias" },
      { action: "duplicar", label: "Duplicar historias" },
      { action: "bloquear", label: "Bloquear historias" },
      { action: "desbloquear", label: "Desbloquear historias" },
    ]
  },
  { module: "estimacion", label: "Estimación", icon: "📊",
    actions: [
      { action: "ver", label: "Ver sesiones de estimación" },
      { action: "votar", label: "Votar en estimación" },
      { action: "crear", label: "Crear sesión de estimación" },
      { action: "cerrar", label: "Cerrar sesión y aplicar puntos" },
    ]
  },
  { module: "epicas", label: "Épicas", icon: "🗂️",
    actions: [
      { action: "ver", label: "Ver épicas" },
      { action: "crear", label: "Crear épicas" },
      { action: "editar", label: "Editar épicas" },
      { action: "eliminar", label: "Eliminar épicas" },
    ]
  },
  { module: "sprints", label: "Sprints", icon: "🏃",
    actions: [
      { action: "ver", label: "Ver sprints" },
      { action: "crear", label: "Crear sprints" },
      { action: "editar", label: "Editar sprints" },
      { action: "eliminar", label: "Eliminar sprints" },
      { action: "gestionar", label: "Iniciar y completar sprints" },
    ]
  },
  { module: "tablero", label: "Tablero Kanban", icon: "📌",
    actions: [
      { action: "ver", label: "Ver tablero" },
      { action: "mover_tarjetas", label: "Mover tarjetas entre columnas" },
    ]
  },
  { module: "tiempo", label: "Tiempo", icon: "⏱️",
    scope: { field: "tiempo_scope",
             options: ["solo_propios", "todos"],
             required: true },
    actions: [
      { action: "ver", label: "Ver registros de tiempo" },
      { action: "crear", label: "Crear registro de tiempo" },
      { action: "editar", label: "Editar registro de tiempo" },
      { action: "eliminar", label: "Eliminar registro de tiempo" },
      { action: "aprobar", label: "Aprobar registros del equipo" },
    ]
  },
  { module: "costos", label: "Costos", icon: "💰",
    actions: [
      { action: "ver", label: "Ver costos del proyecto" },
      { action: "editar_tarifas", label: "Editar tarifas por miembro" },
    ]
  },
  { module: "reportes", label: "Reportes", icon: "📈",
    scope: { field: "reportes_scope",
             options: ["solo_asignados", "todos"],
             required: true },
    actions: [
      { action: "ver", label: "Ver reportes" },
    ]
  },
  { module: "incidentes", label: "Incidentes Externos", icon: "🐛",
    scope: { field: "incidentes_scope",
             options: ["solo_asignados", "todos"],
             required: true },
    actions: [
      { action: "ver", label: "Ver incidentes" },
      { action: "crear", label: "Crear incidentes" },
      { action: "gestionar", label: "Gestionar incidente" },
      { action: "cerrar", label: "Cerrar incidente" },
      { action: "reabrir", label: "Reabrir incidente" },
      { action: "duplicar", label: "Duplicar incidente" },
    ]
  },
  { module: "notificaciones", label: "Notificaciones", icon: "🔔",
    scope: { field: "notificaciones_scope",
             options: ["solo_propias", "todas"],
             required: true },
    actions: [
      { action: "ver", label: "Ver notificaciones" },
    ]
  },
  { module: "sig", label: "SIG / Formularios", icon: "📄",
    actions: [
      { action: "ver", label: "Ver registros de formularios" },
      { action: "registrar", label: "Registrar formularios" },
      { action: "eliminar", label: "Eliminar registros" },
      { action: "duplicar", label: "Duplicar registros" },
      { action: "editar", label: "Editar registros" },
    ]
  },
  { module: "config_perfil", label: "Mi Perfil", icon: "👤",
    actions: [
      { action: "ver", label: "Ver mi perfil" },
      { action: "editar", label: "Editar mi perfil" },
    ]
  },
  { module: "config_notificaciones", label: "Mis Notificaciones",
    icon: "🔔",
    actions: [
      { action: "ver", label: "Ver preferencias" },
      { action: "editar", label: "Editar preferencias" },
    ]
  },
  { module: "config_apariencia", label: "Apariencia", icon: "🎨",
    actions: [
      { action: "editar", label: "Editar apariencia" },
    ]
  },
  { module: "config_general", label: "Configuración General",
    icon: "⚙️",
    actions: [
      { action: "ver", label: "Ver configuración general" },
      { action: "editar", label: "Editar configuración general" },
    ]
  },
  { module: "config_usuarios", label: "Gestión de Usuarios",
    icon: "👥",
    actions: [
      { action: "crear", label: "Crear usuarios" },
      { action: "editar", label: "Editar usuarios" },
      { action: "eliminar", label: "Eliminar usuarios" },
      { action: "activar", label: "Activar usuarios" },
      { action: "desactivar", label: "Desactivar usuarios" },
    ]
  },
  { module: "configuracion_roles", label: "Roles y Permisos",
    icon: "🔐",
    actions: [
      { action: "ver", label: "Ver roles" },
      { action: "crear", label: "Crear roles" },
      { action: "editar", label: "Editar roles" },
      { action: "eliminar", label: "Eliminar roles" },
      { action: "duplicar", label: "Duplicar roles" },
    ]
  },
  { module: "config_sla", label: "SLA de Incidentes", icon: "⏱️",
    actions: [
      { action: "ver", label: "Ver SLA" },
      { action: "editar", label: "Editar SLA" },
    ]
  },
  { module: "config_auditoria", label: "Auditoría", icon: "📋",
    actions: [
      { action: "ver", label: "Ver auditoría" },
    ]
  },
  { module: "config_integraciones", label: "Integraciones",
    icon: "🔌",
    actions: [
      { action: "ver", label: "Ver integraciones" },
      { action: "editar", label: "Editar integraciones" },
    ]
  },
  { module: "config_flujos_sig", label: "Flujos SIG", icon: "🔄",
    actions: [
      { action: "ver", label: "Ver flujos" },
      { action: "crear", label: "Crear flujo" },
      { action: "editar", label: "Editar flujo" },
      { action: "eliminar", label: "Eliminar flujo" },
    ]
  },
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
        // Migrate users first using raw update
        const { error: migrateError } = await fromTable("profiles")
          .update({ role_id: params.migrateToRoleId })
          .eq("role_id", params.id);
        if (migrateError) throw migrateError;
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
