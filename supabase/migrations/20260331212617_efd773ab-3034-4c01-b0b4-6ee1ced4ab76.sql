
-- Create role enum
CREATE TYPE public.app_role AS ENUM (
  'super_admin', 'admin', 'project_manager', 'team_lead',
  'developer', 'qa', 'designer', 'architect', 'analyst',
  'stakeholder', 'external_user'
);

-- Workspaces
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1E3A5F',
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Profiles (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role public.app_role NOT NULL DEFAULT 'developer',
  workspace_id UUID REFERENCES public.workspaces(id),
  job_title TEXT,
  timezone TEXT DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Projects
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  budget NUMERIC(12,2),
  workspace_id UUID REFERENCES public.workspaces(id) NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Epics
CREATE TABLE public.epics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#1E3A5F',
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.epics ENABLE ROW LEVEL SECURITY;

-- Sprints
CREATE TABLE public.sprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  goal TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'planning',
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

-- User Stories
CREATE TABLE public.user_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  acceptance_criteria TEXT,
  type TEXT NOT NULL DEFAULT 'story',
  priority TEXT NOT NULL DEFAULT 'medium',
  story_points INTEGER,
  status TEXT NOT NULL DEFAULT 'backlog',
  sprint_id UUID REFERENCES public.sprints(id),
  epic_id UUID REFERENCES public.epics(id),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.user_stories ENABLE ROW LEVEL SECURITY;

-- Tasks
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES public.profiles(id),
  user_story_id UUID REFERENCES public.user_stories(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  due_date DATE,
  estimated_hours NUMERIC(6,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Time Logs
CREATE TABLE public.time_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  task_id UUID REFERENCES public.tasks(id),
  user_story_id UUID REFERENCES public.user_stories(id),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  hours NUMERIC(6,2) NOT NULL,
  description TEXT,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

-- Incidents
CREATE TABLE public.incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  steps_to_reproduce TEXT,
  expected_result TEXT,
  actual_result TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  category TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id),
  reported_by_email TEXT,
  ticket_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Comments
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  user_story_id UUID REFERENCES public.user_stories(id),
  task_id UUID REFERENCES public.tasks(id),
  incident_id UUID REFERENCES public.incidents(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Cost Configs
CREATE TABLE public.cost_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  role public.app_role,
  hourly_rate NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.cost_configs ENABLE ROW LEVEL SECURITY;

-- Estimations
CREATE TABLE public.estimations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_story_id UUID REFERENCES public.user_stories(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  scale_type TEXT NOT NULL DEFAULT 'fibonacci',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.estimations ENABLE ROW LEVEL SECURITY;

-- Estimation Votes
CREATE TABLE public.estimation_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estimation_id UUID REFERENCES public.estimations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  vote_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.estimation_votes ENABLE ROW LEVEL SECURITY;

-- Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  reference_id UUID,
  reference_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Security definer function to get workspace_id for current user
CREATE OR REPLACE FUNCTION public.get_user_workspace_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.profiles WHERE id = auth.uid()
$$;

-- RLS Policies

-- Workspaces: users can see their own workspace
CREATE POLICY "Users can view own workspace" ON public.workspaces
  FOR SELECT TO authenticated
  USING (id = public.get_user_workspace_id());

CREATE POLICY "Users can update own workspace" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (id = public.get_user_workspace_id());

CREATE POLICY "Authenticated users can create workspaces" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Profiles
CREATE POLICY "Users can view profiles in workspace" ON public.profiles
  FOR SELECT TO authenticated
  USING (workspace_id = public.get_user_workspace_id() OR id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Projects: workspace-scoped
CREATE POLICY "Users can view workspace projects" ON public.projects
  FOR SELECT TO authenticated
  USING (workspace_id = public.get_user_workspace_id());

CREATE POLICY "Users can create workspace projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id = public.get_user_workspace_id());

CREATE POLICY "Users can update workspace projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (workspace_id = public.get_user_workspace_id());

CREATE POLICY "Users can delete workspace projects" ON public.projects
  FOR DELETE TO authenticated
  USING (workspace_id = public.get_user_workspace_id());

-- Epics: via project workspace
CREATE POLICY "Users can view epics" ON public.epics
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE workspace_id = public.get_user_workspace_id()));

CREATE POLICY "Users can manage epics" ON public.epics
  FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE workspace_id = public.get_user_workspace_id()));

-- Sprints
CREATE POLICY "Users can view sprints" ON public.sprints
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE workspace_id = public.get_user_workspace_id()));

CREATE POLICY "Users can manage sprints" ON public.sprints
  FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE workspace_id = public.get_user_workspace_id()));

-- User Stories
CREATE POLICY "Users can view user stories" ON public.user_stories
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE workspace_id = public.get_user_workspace_id()));

CREATE POLICY "Users can manage user stories" ON public.user_stories
  FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE workspace_id = public.get_user_workspace_id()));

-- Tasks
CREATE POLICY "Users can view tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE workspace_id = public.get_user_workspace_id()));

CREATE POLICY "Users can manage tasks" ON public.tasks
  FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE workspace_id = public.get_user_workspace_id()));

-- Time Logs
CREATE POLICY "Users can view time logs" ON public.time_logs
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE workspace_id = public.get_user_workspace_id()));

CREATE POLICY "Users can manage own time logs" ON public.time_logs
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Incidents
CREATE POLICY "Users can view incidents" ON public.incidents
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE workspace_id = public.get_user_workspace_id()));

CREATE POLICY "Users can manage incidents" ON public.incidents
  FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE workspace_id = public.get_user_workspace_id()));

-- Comments
CREATE POLICY "Users can view comments" ON public.comments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create comments" ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own comments" ON public.comments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Cost Configs
CREATE POLICY "Users can view cost configs" ON public.cost_configs
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE workspace_id = public.get_user_workspace_id()));

CREATE POLICY "Users can manage cost configs" ON public.cost_configs
  FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE workspace_id = public.get_user_workspace_id()));

-- Estimations
CREATE POLICY "Users can view estimations" ON public.estimations
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE workspace_id = public.get_user_workspace_id()));

CREATE POLICY "Users can manage estimations" ON public.estimations
  FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE workspace_id = public.get_user_workspace_id()));

-- Estimation Votes
CREATE POLICY "Users can view votes" ON public.estimation_votes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can manage own votes" ON public.estimation_votes
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
