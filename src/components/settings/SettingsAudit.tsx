import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

// Placeholder audit log - in production this would come from a dedicated audit table
const SAMPLE_ENTRIES = [
  { id: "1", date: "01 Abr 2026, 14:32:05", user: "Admin", action: "Crear", module: "Proyectos", detail: "Creó el proyecto 'App Móvil v2'", ip: "192.168.1.10" },
  { id: "2", date: "01 Abr 2026, 13:15:22", user: "Diego Lara", action: "Editar", module: "Usuarios", detail: "Cambió rol de Ana García a Team Lead", ip: "192.168.1.12" },
  { id: "3", date: "31 Mar 2026, 18:45:10", user: "Sistema", action: "Crear", module: "Incidentes", detail: "Incidente INC-2026-001 reportado externamente", ip: "—" },
];

const actionColor = (action: string) => {
  switch (action) {
    case "Crear": return "bg-green-500/10 text-green-700 dark:text-green-400";
    case "Editar": return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case "Eliminar": return "bg-destructive/10 text-destructive";
    default: return "bg-muted text-muted-foreground";
  }
};

export function SettingsAudit() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Auditoría</h2>
      <p className="text-sm text-muted-foreground">Registro de todas las acciones realizadas en el workspace.</p>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar acciones..." />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha/Hora</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SAMPLE_ENTRIES.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{e.date}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">{e.user[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{e.user}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge className={`text-[10px] ${actionColor(e.action)}`}>{e.action}</Badge></TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{e.module}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-48 truncate">{e.detail}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{e.ip}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground text-center">El log completo de auditoría estará disponible próximamente con datos en tiempo real.</p>
    </div>
  );
}
