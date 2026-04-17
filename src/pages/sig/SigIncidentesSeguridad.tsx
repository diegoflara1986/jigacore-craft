import { useMemo, useState } from "react";
import { ShieldAlert, Plus, ArrowLeft, Send, Check, X, Undo2, MessageSquare, MoreHorizontal, Eye, Copy, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useSigForm001List,
  useSigForm001Detail,
  useCreateSigForm001,
  useUpdateSigForm001,
  useSigRequestHistory,
  useSigRequestNotes,
  useTransitionSigRequest,
  useAddSigRequestNote,
  useDuplicateSigForm001,
  useDeleteSigForm001,
  type SigForm001Row,
  type Form001Status,
} from "@/hooks/useSigForm001";
import { useWorkspaceUsersForSig } from "@/hooks/useSigFlows";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ── Catálogos ──
const MEDIO_REPORTE = [
  { v: "correo", l: "Correo" },
  { v: "telefono", l: "Teléfono" },
  { v: "sistema", l: "Sistema" },
  { v: "presencial", l: "Presencial" },
  { v: "otro", l: "Otro" },
];

const FORMA_DETECCION = [
  { v: "monitoreo", l: "Monitoreo" },
  { v: "usuario_afectado", l: "Usuario afectado" },
  { v: "herramienta_automatica", l: "Herramienta automática" },
  { v: "auditoria", l: "Auditoría" },
  { v: "tercero", l: "Tercero" },
  { v: "otro", l: "Otro" },
];

const TIPO_INCIDENTE = [
  { v: "acceso_no_autorizado", l: "Acceso no autorizado" },
  { v: "fuga_informacion", l: "Fuga de información" },
  { v: "perdida_informacion", l: "Pérdida de información" },
  { v: "alteracion_informacion", l: "Alteración de información" },
  { v: "phishing", l: "Phishing" },
  { v: "malware", l: "Malware" },
  { v: "compromiso_credenciales", l: "Compromiso de credenciales" },
  { v: "error_configuracion", l: "Error de configuración" },
  { v: "indisponibilidad_servicio", l: "Indisponibilidad de servicio" },
  { v: "incidente_tercero", l: "Incidente de tercero" },
  { v: "incidente_produccion", l: "Incidente en producción" },
  { v: "otro", l: "Otro" },
];

const ORIGEN = [
  { v: "interno", l: "Interno" },
  { v: "externo", l: "Externo" },
  { v: "tercero", l: "Tercero" },
  { v: "error_humano", l: "Error humano" },
  { v: "falla_tecnica", l: "Falla técnica" },
  { v: "desconocido", l: "Desconocido" },
];

const PRIORIDAD = [
  { v: "baja", l: "Baja" },
  { v: "media", l: "Media" },
  { v: "alta", l: "Alta" },
  { v: "critica", l: "Crítica" },
];

const AMBIENTE = [
  { v: "produccion", l: "Producción" },
  { v: "desarrollo", l: "Desarrollo" },
  { v: "pruebas", l: "Pruebas" },
  { v: "otro", l: "Otro" },
];

const IMPACTO = [
  { v: "bajo", l: "Bajo" },
  { v: "medio", l: "Medio" },
  { v: "alto", l: "Alto" },
  { v: "critico", l: "Crítico" },
  { v: "no_aplica", l: "No aplica" },
];

// ── Helpers de badges ──
function priorityClasses(p?: string | null) {
  switch (p) {
    case "critica":
      return "bg-destructive text-destructive-foreground";
    case "alta":
      return "bg-orange-500 text-white";
    case "media":
      return "bg-yellow-500 text-black";
    case "baja":
    default:
      return "bg-muted text-muted-foreground";
  }
}

