import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  useIncident, useUpdateIncident, useIncidentNotes, useCreateIncidentNote,
  useIncidentHistory, useCreateIncidentHistory, useIncidentAttachments, useSlaConfigs,
  STATUSES, SEVERITIES, STATUS_TRANSITIONS,
  getStatusInfo, getSeverityInfo, getCategoryLabel,
} from "@/hooks/useIncidents";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { X, Send, ArrowRight, Link2, Download, Calendar, FileText, Image as ImageIcon } from "lucide-react";

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

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
  const { data: attachments } = useIncidentAttachments(incidentId ?? undefined);
  const { data: slaConfigs } = useSlaConfigs();

  const [noteText, setNoteText] = useState("");
  const [noteTab, setNoteTab] = useState("conversation");
  const [suspendReason, setSuspendReason] = useState("");
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [storySearch, setStorySearch] = useState("");

  const { data: members } = useQuery({
    queryKey: ["project-members-detail", incident?.project_id],
    queryFn: async () => {
      if (!incident?.project_id) return [];
      const { data } = await supabase.from("project_members")
        .select("user_id, project_role, profiles:profiles(id, full_name, email, avatar_url, role)")
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

  const changeField = async (field: string, value: any) => {
    const oldValue = (incident as any)[field];
    await updateIncident.mutateAsync({ id: incident.id, [field]: value } as any);
    if (profile) {
      createHistory.mutate({ incident_id: incident.id, user_id: profile.id, field_name: field, old_value: String(oldValue ?? ""), new_value: String(value ?? "") });
    }
  };

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
    if (newStatus === "revision" && !incident.reviewed_by) {
      updates.reviewed_by = user?.id;
      updates.reviewed_at = new Date().toISOString();
    }

    await updateIncident.mutateAsync({ id: incident.id, ...updates });
    if (profile) {
      createHistory.mutate({ incident_id: incident.id, user_id: profile.id, field_name: "status", old_value: incident.status, new_value: newStatus });
    }

    // Notify creator on status changes
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

  const saveEvaluation = async (field: string, value: any) => {
    const updates: any = { [field]: value };
    if (field === "severity" && value === "no_aplica") {
      updates.is_requirement = true;
    }
    if (field === "severity" && value !== "no_aplica") {
      updates.is_requirement = false;
    }
    // Auto-move to revision on first evaluation
    if (incident.status === "pendiente" && (field === "severity" || field === "assigned_to")) {
      updates.status = "revision";
      updates.reviewed_by = user?.id;
      updates.reviewed_at = new Date().toISOString();
    }
    await updateIncident.mutateAsync({ id: incident.id, ...updates });
    if (profile) {
      createHistory.mutate({ incident_id: incident.id, user_id: profile.id, field_name: field, old_value: String((incident as any)[field] ?? ""), new_value: String(value ?? "") });
    }
    // Notify creator when severity is assigned
    if (field === "severity" && incident.created_by && incident.created_by !== user?.id) {
      await supabase.from("notifications").insert({
        user_id: incident.created_by,
        title: "📋 Tu incidente ha sido evaluado",
        message: `Severidad asignada: ${value} | ${incident.ticket_code}`,
        type: "incident",
        reference_id: incident.id,
        reference_type: "incident",
      });
    }
  };

  const addNote = async () => {
    if (!noteText.trim() || !profile) return;
    const isInternal = noteTab === "internal";
    await createNote.mutateAsync({ incident_id: incident.id, user_id: profile.id, content: noteText, is_internal: isInternal });
    // Notify involved parties
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

  const convertToBug = async () => {
    const { data, error } = await supabase.from("user_stories").insert({
      project_id: incident.project_id,
      title: `[Bug] ${incident.title}`,
      description: `**Descripción:** ${incident.description || ""}\n\n**Pasos:** ${incident.steps_to_reproduce || "N/A"}\n\n**Esperado:** ${incident.expected_result || "N/A"}\n\n**Actual:** ${incident.actual_result || "N/A"}`,
      type: "bug",
      priority: incident.severity === "critica" ? "critical" : incident.severity === "alta" ? "high" : incident.severity === "baja" ? "low" : "medium",
      status: "backlog",
      created_by: profile?.id,
    }).select("id, story_number").single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await updateIncident.mutateAsync({ id: incident.id, linked_user_story_id: data.id } as any);
    toast({ title: `Bug HU-${data.story_number} creado en el backlog` });
    qc.invalidateQueries({ queryKey: ["user-stories"] });
  };

  const linkStory = async (storyId: string) => {
    await updateIncident.mutateAsync({ id: incident.id, linked_user_story_id: storyId } as any);
    setShowLinkDialog(false);
    toast({ title: "HU vinculada" });
  };

  // SLA suggestion
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

  // Client can approve closure
  const isCreator = incident.created_by === user?.id;
  const showApproveClose = isCreator && incident.status === "listo_para_cerrar";

  return (
    <>
      <Sheet open={!!incidentId} onOpenChange={open => { if (!open) onClose(); }}>
        <SheetContent className="w-[700px] sm:max-w-[700px] overflow-y-auto p-0">
          <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SheetTitle className="font-mono text-lg">{incident.ticket_code}</SheetTitle>
                <Badge className={sevInfo.color}>
                  {incident.is_requirement ? "Requerimiento" : sevInfo.label}
                </Badge>
                <Badge className={statusInfo.color}>{statusInfo.icon} {statusInfo.label}</Badge>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
            </div>
          </SheetHeader>

          <div className="p-4 space-y-6">
            {/* Approve close banner for creator */}
            {showApproveClose && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-yellow-800">✅ Este incidente está listo para cerrar</p>
                  <p className="text-sm text-yellow-700">El equipo completó la solución. ¿Apruebas el cierre?</p>
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
            {(attachments ?? []).length > 0 && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">ARCHIVOS ADJUNTOS</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {(attachments ?? []).map((a: any) => (
                      <div key={a.id} className="flex items-center gap-2 p-2 border rounded-lg">
                        {a.file_type === "image" ? <ImageIcon className="h-4 w-4 text-blue-500" /> : <FileText className="h-4 w-4 text-orange-500" />}
                        <span className="text-xs flex-1 truncate">{a.file_name}</span>
                        <span className="text-xs text-muted-foreground">{a.file_size ? `${(a.file_size / 1024 / 1024).toFixed(1)}MB` : ""}</span>
                        <a href={a.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-3 w-3 text-muted-foreground hover:text-foreground" /></a>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* Evaluation Section - Managers Only */}
            {canManage && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">EVALUACIÓN</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Severidad</label>
                      <Select value={incident.severity || "none"} onValueChange={v => saveEvaluation("severity", v === "none" ? null : v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Sin evaluar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin evaluar</SelectItem>
                          {SEVERITIES.map(s => <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Asignar a</label>
                      <Select value={incident.assigned_to || "none"} onValueChange={v => saveEvaluation("assigned_to", v === "none" ? null : v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin asignar</SelectItem>
                          {members?.filter((m: any) => ["developer", "qa", "team_lead"].includes(m.profiles?.role)).map((m: any) => (
                            <SelectItem key={m.user_id} value={m.user_id}>{m.profiles?.full_name || m.profiles?.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <Switch checked={incident.is_requirement} onCheckedChange={v => {
                        if (v) saveEvaluation("severity", "no_aplica");
                        else saveEvaluation("is_requirement", false);
                      }} />
                      <Label className="text-sm">Clasificar como Requerimiento</Label>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    <label className="text-xs text-muted-foreground">Fecha estimada de resolución</label>
                    <Input type="date" value={incident.resolution_date || ""} onChange={e => saveEvaluation("resolution_date", e.target.value || null)} />
                    {getSlaDate() && !incident.resolution_date && (
                      <p className="text-xs text-blue-600">
                        <Calendar className="inline h-3 w-3 mr-1" />
                        Sugerido según SLA ({incident.severity}): {getSlaDate()}
                        <Button variant="link" size="sm" className="text-xs h-auto p-0 ml-1" onClick={() => saveEvaluation("resolution_date", getSlaDate())}>Aplicar</Button>
                      </p>
                    )}
                  </div>
                </section>
              </>
            )}

            {/* Status Management - Managers Only */}
            {canManage && incident.status !== "cerrado" && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">GESTIÓN DE ESTADO</h3>
                  <div className="flex flex-wrap gap-2">
                    {allowedTransitions.map(s => {
                      const si = getStatusInfo(s);
                      const disabled = s === "cerrado" && !canClose;
                      return (
                        <Button key={s} size="sm" variant="outline" disabled={disabled} onClick={() => handleStatusChange(s)}
                          className={disabled ? "opacity-50" : ""}>
                          {si.icon} {si.label}
                        </Button>
                      );
                    })}
                  </div>
                  {incident.suspension_reason && incident.status === "suspendido" && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <span className="font-medium">Motivo de suspensión:</span> {incident.suspension_reason}
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={convertToBug}>
                      <ArrowRight className="h-3 w-3 mr-1" /> Convertir a Bug
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowLinkDialog(true)}>
                      <Link2 className="h-3 w-3 mr-1" /> Vincular HU
                    </Button>
                  </div>
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
                  {(history ?? []).map((h: any) => (
                    <div key={h.id} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{h.profiles?.full_name || "Sistema"}</span>{" "}
                      cambió <span className="font-medium">{h.field_name}</span>{" "}
                      de "{h.old_value || "—"}" a "{h.new_value || "—"}"{" "}
                      <span>— {timeAgo(h.created_at)}</span>
                    </div>
                  ))}
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
              <button key={s.id} className="w-full text-left p-2 rounded hover:bg-muted text-sm flex items-center gap-2" onClick={() => linkStory(s.id)}>
                <Badge variant="outline" className="text-xs">HU-{s.story_number}</Badge>
                <span className="truncate">{s.title}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
