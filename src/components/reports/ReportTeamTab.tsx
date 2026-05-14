import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Props {
  stories: any[];
  timeLogs: any[];
  members: any[];
  sprints: any[];
  projects: any[];
}

export function ReportTeamTab({ stories, timeLogs, members, sprints, projects }: Props) {
  const completedStories = stories.filter((s: any) => s.status === "done");
  const completedSprints = sprints.filter((s: any) => s.status === "completed");

  // Tabla 1 — Resumen por proyecto
  const projectSummary = projects.map((p: any) => {
    const pMembers = members.filter((m: any) => m.project_id === p.id);
    const pAllStories = stories.filter((s: any) => s.project_id === p.id);
    const pCompletedStories = pAllStories.filter((s: any) => s.status === "done");
    const pLogs = timeLogs.filter((t: any) => t.project_id === p.id && (t as any).approved === true);
    const totalSP = pCompletedStories.reduce((a: number, s: any) => a + (s.story_points ?? 0), 0);
    const totalHours = Math.round(pLogs.reduce((a: number, t: any) => a + (t.hours ?? 0), 0) * 10) / 10;
    const totalHUs = pCompletedStories.length;
    const hPerSP = totalSP > 0 ? Math.round((totalHours / totalSP) * 10) / 10 : null;
    const hPerHU = totalHUs > 0 ? Math.round((totalHours / totalHUs) * 10) / 10 : null;
    const spPerHU = totalHUs > 0 ? Math.round((totalSP / totalHUs) * 10) / 10 : null;
    return { id: p.id, name: p.name, memberCount: pMembers.length, totalSP, totalHUs, totalHours, hPerSP, hPerHU, spPerHU };
  }).filter((p: any) => p.memberCount > 0);

  // Tabla 2 — Detalle por miembro
  const memberData = members.map((m: any) => {
    const p = m.profiles;
    const project = projects.find((pr: any) => pr.id === m.project_id);
    const mStories = completedStories.filter((s: any) => s.assigned_to === p?.id);
    const totalSP = mStories.reduce((a: number, s: any) => a + (s.story_points ?? 0), 0);
    const totalHUs = mStories.length;
    const hours = Math.round(timeLogs.filter((t: any) => t.user_id === p?.id && (t as any).approved === true).reduce((a: number, t: any) => a + (t.hours ?? 0), 0) * 10) / 10;
    const hPerSP = totalSP > 0 ? Math.round((hours / totalSP) * 10) / 10 : null;
    const hPerHU = totalHUs > 0 ? Math.round((hours / totalHUs) * 10) / 10 : null;
    const spPerHU = totalHUs > 0 ? Math.round((totalSP / totalHUs) * 10) / 10 : null;
    const velocity = completedSprints.length > 0 ? Math.round(totalSP / completedSprints.length) : totalSP;
    return { id: p?.id, name: p?.full_name || p?.email || "?", role: m.project_role, project: project?.name ?? "—", totalSP, totalHUs, hours, hPerSP, hPerHU, spPerHU, velocity };
  });

  // Tabla 3 — Mapa de actividad
  const activityData = projects.map((p: any) => {
    const pMembers = members.filter((m: any) => m.project_id === p.id);
    return pMembers.map((m: any) => {
      const pr = m.profiles;
      const mCompleted = completedStories.filter((s: any) => s.project_id === p.id && s.assigned_to === pr?.id);
      return {
        project: p.name,
        member: pr?.full_name || pr?.email || "?",
        totalHUs: mCompleted.length,
        totalSP: mCompleted.reduce((a: number, s: any) => a + (s.story_points ?? 0), 0),
      };
    });
  }).flat().filter((r: any) => r.totalHUs > 0);

  // Tabla 4 — Resumen por sprint y proyecto
  const sprintSummary = projects.map((p: any) => {
    const pSprints = sprints.filter((s: any) => s.project_id === p.id);
    const pCompletedSprints = pSprints.filter((s: any) => s.status === "completed");
    const pMembers = members.filter((m: any) => m.project_id === p.id);
    const pAllStories = stories.filter((s: any) => s.project_id === p.id);
    const pCompletedStories = pAllStories.filter((s: any) => s.status === "done");
    const pPendingStories = pAllStories.filter((s: any) => s.status !== "done" && !s.deleted_at);
    const pLogs = timeLogs.filter((t: any) => t.project_id === p.id && (t as any).approved === true);
    const totalHours = Math.round(pLogs.reduce((a: number, t: any) => a + (t.hours ?? 0), 0) * 10) / 10;
    return {
      id: p.id,
      name: p.name,
      memberCount: pMembers.length,
      totalHUs: pAllStories.length,
      completedHUs: pCompletedStories.length,
      pendingHUs: pPendingStories.length,
      totalSprints: pSprints.length,
      completedSprints: pCompletedSprints.length,
      totalHours,
    };
  }).filter((p: any) => p.totalSprints > 0);

  return (
    <div className="space-y-6">
      {/* Tabla 1 — Resumen por proyecto */}
      <Card>
        <CardHeader><CardTitle className="text-base">Resumen por proyecto</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto</TableHead>
                <TableHead className="text-center">Miembros</TableHead>
                <TableHead className="text-center">Puntos entregados</TableHead>
                <TableHead className="text-center">HUs completadas</TableHead>
                <TableHead className="text-center">Horas aprobadas</TableHead>
                <TableHead className="text-center">h/Punto</TableHead>
                <TableHead className="text-center">h/HU</TableHead>
                <TableHead className="text-center">Puntos/HU</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectSummary.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Sin datos</TableCell></TableRow>}
              {projectSummary.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-center">{p.memberCount}</TableCell>
                  <TableCell className="text-center font-mono">{p.totalSP}</TableCell>
                  <TableCell className="text-center">{p.totalHUs}</TableCell>
                  <TableCell className="text-center">{p.totalHours}h</TableCell>
                  <TableCell className="text-center">{p.hPerSP !== null ? `${p.hPerSP}h` : "—"}</TableCell>
                  <TableCell className="text-center">{p.hPerHU !== null ? `${p.hPerHU}h` : "—"}</TableCell>
                  <TableCell className="text-center">{p.spPerHU !== null ? p.spPerHU : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tabla 2 — Detalle por miembro */}
      <Card>
        <CardHeader><CardTitle className="text-base">Detalle por miembro</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Miembro</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-center">Puntos entregados</TableHead>
                <TableHead className="text-center">HUs completadas</TableHead>
                <TableHead className="text-center">Horas aprobadas</TableHead>
                <TableHead className="text-center">h/Punto</TableHead>
                <TableHead className="text-center">h/HU</TableHead>
                <TableHead className="text-center">Puntos/HU</TableHead>
                <TableHead className="text-center">Velocidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberData.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">Sin datos</TableCell></TableRow>}
              {memberData.sort((a: any, b: any) => b.totalSP - a.totalSP).map((m: any) => (
                <TableRow key={`${m.id}-${m.project}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7"><AvatarFallback className="text-xs">{m.name[0]?.toUpperCase()}</AvatarFallback></Avatar>
                      <span className="text-sm font-medium">{m.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.project}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{m.role}</Badge></TableCell>
                  <TableCell className="text-center font-mono">{m.totalSP}</TableCell>
                  <TableCell className="text-center">{m.totalHUs}</TableCell>
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

      {/* Tabla 3 — Actividad por proyecto y miembro */}
      <Card>
        <CardHeader><CardTitle className="text-base">Actividad por proyecto y miembro</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto</TableHead>
                <TableHead>Miembro</TableHead>
                <TableHead className="text-center">HUs completadas</TableHead>
                <TableHead className="text-center">Puntos entregados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityData.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sin actividad registrada</TableCell></TableRow>}
              {activityData.map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.project}</TableCell>
                  <TableCell>{r.member}</TableCell>
                  <TableCell className="text-center">{r.totalHUs}</TableCell>
                  <TableCell className="text-center font-mono">{r.totalSP}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tabla 4 — Resumen de sprints por proyecto */}
      <Card>
        <CardHeader><CardTitle className="text-base">Resumen de sprints por proyecto</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto</TableHead>
                <TableHead className="text-center">Miembros</TableHead>
                <TableHead className="text-center">HUs totales</TableHead>
                <TableHead className="text-center">HUs completadas</TableHead>
                <TableHead className="text-center">HUs pendientes</TableHead>
                <TableHead className="text-center">Sprints totales</TableHead>
                <TableHead className="text-center">Sprints completados</TableHead>
                <TableHead className="text-center">Horas aprobadas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sprintSummary.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Sin sprints registrados</TableCell></TableRow>}
              {sprintSummary.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-center">{p.memberCount}</TableCell>
                  <TableCell className="text-center">{p.totalHUs}</TableCell>
                  <TableCell className="text-center text-green-600 font-medium">{p.completedHUs}</TableCell>
                  <TableCell className="text-center text-amber-600 font-medium">{p.pendingHUs}</TableCell>
                  <TableCell className="text-center">{p.totalSprints}</TableCell>
                  <TableCell className="text-center">{p.completedSprints}</TableCell>
                  <TableCell className="text-center">{p.totalHours}h</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
