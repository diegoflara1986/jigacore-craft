-- Fix mismatch: RLS used English keys ('projects'/'edit'/'delete') while
-- stored permissions use Spanish keys ('proyectos'/'editar'/'eliminar').
DROP POLICY IF EXISTS "projects_update" ON public.projects;
CREATE POLICY "projects_update" ON public.projects
FOR UPDATE
USING (
  workspace_id = get_user_workspace_id()
  AND has_permission(auth.uid(), 'proyectos', 'editar')
);

DROP POLICY IF EXISTS "projects_delete" ON public.projects;
CREATE POLICY "projects_delete" ON public.projects
FOR DELETE
USING (
  workspace_id = get_user_workspace_id()
  AND has_permission(auth.uid(), 'proyectos', 'eliminar')
);