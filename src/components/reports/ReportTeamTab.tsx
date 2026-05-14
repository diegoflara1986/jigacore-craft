import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip } from "recharts";

interface Props {
  stories: any[];
  timeLogs: any[];
  members: any[];
  sprints: any[];
}

export function ReportTeamTab({ stories, timeLogs, members, sprints }: Props) {
  const completedStories = stories.filter(s => s.status === "done");
  const maxSP = Math.max(1, ...members.map((m: any) => completedStories.filter(s => s.assigned_to === m.profiles?.id).reduce((a: number, s: any) => a + (s.story_points ?? 0), 0)));

  const memberData = members.map((m: any) => {
    const p = m.profiles;
    const mStories = completedStories.filter(s => s.assigned_to === p?.id);
    const sp = mStories.reduce((a: number, s: any) => a + (s.story_points ?? 0), 0);
    const hours = timeLogs.filter(t => t.user_id === p?.id && (t as any).approved === true).reduce((a: number, t: any) => a + (t.hours ?? 0), 0);
    const efficiency = sp > 0 ? Math.round((hours / sp) * 10) / 10 : null;
    const completedSprints = sprints.filter(s => s.status === "completed");
    const velocity = completedSprints.length > 0 ? Math.round(sp / completedSprints.length) : sp;
    return { id: p?.id, name: p?.full_name || p?.email || "?", role: m.project_role, sp, tasks: mStories.length, hours: Math.round(hours * 10) / 10, efficiency, velocity };
  });

  // Activity heatmap data - last 8 weeks
  const weeks: string[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    weeks.push(d.toISOString().slice(0, 10));
  }

  const heatmapData = memberData.map(m => {
    const weekData = weeks.map((w, i) => {
      const weekEnd = i < weeks.length - 1 ? weeks[i + 1] : new Date().toISOString().slice(0, 10);
      const count = completedStories.filter(s => s.assigned_to === m.id && s.created_at >= w && s.created_at < weekEnd).length;
      return count;
    });
    return { name: m.name, weeks: weekData };
  });

  const maxHeat = Math.max(1, ...heatmapData.flatMap(m => m.weeks));

  // Sprint load
  const activeSprints = sprints.filter(s => s.status !== "completed").slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Member Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {memberData.map(m => (
          <Card key={m.id}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-10 w-10"><AvatarFallback>{m.name[0]}</AvatarFallback></Avatar>
                <div>
                  <p className="font-medium text-sm">{m.name}</p>
                  <Badge variant="outline" className="text-xs">{m.role}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-lg font-bold text-info">{m.sp}</p><p className="text-[10px] text-muted-foreground">SP</p></div>
                <div><p className="text-lg font-bold">{m.tasks}</p><p className="text-[10px] text-muted-foreground">Tareas</p></div>
                <div><p className="text-lg font-bold text-accent">{m.hours}h</p><p className="text-[10px] text-muted-foreground">Horas</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparative Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Tabla Comparativa</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Miembro</TableHead><TableHead>Rol</TableHead><TableHead>SP</TableHead><TableHead>Tareas</TableHead><TableHead>Horas</TableHead><TableHead>Velocidad</TableHead><TableHead className="w-32">Progreso</TableHead></TableRow></TableHeader>
            <TableBody>
              {memberData.sort((a, b) => b.sp - a.sp).map(m => (
                <TableRow key={m.id}>
                  <TableCell className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarFallback className="text-xs">{m.name[0]}</AvatarFallback></Avatar>{m.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{m.role}</Badge></TableCell>
                  <TableCell className="font-semibold">{m.sp}</TableCell>
                  <TableCell>{m.tasks}</TableCell>
                  <TableCell>{m.hours}h</TableCell>
                  <TableCell>{m.velocity}</TableCell>
                  <TableCell><Progress value={(m.sp / maxSP) * 100} className="h-2" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Activity Heatmap */}
      <Card>
        <CardHeader><CardTitle className="text-base">Mapa de Calor de Actividad</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[500px]">
              <div className="grid gap-1" style={{ gridTemplateColumns: `150px repeat(${weeks.length}, 1fr)` }}>
                <div className="text-xs text-muted-foreground font-medium p-1">Miembro</div>
                {weeks.map((w, i) => <div key={i} className="text-[10px] text-muted-foreground text-center p-1">S{i + 1}</div>)}
                {heatmapData.map((m, mi) => (
                  <>
                    <div key={`name-${mi}`} className="text-xs truncate p-1 flex items-center">{m.name}</div>
                    {m.weeks.map((count, wi) => {
                      const opacity = count / maxHeat;
                      return (
                        <div key={`cell-${mi}-${wi}`} className="rounded h-8 flex items-center justify-center text-[10px] font-medium" style={{ backgroundColor: count > 0 ? `hsl(199, 89%, 48%, ${0.15 + opacity * 0.85})` : "hsl(var(--muted))", color: count > 0 ? (opacity > 0.5 ? "white" : "hsl(199, 89%, 30%)") : "hsl(var(--muted-foreground))" }} title={`${m.name}: ${count} tareas`}>
                          {count > 0 ? count : ""}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sprint Load */}
      {activeSprints.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Carga por Sprint</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Miembro</TableHead>
                  {activeSprints.map(s => <TableHead key={s.id} className="text-center">{s.name}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberData.map(m => (
                  <TableRow key={m.id}>
                    <TableCell>{m.name}</TableCell>
                    {activeSprints.map(s => {
                      const assignedSP = stories.filter(st => st.sprint_id === s.id && st.assigned_to === m.id).reduce((a: number, st: any) => a + (st.story_points ?? 0), 0);
                      const capacity = s.capacity || 20;
                      const pct = capacity > 0 ? (assignedSP / capacity) * 100 : 0;
                      const color = pct > 120 ? "bg-destructive/20 text-destructive" : pct > 100 ? "bg-warning/20 text-warning" : "bg-success/20 text-success";
                      return <TableCell key={s.id} className={`text-center font-medium ${color}`}>{assignedSP} SP</TableCell>;
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
