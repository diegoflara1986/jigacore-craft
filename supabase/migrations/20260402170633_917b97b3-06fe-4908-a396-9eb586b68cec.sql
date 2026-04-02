
-- Table to configure which roles can create incidents
CREATE TABLE public.incident_permission_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role text NOT NULL,
  can_create boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, role)
);

ALTER TABLE public.incident_permission_configs ENABLE ROW LEVEL SECURITY;

-- Only admins can manage these configs
CREATE POLICY "incident_perm_select" ON public.incident_permission_configs
  FOR SELECT TO authenticated
  USING (workspace_id = get_user_workspace_id());

CREATE POLICY "incident_perm_insert" ON public.incident_permission_configs
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id = get_user_workspace_id() AND has_admin_role(auth.uid()));

CREATE POLICY "incident_perm_update" ON public.incident_permission_configs
  FOR UPDATE TO authenticated
  USING (workspace_id = get_user_workspace_id() AND has_admin_role(auth.uid()));

CREATE POLICY "incident_perm_delete" ON public.incident_permission_configs
  FOR DELETE TO authenticated
  USING (workspace_id = get_user_workspace_id() AND has_admin_role(auth.uid()));
