import { useState } from "react";
import { Plus, LayoutGrid, List, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjects, Project } from "@/hooks/useProjects";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectListRow } from "@/components/projects/ProjectListRow";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";

const filters = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "paused", label: "En Pausa" },
  { value: "completed", label: "Completados" },
  { value: "archived", label: "Archivados" },
];

export default function Projects() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const { data: projects, isLoading } = useProjects(status, search);

  const openEdit = (p: Project) => { setEditProject(p); setModalOpen(true); };
  const openNew = () => { setEditProject(null); setModalOpen(true); };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Proyectos</h1>
        <Button onClick={openNew} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4 mr-1" /> Nuevo Proyecto
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {filters.map((f) => (
            <button key={f.value} onClick={() => setStatus(f.value)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${status === f.value ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar proyecto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-64" />
          </div>
          <div className="flex border border-border rounded-md">
            <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" className="h-9 w-9" onClick={() => setView("grid")}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" className="h-9 w-9" onClick={() => setView("list")}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : !projects?.length ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground">No se encontraron proyectos</p>
          <Button onClick={openNew} variant="link" className="mt-2 text-accent">Crear tu primer proyecto</Button>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => <ProjectCard key={p.id} project={p} onEdit={openEdit} />)}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Proyecto</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Estado</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Progreso</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Equipo</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Inicio</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Entrega</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => <ProjectListRow key={p.id} project={p} onEdit={openEdit} />)}
            </tbody>
          </table>
        </div>
      )}

      <ProjectFormModal open={modalOpen} onOpenChange={setModalOpen} project={editProject} />
    </div>
  );
}
