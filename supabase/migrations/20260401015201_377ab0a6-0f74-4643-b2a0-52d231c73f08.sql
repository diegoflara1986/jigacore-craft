
-- Helper: check if user has lead-level role (admin, super_admin, project_manager, team_lead)
CREATE OR REPLACE FUNCTION public.has_lead_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = _user_id
    AND role IN ('admin', 'super_admin', 'project_manager', 'team_lead')
  )
$$;

-- Helper: check if user has admin role only
CREATE OR REPLACE FUNCTION public.has_admin_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = _user_id
    AND role IN ('admin', 'super_admin')
  )
$$;

-- Helper: check if user is NOT an external/stakeholder (can do team-level work)
CREATE OR REPLACE FUNCTION public.has_team_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = _user_id
    AND role NOT IN ('stakeholder', 'external_user')
  )
$$;

-- =============================================
-- PROJECTS: replace generic update/delete with role-based
-- =============================================
DROP POLICY IF EXISTS "Users can update workspace projects" ON projects;
DROP POLICY IF EXISTS "Users can delete workspace projects" ON projects;

CREATE POLICY "projects_update" ON projects
FOR UPDATE TO authenticated
USING (
  workspace_id = get_user_workspace_id()
  AND has_management_role(auth.uid())
);

CREATE POLICY "projects_delete" ON projects
FOR DELETE TO authenticated
USING (
  workspace_id = get_user_workspace_id()
  AND has_admin_role(auth.uid())
);

-- =============================================
-- SPRINTS: replace generic update/delete
-- =============================================
DROP POLICY IF EXISTS "sprints_update" ON sprints;
DROP POLICY IF EXISTS "sprints_delete" ON sprints;

CREATE POLICY "sprints_update" ON sprints
FOR UPDATE TO authenticated
USING (
  project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
  AND has_lead_role(auth.uid())
);

CREATE POLICY "sprints_delete" ON sprints
FOR DELETE TO authenticated
USING (
  project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
  AND has_management_role(auth.uid())
);

-- =============================================
-- EPICS: replace generic update/delete
-- =============================================
DROP POLICY IF EXISTS "epics_update" ON epics;
DROP POLICY IF EXISTS "epics_delete" ON epics;

CREATE POLICY "epics_update" ON epics
FOR UPDATE TO authenticated
USING (
  project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
  AND has_lead_role(auth.uid())
);

CREATE POLICY "epics_delete" ON epics
FOR DELETE TO authenticated
USING (
  project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
  AND has_management_role(auth.uid())
);

-- =============================================
-- USER STORIES: replace generic update/delete
-- =============================================
DROP POLICY IF EXISTS "user_stories_update" ON user_stories;
DROP POLICY IF EXISTS "user_stories_delete" ON user_stories;

CREATE POLICY "user_stories_update" ON user_stories
FOR UPDATE TO authenticated
USING (
  project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
  AND has_team_role(auth.uid())
);

CREATE POLICY "user_stories_delete" ON user_stories
FOR DELETE TO authenticated
USING (
  project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
  AND has_lead_role(auth.uid())
);

-- =============================================
-- TASKS: replace generic update/delete
-- =============================================
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;

CREATE POLICY "tasks_update" ON tasks
FOR UPDATE TO authenticated
USING (
  project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
  AND has_team_role(auth.uid())
);

CREATE POLICY "tasks_delete" ON tasks
FOR DELETE TO authenticated
USING (
  project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
  AND has_lead_role(auth.uid())
);

-- =============================================
-- INCIDENTS: replace generic update/delete
-- =============================================
DROP POLICY IF EXISTS "incidents_update" ON incidents;
DROP POLICY IF EXISTS "incidents_delete" ON incidents;

CREATE POLICY "incidents_update" ON incidents
FOR UPDATE TO authenticated
USING (
  project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
  AND has_team_role(auth.uid())
);

CREATE POLICY "incidents_delete" ON incidents
FOR DELETE TO authenticated
USING (
  project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
  AND has_management_role(auth.uid())
);

-- =============================================
-- ESTIMATION SESSIONS: replace generic update/delete
-- =============================================
DROP POLICY IF EXISTS "estimation_sessions_update" ON estimation_sessions;
DROP POLICY IF EXISTS "estimation_sessions_delete" ON estimation_sessions;

CREATE POLICY "estimation_sessions_update" ON estimation_sessions
FOR UPDATE TO authenticated
USING (
  project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
  AND has_lead_role(auth.uid())
);

CREATE POLICY "estimation_sessions_delete" ON estimation_sessions
FOR DELETE TO authenticated
USING (
  project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
  AND has_management_role(auth.uid())
);

-- =============================================
-- WORKSPACES: restrict update to admins only
-- =============================================
DROP POLICY IF EXISTS "Users can update own workspace" ON workspaces;

CREATE POLICY "workspaces_update_admin" ON workspaces
FOR UPDATE TO authenticated
USING (
  id = get_user_workspace_id()
  AND has_admin_role(auth.uid())
);
