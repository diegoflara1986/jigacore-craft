import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const fromTable = (table: string) => (supabase as any).from(table);

export interface Incident {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  steps_to_reproduce: string | null;
  expected_result: string | null;
  actual_result: string | null;
  severity: string | null;
  category: string | null;
  status: string;
  reported_by_email: string | null;
  reporter_name: string | null;
  ticket_code: string | null;
  assigned_to: string | null;
  version: string | null;
  browser_info: string | null;
  updated_at: string | null;
  linked_user_story_id: string | null;
  created_at: string;
  is_requirement: boolean;
  resolution_date: string | null;
  suspension_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_by: string | null;
  projects?: { id: string; name: string; color: string | null } | null;
  assigned_profile?: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null;
  creator_profile?: { id: string; full_name: string | null; email: string } | null;
}

export const STATUSES = [
  { value: "sin_evaluar", label: "Sin evaluar", icon: "⚪", color: "bg-gray-100 text-gray-700" },
  { value: "en_revision", label: "En revisión", icon: "🔵", color: "bg-blue-100 text-blue-700" },
  { value: "en_ejecucion", label: "En ejecución", icon: "🟠", color: "bg-orange-100 text-orange-700" },
  { value: "en_qa", label: "En QA", icon: "🟣", color: "bg-purple-100 text-purple-700" },
  { value: "suspendido", label: "Suspendido", icon: "⏸️", color: "bg-yellow-100 text-yellow-700" },
  { value: "listo_para_cerrar", label: "Listo para cerrar", icon: "✅", color: "bg-green-100 text-green-700" },
  { value: "cerrado", label: "Cerrado", icon: "🔒", color: "bg-gray-200 text-gray-600" },
];

export const SEVERITIES = [
  { value: "critica", label: "Crítica", color: "bg-red-100 text-red-800", icon: "🔴" },
  { value: "alta", label: "Alta", color: "bg-orange-100 text-orange-800", icon: "🟠" },
  { value: "media", label: "Media", color: "bg-yellow-100 text-yellow-800", icon: "🟡" },
  { value: "baja", label: "Baja", color: "bg-green-100 text-green-800", icon: "🟢" },
  { value: "no_aplica", label: "No Aplica", color: "bg-gray-200 text-gray-800", icon: "⚫" },
];

export const CATEGORIES = [
  { value: "bug_sistema", label: "Bug de Sistema" },
  { value: "error_interfaz", label: "Error de Interfaz" },
  { value: "problema_rendimiento", label: "Problema de Rendimiento" },
  { value: "error_datos", label: "Error de Datos" },
  { value: "problema_seguridad", label: "Problema de Seguridad" },
  { value: "otro", label: "Otro" },
];

export const STATUS_TRANSITIONS: Record<string, string[]> = {
  sin_evaluar: ["en_revision", "suspendido"],
  en_revision: ["en_ejecucion", "suspendido"],
  en_ejecucion: ["en_qa", "suspendido"],
  en_qa: ["listo_para_cerrar", "en_ejecucion", "suspendido"],
  suspendido: ["en_revision"],
  listo_para_cerrar: ["cerrado"],
  cerrado: [],
};

export function getStatusInfo(status: string) {
  return STATUSES.find(s => s.value === status) ?? { value: status, label: status, color: "bg-gray-200 text-gray-800", icon: "⚪" };
}

export function getSeverityInfo(severity: string | null) {
  if (!severity) return { value: "sin_evaluar", label: "Sin evaluar", color: "bg-gray-100 text-gray-500", icon: "❓" };
  return SEVERITIES.find(s => s.value === severity) ?? { value: severity, label: severity, color: "bg-gray-200 text-gray-800", icon: "❓" };
}

export function getCategoryLabel(cat: string | null) {
  if (!cat) return "—";
  return CATEGORIES.find(c => c.value === cat)?.label ?? cat;
}

// Legacy useIncidentPermissions removed - now using usePermissions hook with role_incident_permissions

// ===== INCIDENTS LIST =====
export function useIncidents(filters?: {
  search?: string;
  status?: string[];
  severity?: string;
  category?: string;
  projectId?: string;
  assignedTo?: string;
  createdBy?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: ["incidents", filters],
    queryFn: async () => {
      let q = supabase
        .from("incidents")
        .select("*, projects:projects(id, name, color), assigned_profile:profiles!incidents_assigned_to_fkey(id, full_name, email, avatar_url)", { count: "exact" })
        .order("created_at", { ascending: false });

      if (filters?.search) {
        q = q.or(`title.ilike.%${filters.search}%,ticket_code.ilike.%${filters.search}%`);
      }
      if (filters?.status?.length) q = q.in("status", filters.status);
      if (filters?.severity) q = q.eq("severity", filters.severity);
      if (filters?.category) q = q.eq("category", filters.category);
      if (filters?.projectId) q = q.eq("project_id", filters.projectId);
      if (filters?.assignedTo) q = q.eq("assigned_to", filters.assignedTo);
      if (filters?.createdBy) q = q.eq("created_by", filters.createdBy);

      const page = filters?.page ?? 0;
      q = q.range(page * 20, page * 20 + 19);

      const { data, error, count } = await q;
      if (error) throw error;
      return { data: (data ?? []) as Incident[], count: count ?? 0 };
    },
  });
}

