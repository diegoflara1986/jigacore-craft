import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CostConfig {
  id: string;
  project_id: string;
  user_id: string | null;
  role: string | null;
  hourly_rate: number;
  currency: string | null;
  created_at: string;
}

export function useCostConfigs(projectId?: string) {
  return useQuery({
    queryKey: ["cost-configs", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("cost_configs")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return (data ?? []) as CostConfig[];
    },
    enabled: !!projectId,
  });
}

export function useUpsertCostConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: { id?: string; project_id: string; user_id?: string | null; role?: string | null; hourly_rate: number; currency?: string }) => {
      if (config.id) {
        const { error } = await supabase.from("cost_configs").update({ hourly_rate: config.hourly_rate, currency: config.currency }).eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cost_configs").insert(config);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cost-configs"] });
      toast({ title: "Tarifa guardada" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteCostConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cost_configs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cost-configs"] });
      toast({ title: "Tarifa eliminada" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
