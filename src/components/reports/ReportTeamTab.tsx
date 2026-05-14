import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, Cell } from "recharts";

interface Props {
  stories: any[];
  timeLogs: any[];
  members: any[];
  sprints: any[];
  projects: any[];
}

export function ReportTeamTab({ stories, timeLogs, members, sprints, projects }: Props) {
  // Detalle por miembro (filtrado por proyecto)
  const memberData = members.map((m: any) => {
    const pr = m.profiles;
    const project = projects.find((p: any) => p.id === m.project_id);
    const mStories = stories.filter((s: any) => s.assigned_to === pr?.id && s.project_id === m.project_id);
    const mCompleted = mStories.filter((s: any) => s.status === "done");
    const mPending = mStories.filter((s: any) => s.status !== "done" && !(s as any).deleted_at);
    const totalSP = mCompleted.reduce((a: number, s: any) => a + (s.story_points ?? 0), 0);
    const totalHUs = mCompleted.length;
    const pendingHUs = mPending.length;
    const hours = Math.round(timeLogs.filter((t: any) => t.user_id === pr?.id && t.project_id === m.project_id && (t as any).approved === true).reduce((a: number, t: any) => a + (t.hours ?? 0), 0) * 10) / 10;
    const hPerSP = totalSP > 0 ? Math.round((hours / totalSP) * 10) / 10 : null;
    const hPerHU = totalHUs > 0 ? Math.round((hours / totalHUs) * 10) / 10 : null;
    const spPerHU = totalHUs > 0 ? Math.round((totalSP / totalHUs) * 10) / 10 : null;
    const pSprints = sprints.filter((s: any) => s.project_id === m.project_id && s.status === "completed");
    const velocity = pSprints.length > 0 ? Math.round(totalSP / pSprints.length) : totalSP;
    return {
      key: `${pr?.id}-${m.project_id}`,
      name: pr?.full_name || pr?.email || "?",
      role: m.project_role,
      project: project?.name ?? "—",
      project_id: m.project_id,
      totalSP, totalHUs, pendingHUs,
      totalAllHUs: mStories.length,
      hours, hPerSP, hPerHU, spPerHU, velocity,
    };
  });

  const [selectedChartProject, setSelectedChartProject] = useState<string>("all");

  // Datos para gráfica según proyecto seleccionado
  const chartMembers = (() => {
    if (selectedChartProject === "all") {
      // Consolidar por miembro (suma de todos los proyectos), top 10 por SP
      const byMember: Record<string, { name: string; totalSP: number; hours: number; hPerSP: number | null }> = {};
      memberData.forEach((m: any) => {
        if (!byMember[m.name]) byMember[m.name] = { name: m.name, totalSP: 0, hours: 0, hPerSP: null };
        byMember[m.name].totalSP += m.totalSP;
        byMember[m.name].hours += m.hours;
      });
      return Object.values(byMember)
        .map(m => ({ ...m, hPerSP: m.totalSP > 0 ? Math.round((m.hours / m.totalSP) * 10) / 10 : null }))
        .sort((a, b) => b.totalSP - a.totalSP)
        .slice(0, 10);
    }
    return memberData
      .filter((m: any) => m.project_id === selectedChartProject)
      .map((m: any) => ({
        name: m.name,
        totalSP: m.totalSP,
        hours: m.hours,
        hPerSP: m.hPerSP,
      }));
  })();

  const avgEfficiency = chartMembers.filter(m => m.hPerSP !== null).length > 0
    ? chartMembers.filter(m => m.hPerSP !== null).reduce((a, m) => a + (m.hPerSP ?? 0), 0) / chartMembers.filter(m => m.hPerSP !== null).length
    : 0;

  const selectedProjectName = selectedChartProject === "all"
    ? "Todos los proyectos"
    : projects.find((p: any) => p.id === selectedChartProject)?.name ?? "—";

  return (
    <div className="space-y-6">
      {/* Detalle por miembro */}
      <Card>
        <CardHeader><CardTitle className="text-base">Detalle por miembro</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto</TableHead>
                <TableHead>Miembro</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-center">Puntos entregados</TableHead>
                <TableHead className="text-center">HUs completadas</TableHead>
                <TableHead className="text-center">HUs pendientes</TableHead>
                <TableHead className="text-center">HUs totales</TableHead>
                <TableHead className="text-center">Horas aprobadas</TableHead>
                <TableHead className="text-center">h/Punto</TableHead>
                <TableHead className="text-center">h/HU</TableHead>
                <TableHead className="text-center">Puntos/HU</TableHead>
                <TableHead className="text-center">Velocidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberData.length === 0 && <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-6">Sin datos</TableCell></TableRow>}
              {memberData.sort((a: any, b: any) => b.totalSP - a.totalSP).map((m: any) => (
                <TableRow key={m.key}>
                  <TableCell className="font-medium text-sm">{m.project}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7"><AvatarFallback className="text-xs">{m.name[0]?.toUpperCase()}</AvatarFallback></Avatar>
                      <span className="text-sm">{m.name}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{m.role}</Badge></TableCell>
                  <TableCell className="text-center font-mono">{m.totalSP}</TableCell>
                  <TableCell className="text-center text-green-600 font-medium">{m.totalHUs}</TableCell>
                  <TableCell className="text-center text-amber-600 font-medium">{m.pendingHUs}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{m.totalAllHUs}</TableCell>
                  <TableCell className="text-center">{m.hours}h</TableCell>
                  <TableCell className="text-center">{m.hPerSP !== null ? `${m.hPerSP}h` : "—"}</TableCell>
                  <TableCell className="text-center">{m.hPerHU !== null ? `${m.hPerHU}h` : "—"}</TableCell>
                  <TableCell className="text-center">{m.spPerHU !== null ? m.spPerHU : "—"}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{m.velocity} pts/sprint</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground px-4 py-3 border-t">
            💡 h/Punto = horas aprobadas ÷ puntos entregados. h/HU = horas ÷ HUs completadas. Puntos/HU = puntos ÷ HUs. Menor h/Punto = más eficiente.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">Productividad — {selectedProjectName}</CardTitle>
            <select
              value={selectedChartProject}
              onChange={e => setSelectedChartProject(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm bg-background"
            >
              <option value="all">Todos los proyectos (top 10)</option>
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {chartMembers.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartMembers} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RTooltip />
                <Legend />
                <Bar dataKey="totalSP" name="Puntos entregados" fill="hsl(199,89%,48%)" radius={[4,4,0,0]} />
                <Bar dataKey="hours" name="Horas aprobadas" fill="hsl(38,92%,50%)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">Sin datos para este proyecto</div>
          )}
        </CardContent>
      </Card>

      {chartMembers.filter(m => m.hPerSP !== null).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ranking de eficiencia (h/Punto) — {selectedProjectName}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(180, chartMembers.length * 44)}>
              <BarChart
                layout="vertical"
                data={[...chartMembers].filter(m => m.hPerSP !== null).sort((a, b) => (a.hPerSP ?? 0) - (b.hPerSP ?? 0))}
                margin={{ top: 5, right: 40, bottom: 5, left: 120 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={115} />
                <RTooltip formatter={(v: number) => [`${v}h/punto`, "Eficiencia"]} />
                <Bar dataKey="hPerSP" name="h/Punto" radius={[0,4,4,0]}>
                  {[...chartMembers].filter(m => m.hPerSP !== null).sort((a, b) => (a.hPerSP ?? 0) - (b.hPerSP ?? 0)).map((m, i) => (
                    <Cell key={i} fill={(m.hPerSP ?? 0) <= avgEfficiency ? "#22c55e" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2 px-1">
              Verde = más eficiente que el promedio ({avgEfficiency.toFixed(1)}h/punto). Rojo = por encima del promedio. Menor valor = más eficiente.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
