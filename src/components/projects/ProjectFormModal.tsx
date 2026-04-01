import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Project, useCreateProject, useUpdateProject } from "@/hooks/useProjects";

const PROJECT_COLORS = [
  "#1E3A5F", "#E85D2C", "#2E7D32", "#7B1FA2", "#C62828",
  "#00838F", "#EF6C00", "#1565C0", "#AD1457", "#4E342E",
  "#37474F", "#558B2F",
];

const statusOptions = [
  { value: "active", label: "Activo" },
  { value: "planning", label: "Planificación" },
  { value: "paused", label: "En Pausa" },
  { value: "completed", label: "Completado" },
  { value: "cancelled", label: "Cancelado" },
];

const currencyOptions = ["COP", "USD", "EUR"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project?: Project | null;
}

export function ProjectFormModal({ open, onOpenChange, project }: Props) {
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const isEdit = !!project;

  const [form, setForm] = useState({
    name: "", client_name: "", description: "", status: "active",
    start_date: undefined as Date | undefined, end_date: undefined as Date | undefined,
    budget: "", currency: "USD", color: PROJECT_COLORS[0],
    git_url: "", techInput: "", technologies: [] as string[],
  });

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name, client_name: project.client_name || "",
        description: project.description || "", status: project.status,
        start_date: project.start_date ? new Date(project.start_date) : undefined,
        end_date: project.end_date ? new Date(project.end_date) : undefined,
        budget: project.budget?.toString() || "", currency: (project as any).currency || "USD",
        color: (project as any).color || PROJECT_COLORS[0],
        git_url: (project as any).git_url || "", techInput: "",
        technologies: (project as any).technologies || [],
      });
    } else {
      setForm({
        name: "", client_name: "", description: "", status: "active",
        start_date: undefined, end_date: undefined, budget: "", currency: "USD",
        color: PROJECT_COLORS[0], git_url: "", techInput: "", technologies: [],
      });
    }
  }, [project, open]);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    const payload: any = {
      name: form.name.trim(),
      client_name: form.client_name || null,
      description: form.description || null,
      status: form.status,
      start_date: form.start_date ? format(form.start_date, "yyyy-MM-dd") : null,
      end_date: form.end_date ? format(form.end_date, "yyyy-MM-dd") : null,
      budget: form.budget ? parseFloat(form.budget) : null,
      currency: form.currency,
      color: form.color,
      git_url: form.git_url || null,
      technologies: form.technologies.length > 0 ? form.technologies : null,
    };
    if (isEdit) {
      await updateProject.mutateAsync({ id: project!.id, ...payload });
    } else {
      await createProject.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const addTech = () => {
    const t = form.techInput.trim();
    if (t && !form.technologies.includes(t)) {
      setForm((f) => ({ ...f, technologies: [...f.technologies, t], techInput: "" }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Proyecto" : "Nuevo Proyecto"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre del proyecto *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Mi Proyecto" />
            </div>
            <div className="space-y-2">
              <Label>Cliente / Organización</Label>
              <Input value={form.client_name} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} placeholder="Acme Corp" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descripción del proyecto..." rows={3} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha de inicio</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.start_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.start_date ? format(form.start_date, "dd/MM/yyyy") : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={form.start_date} onSelect={(d) => setForm((f) => ({ ...f, start_date: d }))} locale={es} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Fecha estimada de entrega</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.end_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.end_date ? format(form.end_date, "dd/MM/yyyy") : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={form.end_date} onSelect={(d) => setForm((f) => ({ ...f, end_date: d }))} locale={es} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Presupuesto</Label>
              <div className="flex gap-2">
                <Input type="number" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} placeholder="0" className="flex-1" />
                <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>URL Repositorio Git</Label>
              <Input value={form.git_url} onChange={(e) => setForm((f) => ({ ...f, git_url: e.target.value }))} placeholder="https://github.com/..." />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tecnologías</Label>
            <div className="flex gap-2">
              <Input value={form.techInput} onChange={(e) => setForm((f) => ({ ...f, techInput: e.target.value }))}
                placeholder="React, Node.js..." className="flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTech(); } }}
              />
              <Button type="button" variant="outline" onClick={addTech}>Agregar</Button>
            </div>
            {form.technologies.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.technologies.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full text-xs text-foreground">
                    {t}
                    <button onClick={() => setForm((f) => ({ ...f, technologies: f.technologies.filter((x) => x !== t) }))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Color del proyecto</Label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map((c) => (
                <button key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={cn("h-8 w-8 rounded-full border-2 transition-transform", form.color === c ? "border-foreground scale-110" : "border-transparent")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!form.name.trim() || createProject.isPending || updateProject.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {isEdit ? "Guardar cambios" : "Crear Proyecto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
