-- Desasignar roles quemados de los perfiles antes de eliminarlos
UPDATE public.profiles
SET role_id = NULL
WHERE role_id IN (
  SELECT id FROM public.custom_roles
  WHERE is_system_role = true
  AND name NOT ILIKE '%super%'
  AND name NOT ILIKE '%super_admin%'
);

-- Eliminar roles del sistema quemados excepto super_admin
DELETE FROM public.custom_roles
WHERE is_system_role = true
AND name NOT ILIKE '%super%'
AND name NOT ILIKE '%super_admin%';