
-- Drop existing permissive policies on estimation_votes
DROP POLICY IF EXISTS "Users can view votes" ON estimation_votes;
DROP POLICY IF EXISTS "Users can manage own votes" ON estimation_votes;
DROP POLICY IF EXISTS "estimation_votes_select_policy" ON estimation_votes;
DROP POLICY IF EXISTS "estimation_votes_insert_policy" ON estimation_votes;
DROP POLICY IF EXISTS "estimation_votes_update_policy" ON estimation_votes;

-- Secure SELECT: only see votes from your workspace
CREATE POLICY "Users can view votes" ON estimation_votes
FOR SELECT TO authenticated
USING (
  estimation_id IN (
    SELECT e.id FROM estimations e
    JOIN projects p ON e.project_id = p.id
    WHERE p.workspace_id = get_user_workspace_id()
  )
);

-- Secure INSERT: only create votes in your workspace
CREATE POLICY "Users can create votes" ON estimation_votes
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND estimation_id IN (
    SELECT e.id FROM estimations e
    JOIN projects p ON e.project_id = p.id
    WHERE p.workspace_id = get_user_workspace_id()
  )
);

-- Secure UPDATE: only update own votes in your workspace
CREATE POLICY "Users can update own votes" ON estimation_votes
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND estimation_id IN (
    SELECT e.id FROM estimations e
    JOIN projects p ON e.project_id = p.id
    WHERE p.workspace_id = get_user_workspace_id()
  )
);
