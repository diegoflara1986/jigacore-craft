
-- =============================================
-- PHASE 1: Create new tables
-- =============================================

CREATE TABLE public.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#6B7280',
  icon text DEFAULT '👤',
  is_system_role boolean DEFAULT false,
  is_active boolean DEFAULT true,
  base_role app_role,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  module text NOT NULL,
  action text NOT NULL,
  is_allowed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, module, action)
);

CREATE TABLE public.role_incident_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  can_create boolean DEFAULT false,
  can_manage boolean DEFAULT false,
  can_close boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id)
);

-- Enable RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_incident_permissions ENABLE ROW LEVEL SECURITY;

-- RLS: custom_roles
CREATE POLICY "custom_roles_select" ON public.custom_roles FOR SELECT TO authenticated
  USING (workspace_id = public.get_user_workspace_id());
CREATE POLICY "custom_roles_insert" ON public.custom_roles FOR INSERT TO authenticated
  WITH CHECK (workspace_id = public.get_user_workspace_id() AND public.has_admin_role(auth.uid()));
CREATE POLICY "custom_roles_update" ON public.custom_roles FOR UPDATE TO authenticated
  USING (workspace_id = public.get_user_workspace_id() AND public.has_admin_role(auth.uid()));
CREATE POLICY "custom_roles_delete" ON public.custom_roles FOR DELETE TO authenticated
  USING (workspace_id = public.get_user_workspace_id() AND public.has_admin_role(auth.uid()) AND is_system_role = false);

-- RLS: role_permissions
CREATE POLICY "role_permissions_select" ON public.role_permissions FOR SELECT TO authenticated
  USING (role_id IN (SELECT id FROM public.custom_roles WHERE workspace_id = public.get_user_workspace_id()));
CREATE POLICY "role_permissions_insert" ON public.role_permissions FOR INSERT TO authenticated
  WITH CHECK (role_id IN (SELECT id FROM public.custom_roles WHERE workspace_id = public.get_user_workspace_id()) AND public.has_admin_role(auth.uid()));
CREATE POLICY "role_permissions_update" ON public.role_permissions FOR UPDATE TO authenticated
  USING (role_id IN (SELECT id FROM public.custom_roles WHERE workspace_id = public.get_user_workspace_id()) AND public.has_admin_role(auth.uid()));
CREATE POLICY "role_permissions_delete" ON public.role_permissions FOR DELETE TO authenticated
  USING (role_id IN (SELECT id FROM public.custom_roles WHERE workspace_id = public.get_user_workspace_id()) AND public.has_admin_role(auth.uid()));

-- RLS: role_incident_permissions
CREATE POLICY "role_incident_perms_select" ON public.role_incident_permissions FOR SELECT TO authenticated
  USING (role_id IN (SELECT id FROM public.custom_roles WHERE workspace_id = public.get_user_workspace_id()));
CREATE POLICY "role_incident_perms_insert" ON public.role_incident_permissions FOR INSERT TO authenticated
  WITH CHECK (role_id IN (SELECT id FROM public.custom_roles WHERE workspace_id = public.get_user_workspace_id()) AND public.has_admin_role(auth.uid()));
CREATE POLICY "role_incident_perms_update" ON public.role_incident_permissions FOR UPDATE TO authenticated
  USING (role_id IN (SELECT id FROM public.custom_roles WHERE workspace_id = public.get_user_workspace_id()) AND public.has_admin_role(auth.uid()));
CREATE POLICY "role_incident_perms_delete" ON public.role_incident_permissions FOR DELETE TO authenticated
  USING (role_id IN (SELECT id FROM public.custom_roles WHERE workspace_id = public.get_user_workspace_id()) AND public.has_admin_role(auth.uid()));

-- =============================================
-- PHASE 2: Populate system roles for each workspace
-- =============================================

