import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Props {
  projects: any[];
  timeLogs: any[];
  costConfigs: any[];
  sprints: any[];
  members: any[];
  selectedProjectId?: string;
}

export function ReportFinancialTab({ projects, timeLogs, costConfigs, sprints, members, selectedProjectId }: Props) {
  const project = projects.find(p => p.id === selectedProjectId);
  const budget = project?.budget ?? 0;
  const currency = project?.currency ?? "USD";

  // Build rate map
  const rateMap: Record<string, number> = {};
  costConfigs.forEach(c => { if (c.user_id) rateMap[c.user_id] = c.hourly_rate; });

  const realCost = timeLogs.reduce((sum, t) => sum + (t.hours ?? 0) * (rateMap[t.user_id] ?? 0), 0);
  const remaining = budget - realCost;
  const pctUsed = budget > 0 ? Math.round((realCost / budget) * 100) : 0;

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

  // Monthly data for chart
  const months: Record<string, number> = {};
  timeLogs.forEach(t => {
    const m = t.log_date?.slice(0, 7);
    if (m) months[m] = (months[m] ?? 0) + (t.hours ?? 0) * (rateMap[t.user_id] ?? 0);
  });
  const sortedMonths = Object.keys(months).sort();
  let cumulative = 0;
  const chartData = sortedMonths.map(m => {
    cumulative += months[m];
    return { mes: m, real: Math.round(cumulative), presupuesto: budget };
  });

  // Per sprint breakdown
  const sprintData = sprints.map(s => {
    const sprintLogs = timeLogs.filter(t => {
      if (!s.start_date || !s.end_date) return false;
      return t.log_date >= s.start_date && t.log_date <= s.end_date;
    });
    const hours = sprintLogs.reduce((a: number, t: any) => a + (t.hours ?? 0), 0);
    const cost = sprintLogs.reduce((a: number, t: any) => a + (t.hours ?? 0) * (rateMap[t.user_id] ?? 0), 0);
    return { name: s.name, hours: Math.round(hours * 10) / 10, cost: Math.round(cost) };
  }).filter(s => s.hours > 0);

  // Per member breakdown
  const memberCosts = members.map((m: any) => {
    const p = m.profiles;
    const hours = timeLogs.filter(t => t.user_id === p?.id).reduce((a: number, t: any) => a + (t.hours ?? 0), 0);
    const rate = rateMap[p?.id] ?? 0;
    return { name: p?.full_name || p?.email, role: m.project_role, rate, hours: Math.round(hours * 10) / 10, cost: Math.round(hours * rate) };
  }).filter(m => m.hours > 0).sort((a, b) => b.cost - a.cost);

  // All projects view
  const allProjectsData = !selectedProjectId ? projects.map(p => {
    const pLogs = timeLogs.filter(t => t.project_id === p.id);
    const pCosts = costConfigs.filter(c => c.project_id === p.id);
    const pRateMap: Record<string, number> = {};
    pCosts.forEach(c => { if (c.user_id) pRateMap[c.user_id] = c.hourly_rate; });
    const spent = pLogs.reduce((sum: number, t: any) => sum + (t.hours ?? 0) * (pRateMap[t.user_id] ?? 0), 0);
    const pct = p.budget ? Math.round((spent / p.budget) * 100) : 0;
    return { id: p.id, name: p.name, budget: p.budget ?? 0, spent: Math.round(spent), remaining: Math.round((p.budget ?? 0) - spent), pct, currency: p.currency || "USD" };
  }) : [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Presupuesto Total" value={fmt(budget)} icon={<Wallet className="h-5 w-5" />} color="text-info" />
        <KPICard title="Costo Real" value={fmt(realCost)} icon={<DollarSign className="h-5 w-5" />} color="text-accent" />
        <KPICard title="Restante" value={fmt(remaining)} icon={remaining >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />} color={remaining >= 0 ? "text-success" : "text-destructive"} />
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">% Consumido</p>
            <p className={`text-3xl font-bold mt-1 ${pctUsed > 90 ? "text-destructive" : pctUsed > 70 ? "text-warning" : "text-success"}`}>{pctUsed}%</p>
            <Progress value={Math.min(pctUsed, 100)} className="mt-3 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Budget vs Real Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Presupuesto vs Gasto Real</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend />
                <Line type="monotone" dataKey="presupuesto" stroke="hsl(199, 89%, 48%)" strokeDasharray="5 5" name="Presupuesto" dot={false} />
                <Line type="monotone" dataKey="real" stroke="hsl(24, 95%, 53%)" name="Gasto Real" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Sprint Breakdown */}
      {sprintData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Desglose por Sprint</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Sprint</TableHead><TableHead>Horas</TableHead><TableHead>Costo</TableHead><TableHead>% Presupuesto</TableHead></TableRow></TableHeader>
              <TableBody>
                {sprintData.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.hours}h</TableCell>
                    <TableCell>{fmt(s.cost)}</TableCell>
                    <TableCell>{budget > 0 ? `${Math.round((s.cost / budget) * 100)}%` : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Member Breakdown */}
      {memberCosts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Desglose por Miembro</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Miembro</TableHead><TableHead>Rol</TableHead><TableHead>Tarifa/h</TableHead><TableHead>Horas</TableHead><TableHead>Costo Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {memberCosts.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarFallback className="text-xs">{(m.name || "?")[0]}</AvatarFallback></Avatar>{m.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{m.role}</Badge></TableCell>
                    <TableCell>{fmt(m.rate)}</TableCell>
                    <TableCell>{m.hours}h</TableCell>
                    <TableCell className="font-semibold">{fmt(m.cost)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell>{memberCosts.reduce((a, m) => a + m.hours, 0)}h</TableCell>
                  <TableCell>{fmt(memberCosts.reduce((a, m) => a + m.cost, 0))}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* All Projects */}
      {allProjectsData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Todos los Proyectos</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Proyecto</TableHead><TableHead>Presupuesto</TableHead><TableHead>Gastado</TableHead><TableHead>Restante</TableHead><TableHead>% Usado</TableHead></TableRow></TableHeader>
              <TableBody>
                {allProjectsData.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{new Intl.NumberFormat("en-US", { style: "currency", currency: p.currency }).format(p.budget)}</TableCell>
                    <TableCell>{new Intl.NumberFormat("en-US", { style: "currency", currency: p.currency }).format(p.spent)}</TableCell>
                    <TableCell className={p.remaining < 0 ? "text-destructive" : ""}>{new Intl.NumberFormat("en-US", { style: "currency", currency: p.currency }).format(p.remaining)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min(p.pct, 100)} className={`h-2 w-16 ${p.pct > 90 ? "[&>div]:bg-destructive" : p.pct > 70 ? "[&>div]:bg-warning" : ""}`} />
                        <span className={`text-xs font-medium ${p.pct > 90 ? "text-destructive" : p.pct > 70 ? "text-warning" : "text-success"}`}>{p.pct}%</span>
                      </div>
                    </TableCell>
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
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
          <div className={`p-2 rounded-lg bg-muted ${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
