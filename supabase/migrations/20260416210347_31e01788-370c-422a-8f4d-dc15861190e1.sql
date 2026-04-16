-- 2.1 profiles SELECT policy with external user isolation
DROP POLICY IF EXISTS "profiles_select_workspace" ON public.profiles;
DROP POLICY IF EXISTS "profiles_external_isolation" ON public.profiles;

CREATE POLICY "profiles_select_workspace" ON public.profiles
FOR SELECT TO authenticated
USING (
  CASE 
    WHEN public.is_external_user(auth.uid()) THEN
      id = auth.uid()
    ELSE
      workspace_id = public.get_user_workspace_id()
      OR id = auth.uid()
  END
);

-- 2.2 projects SELECT policy with external user isolation
DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_select_by_membership" ON public.projects;

CREATE POLICY "projects_select" ON public.projects
FOR SELECT TO authenticated
USING (
  CASE
    WHEN public.is_external_user(auth.uid()) THEN
      id = public.get_external_user_project_id(auth.uid())
    ELSE
      workspace_id = public.get_user_workspace_id()
  END
);

-- 2.3 incidents SELECT and INSERT policies with external user isolation
DROP POLICY IF EXISTS "incidents_select" ON public.incidents;
DROP POLICY IF EXISTS "incidents_insert" ON public.incidents;
DROP POLICY IF EXISTS "incidents_select_v2" ON public.incidents;
DROP POLICY IF EXISTS "incidents_insert_v2" ON public.incidents;

CREATE POLICY "incidents_select" ON public.incidents
FOR SELECT TO authenticated
USING (
  CASE
    WHEN public.is_external_user(auth.uid()) THEN
      project_id = public.get_external_user_project_id(auth.uid())
    ELSE
      project_id IN (
        SELECT id FROM public.projects 
        WHERE workspace_id = public.get_user_workspace_id()
      )
  END
);

CREATE POLICY "incidents_insert" ON public.incidents
FOR INSERT TO authenticated
WITH CHECK (
  CASE
    WHEN public.is_external_user(auth.uid()) THEN
      project_id = public.get_external_user_project_id(auth.uid())
    ELSE
      project_id IN (
        SELECT id FROM public.projects 
        WHERE workspace_id = public.get_user_workspace_id()
      )
  END
);

-- 2.4 custom_roles INSERT/UPDATE/DELETE policies with permission checks
DROP POLICY IF EXISTS "custom_roles_insert" ON public.custom_roles;
DROP POLICY IF EXISTS "custom_roles_update" ON public.custom_roles;
DROP POLICY IF EXISTS "custom_roles_delete" ON public.custom_roles;

CREATE POLICY "custom_roles_insert" ON public.custom_roles
FOR INSERT TO authenticated
WITH CHECK (
  workspace_id = public.get_user_workspace_id()
  AND (
    public.has_permission(auth.uid(), 'configuracion_roles', 'crear')
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
);

CREATE POLICY "custom_roles_update" ON public.custom_roles
FOR UPDATE TO authenticated
USING (
  workspace_id = public.get_user_workspace_id()
  AND (
    public.has_permission(auth.uid(), 'configuracion_roles', 'editar')
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
);

CREATE POLICY "custom_roles_delete" ON public.custom_roles
FOR DELETE TO authenticated
USING (
  workspace_id = public.get_user_workspace_id()
  AND is_system_role = false
  AND (
    public.has_permission(auth.uid(), 'configuracion_roles', 'eliminar')
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
);

-- 2.5 role_permissions INSERT/UPDATE/DELETE policies with permission checks
DROP POLICY IF EXISTS "role_permissions_insert" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_update" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_delete" ON public.role_permissions;

CREATE POLICY "role_permissions_insert" ON public.role_permissions
FOR INSERT TO authenticated
WITH CHECK (
  role_id IN (
    SELECT id FROM public.custom_roles 
    WHERE workspace_id = public.get_user_workspace_id()
  )
  AND (
    public.has_permission(auth.uid(), 'configuracion_roles', 'crear')
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
);

CREATE POLICY "role_permissions_update" ON public.role_permissions
FOR UPDATE TO authenticated
USING (
  role_id IN (
    SELECT id FROM public.custom_roles 
    WHERE workspace_id = public.get_user_workspace_id()
  )
  AND (
    public.has_permission(auth.uid(), 'configuracion_roles', 'editar')
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
);

CREATE POLICY "role_permissions_delete" ON public.role_permissions
FOR DELETE TO authenticated
USING (
  role_id IN (
    SELECT id FROM public.custom_roles 
    WHERE workspace_id = public.get_user_workspace_id()
  )
  AND (
    public.has_permission(auth.uid(), 'configuracion_roles', 'eliminar')
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
);