INSERT INTO public.custom_roles (workspace_id, name, description, color, icon, is_system_role, base_role)
SELECT w.id, r.name, r.description, r.color, r.icon, true, r.base_role::app_role
FROM public.workspaces w
CROSS JOIN (VALUES
  ('Super Admin', 'Control total de la plataforma', '#1E3A5F', '👑', 'super_admin'),
  ('Admin', 'Gestiona workspace y usuarios', '#2563EB', '🛡️', 'admin'),
  ('Project Manager', 'Gestiona proyectos y sprints', '#F97316', '📊', 'project_manager'),
  ('Team Lead', 'Lidera el equipo técnico', '#8B5CF6', '🎯', 'team_lead'),
  ('Developer', 'Desarrolla funcionalidades', '#10B981', '👨‍💻', 'developer'),
  ('QA', 'Control de calidad y pruebas', '#EF4444', '🔍', 'qa'),
  ('Designer', 'Diseño UI/UX', '#EC4899', '🎨', 'designer'),
  ('Architect', 'Arquitectura de software', '#F59E0B', '🏗️', 'architect'),
  ('Analyst', 'Análisis y documentación', '#06B6D4', '📝', 'analyst'),
  ('Stakeholder', 'Solo lectura de reportes', '#6B7280', '👁️', 'stakeholder'),
  ('Usuario Externo', 'Solo reporta incidentes', '#9CA3AF', '👤', 'external_user')
) AS r(name, description, color, icon, base_role);

