import { useState } from "react";
import { ProjectMember, useAddProjectMember, useRemoveProjectMember, useProject } from "@/hooks/useProjects";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/lib/auth";
import { PermissionDeniedDialog } from "@/components/PermissionDeniedDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Trash2, Crown } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

import { useCustomRoles } from "@/hooks/useCustomRoles";
const ARCHIVED_TOOLTIP = "Proyecto archivado. Restaura el proyecto para editar";

export function ProjectTeamTab({ projectId, members, isArchived = false }: { projectId: string; members: ProjectMember[]; isArchived?: boolean }) {
  const [addOpen, setAddOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("developer");
  const [userSearch, setUserSearch] = useState("");
  const addMember = useAddProjectMember();
  const removeMember = useRemoveProjectMember();
  const { guardAction, denied, closeDenied } = usePermissions(projectId);
  const { user } = useAuth();
  const { data: project } = useProject(projectId);
  const qc = useQueryClient();
  const { data: customRoles } = useCustomRoles();

  const { data: workspaceUsers } = useQuery({
    queryKey: ["workspace-users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles_safe_view").select("id, full_name, email, avatar_url, is_active");
      return data ?? [];
    },
  });

  const availableUsers = (workspaceUsers ?? []).filter(
    (u) => u.is_active !== false &&
      !members.some((m) => m.user_id === u.id) && (
      u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
    )
  );

  const handleAdd = async () => {
    if (!selectedUser) return;
    await addMember.mutateAsync({ project_id: projectId, user_id: selectedUser, project_role: selectedRole });

    // Send notification to the added user
    const addedUser = workspaceUsers?.find(u => u.id === selectedUser);
    if (addedUser && project) {
      await supabase.from("notifications").insert({
        user_id: selectedUser,
        type: "project_added",
        title: "🎉 Te agregaron a un proyecto",
        message: `Has sido agregado al proyecto '${project.name}' con el rol: ${selectedRole.replace("_", " ")}`,
        reference_id: projectId,
        reference_type: "project",
      });
    }

    setAddOpen(false);
    setSelectedUser("");
    setUserSearch("");
  };

  const handleRemove = async (member: ProjectMember) => {
    // Don't allow removing yourself if you're the only member
    if (member.user_id === user?.id && members.length <= 1) {
      toast({ title: "No puedes eliminarte si eres el único miembro", variant: "destructive" });
      return;
    }

    await removeMember.mutateAsync({ id: member.id, project_id: projectId });

    // Send notification to removed user
    if (project && member.user_id !== user?.id) {
      await supabase.from("notifications").insert({
        user_id: member.user_id,
        type: "project_removed",
        title: "Has sido removido de un proyecto",
        message: `Has sido removido del proyecto '${project.name}'`,
        reference_id: projectId,
        reference_type: "project",
      });
    }
  };

  const isCreator = (memberId: string) => project?.created_by === memberId;
  const isOnlyMember = members.length <= 1;

  const initials = (name: string | null) => name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  return (
    <div className="mt-4">
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Equipo del Proyecto</CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button size="sm" disabled={isArchived} onClick={() => guardAction("equipo", "add", "agregar un miembro al proyecto", () => setAddOpen(true))} className={isArchived ? "opacity-50" : "bg-accent text-accent-foreground hover:bg-accent/90"}>
                  <Plus className="h-4 w-4 mr-1" />Agregar Miembro
                </Button>
              </span>
            </TooltipTrigger>
            {isArchived && <TooltipContent>{ARCHIVED_TOOLTIP}</TooltipContent>}
          </Tooltip>
        </CardHeader>
        <CardContent>
          {!members.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">No hay miembros asignados</p>
          ) : (
            <div className="divide-y divide-border">
              {members.map((m) => {
                const isSelfAndOnly = m.user_id === user?.id && isOnlyMember;
                const canRemove = !isSelfAndOnly;
                return (
                  <div key={m.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs bg-muted">{initials(m.profiles?.full_name ?? null)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{m.profiles?.full_name || m.profiles?.email}</p>
                          {isCreator(m.user_id) && (
                            <Badge variant="outline" className="text-[9px] gap-1 border-primary/30 text-primary">
                              <Crown className="h-2.5 w-2.5" />Creador
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{m.profiles?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground capitalize">{m.project_role.replace("_", " ")}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" disabled={isArchived || !canRemove}
                              onClick={() => guardAction("equipo", "remove", "remover un miembro del proyecto", () => handleRemove(m))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {isArchived && <TooltipContent>{ARCHIVED_TOOLTIP}</TooltipContent>}
                        {!isArchived && isSelfAndOnly && <TooltipContent>No puedes eliminarte si eres el único miembro</TooltipContent>}
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar Miembro al Proyecto</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Buscar usuario</Label>
              <Input placeholder="Nombre o email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
              {userSearch && (
                <div className="max-h-40 overflow-y-auto border border-border rounded-md">
                  {availableUsers.map((u) => (
                    <button key={u.id} onClick={() => { setSelectedUser(u.id!); setUserSearch(u.full_name || u.email || ""); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2 ${selectedUser === u.id ? "bg-muted" : ""}`}>
                      <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px] bg-muted">{initials(u.full_name ?? null)}</AvatarFallback></Avatar>
                      <div>
                        <p className="text-foreground">{u.full_name || u.email}</p>
                        <p className="text-[10px] text-muted-foreground">{u.email}</p>
                      </div>
                    </button>
                  ))}
                  {!availableUsers.length && <p className="text-sm text-muted-foreground p-3 text-center">Sin resultados</p>}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Rol en el proyecto</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(customRoles ?? []).filter(r => r.base_role !== "super_admin").map((r) => (
                    <SelectItem key={r.id} value={r.base_role || r.name}>{r.icon} {r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={!selectedUser || addMember.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PermissionDeniedDialog open={denied.open} onOpenChange={closeDenied} actionLabel={denied.actionLabel} requiredPermission={denied.requiredPermission} />
    </div>
  );
}
