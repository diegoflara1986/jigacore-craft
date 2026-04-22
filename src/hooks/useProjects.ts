import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  client_name: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  workspace_id: string;
  created_by: string | null;
  created_at: string;
  color?: string | null;
  git_url?: string | null;
  technologies?: string[] | null;
  currency?: string | null;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  project_role: string;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    role: string;
  };
}

export function useProjects(statusFilter?: string, search?: string, onlyAssigned?: boolean) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["projects", statusFilter, search, onlyAssigned],
    queryFn: async () => {
      if (onlyAssigned && profile?.id) {
        // Primero obtener los project_ids donde el usuario es miembro
        const { data: memberships, error: memberError } = await supabase
          .from("project_members")
          .select("project_id")
          .eq("user_id", profile.id);

        if (memberError) throw memberError;

        const projectIds = (memberships ?? []).map((m) => m.project_id);

        if (projectIds.length === 0) return [] as Project[];

        let query = supabase
          .from("projects")
          .select("*")
          .in("id", projectIds)
          .order("created_at", { ascending: false });

        if (statusFilter && statusFilter !== "all") {
          query = query.eq("status", statusFilter);
        }
        if (search) {
          query = query.ilike("name", `%${search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as Project[];
      }

      // Comportamiento normal: todos los proyectos del workspace
      let query = supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (search) {
        query = query.ilike("name", `%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Project[];
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Project;
    },
    enabled: !!id,
  });
}

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-members", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_members")
        .select("*, profiles(id, full_name, email, avatar_url, role)")
        .eq("project_id", projectId);
      if (error) throw error;
      return (data ?? []) as ProjectMember[];
    },
    enabled: !!projectId,
  });
}

export function useProjectStats(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-stats", projectId],
    queryFn: async () => {
      if (!projectId) return { total: 0, completed: 0, inProgress: 0, pending: 0 };
      const { data } = await supabase
        .from("user_stories")
        .select("status")
        .eq("project_id", projectId);
      const stories = data ?? [];
      return {
        total: stories.length,
        completed: stories.filter((s) => s.status === "done").length,
        inProgress: stories.filter((s) => s.status === "in_progress").length,
        pending: stories.filter((s) => s.status === "backlog" || s.status === "todo").length,
      };
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (project: Partial<Project>) => {
      // Ensure workspace exists
      const { data: workspaceId, error: wsError } = await supabase.rpc("ensure_user_workspace");
      if (wsError) throw new Error("Error con workspace: " + wsError.message);

      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: project.name!,
          description: project.description,
          client_name: project.client_name,
          status: project.status || "active",
          start_date: project.start_date,
          end_date: project.end_date,
          budget: project.budget,
          currency: project.currency || "USD",
          color: project.color || "#1E3A5F",
          git_url: project.git_url,
          technologies: project.technologies,
          workspace_id: workspaceId,
          created_by: profile!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Proyecto creado exitosamente" });
    },
    onError: (e: any) => {
      toast({ title: "Error al crear proyecto", description: e.message, variant: "destructive" });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", data.id] });
      toast({ title: "Proyecto actualizado" });
    },
    onError: (e: any) => {
      const isRlsError = e.message?.includes("JSON") || e.message?.includes("rows") || e.code === "PGRST116";
      toast({
        title: "No se pudo actualizar el proyecto",
        description: isRlsError
          ? "No tienes permiso para realizar esta acción."
          : e.message,
        variant: "destructive",
      });
    },
  });
}

export function useAddProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ project_id, user_id, project_role }: { project_id: string; user_id: string; project_role: string }) => {
      const { error } = await supabase
        .from("project_members")
        .insert({ project_id, user_id, project_role });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["project-members", vars.project_id] });
      toast({ title: "Miembro agregado" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

export function useRemoveProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const { error } = await supabase.from("project_members").delete().eq("id", id);
      if (error) throw error;
      return project_id;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
      toast({ title: "Miembro removido" });
    },
  });
}

export function useUpdateProjectMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_role }: { id: string; project_role: string }) => {
      const { error } = await supabase
        .from("project_members")
        .update({ project_role })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-members"] });
      toast({ title: "Rol actualizado" });
    },
    onError: (e: any) => {
      toast({ title: "Error al actualizar rol", description: e.message, variant: "destructive" });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Proyecto eliminado" });
    },
    onError: (e: any) => {
      const isRls = e.message?.includes("JSON") || e.message?.includes("rows") || e.code === "PGRST116";
      toast({
        title: "No se pudo eliminar el proyecto",
        description: isRls ? "No tienes permiso para realizar esta acción." : e.message,
        variant: "destructive",
      });
    },
  });
}
