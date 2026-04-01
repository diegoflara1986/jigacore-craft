import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Incident {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  steps_to_reproduce: string | null;
  expected_result: string | null;
  actual_result: string | null;
  severity: string;
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
  projects?: { id: string; name: string; color: string | null } | null;
  assigned_profile?: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null;
}

export function useIncidents(filters?: {
  search?: string;
  status?: string[];
  severity?: string;
  category?: string;
  projectId?: string;
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
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
      if (filters?.status?.length) {
        q = q.in("status", filters.status);
      }
      if (filters?.severity) q = q.eq("severity", filters.severity);
      if (filters?.category) q = q.eq("category", filters.category);
      if (filters?.projectId) q = q.eq("project_id", filters.projectId);
      if (filters?.assignedTo) q = q.eq("assigned_to", filters.assignedTo);
      if (filters?.dateFrom) q = q.gte("created_at", filters.dateFrom);
      if (filters?.dateTo) q = q.lte("created_at", filters.dateTo);

      const page = filters?.page ?? 0;
      const from = page * 20;
      q = q.range(from, from + 19);

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
      return data as Incident;
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
      toast({ title: "Incidente actualizado" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

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
      toast({ title: "Nota agregada" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

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

export function useIncidentStats() {
  return useQuery({
    queryKey: ["incident-stats"],
    queryFn: async () => {
      const { data: all, error } = await supabase.from("incidents").select("id, status, severity, assigned_to, created_at, updated_at");
      if (error) throw error;
      const items = all ?? [];
      const open = items.filter(i => i.status !== "cerrado").length;
      const criticalUnassigned = items.filter(i => i.severity === "critica" && !i.assigned_to && i.status !== "cerrado").length;
      const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const resolvedThisWeek = items.filter(i => i.status === "resuelto" && i.updated_at && new Date(i.updated_at) >= oneWeekAgo).length;
      // Avg resolution time
      const resolved = items.filter(i => (i.status === "resuelto" || i.status === "cerrado") && i.updated_at);
      let avgHours = 0;
      if (resolved.length) {
        const total = resolved.reduce((sum, i) => sum + (new Date(i.updated_at!).getTime() - new Date(i.created_at).getTime()), 0);
        avgHours = Math.round(total / resolved.length / 3600000);
      }
      return { open, criticalUnassigned, resolvedThisWeek, avgHours };
    },
  });
}

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
