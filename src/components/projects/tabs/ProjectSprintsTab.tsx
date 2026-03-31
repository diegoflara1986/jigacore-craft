import { useState } from "react";
import { useSprintsWithStats, useCreateSprint, useUpdateSprint, SprintWithStats } from "@/hooks/useSprints";
import { useUserStories, useUpdateUserStory } from "@/hooks/useUserStories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Play, CheckCircle2, LayoutDashboard, Pencil } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  planning: { label: "Planificado", variant: "outline" },
  active: { label: "Activo", variant: "default" },
  completed: { label: "Completado", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

interface Props {
  projectId: string;
  onNavigateToBoard?: () => void;
}

export function ProjectSprintsTab({ projectId, onNavigateToBoard }: Props) {
  const { data: sprints, isLoading } = useSprintsWithStats(projectId);
  const { data: backlogStories } = useUserStories(projectId, { status: undefined });
  const createSprint = useCreateSprint();
  const updateSprint = useUpdateSprint();
  const updateStory = useUpdateUserStory();

  const [createOpen, setCreateOpen] = useState(false);
  const [editSprint, setEditSprint] = useState<SprintWithStats | null>(null);
  const [startConfirm, setStartConfirm] = useState<SprintWithStats | null>(null);
  const [completeReview, setCompleteReview] = useState<SprintWithStats | null>(null);
  const [newSprint, setNewSprint] = useState({ name: "", goal: "", start_date: undefined as Date | undefined, end_date: undefined as Date | undefined, capacity: "" });
  const [selectedBacklogIds, setSelectedBacklogIds] = useState<string[]>([]);

  const activeSprint = sprints?.find((s) => s.status === "active");
  const otherSprints = sprints?.filter((s) => s.status !== "active") ?? [];
  const unassignedStories = backlogStories?.filter((s) => !s.sprint_id) ?? [];

  const openCreate = () => {
    const nextNum = (sprints?.length ?? 0) + 1;
    setNewSprint({ name: `Sprint ${nextNum}`, goal: "", start_date: undefined, end_date: undefined, capacity: "" });
    setSelectedBacklogIds([]);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!newSprint.name.trim()) return;
    const created = await createSprint.mutateAsync({
      project_id: projectId,
      name: newSprint.name,
      goal: newSprint.goal || null,
      start_date: newSprint.start_date ? format(newSprint.start_date, "yyyy-MM-dd") : null,
      end_date: newSprint.end_date ? format(newSprint.end_date, "yyyy-MM-dd") : null,
      capacity: newSprint.capacity ? parseInt(newSprint.capacity) : 0,
    });
    for (const sid of selectedBacklogIds) {
      await updateStory.mutateAsync({ id: sid, sprint_id: created.id });
    }
    setCreateOpen(false);
  };

  const handleStartSprint = async () => {
    if (!startConfirm) return;
    await updateSprint.mutateAsync({ id: startConfirm.id, status: "active" });
    setStartConfirm(null);
  };

  const handleCompleteSprint = async (action: "next" | "backlog") => {
    if (!completeReview) return;
    const incompleteStories = backlogStories?.filter((s) => s.sprint_id === completeReview.id && s.status !== "done") ?? [];
    const nextSprint = sprints?.find((s) => s.status === "planning");

    for (const story of incompleteStories) {
      if (action === "next" && nextSprint) {
        await updateStory.mutateAsync({ id: story.id, sprint_id: nextSprint.id });
      } else {
        await updateStory.mutateAsync({ id: story.id, sprint_id: null });
      }
    }
    await updateSprint.mutateAsync({ id: completeReview.id, status: "completed" });
    setCompleteReview(null);
  };

  const toggleBacklogItem = (id: string) => {
    setSelectedBacklogIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const selectedPoints = unassignedStories.filter((s) => selectedBacklogIds.includes(s.id)).reduce((a, b) => a + (b.story_points ?? 0), 0);

  const renderSprintCard = (sprint: SprintWithStats, isActive: boolean) => {
    const progress = sprint.totalStories > 0 ? Math.round((sprint.completedStories / sprint.totalStories) * 100) : 0;
    const st = STATUS_LABELS[sprint.status] ?? { label: sprint.status, variant: "outline" as const };
    const daysLeft = sprint.end_date ? Math.max(0, Math.ceil((new Date(sprint.end_date).getTime() - Date.now()) / 86400000)) : null;

    return (
      <Card key={sprint.id} className={cn("transition-all", isActive && "border-primary/50 shadow-md")}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{sprint.name}</CardTitle>
              <Badge variant={st.variant}>{st.label}</Badge>
              {isActive && daysLeft !== null && (
                <span className="text-xs text-muted-foreground">{daysLeft} días restantes</span>
              )}
            </div>
            <div className="flex gap-1.5">
              {sprint.status === "planning" && (
                <Button size="sm" variant="outline" onClick={() => setStartConfirm(sprint)}>
                  <Play className="h-3.5 w-3.5 mr-1" />Iniciar
                </Button>
              )}
              {sprint.status === "active" && (
                <>
                  {onNavigateToBoard && (
                    <Button size="sm" variant="outline" onClick={onNavigateToBoard}>
                      <LayoutDashboard className="h-3.5 w-3.5 mr-1" />Ver Tablero
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setCompleteReview(sprint)}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Completar
                  </Button>
                </>
              )}
            </div>
          </div>
          {sprint.goal && <p className="text-sm text-muted-foreground mt-1">{sprint.goal}</p>}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {sprint.start_date && sprint.end_date
                ? `${format(new Date(sprint.start_date), "dd MMM", { locale: es })} → ${format(new Date(sprint.end_date), "dd MMM yyyy", { locale: es })}`
                : "Sin fechas"}
            </span>
            <span>{sprint.completedStories}/{sprint.totalStories} historias</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              {sprint.completedPoints}/{sprint.totalPoints} SP completados
            </span>
            {sprint.capacity > 0 && (
              <span className={cn("font-medium", sprint.totalPoints > sprint.capacity ? "text-destructive" : "text-muted-foreground")}>
                Capacidad: {sprint.totalPoints}/{sprint.capacity} SP
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  const reviewCompleted = backlogStories?.filter((s) => s.sprint_id === completeReview?.id && s.status === "done") ?? [];
  const reviewIncomplete = backlogStories?.filter((s) => s.sprint_id === completeReview?.id && s.status !== "done") ?? [];
  const velocity = reviewCompleted.reduce((a, b) => a + (b.story_points ?? 0), 0);

  return (
    <div className="mt-4 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Sprints</h3>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Nuevo Sprint</Button>
      </div>

      {activeSprint && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Sprint Activo</Label>
          {renderSprintCard(activeSprint, true)}
        </div>
      )}

      {otherSprints.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Otros Sprints</Label>
          <div className="space-y-3">
            {otherSprints.map((s) => renderSprintCard(s, false))}
          </div>
        </div>
      )}

      {!sprints?.length && (
        <div className="text-center py-10 text-muted-foreground text-sm">No hay sprints. Crea el primero.</div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo Sprint</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={newSprint.name} onChange={(e) => setNewSprint((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Objetivo del Sprint</Label>
              <Textarea value={newSprint.goal} onChange={(e) => setNewSprint((p) => ({ ...p, goal: e.target.value }))} rows={2} placeholder="¿Qué queremos lograr en este sprint?" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Fecha inicio</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-xs", !newSprint.start_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {newSprint.start_date ? format(newSprint.start_date, "dd/MM/yyyy") : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={newSprint.start_date} onSelect={(d) => setNewSprint((p) => ({ ...p, start_date: d }))} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Fecha fin</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-xs", !newSprint.end_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {newSprint.end_date ? format(newSprint.end_date, "dd/MM/yyyy") : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={newSprint.end_date} onSelect={(d) => setNewSprint((p) => ({ ...p, end_date: d }))} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Capacidad (SP)</Label>
                <Input type="number" min={0} value={newSprint.capacity} onChange={(e) => setNewSprint((p) => ({ ...p, capacity: e.target.value }))} placeholder="0" />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Historias del Backlog sin sprint</Label>
                <span className="text-xs text-muted-foreground">{selectedBacklogIds.length} seleccionadas · {selectedPoints} SP</span>
              </div>
              <div className="border border-border rounded-lg max-h-52 overflow-y-auto divide-y divide-border">
                {unassignedStories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay historias sin sprint</p>
                ) : (
                  unassignedStories.map((s) => (
                    <label key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                      <Checkbox checked={selectedBacklogIds.includes(s.id)} onCheckedChange={() => toggleBacklogItem(s.id)} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground truncate block">{s.title}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {s.epics && <Badge variant="outline" className="text-[9px] h-4" style={{ borderColor: s.epics.color || undefined }}>{s.epics.title}</Badge>}
                          <span className="text-[10px] text-muted-foreground capitalize">{s.priority}</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">{s.story_points ?? 0} SP</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newSprint.name.trim() || createSprint.isPending}>Crear Sprint</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!startConfirm} onOpenChange={() => setStartConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>¿Iniciar Sprint?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esto iniciará <strong>{startConfirm?.name}</strong>
            {startConfirm?.start_date && startConfirm?.end_date
              ? ` del ${format(new Date(startConfirm.start_date), "dd MMM yyyy", { locale: es })} al ${format(new Date(startConfirm.end_date), "dd MMM yyyy", { locale: es })}`
              : ""}.
          </p>
          <p className="text-sm">{startConfirm?.totalStories} historias · {startConfirm?.totalPoints} story points</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartConfirm(null)}>Cancelar</Button>
            <Button onClick={handleStartSprint}>Iniciar Sprint</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!completeReview} onOpenChange={() => setCompleteReview(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Sprint Review — {completeReview?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-primary">{velocity}</p>
                  <p className="text-xs text-muted-foreground">SP completados (Velocidad)</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{reviewCompleted.length}/{(completeReview?.totalStories ?? 0)}</p>
                  <p className="text-xs text-muted-foreground">Historias completadas</p>
                </CardContent>
              </Card>
            </div>

            {reviewCompleted.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">✅ Completadas</Label>
                <ul className="text-sm space-y-0.5">
                  {reviewCompleted.map((s) => <li key={s.id} className="text-foreground">• {s.title} ({s.story_points ?? 0} SP)</li>)}
                </ul>
              </div>
            )}

            {reviewIncomplete.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">⏳ Incompletas ({reviewIncomplete.length})</Label>
                <ul className="text-sm space-y-0.5">
                  {reviewIncomplete.map((s) => <li key={s.id} className="text-foreground">• {s.title} ({s.story_points ?? 0} SP)</li>)}
                </ul>
                <p className="text-sm text-muted-foreground">¿Qué hacer con las historias incompletas?</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleCompleteSprint("next")}>Mover al siguiente sprint</Button>
                  <Button size="sm" variant="outline" onClick={() => handleCompleteSprint("backlog")}>Devolver al backlog</Button>
                </div>
              </div>
            )}

            {reviewIncomplete.length === 0 && (
              <DialogFooter>
                <Button onClick={() => handleCompleteSprint("backlog")}>Finalizar Sprint</Button>
              </DialogFooter>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
