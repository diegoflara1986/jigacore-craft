import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { UserPlus, Search, MoreVertical } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";

const ROLES = Constants.public.Enums.app_role;

export function SettingsUsers() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("developer");

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
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
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

  const initials = (name: string | null) => name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Gestión de Usuarios</h2>
          <p className="text-sm text-muted-foreground">{users?.filter(u => u.is_active !== false).length ?? 0} usuarios activos</p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <UserPlus className="h-4 w-4 mr-1" /> Invitar Usuario
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

      {/* Invite Modal */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invitar al Workspace</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email(s)</label>
              <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@ejemplo.com" />
              <p className="text-xs text-muted-foreground mt-1">Separa múltiples emails con comas</p>
            </div>
            <div>
              <label className="text-sm font-medium">Rol</label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.filter(r => r !== "super_admin").map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancelar</Button>
            <Button onClick={() => { toast({ title: "Invitación enviada (pendiente de configurar email)" }); setShowInvite(false); }}>
              Enviar Invitación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
