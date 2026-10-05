-- Los proyectos Supabase nuevos ya no otorgan privilegios por defecto sobre las
-- tablas de `public`. Sin estos GRANT, PostgREST responde "permission denied"
-- aunque existan políticas RLS. El acceso real lo siguen controlando las políticas RLS.

-- Usuarios autenticados: operaciones DML, filtradas por RLS.
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Edge functions (service_role): acceso completo, omite RLS.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- anon no recibe acceso directo a tablas: el portal público usa solo
-- las RPC lookup_incident_public / get_active_projects_public y la edge function report-incident.

-- Tablas y secuencias futuras creadas por migraciones.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
