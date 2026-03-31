
-- Drop existing permissive policies on comments
DROP POLICY IF EXISTS "Users can view comments" ON comments;
DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "comments_select_policy" ON comments;
DROP POLICY IF EXISTS "comments_insert_policy" ON comments;

-- Secure SELECT: only see comments linked to your workspace
CREATE POLICY "Users can view comments" ON comments
FOR SELECT TO authenticated
USING (
  user_story_id IN (
    SELECT us.id FROM user_stories us
    JOIN projects p ON us.project_id = p.id
    WHERE p.workspace_id = get_user_workspace_id()
  )
  OR
  task_id IN (
    SELECT t.id FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE p.workspace_id = get_user_workspace_id()
  )
  OR
  incident_id IN (
    SELECT i.id FROM incidents i
    JOIN projects p ON i.project_id = p.id
    WHERE p.workspace_id = get_user_workspace_id()
  )
);

-- Secure INSERT: only create comments in your workspace
CREATE POLICY "Users can create comments" ON comments
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    user_story_id IN (
      SELECT us.id FROM user_stories us
      JOIN projects p ON us.project_id = p.id
      WHERE p.workspace_id = get_user_workspace_id()
    )
    OR
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE p.workspace_id = get_user_workspace_id()
    )
    OR
    incident_id IN (
      SELECT i.id FROM incidents i
      JOIN projects p ON i.project_id = p.id
      WHERE p.workspace_id = get_user_workspace_id()
    )
  )
);
