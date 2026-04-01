import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FolderOpen, ListChecks, Calendar, CheckCircle2, Smile, FileText } from "lucide-react";

interface EmptyStateProps {
  type: "projects" | "backlog" | "sprints" | "kanban" | "incidents" | "my-work" | "generic";
  onAction?: () => void;
  actionLabel?: string;
  title?: string;
  description?: string;
}

const configs: Record<string, { icon: ReactNode; title: string; description: string }> = {
  projects: {
    icon: <FolderOpen className="h-16 w-16 text-muted-foreground/40" />,
    title: "Aún no tienes proyectos",
    description: "Crea tu primer proyecto para empezar a gestionar tu equipo con metodología Scrum",
  },
  backlog: {
    icon: <ListChecks className="h-16 w-16 text-muted-foreground/40" />,
    title: "El backlog está vacío",
    description: "Agrega historias de usuario para comenzar a planificar tu proyecto",
  },
  sprints: {
    icon: <Calendar className="h-16 w-16 text-muted-foreground/40" />,
    title: "No hay sprints creados",
    description: "Crea tu primer sprint y comienza a trabajar",
  },
  kanban: {
    icon: <FileText className="h-16 w-16 text-muted-foreground/40" />,
    title: "Sin tareas aquí",
    description: "Mueve o crea tarjetas en esta columna",
  },
  incidents: {
    icon: <CheckCircle2 className="h-16 w-16 text-success/40" />,
    title: "¡Sin incidentes pendientes!",
    description: "No hay incidentes abiertos en este momento",
  },
  "my-work": {
    icon: <Smile className="h-16 w-16 text-success/40" />,
    title: "¡Todo al día!",
    description: "No tienes tareas pendientes por ahora",
  },
  generic: {
    icon: <FileText className="h-16 w-16 text-muted-foreground/40" />,
    title: "Sin datos",
    description: "No hay información disponible",
  },
};

export function EmptyState({ type, onAction, actionLabel, title, description }: EmptyStateProps) {
  const c = configs[type] || configs.generic;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="mb-4">{c.icon}</div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title || c.title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description || c.description}</p>
      {onAction && actionLabel && (
        <Button onClick={onAction} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
