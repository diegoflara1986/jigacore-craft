import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bug, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from "recharts";

interface Props {
  incidents: any[];
  slaConfigs: any[];
}

const SEVERITY_COLORS: Record<string, string> = {
  critica: "hsl(0, 84%, 60%)",
  alta: "hsl(24, 95%, 53%)",
  media: "hsl(38, 92%, 50%)",
  baja: "hsl(142, 71%, 45%)",
};

export function ReportIncidentsTab({ incidents, slaConfigs }: Props) {
  const total = incidents.length;
  const resolved = incidents.filter(i => i.status === "resuelto" || i.status === "cerrado");
  const criticalResolved = resolved.filter(i => i.severity === "critica").length;

  // Avg resolution time
  let avgHours = 0;
  if (resolved.length) {
    const totalMs = resolved.reduce((sum, i) => sum + (new Date(i.updated_at || i.created_at).getTime() - new Date(i.created_at).getTime()), 0);
    avgHours = Math.round(totalMs / resolved.length / 3600000);
  }

  // Reopened (simplified - those that went from resolved back to open)
  const reopenRate = 0; // Would need history data

  // By month stacked
  const monthMap: Record<string, Record<string, number>> = {};
  incidents.forEach(i => {
    const m = i.created_at?.slice(0, 7);
    if (!monthMap[m]) monthMap[m] = {};
    monthMap[m][i.severity] = (monthMap[m][i.severity] ?? 0) + 1;
  });
  const monthData = Object.keys(monthMap).sort().map(m => ({
    mes: m,
    critica: monthMap[m].critica ?? 0,
    alta: monthMap[m].alta ?? 0,
    media: monthMap[m].media ?? 0,
    baja: monthMap[m].baja ?? 0,
  }));

  // By category
  const catMap: Record<string, number> = {};
  incidents.forEach(i => { const c = i.category || "Sin categoría"; catMap[c] = (catMap[c] ?? 0) + 1; });
  const catData = Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));

  // Avg resolution by severity
  const severities = ["critica", "alta", "media", "baja"];
  const avgBySeverity = severities.map(sev => {
    const sevResolved = resolved.filter(i => i.severity === sev);
    const avg = sevResolved.length > 0
      ? Math.round(sevResolved.reduce((sum, i) => sum + (new Date(i.updated_at || i.created_at).getTime() - new Date(i.created_at).getTime()), 0) / sevResolved.length / 3600000)
      : 0;
    const sla = slaConfigs.find(s => s.severity === sev);
    return { severity: sev, promedio: avg, sla: sla?.resolution_hours ?? 72 };
  });

  // Top projects
  const projMap: Record<string, { name: string; total: number; criticos: number; resueltos: number }> = {};
  incidents.forEach(i => {
    const pid = i.project_id;
    const pname = i.projects?.name || "?";
    if (!projMap[pid]) projMap[pid] = { name: pname, total: 0, criticos: 0, resueltos: 0 };
    projMap[pid].total++;
    if (i.severity === "critica") projMap[pid].criticos++;
    if (i.status === "resuelto" || i.status === "cerrado") projMap[pid].resueltos++;
  });
  const topProjects = Object.values(projMap).sort((a, b) => b.total - a.total).slice(0, 10);

  // Recent incidents
  const recent = [...incidents].sort((a, b) => {
    const daysA = Math.ceil((Date.now() - new Date(a.created_at).getTime()) / 86400000);
    const daysB = Math.ceil((Date.now() - new Date(b.created_at).getTime()) / 86400000);
    return daysB - daysA;
  }).slice(0, 20);

  const sevBadge = (sev: string) => {
    const colors: Record<string, string> = { critica: "bg-destructive/20 text-destructive", alta: "bg-accent/20 text-accent", media: "bg-warning/20 text-warning", baja: "bg-success/20 text-success" };
    return <Badge className={colors[sev] || "bg-muted"}>{sev}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Incidentes" value={total} icon={<Bug className="h-5 w-5" />} color="text-info" />
        <MetricCard title="Tiempo Promedio Resolución" value={`${avgHours}h`} icon={<Clock className="h-5 w-5" />} color="text-accent" />
        <MetricCard title="Tasa Reapertura" value={`${reopenRate}%`} icon={<AlertTriangle className="h-5 w-5" />} color="text-warning" />
        <MetricCard title="Críticos Resueltos" value={criticalResolved} icon={<CheckCircle className="h-5 w-5" />} color="text-success" />
      </div>

      {/* By month */}
      {monthData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Incidentes por Mes</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="critica" stackId="a" fill={SEVERITY_COLORS.critica} name="Crítica" />
                <Bar dataKey="alta" stackId="a" fill={SEVERITY_COLORS.alta} name="Alta" />
                <Bar dataKey="media" stackId="a" fill={SEVERITY_COLORS.media} name="Media" />
                <Bar dataKey="baja" stackId="a" fill={SEVERITY_COLORS.baja} name="Baja" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Category */}
        {catData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Por Categoría</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={catData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis type="category" dataKey="name" className="text-xs" width={120} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(199, 89%, 48%)" name="Incidentes" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Avg Resolution by Severity */}
        <Card>
          <CardHeader><CardTitle className="text-base">Resolución Promedio vs SLA</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={avgBySeverity}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="severity" className="text-xs" />
                <YAxis className="text-xs" label={{ value: "Horas", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="promedio" name="Promedio">
                  {avgBySeverity.map((entry, i) => (
                    <Cell key={i} fill={entry.promedio > entry.sla ? "hsl(0, 84%, 60%)" : "hsl(142, 71%, 45%)"} />
                  ))}
                </Bar>
                <Bar dataKey="sla" name="SLA" fill="hsl(215, 13%, 70%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Projects */}
      {topProjects.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Top Proyectos con más Incidentes</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Proyecto</TableHead><TableHead>Total</TableHead><TableHead>Críticos</TableHead><TableHead>Resueltos</TableHead><TableHead>% Resolución</TableHead></TableRow></TableHeader>
              <TableBody>
                {topProjects.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.total}</TableCell>
                    <TableCell className="text-destructive font-medium">{p.criticos}</TableCell>
                    <TableCell className="text-success">{p.resueltos}</TableCell>
                    <TableCell>{p.total > 0 ? Math.round((p.resueltos / p.total) * 100) : 0}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent */}
      <Card>
        <CardHeader><CardTitle className="text-base">Últimos Incidentes</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Ticket</TableHead><TableHead>Título</TableHead><TableHead>Severidad</TableHead><TableHead>Estado</TableHead><TableHead>Días Abierto</TableHead></TableRow></TableHeader>
            <TableBody>
              {recent.map(i => {
                const days = Math.ceil((Date.now() - new Date(i.created_at).getTime()) / 86400000);
                return (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">{i.ticket_code}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{i.title}</TableCell>
                    <TableCell>{sevBadge(i.severity)}</TableCell>
                    <TableCell><Badge variant="outline">{i.status}</Badge></TableCell>
                    <TableCell>{days}d</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, icon, color }: { title: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
          <div className={`p-2 rounded-lg bg-muted ${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
