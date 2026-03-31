
-- Add missing columns to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS color text DEFAULT '#1E3A5F';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS git_url text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS technologies text[];
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';

-- Create project_members table
CREATE TABLE public.project_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_role text NOT NULL DEFAULT 'developer',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- RLS: only workspace members can view project members
CREATE POLICY "Users can view project members" ON public.project_members
FOR SELECT TO authenticated
USING (
  project_id IN (
    SELECT p.id FROM projects p WHERE p.workspace_id = get_user_workspace_id()
  )
);

CREATE POLICY "Users can manage project members" ON public.project_members
FOR ALL TO authenticated
USING (
  project_id IN (
    SELECT p.id FROM projects p WHERE p.workspace_id = get_user_workspace_id()
  )
);
