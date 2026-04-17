-- 2. Tiempo y estimaciones
DELETE FROM public.time_logs WHERE true;
DELETE FROM public.estimation_round_votes WHERE true;
DELETE FROM public.estimation_votes WHERE true;
DELETE FROM public.estimation_round_stories WHERE true;
DELETE FROM public.estimation_round_participants WHERE true;
DELETE FROM public.estimation_rounds WHERE true;
DELETE FROM public.estimation_session_participants WHERE true;
DELETE FROM public.estimation_sessions WHERE true;
DELETE FROM public.estimations WHERE true;

-- 3. Incidentes
DELETE FROM public.incident_attachments WHERE true;
DELETE FROM public.incident_history WHERE true;
DELETE FROM public.incident_notes WHERE true;
DELETE FROM public.incidents WHERE true;

-- 4. Proyectos
DELETE FROM public.comments WHERE true;
DELETE FROM public.hu_attachments WHERE true;
DELETE FROM public.sprint_retrospectives WHERE true;
DELETE FROM public.tasks WHERE true;
DELETE FROM public.user_stories WHERE true;
DELETE FROM public.sprints WHERE true;
DELETE FROM public.epics WHERE true;
DELETE FROM public.cost_configs WHERE true;
DELETE FROM public.project_members WHERE true;
DELETE FROM public.projects WHERE true;

-- 5. Notificaciones
DELETE FROM public.notifications WHERE true;
DELETE FROM public.notification_preferences WHERE true;

-- 6. Permisos y configuraciones
DELETE FROM public.role_permissions WHERE true;
DELETE FROM public.role_incident_permissions WHERE true;
DELETE FROM public.incident_permission_configs WHERE true;
DELETE FROM public.sla_configs WHERE true;

-- 7. Roles personalizados excepto super_admin
UPDATE public.profiles
SET role_id = NULL
WHERE role_id IN (
  SELECT id FROM public.custom_roles
  WHERE name NOT ILIKE '%super%'
);

DELETE FROM public.custom_roles
WHERE name NOT ILIKE '%super%';

-- 8. Perfiles excepto super admin
DELETE FROM public.profiles
WHERE role != 'super_admin';