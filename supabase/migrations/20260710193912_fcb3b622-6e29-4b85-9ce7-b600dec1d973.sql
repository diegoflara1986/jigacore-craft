DROP POLICY IF EXISTS projects_select ON public.projects;

CREATE POLICY projects_select ON public.projects
FOR SELECT
USING (
  CASE
    WHEN public.is_external_user(auth.uid()) THEN (
      id = public.get_external_user_project_id(auth.uid())
      OR public.is_project_member(auth.uid(), id)
    )
    ELSE (workspace_id = public.get_user_workspace_id())
  END
);