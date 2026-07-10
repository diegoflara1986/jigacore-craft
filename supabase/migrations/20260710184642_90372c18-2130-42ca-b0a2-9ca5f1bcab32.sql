
-- ============ hu-attachments: enforce project membership ============
DROP POLICY IF EXISTS "hu_att_select" ON storage.objects;
DROP POLICY IF EXISTS "hu_att_insert" ON storage.objects;
DROP POLICY IF EXISTS "hu_att_delete" ON storage.objects;

CREATE POLICY "hu_att_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'hu-attachments'
  AND public.is_project_member(
    auth.uid(),
    NULLIF((storage.foldername(name))[1], '')::uuid
  )
);

CREATE POLICY "hu_att_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'hu-attachments'
  AND public.is_project_member(
    auth.uid(),
    NULLIF((storage.foldername(name))[1], '')::uuid
  )
);

CREATE POLICY "hu_att_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'hu-attachments'
  AND public.is_project_member(
    auth.uid(),
    NULLIF((storage.foldername(name))[1], '')::uuid
  )
);

-- ============ incident-attachments: remove permissive/anon policies ============
DROP POLICY IF EXISTS "incident_attachments_read_auth" ON storage.objects;
DROP POLICY IF EXISTS "incident_upload_restricted" ON storage.objects;

-- Tighten remaining authenticated upload policy to also require project membership
DROP POLICY IF EXISTS "restricted_incident_upload_auth" ON storage.objects;
CREATE POLICY "restricted_incident_upload_auth" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'incident-attachments'
  AND (storage.foldername(name))[1] LIKE 'INC-%'
  AND lower(storage.extension(name)) = ANY (ARRAY['jpg','jpeg','png','gif','webp'])
  AND EXISTS (
    SELECT 1 FROM public.incidents i
    JOIN public.project_members pm
      ON pm.project_id = i.project_id AND pm.user_id = auth.uid()
    WHERE i.ticket_code = (storage.foldername(name))[1]
  )
);

-- ============ avatars: remove broad listing policy (public URLs still work) ============
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- ============ realtime: scope broadcast/presence inserts ============
DROP POLICY IF EXISTS "realtime_insert_authenticated" ON realtime.messages;
CREATE POLICY "realtime_insert_authenticated" ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (
  ((extension = 'presence') OR (extension = 'broadcast'))
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role <> ALL (ARRAY['external_user'::app_role, 'stakeholder'::app_role])
  )
);

-- ============ SECURITY DEFINER functions: revoke public execute ============
-- Revoke from PUBLIC + anon on all internal helpers/triggers.
REVOKE EXECUTE ON FUNCTION public.assign_story_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_add_project_creator() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_ticket_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Helpers used by RLS / server-side only: revoke from anon and authenticated (RLS still evaluates as table owner)
REVOKE EXECUTE ON FUNCTION public.get_external_user_project_id(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_external_user(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_project_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_admin_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_lead_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_management_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_team_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_incident_permission(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_workspace_id() FROM PUBLIC, anon, authenticated;

-- Functions called by authenticated clients: revoke anon, keep authenticated
REVOKE EXECUTE ON FUNCTION public.ensure_user_workspace() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_user_role(uuid, app_role) FROM PUBLIC, anon;

-- Public RPCs (intentional): keep anon+authenticated executable, but drop PUBLIC default
REVOKE EXECUTE ON FUNCTION public.lookup_incident_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_incident_public(text) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_active_projects_public() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_projects_public() TO anon, authenticated;
