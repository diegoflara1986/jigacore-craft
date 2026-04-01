
-- Fix: recreate view without SECURITY DEFINER (default is INVOKER which respects caller's RLS)
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
FROM profiles p;
