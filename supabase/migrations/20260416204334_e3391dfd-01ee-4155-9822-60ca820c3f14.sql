-- 1.1 Replace has_permission function
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id uuid,
  _module text,
  _action text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    JOIN custom_roles cr ON cr.id = p.role_id
    JOIN role_permissions rp ON rp.role_id = cr.id
    WHERE p.id = _user_id
    AND p.is_active = true
    AND rp.module = _module
    AND rp.action = _action
    AND rp.is_allowed = true
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = _user_id
    AND role = 'super_admin'
  );
$$;

-- 1.2 is_external_user
CREATE OR REPLACE FUNCTION public.is_external_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = _user_id
    AND role = 'external_user'
  );
$$;

-- 1.4 Add columns to profiles (need before 1.3 since it references project_id)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id),
ADD COLUMN IF NOT EXISTS user_type TEXT NOT NULL DEFAULT 'internal'
  CHECK (user_type IN ('internal', 'external'));

-- 1.3 get_external_user_project_id
CREATE OR REPLACE FUNCTION public.get_external_user_project_id(
  _user_id uuid
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT project_id FROM profiles
  WHERE id = _user_id
  AND role = 'external_user'
  LIMIT 1;
$$;