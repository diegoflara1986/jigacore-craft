import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProject, useUpdateProject, useProjectMembers, useProjectStats } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LayoutDashboard, Settings, Lock, RotateCcw } from "lucide-react";
import { ProjectOverviewTab } from "@/components/projects/tabs/ProjectOverviewTab";
import { ProjectTeamTab } from "@/components/projects/tabs/ProjectTeamTab";
import { ProjectEpicsTab } from "@/components/projects/tabs/ProjectEpicsTab";
import { ProjectBacklogTab } from "@/components/projects/tabs/ProjectBacklogTab";
import { ProjectSprintsTab } from "@/components/projects/tabs/ProjectSprintsTab";
import { ProjectKanbanTab } from "@/components/projects/tabs/ProjectKanbanTab";
import { ProjectTimeTab } from "@/components/projects/tabs/ProjectTimeTab";
import { ProjectCostsTab } from "@/components/projects/tabs/ProjectCostsTab";
import { ProjectStepNav, StepHintBanner, StepDef } from "@/components/projects/ProjectStepNav";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

export default function ProjectDetail() {
  const [activeTab, setActiveTab] = useState("overview");
  const [restoreOpen, setRestoreOpen] = useState(false);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProject(id);
  const { data: members } = useProjectMembers(id);
  const { data: stats } = useProjectStats(id);
  const updateProject = useUpdateProject();

  const isArchived = project?.status === "archived";

  // Fetch completion data for steps
  const { data: epicsCount } = useQuery({
    queryKey: ["epics-count", id],
    queryFn: async () => {
      const { count } = await supabase.from("epics").select("*", { count: "exact", head: true }).eq("project_id", id!);
      return count ?? 0;
    },
    enabled: !!id,
  });

  const { data: sprintsCount } = useQuery({
    queryKey: ["sprints-count", id],
    queryFn: async () => {
      const { count } = await supabase.from("sprints").select("*", { count: "exact", head: true }).eq("project_id", id!);
      return count ?? 0;
    },
    enabled: !!id,
  });

  const { data: storiesData } = useQuery({
    queryKey: ["stories-estimation-check", id],
    queryFn: async () => {
      const { data } = await supabase.from("user_stories").select("story_points").eq("project_id", id!).is("deleted_at", null);
      const stories = data ?? [];
      return {
        total: stories.length,
        allEstimated: stories.length > 0 && stories.every(s => s.story_points != null && s.story_points > 0),
      };
    },
    enabled: !!id,
  });

  const { data: activeSprint } = useQuery({
    queryKey: ["active-sprint-check", id],
    queryFn: async () => {
      const { data } = await supabase.from("sprints").select("id").eq("project_id", id!).eq("status", "active").limit(1);
      return (data ?? []).length > 0;
    },
    enabled: !!id,
  });

  const handleRestore = async () => {
    if (!project) return;
    await updateProject.mutateAsync({ id: project.id, status: "active" });
    setRestoreOpen(false);
    toast({ title: "Proyecto restaurado correctamente" });
  };

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

  const steps: StepDef[] = [
    { key: "team", label: "Equipo", completed: (members?.length ?? 0) > 0 },
    { key: "backlog", label: "Backlog", completed: (storiesData?.total ?? 0) > 0 },
    { key: "estimation", label: "Estimación", completed: storiesData?.allEstimated ?? false },
    { key: "epics", label: "Épicas", completed: (epicsCount ?? 0) > 0, optional: true },
    { key: "sprints", label: "Sprints", completed: (sprintsCount ?? 0) > 0 },
    { key: "board", label: "Tablero", completed: activeSprint ?? false },
    { key: "time", label: "Tiempo", completed: false },
    { key: "costs", label: "Costos", completed: false },
  ];

  const isStepTab = steps.some(s => s.key === activeTab);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Archived Banner */}
      {isArchived && (
        <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-medium">Este proyecto está archivado.</p>
              <p className="text-xs opacity-80">Estás en modo solo lectura.</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="border-yellow-500/50 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20" onClick={() => setRestoreOpen(true)}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />Restaurar Proyecto
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/proyectos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: project.color || "#1E3A5F" }}>
            {project.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
            <p className="text-sm text-muted-foreground">{project.client_name || "Sin cliente"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant={activeTab === "overview" ? "secondary" : "ghost"} size="sm" onClick={() => setActiveTab("overview")}>
            <LayoutDashboard className="h-4 w-4 mr-1" /> Overview
          </Button>
          <Button variant={activeTab === "settings" ? "secondary" : "ghost"} size="sm" onClick={() => setActiveTab("settings")}>
            <Settings className="h-4 w-4 mr-1" /> Configuración
          </Button>
        </div>
      </div>

      {/* Step Navigation */}
      <ProjectStepNav steps={steps} activeStep={activeTab} onStepClick={setActiveTab} />

      {/* Hint Banner */}
      {isStepTab && <StepHintBanner step={activeTab} />}

      {/* Content */}
      {activeTab === "overview" && (
        <ProjectOverviewTab project={project} members={members ?? []} stats={stats} progress={progress} />
      )}
      {activeTab === "team" && (
        <ProjectTeamTab projectId={project.id} members={members ?? []} isArchived={isArchived} />
      )}
      {activeTab === "backlog" && (
        <ProjectBacklogTab projectId={project.id} isArchived={isArchived} />
      )}
      {activeTab === "estimation" && (
        <ProjectBacklogTab projectId={project.id} estimationOnly isArchived={isArchived} />
      )}
      {activeTab === "epics" && (
        <ProjectEpicsTab projectId={project.id} isArchived={isArchived} />
      )}
      {activeTab === "sprints" && (
        <ProjectSprintsTab projectId={project.id} onNavigateToBoard={() => setActiveTab("board")} isArchived={isArchived} />
      )}
      {activeTab === "board" && (
        <ProjectKanbanTab projectId={project.id} isArchived={isArchived} />
      )}
      {activeTab === "time" && (
        <ProjectTimeTab projectId={project.id} isArchived={isArchived} />
      )}
      {activeTab === "costs" && (
        <ProjectCostsTab projectId={project.id} isArchived={isArchived} />
      )}
      {activeTab === "settings" && (
        <ProjectTeamTab projectId={project.id} members={members ?? []} isArchived={isArchived} />
      )}

      {/* Restore Dialog */}
      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>¿Restaurar este proyecto?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Volverá al estado activo con todas sus funciones habilitadas.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreOpen(false)}>Cancelar</Button>
            <Button onClick={handleRestore} disabled={updateProject.isPending}>Restaurar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
