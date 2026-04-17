DROP POLICY IF EXISTS "sig_form_001_select" ON public.sig_form_001;

CREATE POLICY "sig_form_001_select"
  ON public.sig_form_001 FOR SELECT TO authenticated
  USING (
    workspace_id = public.get_user_workspace_id()
    AND (
      reportado_por = auth.uid()
      OR public.has_permission(auth.uid(), 'sig_form_001', 'ver')
      OR (
        EXISTS (
          SELECT 1 FROM public.sig_flow_step_users sfu
          JOIN public.sig_flow_steps sfs ON sfs.id = sfu.step_id
          JOIN public.sig_flow_configs sfc ON sfc.id = sfs.flow_config_id
          WHERE sfu.user_id = auth.uid()
          AND sfc.form_code = 'FOR-SGSI-001'
          AND sfc.workspace_id = public.get_user_workspace_id()
          AND sfs.step_type != 'solicitar'
        )
        AND EXISTS (
          SELECT 1 FROM public.sig_requests sr
          WHERE sr.id = sig_form_001.request_id
          AND sr.current_assignee = auth.uid()
          AND sr.status NOT IN ('aprobado', 'rechazado')
        )
      )
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "sig_requests_select" ON public.sig_requests;

CREATE POLICY "sig_requests_select"
  ON public.sig_requests FOR SELECT TO authenticated
  USING (
    workspace_id = public.get_user_workspace_id()
    AND (
      created_by = auth.uid()
      OR current_assignee = auth.uid()
      OR public.has_permission(auth.uid(), 'sig_form_001', 'ver')
      OR public.has_permission(auth.uid(), 'sig_form_002', 'ver')
      OR public.has_permission(auth.uid(), 'sig_form_003', 'ver')
      OR public.has_permission(auth.uid(), 'sig_form_004', 'ver')
      OR public.has_permission(auth.uid(), 'sig_form_006', 'ver')
      OR public.has_permission(auth.uid(), 'sig_reg_001', 'ver')
      OR public.has_permission(auth.uid(), 'sig_reg_002', 'ver')
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    )
  );