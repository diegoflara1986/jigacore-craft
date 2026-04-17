DROP POLICY IF EXISTS "sig_form_001_select" ON public.sig_form_001;
DROP POLICY IF EXISTS "sig_form_001_insert" ON public.sig_form_001;
DROP POLICY IF EXISTS "sig_form_001_update" ON public.sig_form_001;
DROP POLICY IF EXISTS "sig_form_001_delete" ON public.sig_form_001;

CREATE POLICY "sig_form_001_select"
  ON public.sig_form_001 FOR SELECT TO authenticated
  USING (
    workspace_id = public.get_user_workspace_id()
    AND (
      reportado_por = auth.uid()
      OR public.has_permission(auth.uid(), 'sig_form_001', 'ver')
      OR EXISTS (
        SELECT 1 FROM public.sig_flow_step_users sfu
        JOIN public.sig_flow_steps sfs ON sfs.id = sfu.step_id
        JOIN public.sig_flow_configs sfc ON sfc.id = sfs.flow_config_id
        WHERE sfu.user_id = auth.uid()
        AND sfc.form_code = 'FOR-SGSI-001'
        AND sfc.workspace_id = public.get_user_workspace_id()
      )
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    )
  );

CREATE POLICY "sig_form_001_insert"
  ON public.sig_form_001 FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id = public.get_user_workspace_id()
    AND (
      public.has_permission(auth.uid(), 'sig_form_001', 'registrar')
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    )
  );

CREATE POLICY "sig_form_001_update"
  ON public.sig_form_001 FOR UPDATE TO authenticated
  USING (
    workspace_id = public.get_user_workspace_id()
    AND (
      reportado_por = auth.uid()
      OR public.has_permission(auth.uid(), 'sig_form_001', 'editar')
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    )
  );

CREATE POLICY "sig_form_001_delete"
  ON public.sig_form_001 FOR DELETE TO authenticated
  USING (
    workspace_id = public.get_user_workspace_id()
    AND (
      public.has_permission(auth.uid(), 'sig_form_001', 'eliminar')
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    )
  );