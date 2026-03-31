
-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "admin_can_update_roles" ON profiles;

-- Security definer function to get current role (avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id
$$;

-- User can update own profile but NOT change their role
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role = get_user_role(auth.uid())
);

-- Admins/super_admins can update any profile in their workspace
CREATE POLICY "Admins can update profiles" ON profiles
FOR UPDATE TO authenticated
USING (
  get_user_role(auth.uid()) IN ('admin', 'super_admin')
  AND workspace_id = get_user_workspace_id()
);

-- Secure function to update user roles
CREATE OR REPLACE FUNCTION public.update_user_role(
  target_user_id UUID,
  new_role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para cambiar roles';
  END IF;

  IF new_role = 'super_admin' THEN
    RAISE EXCEPTION 'No se puede asignar el rol super_admin';
  END IF;

  -- Ensure target is in same workspace
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = target_user_id
    AND workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Usuario no pertenece a tu workspace';
  END IF;

  UPDATE profiles SET role = new_role WHERE id = target_user_id;
END;
$$;
