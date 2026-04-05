
-- Table for HU attachments
CREATE TABLE public.hu_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_story_id uuid NOT NULL REFERENCES public.user_stories(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'document',
  file_size bigint,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hu_attachments ENABLE ROW LEVEL SECURITY;

-- RLS: members of the project can view
CREATE POLICY "hu_attachments_select" ON public.hu_attachments
FOR SELECT TO authenticated
USING (
  user_story_id IN (
    SELECT us.id FROM user_stories us
    WHERE is_project_member(auth.uid(), us.project_id)
       OR has_permission(auth.uid(), 'backlog', 'view')
  )
);

-- RLS: members can insert
CREATE POLICY "hu_attachments_insert" ON public.hu_attachments
FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND user_story_id IN (
    SELECT us.id FROM user_stories us
    WHERE is_project_member(auth.uid(), us.project_id)
  )
);

-- RLS: uploader or admin can delete
CREATE POLICY "hu_attachments_delete" ON public.hu_attachments
FOR DELETE TO authenticated
USING (
  uploaded_by = auth.uid()
  OR has_permission(auth.uid(), 'backlog', 'delete')
);

-- Storage bucket for HU attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('hu-attachments', 'hu-attachments', false);

-- Storage policies
CREATE POLICY "hu_att_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'hu-attachments');

CREATE POLICY "hu_att_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'hu-attachments');

CREATE POLICY "hu_att_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'hu-attachments');
