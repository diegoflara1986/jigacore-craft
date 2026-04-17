UPDATE public.sig_requests sr
SET 
  current_step_id = (
    SELECT sfs.id 
    FROM public.sig_flow_steps sfs
    JOIN public.sig_flow_configs sfc 
      ON sfc.id = sfs.flow_config_id
    WHERE sfc.workspace_id = sr.workspace_id
    AND sfc.form_code = sr.form_code
    AND sfs.step_type = 'aprobar'
    ORDER BY sfs.step_order ASC
    LIMIT 1
  ),
  current_assignee = (
    SELECT sfu.user_id
    FROM public.sig_flow_step_users sfu
    JOIN public.sig_flow_steps sfs 
      ON sfs.id = sfu.step_id
    JOIN public.sig_flow_configs sfc 
      ON sfc.id = sfs.flow_config_id
    WHERE sfc.workspace_id = sr.workspace_id
    AND sfc.form_code = sr.form_code
    AND sfs.step_type = 'aprobar'
    ORDER BY sfs.step_order ASC
    LIMIT 1
  )
WHERE sr.status = 'en_revision'
AND sr.current_step_id IN (
  SELECT id FROM public.sig_flow_steps 
  WHERE step_type = 'revisar'
);