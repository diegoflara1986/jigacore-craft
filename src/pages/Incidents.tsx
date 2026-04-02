import { useState } from "react";
import {
  useIncidents, useIncidentStats, useSlaConfigs, useIncidentPermissions,
  Incident, STATUSES, SEVERITIES, CATEGORIES,
  getStatusInfo, getSeverityInfo, getCategoryLabel,
} from "@/hooks/useIncidents";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/usePageTitle";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertTriangle, Bug, CheckCircle2, Clock, Search, X, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { IncidentDetailSheet } from "@/components/incidents/IncidentDetailSheet";
import { IncidentCreateModal } from "@/components/incidents/IncidentCreateModal";
import { useAuth } from "@/lib/auth";

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

function SlaIndicator({ incident, slaConfigs }: { incident: Incident; slaConfigs: any[] }) {
  if (incident.status === "cerrado") return <span className="text-xs text-green-600">✅</span>;
  if (incident.is_requirement || incident.severity === "no_aplica") return <span className="text-xs text-muted-foreground">⚫</span>;
  if (!incident.severity) return <span className="text-xs text-muted-foreground">—</span>;
  const sla = slaConfigs.find((s: any) => s.severity === incident.severity);
  if (!sla) return <span className="text-xs text-muted-foreground">—</span>;
  const elapsed = (Date.now() - new Date(incident.created_at).getTime()) / 3600000;
  const remaining = sla.resolution_hours - elapsed;
  const threshold = sla.resolution_hours * 0.2;
  if (remaining > threshold) return <span className="text-xs text-green-600">🟢 OK</span>;
  if (remaining > 0) return <span className="text-xs text-yellow-600">🟡 {Math.round(remaining)}h</span>;
  return <span className="text-xs text-red-600">🔴 +{Math.abs(Math.round(remaining))}h</span>;
}

