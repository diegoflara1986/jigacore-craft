import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAllProjects(projectIds?: string[]) {
  return useQuery({
    queryKey: ["all-projects-report", projectIds],
    queryFn: async () => {
      let q = supabase
        .from("projects")
        .select("id, name, color, budget, currency, status, start_date, end_date")
        .order("name");
      if (projectIds !== undefined) {
        if (projectIds.length === 0) return [];
        q = q.in("id", projectIds);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAllUserStories(projectId?: string) {
  return useQuery({
    queryKey: ["report-stories", projectId],
    queryFn: async () => {
      let q = supabase.from("user_stories").select("*, epics(id, title, color), assigned_profile:profiles!user_stories_assigned_to_fkey(id, full_name, email, avatar_url), sprints(id, name)").is("deleted_at", null);
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAllSprints(projectId?: string) {
  return useQuery({
    queryKey: ["report-sprints", projectId],
    queryFn: async () => {
      let q = supabase.from("sprints").select("*").order("created_at", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAllTimeLogs(projectId?: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["report-timelogs", projectId, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from("time_logs").select("*, profiles:user_id(id, full_name, email, avatar_url), projects(id, name, color), user_stories(id, title, story_number)");
      if (projectId) q = q.eq("project_id", projectId);
      if (dateFrom) q = q.gte("log_date", dateFrom);
      if (dateTo) q = q.lte("log_date", dateTo);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAllIncidents(projectId?: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["report-incidents", projectId, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from("incidents").select("*, projects:projects(id, name, color), assigned_profile:profiles!incidents_assigned_to_fkey(id, full_name, email, avatar_url)");
      if (projectId) q = q.eq("project_id", projectId);
      if (dateFrom) q = q.gte("created_at", dateFrom);
      if (dateTo) q = q.lte("created_at", dateTo);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAllCostConfigs(projectId?: string) {
  return useQuery({
    queryKey: ["report-costs", projectId],
    queryFn: async () => {
      let q = supabase.from("cost_configs").select("*");
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
  });
}

export function useAllProjectMembers(projectId?: string) {
  return useQuery({
    queryKey: ["report-members", projectId],
    queryFn: async () => {
      let q = supabase.from("project_members").select("*, profiles(id, full_name, email, avatar_url, role)");
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSprintRetrospective(sprintId?: string) {
  return useQuery({
    queryKey: ["sprint-retro", sprintId],
    queryFn: async () => {
      if (!sprintId) return null;
      const { data, error } = await supabase.from("sprint_retrospectives").select("*").eq("sprint_id", sprintId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!sprintId,
  });
}

export function useAllEpics(projectId?: string) {
  return useQuery({
    queryKey: ["report-epics", projectId],
    queryFn: async () => {
      let q = supabase.from("epics").select("*");
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}
