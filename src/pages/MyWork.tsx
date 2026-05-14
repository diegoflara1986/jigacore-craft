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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend } from "recharts";
import { usePermissions } from "@/hooks/usePermissions";

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

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

  const weekDays = useMemo(() => {
    const days: string[] = [];
    const start = new Date(dateFrom);
    const d = new Date(start);
    for (let i = 0; i < 7; i++) {
      days.push(new Date(d).toISOString().split("T")[0]);
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [dateFrom]);

  const projectMap = useMemo(() => {
    const map: Record<string, { name: string; color: string; days: Record<string, number>; total: number }> = {};
    logs?.forEach(l => {
      const pid = l.project_id;
      if (!map[pid]) map[pid] = { name: l.projects?.name ?? "Proyecto", color: l.projects?.color ?? "#1E3A5F", days: {}, total: 0 };
      map[pid].days[l.log_date] = (map[pid].days[l.log_date] || 0) + l.hours;
      map[pid].total += l.hours;
    });
    return map;
  }, [logs]);

  const dayTotals = weekDays.map(d => Object.values(projectMap).reduce((sum, p) => sum + (p.days[d] || 0), 0));
  const weekTotal = dayTotals.reduce((a, b) => a + b, 0);

  const chartData = weekDays.map((d, i) => {
    const entry: any = { name: DAY_NAMES[i] };
    Object.entries(projectMap).forEach(([_pid, p]) => {
      entry[p.name] = p.days[d] || 0;
    });
    return entry;
  });

  const projectColors = Object.values(projectMap).map(p => p.color);
  const projectNames = Object.values(projectMap).map(p => p.name);

  const totalHours = useMemo(() => logs?.reduce((a, l) => a + l.hours, 0) ?? 0, [logs]);
  const totalRegistros = logs?.length ?? 0;
  const activeProjects = useMemo(() => new Set(logs?.map(l => l.project_id) ?? []).size, [logs]);

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

      {Object.keys(projectMap).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Horas por día — Total: {weekTotal.toFixed(1)}h</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={8} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label="8h" />
                {projectNames.map((name, i) => (
                  <Bar key={name} dataKey={name} stackId="a" fill={projectColors[i] || "hsl(var(--primary))"} radius={i === projectNames.length - 1 ? [4, 4, 0, 0] : undefined} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Proyecto</TableHead>
                {DAY_NAMES.map((d, i) => (
                  <TableHead key={i} className="text-center w-16">{d}<br /><span className="text-[10px] text-muted-foreground">{weekDays[i]?.slice(5)}</span></TableHead>
                ))}
                <TableHead className="text-center w-16 font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(projectMap).map(([pid, p]) => (
                <TableRow key={pid}>
                  <TableCell className="font-medium text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </div>
                  </TableCell>
                  {weekDays.map((d, i) => <TableCell key={i} className="text-center text-sm">{p.days[d] ? p.days[d].toFixed(1) : "—"}</TableCell>)}
                  <TableCell className="text-center font-bold text-sm">{p.total.toFixed(1)}</TableCell>
                </TableRow>
              ))}
              {Object.keys(projectMap).length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Sin registros esta semana</TableCell></TableRow>
              )}
              {Object.keys(projectMap).length > 0 && (
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>Total</TableCell>
                  {dayTotals.map((t, i) => <TableCell key={i} className="text-center text-sm">{t > 0 ? t.toFixed(1) : "—"}</TableCell>)}
                  <TableCell className="text-center">{weekTotal.toFixed(1)}h</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />Registros detallados</CardTitle></CardHeader>
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
              {logs?.map(l => (
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
              {(!logs || logs.length === 0) && (
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
