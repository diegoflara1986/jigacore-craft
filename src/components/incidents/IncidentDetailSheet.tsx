import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useIncident, useUpdateIncident, useIncidentNotes, useCreateIncidentNote, useIncidentHistory, useCreateIncidentHistory } from "@/hooks/useIncidents";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { X, Send, ArrowRight, Link2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATUSES = ["nuevo", "asignado", "en revisión", "en desarrollo", "en qa", "resuelto", "cerrado"];
const STATUS_COLORS: Record<string, string> = {
  nuevo: "bg-gray-200 text-gray-800", asignado: "bg-blue-100 text-blue-800",
  "en revisión": "bg-yellow-100 text-yellow-800", "en desarrollo": "bg-orange-100 text-orange-800",
  "en qa": "bg-purple-100 text-purple-800", resuelto: "bg-green-100 text-green-800",
  cerrado: "bg-gray-400 text-white",
};
const SEV_COLORS: Record<string, string> = {
  critica: "bg-red-100 text-red-800", alta: "bg-orange-100 text-orange-800",
  media: "bg-yellow-100 text-yellow-800", baja: "bg-green-100 text-green-800",
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export function IncidentDetailSheet({ incidentId, onClose }: { incidentId: string | null; onClose: () => void }) {
  const { profile } = useAuth();
  const { data: incident } = useIncident(incidentId ?? undefined);
  const updateIncident = useUpdateIncident();
  const { data: notes } = useIncidentNotes(incidentId ?? undefined);
  const createNote = useCreateIncidentNote();
  const { data: history } = useIncidentHistory(incidentId ?? undefined);
  const createHistory = useCreateIncidentHistory();
  const qc = useQueryClient();

  const [noteText, setNoteText] = useState("");
  const [noteTab, setNoteTab] = useState("internal");
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [storySearch, setStorySearch] = useState("");

  const { data: members } = useQuery({
    queryKey: ["workspace-members-detail"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email, avatar_url");
      return data ?? [];
    },
    enabled: !!incidentId,
  });

  const { data: attachments } = useQuery({
    queryKey: ["incident-attachments", incident?.ticket_code],
    queryFn: async () => {
      if (!incident?.ticket_code) return [];
      const { data } = await supabase.storage.from("incident-attachments").list(incident.ticket_code);
      return (data ?? []).map(f => ({
        name: f.name,
        url: supabase.storage.from("incident-attachments").getPublicUrl(`${incident.ticket_code}/${f.name}`).data.publicUrl,
      }));
    },
    enabled: !!incident?.ticket_code,
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

  const changeField = async (field: string, value: string | null) => {
    const oldValue = (incident as any)[field];
    await updateIncident.mutateAsync({ id: incident.id, [field]: value } as any);
    if (profile) {
      createHistory.mutate({ incident_id: incident.id, user_id: profile.id, field_name: field, old_value: oldValue ?? null, new_value: value });
    }
  };

  const addNote = async () => {
    if (!noteText.trim() || !profile) return;
    await createNote.mutateAsync({ incident_id: incident.id, user_id: profile.id, content: noteText, is_internal: noteTab === "internal" });
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

  const internalNotes = (notes ?? []).filter((n: any) => n.is_internal);
  const clientNotes = (notes ?? []).filter((n: any) => !n.is_internal);

  return (
    <>
      <Sheet open={!!incidentId} onOpenChange={open => { if (!open) onClose(); }}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto p-0">
          <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SheetTitle className="font-mono text-lg">{incident.ticket_code}</SheetTitle>
                <Badge className={SEV_COLORS[incident.severity] || ""}>{incident.severity}</Badge>
                <Badge className={STATUS_COLORS[incident.status] || ""}>{incident.status}</Badge>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
            </div>
          </SheetHeader>

          <div className="p-4 space-y-6">
            {/* Info */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">INFORMACIÓN DEL REPORTE</h3>
              <h2 className="text-lg font-bold mb-2">{incident.title}</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Reportado por:</span> {incident.reporter_name || "—"} ({incident.reported_by_email || "—"})</div>
                <div><span className="text-muted-foreground">Fecha:</span> {new Date(incident.created_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}</div>
                <div><span className="text-muted-foreground">Proyecto:</span> {incident.projects?.name}</div>
                <div><span className="text-muted-foreground">Categoría:</span> {incident.category || "—"}</div>
                <div><span className="text-muted-foreground">Versión:</span> {incident.version || "—"}</div>
                <div><span className="text-muted-foreground">Navegador:</span> {incident.browser_info || "—"}</div>
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
            {attachments && attachments.length > 0 && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">ARCHIVOS ADJUNTOS</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {attachments.map((a, i) => (
                      <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden border hover:ring-2 ring-primary transition-all">
                        <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </section>
              </>
            )}

            <Separator />

            {/* Management */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">GESTIÓN INTERNA</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Estado</label>
                  <Select value={incident.status} onValueChange={v => changeField("status", v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Asignar a</label>
                  <Select value={incident.assigned_to || "none"} onValueChange={v => changeField("assigned_to", v === "none" ? null : v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {members?.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={convertToBug}>
                  <ArrowRight className="h-3 w-3 mr-1" /> Convertir a Bug en Backlog
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowLinkDialog(true)}>
                  <Link2 className="h-3 w-3 mr-1" /> Vincular con HU
                </Button>
              </div>
            </section>

            <Separator />

            {/* Communication */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">COMUNICACIÓN</h3>
              <Tabs value={noteTab} onValueChange={setNoteTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="internal" className="flex-1">Notas Internas</TabsTrigger>
                  <TabsTrigger value="client" className="flex-1">Mensajes al Cliente</TabsTrigger>
                </TabsList>
                <TabsContent value="internal" className="mt-3 space-y-3">
                  {internalNotes.map((n: any) => (
                    <div key={n.id} className="flex gap-2 text-sm">
                      <Avatar className="h-6 w-6 mt-0.5"><AvatarFallback className="text-xs">{(n.profiles?.full_name || "U")[0]}</AvatarFallback></Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2"><span className="font-medium text-xs">{n.profiles?.full_name || n.profiles?.email}</span><span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span></div>
                        <p className="text-sm mt-0.5">{n.content}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input placeholder="Agregar nota interna..." value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === "Enter" && addNote()} />
                    <Button size="icon" onClick={addNote}><Send className="h-4 w-4" /></Button>
                  </div>
                </TabsContent>
                <TabsContent value="client" className="mt-3 space-y-3">
                  {clientNotes.map((n: any) => (
                    <div key={n.id} className="flex gap-2 text-sm">
                      <Avatar className="h-6 w-6 mt-0.5"><AvatarFallback className="text-xs">{(n.profiles?.full_name || "U")[0]}</AvatarFallback></Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2"><span className="font-medium text-xs">{n.profiles?.full_name || n.profiles?.email}</span><span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span></div>
                        <p className="text-sm mt-0.5">{n.content}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input placeholder="Enviar mensaje al cliente..." value={noteTab === "client" ? noteText : ""} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === "Enter" && addNote()} />
                    <Button size="icon" onClick={addNote}><Send className="h-4 w-4" /></Button>
                  </div>
                </TabsContent>
              </Tabs>
            </section>

            <Separator />

            {/* History */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">HISTORIAL DE CAMBIOS</h3>
              {!(history ?? []).length ? (
                <p className="text-xs text-muted-foreground">Sin cambios registrados</p>
              ) : (
                <div className="space-y-2">
                  {(history ?? []).map((h: any) => (
                    <div key={h.id} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{h.profiles?.full_name || h.profiles?.email || "Sistema"}</span>{" "}
                      cambió <span className="font-medium">{h.field_name}</span> de "{h.old_value || "—"}" a "{h.new_value || "—"}"{" "}
                      <span>- {timeAgo(h.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </SheetContent>
      </Sheet>

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
