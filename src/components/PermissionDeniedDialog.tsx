import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLabel: string;
  requiredRoleLabel?: string;
  requiredPermission?: string;
  allowedMembers?: any[];
}

export function PermissionDeniedDialog({ open, onOpenChange, actionLabel, requiredRoleLabel, requiredPermission }: Props) {
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
          {requiredPermission && (
            <p className="text-sm text-muted-foreground">
              Permiso requerido: <strong className="text-foreground font-mono text-xs">{requiredPermission}</strong>
            </p>
          )}
          {requiredRoleLabel && (
            <p className="text-sm text-muted-foreground">
              Rol requerido: <strong className="text-foreground">{requiredRoleLabel}</strong>
            </p>
          )}
          <p className="text-sm text-muted-foreground italic">
            Contacta a un administrador del workspace para obtener los permisos necesarios.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Entendido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
