
-- =============================================
-- FIX 1: Profiles - restrict email visibility
-- Drop the overly permissive SELECT policy
-- =============================================
DROP POLICY IF EXISTS "Users can view profiles in workspace" ON profiles;
DROP POLICY IF EXISTS "profiles_select_by_role" ON profiles;

-- New policy: all workspace members can see basic profile info
-- but email is only readable via the profiles_safe_view for non-management
CREATE POLICY "profiles_select_workspace" ON profiles
FOR SELECT TO authenticated
USING (
  (workspace_id = get_user_workspace_id() AND has_management_role(auth.uid()))
  OR id = auth.uid()
);

-- Allow team members to see basic profile data (no email) via the safe view
-- The safe view already masks email for non-management roles

-- =============================================
-- FIX 2: Remove anon INSERT on incidents
-- Replace with server-side edge function
-- =============================================
DROP POLICY IF EXISTS "incidents_insert_anon_restricted" ON incidents;

-- =============================================
-- FIX 3: Restrict storage upload to authenticated only
-- =============================================
DROP POLICY IF EXISTS "restricted_incident_upload" ON storage.objects;

CREATE POLICY "restricted_incident_upload_auth"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'incident-attachments'
  AND (storage.foldername(name))[1] LIKE 'INC-%'
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp')
);

-- =============================================
-- FIX 4: Restrict storage read to authenticated only
-- =============================================
DROP POLICY IF EXISTS "incident_attachments_read" ON storage.objects;

CREATE POLICY "incident_attachments_read_auth"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'incident-attachments'
);

-- =============================================
-- FIX 5: Update profiles_safe_view to allow team role access
-- This view masks email for non-management users
-- =============================================
DROP VIEW IF EXISTS public.profiles_safe_view;

CREATE VIEW public.profiles_safe_view
WITH (security_invoker = true)
AS
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
FROM profiles p
WHERE p.workspace_id = get_user_workspace_id() OR p.id = auth.uid();