function statusClasses(s?: string | null) {
  switch (s) {
    case "borrador":
      return "bg-muted text-muted-foreground";
    case "solicitado":
      return "bg-blue-500 text-white";
    case "en_revision":
      return "bg-yellow-500 text-black";
    case "aprobado":
    case "ejecutado":
      return "bg-green-600 text-white";
    case "rechazado":
      return "bg-destructive text-destructive-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function statusLabel(s?: string | null) {
  switch (s) {
    case "borrador":
      return "Borrador";
    case "solicitado":
      return "Solicitado";
    case "en_revision":
      return "En revisión";
    case "aprobado":
      return "Aprobado";
    case "rechazado":
      return "Rechazado";
    case "ejecutado":
      return "Ejecutado";
    default:
      return s ?? "—";
  }
}

function tipoLabel(v?: string | null) {
  return TIPO_INCIDENTE.find((t) => t.v === v)?.l ?? v ?? "—";
}

function fmtDate(d?: string | null, withTime = false) {
  if (!d) return "—";
  try {
    return format(new Date(d), withTime ? "dd MMM yyyy HH:mm" : "dd MMM yyyy", { locale: es });
  } catch {
    return d;
  }
}

function toLocalInput(d?: string | null) {
  if (!d) return "";
  try {
    const date = new Date(d);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } catch {
    return "";
  }
}

function fromLocalInput(v: string): string | null {
  if (!v) return null;
  return new Date(v).toISOString();
}

// ────────────────────────────────────────────────
//  Página principal
// ────────────────────────────────────────────────
export default function SigIncidentesSeguridad() {
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const openDetail = (id: string) => {
    setSelectedId(id);
    setView("detail");
  };
  const backToList = () => {
    setSelectedId(null);
    setView("list");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6" />
            Incidentes de seguridad
          </h1>
          <p className="text-muted-foreground text-sm">FOR-SGSI-001</p>
        </div>
        {view === "list" ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo registro
          </Button>
        ) : (
          <Button variant="outline" onClick={backToList}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al listado
          </Button>
        )}
      </div>

      {view === "list" && <ListView onOpen={openDetail} />}
      {view === "detail" && selectedId && (
        <DetailView id={selectedId} onBack={backToList} />
      )}

      <CreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setCreateOpen(false);
          openDetail(id);
        }}
      />
    </div>
  );
}

