import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { UserPlus, Search, MoreVertical, Eye, EyeOff, Pencil } from "lucide-react";
import { useCustomRoles } from "@/hooks/useCustomRoles";
import { EditUserDialog } from "./EditUserDialog";

export function SettingsUsers() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", password: "", full_name: "", role_id: "" });
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editUser, setEditUser] = useState<{ id: string; full_name: string | null; role: string; role_id: string | null; email: string } | null>(null);
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const { data: customRoles } = useCustomRoles();

  const { data: users } = useQuery({
    queryKey: ["workspace-users"],
    queryFn: async () => {
      const { data: wsId } = await supabase.rpc("get_user_workspace_id");
      const { data, error } = await supabase.from("profiles")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = users?.filter(u => {
    if (search && !(u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))) return false;
    if (roleFilter !== "all" && (u as any).role_id !== roleFilter) return false;
    if (statusFilter === "active" && u.is_active === false) return false;
    if (statusFilter === "inactive" && u.is_active !== false) return false;
    return true;
  });

  const changeRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase.rpc("update_user_role", {
        target_user_id: userId,
        new_role: newRole as any,
      });
      if (error) throw error;
      toast({ title: "Rol actualizado" });
      qc.invalidateQueries({ queryKey: ["workspace-users"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const toggleActive = async (userId: string, active: boolean) => {
    try {
      const { error } = await supabase.from("profiles").update({ is_active: active }).eq("id", userId);
      if (error) throw error;
      toast({ title: active ? "Usuario reactivado" : "Usuario desactivado" });
      qc.invalidateQueries({ queryKey: ["workspace-users"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.password || !createForm.role) {
      toast({ title: "Todos los campos son requeridos", variant: "destructive" });
      return;
    }
    if (createForm.password.length < 6) {
      toast({ title: "La contraseña debe tener al menos 6 caracteres", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("create-user", {
        body: {
          email: createForm.email,
          password: createForm.password,
          role: createForm.role,
          full_name: createForm.full_name || null,
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "Usuario creado correctamente", description: `${createForm.email} puede iniciar sesión ahora.` });
      qc.invalidateQueries({ queryKey: ["workspace-users"] });
      setShowCreate(false);
      setCreateForm({ email: "", password: "", full_name: "", role: "developer" });
      setShowPassword(false);
    } catch (e: any) {
      toast({ title: "Error al crear usuario", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const initials = (name: string | null) => name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Gestión de Usuarios</h2>
          <p className="text-sm text-muted-foreground">{users?.filter(u => u.is_active !== false).length ?? 0} usuarios activos</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <UserPlus className="h-4 w-4 mr-1" /> Crear Usuario
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nombre o email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Rol" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="active">Activos</TabsTrigger>
            <TabsTrigger value="inactive">Inactivos</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Ingreso</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered?.map(u => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials(u.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{u.full_name || "Sin nombre"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={v => changeRole(u.id, v)} disabled={u.id === profile?.id}>
                      <SelectTrigger className="h-7 w-36 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.filter(r => r !== "super_admin").map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.is_active !== false ? "default" : "destructive"} className="text-xs">
                      {u.is_active !== false ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("es")}
                  </TableCell>
                  <TableCell>
                    {u.id !== profile?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                           {isAdmin && (
                             <DropdownMenuItem onClick={() => setEditUser({ id: u.id, full_name: u.full_name, role: u.role, email: u.email })}>
                               <Pencil className="h-3.5 w-3.5 mr-2" /> Editar usuario
                             </DropdownMenuItem>
                           )}
                           {u.is_active !== false ? (
                            <DropdownMenuItem onClick={() => toggleActive(u.id, false)} className="text-destructive">Desactivar usuario</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => toggleActive(u.id, true)}>Reactivar usuario</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!filtered || filtered.length === 0) && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No se encontraron usuarios</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Crear Nuevo Usuario</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input value={createForm.full_name} onChange={e => setCreateForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Juan Pérez" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} placeholder="usuario@ejemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Contraseña *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={createForm.password}
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-0.5 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">El usuario podrá iniciar sesión inmediatamente con estas credenciales</p>
            </div>
            <div className="space-y-2">
              <Label>Rol *</Label>
              <Select value={createForm.role} onValueChange={v => setCreateForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.filter(r => r !== "super_admin").map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreateUser} disabled={creating}>
              {creating ? "Creando..." : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <EditUserDialog
        open={!!editUser}
        onOpenChange={(open) => { if (!open) setEditUser(null); }}
        user={editUser}
        onSaved={() => qc.invalidateQueries({ queryKey: ["workspace-users"] })}
      />
    </div>
  );
}
