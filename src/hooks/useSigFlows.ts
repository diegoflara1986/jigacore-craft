import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type SigStepType = "solicitar" | "revisar" | "aprobar" | "ejecutar";

export interface SigStepInput {
  step_type: SigStepType;
  step_order: number;
  user_ids: string[];
}

export interface SigFlowStepUser {
  id: string;
  user_id: string;
  profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export interface SigFlowStep {
  id: string;
  step_type: SigStepType;
  step_order: number;
  flow_config_id: string;
  step_users: SigFlowStepUser[];
}

export interface SigFlowConfig {
  id: string;
  workspace_id: string | null;
  form_code: string;
  form_name: string;
  is_active: boolean | null;
  steps: SigFlowStep[];
}

const sb = supabase as any;

/**
 * Loads ALL flow configs visible to the user:
 *   - Global catalog rows (workspace_id IS NULL)
 *   - Workspace rows (workspace_id = current workspace)
 * Returns one row per form_code, prioritizing the workspace row over the catalog row.
 */
export function useSigFlowConfigs() {
  const { profile } = useAuth();
  const workspaceId = profile?.workspace_id ?? null;

  return useQuery({
    queryKey: ["sig-flow-configs", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<SigFlowConfig[]> => {
      const { data, error } = await sb
        .from("sig_flow_configs")
        .select(
          `
          *,
          steps:sig_flow_steps(
            *,
            step_users:sig_flow_step_users(
              *,
              profile:profiles(id, full_name, email, avatar_url)
            )
          )
        `
        )
        .order("form_code");

      if (error) throw error;

      const rows = (data ?? []) as SigFlowConfig[];

      // Merge: prefer workspace row over global catalog row per form_code
      const map = new Map<string, SigFlowConfig>();
      for (const row of rows) {
        const existing = map.get(row.form_code);
        if (!existing) {
          map.set(row.form_code, row);
        } else {
          // Prefer the one matching current workspace
          if (row.workspace_id === workspaceId) {
            map.set(row.form_code, row);
          }
        }
      }

      // Sort steps inside each config
      const result = Array.from(map.values());
      for (const cfg of result) {
        cfg.steps = (cfg.steps ?? []).sort(
          (a, b) => (a.step_order ?? 0) - (b.step_order ?? 0)
        );
      }
      result.sort((a, b) => a.form_code.localeCompare(b.form_code));
      return result;
    },
  });
}

/**
 * Saves the complete flow configuration for a form:
 * 1. Upserts the sig_flow_configs row for this workspace + form_code
 * 2. Deletes existing steps (cascades to step_users)
 * 3. Inserts new steps and their assigned users
 */
export function useSaveFlowConfig() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const workspaceId = profile?.workspace_id ?? null;
  const userId = profile?.id ?? null;

  return useMutation({
    mutationFn: async (params: {
      formCode: string;
      formName: string;
      steps: SigStepInput[];
    }) => {
      if (!workspaceId) throw new Error("Workspace no encontrado");
      const { formCode, formName, steps } = params;

      // 1) Upsert flow config for this workspace + form_code
      // Try to find existing workspace-specific config
      const { data: existing, error: findError } = await sb
        .from("sig_flow_configs")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("form_code", formCode)
        .maybeSingle();
      if (findError) throw findError;

      let configId: string;
      if (existing?.id) {
        configId = existing.id;
        const { error: updateError } = await sb
          .from("sig_flow_configs")
          .update({
            form_name: formName,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", configId);
        if (updateError) throw updateError;
      } else {
        const { data: inserted, error: insertError } = await sb
          .from("sig_flow_configs")
          .insert({
            workspace_id: workspaceId,
            form_code: formCode,
            form_name: formName,
            is_active: true,
            created_by: userId,
          })
          .select("id")
          .single();
        if (insertError) throw insertError;
        configId = inserted.id;
      }

      // 2) Delete previous steps (cascades to step_users)
      const { error: deleteError } = await sb
        .from("sig_flow_steps")
        .delete()
        .eq("flow_config_id", configId);
      if (deleteError) throw deleteError;

      // 3) Insert new steps + users
      for (const step of steps) {
        const { data: stepRow, error: stepError } = await sb
          .from("sig_flow_steps")
          .insert({
            flow_config_id: configId,
            step_type: step.step_type,
            step_order: step.step_order,
          })
          .select("id")
          .single();
        if (stepError) throw stepError;

        if (step.user_ids.length > 0) {
          const rows = step.user_ids.map((uid) => ({
            step_id: stepRow.id,
            user_id: uid,
          }));
          const { error: usersError } = await sb
            .from("sig_flow_step_users")
            .insert(rows);
          if (usersError) throw usersError;
        }
      }

      return configId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sig-flow-configs"] });
    },
  });
}

/**
 * Loads the workspace users available to assign to flow steps.
 */
export function useWorkspaceUsersForSig() {
  const { profile } = useAuth();
  const workspaceId = profile?.workspace_id ?? null;

  return useQuery({
    queryKey: ["sig-workspace-users", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .eq("workspace_id", workspaceId!)
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}
