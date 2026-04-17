DROP POLICY IF EXISTS "profiles_select_workspace" ON profiles;

CREATE POLICY "profiles_select_workspace" 
  ON profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR workspace_id = public.get_user_workspace_id()
);