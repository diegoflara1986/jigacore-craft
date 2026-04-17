import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  useIncident, useUpdateIncident, useIncidentNotes, useCreateIncidentNote,
  useIncidentHistory, useCreateIncidentHistory, useIncidentAttachments, useSlaConfigs,
  useIncidentGeneratedStories, useIncidentLinkedStories,
  useClassifyIncident, useLinkStoryToIncident, useUnlinkStoryFromIncident,
  useDuplicateIncident, useReopenIncident, useDeleteIncident,
  STATUSES, SEVERITIES, STATUS_TRANSITIONS,
  getStatusInfo, getSeverityInfo, getCategoryLabel,
} from "@/hooks/useIncidents";
import { usePermissions } from "@/hooks/usePermissions";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { X, Send, Link2, Download, Calendar, FileText, Image as ImageIcon, Upload, MoreVertical, Save, Trash2, Copy, RotateCcw } from "lucide-react";

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

const getStatusLabel = (value: string) => {
  const found = STATUSES.find(s => s.value === value);
  return found ? `${found.icon} ${found.label}` : value;
};


interface Props {
  incidentId: string | null;
  onClose: () => void;
  canManage: boolean;
  canClose: boolean;
}

export function IncidentDetailSheet({ incidentId, onClose, canManage, canClose }: Props) {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const { data: incident } = useIncident(incidentId ?? undefined);
  const updateIncident = useUpdateIncident();
  const { data: notes } = useIncidentNotes(incidentId ?? undefined);
  const createNote = useCreateIncidentNote();
  const { data: history } = useIncidentHistory(incidentId ?? undefined);
  const createHistory = useCreateIncidentHistory();
  const { data: attachments, refetch: refetchAttachments } = useIncidentAttachments(incidentId ?? undefined);
  const { data: slaConfigs } = useSlaConfigs();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const classifyIncident = useClassifyIncident();
  const linkStory = useLinkStoryToIncident();
  const unlinkStory = useUnlinkStoryFromIncident();
  const duplicateIncident = useDuplicateIncident();
  const reopenIncident = useReopenIncident();
  const deleteIncident = useDeleteIncident();

  const { data: generatedStories } = useIncidentGeneratedStories(incidentId ?? undefined);
  const { data: linkedStories } = useIncidentLinkedStories(incidentId ?? undefined);

  const { hasPermission } = usePermissions();
  const canDelete = hasPermission("incidentes", "eliminar");
  const canDuplicate = hasPermission("incidentes", "duplicar");
  const canReopen = hasPermission("incidentes", "reabrir");

  const [noteText, setNoteText] = useState("");
  const [noteTab, setNoteTab] = useState("conversation");
  const [suspendReason, setSuspendReason] = useState("");
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [storySearch, setStorySearch] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [evaluation, setEvaluation] = useState({
    severity: "",
    assigned_to: "",
    classification: "sin_clasificar",
    resolution_date: "",
  });
  const [evaluationDirty, setEvaluationDirty] = useState(false);

  // Reset evaluation state when incident changes
  useEffect(() => {
    if (incident) {
      // Determine initial classification from generated stories
      const existingClassification = (generatedStories ?? []).find(
        (gs: any) => gs.classification === "bug" || gs.classification === "requerimiento"
      )?.classification;
      setEvaluation({
        severity: incident.severity || "",
        assigned_to: incident.assigned_to || "",
        classification: existingClassification || "sin_clasificar",
        resolution_date: incident.resolution_date || "",
      });
      setEvaluationDirty(false);
    }
  }, [incident?.id, generatedStories]);

  const { data: members } = useQuery({
    queryKey: ["project-members-detail", incident?.project_id],
    queryFn: async () => {
      if (!incident?.project_id) return [];
      const { data } = await supabase.from("project_members")
        .select("user_id, project_role, profile:profiles(id, full_name, email, avatar_url)")
        .eq("project_id", incident.project_id);
      return data ?? [];
    },
    enabled: !!incident?.project_id,
  });

  const { data: stories } = useQuery({
    queryKey: ["stories-for-link", incident?.project_id, storySearch],
    queryFn: async () => {
      if (!incident?.project_id) return [];
      let q = supabase.from("user_stories").select("id, title, story_number, type").eq("project_id", incident.project_id).is("deleted_at", null).limit(20);
      if (storySearch) q = q.ilike("title", `%${storySearch}%`);
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!incident?.project_id && showLinkDialog,
  });

  if (!incident) return null;

  const statusInfo = getStatusInfo(incident.status);
  const sevInfo = getSeverityInfo(incident.severity);
  const allowedTransitions = STATUS_TRANSITIONS[incident.status] ?? [];

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === "suspendido") {
      setPendingStatus(newStatus);
      setShowSuspendDialog(true);
      return;
    }
    if (newStatus === "cerrado" && !canClose) {
      toast({ title: "No tienes permiso para cerrar incidentes", variant: "destructive" });
      return;
    }

    const updates: any = { status: newStatus };
    if (newStatus === "cerrado") updates.closed_at = new Date().toISOString();
    if (newStatus === "en_revision" && !incident.reviewed_by) {
      updates.reviewed_by = user?.id;
      updates.reviewed_at = new Date().toISOString();
    }

    await updateIncident.mutateAsync({ id: incident.id, ...updates });
    if (profile) {
      createHistory.mutate({ incident_id: incident.id, user_id: profile.id, field_name: "status", old_value: incident.status, new_value: newStatus });
    }

    if (incident.created_by && incident.created_by !== user?.id) {
      const statusLabel = STATUSES.find(s => s.value === newStatus)?.label ?? newStatus;
      await supabase.from("notifications").insert({
        user_id: incident.created_by,
        title: newStatus === "listo_para_cerrar" ? "✅ Tu incidente está listo para cerrar" : `Estado actualizado: ${statusLabel}`,
        message: `Incidente ${incident.ticket_code}: ${incident.title}`,
        type: "incident",
        reference_id: incident.id,
        reference_type: "incident",
      });
    }
  };

  const confirmSuspend = async () => {
    if (!suspendReason.trim()) {
      toast({ title: "El motivo de suspensión es requerido", variant: "destructive" });
      return;
    }
    await updateIncident.mutateAsync({ id: incident.id, status: "suspendido", suspension_reason: suspendReason } as any);
    if (profile) {
      createHistory.mutate({ incident_id: incident.id, user_id: profile.id, field_name: "status", old_value: incident.status, new_value: "suspendido" });
    }
    setShowSuspendDialog(false);
    setSuspendReason("");
  };

  const saveEvaluation = async () => {
    if (!incident) return;

    const updates: any = {
      severity: evaluation.severity || null,
      assigned_to: evaluation.assigned_to || null,
      resolution_date: evaluation.resolution_date || null,
    };

    if (incident.status === "sin_evaluar" && (evaluation.severity || evaluation.assigned_to)) {
      updates.status = "en_revision";
      updates.reviewed_by = user?.id;
      updates.reviewed_at = new Date().toISOString();
    }

    await updateIncident.mutateAsync({ id: incident.id, ...updates });

    const existingClassification = (generatedStories ?? []).find(
      (gs: any) => gs.classification === "bug" || gs.classification === "requerimiento"
    )?.classification;

    if (
      evaluation.classification !== existingClassification &&
      evaluation.classification !== "sin_clasificar"
    ) {
      await classifyIncident.mutateAsync({
        incidentId: incident.id,
        classification: evaluation.classification as "bug" | "requerimiento",
        projectId: incident.project_id,
        incidentTitle: incident.title,
        incidentDescription: incident.description || "",
        severity: evaluation.severity,
        userId: user?.id!,
      });
    }

    if (evaluation.assigned_to && evaluation.assigned_to !== incident.assigned_to) {
      const assignee = members?.find((m: any) => m.user_id === evaluation.assigned_to);
      if (assignee?.profile?.id) {
        await supabase.from("notifications").insert({
          user_id: assignee.profile.id,
          title: "📋 Se te asignó un incidente",
          message: `${incident.ticket_code}: ${incident.title}`,
          type: "incident",
          reference_id: incident.id,
          reference_type: "incident",
        });
      }
    }

    if (profile) {
      createHistory.mutate({
        incident_id: incident.id,
        user_id: profile.id,
        field_name: "evaluacion",
        old_value: "",
        new_value: "Evaluación guardada",
      });
    }

    setEvaluationDirty(false);
    toast({ title: "Evaluación guardada correctamente" });
  };

  const handleDuplicate = async () => {
    if (!incident || !user) return;
    const result = await duplicateIncident.mutateAsync({
      incident,
      userId: user.id,
    });
    toast({ title: `Incidente duplicado: ${result.ticket_code}` });
    onClose();
  };

  const handleReopen = async () => {
    if (!incident || !user || !profile) return;
    await reopenIncident.mutateAsync({
      incidentId: incident.id,
      userId: user.id,
      profileId: profile.id,
    });
    if (profile) {
      createHistory.mutate({
        incident_id: incident.id,
        user_id: profile.id,
        field_name: "status",
        old_value: "cerrado",
        new_value: "en_revision",
      });
    }
    toast({ title: "Incidente reabierto" });
  };

  const handleDelete = async () => {
    if (!incident) return;
    await deleteIncident.mutateAsync(incident.id);
    toast({ title: "Incidente eliminado" });
    onClose();
  };

  const addNote = async () => {
    if (!noteText.trim() || !profile) return;
    const isInternal = noteTab === "internal";
    await createNote.mutateAsync({ incident_id: incident.id, user_id: profile.id, content: noteText, is_internal: isInternal });
    if (!isInternal && incident.created_by && incident.created_by !== user?.id) {
      await supabase.from("notifications").insert({
        user_id: incident.created_by,
        title: "💬 Nuevo comentario en tu incidente",
        message: `${incident.ticket_code}: ${noteText.slice(0, 100)}`,
        type: "incident",
        reference_id: incident.id,
        reference_type: "incident",
      });
    }
    setNoteText("");
  };

  const handleLinkStory = async (storyId: string) => {
    if (!user) return;
    await linkStory.mutateAsync({
      incidentId: incident.id,
      userStoryId: storyId,
      linkedBy: user.id,
    });
    setShowLinkDialog(false);
    toast({ title: "HU vinculada" });
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !profile || !incident) return;
    for (const file of Array.from(files)) {
      if (file.size > 15 * 1024 * 1024) {
        toast({ title: `${file.name} supera 15MB`, variant: "destructive" });
        continue;
      }
      const filePath = `${incident.ticket_code}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("incident-attachments").upload(filePath, file);
      if (error) {
        toast({ title: "Error al subir", description: error.message, variant: "destructive" });
        continue;
      }
      const fileType = file.type.startsWith("image/") ? "image" : "document";
      await supabase.from("incident_attachments").insert({
        incident_id: incident.id,
        file_name: file.name,
        file_url: filePath,
        file_type: fileType,
        file_size: file.size,
        uploaded_by: profile.id,
      });
    }
    refetchAttachments();
  };

  const getSlaDate = () => {
    if (!incident.severity || incident.severity === "no_aplica" || !slaConfigs?.length) return null;
    const sla = slaConfigs.find((s: any) => s.severity === incident.severity);
    if (!sla) return null;
    const date = new Date(incident.created_at);
    date.setHours(date.getHours() + sla.resolution_hours);
    return date.toISOString().split("T")[0];
  };

  const conversationNotes = (notes ?? []).filter((n: any) => !n.is_internal);
  const internalNotes = (notes ?? []).filter((n: any) => n.is_internal);

  const isCreator = incident.created_by === user?.id;
  const showApproveClose = isCreator && incident.status === "listo_para_cerrar";
  const showActionsMenu = canDuplicate || canReopen || canDelete;

  return (
    <>
      <Sheet open={!!incidentId} onOpenChange={open => { if (!open) onClose(); }}>
        <SheetContent className="w-[700px] sm:max-w-[700px] overflow-y-auto p-0">
          <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SheetTitle className="font-mono text-lg">{incident.ticket_code}</SheetTitle>
                <Badge className={sevInfo.color}>
                  {sevInfo.label}
                </Badge>
                <Badge className={statusInfo.color}>{statusInfo.icon} {statusInfo.label}</Badge>
              </div>
              <div className="flex items-center gap-1">
                {showActionsMenu && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-popover">
                      {canDuplicate && (
                        <DropdownMenuItem onClick={handleDuplicate}>
                          <Copy className="h-4 w-4 mr-2" /> Duplicar incidente
                        </DropdownMenuItem>
                      )}
                      {canReopen && incident.status === "cerrado" && (
                        <DropdownMenuItem onClick={handleReopen}>
                          <RotateCcw className="h-4 w-4 mr-2" /> Reabrir incidente
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setShowDeleteConfirm(true)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar incidente
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
              </div>
            </div>
          </SheetHeader>

          <div className="p-4 space-y-6">
            {showApproveClose && (
              <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-400">✅ Este incidente está listo para cerrar</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-500">El equipo completó la solución. ¿Apruebas el cierre?</p>
                </div>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleStatusChange("cerrado")}>
                  Aprobar Cierre
                </Button>
              </div>
            )}

            {/* Info Section */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">INFORMACIÓN DEL REPORTE</h3>
              <h2 className="text-lg font-bold mb-2">{incident.title}</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Reportado por:</span> {incident.creator_profile?.full_name || incident.reporter_name || "—"}</div>
                <div><span className="text-muted-foreground">Fecha:</span> {new Date(incident.created_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}</div>
                <div><span className="text-muted-foreground">Proyecto:</span> {incident.projects?.name}</div>
                <div><span className="text-muted-foreground">Categoría:</span> {getCategoryLabel(incident.category)}</div>
              </div>
            </section>

            <Separator />

            {/* Description */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">DESCRIPCIÓN</h3>
              <p className="text-sm whitespace-pre-wrap">{incident.description || "Sin descripción"}</p>
              {incident.steps_to_reproduce && (
                <div className="mt-3"><h4 className="text-xs font-semibold text-muted-foreground">Pasos para reproducir</h4><p className="text-sm whitespace-pre-wrap mt-1">{incident.steps_to_reproduce}</p></div>
              )}
              {(incident.expected_result || incident.actual_result) && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div><h4 className="text-xs font-semibold text-muted-foreground">Resultado esperado</h4><p className="text-sm mt-1">{incident.expected_result || "—"}</p></div>
                  <div><h4 className="text-xs font-semibold text-muted-foreground">Resultado actual</h4><p className="text-sm mt-1">{incident.actual_result || "—"}</p></div>
                </div>
              )}
            </section>

            {/* Attachments */}
            <Separator />
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">ARCHIVOS ADJUNTOS</h3>
              {(attachments ?? []).length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {(attachments ?? []).map((a: any) => (
                    <div key={a.id} className="flex items-center gap-2 p-2 border border-border rounded-lg">
                      {a.file_type === "image" ? <ImageIcon className="h-4 w-4 text-blue-500" /> : <FileText className="h-4 w-4 text-orange-500" />}
                      <span className="text-xs flex-1 truncate">{a.file_name}</span>
                      <span className="text-xs text-muted-foreground">{a.file_size ? `${(a.file_size / 1024 / 1024).toFixed(1)}MB` : ""}</span>
                      <a href={a.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-3 w-3 text-muted-foreground hover:text-foreground" /></a>
                    </div>
                  ))}
                </div>
              )}

              {canManage && (
                <div
                  className="border-2 border-dashed border-border rounded-lg min-h-[120px] flex flex-col items-center justify-center cursor-pointer transition-colors hover:border-accent hover:bg-accent/5 group"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-accent", "bg-accent/5"); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove("border-accent", "bg-accent/5"); }}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-accent", "bg-accent/5"); handleFileUpload(e.dataTransfer.files); }}
                >
                  <Upload className="h-8 w-8 text-muted-foreground group-hover:text-accent transition-colors mb-2" />
                  <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Haz clic aquí o arrastra archivos</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, PDF, DOC, MP4 · Máx 15MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.mp4"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                </div>
              )}
            </section>

            {/* Evaluation Section - Managers Only */}
            {canManage && (
              <>
                <Separator />
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">EVALUACIÓN</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Severidad</label>
                      <Select
                        value={evaluation.severity || "none"}
                        onValueChange={v => {
                          setEvaluation(prev => ({ ...prev, severity: v === "none" ? "" : v }));
                          setEvaluationDirty(true);
                        }}
                      >
                        <SelectTrigger className="h-9"><SelectValue placeholder="Sin evaluar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin evaluar</SelectItem>
                          {SEVERITIES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Asignar a</label>
                      <Select
                        value={evaluation.assigned_to || "none"}
                        onValueChange={v => {
                          setEvaluation(prev => ({ ...prev, assigned_to: v === "none" ? "" : v }));
                          setEvaluationDirty(true);
                        }}
                      >
                        <SelectTrigger className="h-9"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin asignar</SelectItem>
                          {members?.map((m: any) => (
                            <SelectItem key={m.user_id} value={m.user_id}>
                              {m.profile?.full_name || m.profile?.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Clasificación</label>
                    <Select
                      value={evaluation.classification}
                      onValueChange={v => {
                        setEvaluation(prev => ({ ...prev, classification: v }));
                        setEvaluationDirty(true);
                      }}
                    >
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sin_clasificar">Sin clasificar</SelectItem>
                        <SelectItem value="bug">🐛 Bug</SelectItem>
                        <SelectItem value="requerimiento">📋 Requerimiento</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Al guardar se creará una HU en el backlog del proyecto
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Fecha estimada de resolución</label>
                    <Input
                      type="date"
                      value={evaluation.resolution_date || ""}
                      onChange={e => {
                        setEvaluation(prev => ({ ...prev, resolution_date: e.target.value }));
                        setEvaluationDirty(true);
                      }}
                    />
                    {getSlaDate() && !evaluation.resolution_date && (
                      <p className="text-xs text-blue-600">
                        <Calendar className="inline h-3 w-3 mr-1" />
                        Sugerido por SLA: {getSlaDate()}
                        <Button
                          variant="link"
                          size="sm"
                          className="text-xs h-auto p-0 ml-1"
                          onClick={() => {
                            setEvaluation(prev => ({ ...prev, resolution_date: getSlaDate()! }));
                            setEvaluationDirty(true);
                          }}
                        >
                          Aplicar
                        </Button>
                      </p>
                    )}
                  </div>

                  {evaluationDirty && (
                    <Button onClick={saveEvaluation} className="w-full" disabled={updateIncident.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar evaluación
                    </Button>
                  )}
                </section>
              </>
            )}

            {/* Generated stories */}
            <Separator />
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">HISTORIAS GENERADAS</h3>
              {(!generatedStories || generatedStories.length === 0) ? (
                <p className="text-xs text-muted-foreground">No se han generado HU para este incidente</p>
              ) : (
                <div className="space-y-2">
                  {generatedStories.map((gs: any) => (
                    gs.user_story ? (
                      <div key={gs.id} className="flex items-center gap-2 p-2 border border-border rounded-lg">
                        <Badge variant="outline" className="font-mono text-xs">
                          HU-{gs.user_story.story_number}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {gs.classification === "bug" ? "🐛 Bug" : "📋 Req"}
                        </Badge>
                        <span className="text-sm truncate flex-1">{gs.user_story.title}</span>
                      </div>
                    ) : (
                      <div key={gs.id} className="flex items-center gap-2 p-2 border border-border rounded-lg opacity-60">
                        <span className="text-xs text-muted-foreground">
                          HU eliminada ({gs.classification === "bug" ? "Bug" : "Requerimiento"})
                        </span>
                      </div>
                    )
                  ))}
                </div>
              )}
            </section>

            {/* Linked stories */}
            <Separator />
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground">HU VINCULADAS</h3>
                {canManage && (
                  <Button size="sm" variant="outline" onClick={() => setShowLinkDialog(true)}>
                    <Link2 className="h-3 w-3 mr-1" /> Vincular HU
                  </Button>
                )}
              </div>
              {(!linkedStories || linkedStories.length === 0) ? (
                <p className="text-xs text-muted-foreground">Sin HU vinculadas manualmente</p>
              ) : (
                <div className="space-y-2">
                  {linkedStories.map((ls: any) => (
                    <div key={ls.id} className="flex items-center gap-2 p-2 border border-border rounded-lg">
                      <Badge variant="outline" className="font-mono text-xs">
                        HU-{ls.user_story?.story_number}
                      </Badge>
                      <span className="text-sm truncate flex-1">{ls.user_story?.title}</span>
                      {canManage && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => unlinkStory.mutate({
                            incidentId: incident.id,
                            userStoryId: ls.user_story_id,
                          })}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Status Management */}
            {canManage && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">GESTIÓN DE ESTADO</h3>
                  {incident.status !== "cerrado" && allowedTransitions.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Cambiar estado</label>
                      <Select
                        value={incident.status}
                        onValueChange={(newStatus) => {
                          if (newStatus === incident.status) return;
                          if (newStatus === "suspendido") {
                            setPendingStatus(newStatus);
                            setShowSuspendDialog(true);
                          } else {
                            handleStatusChange(newStatus);
                          }
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={incident.status} disabled>
                            {getStatusInfo(incident.status).icon} {getStatusInfo(incident.status).label} (actual)
                          </SelectItem>
                          {allowedTransitions.map(s => {
                            const si = getStatusInfo(s);
                            const disabled = s === "cerrado" && !canClose;
                            return (
                              <SelectItem key={s} value={s} disabled={disabled}>
                                {si.icon} {si.label}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {incident.status === "cerrado" && canReopen && (
                    <Button size="sm" variant="outline" onClick={handleReopen}>
                      <RotateCcw className="h-3 w-3 mr-1" /> Reabrir incidente
                    </Button>
                  )}
                  {incident.suspension_reason && incident.status === "suspendido" && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <span className="font-medium">Motivo:</span> {incident.suspension_reason}
                    </div>
                  )}
                </section>
              </>
            )}

            <Separator />

            {/* Comments */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">COMENTARIOS</h3>
              <Tabs value={noteTab} onValueChange={setNoteTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="conversation" className="flex-1">Conversación</TabsTrigger>
                  {canManage && <TabsTrigger value="internal" className="flex-1">Notas Internas</TabsTrigger>}
                </TabsList>
                <TabsContent value="conversation" className="mt-3 space-y-3">
                  {conversationNotes.length === 0 && <p className="text-xs text-muted-foreground">Sin comentarios aún</p>}
                  {conversationNotes.map((n: any) => (
                    <div key={n.id} className="flex gap-2 text-sm">
                      <Avatar className="h-6 w-6 mt-0.5"><AvatarFallback className="text-xs">{(n.profiles?.full_name || "U")[0]}</AvatarFallback></Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2"><span className="font-medium text-xs">{n.profiles?.full_name || n.profiles?.email}</span><span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span></div>
                        <p className="text-sm mt-0.5">{n.content}</p>
                      </div>
                    </div>
                  ))}
                  {incident.status !== "cerrado" && (
                    <div className="flex gap-2">
                      <Input placeholder="Agregar comentario..." value={noteTab === "conversation" ? noteText : ""} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === "Enter" && addNote()} />
                      <Button size="icon" onClick={addNote}><Send className="h-4 w-4" /></Button>
                    </div>
                  )}
                </TabsContent>
                {canManage && (
                  <TabsContent value="internal" className="mt-3 space-y-3">
                    {internalNotes.length === 0 && <p className="text-xs text-muted-foreground">Sin notas internas</p>}
                    {internalNotes.map((n: any) => (
                      <div key={n.id} className="flex gap-2 text-sm">
                        <Avatar className="h-6 w-6 mt-0.5"><AvatarFallback className="text-xs">{(n.profiles?.full_name || "U")[0]}</AvatarFallback></Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs">{n.profiles?.full_name || n.profiles?.email}</span>
                            <Badge variant="outline" className="text-[10px] h-4">Interno</Badge>
                            <span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                          </div>
                          <p className="text-sm mt-0.5">{n.content}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input placeholder="Agregar nota interna..." value={noteTab === "internal" ? noteText : ""} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === "Enter" && addNote()} />
                      <Button size="icon" onClick={addNote}><Send className="h-4 w-4" /></Button>
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </section>

            <Separator />

            {/* History */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">HISTORIAL</h3>
              {!(history ?? []).length ? (
                <p className="text-xs text-muted-foreground">Sin cambios registrados</p>
              ) : (
                <div className="space-y-2">
              {(history ?? []).map((h: any) => {
                const isStatus = h.field_name === "status";
                const oldValue = isStatus ? getStatusLabel(h.old_value) : (h.old_value || "—");
                const newValue = isStatus ? getStatusLabel(h.new_value) : (h.new_value || "—");
                return (
                  <div key={h.id} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{h.profiles?.full_name || "Sistema"}</span>{" "}
                    cambió <span className="font-medium">{h.field_name}</span>{" "}
                    de "{oldValue}" a "{newValue}"{" "}
                    <span>— {timeAgo(h.created_at)}</span>
                  </div>
                );
              })}
                </div>
              )}
            </section>
          </div>
        </SheetContent>
      </Sheet>

      {/* Suspend dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Motivo de Suspensión</DialogTitle></DialogHeader>
          <Textarea placeholder="Indica por qué se suspende este incidente..." value={suspendReason} onChange={e => setSuspendReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>Cancelar</Button>
            <Button onClick={confirmSuspend}>Confirmar Suspensión</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link story dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vincular con Historia de Usuario</DialogTitle></DialogHeader>
          <Input placeholder="Buscar HU..." value={storySearch} onChange={e => setStorySearch(e.target.value)} />
          <div className="max-h-[300px] overflow-y-auto space-y-1 mt-2">
            {stories?.map((s: any) => (
              <button key={s.id} className="w-full text-left p-2 rounded hover:bg-muted text-sm flex items-center gap-2" onClick={() => handleLinkStory(s.id)}>
                <Badge variant="outline" className="text-xs">HU-{s.story_number}</Badge>
                <span className="truncate">{s.title}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <ConfirmDeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title="Eliminar incidente"
        description={`Esta acción eliminará permanentemente el incidente ${incident.ticket_code} y todos sus datos asociados (comentarios, archivos, historial).`}
        requireTyping={incident.ticket_code || "ELIMINAR"}
        confirmText="Eliminar incidente"
      />
    </>
  );
}