export default function Incidents() {
  usePageTitle("Incidentes");
  const { profile, user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: stats } = useIncidentStats();
  const { data: slaConfigs } = useSlaConfigs();
  const { data: permConfigs } = useIncidentPermissions();

  const userRole = profile?.role ?? "external_user";
  const isAdmin = ["admin", "super_admin"].includes(userRole);
  const canCreate = isAdmin || (permConfigs ?? []).some(c => c.role === userRole && c.can_create);
  const canManage = isAdmin || (permConfigs ?? []).some(c => c.role === userRole && c.can_manage);

  const filters: any = {
    search: search || undefined,
    status: statusFilter !== "all" ? [statusFilter] : undefined,
    severity: severityFilter !== "all" ? severityFilter : undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    projectId: projectFilter !== "all" ? projectFilter : undefined,
    assignedTo: assignedFilter !== "all" ? assignedFilter : undefined,
    // If user can only create (client), show only their own incidents
    createdBy: !canManage && canCreate ? user?.id : undefined,
    page,
  };

  const { data: result, isLoading } = useIncidents(filters);
  const incidents = result?.data ?? [];
  const totalCount = result?.count ?? 0;

  const { data: projects } = useQuery({
    queryKey: ["projects-for-filter"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name").eq("status", "active").order("name");
      return data ?? [];
    },
  });

  const { data: members } = useQuery({
    queryKey: ["workspace-members"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles_safe_view").select("id, full_name, email");
      return data ?? [];
    },
    enabled: canManage,
  });

  const clearFilters = () => {
    setSearch(""); setStatusFilter("all"); setSeverityFilter("all");
    setCategoryFilter("all"); setProjectFilter("all"); setAssignedFilter("all");
    setPage(0);
  };

  const totalPages = Math.ceil(totalCount / 20);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Incidentes</h1>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Reportar Incidente
          </Button>
        )}
      </div>

      {/* Metrics - different for managers vs clients */}
      {canManage ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Pendientes sin evaluar" value={stats?.pendingNoSeverity ?? 0}
            icon={AlertTriangle} color={`${(stats?.pendingNoSeverity ?? 0) > 0 ? "bg-red-500/10 text-red-600" : "bg-gray-500/10 text-gray-600"}`} />
          <MetricCard title="En proceso" value={stats?.inProcess ?? 0} icon={Bug} color="bg-blue-500/10 text-blue-600" />
          <MetricCard title="SLA Vencidos" value={0} icon={Clock} color="bg-red-500/10 text-red-600" />
          <MetricCard title="Resueltos este mes" value={stats?.resolvedThisMonth ?? 0} icon={CheckCircle2} color="bg-green-500/10 text-green-600" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              {totalCount === 0 ? "No tienes incidentes reportados" : `Tienes ${totalCount} incidente(s) reportado(s)`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground mb-1 block">Buscar</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por título o código..." className="pl-8" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
          </div>
        </div>
        <FilterSelect label="Estado" value={statusFilter} onChange={v => { setStatusFilter(v); setPage(0); }}
          options={STATUSES.map(s => ({ value: s.value, label: s.label }))} />
        {canManage && (
          <>
            <FilterSelect label="Severidad" value={severityFilter} onChange={v => { setSeverityFilter(v); setPage(0); }}
              options={SEVERITIES.map(s => ({ value: s.value, label: s.label }))} />
            <FilterSelect label="Categoría" value={categoryFilter} onChange={v => { setCategoryFilter(v); setPage(0); }}
              options={CATEGORIES.map(c => ({ value: c.value, label: c.label }))} />
          </>
        )}
        <FilterSelect label="Proyecto" value={projectFilter} onChange={v => { setProjectFilter(v); setPage(0); }}
          options={projects?.map(p => ({ value: p.id, label: p.name })) ?? []} />
        {canManage && (
          <FilterSelect label="Asignado" value={assignedFilter} onChange={v => { setAssignedFilter(v); setPage(0); }}
            options={members?.map(m => ({ value: m.id!, label: m.full_name || m.email || "" })) ?? []} />
        )}
        <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" /> Limpiar</Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Severidad</TableHead>
                <TableHead>Estado</TableHead>
                {canManage && <TableHead>Asignado</TableHead>}
                <TableHead>Fecha</TableHead>
                {canManage && <TableHead>SLA</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={canManage ? 8 : 6}><TableSkeleton rows={5} cols={canManage ? 8 : 6} /></TableCell></TableRow>
              ) : !incidents.length ? (
                <TableRow><TableCell colSpan={canManage ? 8 : 6}><EmptyState type="incidents" /></TableCell></TableRow>
              ) : incidents.map(inc => {
                const statusInfo = getStatusInfo(inc.status);
                const sevInfo = getSeverityInfo(inc.severity);
                return (
                  <TableRow key={inc.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedId(inc.id)}>
                    <TableCell><span className="font-mono text-xs font-semibold text-primary">{inc.ticket_code}</span></TableCell>
                    <TableCell>
                      <Tooltip><TooltipTrigger asChild><span className="text-sm truncate block max-w-[200px]">{inc.title}</span></TooltipTrigger>
                        <TooltipContent>{inc.title}</TooltipContent></Tooltip>
                    </TableCell>
                    <TableCell>{inc.projects && <Badge variant="outline" style={{ borderColor: inc.projects.color || undefined }}>{inc.projects.name}</Badge>}</TableCell>
                    <TableCell>
                      {inc.is_requirement ? (
                        <Badge className="bg-blue-100 text-blue-800">Requerimiento</Badge>
                      ) : (
                        <Badge className={sevInfo.color}>{sevInfo.label}</Badge>
                      )}
                    </TableCell>
                    <TableCell><Badge className={statusInfo.color}>{statusInfo.icon} {statusInfo.label}</Badge></TableCell>
                    {canManage && (
                      <TableCell>
                        {inc.assigned_profile ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-6 w-6"><AvatarFallback className="text-xs">{(inc.assigned_profile.full_name || inc.assigned_profile.email)[0]}</AvatarFallback></Avatar>
                            <span className="text-xs">{inc.assigned_profile.full_name || inc.assigned_profile.email}</span>
                          </div>
                        ) : <span className="text-xs text-red-500">Sin asignar</span>}
                      </TableCell>
                    )}
                    <TableCell><span className="text-xs text-muted-foreground">{timeAgo(inc.created_at)}</span></TableCell>
                    {canManage && <TableCell><SlaIndicator incident={inc} slaConfigs={slaConfigs ?? []} /></TableCell>}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{totalCount} incidentes</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="px-3 py-1 text-sm">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      <IncidentCreateModal open={createOpen} onOpenChange={setCreateOpen} onCreated={(id) => { setCreateOpen(false); setSelectedId(id); }} />
      <IncidentDetailSheet incidentId={selectedId} onClose={() => setSelectedId(null)} canManage={canManage} canClose={isAdmin || (permConfigs ?? []).some(c => c.role === userRole && c.can_close)} />
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) {
  return (
    <Card><CardContent className="flex items-center gap-4 p-5">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}><Icon className="h-6 w-6" /></div>
      <div><p className="text-sm text-muted-foreground">{title}</p><p className="text-2xl font-bold text-foreground">{value}</p></div>
    </CardContent></Card>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="min-w-[140px]">
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
