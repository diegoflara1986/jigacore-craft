
-- Add story_number and deleted_at columns
ALTER TABLE public.user_stories 
  ADD COLUMN IF NOT EXISTS story_number integer,
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Backfill story_number for existing stories per project
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) AS rn
  FROM public.user_stories
)
UPDATE public.user_stories us
SET story_number = numbered.rn
FROM numbered
WHERE us.id = numbered.id AND us.story_number IS NULL;

-- Function to auto-assign story_number on insert
CREATE OR REPLACE FUNCTION public.assign_story_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_number integer;
BEGIN
  SELECT COALESCE(MAX(story_number), 0) + 1 INTO next_number
  FROM public.user_stories
  WHERE project_id = NEW.project_id;
  
  NEW.story_number := next_number;
  RETURN NEW;
END;
$$;

-- Trigger to auto-assign on insert
DROP TRIGGER IF EXISTS trg_assign_story_number ON public.user_stories;
CREATE TRIGGER trg_assign_story_number
  BEFORE INSERT ON public.user_stories
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_story_number();