// ────────────────────────────────────────────────
//  Lista
// ────────────────────────────────────────────────
function ListView({ onOpen }: { onOpen: (id: string) => void }) {
  const { data: rows, isLoading } = useSigForm001List();
  const { hasPermission } = usePermissions();
  const duplicate = useDuplicateSigForm001();
  const deleteOne = useDeleteSigForm001();

  const [confirmDelete, setConfirmDelete] = useState<SigForm001Row | null>(null);

  const canDuplicate = hasPermission("sig", "duplicar");
  const canDelete = hasPermission("sig", "eliminar");

  const handleDuplicate = async (row: SigForm001Row) => {
    try {
      const res = await duplicate.mutateAsync(row.id);
      toast.success("Registro duplicado");
      onOpen(res.id);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo duplicar");
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete?.request?.id) {
      toast.error("Sin solicitud asociada");
      setConfirmDelete(null);
      return;
    }
    try {
      await deleteOne.mutateAsync({
        id: confirmDelete.id,
        requestId: confirmDelete.request.id,
      });
      toast.success("Registro eliminado");
      setConfirmDelete(null);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo eliminar");
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Reportado por</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right w-[80px]">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && (rows ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  Sin registros aún. Crea uno con "Nuevo registro".
                </TableCell>
              </TableRow>
            )}
            {(rows ?? []).map((r) => (
              <TableRow key={r.id} className="cursor-pointer" onClick={() => onOpen(r.id)}>
                <TableCell className="font-mono text-xs">{r.codigo ?? "—"}</TableCell>
                <TableCell className="font-medium max-w-[280px] truncate">{r.titulo}</TableCell>
                <TableCell>
                  <Badge variant="outline">{tipoLabel(r.tipo_incidente)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={priorityClasses(r.prioridad)}>
                    {PRIORIDAD.find((p) => p.v === r.prioridad)?.l ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={statusClasses(r.request?.status)}>
                    {statusLabel(r.request?.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={r.reportado_por_profile?.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {(r.reportado_por_profile?.full_name ?? "?").charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {r.reportado_por_profile?.full_name ?? "—"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {fmtDate(r.fecha_registro)}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => onOpen(r.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver detalle
                      </DropdownMenuItem>
                      {canDuplicate && (
                        <DropdownMenuItem
                          onClick={() => handleDuplicate(r)}
                          disabled={duplicate.isPending}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setConfirmDelete(r)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar registro</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas eliminar{" "}
              <span className="font-medium">{confirmDelete?.codigo ?? confirmDelete?.titulo}</span>?
              Esta acción no se puede deshacer y también eliminará el flujo asociado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
              disabled={deleteOne.isPending}
            >
              {deleteOne.isPending ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ────────────────────────────────────────────────
//  Crear (rápido)
// ────────────────────────────────────────────────
function CreateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const create = useCreateSigForm001();

  const reset = () => {
    setTitulo("");
    setDescripcion("");
  };

  const handleSubmit = async () => {
    if (!titulo.trim() || !descripcion.trim()) {
      toast.error("Título y descripción son obligatorios");
      return;
    }
    try {
      const res = await create.mutateAsync({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
      });
      toast.success("Borrador creado");
      reset();
      onCreated(res.id);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo crear");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo incidente de seguridad</DialogTitle>
          <DialogDescription>
            Completa el título y una descripción inicial. Podrás llenar el resto del formulario en
            el siguiente paso.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Descripción inicial *</Label>
            <Textarea
              rows={4}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? "Creando…" : "Crear borrador"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────
//  Detalle
// ────────────────────────────────────────────────
function DetailView({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: row, isLoading } = useSigForm001Detail(id);

  if (isLoading || !row) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">Cargando…</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
      <FormSections row={row} />
      <FlowSidebar row={row} onBack={onBack} />
    </div>
  );
}

// ────────────────────────────────────────────────
//  Secciones del formulario
// ────────────────────────────────────────────────
function FormSections({ row }: { row: SigForm001Row }) {
  const { data: users } = useWorkspaceUsersForSig();
  const update = useUpdateSigForm001();
  const [local, setLocal] = useState<Partial<SigForm001Row>>({});

  const value = useMemo(() => ({ ...row, ...local }), [row, local]);
  const set = (k: keyof SigForm001Row, v: any) => setLocal((p) => ({ ...p, [k]: v }));

  const isReadOnly = row.request?.status && row.request.status !== "borrador";

  const handleSave = async () => {
    try {
      await update.mutateAsync({ id: row.id, values: local });
      toast.success("Cambios guardados");
      setLocal({});
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    }
  };

  const userOptions = users ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-xl">{value.titulo}</CardTitle>
          <p className="text-sm text-muted-foreground font-mono mt-1">{value.codigo}</p>
        </div>
        {!isReadOnly && (
          <Button onClick={handleSave} disabled={update.isPending || Object.keys(local).length === 0}>
            {update.isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={["s1", "s3"]} className="w-full">
          {/* Sección 1 */}
          <AccordionItem value="s1">
            <AccordionTrigger>1. Datos generales</AccordionTrigger>
            <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <Field label="Código">
                <Input value={value.codigo ?? ""} readOnly className="bg-muted/40 font-mono" />
              </Field>
              <Field label="Fecha de registro">
                <Input value={fmtDate(value.fecha_registro, true)} readOnly className="bg-muted/40" />
              </Field>
              <Field label="Reportado por">
                <Input
                  value={row.reportado_por_profile?.full_name ?? "—"}
                  readOnly
                  className="bg-muted/40"
                />
              </Field>
              <Field label="Área / Proceso">
                <Input
                  value={value.area_proceso ?? ""}
                  onChange={(e) => set("area_proceso", e.target.value)}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Medio de reporte">
                <SelectField
                  value={value.medio_reporte}
                  onChange={(v) => set("medio_reporte", v)}
                  options={MEDIO_REPORTE}
                  disabled={isReadOnly}
                />
              </Field>
            </AccordionContent>
          </AccordionItem>

          {/* Sección 2 */}
          <AccordionItem value="s2">
            <AccordionTrigger>2. Detección</AccordionTrigger>
            <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <Field label="Fecha y hora de detección">
                <Input
                  type="datetime-local"
                  value={toLocalInput(value.fecha_deteccion)}
                  onChange={(e) => set("fecha_deteccion", fromLocalInput(e.target.value))}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Detectado por">
                <UserSelectField
                  users={userOptions}
                  value={value.detectado_por}
                  onChange={(v) => set("detectado_por", v)}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Forma de detección">
                <SelectField
                  value={value.forma_deteccion}
                  onChange={(v) => set("forma_deteccion", v)}
                  options={FORMA_DETECCION}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Sistema donde se detectó">
                <Input
                  value={value.sistema_deteccion ?? ""}
                  onChange={(e) => set("sistema_deteccion", e.target.value)}
                  disabled={isReadOnly}
                />
              </Field>
            </AccordionContent>
          </AccordionItem>

          {/* Sección 3 */}
          <AccordionItem value="s3">
            <AccordionTrigger>3. Descripción del incidente</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <Field label="Título *">
                <Input
                  value={value.titulo ?? ""}
                  onChange={(e) => set("titulo", e.target.value)}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Descripción detallada *">
                <Textarea
                  rows={5}
                  value={value.descripcion ?? ""}
                  onChange={(e) => set("descripcion", e.target.value)}
                  disabled={isReadOnly}
                />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="¿Qué ocurrió?">
                  <Textarea
                    rows={3}
                    value={value.que_ocurrio ?? ""}
                    onChange={(e) => set("que_ocurrio", e.target.value)}
                    disabled={isReadOnly}
                  />
                </Field>
                <Field label="¿Cómo ocurrió?">
                  <Textarea
                    rows={3}
                    value={value.como_ocurrio ?? ""}
                    onChange={(e) => set("como_ocurrio", e.target.value)}
                    disabled={isReadOnly}
                  />
                </Field>
              </div>
              <Field label="¿Cuándo ocurrió?">
                <Input
                  type="datetime-local"
                  value={toLocalInput(value.cuando_ocurrio)}
                  onChange={(e) => set("cuando_ocurrio", fromLocalInput(e.target.value))}
                  disabled={isReadOnly}
                />
              </Field>
            </AccordionContent>
          </AccordionItem>

          {/* Sección 4 */}
          <AccordionItem value="s4">
            <AccordionTrigger>4. Clasificación</AccordionTrigger>
            <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <Field label="Tipo de incidente">
                <SelectField
                  value={value.tipo_incidente}
                  onChange={(v) => set("tipo_incidente", v)}
                  options={TIPO_INCIDENTE}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Origen estimado">
                <SelectField
                  value={value.origen_estimado}
                  onChange={(v) => set("origen_estimado", v)}
                  options={ORIGEN}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Prioridad">
                <SelectField
                  value={value.prioridad}
                  onChange={(v) => set("prioridad", v)}
                  options={PRIORIDAD}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Severidad">
                <SelectField
                  value={value.severidad}
                  onChange={(v) => set("severidad", v)}
                  options={PRIORIDAD}
                  disabled={isReadOnly}
                />
              </Field>
            </AccordionContent>
          </AccordionItem>

          {/* Sección 5 */}
          <AccordionItem value="s5">
            <AccordionTrigger>5. Activos afectados</AccordionTrigger>
            <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <Field label="Sistema / Aplicación afectada">
                <Input
                  value={value.sistema_afectado ?? ""}
                  onChange={(e) => set("sistema_afectado", e.target.value)}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Ambiente afectado">
                <SelectField
                  value={value.ambiente_afectado}
                  onChange={(v) => set("ambiente_afectado", v)}
                  options={AMBIENTE}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Información afectada" full>
                <Textarea
                  rows={3}
                  value={value.informacion_afectada ?? ""}
                  onChange={(e) => set("informacion_afectada", e.target.value)}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Cliente afectado">
                <Input
                  value={value.cliente_afectado ?? ""}
                  onChange={(e) => set("cliente_afectado", e.target.value)}
                  disabled={isReadOnly}
                />
              </Field>
            </AccordionContent>
          </AccordionItem>

          {/* Sección 6 */}
          <AccordionItem value="s6">
            <AccordionTrigger>6. Evaluación del impacto</AccordionTrigger>
            <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <Field label="Impacto en confidencialidad">
                <SelectField
                  value={value.impacto_confidencialidad}
                  onChange={(v) => set("impacto_confidencialidad", v)}
                  options={IMPACTO}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Impacto en integridad">
                <SelectField
                  value={value.impacto_integridad}
                  onChange={(v) => set("impacto_integridad", v)}
                  options={IMPACTO}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Impacto en disponibilidad">
                <SelectField
                  value={value.impacto_disponibilidad}
                  onChange={(v) => set("impacto_disponibilidad", v)}
                  options={IMPACTO}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Impacto operativo">
                <SelectField
                  value={value.impacto_operativo}
                  onChange={(v) => set("impacto_operativo", v)}
                  options={IMPACTO}
                  disabled={isReadOnly}
                />
              </Field>
            </AccordionContent>
          </AccordionItem>

          {/* Sección 7 */}
          <AccordionItem value="s7">
            <AccordionTrigger>7. Datos sensibles</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <ToggleRow
                label="¿Involucra datos personales?"
                checked={!!value.involucra_datos_personales}
                onChange={(v) => set("involucra_datos_personales", v)}
                disabled={isReadOnly}
              />
              <ToggleRow
                label="¿Involucra ambiente de producción?"
                checked={!!value.involucra_produccion}
                onChange={(v) => set("involucra_produccion", v)}
                disabled={isReadOnly}
              />
              <ToggleRow
                label="¿Requiere reporte externo?"
                checked={!!value.requiere_reporte_externo}
                onChange={(v) => set("requiere_reporte_externo", v)}
                disabled={isReadOnly}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Sección 8 */}
          <AccordionItem value="s8">
            <AccordionTrigger>8. Contención inmediata</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <Field label="Acción de contención tomada">
                <Textarea
                  rows={3}
                  value={value.accion_contencion ?? ""}
                  onChange={(e) => set("accion_contencion", e.target.value)}
                  disabled={isReadOnly}
                />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Responsable de contención">
                  <UserSelectField
                    users={userOptions}
                    value={value.responsable_contencion}
                    onChange={(v) => set("responsable_contencion", v)}
                    disabled={isReadOnly}
                  />
                </Field>
                <ToggleRow
                  label="¿Se logró contener?"
                  checked={!!value.contencion_exitosa}
                  onChange={(v) => set("contencion_exitosa", v)}
                  disabled={isReadOnly}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Sección 9 */}
          <AccordionItem value="s9">
            <AccordionTrigger>9. Escalamiento</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <ToggleRow
                label="¿Se escaló al responsable SGSI?"
                checked={!!value.escalo_sgsi}
                onChange={(v) => set("escalo_sgsi", v)}
                disabled={isReadOnly}
              />
              <ToggleRow
                label="¿Se escaló a gerencia?"
                checked={!!value.escalo_gerencia}
                onChange={(v) => set("escalo_gerencia", v)}
                disabled={isReadOnly}
              />
              <ToggleRow
                label="¿Se notificó al cliente?"
                checked={!!value.notifico_cliente}
                onChange={(v) => set("notifico_cliente", v)}
                disabled={isReadOnly}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

// ── Subcomponentes ──
function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`space-y-2 ${full ? "md:col-span-2" : ""}`}>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
  disabled,
}: {
  value?: string | null;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
  disabled?: boolean;
}) {
  return (
    <Select value={value ?? undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Seleccionar…" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.v} value={o.v}>
            {o.l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function UserSelectField({
  users,
  value,
  onChange,
  disabled,
}: {
  users: { id: string; full_name: string | null; email: string | null }[];
  value?: string | null;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value ?? undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Seleccionar usuario…" />
      </SelectTrigger>
      <SelectContent>
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.full_name ?? u.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border p-3">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

// ────────────────────────────────────────────────
//  Sidebar de flujo
// ────────────────────────────────────────────────
function FlowSidebar({ row, onBack }: { row: SigForm001Row; onBack: () => void }) {
  const { profile } = useAuth();
  const requestId = row.request_id;
  const { data: history } = useSigRequestHistory(requestId);
  const { data: notes } = useSigRequestNotes(requestId);
  const transition = useTransitionSigRequest();
  const addNote = useAddSigRequestNote();

  const [noteText, setNoteText] = useState("");
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    to: Form001Status | null;
    label: string;
    stepType?: string;
    requireComment: boolean;
  }>({ open: false, to: null, label: "", requireComment: false });
  const [comment, setComment] = useState("");

  const status = row.request?.status ?? "borrador";
  const isCreator = row.request?.created_by === profile?.id;
  const isAssignedToStep =
    row.request?.current_step?.step_users?.some(
      (su: any) => su.user_id === profile?.id
    ) ?? false;

  const openAction = (
    to: Form001Status,
    label: string,
    stepType: string | undefined,
    requireComment: boolean
  ) => {
    setActionDialog({ open: true, to, label, stepType, requireComment });
    setComment("");
  };

  const closeDialog = () =>
    setActionDialog({ open: false, to: null, label: "", requireComment: false });

  const confirmAction = async () => {
    if (!actionDialog.to) return;
    if (actionDialog.requireComment && !comment.trim()) {
      toast.error("Comentario obligatorio");
      return;
    }
    try {
      await transition.mutateAsync({
        requestId,
        fromStatus: status,
        toStatus: actionDialog.to,
        stepType: actionDialog.stepType,
        comment: comment.trim() || undefined,
      });
      toast.success("Estado actualizado");
      closeDialog();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo actualizar");
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    try {
      await addNote.mutateAsync({ requestId, content: noteText.trim() });
      setNoteText("");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo agregar la nota");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
            Estado actual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Badge className={`${statusClasses(status)} text-sm py-1.5 px-3`}>
            {statusLabel(status)}
          </Badge>

          <Separator />

          <div className="space-y-2">
            {status === "borrador" && isCreator && (
              <Button
                className="w-full"
                onClick={() =>
                  openAction("solicitado", "Validar y enviar", "solicitar", false)
                }
              >
                <Send className="h-4 w-4 mr-2" />
                Validar y enviar
              </Button>
            )}
            {status === "solicitado" && isAssignedToStep && (
              <>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() =>
                    openAction("en_revision", "Aprobar revisión", "revisar", false)
                  }
                >
                  <Check className="h-4 w-4 mr-2" />
                  Aprobar revisión
                </Button>
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() =>
                    openAction("borrador", "Devolver", "revisar", true)
                  }
                >
                  <Undo2 className="h-4 w-4 mr-2" />
                  Devolver
                </Button>
              </>
            )}
            {status === "en_revision" && isAssignedToStep && (
              <>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => openAction("aprobado", "Aprobar", "aprobar", false)}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Aprobar
                </Button>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => openAction("rechazado", "Rechazar", "aprobar", true)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Rechazar
                </Button>
              </>
            )}
            {!(
              (status === "borrador" && isCreator) ||
              ((status === "solicitado" || status === "en_revision") && isAssignedToStep)
            ) && (
              <p className="text-xs text-muted-foreground">
                No tienes acciones en este estado.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
            Historial
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[200px]">
            <div className="px-4 pb-4 space-y-3">
              {(history ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">Sin movimientos aún.</p>
              )}
              {(history ?? []).map((h: any) => (
                <div key={h.id} className="text-xs border-l-2 border-border pl-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={statusClasses(h.to_status)} variant="default">
                      {statusLabel(h.to_status)}
                    </Badge>
                    <span className="text-muted-foreground">{fmtDate(h.created_at, true)}</span>
                  </div>
                  <p className="text-muted-foreground">
                    {h.action_by_profile?.full_name ?? "Usuario"}
                  </p>
                  {h.comment && <p className="mt-1 italic">"{h.comment}"</p>}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Notas internas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ScrollArea className="h-[160px]">
            <div className="space-y-3 pr-2">
              {(notes ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">Sin notas aún.</p>
              )}
              {(notes ?? []).map((n: any) => (
                <div key={n.id} className="text-xs border border-border rounded-md p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{n.user?.full_name ?? "Usuario"}</span>
                    <span className="text-muted-foreground">{fmtDate(n.created_at, true)}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{n.content}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="space-y-2">
            <Textarea
              rows={2}
              placeholder="Agregar nota interna…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <Button
              size="sm"
              className="w-full"
              onClick={handleAddNote}
              disabled={!noteText.trim() || addNote.isPending}
            >
              Agregar nota
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={actionDialog.open}
        onOpenChange={(o) => !o && closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionDialog.label}</DialogTitle>
            <DialogDescription>
              {actionDialog.requireComment
                ? "Agrega un comentario obligatorio para registrar esta acción."
                : "Confirmar esta acción. Puedes agregar un comentario opcional."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            placeholder={actionDialog.requireComment ? "Comentario *" : "Comentario opcional…"}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button onClick={confirmAction} disabled={transition.isPending}>
              {transition.isPending ? "Procesando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
