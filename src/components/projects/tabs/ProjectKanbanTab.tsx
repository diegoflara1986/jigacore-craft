import { useState, useCallback, useEffect } from "react";
import { useUserStories, useUpdateUserStory, useCreateUserStory, UserStory } from "@/hooks/useUserStories";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionDeniedDialog } from "@/components/PermissionDeniedDialog";
import { useSprintsWithStats } from "@/hooks/useSprints";
import { useEpics } from "@/hooks/useEpics";
import { useProjectMembers } from "@/hooks/useProjects";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MessageSquare, Users, Plus, Lock, ListChecks, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { UserStoryDetailSheet } from "../UserStoryDetailSheet";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const COLUMNS = [
  { id: "todo", label: "📋 Por Hacer", limit: 0 },
  { id: "in_progress", label: "⚡ En Progreso", limit: 5 },
  { id: "in_review", label: "👀 En Revisión", limit: 3 },
  { id: "qa", label: "🔍 En QA", limit: 3 },
  { id: "done", label: "✅ Completado", limit: 0 },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

interface Props {
  projectId: string;
}

export function ProjectKanbanTab({ projectId }: Props) {
  const { data: sprints } = useSprintsWithStats(projectId);
  const { data: epics } = useEpics(projectId);
  const { data: members } = useProjectMembers(projectId);
  const updateStory = useUpdateUserStory();
  const createStory = useCreateUserStory();
  const { guardAction, denied, closeDenied } = usePermissions(projectId);

  const activeSprint = sprints?.find((s) => s.status === "active");
  const [selectedSprintId, setSelectedSprintId] = useState<string | undefined>(undefined);
  const sprintId = selectedSprintId ?? activeSprint?.id;

  useEffect(() => {
    if (activeSprint && !selectedSprintId) setSelectedSprintId(activeSprint.id);
  }, [activeSprint, selectedSprintId]);

  const [filterAssigned, setFilterAssigned] = useState<string>("all");
  const [filterEpic, setFilterEpic] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"board" | "swimlane">("board");
  const [groupBy, setGroupBy] = useState<"none" | "epic" | "assigned" | "priority">("none");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [quickAddCol, setQuickAddCol] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");

  const { data: allStories } = useUserStories(projectId);
  const sprintStories = allStories?.filter((s) => s.sprint_id === sprintId) ?? [];

  // Fetch comment counts for sprint stories
  const storyIds = sprintStories.map((s) => s.id);
  const { data: commentCounts } = useQuery({
    queryKey: ["comment-counts", sprintId, storyIds.length],
    queryFn: async () => {
      if (storyIds.length === 0) return {};
      const { data } = await supabase
        .from("comments")
        .select("user_story_id")
        .in("user_story_id", storyIds);
      const counts: Record<string, number> = {};
      data?.forEach((c) => { if (c.user_story_id) counts[c.user_story_id] = (counts[c.user_story_id] || 0) + 1; });
      return counts;
    },
    enabled: storyIds.length > 0,
  });

  // Fetch subtask counts
  const { data: taskCounts } = useQuery({
    queryKey: ["task-counts", sprintId, storyIds.length],
    queryFn: async () => {
      if (storyIds.length === 0) return {};
      const { data } = await supabase
        .from("tasks")
        .select("user_story_id, status")
        .in("user_story_id", storyIds);
      const counts: Record<string, { total: number; done: number }> = {};
      data?.forEach((t) => {
        if (t.user_story_id) {
          if (!counts[t.user_story_id]) counts[t.user_story_id] = { total: 0, done: 0 };
          counts[t.user_story_id].total++;
          if (t.status === "done") counts[t.user_story_id].done++;
        }
      });
      return counts;
    },
    enabled: storyIds.length > 0,
  });

  const filtered = sprintStories.filter((s) => {
    if (filterAssigned !== "all" && s.assigned_to !== filterAssigned) return false;
    if (filterEpic !== "all" && s.epic_id !== filterEpic) return false;
    if (filterPriority !== "all" && s.priority !== filterPriority) return false;
    if (filterType !== "all" && s.type !== filterType) return false;
    return true;
  });

  const selectedSprint = sprints?.find((s) => s.id === sprintId);
  const daysLeft = selectedSprint?.end_date ? Math.max(0, Math.ceil((new Date(selectedSprint.end_date).getTime() - Date.now()) / 86400000)) : null;

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggedId(id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverCol(colId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverCol(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const storyId = e.dataTransfer.getData("text/plain");
    setDraggedId(null);
    setDragOverCol(null);
    if (!storyId) return;

    const story = sprintStories.find((s) => s.id === storyId);
    if (!story || story.status === newStatus) return;

    if (newStatus === "done") {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
    }

    await updateStory.mutateAsync({ id: storyId, status: newStatus });
  }, [sprintStories, updateStory]);

  const handleQuickAdd = async (colId: string) => {
    if (!quickAddTitle.trim() || !sprintId) return;
    await createStory.mutateAsync({
      project_id: projectId,
      title: quickAddTitle,
      status: colId,
      sprint_id: sprintId,
    });
    setQuickAddTitle("");
    setQuickAddCol(null);
  };

  const initials = (name: string | null) => name ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  const isBlocked = (story: UserStory) => {
    // Check if title or description contains "bloqueado" or "blocked"
    const text = `${story.title} ${story.description || ""}`.toLowerCase();
    return text.includes("bloqueado") || text.includes("blocked") || text.includes("[blocked]");
  };

  const renderCard = (story: UserStory) => {
    const comments = commentCounts?.[story.id] ?? 0;
    const tasks = taskCounts?.[story.id];
    const blocked = isBlocked(story);

    return (
      <div
        key={story.id}
        draggable
        onDragStart={(e) => handleDragStart(e, story.id)}
        onClick={() => setSelectedStoryId(story.id)}
        className={cn(
          "bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all space-y-2",
          draggedId === story.id && "opacity-40 scale-95",
          blocked ? "border-destructive/50 bg-destructive/5" : "border-border"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground font-mono">HU-{story.id.slice(0, 4).toUpperCase()}</span>
            {blocked && <Lock className="h-3 w-3 text-destructive" />}
          </div>
          {story.story_points != null && (
            <span className="text-[10px] font-bold bg-primary/10 text-primary rounded-full h-5 w-5 flex items-center justify-center">{story.story_points}</span>
          )}
        </div>
        <p className="text-sm font-medium text-foreground line-clamp-2">{story.title}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {story.epics && (
            <Badge variant="outline" className="text-[9px] h-4 px-1.5" style={{ borderColor: story.epics.color || undefined, color: story.epics.color || undefined }}>
              {story.epics.title}
            </Badge>
          )}
          <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-0.5">
            <span className={cn("inline-block h-1.5 w-1.5 rounded-full", PRIORITY_COLORS[story.priority] ?? "bg-muted")} />
            {PRIORITY_LABELS[story.priority] ?? story.priority}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          {story.assigned_profile ? (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[8px] bg-muted">{initials(story.assigned_profile.full_name)}</AvatarFallback>
            </Avatar>
          ) : <div className="h-5" />}
          <div className="flex items-center gap-2 text-muted-foreground">
            {tasks && tasks.total > 0 && (
              <span className="flex items-center gap-0.5 text-[10px]">
                <ListChecks className="h-3 w-3" />{tasks.done}/{tasks.total}
              </span>
            )}
            {comments > 0 && (
              <span className="flex items-center gap-0.5 text-[10px]">
                <MessageSquare className="h-3 w-3" />{comments}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderColumn = (col: typeof COLUMNS[number], stories: UserStory[]) => {
    const colStories = stories.filter((s) => s.status === col.id);
    const overLimit = col.limit > 0 && colStories.length > col.limit;

    return (
      <div
        key={col.id}
        className={cn(
          "flex-1 min-w-[220px] rounded-lg p-2 transition-colors",
          dragOverCol === col.id ? "bg-primary/10" : "bg-muted/30"
        )}
        onDragOver={(e) => handleDragOver(e, col.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, col.id)}
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-foreground">{col.label}</span>
            <span className={cn("text-xs font-mono rounded-full h-5 min-w-[20px] flex items-center justify-center px-1", overLimit ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground")}>
              {colStories.length}{col.limit > 0 ? `/${col.limit}` : ""}
            </span>
          </div>
          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => guardAction("team", "agregar una historia al tablero", () => { setQuickAddCol(col.id); setQuickAddTitle(""); })}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {quickAddCol === col.id && (
          <div className="mb-2 flex gap-1">
            <Input
              className="h-7 text-xs"
              placeholder="Título rápido..."
              value={quickAddTitle}
              onChange={(e) => setQuickAddTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd(col.id); if (e.key === "Escape") setQuickAddCol(null); }}
              autoFocus
            />
          </div>
        )}
        <div className="space-y-2 min-h-[60px]">
          {colStories.map(renderCard)}
        </div>
      </div>
    );
  };

  const renderGroupedBoard = () => {
    if (groupBy === "none") {
      return (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((col) => renderColumn(col, filtered))}
        </div>
      );
    }

    let groups: { key: string; label: string; color?: string; stories: UserStory[] }[] = [];

    if (groupBy === "epic") {
      const epicMap = new Map<string, { label: string; color?: string; stories: UserStory[] }>();
      epicMap.set("none", { label: "Sin Épica", stories: [] });
      epics?.forEach((e) => epicMap.set(e.id, { label: e.title, color: e.color || undefined, stories: [] }));
      filtered.forEach((s) => {
        const key = s.epic_id || "none";
        if (!epicMap.has(key)) epicMap.set(key, { label: "Otra", stories: [] });
        epicMap.get(key)!.stories.push(s);
      });
      epicMap.forEach((v, k) => { if (v.stories.length > 0) groups.push({ key: k, ...v }); });
    } else if (groupBy === "assigned") {
      const memberMap = new Map<string, { label: string; stories: UserStory[] }>();
      memberMap.set("none", { label: "Sin Asignar", stories: [] });
      members?.forEach((m) => memberMap.set(m.user_id, { label: m.profiles?.full_name || m.profiles?.email || "?", stories: [] }));
      filtered.forEach((s) => {
        const key = s.assigned_to || "none";
        if (!memberMap.has(key)) memberMap.set(key, { label: "Otro", stories: [] });
        memberMap.get(key)!.stories.push(s);
      });
      memberMap.forEach((v, k) => { if (v.stories.length > 0) groups.push({ key: k, ...v }); });
    } else if (groupBy === "priority") {
      const prioOrder = ["critical", "high", "medium", "low"];
      prioOrder.forEach((p) => {
        const stories = filtered.filter((s) => s.priority === p);
        if (stories.length > 0) groups.push({ key: p, label: PRIORITY_LABELS[p], stories });
      });
    }

    return (
      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.key} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              {g.color && <span className="h-3 w-3 rounded-full" style={{ backgroundColor: g.color }} />}
              <span className="text-sm font-semibold text-foreground">{g.label}</span>
              <span className="text-xs text-muted-foreground">({g.stories.length})</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {COLUMNS.map((col) => renderColumn(col, g.stories))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSwimlane = () => {
    const membersList = members ?? [];
    return (
      <div className="space-y-4">
        {membersList.map((m) => {
          const memberStories = filtered.filter((s) => s.assigned_to === m.user_id);
          if (memberStories.length === 0) return null;
          return (
            <div key={m.user_id} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[9px] bg-muted">{initials(m.profiles?.full_name ?? null)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground">{m.profiles?.full_name || m.profiles?.email}</span>
                <span className="text-xs text-muted-foreground">({memberStories.length})</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {COLUMNS.map((col) => {
                  const cs = memberStories.filter((s) => s.status === col.id);
                  return (
                    <div
                      key={col.id}
                      className={cn("flex-1 min-w-[200px] rounded-lg p-2", dragOverCol === `${m.user_id}-${col.id}` ? "bg-primary/10" : "bg-muted/30")}
                      onDragOver={(e) => { e.preventDefault(); setDragOverCol(`${m.user_id}-${col.id}`); }}
                      onDragLeave={() => setDragOverCol(null)}
                      onDrop={(e) => handleDrop(e, col.id)}
                    >
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 block">{col.label}</span>
                      <div className="space-y-2">
                        {cs.map(renderCard)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {/* Unassigned */}
        {filtered.filter((s) => !s.assigned_to).length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="text-sm font-medium text-muted-foreground">Sin Asignar</span>
              <span className="text-xs text-muted-foreground">({filtered.filter((s) => !s.assigned_to).length})</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {COLUMNS.map((col) => {
                const cs = filtered.filter((s) => !s.assigned_to && s.status === col.id);
                return (
                  <div
                    key={col.id}
                    className={cn("flex-1 min-w-[200px] rounded-lg p-2 bg-muted/30")}
                    onDragOver={(e) => { e.preventDefault(); setDragOverCol(`unassigned-${col.id}`); }}
                    onDragLeave={() => setDragOverCol(null)}
                    onDrop={(e) => handleDrop(e, col.id)}
                  >
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 block">{col.label}</span>
                    <div className="space-y-2">{cs.map(renderCard)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-4 space-y-4 relative">
      {/* Confetti overlay */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="flex gap-2">
            {["🎉", "🎊", "✨", "⭐", "🎉"].map((e, i) => (
              <span key={i} className="text-5xl animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>{e}</span>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Sprint</span>
          <Select value={sprintId ?? "none"} onValueChange={(v) => setSelectedSprintId(v === "none" ? undefined : v)}>
            <SelectTrigger className="h-9 w-48"><SelectValue placeholder="Sprint" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin sprint</SelectItem>
              {sprints?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} {s.status === "active" ? "⚡" : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {selectedSprint && daysLeft !== null && selectedSprint.start_date && selectedSprint.end_date && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1">
            <Clock className="h-3 w-3" />
            {format(new Date(selectedSprint.start_date), "dd MMM", { locale: es })} → {format(new Date(selectedSprint.end_date), "dd MMM", { locale: es })}
            <Badge variant={daysLeft <= 2 ? "destructive" : "secondary"} className="text-[10px] h-4 px-1.5">{daysLeft}d</Badge>
          </div>
        )}

        <div className="flex-1" />

        <div className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Asignado</span>
          <Select value={filterAssigned} onValueChange={setFilterAssigned}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Asignado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {members?.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.profiles?.full_name || m.profiles?.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Épica</span>
          <Select value={filterEpic} onValueChange={setFilterEpic}>
            <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Épica" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {epics?.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Prioridad</span>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Prioridad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="critical">Crítica</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="low">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Tipo</span>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-24 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="story">Historia</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="technical">Técnica</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {viewMode === "board" && (
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Agrupar</span>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Agrupar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin agrupar</SelectItem>
                <SelectItem value="epic">Por Épica</SelectItem>
                <SelectItem value="assigned">Por Asignado</SelectItem>
                <SelectItem value="priority">Por Prioridad</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <Button size="sm" variant={viewMode === "board" ? "default" : "outline"} onClick={() => setViewMode("board")} className="h-8 text-xs">Tablero</Button>
        <Button size="sm" variant={viewMode === "swimlane" ? "default" : "outline"} onClick={() => setViewMode("swimlane")} className="h-8 text-xs">
          <Users className="h-3.5 w-3.5 mr-1" />Responsable
        </Button>
      </div>

      {/* Board / Swimlane */}
      {!sprintId ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          Selecciona un sprint para ver el tablero. {!activeSprint && "No hay sprints activos."}
        </Card>
      ) : viewMode === "board" ? (
        renderGroupedBoard()
      ) : (
        renderSwimlane()
      )}

      {/* Story detail */}
      <UserStoryDetailSheet
        storyId={selectedStoryId}
        projectId={projectId}
        open={!!selectedStoryId}
        onOpenChange={(open) => { if (!open) setSelectedStoryId(null); }}
        epics={epics ?? []}
        members={members ?? []}
      />
      <PermissionDeniedDialog open={denied.open} onOpenChange={closeDenied} actionLabel={denied.actionLabel} requiredRoleLabel={denied.requiredRoleLabel} allowedMembers={denied.allowedMembers} />
    </div>
  );
}
