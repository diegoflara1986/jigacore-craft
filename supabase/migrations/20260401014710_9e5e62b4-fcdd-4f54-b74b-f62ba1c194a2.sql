
-- Security definer function to check if user has management role
CREATE OR REPLACE FUNCTION public.has_management_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = _user_id
    AND role IN ('admin', 'super_admin', 'project_manager')
  )
$$;

-- ============================================
-- FIX project_members policies
-- ============================================
DROP POLICY IF EXISTS "Users can manage project members" ON project_members;
DROP POLICY IF EXISTS "Users can view project members" ON project_members;

CREATE POLICY "project_members_select" ON project_members
FOR SELECT TO authenticated
USING (
  project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
);

CREATE POLICY "project_members_insert" ON project_members
FOR INSERT TO authenticated
WITH CHECK (
  has_management_role(auth.uid())
  AND project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
);

CREATE POLICY "project_members_update" ON project_members
FOR UPDATE TO authenticated
USING (
  has_management_role(auth.uid())
  AND project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
);

CREATE POLICY "project_members_delete" ON project_members
FOR DELETE TO authenticated
USING (
  has_management_role(auth.uid())
  AND project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
);

-- ============================================
-- FIX estimation_sessions
-- ============================================
DROP POLICY IF EXISTS "Users can manage estimation sessions" ON estimation_sessions;
DROP POLICY IF EXISTS "Users can view estimation sessions" ON estimation_sessions;

CREATE POLICY "estimation_sessions_select" ON estimation_sessions
FOR SELECT TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "estimation_sessions_insert" ON estimation_sessions
FOR INSERT TO authenticated
WITH CHECK (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "estimation_sessions_update" ON estimation_sessions
FOR UPDATE TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "estimation_sessions_delete" ON estimation_sessions
FOR DELETE TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

-- ============================================
-- FIX estimations
-- ============================================
DROP POLICY IF EXISTS "Users can manage estimations" ON estimations;
DROP POLICY IF EXISTS "Users can view estimations" ON estimations;

CREATE POLICY "estimations_select" ON estimations
FOR SELECT TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "estimations_insert" ON estimations
FOR INSERT TO authenticated
WITH CHECK (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "estimations_update" ON estimations
FOR UPDATE TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "estimations_delete" ON estimations
FOR DELETE TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

-- ============================================
-- FIX cost_configs
-- ============================================
DROP POLICY IF EXISTS "Users can manage cost configs" ON cost_configs;
DROP POLICY IF EXISTS "Users can view cost configs" ON cost_configs;

CREATE POLICY "cost_configs_select" ON cost_configs
FOR SELECT TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "cost_configs_insert" ON cost_configs
FOR INSERT TO authenticated
WITH CHECK (
  has_management_role(auth.uid())
  AND project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
);

CREATE POLICY "cost_configs_update" ON cost_configs
FOR UPDATE TO authenticated
USING (
  has_management_role(auth.uid())
  AND project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
);

CREATE POLICY "cost_configs_delete" ON cost_configs
FOR DELETE TO authenticated
USING (
  has_management_role(auth.uid())
  AND project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
);

-- ============================================
-- FIX incidents
-- ============================================
DROP POLICY IF EXISTS "Users can manage incidents" ON incidents;
DROP POLICY IF EXISTS "Users can view incidents" ON incidents;

CREATE POLICY "incidents_select" ON incidents
FOR SELECT TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "incidents_insert" ON incidents
FOR INSERT TO authenticated
WITH CHECK (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "incidents_update" ON incidents
FOR UPDATE TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "incidents_delete" ON incidents
FOR DELETE TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

-- ============================================
-- FIX user_stories
-- ============================================
DROP POLICY IF EXISTS "Users can manage user stories" ON user_stories;
DROP POLICY IF EXISTS "Users can view user stories" ON user_stories;

CREATE POLICY "user_stories_select" ON user_stories
FOR SELECT TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "user_stories_insert" ON user_stories
FOR INSERT TO authenticated
WITH CHECK (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "user_stories_update" ON user_stories
FOR UPDATE TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "user_stories_delete" ON user_stories
FOR DELETE TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

-- ============================================
-- FIX tasks
-- ============================================
DROP POLICY IF EXISTS "Users can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks" ON tasks;

CREATE POLICY "tasks_select" ON tasks
FOR SELECT TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "tasks_insert" ON tasks
FOR INSERT TO authenticated
WITH CHECK (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "tasks_update" ON tasks
FOR UPDATE TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "tasks_delete" ON tasks
FOR DELETE TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

-- ============================================
-- FIX epics
-- ============================================
DROP POLICY IF EXISTS "Users can manage epics" ON epics;
DROP POLICY IF EXISTS "Users can view epics" ON epics;

CREATE POLICY "epics_select" ON epics
FOR SELECT TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "epics_insert" ON epics
FOR INSERT TO authenticated
WITH CHECK (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "epics_update" ON epics
FOR UPDATE TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "epics_delete" ON epics
FOR DELETE TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

-- ============================================
-- FIX sprints
-- ============================================
DROP POLICY IF EXISTS "Users can manage sprints" ON sprints;
DROP POLICY IF EXISTS "Users can view sprints" ON sprints;

CREATE POLICY "sprints_select" ON sprints
FOR SELECT TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "sprints_insert" ON sprints
FOR INSERT TO authenticated
WITH CHECK (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "sprints_update" ON sprints
FOR UPDATE TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "sprints_delete" ON sprints
FOR DELETE TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));
