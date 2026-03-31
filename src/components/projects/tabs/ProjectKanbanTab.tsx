import { useState, useCallback } from "react";
import { useUserStories, useUpdateUserStory, UserStory } from "@/hooks/useUserStories";
import { useSprintsWithStats } from "@/hooks/useSprints";
import { useEpics } from "@/hooks/useEpics";
import { useProjectMembers } from "@/hooks/useProjects";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { UserStoryDetailSheet } from "../UserStoryDetailSheet";

const COLUMNS = [
  { id: "todo", label: "📋 Por Hacer", limit: 0 },
  { id: "in_progress", label: "⚡ En Progreso", limit: 5 },
  { id: "in_review", label: "👀 En Revisión", limit: 3 },
  { id: "done", label: "✅ Completado", limit: 0 },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

interface Props {
  projectId: string;
}

export function ProjectKanbanTab({ projectId }: Props) {
  const { data: sprints } = useSprintsWithStats(projectId);
  const { data: epics } = useEpics(projectId);
  const { data: members } = useProjectMembers(projectId);
  const updateStory = useUpdateUserStory();

  const activeSprint = sprints?.find((s) => s.status === "active");
  const [selectedSprintId, setSelectedSprintId] = useState<string | undefined>(undefined);
  const sprintId = selectedSprintId ?? activeSprint?.id;

  const [filterAssigned, setFilterAssigned] = useState<string>("all");
  const [filterEpic, setFilterEpic] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"board" | "swimlane">("board");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const { data: allStories } = useUserStories(projectId);
  const sprintStories = allStories?.filter((s) => s.sprint_id === sprintId) ?? [];

  const filtered = sprintStories.filter((s) => {
    if (filterAssigned !== "all" && s.assigned_to !== filterAssigned) return false;
    if (filterEpic !== "all" && s.epic_id !== filterEpic) return false;
    if (filterPriority !== "all" && s.priority !== filterPriority) return false;
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

    const story = filtered.find((s) => s.id === storyId);
    if (!story || story.status === newStatus) return;

    if (newStatus === "done") {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }

    await updateStory.mutateAsync({ id: storyId, status: newStatus });
  }, [filtered, updateStory]);

  const initials = (name: string | null) => name ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  const renderCard = (story: UserStory) => (
    <div
      key={story.id}
      draggable
      onDragStart={(e) => handleDragStart(e, story.id)}
      onClick={() => setSelectedStoryId(story.id)}
      className={cn(
        "bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all space-y-2",
        draggedId === story.id && "opacity-40 scale-95"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-mono">HU-{story.id.slice(0, 4).toUpperCase()}</span>
        {story.story_points != null && (
          <span className="text-[10px] font-bold bg-muted text-muted-foreground rounded-full h-5 w-5 flex items-center justify-center">{story.story_points}</span>
        )}
      </div>
      <p className="text-sm font-medium text-foreground line-clamp-2">{story.title}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {story.epics && (
          <Badge variant="outline" className="text-[9px] h-4 px-1" style={{ borderColor: story.epics.color || undefined }}>
            {story.epics.title}
          </Badge>
        )}
        <span className={cn("inline-block h-2 w-2 rounded-full", PRIORITY_COLORS[story.priority] ?? "bg-muted")} />
      </div>
      <div className="flex items-center justify-between">
        {story.assigned_profile ? (
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[8px] bg-muted">{initials(story.assigned_profile.full_name)}</AvatarFallback>
          </Avatar>
        ) : <div />}
        <div className="flex items-center gap-2 text-muted-foreground">
          <MessageSquare className="h-3 w-3" />
        </div>
      </div>
    </div>
  );

  const renderColumn = (col: typeof COLUMNS[number]) => {
    const colStories = filtered.filter((s) => s.status === col.id);
    const overLimit = col.limit > 0 && colStories.length > col.limit;

    return (
      <div
        key={col.id}
        className={cn(
          "flex-1 min-w-[240px] rounded-lg p-2 transition-colors",
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
        </div>
        <div className="space-y-2 min-h-[60px]">
          {colStories.map(renderCard)}
        </div>
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
      </div>
    );
  };

  return (
    <div className="mt-4 space-y-4 relative">
      {/* Confetti overlay */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-6xl animate-scale-in">🎉</div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={sprintId ?? "none"} onValueChange={(v) => setSelectedSprintId(v === "none" ? undefined : v)}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Sprint" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin sprint</SelectItem>
            {sprints?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} {s.status === "active" ? "⚡" : ""}</SelectItem>)}
          </SelectContent>
        </Select>

        {selectedSprint && daysLeft !== null && (
          <span className="text-xs text-muted-foreground">
            {format(new Date(selectedSprint.start_date!), "dd MMM", { locale: es })} → {format(new Date(selectedSprint.end_date!), "dd MMM", { locale: es })} · {daysLeft}d restantes
          </span>
        )}

        <div className="flex-1" />

        <Select value={filterAssigned} onValueChange={setFilterAssigned}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Asignado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {members?.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.profiles?.full_name || m.profiles?.email}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterEpic} onValueChange={setFilterEpic}>
          <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Épica" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {epics?.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
          </SelectContent>
        </Select>
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

        <Button size="sm" variant={viewMode === "board" ? "default" : "outline"} onClick={() => setViewMode("board")} className="h-8 text-xs">Tablero</Button>
        <Button size="sm" variant={viewMode === "swimlane" ? "default" : "outline"} onClick={() => setViewMode("swimlane")} className="h-8 text-xs">
          <Users className="h-3.5 w-3.5 mr-1" />Por Miembro
        </Button>
      </div>

      {/* Board / Swimlane */}
      {!sprintId ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          Selecciona un sprint para ver el tablero. {!activeSprint && "No hay sprints activos."}
        </Card>
      ) : viewMode === "board" ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map(renderColumn)}
        </div>
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
    </div>
  );
}
