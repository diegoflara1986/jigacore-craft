import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const sb = supabase as any;

export type Form001Status =
  | "borrador"
  | "solicitado"
  | "en_revision"
  | "aprobado"
  | "rechazado"
  | "ejecutado";

export interface SigForm001Row {
  id: string;
  request_id: string;
  workspace_id: string;
  codigo: string | null;
  fecha_registro: string | null;
  reportado_por: string | null;
  area_proceso: string | null;
  medio_reporte: string | null;
  fecha_deteccion: string | null;
  detectado_por: string | null;
  forma_deteccion: string | null;
  sistema_deteccion: string | null;
  titulo: string;
  descripcion: string;
  que_ocurrio: string | null;
  como_ocurrio: string | null;
  cuando_ocurrio: string | null;
  tipo_incidente: string | null;
  origen_estimado: string | null;
  prioridad: string | null;
  severidad: string | null;
  sistema_afectado: string | null;
  ambiente_afectado: string | null;
  informacion_afectada: string | null;
  cliente_afectado: string | null;
  impacto_confidencialidad: string | null;
  impacto_integridad: string | null;
  impacto_disponibilidad: string | null;
  impacto_operativo: string | null;
  involucra_datos_personales: boolean | null;
  involucra_produccion: boolean | null;
  requiere_reporte_externo: boolean | null;
  accion_contencion: string | null;
  responsable_contencion: string | null;
  contencion_exitosa: boolean | null;
  escalo_sgsi: boolean | null;
  escalo_gerencia: boolean | null;
  notifico_cliente: boolean | null;
  created_at: string;
  updated_at: string;
  request?: {
    id: string;
    status: Form001Status;
    created_at: string;
    created_by: string | null;
    current_step_id: string | null;
    current_assignee: string | null;
    current_step?: {
      id: string;
      step_type: string;
      step_order: number;
      step_users?: { user_id: string }[];
    } | null;
  } | null;
  reportado_por_profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useSigForm001List() {
  const { profile } = useAuth();
  const workspaceId = profile?.workspace_id ?? null;

  return useQuery({
    queryKey: ["sig-form-001-list", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("sig_form_001")
        .select(
          `
          *,
          request:sig_requests(id, status, created_at, current_step_id, current_assignee),
          reportado_por_profile:profiles!sig_form_001_reportado_por_fkey(id, full_name, avatar_url)
        `
        )
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SigForm001Row[];
    },
  });
}

export function useSigForm001Detail(id: string | null) {
  return useQuery({
    queryKey: ["sig-form-001-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await sb
        .from("sig_form_001")
        .select(
          `
          *,
          request:sig_requests(id, status, created_at, current_step_id, current_assignee),
          reportado_por_profile:profiles!sig_form_001_reportado_por_fkey(id, full_name, avatar_url)
        `
        )
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as SigForm001Row | null;
    },
  });
}

export function useSigRequestHistory(requestId: string | null) {
  return useQuery({
    queryKey: ["sig-request-history", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("sig_request_history")
        .select(`*, action_by_profile:profiles!sig_request_history_action_by_fkey(id, full_name, avatar_url)`)
        .eq("request_id", requestId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSigRequestNotes(requestId: string | null) {
  return useQuery({
    queryKey: ["sig-request-notes", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("sig_request_notes")
        .select(`*, user:profiles!sig_request_notes_user_id_fkey(id, full_name, avatar_url)`)
        .eq("request_id", requestId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateSigForm001() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const workspaceId = profile?.workspace_id ?? null;
  const userId = profile?.id ?? null;

  return useMutation({
    mutationFn: async (initial: { titulo: string; descripcion: string }) => {
      if (!workspaceId || !userId) throw new Error("Sesión inválida");

      // 1) Find flow config for this form (workspace-specific or null catalog)
      const { data: configs } = await sb
        .from("sig_flow_configs")
        .select("id, workspace_id")
        .eq("form_code", "FOR-SGSI-001");
      const flowConfig =
        (configs ?? []).find((c: any) => c.workspace_id === workspaceId) ??
        (configs ?? []).find((c: any) => c.workspace_id === null) ??
        null;

      // 2) Create sig_request
      const { data: request, error: reqErr } = await sb
        .from("sig_requests")
        .insert({
          workspace_id: workspaceId,
          form_code: "FOR-SGSI-001",
          flow_config_id: flowConfig?.id ?? null,
          status: "borrador",
          created_by: userId,
        })
        .select("id")
        .single();
      if (reqErr) throw reqErr;

      // 3) Create form row
      const { data: form, error: formErr } = await sb
        .from("sig_form_001")
        .insert({
          request_id: request.id,
          workspace_id: workspaceId,
          reportado_por: userId,
          titulo: initial.titulo,
          descripcion: initial.descripcion,
        })
        .select("id")
        .single();
      if (formErr) throw formErr;

      return { id: form.id as string, request_id: request.id as string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sig-form-001-list"] });
    },
  });
}

export function useUpdateSigForm001() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; values: Partial<SigForm001Row> }) => {
      const { id, values } = params;
      const { error } = await sb.from("sig_form_001").update(values).eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (_id, vars) => {
      queryClient.invalidateQueries({ queryKey: ["sig-form-001-list"] });
      queryClient.invalidateQueries({ queryKey: ["sig-form-001-detail", vars.id] });
    },
  });
}

/**
 * Transitions the sig_request status and writes a history entry.
 * Optionally reassigns to next step user.
 */
export function useTransitionSigRequest() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const userId = profile?.id ?? null;

  return useMutation({
    mutationFn: async (params: {
      requestId: string;
      fromStatus: string;
      toStatus: Form001Status;
      stepType?: string;
      comment?: string;
      nextAssignee?: string | null;
      nextStepId?: string | null;
    }) => {
      if (!userId) throw new Error("No autenticado");

      const updates: Record<string, any> = {
        status: params.toStatus,
        updated_at: new Date().toISOString(),
      };
      if (params.toStatus === "solicitado") {
        updates.submitted_at = new Date().toISOString();
      }
      if (["aprobado", "rechazado", "ejecutado"].includes(params.toStatus)) {
        updates.closed_at = new Date().toISOString();
      }
      if (params.nextAssignee !== undefined) {
        updates.current_assignee = params.nextAssignee;
      }
      if (params.nextStepId !== undefined) {
        updates.current_step_id = params.nextStepId;
      }

      const { error: upErr } = await sb
        .from("sig_requests")
        .update(updates)
        .eq("id", params.requestId);
      if (upErr) throw upErr;

      const { error: histErr } = await sb.from("sig_request_history").insert({
        request_id: params.requestId,
        from_status: params.fromStatus,
        to_status: params.toStatus,
        step_type: params.stepType ?? null,
        action_by: userId,
        comment: params.comment ?? null,
      });
      if (histErr) throw histErr;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["sig-form-001-list"] });
      queryClient.invalidateQueries({ queryKey: ["sig-form-001-detail"] });
      queryClient.invalidateQueries({ queryKey: ["sig-request-history", vars.requestId] });
    },
  });
}

export function useAddSigRequestNote() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const userId = profile?.id ?? null;

  return useMutation({
    mutationFn: async (params: { requestId: string; content: string; isInternal?: boolean }) => {
      if (!userId) throw new Error("No autenticado");
      const { error } = await sb.from("sig_request_notes").insert({
        request_id: params.requestId,
        user_id: userId,
        content: params.content,
        is_internal: params.isInternal ?? true,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["sig-request-notes", vars.requestId] });
    },
  });
}
