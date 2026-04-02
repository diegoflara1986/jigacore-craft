import { useState, useMemo } from "react";
import { useUserStories, useCreateUserStory, useUpdateUserStory, UserStory } from "@/hooks/useUserStories";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionDeniedDialog } from "@/components/PermissionDeniedDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEpics } from "@/hooks/useEpics";
import { useProjectMembers, ProjectMember } from "@/hooks/useProjects";
import { useEstimationRounds, useRoundParticipants } from "@/hooks/useEstimationRounds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, Trash2, BarChart3, Vote, Eye, ChevronDown, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserStoryDetailSheet } from "../UserStoryDetailSheet";
import { CreateEstimationRoundModal } from "../CreateEstimationRoundModal";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const fromTable = (table: string) => (supabase as any).from(table);

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

const ARCHIVED_TOOLTIP = "Proyecto archivado. Restaura el proyecto para editar";

export function ProjectBacklogTab({ projectId, estimationOnly = false, isArchived = false }: { projectId: string; estimationOnly?: boolean; isArchived?: boolean }) {
  const [filters, setFilters] = useState<{ epicId?: string; type?: string; priority?: string; status?: string; assignedTo?: string; search?: string; showDeleted?: boolean }>({});
  const { data: allStories, isLoading } = useUserStories(projectId, filters);
  const stories = estimationOnly
    ? allStories?.filter((s) => (s.story_points === null || s.story_points === 0) && !s.deleted_at)
    : allStories;
  const { data: epics } = useEpics(projectId);
  const { data: members } = useProjectMembers(projectId);
  const createStory = useCreateUserStory();
  const updateStory = useUpdateUserStory();
  const { guardAction, denied, closeDenied } = usePermissions(projectId);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [createOpen, setCreateOpen] = useState(false);
  const [estimationModalOpen, setEstimationModalOpen] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [closedRoundsOpen, setClosedRoundsOpen] = useState(false);
  const [newStory, setNewStory] = useState({ title: "", description: "", type: "story", priority: "medium", status: "backlog", story_points: "", epic_id: "", assigned_to: "", sprint_id: "" });

  // Estimation rounds
  const { data: allRounds } = useEstimationRounds(projectId);
  const openRounds = useMemo(() => allRounds?.filter((r) => r.status === "abierta") ?? [], [allRounds]);
  const closedRounds = useMemo(() => allRounds?.filter((r) => r.status === "cerrada") ?? [], [allRounds]);

  // Get vote counts for open rounds (for each round, how many votes does the current user have)
  const { data: myVoteCounts } = useQuery({
    queryKey: ["my-round-vote-counts", projectId, user?.id],
    queryFn: async () => {
      if (!user || !openRounds.length) return {};
      const roundIds = openRounds.map((r) => r.id);
      const { data } = await fromTable("estimation_round_votes")
        .select("round_id, round_story_id")
        .eq("user_id", user.id)
        .in("round_id", roundIds);
      const counts: Record<string, number> = {};
      (data ?? []).forEach((v: any) => { counts[v.round_id] = (counts[v.round_id] || 0) + 1; });
      return counts;
    },
    enabled: !!user && openRounds.length > 0,
  });

  // Get story counts per round
  const { data: roundStoryCounts } = useQuery({
    queryKey: ["round-story-counts", projectId],
    queryFn: async () => {
      if (!allRounds?.length) return {};
      const roundIds = allRounds.map((r) => r.id);
      const { data } = await fromTable("estimation_round_stories")
        .select("round_id")
        .in("round_id", roundIds);
      const counts: Record<string, number> = {};
      (data ?? []).forEach((rs: any) => { counts[rs.round_id] = (counts[rs.round_id] || 0) + 1; });
      return counts;
    },
    enabled: (allRounds?.length ?? 0) > 0,
  });

  // Get participant counts per round
  const { data: roundParticipantCounts } = useQuery({
    queryKey: ["round-participant-counts", projectId],
    queryFn: async () => {
      if (!allRounds?.length) return {};
      const roundIds = allRounds.map((r) => r.id);
      const { data } = await fromTable("estimation_round_participants")
        .select("round_id")
        .in("round_id", roundIds);
      const counts: Record<string, number> = {};
      (data ?? []).forEach((p: any) => { counts[p.round_id] = (counts[p.round_id] || 0) + 1; });
      return counts;
    },
    enabled: (allRounds?.length ?? 0) > 0,
  });

  // Get total vote counts per round (all users)
  const { data: totalVoteCounts } = useQuery({
    queryKey: ["total-round-vote-counts", projectId],
    queryFn: async () => {
      if (!allRounds?.length) return {};
      const roundIds = allRounds.map((r) => r.id);
      const { data } = await fromTable("estimation_round_votes")
        .select("round_id, user_id")
        .in("round_id", roundIds);
      // Count distinct users per round
      const userSets: Record<string, Set<string>> = {};
      (data ?? []).forEach((v: any) => {
        if (!userSets[v.round_id]) userSets[v.round_id] = new Set();
        userSets[v.round_id].add(v.user_id);
      });
      const counts: Record<string, number> = {};
      Object.entries(userSets).forEach(([k, s]) => { counts[k] = s.size; });
      return counts;
    },
    enabled: (allRounds?.length ?? 0) > 0,
  });

  // Sprints
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

  const isCreatorOrAdmin = (round: any) => round.created_by === user?.id || ["admin", "super_admin", "project_manager"].includes(user?.id ? "" : "");

  return (
    <div className="mt-4 space-y-4">
      {/* Estimation Rounds Section */}
      {estimationOnly && (
        <>
          {/* Open Rounds */}
          {openRounds.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Rondas Activas
              </h3>
              {openRounds.map((round) => {
                const storyCount = roundStoryCounts?.[round.id] ?? 0;
                const partCount = roundParticipantCounts?.[round.id] ?? 0;
                const votedUsersCount = totalVoteCounts?.[round.id] ?? 0;
                const myVotes = myVoteCounts?.[round.id] ?? 0;
                const hasVotedAll = storyCount > 0 && myVotes >= storyCount;
                const progress = partCount > 0 ? Math.round((votedUsersCount / partCount) * 100) : 0;
                const isCreator = round.created_by === user?.id;

                return (
                  <Card key={round.id} className="border-primary/20">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{round.title}</span>
                            {hasVotedAll ? (
                              <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 text-[10px]">Ya votaste</Badge>
                            ) : (
                              <Badge className="bg-accent/20 text-accent border-accent/30 text-[10px]">Pendiente tu voto</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{storyCount} historias</span>
                            <span>{votedUsersCount} de {partCount} miembros han votado</span>
                          </div>
                          <Progress value={progress} className="h-1.5" />
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {!hasVotedAll && (
                            <Button size="sm" onClick={() => navigate(`/proyectos/${projectId}/estimacion/${round.id}/votar`)} disabled={isArchived}>
                              <Vote className="h-3.5 w-3.5 mr-1" />Votar
                            </Button>
                          )}
                          {isCreator && (
                            <Button size="sm" variant="outline" onClick={() => navigate(`/proyectos/${projectId}/estimacion/${round.id}/resultados`)}>
                              <Eye className="h-3.5 w-3.5 mr-1" />Resultados
                            </Button>
                          )}
                          {!isCreator && hasVotedAll && (
                            <Button size="sm" variant="outline" onClick={() => navigate(`/proyectos/${projectId}/estimacion/${round.id}/votar`)}>
                              Cambiar votos
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Closed Rounds */}
          {closedRounds.length > 0 && (
            <Collapsible open={closedRoundsOpen} onOpenChange={setClosedRoundsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  {closedRoundsOpen ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
                  Rondas Cerradas ({closedRounds.length})
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {closedRounds.map((round) => {
                  const storyCount = roundStoryCounts?.[round.id] ?? 0;
                  const isCreator = round.created_by === user?.id;
                  return (
                    <Card key={round.id} className="border-muted">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-muted-foreground truncate">{round.title}</span>
                              <Badge variant="secondary" className="text-[10px]">Cerrada</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">{storyCount} historias · {round.closed_at ? new Date(round.closed_at).toLocaleDateString() : ""}</span>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/proyectos/${projectId}/estimacion/${round.id}/resultados`)}>
                            <Eye className="h-3.5 w-3.5 mr-1" />Ver
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {!estimationOnly && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button size="sm" disabled={isArchived} className={isArchived ? "opacity-50" : ""} onClick={() => guardAction("team", "crear una historia de usuario", () => setCreateOpen(true))}><Plus className="h-4 w-4 mr-1" />Agregar HU</Button>
                </span>
              </TooltipTrigger>
              {isArchived && <TooltipContent>{ARCHIVED_TOOLTIP}</TooltipContent>}
            </Tooltip>
          )}
          {estimationOnly && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button size="sm" disabled={isArchived} className={isArchived ? "opacity-50" : ""} onClick={() => guardAction("lead", "crear una ronda de estimación", () => setEstimationModalOpen(true))}>
                    <Plus className="h-4 w-4 mr-1" />Nueva Estimación
                  </Button>
                </span>
              </TooltipTrigger>
              {isArchived && <TooltipContent>{ARCHIVED_TOOLTIP}</TooltipContent>}
            </Tooltip>
          )}
        </div>
        <span className="text-sm text-muted-foreground">{stories?.length ?? 0} historias{estimationOnly ? " sin estimar" : ""}</span>
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
        {!estimationOnly && (
          <Button
            size="sm"
            variant={filters.showDeleted ? "default" : "outline"}
            className="h-9"
            onClick={() => setFilters((f) => ({ ...f, showDeleted: !f.showDeleted }))}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {filters.showDeleted ? "Ver activas" : "Eliminadas"}
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : !stories?.length ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          {estimationOnly ? "Todas las historias ya tienen puntos estimados." : "Sin historias de usuario. Crea la primera."}
        </div>
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
                      disabled={isStoryReadOnly(s) || isArchived}
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

      <CreateEstimationRoundModal projectId={projectId} open={estimationModalOpen} onOpenChange={setEstimationModalOpen} />
      <PermissionDeniedDialog open={denied.open} onOpenChange={closeDenied} actionLabel={denied.actionLabel} requiredRoleLabel={denied.requiredRoleLabel} allowedMembers={denied.allowedMembers} />
    </div>
  );
}
