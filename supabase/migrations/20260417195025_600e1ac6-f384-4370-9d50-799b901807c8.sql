DROP POLICY IF EXISTS "profiles_select_workspace" ON profiles;

CREATE POLICY "profiles_select_workspace" 
  ON profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
);