-- TABLA 1: sig_flow_configs - Configuración de flujo por formulario
-- workspace_id es nullable para permitir catálogo global de formularios
CREATE TABLE public.sig_flow_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) 
    ON DELETE CASCADE,
  form_code TEXT NOT NULL,
  form_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(workspace_id, form_code)
);

ALTER TABLE public.sig_flow_configs 
  ENABLE ROW LEVEL SECURITY;

-- TABLA 2: sig_flow_steps - Pasos del flujo en orden
CREATE TABLE public.sig_flow_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_config_id UUID REFERENCES public.sig_flow_configs(id)
    ON DELETE CASCADE NOT NULL,
  step_type TEXT NOT NULL 
    CHECK (step_type IN (
      'solicitar', 'revisar', 'aprobar', 'ejecutar'
    )),
  step_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.sig_flow_steps 
  ENABLE ROW LEVEL SECURITY;

-- TABLA 3: sig_flow_step_users - Usuarios asignados a cada paso
CREATE TABLE public.sig_flow_step_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id UUID REFERENCES public.sig_flow_steps(id)
    ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id)
    ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(step_id, user_id)
);

ALTER TABLE public.sig_flow_step_users 
  ENABLE ROW LEVEL SECURITY;

-- TABLA 4: sig_requests - Todas las solicitudes de todos los formularios
CREATE TABLE public.sig_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id)
    ON DELETE CASCADE NOT NULL,
  form_code TEXT NOT NULL,
  flow_config_id UUID REFERENCES public.sig_flow_configs(id),
  current_step_id UUID REFERENCES public.sig_flow_steps(id),
  status TEXT NOT NULL DEFAULT 'borrador'
    CHECK (status IN (
      'borrador', 'solicitado', 'en_revision', 
      'aprobado', 'rechazado', 'ejecutado'
    )),
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  current_assignee UUID REFERENCES public.profiles(id),
  submitted_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.sig_requests 
  ENABLE ROW LEVEL SECURITY;

-- TABLA 5: sig_request_history - Historial de cambios de estado
CREATE TABLE public.sig_request_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES public.sig_requests(id)
    ON DELETE CASCADE NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  step_type TEXT,
  action_by UUID REFERENCES public.profiles(id) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.sig_request_history 
  ENABLE ROW LEVEL SECURITY;

-- TABLA 6: sig_request_notes - Notas internas entre participantes del flujo
CREATE TABLE public.sig_request_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES public.sig_requests(id)
    ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.sig_request_notes 
  ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS para sig_flow_configs
-- SELECT: ver config del workspace o catálogo global (workspace_id IS NULL)
CREATE POLICY "sig_flow_configs_select" 
  ON public.sig_flow_configs FOR SELECT TO authenticated
  USING (workspace_id = public.get_user_workspace_id() OR workspace_id IS NULL);

CREATE POLICY "sig_flow_configs_insert" 
  ON public.sig_flow_configs FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id = public.get_user_workspace_id()
    AND (
      public.has_permission(
        auth.uid(), 'config_flujos_sig', 'crear'
      )
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'super_admin'
      )
    )
  );

CREATE POLICY "sig_flow_configs_update" 
  ON public.sig_flow_configs FOR UPDATE TO authenticated
  USING (
    workspace_id = public.get_user_workspace_id()
    AND (
      public.has_permission(
        auth.uid(), 'config_flujos_sig', 'editar'
      )
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'super_admin'
      )
    )
  );

CREATE POLICY "sig_flow_configs_delete" 
  ON public.sig_flow_configs FOR DELETE TO authenticated
  USING (
    workspace_id = public.get_user_workspace_id()
    AND (
      public.has_permission(
        auth.uid(), 'config_flujos_sig', 'eliminar'
      )
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'super_admin'
      )
    )
  );

-- POLÍTICAS RLS para sig_flow_steps
CREATE POLICY "sig_flow_steps_select" 
  ON public.sig_flow_steps FOR SELECT TO authenticated
  USING (
    flow_config_id IN (
      SELECT id FROM public.sig_flow_configs
      WHERE workspace_id = public.get_user_workspace_id() OR workspace_id IS NULL
    )
  );

CREATE POLICY "sig_flow_steps_insert" 
  ON public.sig_flow_steps FOR INSERT TO authenticated
  WITH CHECK (
    flow_config_id IN (
      SELECT id FROM public.sig_flow_configs
      WHERE workspace_id = public.get_user_workspace_id()
    )
    AND (
      public.has_permission(
        auth.uid(), 'config_flujos_sig', 'crear'
      )
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'super_admin'
      )
    )
  );

CREATE POLICY "sig_flow_steps_delete" 
  ON public.sig_flow_steps FOR DELETE TO authenticated
  USING (
    flow_config_id IN (
      SELECT id FROM public.sig_flow_configs
      WHERE workspace_id = public.get_user_workspace_id()
    )
    AND (
      public.has_permission(
        auth.uid(), 'config_flujos_sig', 'eliminar'
      )
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'super_admin'
      )
    )
  );

