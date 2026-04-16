DROP POLICY IF EXISTS "profiles_select_workspace" ON public.profiles;

CREATE POLICY "profiles_select_workspace" ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR (
    NOT public.is_external_user(auth.uid())
    AND workspace_id = public.get_user_workspace_id()
  )
);