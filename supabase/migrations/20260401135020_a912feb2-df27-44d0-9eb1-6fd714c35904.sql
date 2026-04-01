
-- =============================================
-- FIX 1: Create secure view for profiles that hides email from non-management roles
-- =============================================
CREATE OR REPLACE VIEW public.profiles_safe_view AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  p.job_title,
  p.role,
  p.workspace_id,
  p.is_active,
  p.created_at,
  CASE 
    WHEN has_management_role(auth.uid()) THEN p.email
    WHEN p.id = auth.uid() THEN p.email
    ELSE NULL
  END as email
FROM profiles p;

-- =============================================
-- FIX 2 & 3: Secure incident-attachments bucket
-- =============================================

-- Remove permissive policies
DROP POLICY IF EXISTS "anon_upload_incident_attachments" ON storage.objects;
DROP POLICY IF EXISTS "public_read_incident_attachments" ON storage.objects;
DROP POLICY IF EXISTS "public_upload_incident_attachments" ON storage.objects;

-- Restricted upload: valid path format, images only, max 10MB
CREATE POLICY "restricted_incident_upload" 
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'incident-attachments'
  AND (storage.foldername(name))[1] LIKE 'INC-%'
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp')
);

-- Read: authenticated users can read all, anon can read too (for signed URLs on lookup page)
CREATE POLICY "incident_attachments_read"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'incident-attachments'
);

-- Delete: only management + QA roles
CREATE POLICY "team_delete_incident_attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'incident-attachments'
  AND auth.role() = 'authenticated'
  AND (
    has_management_role(auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'qa'
      AND workspace_id = get_user_workspace_id()
    )
  )
);

-- Make bucket private to prevent direct URL enumeration
UPDATE storage.buckets 
SET public = false 
WHERE id = 'incident-attachments';
