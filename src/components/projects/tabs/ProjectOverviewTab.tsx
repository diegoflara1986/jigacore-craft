import { Project, ProjectMember } from "@/hooks/useProjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarDays, DollarSign, CheckCircle2, Clock, ListTodo, AlertTriangle } from "lucide-react";

const statusLabels: Record<string, string> = {
  active: "Activo", paused: "En Pausa", planning: "Planificación",
  completed: "Completado", cancelled: "Cancelado",
};

interface Props {
  project: Project;
  members: ProjectMember[];
  stats: { total: number; completed: number; inProgress: number; pending: number } | null | undefined;
  progress: number;
}

export function ProjectOverviewTab({ project, members, stats, progress }: Props) {
  const initials = (name: string | null) => name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  return (
    <div className="space-y-6 mt-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base">Información General</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Estado</span><Badge variant="outline">{statusLabels[project.status] || project.status}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span className="text-foreground">{project.client_name || "—"}</span></div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Fechas</span>
              <span className="text-foreground flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />
                {project.start_date ? new Date(project.start_date).toLocaleDateString("es") : "—"} → {project.end_date ? new Date(project.end_date).toLocaleDateString("es") : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Presupuesto</span>
              <span className="text-foreground flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />
                {project.budget ? `${project.budget.toLocaleString()} ${(project as any).currency || "USD"}` : "—"}
              </span>
            </div>
            {project.description && <p className="text-muted-foreground pt-2 border-t border-border">{project.description}</p>}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base">Progreso</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Completado</span>
                <span className="font-semibold text-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <ListTodo className="h-4 w-4 text-info" />
                <div><p className="text-lg font-bold text-foreground">{stats?.total ?? 0}</p><p className="text-[11px] text-muted-foreground">Total HU</p></div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <div><p className="text-lg font-bold text-foreground">{stats?.completed ?? 0}</p><p className="text-[11px] text-muted-foreground">Completadas</p></div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Clock className="h-4 w-4 text-warning" />
                <div><p className="text-lg font-bold text-foreground">{stats?.inProgress ?? 0}</p><p className="text-[11px] text-muted-foreground">En progreso</p></div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <div><p className="text-lg font-bold text-foreground">{stats?.pending ?? 0}</p><p className="text-[11px] text-muted-foreground">Pendientes</p></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team */}
      <Card className="border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base">Equipo ({members.length})</CardTitle></CardHeader>
        <CardContent>
          {!members.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin miembros asignados</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2 p-2 pr-4 rounded-lg bg-muted/40">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-muted">{initials(m.profiles?.full_name ?? null)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.profiles?.full_name || m.profiles?.email}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{m.project_role}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
