-- ============================================
-- Align RLS permission keys with frontend
-- ============================================

-- EPICS: epics/edit|delete -> epicas/editar|eliminar
DROP POLICY IF EXISTS "epics_update" ON public.epics;
CREATE POLICY "epics_update" ON public.epics FOR UPDATE
USING (has_permission(auth.uid(), 'epicas', 'editar')
       AND project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

DROP POLICY IF EXISTS "epics_delete" ON public.epics;
CREATE POLICY "epics_delete" ON public.epics FOR DELETE
USING (has_permission(auth.uid(), 'epicas', 'eliminar')
       AND project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

-- SPRINTS: sprints/edit|delete -> sprints/editar|eliminar
DROP POLICY IF EXISTS "sprints_update" ON public.sprints;
CREATE POLICY "sprints_update" ON public.sprints FOR UPDATE
USING (has_permission(auth.uid(), 'sprints', 'editar')
       AND project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

DROP POLICY IF EXISTS "sprints_delete" ON public.sprints;
CREATE POLICY "sprints_delete" ON public.sprints FOR DELETE
USING (has_permission(auth.uid(), 'sprints', 'eliminar')
       AND project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

-- SPRINT RETROSPECTIVES
DROP POLICY IF EXISTS "retro_update" ON public.sprint_retrospectives;
CREATE POLICY "retro_update" ON public.sprint_retrospectives FOR UPDATE
USING (has_permission(auth.uid(), 'sprints', 'editar')
       AND project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

DROP POLICY IF EXISTS "retro_delete" ON public.sprint_retrospectives;
CREATE POLICY "retro_delete" ON public.sprint_retrospectives FOR DELETE
USING (has_permission(auth.uid(), 'sprints', 'eliminar')
       AND project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

-- USER STORIES: backlog/edit|delete -> backlog/editar|eliminar
DROP POLICY IF EXISTS "user_stories_update" ON public.user_stories;
CREATE POLICY "user_stories_update" ON public.user_stories FOR UPDATE
USING (has_permission(auth.uid(), 'backlog', 'editar')
       AND project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

DROP POLICY IF EXISTS "user_stories_delete" ON public.user_stories;
CREATE POLICY "user_stories_delete" ON public.user_stories FOR DELETE
USING (has_permission(auth.uid(), 'backlog', 'eliminar')
       AND project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

-- HU ATTACHMENTS: backlog/view|delete -> backlog/ver|eliminar
DROP POLICY IF EXISTS "hu_attachments_select" ON public.hu_attachments;
CREATE POLICY "hu_attachments_select" ON public.hu_attachments FOR SELECT
TO authenticated
USING (user_story_id IN (
  SELECT us.id FROM user_stories us
  WHERE is_project_member(auth.uid(), us.project_id)
     OR has_permission(auth.uid(), 'backlog', 'ver')
));

DROP POLICY IF EXISTS "hu_attachments_delete" ON public.hu_attachments;
CREATE POLICY "hu_attachments_delete" ON public.hu_attachments FOR DELETE
TO authenticated
USING ((uploaded_by = auth.uid()) OR has_permission(auth.uid(), 'backlog', 'eliminar'));

-- TASKS: backlog/delete + kanban/move_cards
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE
USING (has_permission(auth.uid(), 'tablero', 'mover_tarjetas')
       AND project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE
USING (has_permission(auth.uid(), 'backlog', 'eliminar')
       AND project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

-- PROJECT MEMBERS: members/add|remove|change_role -> equipo/agregar|eliminar|cambiar_rol
DROP POLICY IF EXISTS "project_members_insert" ON public.project_members;
CREATE POLICY "project_members_insert" ON public.project_members FOR INSERT
WITH CHECK (has_permission(auth.uid(), 'equipo', 'agregar')
            AND project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

DROP POLICY IF EXISTS "project_members_update" ON public.project_members;
CREATE POLICY "project_members_update" ON public.project_members FOR UPDATE
USING (has_permission(auth.uid(), 'equipo', 'cambiar_rol')
       AND project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

DROP POLICY IF EXISTS "project_members_delete" ON public.project_members;
CREATE POLICY "project_members_delete" ON public.project_members FOR DELETE
USING (has_permission(auth.uid(), 'equipo', 'eliminar')
       AND project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

-- COST CONFIGS: costs/configure -> costos/editar_tarifas
DROP POLICY IF EXISTS "cost_configs_insert" ON public.cost_configs;
CREATE POLICY "cost_configs_insert" ON public.cost_configs FOR INSERT
WITH CHECK (has_permission(auth.uid(), 'costos', 'editar_tarifas')
            AND project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

DROP POLICY IF EXISTS "cost_configs_update" ON public.cost_configs;
CREATE POLICY "cost_configs_update" ON public.cost_configs FOR UPDATE
USING (has_permission(auth.uid(), 'costos', 'editar_tarifas')
       AND project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

DROP POLICY IF EXISTS "cost_configs_delete" ON public.cost_configs;
CREATE POLICY "cost_configs_delete" ON public.cost_configs FOR DELETE
USING (has_permission(auth.uid(), 'costos', 'editar_tarifas')
       AND project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

-- ESTIMATION ROUNDS / SESSIONS / STORIES / VOTES / PARTICIPANTS
-- estimation/manage -> estimacion/crear ; estimation/close -> estimacion/cerrar
DROP POLICY IF EXISTS "estimation_rounds_insert" ON public.estimation_rounds;
CREATE POLICY "estimation_rounds_insert" ON public.estimation_rounds FOR INSERT
WITH CHECK (is_project_member(auth.uid(), project_id)
            AND has_permission(auth.uid(), 'estimacion', 'crear'));

DROP POLICY IF EXISTS "estimation_rounds_update" ON public.estimation_rounds;
CREATE POLICY "estimation_rounds_update" ON public.estimation_rounds FOR UPDATE
USING (is_project_member(auth.uid(), project_id)
       AND ((created_by = auth.uid()) OR has_permission(auth.uid(), 'estimacion', 'cerrar')));

DROP POLICY IF EXISTS "estimation_rounds_delete" ON public.estimation_rounds;
CREATE POLICY "estimation_rounds_delete" ON public.estimation_rounds FOR DELETE
USING (is_project_member(auth.uid(), project_id)
       AND has_permission(auth.uid(), 'estimacion', 'crear'));

DROP POLICY IF EXISTS "estimation_sessions_update" ON public.estimation_sessions;
CREATE POLICY "estimation_sessions_update" ON public.estimation_sessions FOR UPDATE
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
       AND has_permission(auth.uid(), 'estimacion', 'crear'));

DROP POLICY IF EXISTS "estimation_sessions_delete" ON public.estimation_sessions;
CREATE POLICY "estimation_sessions_delete" ON public.estimation_sessions FOR DELETE
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
       AND has_permission(auth.uid(), 'estimacion', 'crear'));

DROP POLICY IF EXISTS "estimations_update" ON public.estimations;
CREATE POLICY "estimations_update" ON public.estimations FOR UPDATE
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
       AND has_permission(auth.uid(), 'estimacion', 'crear'));

DROP POLICY IF EXISTS "estimations_delete" ON public.estimations;
CREATE POLICY "estimations_delete" ON public.estimations FOR DELETE
USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
       AND has_permission(auth.uid(), 'estimacion', 'crear'));

DROP POLICY IF EXISTS "round_participants_insert" ON public.estimation_round_participants;
CREATE POLICY "round_participants_insert" ON public.estimation_round_participants FOR INSERT
WITH CHECK (round_id IN (
  SELECT id FROM estimation_rounds
  WHERE is_project_member(auth.uid(), project_id) AND has_permission(auth.uid(), 'estimacion', 'crear')
));

DROP POLICY IF EXISTS "round_participants_delete" ON public.estimation_round_participants;
CREATE POLICY "round_participants_delete" ON public.estimation_round_participants FOR DELETE
USING (round_id IN (
  SELECT id FROM estimation_rounds
  WHERE is_project_member(auth.uid(), project_id) AND has_permission(auth.uid(), 'estimacion', 'crear')
));

DROP POLICY IF EXISTS "round_stories_insert" ON public.estimation_round_stories;
CREATE POLICY "round_stories_insert" ON public.estimation_round_stories FOR INSERT
WITH CHECK (round_id IN (
  SELECT id FROM estimation_rounds
  WHERE is_project_member(auth.uid(), project_id) AND has_permission(auth.uid(), 'estimacion', 'crear')
));

DROP POLICY IF EXISTS "round_stories_delete" ON public.estimation_round_stories;
CREATE POLICY "round_stories_delete" ON public.estimation_round_stories FOR DELETE
USING (round_id IN (
  SELECT id FROM estimation_rounds
  WHERE is_project_member(auth.uid(), project_id) AND has_permission(auth.uid(), 'estimacion', 'crear')
));

DROP POLICY IF EXISTS "round_stories_update" ON public.estimation_round_stories;
CREATE POLICY "round_stories_update" ON public.estimation_round_stories FOR UPDATE
USING (round_id IN (
  SELECT id FROM estimation_rounds
  WHERE is_project_member(auth.uid(), project_id)
    AND ((created_by = auth.uid()) OR has_permission(auth.uid(), 'estimacion', 'cerrar'))
));

-- SLA CONFIGS: settings/edit_workspace -> config_sla/editar
DROP POLICY IF EXISTS "sla_configs_insert" ON public.sla_configs;
CREATE POLICY "sla_configs_insert" ON public.sla_configs FOR INSERT
WITH CHECK (workspace_id = get_user_workspace_id()
            AND has_permission(auth.uid(), 'config_sla', 'editar'));

DROP POLICY IF EXISTS "sla_configs_update" ON public.sla_configs;
CREATE POLICY "sla_configs_update" ON public.sla_configs FOR UPDATE
USING (workspace_id = get_user_workspace_id()
       AND has_permission(auth.uid(), 'config_sla', 'editar'));

DROP POLICY IF EXISTS "sla_configs_delete" ON public.sla_configs;
CREATE POLICY "sla_configs_delete" ON public.sla_configs FOR DELETE
USING (workspace_id = get_user_workspace_id()
       AND has_permission(auth.uid(), 'config_sla', 'editar'));

-- WORKSPACES: settings/edit_workspace -> config_general/editar
DROP POLICY IF EXISTS "workspaces_update_admin" ON public.workspaces;
CREATE POLICY "workspaces_update_admin" ON public.workspaces FOR UPDATE
USING (id = get_user_workspace_id()
       AND has_permission(auth.uid(), 'config_general', 'editar'));