
-- Security definer function to check project membership (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_project_member(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE user_id = _user_id AND project_id = _project_id
  )
$$;

-- Trigger to auto-add creator as project member
CREATE OR REPLACE FUNCTION public.auto_add_project_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.project_members (project_id, user_id, project_role)
    VALUES (NEW.id, NEW.created_by, 'project_manager')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_add_project_creator
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_project_creator();

-- Replace projects SELECT policy
DROP POLICY IF EXISTS "Users can view workspace projects" ON public.projects;

CREATE POLICY "projects_select_by_membership" ON public.projects
  FOR SELECT TO authenticated
  USING (
    (workspace_id = get_user_workspace_id()) AND (
      has_admin_role(auth.uid())
      OR is_project_member(auth.uid(), id)
    )
  );

-- Replace user_stories SELECT policy
DROP POLICY IF EXISTS "user_stories_select" ON public.user_stories;

CREATE POLICY "user_stories_select_by_membership" ON public.user_stories
  FOR SELECT TO authenticated
  USING (
    has_admin_role(auth.uid())
    OR is_project_member(auth.uid(), project_id)
  );

-- Replace sprints SELECT policy
DROP POLICY IF EXISTS "sprints_select" ON public.sprints;

CREATE POLICY "sprints_select_by_membership" ON public.sprints
  FOR SELECT TO authenticated
  USING (
    has_admin_role(auth.uid())
    OR is_project_member(auth.uid(), project_id)
  );

-- Replace epics SELECT policy
DROP POLICY IF EXISTS "epics_select" ON public.epics;

CREATE POLICY "epics_select_by_membership" ON public.epics
  FOR SELECT TO authenticated
  USING (
    has_admin_role(auth.uid())
    OR is_project_member(auth.uid(), project_id)
  );

-- Replace tasks SELECT policy
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;

CREATE POLICY "tasks_select_by_membership" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    has_admin_role(auth.uid())
    OR is_project_member(auth.uid(), project_id)
  );

-- Replace time_logs SELECT policy
DROP POLICY IF EXISTS "Users can view time logs" ON public.time_logs;

CREATE POLICY "time_logs_select_by_membership" ON public.time_logs
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_admin_role(auth.uid())
    OR is_project_member(auth.uid(), project_id)
  );

-- Replace incidents SELECT policy
DROP POLICY IF EXISTS "incidents_select" ON public.incidents;

CREATE POLICY "incidents_select_by_membership" ON public.incidents
  FOR SELECT TO authenticated
  USING (
    has_admin_role(auth.uid())
    OR is_project_member(auth.uid(), project_id)
  );
