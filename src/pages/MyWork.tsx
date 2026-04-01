import { useState, useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/lib/auth";
import { useTimeLogs, useDeleteTimeLog } from "@/hooks/useTimeLogs";
import { ManualTimeLogModal } from "@/components/timer/ManualTimeLogModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Clock, ChevronLeft, ChevronRight, ChevronDown, Play, Trash2, AlertTriangle, Timer, CheckCircle2, MessageSquare, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTimer } from "@/hooks/useTimer";
import { cn } from "@/lib/utils";

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

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "ayer";
  return `hace ${days} días`;
}

export default function MyWork() {
  const { profile, user } = useAuth();
  const timer = useTimer();
  const [weekOffset, setWeekOffset] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const week = getWeekRange(weekOffset);
  const { data: logs } = useTimeLogs(undefined, profile?.id, week);
  const deleteTL = useDeleteTimeLog();
  const [showCompleted, setShowCompleted] = useState(false);

  // Fetch user's assigned stories/tasks
  const { data: myStories } = useQuery({
    queryKey: ["my-stories", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_stories")
        .select("*, projects(id, name, color), sprints(id, name)")
        .eq("assigned_to", user!.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const { data: myTasks } = useQuery({
    queryKey: ["my-tasks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, projects(id, name, color), user_stories(id, title, story_number)")
        .eq("assigned_to", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Activity feed
  const { data: recentComments } = useQuery({
    queryKey: ["my-comments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*, user_stories(id, title, story_number)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Group tasks by due date
  const today = new Date().toISOString().split("T")[0];
  const endOfWeek = (() => {
    const d = new Date();
    d.setDate(d.getDate() + (7 - d.getDay()));
    return d.toISOString().split("T")[0];
  })();

  const allItems = useMemo(() => {
    const items: any[] = [];
    myStories?.forEach(s => {
      items.push({
        id: s.id, type: s.type === "bug" ? "bug" : "story",
        label: `HU-${s.story_number}`, title: s.title,
        project: s.projects, sprint: s.sprints,
        priority: s.priority, storyPoints: s.story_points,
        dueDate: null, status: s.status, projectId: s.project_id,
      });
    });
    myTasks?.forEach(t => {
      items.push({
        id: t.id, type: "task", label: t.user_stories ? `HU-${t.user_stories.story_number}` : "",
        title: t.title, project: t.projects, sprint: null,
        priority: t.priority, storyPoints: null,
        dueDate: t.due_date, status: t.status, projectId: t.project_id,
      });
    });
    return items;
  }, [myStories, myTasks]);

  const activeItems = showCompleted ? allItems : allItems.filter(i => !["done", "completed"].includes(i.status));

  const overdue = activeItems.filter(i => i.dueDate && i.dueDate < today && !["done", "completed"].includes(i.status));
  const dueToday = activeItems.filter(i => i.dueDate === today && !["done", "completed"].includes(i.status));
  const thisWeek = activeItems.filter(i => i.dueDate && i.dueDate > today && i.dueDate <= endOfWeek && !["done", "completed"].includes(i.status));
  const upcoming = activeItems.filter(i => i.dueDate && i.dueDate > endOfWeek && !["done", "completed"].includes(i.status));
  const noDate = activeItems.filter(i => !i.dueDate && !["done", "completed"].includes(i.status));
  const inProgress = activeItems.filter(i => ["in_progress", "in_review", "in_qa"].includes(i.status));

  // Weekly time data
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

  const chartData = weekDays.map((d, i) => {
    const entry: any = { name: DAY_NAMES[i] };
    Object.entries(projectMap).forEach(([pid, p]) => {
      entry[p.name] = p.days[d] || 0;
    });
    return entry;
  });

  const projectColors = Object.values(projectMap).map(p => p.color);
  const projectNames = Object.values(projectMap).map(p => p.name);

  // Activity feed data
  const completedThisWeek = allItems.filter(i => ["done", "completed"].includes(i.status)).length;
  const commentsCount = recentComments?.length ?? 0;
  const spCompleted = allItems.filter(i => ["done", "completed"].includes(i.status)).reduce((s, i) => s + (i.storyPoints || 0), 0);

  const priorityColor = (p: string) => {
    switch (p) {
      case "critical": return "bg-destructive text-destructive-foreground";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-yellow-500 text-white";
      case "low": return "bg-green-500 text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const startTimerForItem = (item: any) => {
    timer.startTimer({
      projectId: item.projectId,
      projectName: item.project?.name ?? "Proyecto",
      storyId: item.type !== "task" ? item.id : undefined,
      storyLabel: item.label,
      description: item.title,
    });
  };

  const TaskSection = ({ title, icon, items, borderColor }: { title: string; icon: string; items: any[]; borderColor: string }) => {
    const [open, setOpen] = useState(true);
    if (items.length === 0) return null;
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:bg-muted/50 rounded px-2">
          <ChevronDown className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")} />
          <span>{icon}</span>
          <span className="font-semibold text-sm">{title}</span>
          <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className={cn("space-y-1 ml-2 border-l-2 pl-3", borderColor)}>
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-2 py-2 px-2 rounded hover:bg-muted/30 group">
                <span className="text-xs text-muted-foreground font-mono w-16 shrink-0">{item.label}</span>
                <span className="text-sm flex-1 truncate font-medium">{item.title}</span>
                {item.project && (
                  <Badge variant="outline" className="text-[10px] shrink-0" style={{ borderColor: item.project.color, color: item.project.color }}>
                    {item.project.name}
                  </Badge>
                )}
                {item.sprint && <Badge variant="secondary" className="text-[10px] shrink-0">{item.sprint.name}</Badge>}
                <Badge className={cn("text-[10px] shrink-0", priorityColor(item.priority))}>{item.priority}</Badge>
                {item.storyPoints && <span className="text-xs bg-muted rounded-full h-5 w-5 flex items-center justify-center shrink-0">{item.storyPoints}</span>}
                {item.dueDate && (
                  <span className={cn("text-[10px] shrink-0", item.dueDate < today ? "text-destructive font-bold" : item.dueDate === today ? "text-orange-500 font-bold" : "text-muted-foreground")}>
                    {item.dueDate}
                  </span>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={(e) => { e.stopPropagation(); startTimerForItem(item); }}>
                  <Play className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Mi Trabajo</h1>
        <p className="text-sm text-muted-foreground">Hola {profile?.full_name || "Usuario"}, aquí está tu resumen de hoy</p>
      </div>

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Mis Tareas</TabsTrigger>
          <TabsTrigger value="time">Tiempo Registrado</TabsTrigger>
          <TabsTrigger value="activity">Mi Actividad</TabsTrigger>
        </TabsList>

        {/* === TAB: MIS TAREAS === */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-destructive">{overdue.length}</p>
                <p className="text-xs text-muted-foreground">tareas vencidas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-orange-500">{dueToday.length}</p>
                <p className="text-xs text-muted-foreground">vencen hoy</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-primary">{inProgress.length}</p>
                <p className="text-xs text-muted-foreground">en progreso</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} className="rounded" />
              Mostrar completadas
            </label>
          </div>

          <Card>
            <CardContent className="py-4 space-y-1">
              <TaskSection title="Vencidas" icon="🔴" items={overdue} borderColor="border-destructive" />
              <TaskSection title="Vencen Hoy" icon="🟡" items={dueToday} borderColor="border-orange-500" />
              <TaskSection title="Esta Semana" icon="📅" items={thisWeek} borderColor="border-primary" />
              <TaskSection title="Próximamente" icon="📆" items={upcoming} borderColor="border-muted-foreground" />
              <TaskSection title="Sin Fecha" icon="📌" items={noDate} borderColor="border-muted" />
              {activeItems.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No tienes tareas asignadas</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === TAB: TIEMPO REGISTRADO === */}
        <TabsContent value="time" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(o => o - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium">Semana del {week.from} al {week.to}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(o => o + 1)}><ChevronRight className="h-4 w-4" /></Button>
              {weekOffset !== 0 && <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>Hoy</Button>}
            </div>
            <Button onClick={() => setShowManual(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Agregar registro manual</Button>
          </div>

          {/* Stacked bar chart */}
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

          {/* Weekly table */}
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

          {/* Recent logs grouped by day */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />Registros de la semana</CardTitle></CardHeader>
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
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteTL.mutate(l.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
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
        </TabsContent>

        {/* === TAB: MI ACTIVIDAD === */}
        <TabsContent value="activity" className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card><CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-foreground">{completedThisWeek}</p>
              <p className="text-xs text-muted-foreground">Tareas completadas</p>
            </CardContent></Card>
            <Card><CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-foreground">{commentsCount}</p>
              <p className="text-xs text-muted-foreground">Comentarios</p>
            </CardContent></Card>
            <Card><CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-foreground">{weekTotal.toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">Horas registradas</p>
            </CardContent></Card>
            <Card><CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-foreground">{spCompleted}</p>
              <p className="text-xs text-muted-foreground">Story Points</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" />Actividad reciente</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {/* Completed stories */}
              {allItems.filter(i => ["done", "completed"].includes(i.status)).slice(0, 5).map(item => (
                <div key={`done-${item.id}`} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p>Completaste <span className="font-medium">{item.label}: {item.title}</span></p>
                    <p className="text-xs text-muted-foreground">Proyecto: {item.project?.name}</p>
                  </div>
                </div>
              ))}
              {/* Comments */}
              {recentComments?.slice(0, 5).map(c => (
                <div key={`comment-${c.id}`} className="flex items-start gap-3 text-sm">
                  <MessageSquare className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                  <div>
                    <p>Comentaste en {c.user_stories ? `HU-${c.user_stories.story_number}` : "un elemento"}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</p>
                  </div>
                </div>
              ))}
              {/* Time logs */}
              {logs?.slice(0, 5).map(l => (
                <div key={`time-${l.id}`} className="flex items-start gap-3 text-sm">
                  <Timer className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p>Registraste <span className="font-medium">{l.hours}h</span> en {l.user_stories ? `HU-${l.user_stories.story_number}` : l.projects?.name}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(l.created_at)}</p>
                  </div>
                </div>
              ))}
              {completedThisWeek === 0 && commentsCount === 0 && (!logs || logs.length === 0) && (
                <p className="text-center text-muted-foreground py-6">Sin actividad reciente</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ManualTimeLogModal open={showManual} onOpenChange={setShowManual} />
    </div>
  );
}
