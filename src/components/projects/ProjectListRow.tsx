import { Project } from "@/hooks/useProjects";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { useProjectMembers, useProjectStats } from "@/hooks/useProjects";

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Activo", color: "bg-success text-success-foreground" },
  paused: { label: "En Pausa", color: "bg-warning text-warning-foreground" },
  planning: { label: "Planificación", color: "bg-info text-info-foreground" },
  completed: { label: "Completado", color: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelado", color: "bg-destructive text-destructive-foreground" },
  archived: { label: "Archivado", color: "bg-muted text-muted-foreground" },
};

export function ProjectListRow({ project, onEdit }: { project: Project; onEdit: (p: Project) => void }) {
  const navigate = useNavigate();
  const { data: members } = useProjectMembers(project.id);
  const { data: stats } = useProjectStats(project.id);
  const status = statusConfig[project.status] || statusConfig.active;
  const progress = stats && stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <tr className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => navigate(`/proyectos/${project.id}`)}>
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: project.color || "#1E3A5F" }}>
            {project.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">{project.name}</p>
            <p className="text-xs text-muted-foreground">{project.client_name || "—"}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4"><Badge className={`${status.color} text-[10px]`}>{status.label}</Badge></td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2 w-32">
          <Progress value={progress} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground">{progress}%</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex -space-x-1.5">
          {(members ?? []).slice(0, 3).map((m) => (
            <Avatar key={m.id} className="h-6 w-6 border border-card">
              <AvatarFallback className="text-[9px] bg-muted">
                {m.profiles?.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "?"}
              </AvatarFallback>
            </Avatar>
          ))}
          {(members?.length ?? 0) > 3 && <span className="text-xs text-muted-foreground ml-1">+{(members?.length ?? 0) - 3}</span>}
        </div>
      </td>
      <td className="py-3 px-4 text-xs text-muted-foreground">
        {project.start_date ? new Date(project.start_date).toLocaleDateString("es") : "—"}
      </td>
      <td className="py-3 px-4 text-xs text-muted-foreground">
        {project.end_date ? new Date(project.end_date).toLocaleDateString("es") : "—"}
      </td>
    </tr>
  );
}
