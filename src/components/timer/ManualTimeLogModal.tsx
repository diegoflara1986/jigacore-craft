import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useCreateTimeLog } from "@/hooks/useTimeLogs";
import { useProjects } from "@/hooks/useProjects";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  storyId?: string;
}

export function ManualTimeLogModal({ open, onOpenChange, projectId: fixedProjectId, storyId }: Props) {
  const { profile } = useAuth();
  const createLog = useCreateTimeLog();
  const { data: projects } = useProjects();
  const [projectId, setProjectId] = useState(fixedProjectId || "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");

  const handleSave = async () => {
    if (!profile || !projectId || !hours) return;
    await createLog.mutateAsync({
      user_id: profile.id,
      project_id: fixedProjectId || projectId,
      hours: parseFloat(hours),
      log_date: date,
      description: description || undefined,
      user_story_id: storyId || undefined,
    });
    setHours(""); setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar tiempo manual</DialogTitle>
          <DialogDescription>Ingresa los detalles del tiempo trabajado.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!fixedProjectId && (
            <div className="space-y-1.5">
              <Label className="text-xs">Proyecto</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar proyecto" /></SelectTrigger>
                <SelectContent>{projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9" />
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