-- POLÍTICAS RLS para sig_flow_step_users
CREATE POLICY "sig_flow_step_users_select" 
  ON public.sig_flow_step_users FOR SELECT TO authenticated
  USING (
    step_id IN (
      SELECT s.id FROM public.sig_flow_steps s
      JOIN public.sig_flow_configs c 
        ON c.id = s.flow_config_id
      WHERE c.workspace_id = public.get_user_workspace_id() OR c.workspace_id IS NULL
    )
  );

CREATE POLICY "sig_flow_step_users_insert" 
  ON public.sig_flow_step_users FOR INSERT TO authenticated
  WITH CHECK (
    step_id IN (
      SELECT s.id FROM public.sig_flow_steps s
      JOIN public.sig_flow_configs c 
        ON c.id = s.flow_config_id
      WHERE c.workspace_id = public.get_user_workspace_id()
    )
    AND (
      public.has_permission(
        auth.uid(), 'config_flujos_sig', 'editar'
      )
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'super_admin'
      )
    )
  );

CREATE POLICY "sig_flow_step_users_delete" 
  ON public.sig_flow_step_users FOR DELETE TO authenticated
  USING (
    step_id IN (
      SELECT s.id FROM public.sig_flow_steps s
      JOIN public.sig_flow_configs c 
        ON c.id = s.flow_config_id
      WHERE c.workspace_id = public.get_user_workspace_id()
    )
    AND (
      public.has_permission(
        auth.uid(), 'config_flujos_sig', 'editar'
      )
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'super_admin'
      )
    )
  );

-- POLÍTICAS RLS para sig_requests
CREATE POLICY "sig_requests_select" 
  ON public.sig_requests FOR SELECT TO authenticated
  USING (
    workspace_id = public.get_user_workspace_id()
    AND (
      created_by = auth.uid()
      OR current_assignee = auth.uid()
      OR public.has_permission(
        auth.uid(), 'sig', 'ver'
      )
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'super_admin'
      )
    )
  );

CREATE POLICY "sig_requests_insert" 
  ON public.sig_requests FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id = public.get_user_workspace_id()
    AND (
      public.has_permission(
        auth.uid(), 'sig', 'registrar'
      )
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'super_admin'
      )
    )
  );

CREATE POLICY "sig_requests_update" 
  ON public.sig_requests FOR UPDATE TO authenticated
  USING (
    workspace_id = public.get_user_workspace_id()
    AND (
      created_by = auth.uid()
      OR current_assignee = auth.uid()
      OR public.has_permission(
        auth.uid(), 'sig', 'editar'
      )
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'super_admin'
      )
    )
  );

CREATE POLICY "sig_requests_delete" 
  ON public.sig_requests FOR DELETE TO authenticated
  USING (
    workspace_id = public.get_user_workspace_id()
    AND (
      public.has_permission(
        auth.uid(), 'sig', 'eliminar'
      )
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'super_admin'
      )
    )
  );

-- POLÍTICAS RLS para sig_request_history
CREATE POLICY "sig_request_history_select" 
  ON public.sig_request_history FOR SELECT TO authenticated
  USING (
    request_id IN (
      SELECT id FROM public.sig_requests
      WHERE workspace_id = public.get_user_workspace_id()
      AND (
        created_by = auth.uid()
        OR current_assignee = auth.uid()
        OR public.has_permission(
          auth.uid(), 'sig', 'ver'
        )
        OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'super_admin'
        )
      )
    )
  );

CREATE POLICY "sig_request_history_insert" 
  ON public.sig_request_history FOR INSERT TO authenticated
  WITH CHECK (
    request_id IN (
      SELECT id FROM public.sig_requests
      WHERE workspace_id = public.get_user_workspace_id()
    )
  );

-- POLÍTICAS RLS para sig_request_notes
CREATE POLICY "sig_request_notes_select" 
  ON public.sig_request_notes FOR SELECT TO authenticated
  USING (
    request_id IN (
      SELECT id FROM public.sig_requests
      WHERE workspace_id = public.get_user_workspace_id()
      AND (
        created_by = auth.uid()
        OR current_assignee = auth.uid()
        OR public.has_permission(
          auth.uid(), 'sig', 'ver'
        )
        OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'super_admin'
        )
      )
    )
  );

CREATE POLICY "sig_request_notes_insert" 
  ON public.sig_request_notes FOR INSERT TO authenticated
  WITH CHECK (
    request_id IN (
      SELECT id FROM public.sig_requests
      WHERE workspace_id = public.get_user_workspace_id()
    )
  );

CREATE POLICY "sig_request_notes_delete" 
  ON public.sig_request_notes FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- DATOS INICIALES - Catálogo de formularios disponibles (globales, sin workspace)
INSERT INTO public.sig_flow_configs 
  (workspace_id, form_code, form_name, is_active)
VALUES
  (NULL, 'FOR-SGSI-001', 'Incidentes de seguridad', false),
  (NULL, 'FOR-SGSI-002', 'Solicitud de accesos', false),
  (NULL, 'FOR-SGSI-003', 'Alta, modificación y baja de usuarios', false),
  (NULL, 'FOR-SGSI-004', 'Evaluación y aprobación de cambios', false),
  (NULL, 'FOR-SGSI-006', 'Asignación y devolución de activos', false),
  (NULL, 'REG-SGSI-001', 'Registro de capacitaciones', false),
  (NULL, 'REG-SGSI-002', 'Registro de acciones correctivas', false);