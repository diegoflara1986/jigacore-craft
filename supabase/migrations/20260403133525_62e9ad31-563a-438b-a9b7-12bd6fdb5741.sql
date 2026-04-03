
-- =============================================
-- MIGRATE RLS POLICIES TO USE has_permission()
-- =============================================

-- ===== PROJECTS =====
DROP POLICY IF EXISTS "projects_update" ON projects;
CREATE POLICY "projects_update" ON projects FOR UPDATE
USING (
  (workspace_id = get_user_workspace_id())
  AND has_permission(auth.uid(), 'projects', 'edit')
);

DROP POLICY IF EXISTS "projects_delete" ON projects;
CREATE POLICY "projects_delete" ON projects FOR DELETE
USING (
  (workspace_id = get_user_workspace_id())
  AND has_permission(auth.uid(), 'projects', 'delete')
);

-- ===== PROJECT MEMBERS =====
DROP POLICY IF EXISTS "project_members_insert" ON project_members;
CREATE POLICY "project_members_insert" ON project_members FOR INSERT
WITH CHECK (
  has_permission(auth.uid(), 'members', 'add')
  AND (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()))
);

DROP POLICY IF EXISTS "project_members_update" ON project_members;
CREATE POLICY "project_members_update" ON project_members FOR UPDATE
USING (
  has_permission(auth.uid(), 'members', 'change_role')
  AND (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()))
);

DROP POLICY IF EXISTS "project_members_delete" ON project_members;
CREATE POLICY "project_members_delete" ON project_members FOR DELETE
USING (
  has_permission(auth.uid(), 'members', 'remove')
  AND (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()))
);

-- ===== USER STORIES =====
DROP POLICY IF EXISTS "user_stories_update" ON user_stories;
CREATE POLICY "user_stories_update" ON user_stories FOR UPDATE
USING (
  has_permission(auth.uid(), 'backlog', 'edit')
  AND (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()))
);

DROP POLICY IF EXISTS "user_stories_delete" ON user_stories;
CREATE POLICY "user_stories_delete" ON user_stories FOR DELETE
USING (
  has_permission(auth.uid(), 'backlog', 'delete')
  AND (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()))
);

-- ===== TASKS =====
DROP POLICY IF EXISTS "tasks_update" ON tasks;
CREATE POLICY "tasks_update" ON tasks FOR UPDATE
USING (
  has_permission(auth.uid(), 'kanban', 'move_cards')
  AND (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()))
);

DROP POLICY IF EXISTS "tasks_delete" ON tasks;
CREATE POLICY "tasks_delete" ON tasks FOR DELETE
USING (
  has_permission(auth.uid(), 'backlog', 'delete')
  AND (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()))
);

-- ===== SPRINTS =====
DROP POLICY IF EXISTS "sprints_update" ON sprints;
CREATE POLICY "sprints_update" ON sprints FOR UPDATE
USING (
  has_permission(auth.uid(), 'sprints', 'edit')
  AND (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()))
);

DROP POLICY IF EXISTS "sprints_delete" ON sprints;
CREATE POLICY "sprints_delete" ON sprints FOR DELETE
USING (
  has_permission(auth.uid(), 'sprints', 'delete')
  AND (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()))
);

-- ===== EPICS =====
DROP POLICY IF EXISTS "epics_update" ON epics;
CREATE POLICY "epics_update" ON epics FOR UPDATE
USING (
  has_permission(auth.uid(), 'epics', 'edit')
  AND (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()))
);

DROP POLICY IF EXISTS "epics_delete" ON epics;
CREATE POLICY "epics_delete" ON epics FOR DELETE
USING (
  has_permission(auth.uid(), 'epics', 'delete')
  AND (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()))
);

-- ===== COST CONFIGS =====
DROP POLICY IF EXISTS "cost_configs_insert" ON cost_configs;
CREATE POLICY "cost_configs_insert" ON cost_configs FOR INSERT
WITH CHECK (
  has_permission(auth.uid(), 'costs', 'configure')
  AND (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()))
);

DROP POLICY IF EXISTS "cost_configs_update" ON cost_configs;
CREATE POLICY "cost_configs_update" ON cost_configs FOR UPDATE
USING (
  has_permission(auth.uid(), 'costs', 'configure')
  AND (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()))
);

DROP POLICY IF EXISTS "cost_configs_delete" ON cost_configs;
CREATE POLICY "cost_configs_delete" ON cost_configs FOR DELETE
USING (
  has_permission(auth.uid(), 'costs', 'configure')
  AND (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()))
);

-- ===== ESTIMATION ROUNDS =====
DROP POLICY IF EXISTS "estimation_rounds_insert" ON estimation_rounds;
CREATE POLICY "estimation_rounds_insert" ON estimation_rounds FOR INSERT
WITH CHECK (
  is_project_member(auth.uid(), project_id)
  AND has_permission(auth.uid(), 'estimation', 'manage')
);

DROP POLICY IF EXISTS "estimation_rounds_update" ON estimation_rounds;
CREATE POLICY "estimation_rounds_update" ON estimation_rounds FOR UPDATE
USING (
  is_project_member(auth.uid(), project_id)
  AND (created_by = auth.uid() OR has_permission(auth.uid(), 'estimation', 'manage'))
);

DROP POLICY IF EXISTS "estimation_rounds_delete" ON estimation_rounds;
CREATE POLICY "estimation_rounds_delete" ON estimation_rounds FOR DELETE
USING (
  is_project_member(auth.uid(), project_id)
  AND has_permission(auth.uid(), 'estimation', 'manage')
);

