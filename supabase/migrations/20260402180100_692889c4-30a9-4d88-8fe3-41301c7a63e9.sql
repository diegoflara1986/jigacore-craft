
-- =============================================
-- PART 1: Add new columns to incidents
-- =============================================
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS is_requirement boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolution_date date,
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);

-- Update default status from 'open' to 'pendiente'
ALTER TABLE public.incidents ALTER COLUMN status SET DEFAULT 'pendiente';
-- Update default severity to NULL
ALTER TABLE public.incidents ALTER COLUMN severity DROP DEFAULT;
ALTER TABLE public.incidents ALTER COLUMN severity DROP NOT NULL;

-- =============================================
-- PART 2: Create incident_attachments table
-- =============================================
CREATE TABLE IF NOT EXISTS public.incident_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'document',
  file_size bigint,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incident_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incident_attachments_select" ON public.incident_attachments
  FOR SELECT TO authenticated
  USING (
    incident_id IN (
      SELECT i.id FROM incidents i
      WHERE is_project_member(auth.uid(), i.project_id)
         OR has_admin_role(auth.uid())
    )
  );

CREATE POLICY "incident_attachments_insert" ON public.incident_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    incident_id IN (
      SELECT i.id FROM incidents i
      WHERE is_project_member(auth.uid(), i.project_id)
    )
  );

CREATE POLICY "incident_attachments_delete" ON public.incident_attachments
  FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR has_admin_role(auth.uid())
  );

-- =============================================
-- PART 3: Add can_manage, can_close to incident_permission_configs
-- =============================================
ALTER TABLE public.incident_permission_configs
  ADD COLUMN IF NOT EXISTS can_manage boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_close boolean NOT NULL DEFAULT false;

-- =============================================
-- PART 4: Update storage bucket policies for wider file types
-- =============================================
-- Allow more file types in incident-attachments bucket
-- (bucket already exists, just need updated policies)

-- =============================================
-- PART 5: Update RLS on incidents for the new model
-- =============================================
-- Drop old policies that don't match the new model
DROP POLICY IF EXISTS "incidents_select_by_membership" ON public.incidents;
DROP POLICY IF EXISTS "incidents_insert_auth" ON public.incidents;
DROP POLICY IF EXISTS "incidents_update" ON public.incidents;
DROP POLICY IF EXISTS "incidents_delete" ON public.incidents;

-- New SELECT: members of the project can see incidents
CREATE POLICY "incidents_select_v2" ON public.incidents
  FOR SELECT TO authenticated
  USING (
    has_admin_role(auth.uid())
    OR is_project_member(auth.uid(), project_id)
  );

-- New INSERT: members of the project can create
CREATE POLICY "incidents_insert_v2" ON public.incidents
  FOR INSERT TO authenticated
  WITH CHECK (
    is_project_member(auth.uid(), project_id)
  );

-- New UPDATE: members with team role can update
CREATE POLICY "incidents_update_v2" ON public.incidents
  FOR UPDATE TO authenticated
  USING (
    has_admin_role(auth.uid())
    OR is_project_member(auth.uid(), project_id)
  );

-- New DELETE: only admin
CREATE POLICY "incidents_delete_v2" ON public.incidents
  FOR DELETE TO authenticated
  USING (
    has_admin_role(auth.uid())
  );

-- =============================================
-- PART 6: Update lookup function for new statuses
-- =============================================
CREATE OR REPLACE FUNCTION public.lookup_incident_public(p_ticket_code text)
RETURNS TABLE(ticket_code text, title text, status text, severity text, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ticket_code, title, status, COALESCE(severity, 'sin_evaluar'), created_at, updated_at
  FROM incidents WHERE ticket_code = p_ticket_code
  LIMIT 1;
$$;

-- =============================================  
-- PART 7: Update incident_notes RLS for internal visibility
-- =============================================
DROP POLICY IF EXISTS "incident_notes_select" ON public.incident_notes;

CREATE POLICY "incident_notes_select_v2" ON public.incident_notes
  FOR SELECT TO authenticated
  USING (
    incident_id IN (
      SELECT i.id FROM incidents i
      WHERE is_project_member(auth.uid(), i.project_id)
         OR has_admin_role(auth.uid())
    )
  );
