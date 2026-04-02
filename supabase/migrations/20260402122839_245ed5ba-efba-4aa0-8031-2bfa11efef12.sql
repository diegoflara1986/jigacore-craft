
CREATE TABLE public.estimation_session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.estimation_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.estimation_session_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants_select" ON public.estimation_session_participants FOR SELECT TO authenticated
  USING (session_id IN (SELECT es.id FROM estimation_sessions es JOIN projects p ON es.project_id = p.id WHERE p.workspace_id = get_user_workspace_id()));

CREATE POLICY "participants_insert" ON public.estimation_session_participants FOR INSERT TO authenticated
  WITH CHECK (session_id IN (SELECT es.id FROM estimation_sessions es JOIN projects p ON es.project_id = p.id WHERE p.workspace_id = get_user_workspace_id()));

CREATE POLICY "participants_update" ON public.estimation_session_participants FOR UPDATE TO authenticated
  USING (session_id IN (SELECT es.id FROM estimation_sessions es JOIN projects p ON es.project_id = p.id WHERE p.workspace_id = get_user_workspace_id()));

CREATE POLICY "participants_delete" ON public.estimation_session_participants FOR DELETE TO authenticated
  USING (session_id IN (SELECT es.id FROM estimation_sessions es JOIN projects p ON es.project_id = p.id WHERE p.workspace_id = get_user_workspace_id()) AND has_management_role(auth.uid()));
