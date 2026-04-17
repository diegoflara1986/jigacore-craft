DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "profiles_update_admin" ON public.profiles
FOR UPDATE TO authenticated
USING (
  id = auth.uid()
  OR public.has_permission(auth.uid(), 'config_usuarios', 'editar')
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  )
)
WITH CHECK (
  id = auth.uid()
  OR public.has_permission(auth.uid(), 'config_usuarios', 'editar')
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  )
);