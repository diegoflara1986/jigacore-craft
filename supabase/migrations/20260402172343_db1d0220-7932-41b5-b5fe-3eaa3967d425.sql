
-- Create estimation_rounds table
CREATE TABLE public.estimation_rounds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'abierta',
  scale integer[] NOT NULL DEFAULT '{0,1,2,3,5,8,13,21,34}',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  closed_at timestamp with time zone
);

ALTER TABLE public.estimation_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estimation_rounds_select" ON public.estimation_rounds
  FOR SELECT TO authenticated
  USING (
    has_admin_role(auth.uid())
    OR is_project_member(auth.uid(), project_id)
  );

CREATE POLICY "estimation_rounds_insert" ON public.estimation_rounds
  FOR INSERT TO authenticated
  WITH CHECK (
    is_project_member(auth.uid(), project_id)
    AND has_lead_role(auth.uid())
  );

CREATE POLICY "estimation_rounds_update" ON public.estimation_rounds
  FOR UPDATE TO authenticated
  USING (
    is_project_member(auth.uid(), project_id)
    AND (created_by = auth.uid() OR has_admin_role(auth.uid()))
  );

CREATE POLICY "estimation_rounds_delete" ON public.estimation_rounds
  FOR DELETE TO authenticated
  USING (
    is_project_member(auth.uid(), project_id)
    AND has_management_role(auth.uid())
  );

-- Junction table: which stories belong to which round
CREATE TABLE public.estimation_round_stories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id uuid NOT NULL REFERENCES public.estimation_rounds(id) ON DELETE CASCADE,
  user_story_id uuid NOT NULL REFERENCES public.user_stories(id) ON DELETE CASCADE,
  result_points integer,
  UNIQUE(round_id, user_story_id)
);

ALTER TABLE public.estimation_round_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "round_stories_select" ON public.estimation_round_stories
  FOR SELECT TO authenticated
  USING (
    round_id IN (SELECT id FROM public.estimation_rounds WHERE has_admin_role(auth.uid()) OR is_project_member(auth.uid(), project_id))
  );

CREATE POLICY "round_stories_insert" ON public.estimation_round_stories
  FOR INSERT TO authenticated
  WITH CHECK (
    round_id IN (SELECT id FROM public.estimation_rounds WHERE is_project_member(auth.uid(), project_id) AND has_lead_role(auth.uid()))
  );

CREATE POLICY "round_stories_update" ON public.estimation_round_stories
  FOR UPDATE TO authenticated
  USING (
    round_id IN (SELECT id FROM public.estimation_rounds WHERE is_project_member(auth.uid(), project_id) AND (created_by = auth.uid() OR has_admin_role(auth.uid())))
  );

CREATE POLICY "round_stories_delete" ON public.estimation_round_stories
  FOR DELETE TO authenticated
  USING (
    round_id IN (SELECT id FROM public.estimation_rounds WHERE is_project_member(auth.uid(), project_id) AND has_management_role(auth.uid()))
  );

-- Create estimation_round_votes table
CREATE TABLE public.estimation_round_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id uuid NOT NULL REFERENCES public.estimation_rounds(id) ON DELETE CASCADE,
  round_story_id uuid NOT NULL REFERENCES public.estimation_round_stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  vote_value integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(round_story_id, user_id)
);

ALTER TABLE public.estimation_round_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "round_votes_select" ON public.estimation_round_votes
  FOR SELECT TO authenticated
  USING (
    round_id IN (SELECT id FROM public.estimation_rounds WHERE has_admin_role(auth.uid()) OR is_project_member(auth.uid(), project_id))
  );

CREATE POLICY "round_votes_insert" ON public.estimation_round_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND round_id IN (SELECT id FROM public.estimation_rounds WHERE is_project_member(auth.uid(), project_id) AND status = 'abierta')
  );

CREATE POLICY "round_votes_update" ON public.estimation_round_votes
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND round_id IN (SELECT id FROM public.estimation_rounds WHERE is_project_member(auth.uid(), project_id) AND status = 'abierta')
  );

CREATE POLICY "round_votes_delete" ON public.estimation_round_votes
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND round_id IN (SELECT id FROM public.estimation_rounds WHERE is_project_member(auth.uid(), project_id))
  );

-- Participants table for rounds (who was invited to vote)
CREATE TABLE public.estimation_round_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id uuid NOT NULL REFERENCES public.estimation_rounds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  UNIQUE(round_id, user_id)
);

ALTER TABLE public.estimation_round_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "round_participants_select" ON public.estimation_round_participants
  FOR SELECT TO authenticated
  USING (
    round_id IN (SELECT id FROM public.estimation_rounds WHERE has_admin_role(auth.uid()) OR is_project_member(auth.uid(), project_id))
  );

CREATE POLICY "round_participants_insert" ON public.estimation_round_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    round_id IN (SELECT id FROM public.estimation_rounds WHERE is_project_member(auth.uid(), project_id) AND has_lead_role(auth.uid()))
  );

CREATE POLICY "round_participants_delete" ON public.estimation_round_participants
  FOR DELETE TO authenticated
  USING (
    round_id IN (SELECT id FROM public.estimation_rounds WHERE is_project_member(auth.uid(), project_id) AND has_management_role(auth.uid()))
  );
