
DROP POLICY IF EXISTS "incidents_insert_anon" ON public.incidents;
CREATE POLICY "incidents_insert_public" ON public.incidents FOR INSERT TO anon
  WITH CHECK (
    status = 'nuevo' 
    AND assigned_to IS NULL 
    AND project_id IN (SELECT id FROM projects WHERE status = 'active')
  );
CREATE POLICY "incidents_insert_auth" ON public.incidents FOR INSERT TO authenticated
  WITH CHECK (project_id IN (SELECT projects.id FROM projects WHERE projects.workspace_id = get_user_workspace_id()));
