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

export interface Epic {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  color: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface EpicWithProgress extends Epic {
  totalStories: number;
  completedStories: number;
  progress: number;
}

export function useEpics(projectId: string | undefined) {
  return useQuery({
    queryKey: ["epics", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("epics")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Get story counts per epic
      const { data: stories } = await supabase
        .from("user_stories")
        .select("epic_id, status")
        .eq("project_id", projectId)
        .not("epic_id", "is", null);

      return (data ?? []).map((epic) => {
        const epicStories = (stories ?? []).filter((s) => s.epic_id === epic.id);
        const completed = epicStories.filter((s) => s.status === "done").length;
        const total = epicStories.length;
        return {
          ...epic,
          totalStories: total,
          completedStories: completed,
          progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        } as EpicWithProgress;
      });
    },
    enabled: !!projectId,
  });
}

export function useCreateEpic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (epic: Partial<Epic> & { project_id: string; title: string }) => {
      const { data, error } = await supabase.from("epics").insert(epic).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["epics", d.project_id] });
      toast({ title: "Épica creada" });
    },
    onError: (e: any) => toast({ title: "No se pudo crear la épica", description: parseError(e), variant: "destructive" }),
  });
}

export function useUpdateEpic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Epic> & { id: string }) => {
      const { data, error } = await supabase.from("epics").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["epics", d.project_id] });
      toast({ title: "Épica actualizada" });
    },
    onError: (e: any) => toast({ title: "No se pudo actualizar la épica", description: parseError(e), variant: "destructive" }),
  });
}

export function useDeleteEpic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("epics").delete().eq("id", id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (pid) => {
      qc.invalidateQueries({ queryKey: ["epics", pid] });
      toast({ title: "Épica eliminada" });
    },
    onError: (e: any) => toast({ title: "No se pudo eliminar la épica", description: parseError(e), variant: "destructive" }),
  });
}
