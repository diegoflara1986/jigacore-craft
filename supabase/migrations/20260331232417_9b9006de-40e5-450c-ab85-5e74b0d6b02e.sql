
-- Create estimation_sessions table
CREATE TABLE public.estimation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sprint_id uuid REFERENCES public.sprints(id) ON DELETE SET NULL,
  name text NOT NULL,
  scale_type text NOT NULL DEFAULT 'fibonacci',
  status text NOT NULL DEFAULT 'active',
  current_story_id uuid REFERENCES public.user_stories(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add session_id to estimations table
ALTER TABLE public.estimations ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.estimation_sessions(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.estimation_sessions ENABLE ROW LEVEL SECURITY;

-- RLS: view sessions in workspace
CREATE POLICY "Users can view estimation sessions"
ON public.estimation_sessions FOR SELECT TO authenticated
USING (project_id IN (
  SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()
));

-- RLS: manage sessions in workspace
CREATE POLICY "Users can manage estimation sessions"
ON public.estimation_sessions FOR ALL TO authenticated
USING (project_id IN (
  SELECT id FROM projects WHERE workspace_id = get_user_workspace_id()
));

-- Enable realtime for estimation_votes and estimation_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.estimation_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.estimation_sessions;