-- Populate role_permissions and role_incident_permissions
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id, base_role::text as br FROM public.custom_roles WHERE is_system_role = true LOOP

    IF r.br IN ('super_admin', 'admin') THEN
      INSERT INTO public.role_permissions (role_id, module, action, is_allowed)
      SELECT r.id, ma.m, ma.a, true FROM (VALUES
        ('projects','view'),('projects','create'),('projects','edit'),('projects','delete'),('projects','archive'),
        ('backlog','view'),('backlog','create'),('backlog','edit'),('backlog','delete'),
        ('sprints','view'),('sprints','create'),('sprints','edit'),('sprints','delete'),('sprints','manage'),
        ('kanban','view'),('kanban','move_cards'),
        ('epics','view'),('epics','create'),('epics','edit'),('epics','delete'),
        ('estimation','view'),('estimation','vote'),('estimation','manage'),('estimation','close'),
        ('time','view_own'),('time','view_team'),('time','log'),('time','approve'),
        ('costs','view'),('costs','configure'),
        ('incidents','view'),('incidents','create'),('incidents','manage'),('incidents','close'),
        ('reports','view_basic'),('reports','view_financial'),('reports','export'),
        ('members','view'),('members','add'),('members','remove'),('members','change_role'),
        ('settings','view'),('settings','edit_workspace'),('settings','edit_project'),
        ('users','view'),('users','invite'),('users','deactivate'),('users','change_role'),
        ('audit','view'),
        ('billing','view'),('billing','manage')
      ) AS ma(m, a) ON CONFLICT (role_id, module, action) DO NOTHING;
      INSERT INTO public.role_incident_permissions (role_id, can_create, can_manage, can_close)
      VALUES (r.id, true, true, true) ON CONFLICT (role_id) DO NOTHING;

    ELSIF r.br = 'project_manager' THEN
      INSERT INTO public.role_permissions (role_id, module, action, is_allowed)
      SELECT r.id, ma.m, ma.a, true FROM (VALUES
        ('projects','view'),('projects','create'),('projects','edit'),('projects','archive'),
        ('backlog','view'),('backlog','create'),('backlog','edit'),('backlog','delete'),
        ('sprints','view'),('sprints','create'),('sprints','edit'),('sprints','manage'),
        ('kanban','view'),('kanban','move_cards'),
        ('epics','view'),('epics','create'),('epics','edit'),('epics','delete'),
        ('estimation','view'),('estimation','vote'),('estimation','manage'),('estimation','close'),
        ('time','view_own'),('time','view_team'),('time','log'),('time','approve'),
        ('costs','view'),('costs','configure'),
        ('incidents','view'),('incidents','create'),('incidents','manage'),('incidents','close'),
        ('reports','view_basic'),('reports','view_financial'),('reports','export'),
        ('members','view'),('members','add'),('members','remove'),('members','change_role'),
        ('settings','view'),('settings','edit_project'),
        ('users','view')
      ) AS ma(m, a) ON CONFLICT (role_id, module, action) DO NOTHING;
      INSERT INTO public.role_incident_permissions (role_id, can_create, can_manage, can_close)
      VALUES (r.id, true, true, true) ON CONFLICT (role_id) DO NOTHING;

    ELSIF r.br = 'team_lead' THEN
      INSERT INTO public.role_permissions (role_id, module, action, is_allowed)
      SELECT r.id, ma.m, ma.a, true FROM (VALUES
        ('projects','view'),('projects','edit'),
        ('backlog','view'),('backlog','create'),('backlog','edit'),('backlog','delete'),
        ('sprints','view'),('sprints','create'),('sprints','edit'),('sprints','manage'),
        ('kanban','view'),('kanban','move_cards'),
        ('epics','view'),('epics','create'),('epics','edit'),('epics','delete'),
        ('estimation','view'),('estimation','vote'),('estimation','manage'),
        ('time','view_own'),('time','view_team'),('time','log'),
        ('costs','view'),
        ('incidents','view'),('incidents','create'),('incidents','manage'),
        ('reports','view_basic'),('reports','export'),
        ('members','view'),
        ('settings','view'),('settings','edit_project'),
        ('users','view')
      ) AS ma(m, a) ON CONFLICT (role_id, module, action) DO NOTHING;
      INSERT INTO public.role_incident_permissions (role_id, can_create, can_manage, can_close)
      VALUES (r.id, true, true, false) ON CONFLICT (role_id) DO NOTHING;

    ELSIF r.br = 'developer' THEN
      INSERT INTO public.role_permissions (role_id, module, action, is_allowed)
      SELECT r.id, ma.m, ma.a, true FROM (VALUES
        ('projects','view'),
        ('backlog','view'),('backlog','create'),('backlog','edit'),
        ('sprints','view'),
        ('kanban','view'),('kanban','move_cards'),
        ('epics','view'),
        ('estimation','view'),('estimation','vote'),
        ('time','view_own'),('time','log'),
        ('incidents','view'),('incidents','create'),
        ('reports','view_basic'),
        ('members','view'),
        ('settings','view'),
        ('users','view')
      ) AS ma(m, a) ON CONFLICT (role_id, module, action) DO NOTHING;
      INSERT INTO public.role_incident_permissions (role_id, can_create, can_manage, can_close)
      VALUES (r.id, true, false, false) ON CONFLICT (role_id) DO NOTHING;

    ELSIF r.br = 'qa' THEN
      INSERT INTO public.role_permissions (role_id, module, action, is_allowed)
      SELECT r.id, ma.m, ma.a, true FROM (VALUES
        ('projects','view'),
        ('backlog','view'),('backlog','create'),('backlog','edit'),
        ('sprints','view'),
        ('kanban','view'),('kanban','move_cards'),
        ('epics','view'),
        ('estimation','view'),('estimation','vote'),
        ('time','view_own'),('time','log'),
        ('incidents','view'),('incidents','create'),('incidents','manage'),
        ('reports','view_basic'),('reports','export'),
        ('members','view'),
        ('settings','view'),
        ('users','view')
      ) AS ma(m, a) ON CONFLICT (role_id, module, action) DO NOTHING;
      INSERT INTO public.role_incident_permissions (role_id, can_create, can_manage, can_close)
      VALUES (r.id, true, true, false) ON CONFLICT (role_id) DO NOTHING;

    ELSIF r.br IN ('designer', 'architect', 'analyst') THEN
      INSERT INTO public.role_permissions (role_id, module, action, is_allowed)
      SELECT r.id, ma.m, ma.a, true FROM (VALUES
        ('projects','view'),
        ('backlog','view'),('backlog','create'),('backlog','edit'),
        ('sprints','view'),
        ('kanban','view'),('kanban','move_cards'),
        ('epics','view'),
        ('estimation','view'),('estimation','vote'),
        ('time','view_own'),('time','log'),
        ('incidents','view'),('incidents','create'),
        ('reports','view_basic'),
        ('members','view'),
        ('settings','view'),
        ('users','view')
      ) AS ma(m, a) ON CONFLICT (role_id, module, action) DO NOTHING;
      INSERT INTO public.role_incident_permissions (role_id, can_create, can_manage, can_close)
      VALUES (r.id, true, false, false) ON CONFLICT (role_id) DO NOTHING;

    ELSIF r.br = 'stakeholder' THEN
      INSERT INTO public.role_permissions (role_id, module, action, is_allowed)
      SELECT r.id, ma.m, ma.a, true FROM (VALUES
        ('projects','view'),
        ('backlog','view'),
        ('sprints','view'),
        ('kanban','view'),
        ('epics','view'),
        ('estimation','view'),
        ('incidents','view'),
        ('reports','view_basic'),
        ('members','view')
      ) AS ma(m, a) ON CONFLICT (role_id, module, action) DO NOTHING;
      INSERT INTO public.role_incident_permissions (role_id, can_create, can_manage, can_close)
      VALUES (r.id, false, false, false) ON CONFLICT (role_id) DO NOTHING;

    ELSIF r.br = 'external_user' THEN
      INSERT INTO public.role_permissions (role_id, module, action, is_allowed)
      SELECT r.id, ma.m, ma.a, true FROM (VALUES
        ('incidents','view'),('incidents','create')
      ) AS ma(m, a) ON CONFLICT (role_id, module, action) DO NOTHING;
      INSERT INTO public.role_incident_permissions (role_id, can_create, can_manage, can_close)
      VALUES (r.id, true, false, false) ON CONFLICT (role_id) DO NOTHING;

    END IF;
  END LOOP;
