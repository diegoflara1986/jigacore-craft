-- Remove the unused mover_tarjetas permission from the role_permissions table
DELETE FROM public.role_permissions
WHERE module = 'tablero' AND action = 'mover_tarjetas';