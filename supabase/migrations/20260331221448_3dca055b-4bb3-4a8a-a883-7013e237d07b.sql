
CREATE OR REPLACE FUNCTION public.ensure_user_workspace()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _workspace_id uuid;
  _user_email text;
BEGIN
  -- Check if user already has a workspace
  SELECT workspace_id INTO _workspace_id FROM profiles WHERE id = auth.uid();
  
  IF _workspace_id IS NOT NULL THEN
    RETURN _workspace_id;
  END IF;
  
  -- Get user email for workspace name
  SELECT email INTO _user_email FROM profiles WHERE id = auth.uid();
  
  -- Create workspace
  INSERT INTO workspaces (name) VALUES (COALESCE(_user_email, 'Mi Workspace'))
  RETURNING id INTO _workspace_id;
  
  -- Link profile to workspace
  UPDATE profiles SET workspace_id = _workspace_id WHERE id = auth.uid();
  
  RETURN _workspace_id;
END;
$$;
