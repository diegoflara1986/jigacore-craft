import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle2, Users, Target, Activity, DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";

interface Props {
  projects: any[];
  stories: any[];
  sprints: any[];
  timeLogs: any[];
  costConfigs: any[];
  members: any[];
  epics: any[];
  selectedProjectId?: string;
}

export function ReportStakeholderTab({ projects, stories, sprints, timeLogs, costConfigs, members, epics, selectedProjectId }: Props) {
  const project = projects.find(p => p.id === selectedProjectId);
  const budget = project?.budget ?? 0;
  const currency = project?.currency ?? "USD";
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

  const totalStories = stories.length;
  const doneStories = stories.filter((s: any) => s.status === "done");
  const progressPct = totalStories > 0 ? Math.round((doneStories.length / totalStories) * 100) : 0;

  const activeSprint = sprints.find((s: any) => s.status === "active");

  // Epic progress
  const epicProgress = epics.map((e: any) => {
    const eStories = stories.filter((s: any) => s.epic_id === e.id);
    const done = eStories.filter((s: any) => s.status === "done").length;
    const pct = eStories.length > 0 ? Math.round((done / eStories.length) * 100) : 0;
    return { id: e.id, name: e.name, total: eStories.length, done, pct };
  });
  const noEpicStories = stories.filter((s: any) => !s.epic_id);
  if (noEpicStories.length > 0) {
    const done = noEpicStories.filter((s: any) => s.status === "done").length;
    epicProgress.push({
      id: "none",
      name: "Sin épica",
      total: noEpicStories.length,
      done,
      pct: Math.round((done / noEpicStories.length) * 100),
    });
  }

  const pctColor = (p: number) => p < 50 ? "bg-destructive text-destructive-foreground" : p <= 80 ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground";

  // Active sprint stories grouped
  const sprintStories = activeSprint ? stories.filter((s: any) => s.sprint_id === activeSprint.id) : [];
  const sprintTotalSP = sprintStories.reduce((a: number, s: any) => a + (s.story_points ?? 0), 0);
  const sprintDoneSP = sprintStories.filter((s: any) => s.status === "done").reduce((a: number, s: any) => a + (s.story_points ?? 0), 0);
  const sprintPct = sprintTotalSP > 0 ? Math.round((sprintDoneSP / sprintTotalSP) * 100) : 0;

  const groups: { label: string; statuses: string[] }[] = [
    { label: "En progreso", statuses: ["in_progress"] },
    { label: "En QA", statuses: ["qa", "in_qa", "review"] },
    { label: "Completadas", statuses: ["done"] },
    { label: "Pendientes", statuses: ["todo", "backlog", "ready"] },
  ];

  const priorityVariant = (p: string): "default" | "destructive" | "secondary" | "outline" => {
    if (p === "critical" || p === "high") return "destructive";
    if (p === "medium") return "default";
    return "secondary";
  };

  // Financial
  const rateMap: Record<string, number> = {};
  costConfigs.forEach((c: any) => { if (c.user_id) rateMap[c.user_id] = c.hourly_rate; });
  const approvedLogs = timeLogs.filter((t: any) => t.approved === true);
  const realCost = approvedLogs.reduce((sum: number, t: any) => sum + (t.hours ?? 0) * (rateMap[t.user_id] ?? 0), 0);
  const remaining = budget - realCost;
  const pctUsed = budget > 0 ? Math.round((realCost / budget) * 100) : 0;

  const memberCosts = members.map((m: any) => {
    const p = m.profiles;
    const hours = approvedLogs.filter((t: any) => t.user_id === p?.id).reduce((a: number, t: any) => a + (t.hours ?? 0), 0);
    const rate = rateMap[p?.id] ?? 0;
    return { name: p?.full_name || p?.email, rate, hours: Math.round(hours * 10) / 10, cost: Math.round(hours * rate) };
  }).filter(m => m.hours > 0).sort((a, b) => b.cost - a.cost);

  // Recent deliveries
  const recentDeliveries = [...doneStories]
    .sort((a: any, b: any) => (b.updated_at || "").localeCompare(a.updated_at || ""))
    .slice(0, 10);
  const sprintMap: Record<string, string> = {};
  sprints.forEach((s: any) => { sprintMap[s.id] = s.name; });

  return (
    <div className="space-y-6">
      {/* Section 1: Project Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Progreso general" value={`${progressPct}%`} icon={<Activity className="h-5 w-5" />} color="text-primary" />
        <KPICard title="HUs entregadas" value={String(doneStories.length)} icon={<CheckCircle2 className="h-5 w-5" />} color="text-success" />
        <KPICard title="Sprint activo" value={activeSprint?.name || "Sin sprint activo"} icon={<Target className="h-5 w-5" />} color="text-accent" />
        <KPICard title="Equipo" value={String(members.length)} icon={<Users className="h-5 w-5" />} color="text-info" />
      </div>

      {/* Section 2: Epic Progress */}
      {epicProgress.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Progreso por épica</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {epicProgress.map(e => (
              <div key={e.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{e.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{e.done} / {e.total} HUs</span>
                    <Badge className={pctColor(e.pct)}>{e.pct}%</Badge>
                  </div>
                </div>
                <Progress value={e.pct} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Section 3: Active Sprint */}
      {activeSprint && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{activeSprint.name}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {activeSprint.start_date || "—"} → {activeSprint.end_date || "—"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Story Points completados</span>
                <span className="font-medium">{sprintDoneSP} / {sprintTotalSP} SP</span>
              </div>
              <Progress value={sprintPct} className="h-2" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groups.map(g => {
                const items = sprintStories.filter((s: any) => g.statuses.includes(s.status));
                return (
                  <div key={g.label} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{g.label}</span>
                      <Badge variant="outline">{items.length}</Badge>
                    </div>
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin historias</p>
                    ) : (
                      <ul className="space-y-1">
                        {items.map((s: any) => (
                          <li key={s.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="truncate">
                              <span className="font-mono text-muted-foreground mr-1">HU-{s.story_number ?? s.number ?? "?"}</span>
                              {s.title}
                            </span>
                            {s.priority && <Badge variant={priorityVariant(s.priority)} className="text-[10px]">{s.priority}</Badge>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 4: Financial */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Presupuesto Total" value={fmt(budget)} icon={<Wallet className="h-5 w-5" />} color="text-info" />
        <KPICard title="Costo Real" value={fmt(realCost)} icon={<DollarSign className="h-5 w-5" />} color="text-accent" />
        <KPICard title="Variación" value={fmt(remaining)} icon={remaining >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />} color={remaining >= 0 ? "text-success" : "text-destructive"} />
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">% Usado</p>
            <p className={`text-3xl font-bold mt-1 ${pctUsed > 90 ? "text-destructive" : pctUsed > 70 ? "text-warning" : "text-success"}`}>{pctUsed}%</p>
            <Progress value={Math.min(pctUsed, 100)} className="mt-3 h-2" />
          </CardContent>
        </Card>
      </div>

      {memberCosts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Costo por miembro</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Miembro</TableHead><TableHead>Tarifa/h</TableHead><TableHead>Horas</TableHead><TableHead>Costo</TableHead></TableRow></TableHeader>
              <TableBody>
                {memberCosts.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarFallback className="text-xs">{(m.name || "?")[0]}</AvatarFallback></Avatar>{m.name}</TableCell>
                    <TableCell>{fmt(m.rate)}</TableCell>
                    <TableCell>{m.hours}h</TableCell>
                    <TableCell className="font-semibold">{fmt(m.cost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Section 5: Recent Deliveries */}
      {recentDeliveries.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Últimas entregas</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Historia</TableHead><TableHead>Sprint</TableHead><TableHead className="text-right">SP</TableHead></TableRow></TableHeader>
              <TableBody>
                {recentDeliveries.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground mr-2">HU-{s.story_number ?? s.number ?? "?"}</span>
                      <span className="font-medium">{s.title}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{sprintMap[s.sprint_id] || "—"}</TableCell>
                    <TableCell className="text-right">{s.story_points ?? "—"}</TableCell>
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

function KPICard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold mt-1 truncate ${color}`}>{value}</p>
          </div>
          <div className={`p-2 rounded-lg bg-muted ${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}