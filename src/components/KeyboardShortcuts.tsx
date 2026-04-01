import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const shortcuts = [
  { action: "Búsqueda global", keys: "Ctrl + K" },
  { action: "Cerrar modal", keys: "Escape" },
  { action: "Ver atajos", keys: "?" },
  { action: "Ir a Dashboard", keys: "G → D" },
  { action: "Ir a Proyectos", keys: "G → P" },
  { action: "Ir a Mi Trabajo", keys: "G → T" },
  { action: "Ir a Incidentes", keys: "G → I" },
  { action: "Ir a Reportes", keys: "G → R" },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const [waitingG, setWaitingG] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let gTimeout: ReturnType<typeof setTimeout>;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (isInput) return;

      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setOpen(o => !o);
        return;
      }

      if (waitingG) {
        setWaitingG(false);
        clearTimeout(gTimeout);
        const map: Record<string, string> = { d: "/", p: "/proyectos", t: "/my-work", i: "/incidents", r: "/reports" };
        const path = map[e.key.toLowerCase()];
        if (path) { e.preventDefault(); navigate(path); }
        return;
      }

      if (e.key === "g" && !e.ctrlKey && !e.metaKey) {
        setWaitingG(true);
        gTimeout = setTimeout(() => setWaitingG(false), 1000);
      }
    };

    document.addEventListener("keydown", handler);
    return () => { document.removeEventListener("keydown", handler); clearTimeout(gTimeout); };
  }, [waitingG, navigate]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atajos de Teclado</DialogTitle>
          <DialogDescription>Navega más rápido con estos atajos</DialogDescription>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Acción</TableHead>
              <TableHead className="text-right">Atajo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shortcuts.map(s => (
              <TableRow key={s.action}>
                <TableCell className="text-sm">{s.action}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className="font-mono text-xs">{s.keys}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
