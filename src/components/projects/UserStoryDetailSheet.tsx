import { useEffect, useState, useRef } from "react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { Trash2, Plus, X, Copy, Lock, Unlock, Upload, FileText, Image as ImageIcon, Video, Download, MoreVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

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
  { value: "qa", label: "En QA" },
  { value: "done", label: "Completado" },
];

const ALLOWED_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png", "image/jpeg", "image/webp", "video/mp4"];
const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg", "webp", "mp4"];
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_FILES = 5;

interface Props {
  storyId: string | null;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epics: EpicWithProgress[];
  members: ProjectMember[];
  readOnly?: boolean;
  isInActiveSprint?: boolean;
}

export function UserStoryDetailSheet({ storyId, projectId, open, onOpenChange, epics, members, readOnly = false, isInActiveSprint = false }: Props) {
  const { data: story, isLoading } = useUserStory(storyId ?? undefined);
  const updateStory = useUpdateUserStory();
  const deleteStory = useDeleteUserStory();
  const createStory = useCreateUserStory();
  const { profile, user } = useAuth();
  const { hasPermission, baseRole } = usePermissions();
  const canEditPerm = hasPermission("backlog", "editar");
  const canDeletePerm = hasPermission("backlog", "eliminar");
  const canDuplicatePerm = hasPermission("backlog", "duplicar");
  const canBloquear = hasPermission("backlog", "bloquear");
  const canDesbloquear = hasPermission("backlog", "desbloquear");
  const qc = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showAdminOverride, setShowAdminOverride] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>([]);
  const [newCriterion, setNewCriterion] = useState("");
  const [commentText, setCommentText] = useState("");

  // Determine if story is in active sprint
  const { data: sprints } = useQuery({
    queryKey: ["sprints", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("sprints").select("id, name, status").eq("project_id", projectId).order("created_at");
      return data ?? [];
    },
  });

  const storyInActiveSprint = isInActiveSprint || (story?.sprint_id ? sprints?.find(s => s.id === story.sprint_id)?.status === "active" : false);
  // Only super_admin can bypass the active sprint lock. Tener permisos totales en backlog
  // NO permite editar campos estructurales mientras la HU está en un sprint activo.
  const isAdmin = baseRole === "super_admin";
  const isBlocked = (story as any)?.is_blocked === true;
  const isDone = story?.status === "done";
  // Lógica de bloqueo por prioridad:
  // 1. is_blocked: bloquea todo, incluso admins. Solo quien tiene "desbloquear" puede quitarlo.
  // 2. status done: bloquea todo sin excepción.
  // 3. sprint activo: bloquea campos estructurales pero permite estado, asignado y comentarios.
  const hardLocked = isBlocked || isDone;
  const sprintLocked = storyInActiveSprint && !isAdmin;
  const effectiveReadOnly = readOnly || !canEditPerm || hardLocked || sprintLocked;
  // sprintEditableOnly: campos que sí se pueden editar en sprint activo (estado, asignado, comentarios)
  const sprintEditableOnly = !hardLocked && storyInActiveSprint && !isAdmin;

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

  // Attachments
  const { data: attachments, refetch: refetchAttachments } = useQuery({
    queryKey: ["hu-attachments", storyId],
    queryFn: async () => {
      if (!storyId) return [];
      const { data } = await supabase
        .from("hu_attachments")
        .select("*")
        .eq("user_story_id", storyId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!storyId,
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
    if (hardLocked) return false;
    if (!canDeletePerm) return false;
    if (story.status === "done") return false;
    if (storyInActiveSprint && !isAdmin) return false;
    return true;
  };

  const getDeleteBlockReason = () => {
    if (!story) return "";
    if (story.status === "done") return "No se puede eliminar una HU completada.";
    if (storyInActiveSprint) return "No se puede eliminar una HU que está en un sprint activo.";
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
    toast({ title: "Historia duplicada" });
  };

  // File upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !storyId || !profile) return;
    const currentCount = attachments?.length ?? 0;
    if (currentCount + files.length > MAX_FILES) {
      toast({ title: "Máximo 5 archivos permitidos", variant: "destructive" });
      return;
    }

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
        toast({ title: `Formato .${ext} no permitido`, variant: "destructive" });
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: `${file.name} supera 15MB`, variant: "destructive" });
        continue;
      }

      const filePath = `${projectId}/${storyId}/${Date.now()}_${file.name}`;
      setUploadProgress(p => ({ ...p, [file.name]: 0 }));

      const { error } = await supabase.storage.from("hu-attachments").upload(filePath, file);
      if (error) {
        toast({ title: "Error al subir", description: error.message, variant: "destructive" });
        setUploadProgress(p => { const n = { ...p }; delete n[file.name]; return n; });
        continue;
      }

      const fileType = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "document";
      await supabase.from("hu_attachments").insert({
        user_story_id: storyId,
        file_name: file.name,
        file_url: filePath,
        file_type: fileType,
        file_size: file.size,
        uploaded_by: profile.id,
      });

      setUploadProgress(p => { const n = { ...p }; delete n[file.name]; return n; });
    }
    refetchAttachments();
  };

  const handleDeleteAttachment = async (att: any) => {
    await supabase.storage.from("hu-attachments").remove([att.file_url]);
    await supabase.from("hu_attachments").delete().eq("id", att.id);
    refetchAttachments();
  };

  const handleDownloadAttachment = async (att: any) => {
    const { data } = await supabase.storage.from("hu-attachments").createSignedUrl(att.file_url, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const getFileIcon = (type: string) => {
    if (type === "image") return <ImageIcon className="h-4 w-4 text-blue-500" />;
    if (type === "video") return <Video className="h-4 w-4 text-purple-500" />;
    return <FileText className="h-4 w-4 text-orange-500" />;
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
              {/* Sprint lock banner */}
              {storyInActiveSprint && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400 text-sm mb-2">
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>🔒 HU en sprint activo. Solo puedes cambiar estado, asignado y comentarios.</span>
                </div>
              )}
              {isBlocked && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400 text-sm mb-2">
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>🔒 Historia bloqueada. Solo un usuario con permiso de desbloquear puede editarla.</span>
                </div>
              )}
              {isDone && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-500/10 border border-gray-500/30 text-gray-600 dark:text-gray-400 text-sm mb-2">
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>✅ Historia completada. No se puede modificar.</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-popover">
                    {canDuplicatePerm && (
                      <DropdownMenuItem onClick={handleDuplicate}>
                        <Copy className="h-4 w-4 mr-2" /> Duplicar
                      </DropdownMenuItem>
                    )}
                    {(canBloquear || canDesbloquear) && <DropdownMenuSeparator />}
                    {canBloquear && !isBlocked && !isDone && (
                      <DropdownMenuItem onClick={() => saveField("is_blocked", true)}>
                        <Lock className="h-4 w-4 mr-2 text-yellow-500" /> Bloquear historia
                      </DropdownMenuItem>
                    )}
                    {canDesbloquear && isBlocked && (
                      <DropdownMenuItem onClick={() => saveField("is_blocked", false)}>
                        <Unlock className="h-4 w-4 mr-2 text-green-500" /> Desbloquear historia
                      </DropdownMenuItem>
                    )}
                    {(canDelete() || (storyInActiveSprint && isAdmin)) && canDuplicatePerm && (
                      <DropdownMenuSeparator />
                    )}
                    {(canDelete() || (storyInActiveSprint && isAdmin)) && (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={handleDeleteClick}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {storyInActiveSprint && isAdmin ? "Eliminar (Admin)" : "Eliminar"}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <span className="text-sm text-muted-foreground ml-2">{TYPES.find(t => t.value === story.type)?.label}</span>
                {storyInActiveSprint && <Lock className="h-3.5 w-3.5 text-blue-500" />}
              </div>
              <Input value={title} onChange={(e) => !effectiveReadOnly && setTitle(e.target.value)} onBlur={saveTitle}
                className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0 shadow-none" readOnly={effectiveReadOnly} />
            </SheetHeader>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6">
              {/* Left side */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Descripción</Label>
                  {effectiveReadOnly ? (
                    <Tooltip><TooltipTrigger asChild>
                      <Textarea value={description} rows={4} readOnly className="cursor-not-allowed" />
                    </TooltipTrigger>
                    {sprintLocked && <TooltipContent>No editable durante sprint activo</TooltipContent>}
                    </Tooltip>
                  ) : (
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} onBlur={saveDescription}
                      rows={4} placeholder="Como [rol] quiero [acción] para [beneficio]" />
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Criterios de Aceptación</Label>
                  <div className="space-y-1.5">
                    {acceptanceCriteria.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 group">
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm text-foreground flex-1">{c}</span>
                        {!effectiveReadOnly && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeCriterion(i)}>
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {!effectiveReadOnly && (
                    <div className="flex gap-2">
                      <Input value={newCriterion} onChange={(e) => setNewCriterion(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addCriterion()}
                        placeholder="Agregar criterio..." className="h-8 text-sm" />
                      <Button size="sm" variant="outline" onClick={addCriterion} className="h-8"><Plus className="h-3 w-3" /></Button>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Comments - always editable even in sprint */}
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
                  {!readOnly && (
                    <div className="flex gap-2">
                      <Input value={commentText} onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addComment()}
                        placeholder="Escribe un comentario..." className="h-8 text-sm" />
                      <Button size="sm" onClick={addComment} className="h-8" disabled={!commentText.trim()}>Enviar</Button>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Attachments */}
                <div className="space-y-3">
                  <Label className="text-xs text-muted-foreground">Archivos Adjuntos ({attachments?.length ?? 0}/{MAX_FILES})</Label>
                  
                  {/* Existing attachments */}
                  {(attachments ?? []).length > 0 && (
                    <div className="space-y-2">
                      {attachments!.map((att: any) => (
                        <div key={att.id} className="flex items-center gap-2 p-2 border border-border rounded-lg">
                          {getFileIcon(att.file_type)}
                          <span className="text-xs flex-1 truncate text-foreground">{att.file_name}</span>
                          <span className="text-xs text-muted-foreground">{att.file_size ? `${(att.file_size / 1024 / 1024).toFixed(1)}MB` : ""}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownloadAttachment(att)}>
                            <Download className="h-3 w-3" />
                          </Button>
                          {(att.uploaded_by === profile?.id || isAdmin) && !readOnly && !hardLocked && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteAttachment(att)}>
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload progress */}
                  {Object.entries(uploadProgress).map(([name, pct]) => (
                    <div key={name} className="flex items-center gap-2 p-2 border border-border rounded-lg">
                      <Upload className="h-4 w-4 text-muted-foreground animate-pulse" />
                      <span className="text-xs flex-1 truncate">{name}</span>
                      <span className="text-xs text-muted-foreground">Subiendo...</span>
                    </div>
                  ))}

                  {/* Drop zone */}
                  {!readOnly && !effectiveReadOnly && (attachments?.length ?? 0) < MAX_FILES && (
                    <div
                      className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-accent transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-accent"); }}
                      onDragLeave={(e) => e.currentTarget.classList.remove("border-accent")}
                      onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-accent"); handleFileUpload(e.dataTransfer.files); }}
                    >
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Arrastra archivos aquí o haz clic para seleccionar</p>
                      <p className="text-xs text-muted-foreground mt-1">Máximo {MAX_FILES} archivos · 15MB por archivo · PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, WEBP, MP4</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        multiple
                        accept={ALLOWED_EXTENSIONS.map(e => `.${e}`).join(",")}
                        onChange={(e) => handleFileUpload(e.target.files)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Right sidebar */}
              <div className="space-y-4">
                {/* Estado - always editable in sprint */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Estado</Label>
                  <Select value={story.status} onValueChange={(v) => {
                    if (v === "done") {
                      setShowCompleteConfirm(true);
                    } else {
                      saveField("status", v);
                    }
                  }} disabled={hardLocked || readOnly || !canEditPerm}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {/* Prioridad - locked in sprint */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Prioridad</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Select value={story.priority} onValueChange={(v) => saveField("priority", v)} disabled={effectiveReadOnly}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </TooltipTrigger>
                    {sprintLocked && <TooltipContent>No editable durante sprint activo</TooltipContent>}
                  </Tooltip>
                </div>

                {/* Tipo - locked in sprint */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Tipo</Label>
                  <Select value={story.type} onValueChange={(v) => saveField("type", v)} disabled={effectiveReadOnly}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {/* Story Points - locked in sprint */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Story Points</Label>
                  <Input type="number" className="h-8 text-xs" value={story.story_points ?? ""}
                    onChange={(e) => !effectiveReadOnly && saveField("story_points", e.target.value ? parseInt(e.target.value) : null)} min={0} readOnly={effectiveReadOnly} />
                </div>

                {/* Épica - locked in sprint */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Épica</Label>
                  <Select value={story.epic_id || "none"} onValueChange={(v) => saveField("epic_id", v === "none" ? null : v)} disabled={effectiveReadOnly}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin épica</SelectItem>
                      {epics.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sprint - locked in sprint */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Sprint</Label>
                  <Select value={story.sprint_id || "none"} onValueChange={(v) => saveField("sprint_id", v === "none" ? null : v)} disabled={effectiveReadOnly}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin sprint</SelectItem>
                      {sprints?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Asignado - always editable in sprint */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Asignado a</Label>
                  <Select value={story.assigned_to || "none"} onValueChange={(v) => saveField("assigned_to", v === "none" ? null : v)} disabled={hardLocked || readOnly || !canEditPerm}>
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

    {/* Delete confirmation */}
    <ConfirmDeleteDialog
      open={showDeleteConfirm}
      onOpenChange={setShowDeleteConfirm}
      onConfirm={handleDeleteConfirm}
      title="¿Eliminar historia de usuario?"
      description={`Se eliminarán también sus subtareas, comentarios y registros de tiempo. La historia "${story?.title}" será marcada como eliminada.`}
    />

    {/* Complete confirmation */}
    <Dialog open={showCompleteConfirm} onOpenChange={setShowCompleteConfirm}>
      <DialogContent>
        <DialogHeader><DialogTitle>¿Marcar como Completado?</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Una vez completada, la historia "{story?.title}" quedará bloqueada y no se podrá editar ni mover. ¿Está seguro?
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCompleteConfirm(false)}>Cancelar</Button>
          <Button onClick={() => { saveField("status", "done"); setShowCompleteConfirm(false); }}>Completar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
