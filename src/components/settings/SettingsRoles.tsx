import { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  useCustomRolesWithCount, useRolePermissions,
  useCreateCustomRole, useUpdateCustomRole, useDeleteCustomRole,
  useUpdateRolePermission,
  CustomRole, PERMISSION_MODULES,
} from "@/hooks/useCustomRoles";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Plus, MoreVertical, Copy, Trash2, Info, Pencil, AlertTriangle, Lock, ShieldCheck } from "lucide-react";

const isSuperAdminRole = (r: CustomRole) =>
  r.base_role === "super_admin" || r.name?.toLowerCase() === "super admin" || r.name?.toLowerCase() === "super_admin";

const ROLE_COLORS = ["#1E3A5F","#2563EB","#F97316","#8B5CF6","#10B981","#EF4444","#EC4899","#F59E0B","#06B6D4","#6B7280","#059669","#DC2626"];
const ROLE_ICONS = ["👨‍💻","🎨","🔍","📊","🏗️","📱","🚀","⚙️","🎯","📝","🔧","👥","🦊","🎪","🏆","💡","🔑","🎭","🌟","💼","🛠️","🔬","📡","🎮"];

export function SettingsRoles() {
  const { profile } = useAuth();
  const { data: roles, isLoading } = useCustomRolesWithCount();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomRole | null>(null);
  const [migrateToId, setMigrateToId] = useState("");

  const selectedRole = roles?.find(r => r.id === selectedRoleId) ?? null;
  const systemRoles = roles?.filter(r => isSuperAdminRole(r)) ?? [];
  const customRoles = roles?.filter(r => !isSuperAdminRole(r)) ?? [];

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  // Auto-select first role
  if (!selectedRoleId && roles?.length) {
    setSelectedRoleId(roles[0].id);
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Roles y Permisos</h2>
          <p className="text-sm text-muted-foreground">Gestiona los roles y sus permisos granulares por módulo.</p>
        </div>
      </div>

      <div className="flex gap-4 min-h-[calc(100vh-14rem)]">
        {/* Left column - Role list */}
        <div className="w-[280px] shrink-0 space-y-3">
          {isAdmin && (
            <Button onClick={() => setCreateOpen(true)} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" size="sm">
              <Plus className="h-4 w-4 mr-1" /> Nuevo Rol
            </Button>
          )}

          {systemRoles.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-1.5">Roles del Sistema</p>
              <div className="space-y-0.5">
                {systemRoles.map(r => (
                  <RoleListItem key={r.id} role={r} selected={selectedRoleId === r.id} onSelect={() => setSelectedRoleId(r.id)} badgeLabel="Super Admin" locked />
                ))}
              </div>
            </div>
          )}

          {customRoles.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-1.5">Roles Personalizados</p>
              <div className="space-y-0.5">
                {customRoles.map(r => (
                  <RoleListItem
                    key={r.id} role={r} selected={selectedRoleId === r.id}
                    onSelect={() => setSelectedRoleId(r.id)}
                    badgeLabel="Custom"
                    onDuplicate={isAdmin ? () => handleDuplicate(r) : undefined}
                    onDelete={isAdmin ? () => setDeleteTarget(r) : undefined}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column - Permission editor */}
        <div className="flex-1 min-w-0">
          {selectedRole ? (
            <RoleDetail role={selectedRole} isAdmin={isAdmin} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Selecciona un rol para ver sus permisos
            </div>
          )}
        </div>
      </div>

      {/* Create Role Modal */}
      <CreateRoleModal open={createOpen} onOpenChange={setCreateOpen} roles={roles ?? []} />

      {/* Delete Role Modal */}
      <DeleteRoleModal target={deleteTarget} onClose={() => setDeleteTarget(null)} roles={roles ?? []} migrateToId={migrateToId} setMigrateToId={setMigrateToId} />
    </div>
  );

  function handleDuplicate(role: CustomRole) {
    // Use create mutation with base_role_id
    const createRole = useCreateCustomRole();
    // We'll handle this through the modal instead
    setCreateOpen(true);
  }
}

function RoleListItem({ role, selected, onSelect, onDuplicate, onDelete, badgeLabel, locked }: {
  role: CustomRole; selected: boolean; onSelect: () => void;
  onDuplicate?: () => void; onDelete?: () => void;
  badgeLabel?: string; locked?: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-center justify-between px-2.5 py-2 rounded-md cursor-pointer transition-colors text-sm ${
        selected ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base shrink-0">{role.icon}</span>
        <div className="min-w-0">
          <p className="truncate text-sm flex items-center gap-1">
            {role.name}
            {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
          </p>
          <p className="text-[10px] text-muted-foreground">{role.user_count ?? 0} usuarios</p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Badge variant="outline" className="text-[9px] px-1.5" style={{ borderColor: role.color, color: role.color }}>
          {badgeLabel ?? (role.is_system_role ? "Sistema" : "Custom")}
        </Badge>
        {(onDuplicate || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="h-3 w-3" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onDuplicate && <DropdownMenuItem onClick={e => { e.stopPropagation(); onDuplicate(); }}><Copy className="h-3 w-3 mr-2" />Duplicar</DropdownMenuItem>}
              {onDelete && <DropdownMenuItem onClick={e => { e.stopPropagation(); onDelete(); }} className="text-destructive"><Trash2 className="h-3 w-3 mr-2" />Eliminar</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

function RoleDetail({ role, isAdmin }: { role: CustomRole; isAdmin: boolean }) {
  const { data: permissions } = useRolePermissions(role.id);
  const updatePerm = useUpdateRolePermission();
  const updateRole = useUpdateCustomRole();

  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(role.name);
  const [descVal, setDescVal] = useState(role.description ?? "");

  const isEditable = isAdmin && !role.is_system_role;

  const permSet = new Set<string>();
  permissions?.forEach(p => {
    if (p.is_allowed) permSet.add(`${p.module}:${p.action}`);
  });

  const togglePermission = (module: string, action: string, checked: boolean) => {
    if (!isEditable) return;
    updatePerm.mutate({ roleId: role.id, module, action, isAllowed: checked }, {
      onSuccess: () => toast({ title: "Permiso actualizado", duration: 1500 }),
    });
  };

  const toggleModuleMaster = (module: string, actions: string[], checked: boolean) => {
    if (!isEditable) return;
    actions.forEach(action => {
      updatePerm.mutate({ roleId: role.id, module, action, isAllowed: checked });
    });
    toast({ title: checked ? "Módulo activado" : "Módulo desactivado", duration: 1500 });
  };

  const isModuleFullyEnabled = (module: string, actions: string[]) => {
    return actions.every(a => permSet.has(`${module}:${a}`));
  };

  const isModulePartiallyEnabled = (module: string, actions: string[]) => {
    return actions.some(a => permSet.has(`${module}:${a}`)) && !isModuleFullyEnabled(module, actions);
  };

  const saveName = () => {
    if (nameVal.trim() && nameVal !== role.name) {
      updateRole.mutate({ id: role.id, name: nameVal.trim() });
    }
    setEditingName(false);
  };

  const saveDesc = () => {
    if (descVal !== (role.description ?? "")) {
      updateRole.mutate({ id: role.id, description: descVal });
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-14rem)]">
      <div className="space-y-5 pr-4">
        {/* Header */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{role.icon}</span>
              <div className="flex-1 min-w-0">
                {editingName && isEditable ? (
                  <Input value={nameVal} onChange={e => setNameVal(e.target.value)} onBlur={saveName} onKeyDown={e => e.key === "Enter" && saveName()} autoFocus className="text-lg font-bold h-8 mb-1" />
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-foreground">{role.name}</h3>
                    {isEditable && <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setNameVal(role.name); setEditingName(true); }}><Pencil className="h-3 w-3" /></Button>}
                  </div>
                )}
                {isEditable ? (
                  <Textarea value={descVal} onChange={e => setDescVal(e.target.value)} onBlur={saveDesc} placeholder="Descripción del rol..." className="text-sm text-muted-foreground mt-1 min-h-[40px] resize-none" rows={1} />
                ) : (
                  <p className="text-sm text-muted-foreground mt-0.5">{role.description || "Sin descripción"}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" style={{ borderColor: role.color, color: role.color }}>
                    {role.is_system_role ? "Rol del Sistema" : "Rol Personalizado"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{role.user_count ?? 0} usuarios con este rol</span>
                </div>
              </div>
            </div>
            {role.is_system_role && (
              <div className="mt-3 flex items-center gap-2 rounded-md bg-blue-500/10 p-2.5 text-xs text-blue-700 dark:text-blue-300">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Los roles del sistema no se pueden modificar. Crea un rol personalizado para ajustar permisos.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permission modules */}
        {PERMISSION_MODULES.map(mod => {
          const allActions = mod.actions.map(a => a.action);
          const fullyEnabled = isModuleFullyEnabled(mod.module, allActions);
          const partiallyEnabled = isModulePartiallyEnabled(mod.module, allActions);
          const scope = (mod as any).scope as { field: string; options: string[]; required: boolean } | undefined;
          const scopeLabels: Record<string, string> = {
            solo_asignados: "Solo proyectos asignados",
            todos: "Todos los proyectos",
            solo_propios: "Solo los propios",
            solo_propias: "Solo las propias",
            todas: "Todas",
          };
          const selectedScope = scope
            ? scope.options.find(opt => permSet.has(`${mod.module}:scope_${opt}`)) ?? null
            : null;
          const scopeMissing = !!scope && !selectedScope;

          const handleScopeChange = (opt: string) => {
            if (!isEditable || !scope) return;
            // Disable other scope options first, then enable selected
            scope.options.forEach(o => {
              if (o !== opt && permSet.has(`${mod.module}:scope_${o}`)) {
                updatePerm.mutate({ roleId: role.id, module: mod.module, action: `scope_${o}`, isAllowed: false });
              }
            });
            updatePerm.mutate(
              { roleId: role.id, module: mod.module, action: `scope_${opt}`, isAllowed: true },
              { onSuccess: () => toast({ title: "Alcance actualizado", duration: 1500 }) }
            );
          };

          return (
            <Card key={mod.module}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{mod.icon}</span>
                    <h4 className="font-semibold text-sm text-foreground">{mod.label}</h4>
                  </div>
                  <Switch
                    checked={fullyEnabled}
                    disabled={!isEditable}
                    onCheckedChange={checked => toggleModuleMaster(mod.module, allActions, checked)}
                    className={partiallyEnabled ? "data-[state=unchecked]:bg-accent/50" : ""}
                  />
                </div>

                {scope && (
                  <div className={`ml-7 mb-3 rounded-md border p-2.5 ${scopeMissing ? "border-destructive/40 bg-destructive/5" : "border-amber-400/40 bg-amber-50 dark:bg-amber-500/10"}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                        Alcance (obligatorio)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {scope.options.map(opt => {
                        const active = selectedScope === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            disabled={!isEditable}
                            onClick={() => handleScopeChange(opt)}
                            className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                              active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-foreground border-border hover:bg-muted"
                            } ${!isEditable ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            {scopeLabels[opt] ?? opt}
                          </button>
                        );
                      })}
                    </div>
                    {scopeMissing && (
                      <p className="mt-2 text-xs text-destructive">
                        Debes seleccionar un alcance para activar este módulo
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-1.5 ml-7">
                  {mod.actions.map(action => {
                    const key = `${mod.module}:${action.action}`;
                    const checked = permSet.has(key);
                    return (
                      <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                        <Checkbox
                          checked={checked}
                          disabled={!isEditable}
                          onCheckedChange={v => togglePermission(mod.module, action.action, v === true)}
                        />
                        <span className={`text-sm ${checked ? "text-foreground" : "text-muted-foreground"} group-hover:text-foreground transition-colors`}>
                          {action.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function CreateRoleModal({ open, onOpenChange, roles }: { open: boolean; onOpenChange: (v: boolean) => void; roles: CustomRole[] }) {
  const { profile } = useAuth();
  const createRole = useCreateCustomRole();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(ROLE_COLORS[0]);
  const [icon, setIcon] = useState("👨‍💻");
  const [baseRoleId, setBaseRoleId] = useState("none");

  const reset = () => { setStep(1); setName(""); setDescription(""); setColor(ROLE_COLORS[0]); setIcon("👨‍💻"); setBaseRoleId("none"); };

  const handleCreate = async () => {
    if (!name.trim() || !profile?.workspace_id) return;
    try {
      await createRole.mutateAsync({
        name: name.trim(),
        description: description || undefined,
        color,
        icon,
        workspace_id: profile.workspace_id,
        created_by: profile.id,
        base_role_id: baseRoleId !== "none" ? baseRoleId : undefined,
      });
      toast({ title: `Rol "${name}" creado` });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{step === 1 ? "Nuevo Rol - Información" : "Nuevo Rol - Permisos Base"}</DialogTitle></DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del rol *</Label>
              <Input value={name} onChange={e => setName(e.target.value.slice(0, 30))} placeholder="Ej: Scrum Master" maxLength={30} />
              <p className="text-xs text-muted-foreground">{name.length}/30 caracteres</p>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe las responsabilidades..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {ROLE_COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} className={`h-7 w-7 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ícono</Label>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_ICONS.map(i => (
                  <button key={i} onClick={() => setIcon(i)} className={`text-xl h-8 w-8 rounded-md flex items-center justify-center transition-all ${icon === i ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted"}`}>{i}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">¿Basar este rol en uno existente? Los permisos se copiarán como punto de partida.</p>
            <Select value={baseRoleId} onValueChange={setBaseRoleId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar rol base" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin permisos (empezar desde cero)</SelectItem>
                {roles.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    <span className="flex items-center gap-2">{r.icon} {r.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="font-medium text-sm" style={{ color }}>{name}</p>
                <p className="text-xs text-muted-foreground">{description || "Sin descripción"}</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 2 && <Button variant="outline" onClick={() => setStep(1)}>Atrás</Button>}
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
          {step === 1 ? (
            <Button onClick={() => setStep(2)} disabled={!name.trim()}>Siguiente</Button>
          ) : (
            <Button onClick={handleCreate} disabled={createRole.isPending}>
              {createRole.isPending ? "Creando..." : "Crear Rol"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteRoleModal({ target, onClose, roles, migrateToId, setMigrateToId }: {
  target: CustomRole | null; onClose: () => void;
  roles: CustomRole[]; migrateToId: string; setMigrateToId: (v: string) => void;
}) {
  const deleteRole = useDeleteCustomRole();
  const hasUsers = (target?.user_count ?? 0) > 0;
  const otherRoles = roles.filter(r => r.id !== target?.id);

  const handleDelete = async () => {
    if (!target) return;
    if (hasUsers && !migrateToId) {
      toast({ title: "Selecciona un rol destino para migrar usuarios", variant: "destructive" });
      return;
    }
    try {
      await deleteRole.mutateAsync({ id: target.id, migrateToRoleId: hasUsers ? migrateToId : undefined });
      toast({ title: `Rol "${target.name}" eliminado` });
      onClose();
      setMigrateToId("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={v => { if (!v) { onClose(); setMigrateToId(""); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Eliminar Rol</DialogTitle></DialogHeader>
        {hasUsers ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              El rol <strong>{target?.name}</strong> tiene <strong>{target?.user_count}</strong> usuarios.
              ¿A qué rol quieres migrarlos?
            </p>
            <Select value={migrateToId} onValueChange={setMigrateToId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar rol destino" /></SelectTrigger>
              <SelectContent>
                {otherRoles.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.icon} {r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            ¿Eliminar el rol <strong>{target?.name}</strong>? Esta acción no se puede deshacer.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); setMigrateToId(""); }}>Cancelar</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteRole.isPending}>
            {deleteRole.isPending ? "Eliminando..." : hasUsers ? "Migrar y Eliminar" : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