-- ===== ESTIMATION ROUND PARTICIPANTS =====
DROP POLICY IF EXISTS "round_participants_insert" ON estimation_round_participants;
CREATE POLICY "round_participants_insert" ON estimation_round_participants FOR INSERT
WITH CHECK (
  round_id IN (
    SELECT id FROM estimation_rounds
    WHERE is_project_member(auth.uid(), project_id)
      AND has_permission(auth.uid(), 'estimation', 'manage')
  )
);

DROP POLICY IF EXISTS "round_participants_delete" ON estimation_round_participants;
CREATE POLICY "round_participants_delete" ON estimation_round_participants FOR DELETE
USING (
  round_id IN (
    SELECT id FROM estimation_rounds
    WHERE is_project_member(auth.uid(), project_id)
      AND has_permission(auth.uid(), 'estimation', 'manage')
  )
);

-- ===== ESTIMATION ROUND STORIES =====
DROP POLICY IF EXISTS "round_stories_insert" ON estimation_round_stories;
CREATE POLICY "round_stories_insert" ON estimation_round_stories FOR INSERT
WITH CHECK (
  round_id IN (
    SELECT id FROM estimation_rounds
    WHERE is_project_member(auth.uid(), project_id)
      AND has_permission(auth.uid(), 'estimation', 'manage')
  )
);

DROP POLICY IF EXISTS "round_stories_update" ON estimation_round_stories;
CREATE POLICY "round_stories_update" ON estimation_round_stories FOR UPDATE
USING (
  round_id IN (
    SELECT id FROM estimation_rounds
    WHERE is_project_member(auth.uid(), project_id)
      AND (created_by = auth.uid() OR has_permission(auth.uid(), 'estimation', 'close'))
  )
);

DROP POLICY IF EXISTS "round_stories_delete" ON estimation_round_stories;
CREATE POLICY "round_stories_delete" ON estimation_round_stories FOR DELETE
USING (
  round_id IN (
    SELECT id FROM estimation_rounds
    WHERE is_project_member(auth.uid(), project_id)
      AND has_permission(auth.uid(), 'estimation', 'manage')
  )
);

-- ===== ESTIMATION SESSIONS =====
DROP POLICY IF EXISTS "estimation_sessions_update" ON estimation_sessions;
CREATE POLICY "estimation_sessions_update" ON estimation_sessions FOR UPDATE
USING (
  (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()))
  AND has_permission(auth.uid(), 'estimation', 'manage')
);

DROP POLICY IF EXISTS "estimation_sessions_delete" ON estimation_sessions;
CREATE POLICY "estimation_sessions_delete" ON estimation_sessions FOR DELETE
USING (
  (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()))
  AND has_permission(auth.uid(), 'estimation', 'manage')
);

-- ===== ESTIMATIONS =====
DROP POLICY IF EXISTS "estimations_update" ON estimations;
CREATE POLICY "estimations_update" ON estimations FOR UPDATE
USING (
  (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()))
  AND has_permission(auth.uid(), 'estimation', 'manage')
);

DROP POLICY IF EXISTS "estimations_delete" ON estimations;
CREATE POLICY "estimations_delete" ON estimations FOR DELETE
USING (
  (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()))
  AND has_permission(auth.uid(), 'estimation', 'manage')
);

-- ===== SPRINT RETROSPECTIVES =====
DROP POLICY IF EXISTS "retro_update" ON sprint_retrospectives;
CREATE POLICY "retro_update" ON sprint_retrospectives FOR UPDATE
USING (
  has_permission(auth.uid(), 'sprints', 'edit')
  AND (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()))
);

DROP POLICY IF EXISTS "retro_delete" ON sprint_retrospectives;
CREATE POLICY "retro_delete" ON sprint_retrospectives FOR DELETE
USING (
  has_permission(auth.uid(), 'sprints', 'delete')
  AND (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()))
);

-- ===== SLA CONFIGS =====
DROP POLICY IF EXISTS "sla_configs_insert" ON sla_configs;
CREATE POLICY "sla_configs_insert" ON sla_configs FOR INSERT
WITH CHECK (
  (workspace_id = get_user_workspace_id())
  AND has_permission(auth.uid(), 'settings', 'edit_workspace')
);

DROP POLICY IF EXISTS "sla_configs_update" ON sla_configs;
CREATE POLICY "sla_configs_update" ON sla_configs FOR UPDATE
USING (
  (workspace_id = get_user_workspace_id())
  AND has_permission(auth.uid(), 'settings', 'edit_workspace')
);

DROP POLICY IF EXISTS "sla_configs_delete" ON sla_configs;
CREATE POLICY "sla_configs_delete" ON sla_configs FOR DELETE
USING (
  (workspace_id = get_user_workspace_id())
  AND has_permission(auth.uid(), 'settings', 'edit_workspace')
);

-- ===== WORKSPACES =====
DROP POLICY IF EXISTS "workspaces_update_admin" ON workspaces;
CREATE POLICY "workspaces_update_admin" ON workspaces FOR UPDATE
USING (
  (id = get_user_workspace_id())
  AND has_permission(auth.uid(), 'settings', 'edit_workspace')
);

-- ===== PROFILES SELECT (allow team members to see each other) =====
DROP POLICY IF EXISTS "profiles_select_workspace" ON profiles;
CREATE POLICY "profiles_select_workspace" ON profiles FOR SELECT
USING (
  (id = auth.uid())
  OR (
    (workspace_id = get_user_workspace_id())
    AND has_permission(auth.uid(), 'users', 'view')
  )
);
