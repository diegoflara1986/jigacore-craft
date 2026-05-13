import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCostConfigs, useUpsertCostConfig } from "@/hooks/useCostConfigs";
import { useProjectMembers, useProject } from "@/hooks/useProjects";
import { useEpics } from "@/hooks/useEpics";
import { useSprintsWithStats } from "@/hooks/useSprints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, DollarSign, TrendingUp, Save } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionDeniedDialog } from "@/components/PermissionDeniedDialog";

const CHART_COLORS = ["hsl(213,52%,24%)", "hsl(24,95%,53%)", "hsl(142,71%,45%)", "hsl(199,89%,48%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)"];

interface Props { projectId: string; isArchived?: boolean; }

export function ProjectCostsTab({ projectId, isArchived = false }: Props) {
  const { data: project } = useProject(projectId);
  const { data: members } = useProjectMembers(projectId);
  const { data: configs } = useCostConfigs(projectId);
  const { data: logs } = useQuery({
    queryKey: ["time-logs-project-all", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("time_logs")
        .select("*, profiles:user_id(id, full_name, email, avatar_url), user_stories(id, title, story_number, sprint_id, epic_id), tasks(id, title)")
        .eq("project_id", projectId)
        .order("log_date", { ascending: false });
      return data ?? [];
    },
  });
  const { data: epics } = useEpics(projectId);
  const { data: sprints } = useSprintsWithStats(projectId);
  const upsertConfig = useUpsertCostConfig();
  const { guardAction, denied, closeDenied } = usePermissions(projectId);

  const [rates, setRates] = useState<Record<string, string>>({});
  const [alertThresholds] = useState({ warning: 70, critical: 90 });

  const currency = project?.currency || "USD";
  const budget = project?.budget ?? 0;

  const initials = (name: string | null) => name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  // Build rate map (user_id -> hourly_rate)
  const rateMap = useMemo(() => {
    const m: Record<string, number> = {};
    configs?.forEach(c => { if (c.user_id) m[c.user_id] = c.hourly_rate; });
    return m;
  }, [configs]);

  const approvedLogs = useMemo(() => (logs ?? []).filter(l => (l as any).approved === true), [logs]);

  // Cost calculations
  const costByMember = useMemo(() => {
    const m: Record<string, { name: string; hours: number; rate: number; cost: number }> = {};
    approvedLogs.forEach(l => {
      const rate = rateMap[l.user_id] ?? 0;
      if (!m[l.user_id]) m[l.user_id] = { name: l.profiles?.full_name || l.profiles?.email || "?", hours: 0, rate, cost: 0 };
      m[l.user_id].hours += l.hours;
      m[l.user_id].cost += l.hours * rate;
    });
    return Object.values(m).sort((a, b) => b.cost - a.cost);
  }, [approvedLogs, rateMap]);

  const totalCost = costByMember.reduce((a, m) => a + m.cost, 0);
  const totalHours = approvedLogs.reduce((a, l) => a + l.hours, 0);
  const budgetUsed = budget > 0 ? Math.round((totalCost / budget) * 100) : 0;
  const variance = budget - totalCost;

  // Cost by epic
  const costByEpic = useMemo(() => {
    const m: Record<string, { name: string; hours: number; cost: number }> = {};
    approvedLogs.forEach(l => {
      const storyEpic = l.user_stories?.epic_id ? "con_epica" : "sin_epica";
      // Simplified - group by whether story has epic
      const epicId = storyEpic;
      const rate = rateMap[l.user_id] ?? 0;
      if (!m[epicId]) m[epicId] = { name: epicId === "sin_epica" ? "Sin épica" : "Con épica", hours: 0, cost: 0 };
      m[epicId].hours += l.hours;
      m[epicId].cost += l.hours * rate;
    });
    return Object.values(m);
  }, [approvedLogs, rateMap]);

  // Cost by sprint
  const costBySprint = useMemo(() => {
    if (!sprints) return [];
    return sprints.map(s => {
      const sprintLogs = approvedLogs.filter(l =>
        l.user_stories?.sprint_id === s.id
      );
      const hours = sprintLogs.reduce((a, l) => a + l.hours, 0);
      const cost = sprintLogs.reduce((a, l) => a + l.hours * (rateMap[l.user_id] ?? 0), 0);
      return { name: s.name, points: s.totalPoints, hours, cost, pctBudget: budget > 0 ? Math.round((cost / budget) * 100) : 0 };
    });
  }, [sprints, approvedLogs, rateMap, budget]);

  const saveRates = () => {
    guardAction("costos", "editar_tarifas", "editar tarifas del proyecto", async () => {
      for (const [userId, rateStr] of Object.entries(rates)) {
        const rate = parseFloat(rateStr);
        if (isNaN(rate)) continue;
        const existing = configs?.find(c => c.user_id === userId);
        await upsertConfig.mutateAsync({ id: existing?.id, project_id: projectId, user_id: userId, hourly_rate: rate, currency });
      }
      setRates({});
    });
  };

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {budget > 0 && budgetUsed >= alertThresholds.critical && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>🔴 Alerta: Has superado el {alertThresholds.critical}% del presupuesto estimado ({budgetUsed}% usado)</span>
        </div>
      )}
      {budget > 0 && budgetUsed >= alertThresholds.warning && budgetUsed < alertThresholds.critical && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>🟡 Advertencia: Has consumido el {budgetUsed}% del presupuesto</span>
        </div>
      )}

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="rates">Tarifas</TabsTrigger>
          <TabsTrigger value="detail">Detalle</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Presupuesto Total</p>
                <p className="text-xl font-bold">${budget.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{currency}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Costo Real</p>
                <p className="text-xl font-bold">${totalCost.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{totalHours.toFixed(1)}h registradas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Variación</p>
                <p className={`text-xl font-bold ${variance >= 0 ? "text-success" : "text-destructive"}`}>
                  {variance >= 0 ? "+" : ""}${Math.abs(variance).toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">{variance >= 0 ? "Bajo presupuesto" : "Sobre presupuesto"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">% Usado</p>
                <p className="text-xl font-bold">{budgetUsed}%</p>
                <div className="w-full h-1.5 bg-muted rounded-full mt-1">
                  <div className={`h-full rounded-full ${budgetUsed > 90 ? "bg-destructive" : budgetUsed > 70 ? "bg-warning" : "bg-success"}`} style={{ width: `${Math.min(budgetUsed, 100)}%` }} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Proyección (EAC)</p>
                <p className="text-xl font-bold">
                  ${totalHours > 0 ? Math.round(totalCost * 1.2).toLocaleString() : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">Estimado al finalizar</p>
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {approvedLogs.reduce((a, l) => a + l.hours, 0).toFixed(1)} de {(logs ?? []).reduce((a, l) => a + l.hours, 0)} horas aprobadas
          </p>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Costo por miembro</CardTitle></CardHeader>
              <CardContent>
                {costByMember.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={costByMember}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                      <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Costo" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground text-center py-8">Sin datos</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Distribución por épica</CardTitle></CardHeader>
              <CardContent>
                {costByEpic.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={costByEpic} dataKey="cost" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {costByEpic.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground text-center py-8">Sin datos</p>}
              </CardContent>
            </Card>
          </div>

          {costBySprint.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Costo por Sprint</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={costBySprint}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                    <Bar dataKey="cost" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Costo" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Configuración de Tarifas por Miembro</CardTitle>
                <Button size="sm" onClick={saveRates} disabled={Object.keys(rates).length === 0 || isArchived}>
                  <Save className="h-4 w-4 mr-1" />Guardar tarifas
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Miembro</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Tarifa/hora ({currency})</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members?.map(m => {
                    const existing = configs?.find(c => c.user_id === m.user_id);
                    const currentRate = rates[m.user_id] ?? existing?.hourly_rate?.toString() ?? "";
                    return (
                      <TableRow key={m.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px] bg-muted">{initials(m.profiles?.full_name ?? null)}</AvatarFallback></Avatar>
                            <div>
                              <p className="text-sm font-medium">{m.profiles?.full_name || m.profiles?.email}</p>
                              <p className="text-[10px] text-muted-foreground">{m.profiles?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{m.project_role}</Badge></TableCell>
                        <TableCell>
                          <Input
                            type="number" min={0} step={0.01} className="h-8 w-28 text-sm"
                            value={currentRate}
                            onChange={e => setRates(prev => ({ ...prev, [m.user_id]: e.target.value }))}
                            placeholder="0.00"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detail" className="space-y-4">
          {/* By sprint */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Detalle por Sprint</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sprint</TableHead>
                    <TableHead>Story Points</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Costo</TableHead>
                    <TableHead>% Presupuesto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costBySprint.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-medium">{s.name}</TableCell>
                      <TableCell className="text-sm">{s.points}</TableCell>
                      <TableCell className="text-sm">{s.hours.toFixed(1)}h</TableCell>
                      <TableCell className="text-sm">${s.cost.toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{s.pctBudget}%</TableCell>
                    </TableRow>
                  ))}
                  {costBySprint.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin sprints</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* By member */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Detalle por Miembro</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Miembro</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Tarifa/h</TableHead>
                    <TableHead>Costo Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costByMember.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-medium">{m.name}</TableCell>
                      <TableCell className="text-sm">{m.hours.toFixed(1)}h</TableCell>
                      <TableCell className="text-sm">${m.rate}/h</TableCell>
                      <TableCell className="text-sm font-medium">${m.cost.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {costByMember.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sin datos</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PermissionDeniedDialog open={denied.open} onOpenChange={closeDenied} actionLabel={denied.actionLabel} requiredPermission={denied.requiredPermission} />
    </div>
  );
}
