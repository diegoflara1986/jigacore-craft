import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const ROLES_COLS = ["admin", "project_manager", "team_lead", "developer", "qa", "designer", "architect", "analyst", "stakeholder"];

const MODULES = [
  { name: "Proyectos", perms: ["Ver", "Crear", "Editar", "Eliminar"] },
  { name: "Backlog/HU", perms: ["Ver", "Crear", "Editar", "Eliminar"] },
  { name: "Sprints", perms: ["Ver", "Gestionar", "Eliminar"] },
  { name: "Tablero Kanban", perms: ["Ver", "Mover Tarjetas"] },
  { name: "Planning Poker", perms: ["Participar", "Moderar"] },
  { name: "Tiempo", perms: ["Ver propio", "Ver equipo", "Aprobar"] },
  { name: "Costos", perms: ["Ver", "Configurar"] },
  { name: "Incidentes", perms: ["Ver", "Gestionar", "Eliminar"] },
  { name: "Reportes", perms: ["Ver básico", "Ver financiero"] },
  { name: "Configuración", perms: ["Workspace", "Usuarios", "Permisos"] },
];

// Permission matrix: which roles have which permissions
const PERM_MATRIX: Record<string, Record<string, boolean>> = {
  admin: Object.fromEntries(MODULES.flatMap(m => m.perms.map(p => [`${m.name}:${p}`, true]))),
  project_manager: {
    "Proyectos:Ver": true, "Proyectos:Crear": true, "Proyectos:Editar": true,
    "Backlog/HU:Ver": true, "Backlog/HU:Crear": true, "Backlog/HU:Editar": true,
    "Sprints:Ver": true, "Sprints:Gestionar": true,
    "Tablero Kanban:Ver": true, "Tablero Kanban:Mover Tarjetas": true,
    "Planning Poker:Participar": true, "Planning Poker:Moderar": true,
    "Tiempo:Ver propio": true, "Tiempo:Ver equipo": true, "Tiempo:Aprobar": true,
    "Costos:Ver": true, "Costos:Configurar": true,
    "Incidentes:Ver": true, "Incidentes:Gestionar": true,
    "Reportes:Ver básico": true, "Reportes:Ver financiero": true,
    "Configuración:Workspace": true,
  },
  team_lead: {
    "Proyectos:Ver": true, "Proyectos:Editar": true,
    "Backlog/HU:Ver": true, "Backlog/HU:Crear": true, "Backlog/HU:Editar": true,
    "Sprints:Ver": true, "Sprints:Gestionar": true,
    "Tablero Kanban:Ver": true, "Tablero Kanban:Mover Tarjetas": true,
    "Planning Poker:Participar": true, "Planning Poker:Moderar": true,
    "Tiempo:Ver propio": true, "Tiempo:Ver equipo": true,
    "Costos:Ver": true,
    "Incidentes:Ver": true, "Incidentes:Gestionar": true,
    "Reportes:Ver básico": true,
  },
  developer: {
    "Proyectos:Ver": true,
    "Backlog/HU:Ver": true, "Backlog/HU:Crear": true, "Backlog/HU:Editar": true,
    "Sprints:Ver": true,
    "Tablero Kanban:Ver": true, "Tablero Kanban:Mover Tarjetas": true,
    "Planning Poker:Participar": true,
    "Tiempo:Ver propio": true,
    "Incidentes:Ver": true, "Incidentes:Gestionar": true,
    "Reportes:Ver básico": true,
  },
  qa: {
    "Proyectos:Ver": true,
    "Backlog/HU:Ver": true, "Backlog/HU:Crear": true, "Backlog/HU:Editar": true,
    "Sprints:Ver": true,
    "Tablero Kanban:Ver": true, "Tablero Kanban:Mover Tarjetas": true,
    "Planning Poker:Participar": true,
    "Tiempo:Ver propio": true,
    "Incidentes:Ver": true, "Incidentes:Gestionar": true,
    "Reportes:Ver básico": true,
  },
  designer: {
    "Proyectos:Ver": true,
    "Backlog/HU:Ver": true, "Backlog/HU:Crear": true,
    "Sprints:Ver": true,
    "Tablero Kanban:Ver": true, "Tablero Kanban:Mover Tarjetas": true,
    "Planning Poker:Participar": true,
    "Tiempo:Ver propio": true,
    "Incidentes:Ver": true,
    "Reportes:Ver básico": true,
  },
  architect: {
    "Proyectos:Ver": true,
    "Backlog/HU:Ver": true, "Backlog/HU:Crear": true, "Backlog/HU:Editar": true,
    "Sprints:Ver": true,
    "Tablero Kanban:Ver": true, "Tablero Kanban:Mover Tarjetas": true,
    "Planning Poker:Participar": true, "Planning Poker:Moderar": true,
    "Tiempo:Ver propio": true,
    "Costos:Ver": true,
    "Incidentes:Ver": true,
    "Reportes:Ver básico": true,
  },
  analyst: {
    "Proyectos:Ver": true,
    "Backlog/HU:Ver": true, "Backlog/HU:Crear": true, "Backlog/HU:Editar": true,
    "Sprints:Ver": true,
    "Tablero Kanban:Ver": true,
    "Planning Poker:Participar": true,
    "Tiempo:Ver propio": true,
    "Incidentes:Ver": true,
    "Reportes:Ver básico": true, "Reportes:Ver financiero": true,
  },
  stakeholder: {
    "Proyectos:Ver": true,
    "Backlog/HU:Ver": true,
    "Sprints:Ver": true,
    "Tablero Kanban:Ver": true,
    "Reportes:Ver básico": true,
  },
};

export function SettingsRoles() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Roles y Permisos</h2>
      <p className="text-sm text-muted-foreground">Matriz de permisos por rol. Los roles de administrador tienen todos los permisos.</p>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10 w-40">Módulo / Permiso</TableHead>
                {ROLES_COLS.map(role => (
                  <TableHead key={role} className="text-center text-xs min-w-[80px]">
                    <Badge variant="outline" className="text-[10px]">{role.replace("_", " ")}</Badge>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MODULES.map(mod => (
                mod.perms.map((perm, pi) => (
                  <TableRow key={`${mod.name}:${perm}`}>
                    <TableCell className="sticky left-0 bg-card z-10">
                      {pi === 0 && <span className="font-semibold text-sm">{mod.name}</span>}
                      {pi === 0 && <br />}
                      <span className="text-xs text-muted-foreground ml-2">{perm}</span>
                    </TableCell>
                    {ROLES_COLS.map(role => {
                      const key = `${mod.name}:${perm}`;
                      const isAdmin = role === "admin";
                      const checked = isAdmin || !!PERM_MATRIX[role]?.[key];
                      return (
                        <TableCell key={role} className="text-center">
                          <Tooltip>
                            <TooltipTrigger>
                              <Checkbox checked={checked} disabled={isAdmin} className="mx-auto" />
                            </TooltipTrigger>
                            <TooltipContent>
                              {checked ? `${role} puede: ${perm} en ${mod.name}` : `${role} no tiene: ${perm} en ${mod.name}`}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
