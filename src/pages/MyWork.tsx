import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useTimeLogs } from "@/hooks/useTimeLogs";
import { ManualTimeLogModal } from "@/components/timer/ManualTimeLogModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getWeekRange(offset: number) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day === 0 ? 7 : day) - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: monday.toISOString().split("T")[0], to: sunday.toISOString().split("T")[0], monday };
}

export default function MyWork() {
  const { profile } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const week = getWeekRange(weekOffset);
  const { data: logs } = useTimeLogs(undefined, profile?.id, week);

  const weekDays = useMemo(() => {
    const days: string[] = [];
    const d = new Date(week.monday);
    for (let i = 0; i < 7; i++) {
      days.push(new Date(d).toISOString().split("T")[0]);
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [week.monday.toISOString()]);

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

  const chartData = Object.entries(projectMap).map(([, v]) => ({ name: v.name, horas: Math.round(v.total * 100) / 100 }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Mi Trabajo</h1>
        <Button onClick={() => setShowManual(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Registrar tiempo</Button>
      </div>

      <Tabs defaultValue="time">
        <TabsList><TabsTrigger value="time">Tiempo</TabsTrigger></TabsList>

        <TabsContent value="time" className="space-y-4">
          {/* Week navigation */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(o => o - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium">{week.from} — {week.to}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(o => o + 1)}><ChevronRight className="h-4 w-4" /></Button>
            {weekOffset !== 0 && <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>Hoy</Button>}
          </div>

          {/* Weekly table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Proyecto</TableHead>
                    {DAY_NAMES.map((d, i) => <TableHead key={i} className="text-center w-16">{d}<br /><span className="text-[10px] text-muted-foreground">{weekDays[i]?.slice(5)}</span></TableHead>)}
                    <TableHead className="text-center w-16 font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(projectMap).map(([pid, p]) => (
                    <TableRow key={pid}>
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: p.color }} />
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

          {/* Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Horas por proyecto esta semana</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="horas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Recent logs */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />Registros recientes</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>HU/Tarea</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Descripción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.slice(0, 20).map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm">{l.log_date}</TableCell>
                      <TableCell className="text-sm">{l.projects?.name}</TableCell>
                      <TableCell className="text-sm">{l.user_stories ? `HU-${l.user_stories.story_number}` : l.tasks?.title || "—"}</TableCell>
                      <TableCell className="text-sm font-medium">{l.hours}h</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-40 truncate">{l.description || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(!logs || logs.length === 0) && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin registros</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ManualTimeLogModal open={showManual} onOpenChange={setShowManual} />
    </div>
  );
}
