import { Project } from "@/hooks/useProjects";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MoreHorizontal, Eye, Pencil, Archive, Copy } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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

export function ProjectCard({ project, onEdit }: { project: Project; onEdit: (p: Project) => void }) {
  const navigate = useNavigate();
  const { data: members } = useProjectMembers(project.id);
  const { data: stats } = useProjectStats(project.id);
  const status = statusConfig[project.status] || statusConfig.active;
  const progress = stats && stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const initials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  };

  return (
    <Card className="border-border hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate(`/proyectos/${project.id}`)}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: project.color || "#1E3A5F" }}>
              {project.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
              <p className="text-xs text-muted-foreground truncate">{project.client_name || "Sin cliente"}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => navigate(`/proyectos/${project.id}`)}><Eye className="h-4 w-4 mr-2" />Ver</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(project)}><Pencil className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
              <DropdownMenuItem><Archive className="h-4 w-4 mr-2" />Archivar</DropdownMenuItem>
              <DropdownMenuItem><Copy className="h-4 w-4 mr-2" />Duplicar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progreso</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {(members ?? []).slice(0, 4).map((m) => (
              <Avatar key={m.id} className="h-7 w-7 border-2 border-card">
                <AvatarFallback className="text-[10px] bg-muted">{initials(m.profiles?.full_name ?? null)}</AvatarFallback>
              </Avatar>
            ))}
            {(members?.length ?? 0) > 4 && (
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground border-2 border-card">
                +{(members?.length ?? 0) - 4}
              </div>
            )}
          </div>
          <Badge className={`${status.color} text-[10px] px-2`}>{status.label}</Badge>
        </div>

        {(project.start_date || project.end_date) && (
          <p className="text-[11px] text-muted-foreground">
            {project.start_date ? new Date(project.start_date).toLocaleDateString("es") : "—"} → {project.end_date ? new Date(project.end_date).toLocaleDateString("es") : "—"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
