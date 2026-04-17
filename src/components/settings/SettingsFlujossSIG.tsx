import { useState, useEffect, useMemo } from "react";
import {
  useSigFlowConfigs,
  useSaveFlowConfig,
  useWorkspaceUsersForSig,
  SigStepType,
  SigFlowConfig,
} from "@/hooks/useSigFlows";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import {
  ShieldCheck,
  FileText,
  Eye,
  CheckCircle2,
  Send,
  Cog,
  Users as UsersIcon,
  ChevronRight,
  Save,
  ChevronDown,
} from "lucide-react";

interface StepDef {
  type: SigStepType;
  label: string;
  icon: typeof FileText;
  order: number;
  alwaysOn?: boolean;
}

const STEP_DEFS: StepDef[] = [
  { type: "solicitar", label: "Solicitar", icon: Send, order: 1, alwaysOn: true },
  { type: "revisar", label: "Revisar", icon: Eye, order: 2 },
  { type: "aprobar", label: "Aprobar", icon: CheckCircle2, order: 3 },
  { type: "ejecutar", label: "Ejecutar", icon: Cog, order: 4 },
];

interface StepState {
  active: boolean;
  user_ids: string[];
}

type StepsState = Record<SigStepType, StepState>;

const emptyStepsState = (): StepsState => ({
  solicitar: { active: true, user_ids: [] },
  revisar: { active: false, user_ids: [] },
  aprobar: { active: false, user_ids: [] },
  ejecutar: { active: false, user_ids: [] },
});

