import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Zap, CheckCircle, Bug, Target, Briefcase, AlertTriangle, XOctagon } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, ReferenceLine } from "recharts";

interface Props {
  projects?: any[];
  stories: any[];
  sprints: any[];
  incidents: any[];
  timeLogs: any[];
  dateFrom?: string;
  dateTo?: string;
}

const STATUS_COLORS: Record<string, string> = {
  backlog: "hsl(215, 13%, 50%)",
  todo: "hsl(215, 13%, 65%)",
  in_progress: "hsl(199, 89%, 48%)",
  in_review: "hsl(38, 92%, 50%)",
  in_qa: "hsl(270, 60%, 55%)",
  done: "hsl(142, 71%, 45%)",
};

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "Por Hacer",
  in_progress: "En Progreso",
  in_review: "En Revisión",
  in_qa: "En QA",
  done: "Completado",
};

export function ReportDashboardTab({ projects, stories, sprints, incidents, timeLogs, dateFrom, dateTo }: Props) {
  // Metrics
  const completedStories = stories.filter(s => s.status === "done");
  const completedSP = completedStories.reduce((a, s) => a + (s.story_points ?? 0), 0);

  const completedSprints = sprints.filter(s => s.status === "completed");
  const avgVelocity = completedSprints.length > 0
    ? Math.round(completedSprints.reduce((sum, sp) => {
        const spStories = stories.filter(s => s.sprint_id === sp.id && s.status === "done");
        return sum + spStories.reduce((a, s) => a + (s.story_points ?? 0), 0);
      }, 0) / completedSprints.length)
    : 0;

  const resolvedIncidents = incidents.filter(i => i.status === "resuelto" || i.status === "cerrado").length;

  // Status distribution
  const statusGroups = stories.reduce((acc: Record<string, number>, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusGroups).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
    color: STATUS_COLORS[status] || "hsl(215, 13%, 50%)",
  }));

  // Velocity per sprint
  const velocityData = completedSprints.slice(-8).reverse().map(sp => {
    const spStories = stories.filter(s => s.sprint_id === sp.id && s.status === "done");
    const committed = stories.filter(s => s.sprint_id === sp.id).reduce((a, s) => a + (s.story_points ?? 0), 0);
    const completed = spStories.reduce((a, s) => a + (s.story_points ?? 0), 0);
    return { name: sp.name, completados: completed, comprometidos: committed };
  });

  // Burndown for active sprint
  const activeSprint = sprints.find(s => s.status === "active");
  let burndownData: any[] = [];
  if (activeSprint?.start_date && activeSprint?.end_date) {
    const start = new Date(activeSprint.start_date);
    const end = new Date(activeSprint.end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
    const sprintStories = stories.filter(s => s.sprint_id === activeSprint.id);
    const totalSP = sprintStories.reduce((a, s) => a + (s.story_points ?? 0), 0);
    for (let i = 0; i < days; i++) {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      const ideal = Math.round(totalSP - (totalSP / (days - 1)) * i);
      // Real: count stories completed up to this day
      const completedByDay = sprintStories
        .filter(s => s.status === "done")
        .length; // simplified
      const remaining = day <= new Date() ? totalSP - sprintStories.filter(s => s.status === "done").reduce((a, s) => a + (s.story_points ?? 0), 0) : undefined;
      burndownData.push({
        dia: `Día ${i + 1}`,
        ideal: Math.max(ideal, 0),
        real: day <= new Date() ? remaining : undefined,
      });
    }
  }

  // Burnup
  const burnupData = completedSprints.slice(-8).reverse().reduce((acc: any[], sp, i) => {
    const spCompleted = stories.filter(s => s.sprint_id === sp.id && s.status === "done").reduce((a, s) => a + (s.story_points ?? 0), 0);
    const prev = acc[i - 1]?.completado ?? 0;
    acc.push({
      sprint: sp.name,
      alcance: stories.filter(s => s.sprint_id === sp.id).reduce((a, s) => a + (s.story_points ?? 0), 0) + (acc[i - 1]?.alcance ?? 0),
      completado: prev + spCompleted,
    });
    return acc;
  }, []);

  // Portfolio stats
  const activeProjects = (projects ?? []).filter((p: any) => p.status === "active" || !p.status);

  const projectStats = activeProjects.map((p: any) => {
    const pStories = stories.filter((s: any) => s.project_id === p.id);
    const pCompleted = pStories.filter((s: any) => s.status === "done");
    const pSprints = sprints.filter((s: any) => s.project_id === p.id && s.status === "completed");
    const pActiveSprint = sprints.find((s: any) => s.project_id === p.id && s.status === "active");
    const pIncidents = incidents.filter((i: any) => i.project_id === p.id && (i.status === "abierto" || i.status === "en_progreso"));

    const lastSprint = pSprints[pSprints.length - 1];
    const lastVelocity = lastSprint
      ? pStories.filter((s: any) => s.sprint_id === lastSprint.id && s.status === "done").reduce((a: number, s: any) => a + (s.story_points ?? 0), 0)
      : 0;

    const progress = pStories.length > 0 ? Math.round((pCompleted.length / pStories.length) * 100) : 0;
    const hasBlockedStories = pStories.some((s: any) => (s as any).is_blocked);
    const hasOpenIncidents = pIncidents.length > 0;

    const semaforo = hasBlockedStories ? "red" : hasOpenIncidents ? "yellow" : progress < 20 && pSprints.length > 1 ? "yellow" : "green";

    return {
      id: p.id,
      name: p.name,
      progress,
      lastVelocity,
      activeSprint: pActiveSprint?.name ?? "—",
      totalStories: pStories.length,
      completedStories: pCompleted.length,
      semaforo,
      openIncidents: pIncidents.length,
    };
  });

  const atRisk = projectStats.filter(p => p.semaforo === "yellow").length;
  const blocked = projectStats.filter(p => p.semaforo === "red").length;
  const avgVelocityPortfolio = projectStats.length > 0 ? Math.round(projectStats.reduce((a, p) => a + p.lastVelocity, 0) / projectStats.length) : 0;

  return (
    <div className="space-y-6">
      {/* Portfolio Header */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Portafolio de proyectos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeProjects.length}</p>
              <p className="text-sm text-muted-foreground">Proyectos activos</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <div className="p-2 rounded-lg bg-warning/10 text-warning">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{atRisk}</p>
              <p className="text-sm text-muted-foreground">En riesgo</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
              <XOctagon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{blocked}</p>
              <p className="text-sm text-muted-foreground">Bloqueados</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <div className="p-2 rounded-lg bg-success/10 text-success">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgVelocityPortfolio}</p>
              <p className="text-sm text-muted-foreground">Velocity promedio</p>
            </div>
          </div>
        </div>

        {/* Projects Table */}
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base">Estado del portafolio</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Sprint activo</TableHead>
                  <TableHead>Velocity</TableHead>
                  <TableHead>Progreso</TableHead>
                  <TableHead>HUs</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectStats.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin proyectos</TableCell></TableRow>
                )}
                {projectStats.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.activeSprint}</TableCell>
                    <TableCell>{p.lastVelocity} SP</TableCell>
                    <TableCell>
                      <div className="w-full">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${p.progress >= 80 ? "bg-success" : p.progress >= 40 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${Math.min(p.progress, 100)}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{p.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{p.completedStories}/{p.totalStories}</TableCell>
                    <TableCell>
                      <Badge variant={p.semaforo === "green" ? "default" : p.semaforo === "yellow" ? "secondary" : "destructive"}>
                        {p.semaforo === "green" ? "En curso" : p.semaforo === "yellow" ? "En riesgo" : "Bloqueado"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Story Points Completados" value={completedSP} subtitle="en el período seleccionado" icon={<Zap className="h-5 w-5" />} color="text-info" />
        <MetricCard title="Velocidad Promedio" value={avgVelocity} subtitle="story points por sprint" icon={<Target className="h-5 w-5" />} color="text-primary" />
        <MetricCard title="HU Completadas" value={completedStories.length} subtitle={`de ${stories.length} totales`} icon={<CheckCircle className="h-5 w-5" />} color="text-success" percent={stories.length > 0 ? Math.round((completedStories.length / stories.length) * 100) : 0} />
        <MetricCard title="Incidentes Resueltos" value={resolvedIncidents} subtitle="en el período seleccionado" icon={<Bug className="h-5 w-5" />} color="text-success" />
      </div>

      {/* Burndown + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Burndown del Sprint Activo</CardTitle></CardHeader>
          <CardContent>
            {activeSprint ? (
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
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">No hay sprint activo</div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Distribución por Estado</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} innerRadius={60} outerRadius={100} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">Sin datos</div>
            )}
            <div className="text-center text-sm text-muted-foreground mt-2">Total: {stories.length} HU</div>
          </CardContent>
        </Card>
      </div>

      {/* Velocity + Burnup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Velocidad por Sprint</CardTitle></CardHeader>
          <CardContent>
            {velocityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completados" fill="hsl(199, 89%, 48%)" name="Completados" radius={[4, 4, 0, 0]} />
                  <ReferenceLine y={avgVelocity} stroke="hsl(0, 84%, 60%)" strokeDasharray="5 5" label="Promedio" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">Sin sprints completados</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Burnup del Proyecto</CardTitle></CardHeader>
          <CardContent>
            {burnupData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={burnupData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="sprint" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="alcance" fill="hsl(199, 89%, 48%, 0.2)" stroke="hsl(199, 89%, 48%)" name="Alcance" />
                  <Area type="monotone" dataKey="completado" fill="hsl(142, 71%, 45%, 0.3)" stroke="hsl(142, 71%, 45%)" name="Completado" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">Sin datos</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, color, percent }: { title: string; value: number; subtitle: string; icon: React.ReactNode; color: string; percent?: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className={`p-2 rounded-lg bg-muted ${color}`}>{icon}</div>
        </div>
        {percent !== undefined && (
          <div className="mt-3">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full transition-all ${percent >= 80 ? "bg-success" : percent >= 60 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${Math.min(percent, 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{percent}% completadas</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