export function useIncident(id: string | undefined) {
  return useQuery({
    queryKey: ["incident", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("incidents")
        .select("*, projects:projects(id, name, color), assigned_profile:profiles!incidents_assigned_to_fkey(id, full_name, email, avatar_url)")
        .eq("id", id)
        .single();
      if (error) throw error;
      // Fetch creator profile separately
      let creator_profile = null;
      if ((data as any).created_by) {
        const { data: cp } = await supabase.from("profiles").select("id, full_name, email").eq("id", (data as any).created_by).single();
        creator_profile = cp;
      }
      return { ...data, creator_profile } as Incident;
    },
    enabled: !!id,
  });
}

export function useUpdateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Incident> & { id: string }) => {
      const { error } = await supabase.from("incidents").update({ ...updates, updated_at: new Date().toISOString() } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
      qc.invalidateQueries({ queryKey: ["incident", v.id] });
      qc.invalidateQueries({ queryKey: ["incident-stats"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ===== NOTES (reusing incident_notes table as comments) =====
export function useIncidentNotes(incidentId: string | undefined) {
  return useQuery({
    queryKey: ["incident-notes", incidentId],
    queryFn: async () => {
      if (!incidentId) return [];
      const { data, error } = await supabase
        .from("incident_notes")
        .select("*, profiles:profiles(id, full_name, email, avatar_url)")
        .eq("incident_id", incidentId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!incidentId,
  });
}

export function useCreateIncidentNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note: { incident_id: string; user_id: string; content: string; is_internal: boolean }) => {
      const { error } = await supabase.from("incident_notes").insert(note);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["incident-notes", v.incident_id] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ===== HISTORY =====
export function useIncidentHistory(incidentId: string | undefined) {
  return useQuery({
    queryKey: ["incident-history", incidentId],
    queryFn: async () => {
      if (!incidentId) return [];
      const { data, error } = await supabase
        .from("incident_history")
        .select("*, profiles:profiles(id, full_name, email)")
        .eq("incident_id", incidentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!incidentId,
  });
}

export function useCreateIncidentHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: { incident_id: string; user_id: string; field_name: string; old_value: string | null; new_value: string | null }) => {
      const { error } = await supabase.from("incident_history").insert(entry);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["incident-history", v.incident_id] });
    },
  });
}

// ===== ATTACHMENTS =====
export function useIncidentAttachments(incidentId: string | undefined) {
  return useQuery({
    queryKey: ["incident-attachments-db", incidentId],
    queryFn: async () => {
      if (!incidentId) return [];
      const { data, error } = await fromTable("incident_attachments")
        .select("*, profiles:profiles(id, full_name)")
        .eq("incident_id", incidentId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!incidentId,
  });
}

// ===== STATS =====
export function useIncidentStats() {
  return useQuery({
    queryKey: ["incident-stats"],
    queryFn: async () => {
      const { data: all, error } = await supabase.from("incidents").select("id, status, severity, assigned_to, created_at, updated_at, is_requirement");
      if (error) throw error;
      const items = all ?? [];
      const pendingNoSeverity = items.filter(i => i.status === "sin_evaluar" && !i.severity).length;
      const inProcess = items.filter(i => ["en_ejecucion", "en_revision", "en_qa"].includes(i.status)).length;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const resolvedThisMonth = items.filter(i => i.status === "cerrado" && i.updated_at && new Date(i.updated_at) >= monthStart).length;
      return { pendingNoSeverity, inProcess, resolvedThisMonth };
    },
  });
}

// ===== SLA =====
export function useSlaConfigs() {
  return useQuery({
    queryKey: ["sla-configs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sla_configs").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertSlaConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (configs: { workspace_id: string; severity: string; response_hours: number; resolution_hours: number }[]) => {
      for (const c of configs) {
        const { error } = await supabase.from("sla_configs").upsert(c, { onConflict: "workspace_id,severity" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sla-configs"] });
      toast({ title: "Configuración SLA guardada" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ===== GENERATED STORIES =====
export function useIncidentGeneratedStories(incidentId?: string) {
  return useQuery({
    queryKey: ["incident-generated-stories", incidentId],
    enabled: !!incidentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incident_generated_stories")
        .select(`
          *,
          user_story:user_stories(
            id, title, story_number, type, status
          )
        `)
        .eq("incident_id", incidentId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ===== LINKED STORIES =====
export function useIncidentLinkedStories(incidentId?: string) {
  return useQuery({
    queryKey: ["incident-linked-stories", incidentId],
    enabled: !!incidentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incident_linked_stories")
        .select(`
          *,
          user_story:user_stories(
            id, title, story_number, type, status
          )
        `)
        .eq("incident_id", incidentId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ===== CLASSIFY INCIDENT =====
export function useClassifyIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      incidentId, 
      classification,
      projectId,
      incidentTitle,
      incidentDescription,
      severity,
      userId
    }: { 
      incidentId: string;
      classification: 'bug' | 'requerimiento';
      projectId: string;
      incidentTitle: string;
      incidentDescription: string;
      severity: string;
      userId: string;
    }) => {
      const storyType = classification === 'bug' ? 'bug' : 'historia';
      const priority = 
        severity === 'critica' ? 'critical' :
        severity === 'alta' ? 'high' :
        severity === 'baja' ? 'low' : 'medium';

      const { data: story, error: storyError } = await supabase
        .from("user_stories")
        .insert({
          project_id: projectId,
          title: `[${classification === 'bug' ? 'Bug' : 'Req'}] ${incidentTitle}`,
          description: incidentDescription,
          type: storyType,
          priority,
          status: "backlog",
          created_by: userId,
        })
        .select("id, story_number")
        .single();

      if (storyError) throw storyError;

      const { error: linkError } = await supabase
        .from("incident_generated_stories")
        .insert({
          incident_id: incidentId,
          user_story_id: story.id,
          classification,
          created_by: userId,
        });

      if (linkError) throw linkError;
      return story;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ 
        queryKey: ["incident-generated-stories", vars.incidentId] 
      });
      qc.invalidateQueries({ 
        queryKey: ["user-stories"] 
      });
    },
  });
}

// ===== LINK STORY TO INCIDENT =====
export function useLinkStoryToIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      incidentId, 
      userStoryId,
      linkedBy
    }: { 
      incidentId: string;
      userStoryId: string;
      linkedBy: string;
    }) => {
      const { error } = await supabase
        .from("incident_linked_stories")
        .insert({
          incident_id: incidentId,
          user_story_id: userStoryId,
          linked_by: linkedBy,
        });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ 
        queryKey: ["incident-linked-stories", vars.incidentId] 
      });
    },
  });
}

// ===== UNLINK STORY FROM INCIDENT =====
export function useUnlinkStoryFromIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      incidentId, 
      userStoryId 
    }: { 
      incidentId: string;
      userStoryId: string;
    }) => {
      const { error } = await supabase
        .from("incident_linked_stories")
        .delete()
        .eq("incident_id", incidentId)
        .eq("user_story_id", userStoryId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ 
        queryKey: ["incident-linked-stories", vars.incidentId] 
      });
    },
  });
}

// ===== DUPLICATE INCIDENT =====
export function useDuplicateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      incident,
      userId 
    }: { 
      incident: any;
      userId: string;
    }) => {
      const { data, error } = await supabase
        .from("incidents")
        .insert({
          project_id: incident.project_id,
          title: `[Copia] ${incident.title}`,
          description: incident.description,
          category: incident.category,
          severity: null,
          status: "sin_evaluar",
          reporter_name: incident.reporter_name,
          reported_by_email: incident.reported_by_email,
          created_by: userId,
          steps_to_reproduce: incident.steps_to_reproduce,
          expected_result: incident.expected_result,
          actual_result: incident.actual_result,
          version: incident.version,
          browser_info: incident.browser_info,
        })
        .select("id, ticket_code")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ 
        queryKey: ["incidents"] 
      });
    },
  });
}

// ===== REOPEN INCIDENT =====
export function useReopenIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      incidentId,
      userId,
      profileId
    }: { 
      incidentId: string;
      userId: string;
      profileId: string;
    }) => {
      const { error } = await supabase
        .from("incidents")
        .update({
          status: "en_revision",
          updated_at: new Date().toISOString(),
          closed_at: null,
        })
        .eq("id", incidentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ 
        queryKey: ["incidents"] 
      });
    },
  });
}

// ===== DELETE INCIDENT =====
export function useDeleteIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (incidentId: string) => {
      const { error } = await supabase
        .from("incidents")
        .delete()
        .eq("id", incidentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ 
        queryKey: ["incidents"] 
      });
    },
  });
}
