import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle, XCircle, Target, Copy, FileText } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useSprintRetrospective } from "@/hooks/useReportData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  sprints: any[];
  stories: any[];
  timeLogs: any[];
  members: any[];
  projectId?: string;
}

export function ReportSprintTab({ sprints, stories, timeLogs, members, projectId }: Props) {
  const [selectedSprintId, setSelectedSprintId] = useState<string>("");
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);
  const qc = useQueryClient();

  const sprint = sprints.find(s => s.id === selectedSprintId);
  const sprintStories = stories.filter(s => s.sprint_id === selectedSprintId);
  const completed = sprintStories.filter(s => s.status === "done");
  const incomplete = sprintStories.filter(s => s.status !== "done");
  const bugs = sprintStories.filter(s => s.type === "bug");

  const totalSP = sprintStories.reduce((a, s) => a + (s.story_points ?? 0), 0);
  const completedSP = completed.reduce((a, s) => a + (s.story_points ?? 0), 0);
  const fulfillment = totalSP > 0 ? Math.round((completedSP / totalSP) * 100) : 0;

  const { data: retro } = useSprintRetrospective(selectedSprintId || undefined);
  const [retroForm, setRetroForm] = useState({ went_well: "", to_improve: "", action_items: "" });

  // Sync retro data
  const currentRetro = {
    went_well: retroForm.went_well || retro?.went_well || "",
    to_improve: retroForm.to_improve || retro?.to_improve || "",
    action_items: retroForm.action_items || retro?.action_items || "",
  };

  const saveRetro = async () => {
    if (!selectedSprintId || !projectId) return;
    const payload = { sprint_id: selectedSprintId, project_id: projectId, ...retroForm, updated_at: new Date().toISOString() };
    if (retro?.id) {
      await supabase.from("sprint_retrospectives").update(retroForm).eq("id", retro.id);
    } else {
      await supabase.from("sprint_retrospectives").insert(payload as any);
    }
    qc.invalidateQueries({ queryKey: ["sprint-retro", selectedSprintId] });
    toast({ title: "Retrospectiva guardada" });
  };

  // Team metrics per member
  const teamMetrics = members.map((m: any) => {
    const profile = m.profiles;
    const memberStories = completed.filter(s => s.assigned_to === profile?.id);
    const memberSP = memberStories.reduce((a: number, s: any) => a + (s.story_points ?? 0), 0);
    const memberHours = timeLogs.filter(t => t.user_id === profile?.id && sprintStories.some((s: any) => s.id === t.user_story_id)).reduce((a: number, t: any) => a + (t.hours ?? 0), 0);
    return { name: profile?.full_name || profile?.email, sp: memberSP, tasks: memberStories.length, hours: Math.round(memberHours * 10) / 10 };
  });

  // Burndown
  let burndownData: any[] = [];
  if (sprint?.start_date && sprint?.end_date) {
    const start = new Date(sprint.start_date);
    const end = new Date(sprint.end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
    const remaining = totalSP - completedSP;
    for (let i = 0; i < days; i++) {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      const ideal = Math.max(Math.round(totalSP - (totalSP / (days - 1)) * i), 0);
      burndownData.push({
        dia: `Día ${i + 1}`,
        ideal,
        real: day <= new Date() ? (i === days - 1 ? remaining : undefined) : undefined,
      });
    }
    // simplified: set first and last real
    if (burndownData.length > 0) {
      burndownData[0].real = totalSP;
      const lastReal = burndownData.filter(d => d.dia).length;
      if (sprint.status === "completed") burndownData[burndownData.length - 1].real = totalSP - completedSP;
    }
  }

  const releaseNotes = completed.map(s => `- [HU-${s.story_number}] ${s.title}`).join("\n");

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { planning: "bg-muted text-muted-foreground", active: "bg-info/20 text-info", completed: "bg-success/20 text-success" };
    return <Badge className={map[status] || "bg-muted"}>{status === "planning" ? "Planificado" : status === "active" ? "Activo" : "Completado"}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
        <SelectTrigger className="max-w-md"><SelectValue placeholder="Selecciona un sprint" /></SelectTrigger>
        <SelectContent>
          {sprints.map(s => (
            <SelectItem key={s.id} value={s.id}>
              {s.name} {s.start_date && s.end_date ? `(${new Date(s.start_date).toLocaleDateString()} - ${new Date(s.end_date).toLocaleDateString()})` : ""} - {s.status === "completed" ? "Completado" : s.status === "active" ? "Activo" : "Planificado"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {sprint && (
        <>
          {/* Executive Summary */}
          <Card className="bg-info/5 border-info/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-lg font-semibold">{sprint.name}</h3>
                {statusBadge(sprint.status)}
              </div>
              {sprint.goal && <p className="text-sm text-muted-foreground mb-4">{sprint.goal}</p>}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><p className="text-xs text-muted-foreground">SP Comprometidos</p><p className="text-2xl font-bold">{totalSP}</p></div>
                <div><p className="text-xs text-muted-foreground">SP Completados</p><p className="text-2xl font-bold text-success">{completedSP}</p></div>
                <div><p className="text-xs text-muted-foreground">Cumplimiento</p><p className={`text-2xl font-bold ${fulfillment >= 80 ? "text-success" : fulfillment >= 60 ? "text-warning" : "text-destructive"}`}>{fulfillment}%</p></div>
                <div><p className="text-xs text-muted-foreground">Velocidad</p><p className="text-2xl font-bold text-info">{completedSP}</p></div>
              </div>
            </CardContent>
          </Card>

          {/* Completed Stories */}
          <Card>
            <CardHeader className="bg-success/10"><CardTitle className="text-base flex items-center gap-2"><CheckCircle className="h-4 w-4 text-success" /> HU Completadas ({completed.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Título</TableHead><TableHead>SP</TableHead><TableHead>Tipo</TableHead><TableHead>Asignado</TableHead><TableHead>Horas</TableHead></TableRow></TableHeader>
                <TableBody>
                  {completed.map(s => {
                    const hours = timeLogs.filter(t => t.user_story_id === s.id).reduce((a: number, t: any) => a + t.hours, 0);
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">HU-{s.story_number}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{s.title}</TableCell>
                        <TableCell>{s.story_points ?? "-"}</TableCell>
                        <TableCell><Badge variant="outline">{s.type}</Badge></TableCell>
                        <TableCell>{s.assigned_profile?.full_name || "-"}</TableCell>
                        <TableCell>{Math.round(hours * 10) / 10}h</TableCell>
                      </TableRow>
                    );
                  })}
                  {completed.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin HU completadas</TableCell></TableRow>}
                  {completed.length > 0 && (
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={2}>Total</TableCell><TableCell>{completedSP}</TableCell><TableCell colSpan={3} />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Incomplete Stories */}
          <Card>
            <CardHeader className="bg-destructive/10"><CardTitle className="text-base flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" /> HU No Completadas ({incomplete.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Título</TableHead><TableHead>SP</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
                <TableBody>
                  {incomplete.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">HU-{s.story_number}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{s.title}</TableCell>
                      <TableCell>{s.story_points ?? "-"}</TableCell>
                      <TableCell><Badge variant="outline">{s.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {incomplete.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Todas las HU completadas 🎉</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Bugs */}
          {bugs.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Bugs del Sprint ({bugs.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Título</TableHead><TableHead>Severidad</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {bugs.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">HU-{s.story_number}</TableCell>
                        <TableCell>{s.title}</TableCell>
                        <TableCell><Badge variant="outline">{s.priority}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{s.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Team Metrics */}
          <Card>
            <CardHeader><CardTitle className="text-base">Métricas del Equipo</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Miembro</TableHead><TableHead>SP Completados</TableHead><TableHead>Tareas</TableHead><TableHead>Horas</TableHead></TableRow></TableHeader>
                <TableBody>
                  {teamMetrics.filter(m => m.sp > 0 || m.tasks > 0 || m.hours > 0).map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarFallback className="text-xs">{(m.name || "?")[0]}</AvatarFallback></Avatar>{m.name}</TableCell>
                      <TableCell>{m.sp}</TableCell>
                      <TableCell>{m.tasks}</TableCell>
                      <TableCell>{m.hours}h</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Retrospective */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" /> Retrospectiva</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-success/5 border border-success/20 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">✅ ¿Qué salió bien?</p>
                <Textarea value={retroForm.went_well || retro?.went_well || ""} onChange={e => setRetroForm(p => ({ ...p, went_well: e.target.value }))} placeholder="Describe lo que salió bien..." rows={3} />
              </div>
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">❌ ¿Qué puede mejorar?</p>
                <Textarea value={retroForm.to_improve || retro?.to_improve || ""} onChange={e => setRetroForm(p => ({ ...p, to_improve: e.target.value }))} placeholder="Describe lo que se puede mejorar..." rows={3} />
              </div>
              <div className="bg-info/5 border border-info/20 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">🎯 Acciones para el próximo sprint</p>
                <Textarea value={retroForm.action_items || retro?.action_items || ""} onChange={e => setRetroForm(p => ({ ...p, action_items: e.target.value }))} placeholder="Acciones concretas..." rows={3} />
              </div>
              <Button onClick={saveRetro}>Guardar Retrospectiva</Button>
            </CardContent>
          </Card>

          {/* Burndown */}
          {burndownData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Burndown del Sprint</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={burndownData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="dia" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="ideal" stroke="hsl(199, 89%, 48%)" strokeDasharray="5 5" name="Ideal" dot={false} />
                    <Line type="monotone" dataKey="real" stroke="hsl(24, 95%, 53%)" name="Real" strokeWidth={2} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setReleaseNotesOpen(true)} className="gap-2"><FileText className="h-4 w-4" /> Generar Release Notes</Button>
          </div>

          <Dialog open={releaseNotesOpen} onOpenChange={setReleaseNotesOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Release Notes - {sprint.name}</DialogTitle></DialogHeader>
              <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap max-h-[400px] overflow-auto">{releaseNotes || "Sin HU completadas"}</pre>
              <Button onClick={() => { navigator.clipboard.writeText(releaseNotes); toast({ title: "Copiado al portapapeles" }); }} className="gap-2"><Copy className="h-4 w-4" /> Copiar</Button>
            </DialogContent>
          </Dialog>
        </>
      )}

      {!sprint && <div className="text-center text-muted-foreground py-12">Selecciona un sprint para ver el reporte</div>}
    </div>
  );
}
