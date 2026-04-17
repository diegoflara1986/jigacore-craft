-- Función auxiliar para updated_at (si no existe)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Tabla del formulario FOR-SGSI-001 Incidentes de Seguridad
CREATE TABLE public.sig_form_001 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES public.sig_requests(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  codigo TEXT,
  fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reportado_por UUID REFERENCES public.profiles(id),
  area_proceso TEXT,
  medio_reporte TEXT CHECK (medio_reporte IN ('correo','telefono','sistema','presencial','otro')),
  fecha_deteccion TIMESTAMP WITH TIME ZONE,
  detectado_por UUID REFERENCES public.profiles(id),
  forma_deteccion TEXT CHECK (forma_deteccion IN ('monitoreo','usuario_afectado','herramienta_automatica','auditoria','tercero','otro')),
  sistema_deteccion TEXT,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  que_ocurrio TEXT,
  como_ocurrio TEXT,
  cuando_ocurrio TIMESTAMP WITH TIME ZONE,
  tipo_incidente TEXT CHECK (tipo_incidente IN (
    'acceso_no_autorizado','fuga_informacion','perdida_informacion','alteracion_informacion',
    'phishing','malware','compromiso_credenciales','error_configuracion',
    'indisponibilidad_servicio','incidente_tercero','incidente_produccion','otro'
  )),
  origen_estimado TEXT CHECK (origen_estimado IN ('interno','externo','tercero','error_humano','falla_tecnica','desconocido')),
  prioridad TEXT CHECK (prioridad IN ('baja','media','alta','critica')),
  severidad TEXT CHECK (severidad IN ('baja','media','alta','critica')),
  sistema_afectado TEXT,
  ambiente_afectado TEXT CHECK (ambiente_afectado IN ('produccion','desarrollo','pruebas','otro')),
  informacion_afectada TEXT,
  cliente_afectado TEXT,
  impacto_confidencialidad TEXT CHECK (impacto_confidencialidad IN ('bajo','medio','alto','critico','no_aplica')),
  impacto_integridad TEXT CHECK (impacto_integridad IN ('bajo','medio','alto','critico','no_aplica')),
  impacto_disponibilidad TEXT CHECK (impacto_disponibilidad IN ('bajo','medio','alto','critico','no_aplica')),
  impacto_operativo TEXT CHECK (impacto_operativo IN ('bajo','medio','alto','critico','no_aplica')),
  involucra_datos_personales BOOLEAN DEFAULT false,
  involucra_produccion BOOLEAN DEFAULT false,
  requiere_reporte_externo BOOLEAN DEFAULT false,
  accion_contencion TEXT,
  responsable_contencion UUID REFERENCES public.profiles(id),
  contencion_exitosa BOOLEAN,
  escalo_sgsi BOOLEAN DEFAULT false,
  escalo_gerencia BOOLEAN DEFAULT false,
  notifico_cliente BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.sig_form_001 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sig_form_001_select" ON public.sig_form_001 FOR SELECT TO authenticated
USING (
  workspace_id = public.get_user_workspace_id()
  AND (
    reportado_por = auth.uid()
    OR public.has_permission(auth.uid(), 'sig', 'ver')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
);

CREATE POLICY "sig_form_001_insert" ON public.sig_form_001 FOR INSERT TO authenticated
WITH CHECK (
  workspace_id = public.get_user_workspace_id()
  AND (
    public.has_permission(auth.uid(), 'sig', 'registrar')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
);

CREATE POLICY "sig_form_001_update" ON public.sig_form_001 FOR UPDATE TO authenticated
USING (
  workspace_id = public.get_user_workspace_id()
  AND (
    reportado_por = auth.uid()
    OR public.has_permission(auth.uid(), 'sig', 'editar')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
);

CREATE POLICY "sig_form_001_delete" ON public.sig_form_001 FOR DELETE TO authenticated
USING (
  workspace_id = public.get_user_workspace_id()
  AND (
    public.has_permission(auth.uid(), 'sig', 'eliminar')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
);

CREATE OR REPLACE FUNCTION public.generate_sig_001_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  year_str TEXT;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO next_num
  FROM public.sig_form_001
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  NEW.codigo := 'INC-SEG-' || year_str || '-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_sig_001_code
  BEFORE INSERT ON public.sig_form_001
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_sig_001_code();

CREATE TRIGGER trigger_sig_001_updated_at
  BEFORE UPDATE ON public.sig_form_001
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();