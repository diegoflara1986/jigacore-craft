import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Helper to access tables not yet in generated types
const fromTable = (table: string) => (supabase as any).from(table);

export interface EstimationSession {
  id: string;
  project_id: string;
  sprint_id: string | null;
  name: string;
  scale_type: string;
  status: string;
  current_story_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface EstimationVote {
  id: string;
  estimation_id: string;
  user_id: string;
  vote_value: string;
  created_at: string;
  profile?: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null;
}

export function useEstimationSessions(projectId: string | undefined) {
  return useQuery({
    queryKey: ["estimation-sessions", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await fromTable("estimation_sessions")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EstimationSession[];
    },
    enabled: !!projectId,
  });
}

export function useEstimationSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["estimation-session", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const { data, error } = await fromTable("estimation_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      if (error) throw error;
      return data as EstimationSession;
    },
    enabled: !!sessionId,
  });
}

export function useCreateEstimationSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (session: Omit<EstimationSession, "id" | "created_at">) => {
      const { data, error } = await fromTable("estimation_sessions")
        .insert(session)
        .select()
        .single();
      if (error) throw error;
      return data as EstimationSession;
    },
    onSuccess: (d: EstimationSession) => {
      qc.invalidateQueries({ queryKey: ["estimation-sessions", d.project_id] });
      toast({ title: "Sesión de estimación creada" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateEstimationSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EstimationSession> & { id: string }) => {
      const { data, error } = await fromTable("estimation_sessions")
        .update(updates)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as EstimationSession;
    },
    onSuccess: (d: EstimationSession) => {
      qc.invalidateQueries({ queryKey: ["estimation-session", d.id] });
      qc.invalidateQueries({ queryKey: ["estimation-sessions", d.project_id] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useSessionEstimations(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["session-estimations", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await fromTable("estimations")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!sessionId,
  });
}

export function useEstimationVotes(estimationId: string | undefined) {
  return useQuery({
    queryKey: ["estimation-votes", estimationId],
    queryFn: async () => {
      if (!estimationId) return [];
      const { data, error } = await supabase
        .from("estimation_votes")
        .select("*, profile:profiles!estimation_votes_user_id_fkey(id, full_name, email, avatar_url)")
        .eq("estimation_id", estimationId);
      if (error) throw error;
      return (data ?? []) as EstimationVote[];
    },
    enabled: !!estimationId,
  });
}

export function useCastVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ estimationId, userId, voteValue }: { estimationId: string; userId: string; voteValue: string }) => {
      await supabase.from("estimation_votes").delete().eq("estimation_id", estimationId).eq("user_id", userId);
      const { data, error } = await supabase
        .from("estimation_votes")
        .insert({ estimation_id: estimationId, user_id: userId, vote_value: voteValue })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ["estimation-votes", d.estimation_id] });
    },
    onError: (e: any) => toast({ title: "Error al votar", description: e.message, variant: "destructive" }),
  });
}
