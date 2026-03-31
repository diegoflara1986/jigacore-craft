
-- Fix workspace creation policy
DROP POLICY "Authenticated users can create workspaces" ON public.workspaces;
CREATE POLICY "Authenticated users can create workspaces" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND workspace_id IS NOT NULL)
  );

-- Fix notification creation policy
DROP POLICY "System can create notifications" ON public.notifications;
CREATE POLICY "Users can create notifications in workspace" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id IN (
    SELECT p.id FROM public.profiles p WHERE p.workspace_id = public.get_user_workspace_id()
  ));
