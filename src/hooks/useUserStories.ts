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

export interface UserStory {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  acceptance_criteria: string | null;
  type: string;
  priority: string;
  status: string;
  story_points: number | null;
  story_number: number | null;
  epic_id: string | null;
  sprint_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
  epics?: { id: string; title: string; color: string | null } | null;
  assigned_profile?: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null;
  sprints?: { id: string; name: string } | null;
}

export function useUserStories(projectId: string | undefined, filters?: {
  epicId?: string; type?: string; priority?: string; status?: string; assignedTo?: string; search?: string; showDeleted?: boolean;
}) {
  return useQuery({
    queryKey: ["user-stories", projectId, filters],
    queryFn: async () => {
      if (!projectId) return [];
      let q = supabase
        .from("user_stories")
        .select("*, epics(id, title, color), assigned_profile:profiles!user_stories_assigned_to_fkey(id, full_name, email, avatar_url), sprints(id, name)")
        .eq("project_id", projectId)
        .order("story_number", { ascending: true });

      if (filters?.showDeleted) {
        q = q.not("deleted_at", "is", null);
      } else {
        q = q.is("deleted_at", null);
      }

      if (filters?.epicId) q = q.eq("epic_id", filters.epicId);
      if (filters?.type) q = q.eq("type", filters.type);
      if (filters?.priority) q = q.eq("priority", filters.priority);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.assignedTo) q = q.eq("assigned_to", filters.assignedTo);
      if (filters?.search) q = q.ilike("title", `%${filters.search}%`);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as UserStory[];
    },
    enabled: !!projectId,
  });
}

export function useUserStory(id: string | undefined) {
  return useQuery({
    queryKey: ["user-story", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("user_stories")
        .select("*, epics(id, title, color), assigned_profile:profiles!user_stories_assigned_to_fkey(id, full_name, email, avatar_url), sprints(id, name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as UserStory;
    },
    enabled: !!id,
  });
}

export function useCreateUserStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (story: Partial<UserStory> & { project_id: string; title: string }) => {
      const { epics, assigned_profile, sprints, ...insertData } = story as any;
      const { data, error } = await supabase.from("user_stories").insert(insertData).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["user-stories", d.project_id] });
      qc.invalidateQueries({ queryKey: ["project-stats", d.project_id] });
      qc.invalidateQueries({ queryKey: ["epics", d.project_id] });
      toast({ title: "Historia creada" });
    },
    onError: (e: any) => toast({ title: "No se pudo crear la historia", description: parseError(e), variant: "destructive" }),
  });
}

export function useUpdateUserStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UserStory> & { id: string; _projectId?: string }) => {
      const { epics, assigned_profile, sprints, _projectId, ...updateData } = updates as any;
      const { error } = await supabase.from("user_stories").update(updateData).eq("id", id);
      if (error) throw error;
      return { id };
    },
    onSuccess: (_d, variables) => {
      qc.invalidateQueries({ queryKey: ["user-stories"] });
      qc.invalidateQueries({ queryKey: ["user-story", variables.id] });
      qc.invalidateQueries({ queryKey: ["project-stats"] });
      qc.invalidateQueries({ queryKey: ["epics"] });
      qc.invalidateQueries({ queryKey: ["user-stories-for-sprints"] });
      toast({ title: "Historia actualizada" });
    },
    onError: (e: any) => toast({ title: "No se pudo actualizar la historia", description: parseError(e), variant: "destructive" }),
  });
}

export function useDeleteUserStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("user_stories").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (pid) => {
      qc.invalidateQueries({ queryKey: ["user-stories", pid] });
      qc.invalidateQueries({ queryKey: ["project-stats", pid] });
      qc.invalidateQueries({ queryKey: ["epics", pid] });
      toast({ title: "Historia eliminada" });
    },
export function useUserStoryHistory(storyId: string | undefined) {
  return useQuery({
    queryKey: ["user-story-history", storyId],
    queryFn: async () => {
      if (!storyId) return [];
      const { data, error } = await supabase
        .from("user_story_history")
        .select("*, profiles:profiles(id, full_name, avatar_url)")
        .eq("user_story_id", storyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!storyId,
  });
}

export function useCreateUserStoryHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: { user_story_id: string; user_id: string; field_name: string; old_value: string | null; new_value: string | null }) => {
      const { error } = await supabase.from("user_story_history").insert(entry);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["user-story-history", v.user_story_id] });
    },
  });
}
