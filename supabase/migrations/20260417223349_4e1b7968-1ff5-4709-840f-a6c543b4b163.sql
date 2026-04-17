-- 1.1 Nuevas tablas
CREATE TABLE public.incident_generated_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE NOT NULL,
  user_story_id UUID REFERENCES public.user_stories(id) ON DELETE SET NULL,
  classification TEXT NOT NULL CHECK (classification IN ('bug', 'requerimiento')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.incident_generated_stories ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.incident_linked_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE NOT NULL,
  user_story_id UUID REFERENCES public.user_stories(id) ON DELETE CASCADE NOT NULL,
  linked_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(incident_id, user_story_id)
);

ALTER TABLE public.incident_linked_stories ENABLE ROW LEVEL SECURITY;

-- 1.2 Actualizar estados en incidents - primero actualizar datos, luego constraint
UPDATE public.incidents 
SET status = CASE
  WHEN status = 'pendiente' THEN 'sin_evaluar'
  WHEN status = 'revision' THEN 'en_revision'
  WHEN status = 'en_proceso' THEN 'en_ejecucion'
  WHEN status = 'listo_para_cerrar' THEN 'listo_para_cerrar'
  WHEN status = 'cerrado' THEN 'cerrado'
  WHEN status = 'suspendido' THEN 'suspendido'
  WHEN status = 'sin_evaluar' THEN 'sin_evaluar'
  WHEN status = 'en_revision' THEN 'en_revision'
  WHEN status = 'en_ejecucion' THEN 'en_ejecucion'
  WHEN status = 'en_qa' THEN 'en_qa'
  ELSE 'sin_evaluar'
END;

ALTER TABLE public.incidents 
  DROP CONSTRAINT IF EXISTS incidents_status_check;

ALTER TABLE public.incidents 
  ADD CONSTRAINT incidents_status_check 
  CHECK (status IN (
    'sin_evaluar', 'en_revision', 'en_ejecucion',
    'en_qa', 'suspendido', 'listo_para_cerrar', 
    'cerrado'
  ));

-- 1.3 RLS para nuevas tablas
CREATE POLICY "inc_gen_stories_select"
  ON public.incident_generated_stories 
  FOR SELECT TO authenticated
  USING (
    incident_id IN (
      SELECT id FROM public.incidents
      WHERE project_id IN (
        SELECT id FROM public.projects
        WHERE workspace_id = public.get_user_workspace_id()
      )
    )
  );

CREATE POLICY "inc_gen_stories_insert"
  ON public.incident_generated_stories 
  FOR INSERT TO authenticated
  WITH CHECK (
    incident_id IN (
      SELECT id FROM public.incidents
      WHERE project_id IN (
        SELECT id FROM public.projects
        WHERE workspace_id = public.get_user_workspace_id()
      )
    )
  );

CREATE POLICY "inc_gen_stories_delete"
  ON public.incident_generated_stories 
  FOR DELETE TO authenticated
  USING (
    incident_id IN (
      SELECT id FROM public.incidents
      WHERE project_id IN (
        SELECT id FROM public.projects
        WHERE workspace_id = public.get_user_workspace_id()
      )
    )
  );

CREATE POLICY "inc_linked_stories_select"
  ON public.incident_linked_stories 
  FOR SELECT TO authenticated
  USING (
    incident_id IN (
      SELECT id FROM public.incidents
      WHERE project_id IN (
        SELECT id FROM public.projects
        WHERE workspace_id = public.get_user_workspace_id()
      )
    )
  );

CREATE POLICY "inc_linked_stories_insert"
  ON public.incident_linked_stories 
  FOR INSERT TO authenticated
  WITH CHECK (
    incident_id IN (
      SELECT id FROM public.incidents
      WHERE project_id IN (
        SELECT id FROM public.projects
        WHERE workspace_id = public.get_user_workspace_id()
      )
    )
  );

CREATE POLICY "inc_linked_stories_delete"
  ON public.incident_linked_stories 
  FOR DELETE TO authenticated
  USING (
    incident_id IN (
      SELECT id FROM public.incidents
      WHERE project_id IN (
        SELECT id FROM public.projects
        WHERE workspace_id = public.get_user_workspace_id()
      )
    )
  );