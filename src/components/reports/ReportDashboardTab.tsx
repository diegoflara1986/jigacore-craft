import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Zap, CheckCircle, Bug, Target, Briefcase, AlertTriangle, XOctagon } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, ReferenceLine } from "recharts";

interface Props {
  projects: any[];
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

export function ReportDashboardTab({ stories, sprints, incidents, timeLogs, dateFrom, dateTo }: Props) {
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

  return (
    <div className="space-y-6">
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
