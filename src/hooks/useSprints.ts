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

export interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  project_id: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  capacity: number;
  created_at: string;
}

export interface SprintWithStats extends Sprint {
  totalStories: number;
  completedStories: number;
  totalPoints: number;
  completedPoints: number;
  stories: Array<{ id: string; story_number: number | null; title: string; status: string; story_points: number | null; assigned_to: string | null; priority: string | null; type: string | null; sprint_id: string | null }>;
}

export function useSprints(projectId: string | undefined) {
  return useQuery({
    queryKey: ["sprints", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("sprints")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Sprint[];
    },
    enabled: !!projectId,
  });
}

export function useSprintsWithStats(projectId: string | undefined) {
  const { data: sprints, ...rest } = useSprints(projectId);
  const { data: stories } = useQuery({
    queryKey: ["user-stories-for-sprints", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("user_stories")
        .select("id, sprint_id, status, story_points")
        .eq("project_id", projectId)
        .not("sprint_id", "is", null);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
  });

  const enriched: SprintWithStats[] | undefined = sprints?.map((s) => {
    const sprintStories = stories?.filter((st) => st.sprint_id === s.id) ?? [];
    const completed = sprintStories.filter((st) => st.status === "done");
    return {
      ...s,
      totalStories: sprintStories.length,
      completedStories: completed.length,
      totalPoints: sprintStories.reduce((a, b) => a + (b.story_points ?? 0), 0),
      completedPoints: completed.reduce((a, b) => a + (b.story_points ?? 0), 0),
    };
  });

  return { data: enriched, ...rest };
}

export function useCreateSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sprint: Partial<Sprint> & { project_id: string; name: string }) => {
      const { data, error } = await supabase.from("sprints").insert(sprint).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["sprints", d.project_id] });
      toast({ title: "Sprint creado" });
    },
    onError: (e: any) => toast({ title: "No se pudo crear el sprint", description: parseError(e), variant: "destructive" }),
  });
}

export function useUpdateSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Sprint> & { id: string }) => {
      const { error } = await supabase.from("sprints").update(updates).eq("id", id);
      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sprints"] });
      qc.invalidateQueries({ queryKey: ["sprints-list"] });
      qc.invalidateQueries({ queryKey: ["user-stories-for-sprints"] });
      qc.invalidateQueries({ queryKey: ["user-stories"] });
      toast({ title: "Sprint actualizado" });
    },
    onError: (e: any) => toast({ title: "No se pudo actualizar el sprint", description: parseError(e), variant: "destructive" }),
  });
}

export function useDeleteSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("sprints").delete().eq("id", id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (pid) => {
      qc.invalidateQueries({ queryKey: ["sprints", pid] });
      toast({ title: "Sprint eliminado" });
    },
    onError: (e: any) => toast({ title: "No se pudo eliminar el sprint", description: parseError(e), variant: "destructive" }),
  });
}
