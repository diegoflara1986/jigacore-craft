import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const fromTable = (table: string) => (supabase as any).from(table);

export interface EstimationRound {
  id: string;
  project_id: string;
  title: string;
  status: string;
  scale: number[];
  created_by: string | null;
  created_at: string;
  closed_at: string | null;
}

export interface RoundStory {
  id: string;
  round_id: string;
  user_story_id: string;
  result_points: number | null;
  user_story?: {
    id: string;
    title: string;
    description: string | null;
    acceptance_criteria: string | null;
    priority: string;
    type: string;
    story_points: number | null;
    story_number: number | null;
  };
}

export interface RoundVote {
  id: string;
  round_id: string;
  round_story_id: string;
  user_id: string;
  vote_value: number;
  created_at: string;
  updated_at: string;
  profile?: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null;
}

export interface RoundParticipant {
  id: string;
  round_id: string;
  user_id: string;
  profile?: { id: string; full_name: string | null; email: string; avatar_url: string | null; role: string } | null;
}

export function useEstimationRounds(projectId: string | undefined) {
  return useQuery({
    queryKey: ["estimation-rounds", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await fromTable("estimation_rounds")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EstimationRound[];
    },
    enabled: !!projectId,
  });
}

export function useEstimationRound(roundId: string | undefined) {
  return useQuery({
    queryKey: ["estimation-round", roundId],
    queryFn: async () => {
      if (!roundId) return null;
      const { data, error } = await fromTable("estimation_rounds")
        .select("*")
        .eq("id", roundId)
        .single();
      if (error) throw error;
      return data as EstimationRound;
    },
    enabled: !!roundId,
  });
}

export function useRoundStories(roundId: string | undefined) {
  return useQuery({
    queryKey: ["round-stories", roundId],
    queryFn: async () => {
      if (!roundId) return [];
      const { data, error } = await fromTable("estimation_round_stories")
        .select("*, user_story:user_stories!estimation_round_stories_user_story_id_fkey(id, title, description, acceptance_criteria, priority, type, story_points, story_number)")
        .eq("round_id", roundId);
      if (error) throw error;
      return (data ?? []) as RoundStory[];
    },
    enabled: !!roundId,
  });
}

export function useRoundVotes(roundId: string | undefined) {
  return useQuery({
    queryKey: ["round-votes", roundId],
    queryFn: async () => {
      if (!roundId) return [];
      const { data, error } = await fromTable("estimation_round_votes")
        .select("*, profile:profiles!estimation_round_votes_user_id_fkey(id, full_name, email, avatar_url)")
        .eq("round_id", roundId);
      if (error) throw error;
      return (data ?? []) as RoundVote[];
    },
    enabled: !!roundId,
  });
}

export function useRoundParticipants(roundId: string | undefined) {
  return useQuery({
    queryKey: ["round-participants", roundId],
    queryFn: async () => {
      if (!roundId) return [];
      const { data, error } = await fromTable("estimation_round_participants")
        .select("*, profile:profiles!estimation_round_participants_user_id_fkey(id, full_name, email, avatar_url, role)")
        .eq("round_id", roundId);
      if (error) throw error;
      return (data ?? []) as RoundParticipant[];
    },
    enabled: !!roundId,
  });
}

export function useCreateEstimationRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (round: { project_id: string; title: string; created_by: string }) => {
      const { data, error } = await fromTable("estimation_rounds")
        .insert({ project_id: round.project_id, title: round.title, created_by: round.created_by })
        .select()
        .single();
      if (error) throw error;
      return data as EstimationRound;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["estimation-rounds", d.project_id] });
      toast({ title: "Ronda de estimación creada" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useCloseRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (roundId: string) => {
      const { error } = await fromTable("estimation_rounds")
        .update({ status: "cerrada", closed_at: new Date().toISOString() })
        .eq("id", roundId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estimation-rounds"] });
      qc.invalidateQueries({ queryKey: ["estimation-round"] });
      toast({ title: "Ronda cerrada" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useSaveVotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (votes: { round_id: string; round_story_id: string; user_id: string; vote_value: number }[]) => {
      for (const v of votes) {
        const { error } = await fromTable("estimation_round_votes")
          .upsert(
            { round_id: v.round_id, round_story_id: v.round_story_id, user_id: v.user_id, vote_value: v.vote_value, updated_at: new Date().toISOString() },
            { onConflict: "round_story_id,user_id" }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["round-votes"] });
      toast({ title: "Votos guardados correctamente" });
    },
    onError: (e: any) => toast({ title: "Error al guardar votos", description: e.message, variant: "destructive" }),
  });
}

export function useAcceptStoryPoints() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ roundStoryId, points, userStoryId }: { roundStoryId: string; points: number; userStoryId: string }) => {
      // Update result_points on the round story
      const { error: e1 } = await fromTable("estimation_round_stories")
        .update({ result_points: points })
        .eq("id", roundStoryId);
      if (e1) throw e1;
      // Update story_points on user_stories
      const { error: e2 } = await supabase
        .from("user_stories")
        .update({ story_points: points })
        .eq("id", userStoryId);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["round-stories"] });
      qc.invalidateQueries({ queryKey: ["user-stories"] });
      toast({ title: "Story Points asignados" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
