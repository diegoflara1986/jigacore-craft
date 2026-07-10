
-- Restore EXECUTE on helper functions used inside RLS policies.
-- Even SECURITY DEFINER functions require EXECUTE for the calling role.
GRANT EXECUTE ON FUNCTION public.is_external_user(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_workspace_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_external_user_project_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_admin_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_lead_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_management_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_team_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_incident_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
