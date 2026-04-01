
-- Remove old generic policies if they still exist
DROP POLICY IF EXISTS "estimations_update" ON estimations;
DROP POLICY IF EXISTS "estimations_delete" ON estimations;
DROP POLICY IF EXISTS "estimations_update_policy" ON estimations;
DROP POLICY IF EXISTS "estimations_delete_policy" ON estimations;

CREATE POLICY "estimations_update" ON estimations
FOR UPDATE TO authenticated
USING (
  project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
  AND has_lead_role(auth.uid())
);

CREATE POLICY "estimations_delete" ON estimations
FOR DELETE TO authenticated
USING (
  project_id IN (SELECT id FROM projects WHERE workspace_id = get_user_workspace_id())
  AND has_management_role(auth.uid())
);
