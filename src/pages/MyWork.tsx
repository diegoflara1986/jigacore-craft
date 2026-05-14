import { useState, useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/lib/auth";
import { useTimeLogs, useDeleteTimeLog, useUpdateTimeLog } from "@/hooks/useTimeLogs";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ManualTimeLogModal } from "@/components/timer/ManualTimeLogModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Clock, Trash2, Check, Circle, Pencil } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { usePermissions } from "@/hooks/usePermissions";

export default function MyWork() {
  usePageTitle("Mi Trabajo");
  const { profile } = useAuth();
  const { hasPermission } = usePermissions();
  const canDeleteTiempo = hasPermission("tiempo", "eliminar");
  const canEditTiempo = hasPermission("tiempo", "editar");
  const canAprobarTiempo = hasPermission("tiempo", "aprobar");
  const [showManual, setShowManual] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const { data: logs } = useTimeLogs(undefined, profile?.id, { from: dateFrom, to: dateTo });
  const deleteTL = useDeleteTimeLog();
  const updateTL = useUpdateTimeLog();
  const queryClient = useQueryClient();
  const [editingLog, setEditingLog] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  void updateTL;

  const toggleApprove = async (logId: string, currentApproved: boolean) => {
    const sb = supabase as any;
    await sb.from("time_logs").update({ approved: !currentApproved }).eq("id", logId);
    queryClient.invalidateQueries({ queryKey: ["time-logs"] });
    if (!currentApproved) {
      const logData = logs?.find(l => l.id === logId);
      if (logData && logData.user_id !== profile?.id) {
        try {
          await supabase.from("notifications").insert({
            user_id: logData.user_id,
            type: "time_approved",
            title: "✅ Tu registro de tiempo fue aprobado",
            message: `${logData.hours}h del ${logData.log_date} fueron aprobadas`,
            reference_id: logId,
            reference_type: "time_log",
          });
        } catch {}
      }
    }
  };

  const availableProjects = useMemo(() => {
    const map = new Map<string, string>();
    logs?.forEach(l => { if (l.projects?.name) map.set(l.project_id, l.projects.name); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (selectedProject === "all") return logs ?? [];
    return (logs ?? []).filter(l => l.project_id === selectedProject);
  }, [logs, selectedProject]);

  const projectChartData = useMemo(() => {
    const map: Record<string, { name: string; horas: number }> = {};
    filteredLogs.forEach(l => {
      const name = l.projects?.name ?? "Sin proyecto";
      if (!map[l.project_id]) map[l.project_id] = { name, horas: 0 };
      map[l.project_id].horas += l.hours;
    });
    return Object.values(map).sort((a, b) => b.horas - a.horas);
  }, [filteredLogs]);

  const totalHours = useMemo(() => filteredLogs.reduce((a, l) => a + l.hours, 0), [filteredLogs]);
  const totalRegistros = filteredLogs.length;
  const activeProjects = useMemo(() => new Set(filteredLogs.map(l => l.project_id)).size, [filteredLogs]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Mi Trabajo</h1>
        <p className="text-sm text-muted-foreground">Hola {profile?.full_name || "Usuario"}, aquí está tu resumen de hoy</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="py-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalHours.toFixed(1)}h</p>
          <p className="text-xs text-muted-foreground">Horas registradas</p>
        </CardContent></Card>
        <Card><CardContent className="py-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalRegistros}</p>
          <p className="text-xs text-muted-foreground">Registros</p>
        </CardContent></Card>
        <Card><CardContent className="py-4 text-center">
          <p className="text-2xl font-bold text-foreground">{activeProjects}</p>
          <p className="text-xs text-muted-foreground">Proyectos activos</p>
        </CardContent></Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm">Desde</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border rounded px-2 py-1 text-sm bg-background" />
          <span className="text-sm">Hasta</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border rounded px-2 py-1 text-sm bg-background" />
        </div>
        <Button onClick={() => setShowManual(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Agregar registro manual</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Horas por proyecto</CardTitle></CardHeader>
        <CardContent>
          {projectChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={projectChartData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${v}h`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={140} />
                <Tooltip formatter={(v: number) => [`${v}h`, "Horas"]} />
                <CartesianGrid strokeDasharray="3 3" />
                <Bar dataKey="horas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sin registros en el período</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />Registros detallados</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Proyecto:</span>
            <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
              className="border rounded px-2 py-1 text-sm bg-background">
              <option value="all">Todos los proyectos</option>
              {availableProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>HU/Tarea</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-sm">{l.log_date}</TableCell>
                  <TableCell className="text-sm">{l.projects?.name}</TableCell>
                  <TableCell className="text-sm">{l.user_stories ? `HU-${l.user_stories.story_number}` : l.tasks?.title || "—"}</TableCell>
                  <TableCell className="text-sm font-medium">{l.hours}h</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-40 truncate">{l.description || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {canAprobarTiempo && (
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => toggleApprove(l.id, (l as any).approved)}
                          title={(l as any).approved ? "Quitar aprobación" : "Aprobar registro"}>
                          {(l as any).approved
                            ? <Check className="h-3.5 w-3.5 text-green-600" />
                            : <Circle className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                      {canEditTiempo && !(l as any).approved && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingLog(l)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canDeleteTiempo && !(l as any).approved && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                          onClick={() => deleteTL.mutate(l.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sin registros</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ManualTimeLogModal open={showManual} onOpenChange={setShowManual} />
      <ManualTimeLogModal
        open={!!editingLog}
        onOpenChange={(open) => { if (!open) setEditingLog(null); }}
        editLog={editingLog || undefined}
        onUpdated={() => setEditingLog(null)}
      />
    </div>
  );
}
