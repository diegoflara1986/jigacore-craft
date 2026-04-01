import { useState } from "react";
import { useUserStories, useCreateUserStory, useUpdateUserStory, UserStory } from "@/hooks/useUserStories";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionDeniedDialog } from "@/components/PermissionDeniedDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEpics } from "@/hooks/useEpics";
import { useProjectMembers, ProjectMember } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Users, Trash2 } from "lucide-react";
import { UserStoryDetailSheet } from "../UserStoryDetailSheet";
import { PlanningPokerModal } from "../PlanningPokerModal";

const TYPES = [
  { value: "story", label: "Historia", icon: "📖" },
  { value: "bug", label: "Bug", icon: "🐛" },
  { value: "technical", label: "Técnica", icon: "⚙️" },
  { value: "spike", label: "Spike", icon: "🔍" },
  { value: "improvement", label: "Mejora", icon: "✨" },
];

const PRIORITIES = [
  { value: "critical", label: "Crítica", color: "bg-red-500" },
  { value: "high", label: "Alta", color: "bg-orange-500" },
  { value: "medium", label: "Media", color: "bg-yellow-500" },
  { value: "low", label: "Baja", color: "bg-green-500" },
];

const STATUSES = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "Por Hacer" },
  { value: "in_progress", label: "En Progreso" },
  { value: "in_review", label: "En Revisión" },
  { value: "qa", label: "En QA" },
  { value: "done", label: "Completado" },
];

function typeIcon(t: string) { return TYPES.find((x) => x.value === t)?.icon ?? "📖"; }
function priorityBadge(p: string) {
  const pr = PRIORITIES.find((x) => x.value === p);
  return pr ? <span className={`inline-block h-2.5 w-2.5 rounded-full ${pr.color} mr-1.5`} /> : null;
}

export function ProjectBacklogTab({ projectId }: { projectId: string }) {
  const [filters, setFilters] = useState<{ epicId?: string; type?: string; priority?: string; status?: string; assignedTo?: string; search?: string; showDeleted?: boolean }>({});
  const { data: stories, isLoading } = useUserStories(projectId, filters);
  const { data: epics } = useEpics(projectId);
  const { data: members } = useProjectMembers(projectId);
  const createStory = useCreateUserStory();
  const updateStory = useUpdateUserStory();
  const { guardAction, denied, closeDenied } = usePermissions(projectId);

  const [createOpen, setCreateOpen] = useState(false);
  const [planningPokerOpen, setPlanningPokerOpen] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [newStory, setNewStory] = useState({ title: "", description: "", type: "story", priority: "medium", status: "backlog", story_points: "", epic_id: "", assigned_to: "", sprint_id: "" });

  // Sprints (include status for read-only logic)
  const { data: sprints } = useQuery({
    queryKey: ["sprints", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("sprints").select("id, name, status").eq("project_id", projectId).order("created_at");
      return data ?? [];
    },
  });

  const isStoryReadOnly = (s: UserStory) => {
    if (s.deleted_at) return true;
    if (s.status === "done") return true;
    if (s.sprint_id) {
      const sprint = sprints?.find(sp => sp.id === s.sprint_id);
      if (sprint && sprint.status === "active") return true;
    }
    return false;
  };

  const handleCreate = async () => {
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
    setCreateOpen(false);
    setNewStory({ title: "", description: "", type: "story", priority: "medium", status: "backlog", story_points: "", epic_id: "", assigned_to: "", sprint_id: "" });
  };

  const initials = (name: string | null) => name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  return (
    <div className="mt-4 space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" />Agregar HU</Button>
          <Button size="sm" variant="outline" onClick={() => setPlanningPokerOpen(true)}>
            <Users className="h-4 w-4 mr-1" />Planning Poker
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">{stories?.length ?? 0} historias</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-8 h-9 w-48" value={filters.search ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Épica</Label>
          <Select value={filters.epicId ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, epicId: v === "all" ? undefined : v }))}>
            <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Épica" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las épicas</SelectItem>
              {epics?.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Tipo</Label>
          <Select value={filters.type ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, type: v === "all" ? undefined : v }))}>
            <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Prioridad</Label>
          <Select value={filters.priority ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, priority: v === "all" ? undefined : v }))}>
            <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Prioridad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Estado</Label>
          <Select value={filters.status ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? undefined : v }))}>
            <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Asignado</Label>
          <Select value={filters.assignedTo ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, assignedTo: v === "all" ? undefined : v }))}>
            <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Asignado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {members?.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.profiles?.full_name || m.profiles?.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          variant={filters.showDeleted ? "default" : "outline"}
          className="h-9"
          onClick={() => setFilters((f) => ({ ...f, showDeleted: !f.showDeleted }))}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {filters.showDeleted ? "Ver activas" : "Eliminadas"}
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : !stories?.length ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Sin historias de usuario. Crea la primera.</div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
             <TableHead className="w-20">ID</TableHead>
                <TableHead className="w-16">Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead className="w-28">Épica</TableHead>
                <TableHead className="w-24">Prioridad</TableHead>
                <TableHead className="w-16 text-center">SP</TableHead>
                <TableHead className="w-24">Sprint</TableHead>
                <TableHead className="w-16">Asig.</TableHead>
                <TableHead className="w-28">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stories.map((s) => (
                <TableRow key={s.id} className={`cursor-pointer hover:bg-muted/50 ${s.deleted_at ? 'opacity-50' : ''}`} onClick={() => setSelectedStoryId(s.id)}>
                  <TableCell className="text-xs text-muted-foreground font-mono">HU-{String(s.story_number ?? 0).padStart(3, "0")}</TableCell>
                  <TableCell className="text-center text-base">{typeIcon(s.type)}</TableCell>
                  <TableCell>
                    <span className="font-medium text-foreground">{s.title}</span>
                  </TableCell>
                  <TableCell>
                    {s.epics ? (
                      <span className="text-xs text-foreground truncate block max-w-[120px]" title={s.epics.title}>
                        {s.epics.title}
                      </span>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center text-xs">
                      {priorityBadge(s.priority)}
                      {PRIORITIES.find((p) => p.value === s.priority)?.label ?? s.priority}
                    </span>
                  </TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <Input
                      type="number"
                      className="h-7 w-14 text-center text-xs mx-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={s.story_points ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          updateStory.mutateAsync({ id: s.id, story_points: null });
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num) && num >= 0 && num <= 50) {
                            updateStory.mutateAsync({ id: s.id, story_points: num });
                          }
                        }
                      }}
                      min={0}
                      max={50}
                      disabled={isStoryReadOnly(s)}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.sprints?.name ?? "—"}</TableCell>
                  <TableCell>
                    {s.assigned_profile ? (
                      <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px] bg-muted">{initials(s.assigned_profile.full_name)}</AvatarFallback></Avatar>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {STATUSES.find((st) => st.value === s.status)?.label ?? s.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
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
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
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
                    {sprints?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
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
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newStory.title.trim() || createStory.isPending}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Story Detail Sheet */}
      <UserStoryDetailSheet
        storyId={selectedStoryId}
        projectId={projectId}
        open={!!selectedStoryId}
        onOpenChange={(open) => { if (!open) setSelectedStoryId(null); }}
        epics={epics ?? []}
        members={members ?? []}
        readOnly={(() => { const s = stories?.find(st => st.id === selectedStoryId); return s ? isStoryReadOnly(s) : false; })()}
      />

      <PlanningPokerModal projectId={projectId} open={planningPokerOpen} onOpenChange={setPlanningPokerOpen} />
    </div>
  );
}
