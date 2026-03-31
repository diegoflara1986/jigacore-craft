import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProject, useProjectMembers, useProjectStats } from "@/hooks/useProjects";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ProjectOverviewTab } from "@/components/projects/tabs/ProjectOverviewTab";
import { ProjectTeamTab } from "@/components/projects/tabs/ProjectTeamTab";
import { ProjectEpicsTab } from "@/components/projects/tabs/ProjectEpicsTab";
import { ProjectBacklogTab } from "@/components/projects/tabs/ProjectBacklogTab";
import { ProjectSprintsTab } from "@/components/projects/tabs/ProjectSprintsTab";
import { ProjectKanbanTab } from "@/components/projects/tabs/ProjectKanbanTab";

export default function ProjectDetail() {
  const [activeTab, setActiveTab] = useState("overview");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProject(id);
  const { data: members } = useProjectMembers(id);
  const { data: stats } = useProjectStats(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Proyecto no encontrado</p>
        <Button variant="link" onClick={() => navigate("/proyectos")} className="text-accent mt-2">Volver a proyectos</Button>
      </div>
    );
  }

  const progress = stats && stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/proyectos")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: project.color || "#1E3A5F" }}>
            {project.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
            <p className="text-sm text-muted-foreground">{project.client_name || "Sin cliente"}</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="backlog">Backlog</TabsTrigger>
          <TabsTrigger value="sprints">Sprints</TabsTrigger>
          <TabsTrigger value="board">Tablero</TabsTrigger>
          <TabsTrigger value="epics">Épicas</TabsTrigger>
          <TabsTrigger value="time">Tiempo</TabsTrigger>
          <TabsTrigger value="costs">Costos</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ProjectOverviewTab project={project} members={members ?? []} stats={stats} progress={progress} />
        </TabsContent>
        <TabsContent value="backlog">
          <ProjectBacklogTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="sprints">
          <ProjectSprintsTab projectId={project.id} onNavigateToBoard={() => setActiveTab("board")} />
        </TabsContent>
        <TabsContent value="board">
          <ProjectKanbanTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="epics">
          <ProjectEpicsTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="time">
          <div className="text-muted-foreground py-10 text-center">Registro de Tiempo — Próximamente</div>
        </TabsContent>
        <TabsContent value="costs">
          <div className="text-muted-foreground py-10 text-center">Costos — Próximamente</div>
        </TabsContent>
        <TabsContent value="settings">
          <ProjectTeamTab projectId={project.id} members={members ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
