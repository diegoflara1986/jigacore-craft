import { useEffect, useState } from "react";
import { useUserStory, useUpdateUserStory, useDeleteUserStory, useCreateUserStory } from "@/hooks/useUserStories";
import { EpicWithProgress } from "@/hooks/useEpics";
import { ProjectMember } from "@/hooks/useProjects";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { Trash2, Plus, X, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

const TYPES = [
  { value: "story", label: "📖 Historia" },
  { value: "bug", label: "🐛 Bug" },
  { value: "technical", label: "⚙️ Técnica" },
  { value: "spike", label: "🔍 Spike" },
  { value: "improvement", label: "✨ Mejora" },
];
const PRIORITIES = [
  { value: "critical", label: "Crítica" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Baja" },
];
const STATUSES = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "Por Hacer" },
  { value: "in_progress", label: "En Progreso" },
  { value: "in_review", label: "En Revisión" },
  { value: "done", label: "Completado" },
];

interface Props {
  storyId: string | null;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epics: EpicWithProgress[];
  members: ProjectMember[];
  readOnly?: boolean;
}

export function UserStoryDetailSheet({ storyId, projectId, open, onOpenChange, epics, members, readOnly = false }: Props) {
  const { data: story, isLoading } = useUserStory(storyId ?? undefined);
  const updateStory = useUpdateUserStory();
  const deleteStory = useDeleteUserStory();
  const createStory = useCreateUserStory();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>([]);
  const [newCriterion, setNewCriterion] = useState("");
  const [commentText, setCommentText] = useState("");

  // Comments
  const { data: comments } = useQuery({
    queryKey: ["story-comments", storyId],
    queryFn: async () => {
      if (!storyId) return [];
      const { data } = await supabase
        .from("comments")
        .select("*, profiles:user_id(id, full_name, email, avatar_url)")
        .eq("user_story_id", storyId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!storyId,
  });

  // Sprints
  const { data: sprints } = useQuery({
    queryKey: ["sprints", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("sprints").select("id, name, status").eq("project_id", projectId).order("created_at");
      return data ?? [];
    },
  });

  useEffect(() => {
    if (story) {
      setTitle(story.title);
      setDescription(story.description || "");
      try {
        const parsed = story.acceptance_criteria ? JSON.parse(story.acceptance_criteria) : [];
        setAcceptanceCriteria(Array.isArray(parsed) ? parsed : []);
      } catch {
        setAcceptanceCriteria(story.acceptance_criteria ? [story.acceptance_criteria] : []);
      }
    }
  }, [story]);

  const saveField = async (field: string, value: any) => {
    if (!story) return;
    await updateStory.mutateAsync({ id: story.id, [field]: value });
  };

  const saveTitle = () => { if (title.trim() && title !== story?.title) saveField("title", title); };
  const saveDescription = () => { if (description !== (story?.description ?? "")) saveField("description", description); };

  const addCriterion = () => {
    if (!newCriterion.trim()) return;
    const updated = [...acceptanceCriteria, newCriterion.trim()];
    setAcceptanceCriteria(updated);
    setNewCriterion("");
    saveField("acceptance_criteria", JSON.stringify(updated));
  };

  const removeCriterion = (idx: number) => {
    const updated = acceptanceCriteria.filter((_, i) => i !== idx);
    setAcceptanceCriteria(updated);
    saveField("acceptance_criteria", JSON.stringify(updated));
  };

  const addComment = async () => {
    if (!commentText.trim() || !profile || !storyId) return;
    await supabase.from("comments").insert({ content: commentText, user_id: profile.id, user_story_id: storyId });
    setCommentText("");
    qc.invalidateQueries({ queryKey: ["story-comments", storyId] });
  };

  const canDelete = () => {
    if (!story) return false;
    if (story.status === "done") return false;
    if (story.sprint_id) {
      const sprint = sprints?.find(s => s.id === story.sprint_id);
      if (sprint && (sprint as any).status === "active") return false;
    }
    return true;
  };

  const getDeleteBlockReason = () => {
    if (!story) return "";
    if (story.status === "done") return "No se puede eliminar una HU completada.";
    if (story.sprint_id) {
      const sprint = sprints?.find(s => s.id === story.sprint_id);
      if (sprint && (sprint as any).status === "active") return "No se puede eliminar una HU que está en un sprint activo.";
    }
    return "";
  };

  const handleDeleteClick = () => {
    if (!canDelete()) {
      toast({ title: "No permitido", description: getDeleteBlockReason(), variant: "destructive" });
      return;
    }
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!story) return;
    await deleteStory.mutateAsync({ id: story.id, projectId });
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  const handleDuplicate = async () => {
    if (!story) return;
    await createStory.mutateAsync({
      project_id: projectId,
      title: `${story.title} (copia)`,
      description: story.description,
      acceptance_criteria: story.acceptance_criteria,
      type: story.type,
      priority: story.priority,
      status: "backlog",
      epic_id: story.epic_id,
      assigned_to: story.assigned_to,
    });
  };
  const initials = (name: string | null) => name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  if (!open) return null;

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
        {isLoading || !story ? (
          <div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : (
          <div className="space-y-6">
            <SheetHeader>
              <div className="flex items-center gap-2">
                {!readOnly && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDeleteClick} title="Eliminar">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDuplicate} title="Duplicar">
                  <Copy className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground ml-2">{TYPES.find(t => t.value === story.type)?.label}</span>
              </div>
                <Input value={title} onChange={(e) => !readOnly && setTitle(e.target.value)} onBlur={saveTitle}
                  className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0 shadow-none" readOnly={readOnly} />
            </SheetHeader>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6">
              {/* Left side */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Descripción</Label>
                  <Textarea value={description} onChange={(e) => !readOnly && setDescription(e.target.value)} onBlur={saveDescription}
                    rows={4} placeholder="Como [rol] quiero [acción] para [beneficio]" readOnly={readOnly} />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Criterios de Aceptación</Label>
                  <div className="space-y-1.5">
                    {acceptanceCriteria.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 group">
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm text-foreground flex-1">{c}</span>
                        {!readOnly && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeCriterion(i)}>
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {!readOnly && (
                    <div className="flex gap-2">
                      <Input value={newCriterion} onChange={(e) => setNewCriterion(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addCriterion()}
                        placeholder="Agregar criterio..." className="h-8 text-sm" />
                      <Button size="sm" variant="outline" onClick={addCriterion} className="h-8"><Plus className="h-3 w-3" /></Button>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Comments */}
                <div className="space-y-3">
                  <Label className="text-xs text-muted-foreground">Comentarios ({comments?.length ?? 0})</Label>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {comments?.map((c: any) => (
                      <div key={c.id} className="flex gap-2">
                        <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                          <AvatarFallback className="text-[9px] bg-muted">{initials(c.profiles?.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-foreground">{c.profiles?.full_name || c.profiles?.email}</span>
                            <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString("es")}</span>
                          </div>
                          <p className="text-sm text-foreground">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input value={commentText} onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addComment()}
                      placeholder="Escribe un comentario..." className="h-8 text-sm" />
                    <Button size="sm" onClick={addComment} className="h-8" disabled={!commentText.trim()}>Enviar</Button>
                  </div>
                </div>
              </div>

              {/* Right sidebar */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Estado</Label>
                  <Select value={story.status} onValueChange={(v) => saveField("status", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Prioridad</Label>
                  <Select value={story.priority} onValueChange={(v) => saveField("priority", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Tipo</Label>
                  <Select value={story.type} onValueChange={(v) => saveField("type", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Story Points</Label>
                  <Input type="number" className="h-8 text-xs" value={story.story_points ?? ""}
                    onChange={(e) => saveField("story_points", e.target.value ? parseInt(e.target.value) : null)} min={0} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Épica</Label>
                  <Select value={story.epic_id || "none"} onValueChange={(v) => saveField("epic_id", v === "none" ? null : v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin épica</SelectItem>
                      {epics.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Sprint</Label>
                  <Select value={story.sprint_id || "none"} onValueChange={(v) => saveField("sprint_id", v === "none" ? null : v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin sprint</SelectItem>
                      {sprints?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Asignado a</Label>
                  <Select value={story.assigned_to || "none"} onValueChange={(v) => saveField("assigned_to", v === "none" ? null : v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.profiles?.full_name || m.profiles?.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>

    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar historia de usuario?</AlertDialogTitle>
          <AlertDialogDescription>
            La historia "{story?.title}" será marcada como eliminada. Podrás verla en el filtro de "Eliminadas" del backlog.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
