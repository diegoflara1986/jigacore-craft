import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { FileDown, FileSpreadsheet, CalendarIcon } from "lucide-react";
import { format, subDays, subMonths, startOfYear } from "date-fns";
import { es } from "date-fns/locale";
import { useAllProjects, useAllUserStories, useAllSprints, useAllTimeLogs, useAllIncidents, useAllCostConfigs, useAllProjectMembers, useAllEpics } from "@/hooks/useReportData";
import { useSlaConfigs } from "@/hooks/useIncidents";
import { ReportDashboardTab } from "@/components/reports/ReportDashboardTab";
import { ReportSprintTab } from "@/components/reports/ReportSprintTab";
import { ReportTeamTab } from "@/components/reports/ReportTeamTab";
import { ReportFinancialTab } from "@/components/reports/ReportFinancialTab";
import { ReportIncidentsTab } from "@/components/reports/ReportIncidentsTab";
import { ReportStakeholderTab } from "@/components/reports/ReportStakeholderTab";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { useProjects } from "@/hooks/useProjects";

const PERIOD_OPTIONS = [
  { value: "week", label: "Última semana" },
  { value: "month", label: "Último mes" },
  { value: "quarter", label: "Último trimestre" },
  { value: "year", label: "Este año" },
  { value: "custom", label: "Rango personalizado" },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [period, setPeriod] = useState("month");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});

  const { dateFrom, dateTo } = useMemo(() => {
    const now = new Date();
    let from: Date, to: Date = now;
    switch (period) {
      case "week": from = subDays(now, 7); break;
      case "quarter": from = subMonths(now, 3); break;
      case "year": from = startOfYear(now); break;
      case "custom": from = customRange.from || subMonths(now, 1); to = customRange.to || now; break;
      default: from = subMonths(now, 1);
    }
    return { dateFrom: format(from, "yyyy-MM-dd"), dateTo: format(to, "yyyy-MM-dd") };
  }, [period, customRange]);

  const projectId = selectedProject !== "all" ? selectedProject : undefined;

  const { profile } = useAuth();
  const { hasScope, hasPermission } = usePermissions();
  const isAdmin = ["admin", "super_admin"].includes(profile?.role ?? "");
  const onlyAssigned = !isAdmin && hasScope("reportes", "solo_asignados");
  const canVerInteresados = hasPermission("reportes", "ver_interesados");
  const { data: assignedProjects } = useProjects(undefined, undefined, onlyAssigned);
  const assignedProjectIds = onlyAssigned
    ? (assignedProjects ?? []).map((p) => p.id)
    : undefined;

  const { data: projects = [] } = useAllProjects(assignedProjectIds);
  const { data: stories = [] } = useAllUserStories(projectId);
  const { data: sprints = [] } = useAllSprints(projectId);
  const { data: timeLogs = [] } = useAllTimeLogs(projectId, dateFrom, dateTo);
  const { data: incidents = [] } = useAllIncidents(projectId, dateFrom, dateTo);
  const { data: costConfigs = [] } = useAllCostConfigs(projectId);
  const { data: members = [] } = useAllProjectMembers(projectId);
  const { data: epics = [] } = useAllEpics(projectId);
  const { data: slaConfigs = [] } = useSlaConfigs();

  const exportPDF = () => toast({ title: "Exportación PDF", description: "Funcionalidad de exportación próximamente" });
  const exportExcel = () => toast({ title: "Exportación Excel", description: "Funcionalidad de exportación próximamente" });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Reportes y Análisis</h1>
        <div className="flex items-center gap-2">
          <Button onClick={exportPDF} variant="outline" className="gap-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground">
            <FileDown className="h-4 w-4" /> PDF
          </Button>
          <Button onClick={exportExcel} variant="outline" className="gap-2 border-success text-success hover:bg-success hover:text-success-foreground">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      {/* Global Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg bg-card border">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Proyecto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los proyectos</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        {period === "custom" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2"><CalendarIcon className="h-4 w-4" />{customRange.from ? format(customRange.from, "dd/MM/yy") : "Desde"} - {customRange.to ? format(customRange.to, "dd/MM/yy") : "Hasta"}</Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="range" selected={customRange as any} onSelect={(range: any) => setCustomRange(range || {})} locale={es} numberOfMonths={2} />
            </PopoverContent>
          </Popover>
        )}

        <span className="text-xs text-muted-foreground ml-auto">
          {dateFrom} → {dateTo}
        </span>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted">
          <TabsTrigger value="dashboard">Dashboard General</TabsTrigger>
          <TabsTrigger value="sprint">Sprint Report</TabsTrigger>
          <TabsTrigger value="team">Equipo</TabsTrigger>
          <TabsTrigger value="financial">Financiero</TabsTrigger>
          <TabsTrigger value="incidents">Incidentes</TabsTrigger>
          {canVerInteresados && (
            <TabsTrigger value="stakeholder">Vista Interesados</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="dashboard">
          <ReportDashboardTab stories={stories} sprints={sprints} incidents={incidents} timeLogs={timeLogs} dateFrom={dateFrom} dateTo={dateTo} projects={projects} members={members} selectedProjectId={projectId} />
        </TabsContent>

        <TabsContent value="sprint">
          <ReportSprintTab sprints={sprints} stories={stories} timeLogs={timeLogs} members={members} projectId={projectId} />
        </TabsContent>

        <TabsContent value="team">
          <ReportTeamTab stories={stories} timeLogs={timeLogs} members={members} sprints={sprints} projects={projects} />
        </TabsContent>

        <TabsContent value="financial">
          <ReportFinancialTab projects={projects} timeLogs={timeLogs} costConfigs={costConfigs} sprints={sprints} members={members} selectedProjectId={projectId} />
        </TabsContent>

        <TabsContent value="incidents">
          <ReportIncidentsTab incidents={incidents} slaConfigs={slaConfigs} />
        </TabsContent>

        {canVerInteresados && (
          <TabsContent value="stakeholder">
            <ReportStakeholderTab
              projects={projects}
              stories={stories}
              sprints={sprints}
              timeLogs={timeLogs}
              costConfigs={costConfigs}
              members={members}
              epics={epics}
              selectedProjectId={projectId}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
