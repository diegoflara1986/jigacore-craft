UPDATE public.sig_requests
SET current_step_id = (
  SELECT sfs.id 
  FROM public.sig_flow_steps sfs
  JOIN public.sig_flow_configs sfc 
    ON sfc.id = sfs.flow_config_id
  WHERE sfc.form_code = 'FOR-SGSI-001'
  AND sfs.step_type != 'solicitar'
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
  WHERE sfc.form_code = 'FOR-SGSI-001'
  AND sfs.step_type != 'solicitar'
  ORDER BY sfs.step_order ASC
  LIMIT 1
)
WHERE form_code = 'FOR-SGSI-001'
AND status = 'solicitado'
AND current_step_id IS NULL;