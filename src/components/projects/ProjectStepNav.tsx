import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepDef {
  key: string;
  label: string;
  completed: boolean;
  optional?: boolean;
}

interface Props {
  steps: StepDef[];
  activeStep: string;
  onStepClick: (key: string) => void;
}

export function ProjectStepNav({ steps, activeStep, onStepClick }: Props) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-2">
      {steps.map((step, i) => {
        const isActive = step.key === activeStep;
        const isPast = step.completed;
        return (
          <div key={step.key} className="flex items-center">
            <button
              onClick={() => onStepClick(step.key)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap text-sm",
                isActive && "bg-accent/10 text-accent font-semibold",
                !isActive && isPast && "text-foreground hover:bg-muted",
                !isActive && !isPast && "text-muted-foreground hover:bg-muted"
              )}
            >
              <span className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2",
                isActive && "bg-accent text-accent-foreground border-accent",
                !isActive && isPast && "bg-accent text-accent-foreground border-accent",
                !isActive && !isPast && "bg-muted text-muted-foreground border-muted-foreground/30"
              )}>
                {isPast && !isActive ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span>{step.label}</span>
              {step.optional && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Opcional</span>
              )}
            </button>
            {i < steps.length - 1 && (
              <div className={cn("w-6 h-0.5 mx-0.5 shrink-0", isPast ? "bg-accent" : "bg-muted-foreground/20")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const stepHints: Record<string, string> = {
  team: "👥 Primero agrega los miembros que trabajarán en este proyecto y asígnales su rol",
  backlog: "📋 Crea las Historias de Usuario describiendo las funcionalidades que necesitas desarrollar",
  estimation: "📊 Estima el esfuerzo de cada Historia de Usuario creando rondas de estimación asíncrona con tu equipo",
  epics: "🗂️ Opcional: Agrupa tus HU en Épicas para organizar mejor el trabajo por funcionalidades grandes",
  sprints: "🚀 Crea un Sprint, selecciona las HU a desarrollar y define las fechas de inicio y fin",
  board: "📌 Gestiona el avance diario moviendo las tarjetas entre columnas según su estado",
  time: "⏱️ Registra las horas trabajadas en cada tarea para hacer seguimiento del esfuerzo real",
  costs: "💰 Configura las tarifas del equipo y monitorea el presupuesto vs el costo real",
};

export function StepHintBanner({ step }: { step: string }) {
  const hint = stepHints[step];
  if (!hint) return null;
  return (
    <div className="bg-info/10 border border-info/20 rounded-lg px-4 py-3 text-sm text-info-foreground mb-4">
      {hint}
    </div>
  );
}
