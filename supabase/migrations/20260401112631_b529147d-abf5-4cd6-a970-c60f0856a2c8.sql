
-- Add new columns to incidents
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS reporter_name text;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS version text;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS browser_info text;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS linked_user_story_id uuid REFERENCES public.user_stories(id);

-- Create SLA configs table
CREATE TABLE public.sla_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  severity text NOT NULL,
  response_hours numeric NOT NULL DEFAULT 24,
  resolution_hours numeric NOT NULL DEFAULT 72,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, severity)
);
ALTER TABLE public.sla_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sla_configs_select" ON public.sla_configs FOR SELECT TO authenticated
  USING (workspace_id = get_user_workspace_id());
CREATE POLICY "sla_configs_insert" ON public.sla_configs FOR INSERT TO authenticated
  WITH CHECK (workspace_id = get_user_workspace_id() AND has_management_role(auth.uid()));
CREATE POLICY "sla_configs_update" ON public.sla_configs FOR UPDATE TO authenticated
  USING (workspace_id = get_user_workspace_id() AND has_management_role(auth.uid()));
CREATE POLICY "sla_configs_delete" ON public.sla_configs FOR DELETE TO authenticated
  USING (workspace_id = get_user_workspace_id() AND has_management_role(auth.uid()));

-- Create incident notes table (internal)
CREATE TABLE public.incident_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  content text NOT NULL,
  is_internal boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.incident_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incident_notes_select" ON public.incident_notes FOR SELECT TO authenticated
  USING (incident_id IN (SELECT i.id FROM incidents i JOIN projects p ON i.project_id = p.id WHERE p.workspace_id = get_user_workspace_id()));
CREATE POLICY "incident_notes_insert" ON public.incident_notes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND incident_id IN (SELECT i.id FROM incidents i JOIN projects p ON i.project_id = p.id WHERE p.workspace_id = get_user_workspace_id()));
CREATE POLICY "incident_notes_delete" ON public.incident_notes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Create incident history table
CREATE TABLE public.incident_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id),
  field_name text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.incident_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incident_history_select" ON public.incident_history FOR SELECT TO authenticated
  USING (incident_id IN (SELECT i.id FROM incidents i JOIN projects p ON i.project_id = p.id WHERE p.workspace_id = get_user_workspace_id()));
CREATE POLICY "incident_history_insert" ON public.incident_history FOR INSERT TO authenticated
  WITH CHECK (incident_id IN (SELECT i.id FROM incidents i JOIN projects p ON i.project_id = p.id WHERE p.workspace_id = get_user_workspace_id()));

-- Allow anonymous insert to incidents (public portal)
DROP POLICY IF EXISTS "incidents_insert" ON public.incidents;
CREATE POLICY "incidents_insert_anon" ON public.incidents FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Allow anonymous select on projects (for public portal dropdown - only id/name of active)
-- We'll handle this via an RPC function instead

-- Create function to get active projects for public portal
CREATE OR REPLACE FUNCTION public.get_active_projects_public()
RETURNS TABLE(id uuid, name text) 
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name FROM projects WHERE status = 'active' ORDER BY name;
$$;

-- Create function to generate ticket code
CREATE OR REPLACE FUNCTION public.generate_ticket_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_year text;
  next_seq integer;
BEGIN
  IF NEW.ticket_code IS NULL OR NEW.ticket_code = '' THEN
    current_year := to_char(now(), 'YYYY');
    SELECT COALESCE(MAX(
      CASE WHEN ticket_code ~ ('^INC-' || current_year || '-\d+$')
      THEN CAST(substring(ticket_code from '\d+$') AS integer)
      ELSE 0 END
    ), 0) + 1 INTO next_seq FROM incidents;
    NEW.ticket_code := 'INC-' || current_year || '-' || lpad(next_seq::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_ticket_code ON public.incidents;
CREATE TRIGGER trg_generate_ticket_code
  BEFORE INSERT ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION generate_ticket_code();

-- Create function to lookup incident by ticket code (public)
CREATE OR REPLACE FUNCTION public.lookup_incident_public(p_ticket_code text)
RETURNS TABLE(ticket_code text, title text, status text, severity text, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ticket_code, title, status, severity, created_at, updated_at
  FROM incidents WHERE ticket_code = p_ticket_code
  LIMIT 1;
$$;

-- Storage bucket for incident attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('incident-attachments', 'incident-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anonymous uploads to incident-attachments
CREATE POLICY "anon_upload_incident_attachments" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'incident-attachments');
CREATE POLICY "public_read_incident_attachments" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'incident-attachments');
