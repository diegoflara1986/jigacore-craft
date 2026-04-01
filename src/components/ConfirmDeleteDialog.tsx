import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmText?: string;
  requireTyping?: string;
}

export function ConfirmDeleteDialog({ open, onOpenChange, onConfirm, title, description, confirmText, requireTyping }: ConfirmDeleteDialogProps) {
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const canConfirm = !requireTyping || typed === requireTyping;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setTyped("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { onOpenChange(v); setTyped(""); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {requireTyping && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Escribe <span className="font-semibold text-foreground">"{requireTyping}"</span> para confirmar:
            </p>
            <Input value={typed} onChange={e => setTyped(e.target.value)} placeholder={requireTyping} autoFocus />
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!canConfirm || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {confirmText || "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
