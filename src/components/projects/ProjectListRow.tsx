import { useState } from "react";
import { Project, useProjectMembers, useProjectStats, useDeleteProject } from "@/hooks/useProjects";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Eye, Pencil, Archive, Copy, RotateCcw, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { ArchiveProjectDialog } from "@/components/projects/ArchiveProjectDialog";
import { DuplicateProjectDialog } from "@/components/projects/DuplicateProjectDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { useUpdateProject } from "@/hooks/useProjects";

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

  const { hasPermission } = usePermissions();
  const canEdit      = hasPermission("proyectos", "editar");
  const canArchive   = hasPermission("proyectos", "archivar");
  const canDuplicate = hasPermission("proyectos", "duplicar");
  const canDelete    = hasPermission("proyectos", "eliminar");
  const isArchived   = project.status === "archived";

  const [archiveOpen, setArchiveOpen]     = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen]       = useState(false);

  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();

  const handleDelete = async () => {
    await deleteProject.mutateAsync(project.id);
    setDeleteOpen(false);
  };
  const handleRestore = async () => {
    await updateProject.mutateAsync({ id: project.id, status: "active" });
  };

  return (
    <>
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
      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => navigate(`/proyectos/${project.id}`)}>
              <Eye className="h-4 w-4 mr-2" />Ver
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem onClick={() => onEdit(project)}>
                <Pencil className="h-4 w-4 mr-2" />Editar
              </DropdownMenuItem>
            )}
            {canArchive && (
              isArchived ? (
                <DropdownMenuItem onClick={handleRestore}>
                  <RotateCcw className="h-4 w-4 mr-2" />Restaurar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setArchiveOpen(true)}>
                  <Archive className="h-4 w-4 mr-2" />Archivar
                </DropdownMenuItem>
              )
            )}
            {canDuplicate && (
              <DropdownMenuItem onClick={() => setDuplicateOpen(true)}>
                <Copy className="h-4 w-4 mr-2" />Duplicar
              </DropdownMenuItem>
            )}
            {canDelete && !isArchived && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />Eliminar
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>

    <ArchiveProjectDialog open={archiveOpen} onOpenChange={setArchiveOpen} project={project} />
    <DuplicateProjectDialog open={duplicateOpen} onOpenChange={setDuplicateOpen} project={project} />

    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>¿Eliminar este proyecto?</DialogTitle>
          <DialogDescription>
            Esta acción eliminará permanentemente el proyecto y todos sus datos. No se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteProject.isPending}>
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
