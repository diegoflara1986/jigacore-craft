import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  epic_id: string | null;
  sprint_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  epics?: { id: string; title: string; color: string | null } | null;
  profiles?: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null;
  sprints?: { id: string; name: string } | null;
}

export function useUserStories(projectId: string | undefined, filters?: {
  epicId?: string; type?: string; priority?: string; status?: string; assignedTo?: string; search?: string;
}) {
  return useQuery({
    queryKey: ["user-stories", projectId, filters],
    queryFn: async () => {
      if (!projectId) return [];
      let q = supabase
        .from("user_stories")
        .select("*, epics(id, title, color), assigned_profile:profiles!user_stories_assigned_to_fkey(id, full_name, email, avatar_url), sprints(id, name)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

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
      const { data, error } = await supabase.from("user_stories").insert(story).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["user-stories", d.project_id] });
      qc.invalidateQueries({ queryKey: ["project-stats", d.project_id] });
      qc.invalidateQueries({ queryKey: ["epics", d.project_id] });
      toast({ title: "Historia creada" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateUserStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UserStory> & { id: string }) => {
      const { data, error } = await supabase.from("user_stories").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["user-stories", d.project_id] });
      qc.invalidateQueries({ queryKey: ["user-story", d.id] });
      qc.invalidateQueries({ queryKey: ["project-stats", d.project_id] });
      qc.invalidateQueries({ queryKey: ["epics", d.project_id] });
      toast({ title: "Historia actualizada" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteUserStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("user_stories").delete().eq("id", id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (pid) => {
      qc.invalidateQueries({ queryKey: ["user-stories", pid] });
      qc.invalidateQueries({ queryKey: ["project-stats", pid] });
      qc.invalidateQueries({ queryKey: ["epics", pid] });
      toast({ title: "Historia eliminada" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
