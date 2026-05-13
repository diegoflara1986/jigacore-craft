import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const parseError = (e: any): string => {
  if (e?.code === "PGRST116" || e?.message?.includes("JSON") || e?.message?.includes("rows"))
    return "No tienes permiso para realizar esta acción.";
  if (e?.code === "23505" || e?.message?.includes("duplicate") || e?.message?.includes("already exists"))
    return "Ya existe un registro con esos datos.";
  if (e?.code === "23503" || e?.message?.includes("foreign key"))
    return "No se puede completar la acción porque hay registros relacionados.";
  if (e?.code === "42501" || e?.message?.includes("permission denied"))
    return "No tienes permiso para realizar esta acción.";
  return e?.message ?? "Ocurrió un error inesperado.";
};

export interface TimeLog {
  id: string;
  user_id: string;
  task_id: string | null;
  user_story_id: string | null;
  project_id: string;
  hours: number;
  log_date: string;
  created_at: string;
  description: string | null;
  profiles?: { id: string; full_name: string | null; email: string; avatar_url: string | null };
  projects?: { id: string; name: string; color: string | null };
  user_stories?: { id: string; title: string; story_number: number | null } | null;
  tasks?: { id: string; title: string } | null;
}

export function useTimeLogs(projectId?: string, userId?: string, dateRange?: { from: string; to: string }) {
  return useQuery({
    queryKey: ["time-logs", projectId, userId, dateRange],
    queryFn: async () => {
      let q = supabase
        .from("time_logs")
        .select("*, profiles:user_id(id, full_name, email, avatar_url), projects(id, name, color), user_stories(id, title, story_number), tasks(id, title)")
        .order("log_date", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      if (userId) q = q.eq("user_id", userId);
      if (dateRange?.from) q = q.gte("log_date", dateRange.from);
      if (dateRange?.to) q = q.lte("log_date", dateRange.to);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TimeLog[];
    },
  });
}

export function useTimeLogsByStory(storyId?: string) {
  return useQuery({
    queryKey: ["time-logs-story", storyId],
    queryFn: async () => {
      if (!storyId) return [];
      const { data, error } = await supabase
        .from("time_logs")
        .select("*, profiles:user_id(id, full_name, email, avatar_url)")
        .eq("user_story_id", storyId)
        .order("log_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TimeLog[];
    },
    enabled: !!storyId,
  });
}

export function useCreateTimeLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: { user_id: string; project_id: string; hours: number; log_date: string; description?: string; user_story_id?: string; task_id?: string }) => {
      const { data, error } = await supabase.from("time_logs").insert(log).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time-logs"] });
      qc.invalidateQueries({ queryKey: ["time-logs-story"] });
      toast({ title: "Tiempo registrado" });
    },
    onError: (e: any) => toast({ title: "No se pudo registrar el tiempo", description: parseError(e), variant: "destructive" }),
  });
}

export function useUpdateTimeLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: { id: string; hours?: number; log_date?: string; description?: string | null; user_story_id?: string | null }) => {
      const { id, ...updates } = log;
      const { data, error } = await supabase.from("time_logs").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time-logs"] });
      qc.invalidateQueries({ queryKey: ["time-logs-story"] });
      toast({ title: "Registro actualizado" });
    },
    onError: (e: any) => toast({ title: "No se pudo actualizar el registro", description: parseError(e), variant: "destructive" }),
  });
}

export function useDeleteTimeLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("time_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time-logs"] });
      qc.invalidateQueries({ queryKey: ["time-logs-story"] });
      toast({ title: "Registro eliminado" });
    },
    onError: (e: any) => toast({ title: "No se pudo eliminar el registro de tiempo", description: parseError(e), variant: "destructive" }),
  });
}