END $$;

-- =============================================
-- PHASE 3: Add role_id to profiles
-- =============================================

ALTER TABLE public.profiles ADD COLUMN role_id uuid REFERENCES public.custom_roles(id);

UPDATE public.profiles p
SET role_id = cr.id
FROM public.custom_roles cr
WHERE cr.base_role = p.role
  AND cr.workspace_id = p.workspace_id
  AND cr.is_system_role = true;

-- =============================================
-- PHASE 5: Create new permission functions
-- =============================================

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module text, _action text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role_id uuid;
  _base_role app_role;
BEGIN
  SELECT role, role_id INTO _base_role, _role_id
  FROM public.profiles WHERE id = _user_id;

  IF _base_role = 'super_admin' THEN RETURN true; END IF;
  IF _role_id IS NULL THEN RETURN false; END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.role_permissions
    WHERE role_id = _role_id
      AND module = _module
      AND action = _action
      AND is_allowed = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_incident_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role_id uuid;
  _base_role app_role;
BEGIN
  SELECT role, role_id INTO _base_role, _role_id
  FROM public.profiles WHERE id = _user_id;

  IF _base_role IN ('super_admin', 'admin') THEN RETURN true; END IF;
  IF _role_id IS NULL THEN RETURN false; END IF;

  IF _permission = 'can_create' THEN
    RETURN EXISTS (SELECT 1 FROM public.role_incident_permissions WHERE role_id = _role_id AND can_create = true);
  ELSIF _permission = 'can_manage' THEN
    RETURN EXISTS (SELECT 1 FROM public.role_incident_permissions WHERE role_id = _role_id AND can_manage = true);
  ELSIF _permission = 'can_close' THEN
    RETURN EXISTS (SELECT 1 FROM public.role_incident_permissions WHERE role_id = _role_id AND can_close = true);
  END IF;

  RETURN false;
END;
$$;

-- Migrate existing incident_permission_configs data
UPDATE public.role_incident_permissions rip
SET can_create = ipc.can_create,
    can_manage = ipc.can_manage,
    can_close = ipc.can_close
FROM public.incident_permission_configs ipc
JOIN public.custom_roles cr ON cr.base_role::text = ipc.role AND cr.workspace_id = ipc.workspace_id
WHERE rip.role_id = cr.id;
