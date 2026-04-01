import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ShieldAlert } from "lucide-react";
import { ProjectMember } from "@/hooks/useProjects";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLabel: string;
  requiredRoleLabel: string;
  allowedMembers: ProjectMember[];
}

export function PermissionDeniedDialog({ open, onOpenChange, actionLabel, requiredRoleLabel, allowedMembers }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            Acción no permitida
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            No tienes permisos para <strong>{actionLabel}</strong>.
          </p>
          <p className="text-sm text-muted-foreground">
            Rol requerido: <strong className="text-foreground">{requiredRoleLabel}</strong>
          </p>

          {allowedMembers.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Personas del proyecto con este permiso:
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {allowedMembers.map((m) => {
                  const name = m.profiles?.full_name || m.profiles?.email || "—";
                  const initials = name.slice(0, 2).toUpperCase();
                  return (
                    <div key={m.id} className="flex items-center gap-3 rounded-md border border-border p-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{name}</p>
                        <p className="text-xs text-muted-foreground">{m.profiles?.email}</p>
                      </div>
                      <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground capitalize">
                        {m.profiles?.role?.replace("_", " ")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No hay miembros en el proyecto con los permisos requeridos. Contacta a un administrador del workspace.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Entendido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
