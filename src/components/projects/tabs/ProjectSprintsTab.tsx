import { useState } from "react";
import { useSprintsWithStats, useCreateSprint, useUpdateSprint, SprintWithStats } from "@/hooks/useSprints";
import { useUserStories, useUpdateUserStory, useCreateUserStory } from "@/hooks/useUserStories";
import { useEpics } from "@/hooks/useEpics";
import { useProjectMembers } from "@/hooks/useProjects";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionDeniedDialog } from "@/components/PermissionDeniedDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Play, CheckCircle2, LayoutDashboard, Pencil, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { PlanningPokerModal } from "../PlanningPokerModal";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  planning: { label: "Planificado", variant: "outline" },
  active: { label: "Activo", variant: "default" },
  completed: { label: "Completado", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

interface Props {
  projectId: string;
  onNavigateToBoard?: () => void;
  isArchived?: boolean;
}

export function ProjectSprintsTab({ projectId, onNavigateToBoard, isArchived = false }: Props) {
  const { data: sprints, isLoading } = useSprintsWithStats(projectId);
  const { data: backlogStories } = useUserStories(projectId, { status: undefined });
  const { data: epics } = useEpics(projectId);
  const { data: members } = useProjectMembers(projectId);
  const createSprint = useCreateSprint();
  const updateSprint = useUpdateSprint();
  const updateStory = useUpdateUserStory();
  const createStory = useCreateUserStory();
  const { guardAction, denied, closeDenied } = usePermissions(projectId);

  const { data: sprintsList } = useQuery({
    queryKey: ["sprints-list", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("sprints").select("id, name").eq("project_id", projectId).order("created_at");
      return data ?? [];
    },
  });

  const TYPES = [
    { value: "story", label: "Historia", icon: "📖" },
    { value: "bug", label: "Bug", icon: "🐛" },
    { value: "technical", label: "Técnica", icon: "⚙️" },
    { value: "spike", label: "Spike", icon: "🔍" },
    { value: "improvement", label: "Mejora", icon: "✨" },
  ];
  const PRIORITIES = [
    { value: "critical", label: "Crítica" },
    { value: "high", label: "Alta" },
    { value: "medium", label: "Media" },
    { value: "low", label: "Baja" },
  ];
  const STATUSES_HU = [
    { value: "backlog", label: "Backlog" },
    { value: "todo", label: "Por Hacer" },
    { value: "in_progress", label: "En Progreso" },
    { value: "in_review", label: "En Revisión" },
    { value: "qa", label: "En QA" },
    { value: "done", label: "Completado" },
  ];

  const [createOpen, setCreateOpen] = useState(false);
  const [editSprint, setEditSprint] = useState<SprintWithStats | null>(null);
  const [startConfirm, setStartConfirm] = useState<SprintWithStats | null>(null);
  const [completeReview, setCompleteReview] = useState<SprintWithStats | null>(null);
  const [incompleteHandled, setIncompleteHandled] = useState(false);
  const [newSprint, setNewSprint] = useState({ name: "", goal: "", start_date: undefined as Date | undefined, end_date: undefined as Date | undefined });
  const [selectedBacklogIds, setSelectedBacklogIds] = useState<string[]>([]);
  const [createHUOpen, setCreateHUOpen] = useState(false);
  const [planningPokerOpen, setPlanningPokerOpen] = useState(false);
  const [newStory, setNewStory] = useState({ title: "", description: "", type: "story", priority: "medium", status: "backlog", story_points: "", epic_id: "", assigned_to: "", sprint_id: "" });

  const handleCreateHU = async () => {
    if (!newStory.title.trim()) return;
    await createStory.mutateAsync({
      project_id: projectId,
      title: newStory.title,
      description: newStory.description || null,
      type: newStory.type,
      priority: newStory.priority,
      status: newStory.status,
      story_points: newStory.story_points ? parseInt(newStory.story_points) : null,
      epic_id: newStory.epic_id || null,
      assigned_to: newStory.assigned_to || null,
      sprint_id: newStory.sprint_id || null,
    });
    setCreateHUOpen(false);
    setNewStory({ title: "", description: "", type: "story", priority: "medium", status: "backlog", story_points: "", epic_id: "", assigned_to: "", sprint_id: "" });
  };

  const activeSprint = sprints?.find((s) => s.status === "active");
  const otherSprints = sprints?.filter((s) => s.status !== "active") ?? [];
  const unassignedStories = backlogStories?.filter((s) => (!s.sprint_id || s.sprint_id === editSprint?.id) && !s.deleted_at && s.story_points != null && s.story_points > 0) ?? [];

  const openCreate = () => {
    const nextNum = (sprints?.length ?? 0) + 1;
    setNewSprint({ name: `Sprint ${nextNum}`, goal: "", start_date: undefined, end_date: undefined });
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
      capacity: selectedPoints,
    });
    for (const sid of selectedBacklogIds) {
      await updateStory.mutateAsync({ id: sid, sprint_id: created.id });
    }
    setCreateOpen(false);
  };

  const openEdit = (sprint: SprintWithStats) => {
    setNewSprint({
      name: sprint.name,
      goal: sprint.goal || "",
      start_date: sprint.start_date ? new Date(sprint.start_date) : undefined,
      end_date: sprint.end_date ? new Date(sprint.end_date) : undefined,
    });
    const assignedIds = backlogStories?.filter((s) => s.sprint_id === sprint.id).map((s) => s.id) ?? [];
    setSelectedBacklogIds(assignedIds);
    setEditSprint(sprint);
  };

  const handleEdit = async () => {
    if (!editSprint || !newSprint.name.trim()) return;
    await updateSprint.mutateAsync({
      id: editSprint.id,
      name: newSprint.name,
      goal: newSprint.goal || null,
      start_date: newSprint.start_date ? format(newSprint.start_date, "yyyy-MM-dd") : null,
      end_date: newSprint.end_date ? format(newSprint.end_date, "yyyy-MM-dd") : null,
      capacity: selectedPoints,
    });
    // Sync story assignments: add newly selected, remove deselected
    const currentlyAssigned = backlogStories?.filter((s) => s.sprint_id === editSprint.id).map((s) => s.id) ?? [];
    const toAssign = selectedBacklogIds.filter((id) => !currentlyAssigned.includes(id));
    const toRemove = currentlyAssigned.filter((id) => !selectedBacklogIds.includes(id));
    for (const sid of toAssign) {
      await updateStory.mutateAsync({ id: sid, sprint_id: editSprint.id });
    }
    for (const sid of toRemove) {
      await updateStory.mutateAsync({ id: sid, sprint_id: null });
    }
    setEditSprint(null);
  };

  const handleStartSprint = async () => {
    if (!startConfirm) return;
    await updateSprint.mutateAsync({ id: startConfirm.id, status: "active" });
    setStartConfirm(null);
  };

  const handleMoveIncomplete = async (action: "next" | "backlog") => {
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
    setIncompleteHandled(true);
  };

  const handleFinalizeSprint = async () => {
    if (!completeReview) return;
    await updateSprint.mutateAsync({ id: completeReview.id, status: "completed" });
    setCompleteReview(null);
    setIncompleteHandled(false);
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
                <>
                  <Button size="sm" variant="ghost" onClick={() => guardAction("lead", "editar un sprint", () => openEdit(sprint))}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => guardAction("lead", "iniciar un sprint", () => setStartConfirm(sprint))}>
                    <Play className="h-3.5 w-3.5 mr-1" />Iniciar
                  </Button>
                </>
              )}
              {sprint.status === "active" && (
                <>
                  {onNavigateToBoard && (
                    <Button size="sm" variant="outline" onClick={onNavigateToBoard}>
                      <LayoutDashboard className="h-3.5 w-3.5 mr-1" />Ver Tablero
                    </Button>
                  )}
                  <Button size="sm" onClick={() => guardAction("lead", "completar un sprint", () => setCompleteReview(sprint))}>
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
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setPlanningPokerOpen(true)}>
            <Users className="h-4 w-4 mr-1" />Planning Poker
          </Button>
          <Button size="sm" onClick={() => guardAction("lead", "crear un sprint", openCreate)}><Plus className="h-4 w-4 mr-1" />Nuevo Sprint</Button>
        </div>
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
                <Input type="number" value={selectedPoints} readOnly disabled className="bg-muted" />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Historias del Backlog sin sprint</Label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{selectedBacklogIds.length} seleccionadas · {selectedPoints} SP</span>
                  <Button size="sm" variant="outline" onClick={() => setCreateHUOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Nueva HU</Button>
                </div>
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

      {/* Edit Sprint Modal */}
      <Dialog open={!!editSprint} onOpenChange={() => setEditSprint(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Sprint</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={newSprint.name} onChange={(e) => setNewSprint((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Objetivo del Sprint</Label>
              <Textarea value={newSprint.goal} onChange={(e) => setNewSprint((p) => ({ ...p, goal: e.target.value }))} rows={2} />
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
                <Input type="number" value={selectedPoints} readOnly disabled className="bg-muted" />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Historias del Backlog</Label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{selectedBacklogIds.length} seleccionadas · {selectedPoints} SP</span>
                  <Button size="sm" variant="outline" onClick={() => setCreateHUOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Nueva HU</Button>
                </div>
              </div>
              <div className="border border-border rounded-lg max-h-52 overflow-y-auto divide-y divide-border">
                {unassignedStories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay historias disponibles</p>
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
            <Button variant="outline" onClick={() => setEditSprint(null)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={!newSprint.name.trim() || updateSprint.isPending}>Guardar Cambios</Button>
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

            {reviewIncomplete.length > 0 && !incompleteHandled && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">⏳ Incompletas ({reviewIncomplete.length})</Label>
                <ul className="text-sm space-y-0.5">
                  {reviewIncomplete.map((s) => <li key={s.id} className="text-foreground">• {s.title} ({s.story_points ?? 0} SP)</li>)}
                </ul>
                <p className="text-sm text-muted-foreground">¿Qué hacer con las historias incompletas?</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleMoveIncomplete("next")} disabled={updateStory.isPending}>Mover al siguiente sprint</Button>
                  <Button size="sm" variant="outline" onClick={() => handleMoveIncomplete("backlog")} disabled={updateStory.isPending}>Devolver al backlog</Button>
                </div>
              </div>
            )}

            {incompleteHandled && (
              <p className="text-sm text-green-600">✅ Historias incompletas reasignadas correctamente.</p>
            )}

            <Separator />
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCompleteReview(null); setIncompleteHandled(false); }}>Cancelar</Button>
              <Button onClick={handleFinalizeSprint} disabled={(reviewIncomplete.length > 0 && !incompleteHandled) || updateSprint.isPending}>
                Finalizar Sprint
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create HU Dialog */}
      <Dialog open={createHUOpen} onOpenChange={setCreateHUOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Nueva Historia de Usuario</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={newStory.title} onChange={(e) => setNewStory((p) => ({ ...p, title: e.target.value }))} placeholder="Como [rol] quiero [acción]..." />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={newStory.description} onChange={(e) => setNewStory((p) => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={newStory.type} onValueChange={(v) => setNewStory((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={newStory.priority} onValueChange={(v) => setNewStory((p) => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Épica</Label>
                <Select value={newStory.epic_id || "none"} onValueChange={(v) => setNewStory((p) => ({ ...p, epic_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Sin épica" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin épica</SelectItem>
                    {epics?.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={newStory.status} onValueChange={(v) => setNewStory((p) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES_HU.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Story Points</Label>
                <Input type="number" min={0} value={newStory.story_points} onChange={(e) => setNewStory((p) => ({ ...p, story_points: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Sprint</Label>
                <Select value={newStory.sprint_id || "none"} onValueChange={(v) => setNewStory((p) => ({ ...p, sprint_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Sin sprint" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin sprint</SelectItem>
                    {sprintsList?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Asignar a</Label>
                <Select value={newStory.assigned_to || "none"} onValueChange={(v) => setNewStory((p) => ({ ...p, assigned_to: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {members?.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.profiles?.full_name || m.profiles?.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateHUOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateHU} disabled={!newStory.title.trim() || createStory.isPending}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlanningPokerModal projectId={projectId} open={planningPokerOpen} onOpenChange={setPlanningPokerOpen} />
      <PermissionDeniedDialog open={denied.open} onOpenChange={closeDenied} actionLabel={denied.actionLabel} requiredRoleLabel={denied.requiredRoleLabel} allowedMembers={denied.allowedMembers} />
    </div>
  );
}
