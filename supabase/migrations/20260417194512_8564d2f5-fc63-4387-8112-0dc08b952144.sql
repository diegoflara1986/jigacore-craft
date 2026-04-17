DROP POLICY IF EXISTS "profiles_select_workspace" ON profiles;

CREATE POLICY "profiles_select_workspace" 
  ON profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR (
    NOT public.is_external_user(auth.uid())
    AND workspace_id = public.get_user_workspace_id()
  )
  OR (
    public.is_external_user(auth.uid())
    AND workspace_id = (
      SELECT workspace_id FROM profiles 
      WHERE id = auth.uid()
    )
  )
);