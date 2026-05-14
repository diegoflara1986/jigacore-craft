import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useCreateTimeLog, useUpdateTimeLog } from "@/hooks/useTimeLogs";
import { useProjects } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  fixedStoryId?: string;
  editLog?: { id: string; hours: number; log_date: string; description?: string | null; user_story_id?: string | null };
  onUpdated?: () => void;
}

export function ManualTimeLogModal({ open, onOpenChange, projectId: fixedProjectId, fixedStoryId, editLog, onUpdated }: Props) {
  const { profile } = useAuth();
  const createLog = useCreateTimeLog();
  const updateLog = useUpdateTimeLog();
  const isEditing = !!editLog;
  const { data: projects } = useProjects();
  const [projectId, setProjectId] = useState(fixedProjectId || "");
  const [storyId, setStoryId] = useState(fixedStoryId || "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (editLog) {
      setHours(String(editLog.hours));
      setDate(editLog.log_date);
      setDescription(editLog.description || "");
      setStoryId(editLog.user_story_id || "none");
    }
  }, [editLog]);

  const { data: stories } = useQuery({
    queryKey: ["user-stories", projectId],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data: membership } = await supabase
        .from("project_members")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", profile.id)
        .maybeSingle();
      if (!membership) return [];
      const { data, error } = await supabase
        .from("user_stories")
        .select("id, title, story_number, status")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("story_number", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId && !fixedStoryId,
  });

  const handleProjectChange = (value: string) => {
    setProjectId(value);
    setStoryId("");
  };

  const handleSave = async () => {
    if (!profile || !projectId || !hours) return;
    const selectedStoryId = (storyId && storyId !== "none") ? storyId : fixedStoryId;
    if (isEditing && editLog) {
      await updateLog.mutateAsync({
        id: editLog.id,
        hours: parseFloat(hours),
        log_date: date,
        description: description || null,
        user_story_id: selectedStoryId || null,
      });
      onUpdated?.();
      onOpenChange(false);
      return;
    }
    await createLog.mutateAsync({
      user_id: profile.id,
      project_id: fixedProjectId || projectId,
      hours: parseFloat(hours),
      log_date: date,
      description: description || undefined,
      user_story_id: selectedStoryId || undefined,
    });
    setHours(""); setDescription(""); setStoryId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar registro de tiempo" : "Registrar tiempo manual"}</DialogTitle>
          <DialogDescription>Ingresa los detalles del tiempo trabajado.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!fixedProjectId && (
            <div className="space-y-1.5">
              <Label className="text-xs">Proyecto</Label>
              <Select value={projectId} onValueChange={handleProjectChange}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar proyecto" /></SelectTrigger>
                <SelectContent>{projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {!fixedStoryId && (
            <div className="space-y-1.5">
              <Label className="text-xs">Historia de Usuario</Label>
              <Select value={storyId} onValueChange={setStoryId} disabled={!projectId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={projectId ? "Seleccionar HU" : "Selecciona un proyecto primero"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin HU (tiempo general)</SelectItem>
                  {stories?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      HU-{s.story_number}: {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} max={new Date().toISOString().split("T")[0]} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Horas</Label>
              <Input type="number" step="0.25" min="0.01" placeholder="1.5" value={hours} onChange={e => setHours(e.target.value)} className="h-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descripción</Label>
            <Textarea placeholder="¿Qué hiciste?" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!hours || !(fixedProjectId || projectId) || createLog.isPending}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
