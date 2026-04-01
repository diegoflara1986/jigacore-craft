
-- Table for sprint retrospectives
CREATE TABLE public.sprint_retrospectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  went_well TEXT DEFAULT '',
  to_improve TEXT DEFAULT '',
  action_items TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sprint_id)
);

ALTER TABLE public.sprint_retrospectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "retro_select" ON public.sprint_retrospectives FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "retro_insert" ON public.sprint_retrospectives FOR INSERT TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "retro_update" ON public.sprint_retrospectives FOR UPDATE TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()) AND has_team_role(auth.uid()));

CREATE POLICY "retro_delete" ON public.sprint_retrospectives FOR DELETE TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()) AND has_management_role(auth.uid()));
