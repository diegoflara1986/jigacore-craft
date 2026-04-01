import { useState } from "react";
import { useEpics, useCreateEpic, useUpdateEpic, useDeleteEpic, EpicWithProgress } from "@/hooks/useEpics";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionDeniedDialog } from "@/components/PermissionDeniedDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Plus, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const EPIC_COLORS = [
  "#E74C3C", "#E67E22", "#F1C40F", "#2ECC71", "#1ABC9C",
  "#3498DB", "#9B59B6", "#34495E", "#E91E63", "#00BCD4",
];

function epicStatus(e: EpicWithProgress) {
  if (e.totalStories === 0) return "Por Iniciar";
  if (e.completedStories === e.totalStories) return "Completada";
  return "En Progreso";
}

function statusVariant(s: string): "default" | "secondary" | "outline" {
  if (s === "Completada") return "default";
  if (s === "En Progreso") return "secondary";
  return "outline";
}

interface EpicFormData {
  title: string;
  description: string;
  color: string;
  start_date: Date | undefined;
  end_date: Date | undefined;
}

export function ProjectEpicsTab({ projectId }: { projectId: string }) {
  const { data: epics, isLoading } = useEpics(projectId);
  const createEpic = useCreateEpic();
  const updateEpic = useUpdateEpic();
  const deleteEpic = useDeleteEpic();
  const { guardAction, denied, closeDenied } = usePermissions(projectId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEpic, setEditingEpic] = useState<EpicWithProgress | null>(null);
  const [form, setForm] = useState<EpicFormData>({
    title: "", description: "", color: EPIC_COLORS[0], start_date: undefined, end_date: undefined,
  });

  const openCreate = () => {
    setEditingEpic(null);
    setForm({ title: "", description: "", color: EPIC_COLORS[0], start_date: undefined, end_date: undefined });
    setModalOpen(true);
  };

  const openEdit = (e: EpicWithProgress) => {
    setEditingEpic(e);
    setForm({
      title: e.title,
      description: e.description || "",
      color: e.color || EPIC_COLORS[0],
      start_date: e.start_date ? new Date(e.start_date) : undefined,
      end_date: e.end_date ? new Date(e.end_date) : undefined,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const payload = {
      title: form.title,
      description: form.description || null,
      color: form.color,
      start_date: form.start_date ? format(form.start_date, "yyyy-MM-dd") : null,
      end_date: form.end_date ? format(form.end_date, "yyyy-MM-dd") : null,
    };
    if (editingEpic) {
      await updateEpic.mutateAsync({ id: editingEpic.id, ...payload });
    } else {
      await createEpic.mutateAsync({ project_id: projectId, ...payload });
    }
    setModalOpen(false);
  };

  if (isLoading) return <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{epics?.length ?? 0} épicas</h3>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Nueva Épica</Button>
      </div>

      {!epics?.length ? (
        <Card className="border-border"><CardContent className="py-10 text-center text-muted-foreground text-sm">No hay épicas. Crea la primera.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {epics.map((e) => {
            const status = epicStatus(e);
            return (
              <Card key={e.id} className="border-border overflow-hidden">
                <div className="flex">
                  <div className="w-1.5 shrink-0" style={{ backgroundColor: e.color || "#3498DB" }} />
                  <CardContent className="flex-1 py-4 px-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">{e.title}</h4>
                          <Badge variant={statusVariant(status)}>{status}</Badge>
                        </div>
                        {e.description && <p className="text-sm text-muted-foreground line-clamp-1">{e.description}</p>}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {(e.start_date || e.end_date) && (
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {e.start_date ? new Date(e.start_date).toLocaleDateString("es") : "?"} — {e.end_date ? new Date(e.end_date).toLocaleDateString("es") : "?"}
                            </span>
                          )}
                          <span>HU: {e.completedStories}/{e.totalStories}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={e.progress} className="h-1.5 flex-1" />
                          <span className="text-xs font-medium text-muted-foreground">{e.progress}%</span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(e)}><Pencil className="h-3.5 w-3.5 mr-2" />Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteEpic.mutate({ id: e.id, projectId })}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" />Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Epic Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingEpic ? "Editar Épica" : "Nueva Épica"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Nombre de la épica" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {EPIC_COLORS.map((c) => (
                  <button key={c} onClick={() => setForm((p) => ({ ...p, color: c }))}
                    className={cn("h-7 w-7 rounded-full border-2 transition-all", form.color === c ? "border-foreground scale-110" : "border-transparent")}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fecha inicio</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.start_date && "text-muted-foreground")}>
                      <CalendarIcon className="h-4 w-4 mr-2" />{form.start_date ? format(form.start_date, "dd/MM/yyyy") : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.start_date} onSelect={(d) => setForm((p) => ({ ...p, start_date: d }))} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Fecha fin</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.end_date && "text-muted-foreground")}>
                      <CalendarIcon className="h-4 w-4 mr-2" />{form.end_date ? format(form.end_date, "dd/MM/yyyy") : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.end_date} onSelect={(d) => setForm((p) => ({ ...p, end_date: d }))} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.title.trim() || createEpic.isPending || updateEpic.isPending}>
              {editingEpic ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