export function SettingsFlujossSIG() {
  const { data: configs, isLoading } = useSigFlowConfigs();
  const [selectedFormCode, setSelectedFormCode] = useState<string | null>(null);

  const selected = useMemo(
    () => configs?.find((c) => c.form_code === selectedFormCode) ?? null,
    [configs, selectedFormCode]
  );

  // Auto-select first form
  useEffect(() => {
    if (!selectedFormCode && configs?.length) {
      setSelectedFormCode(configs[0].form_code);
    }
  }, [configs, selectedFormCode]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Flujos SIG</h2>
          <p className="text-sm text-muted-foreground">
            Configura el flujo de aprobación de cada formulario del Sistema de
            Gestión.
          </p>
        </div>
      </div>

      <div className="flex gap-4 min-h-[calc(100vh-14rem)]">
        {/* Left column - Forms list */}
        <div className="w-[320px] shrink-0 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-1.5">
              Formularios SIG
            </p>
            <div className="space-y-0.5">
              {(configs ?? []).map((cfg) => (
                <FormListItem
                  key={cfg.form_code}
                  config={cfg}
                  selected={selectedFormCode === cfg.form_code}
                  onSelect={() => setSelectedFormCode(cfg.form_code)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right column - Flow editor */}
        <div className="flex-1 min-w-0">
          {selected ? (
            <FlowEditor key={selected.form_code} config={selected} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Selecciona un formulario para configurar su flujo
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormListItem({
  config,
  selected,
  onSelect,
}: {
  config: SigFlowConfig;
  selected: boolean;
  onSelect: () => void;
}) {
  const hasFlow = (config.steps?.length ?? 0) > 0;
  return (
    <div
      onClick={onSelect}
      className={`flex items-center justify-between px-2.5 py-2 rounded-md cursor-pointer transition-colors text-sm ${
        selected
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <FileText className="h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-sm">{config.form_name}</p>
          <p className="text-[10px] text-muted-foreground">{config.form_code}</p>
        </div>
      </div>
      <Badge
        variant="outline"
        className={`text-[9px] px-1.5 shrink-0 ${
          hasFlow
            ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
            : "border-muted-foreground/40 text-muted-foreground"
        }`}
      >
        {hasFlow ? "Configurado" : "Sin flujo"}
      </Badge>
    </div>
  );
}

function FlowEditor({ config }: { config: SigFlowConfig }) {
  const { data: workspaceUsers } = useWorkspaceUsersForSig();
  const saveMutation = useSaveFlowConfig();

  const initialState = useMemo<StepsState>(() => {
    const state = emptyStepsState();
    for (const step of config.steps ?? []) {
      const t = step.step_type as SigStepType;
      if (state[t]) {
        state[t] = {
          active: true,
          user_ids: (step.step_users ?? []).map((u) => u.user_id),
        };
      }
    }
    state.solicitar.active = true; // always on
    return state;
  }, [config]);

  const [steps, setSteps] = useState<StepsState>(initialState);

  // Reset when config changes
  useEffect(() => {
    setSteps(initialState);
  }, [initialState]);

  const toggleStep = (type: SigStepType, value: boolean) => {
    if (type === "solicitar") return; // locked
    setSteps((prev) => ({
      ...prev,
      [type]: { ...prev[type], active: value },
    }));
  };

  const updateUsers = (type: SigStepType, user_ids: string[]) => {
    setSteps((prev) => ({
      ...prev,
      [type]: { ...prev[type], user_ids },
    }));
  };

  const activeSteps = STEP_DEFS.filter((d) => steps[d.type].active);

  const handleSave = () => {
    const payload = activeSteps.map((d) => ({
      step_type: d.type,
      step_order: d.order,
      user_ids: steps[d.type].user_ids,
    }));

    saveMutation.mutate(
      {
        formCode: config.form_code,
        formName: config.form_name,
        steps: payload,
      },
      {
        onSuccess: () =>
          toast({
            title: "Flujo guardado",
            description: `${config.form_name} actualizado correctamente.`,
          }),
        onError: (err: any) =>
          toast({
            title: "Error al guardar",
            description: err?.message ?? "No se pudo guardar el flujo.",
            variant: "destructive",
          }),
      }
    );
  };

  return (
    <ScrollArea className="h-[calc(100vh-14rem)]">
      <div className="space-y-5 pr-4">
        {/* Header */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl">📋</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-foreground">
                  {config.form_name}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Código: <span className="font-mono">{config.form_code}</span>
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant="outline"
                    className="border-primary/40 text-primary"
                  >
                    Formulario SIG
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {activeSteps.length} paso
                    {activeSteps.length !== 1 ? "s" : ""} activo
                    {activeSteps.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Steps configuration */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-sm text-foreground">
                Pasos del flujo
              </h4>
            </div>
            <div className="space-y-2">
              {STEP_DEFS.map((def) => {
                const state = steps[def.type];
                const Icon = def.icon;
                return (
                  <div
                    key={def.type}
                    className="rounded-md border border-border p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {def.order}. {def.label}
                          </p>
                          {def.alwaysOn && (
                            <p className="text-[10px] text-muted-foreground">
                              Paso obligatorio
                            </p>
                          )}
                        </div>
                      </div>
                      <Switch
                        checked={state.active}
                        disabled={def.alwaysOn}
                        onCheckedChange={(v) => toggleStep(def.type, v)}
                      />
                    </div>
                    {state.active && (
                      <div className="ml-9 mt-2">
                        <UserMultiSelect
                          users={workspaceUsers ?? []}
                          selected={state.user_ids}
                          onChange={(ids) => updateUsers(def.type, ids)}
                          placeholder={
                            def.type === "solicitar"
                              ? "Quién puede iniciar la solicitud..."
                              : "Asignar usuarios..."
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Flow preview */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <ChevronRight className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-sm text-foreground">
                Vista previa del flujo
              </h4>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <FlowChip label="Borrador" tone="muted" />
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <FlowChip label="Solicitado" tone="primary" />
              {activeSteps
                .filter((s) => s.type !== "solicitar")
                .map((s) => (
                  <span key={s.type} className="flex items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <FlowChip
                      label={
                        s.type === "revisar"
                          ? "En revisión"
                          : s.type === "aprobar"
                          ? "Aprobado"
                          : "Ejecutado"
                      }
                      tone="primary"
                    />
                  </span>
                ))}
              {steps.aprobar.active && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <FlowChip label="Rechazado" tone="destructive" />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex justify-end pb-2">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Guardando..." : "Guardar configuración"}
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}

function FlowChip({
  label,
  tone,
}: {
  label: string;
  tone: "muted" | "primary" | "destructive";
}) {
  const cls =
    tone === "primary"
      ? "bg-primary/10 text-primary border-primary/30"
      : tone === "destructive"
      ? "bg-destructive/10 text-destructive border-destructive/30"
      : "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-md border ${cls}`}
    >
      {label}
    </span>
  );
}

function UserMultiSelect({
  users,
  selected,
  onChange,
  placeholder,
}: {
  users: { id: string; full_name: string | null; email: string | null; avatar_url: string | null }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedUsers = users.filter((u) => selected.includes(u.id));

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm hover:bg-muted/50 transition-colors min-h-[36px]"
        >
          <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0">
            {selectedUsers.length === 0 ? (
              <span className="text-muted-foreground text-xs flex items-center gap-1.5">
                <UsersIcon className="h-3.5 w-3.5" />
                {placeholder ?? "Asignar usuarios..."}
              </span>
            ) : (
              selectedUsers.map((u) => (
                <span
                  key={u.id}
                  className="flex items-center gap-1 bg-primary/10 text-primary text-[11px] px-1.5 py-0.5 rounded"
                >
                  <Avatar className="h-3.5 w-3.5">
                    <AvatarImage src={u.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[8px]">
                      {(u.full_name ?? u.email ?? "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {u.full_name ?? u.email}
                </span>
              ))
            )}
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <ScrollArea className="max-h-[280px]">
          <div className="p-1">
            {users.length === 0 && (
              <p className="text-xs text-muted-foreground p-3 text-center">
                No hay usuarios en el workspace
              </p>
            )}
            {users.map((u) => {
              const isSel = selected.includes(u.id);
              return (
                <label
                  key={u.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={isSel}
                    onCheckedChange={() => toggle(u.id)}
                  />
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={u.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {(u.full_name ?? u.email ?? "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">
                      {u.full_name ?? "(sin nombre)"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {u.email}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
