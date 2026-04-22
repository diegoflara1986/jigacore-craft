import {
  LayoutDashboard, FolderKanban, ClipboardList, Bug,
  BarChart3, Settings, Hexagon, ChevronLeft, Bell,
  ChevronRight, ShieldAlert, FileText, GraduationCap
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

// Navegación simple
const simpleNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Incidentes", url: "/incidents", icon: Bug },
  { title: "Reportes", url: "/reports", icon: BarChart3 },
  { title: "Notificaciones", url: "/notificaciones", icon: Bell },
  { title: "Configuración", url: "/settings", icon: Settings },
];

// Sub-ítems de Proyectos
const proyectosSubItems = [
  { title: "Todos los proyectos", url: "/proyectos" },
  { title: "Mi trabajo", url: "/my-work" },
];

function isActivePath(currentPath: string, targetPath: string) {
  if (targetPath === "/") return currentPath === "/";
  return currentPath === targetPath || currentPath.startsWith(targetPath + "/");
}

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const { hasPermission } = usePermissions();

  const canSeeProyectos = hasPermission("proyectos", "ver");
  const canSeeMiTrabajo = hasPermission("mi_trabajo", "ver");
  const canSeeIncidentes = hasPermission("incidentes", "ver");
  const canSeeReportes = hasPermission("reportes", "ver");
  const canSeeNotificaciones = hasPermission("notificaciones", "ver");

  // Visibilidad de sub-ítems SIG según permisos granulares
  const canSeeIncidentesSeguridad =
    hasPermission("sig_form_001", "ver") || hasPermission("sig_form_001", "registrar");
  const canSeeAccesosUsuarios =
    hasPermission("sig_form_002", "ver") || hasPermission("sig_form_002", "registrar") ||
    hasPermission("sig_form_003", "ver") || hasPermission("sig_form_003", "registrar");
  const canSeeSolicitudCambios =
    hasPermission("sig_form_004", "ver") || hasPermission("sig_form_004", "registrar") ||
    hasPermission("sig_form_006", "ver") || hasPermission("sig_form_006", "registrar");
  const canSeeCapacitacionMejoras =
    hasPermission("sig_reg_001", "ver") || hasPermission("sig_reg_001", "registrar") ||
    hasPermission("sig_reg_002", "ver") || hasPermission("sig_reg_002", "registrar");

  const sigSubItems = [
    canSeeIncidentesSeguridad && { title: "Incidentes de seguridad", url: "/sig/incidentes-seguridad" },
    canSeeAccesosUsuarios && { title: "Accesos y usuarios", url: "/sig/accesos-usuarios" },
    canSeeSolicitudCambios && { title: "Solicitud de cambios", url: "/sig/solicitud-cambios" },
    canSeeCapacitacionMejoras && { title: "Capacitación y mejoras", url: "/sig/capacitacion-mejoras" },
  ].filter(Boolean) as { title: string; url: string }[];

  const canSeeSig = sigSubItems.length > 0;

  // Determinar si los grupos están abiertos
  const isProyectosActive = isActivePath(currentPath, "/proyectos") || isActivePath(currentPath, "/my-work");
  const isSigActive = currentPath.startsWith("/sig");

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="sidebar-gradient p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hexagon className="h-7 w-7 text-sidebar-primary shrink-0" />
            {!collapsed && <span className="text-lg font-bold text-sidebar-primary-foreground">Jigacore PM</span>}
          </div>
          {!collapsed && (
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent h-7 w-7">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="sidebar-gradient">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider px-4">
            {!collapsed && "Menú"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/"
                    end
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                  >
                    <LayoutDashboard className="h-5 w-5 shrink-0" />
                    {!collapsed && <span className="text-sm">Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Grupo Proyectos - colapsable */}
              <Collapsible defaultOpen={isProyectosActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
                      <div className="flex items-center gap-3">
                        <FolderKanban className="h-5 w-5 shrink-0" />
                        {!collapsed && <span className="text-sm">Proyectos</span>}
                      </div>
                      {!collapsed && (
                        <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                </SidebarMenuItem>
                {!collapsed && (
                  <CollapsibleContent>
                    <SidebarMenu className="pl-4 border-l border-sidebar-border/50 ml-4 mt-1 space-y-1">
                      {proyectosSubItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors",
                                isActivePath(currentPath, item.url)
                                  ? "text-sidebar-primary font-medium"
                                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                              )}
                            >
                              <span>{item.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </CollapsibleContent>
                )}
              </Collapsible>

              {/* Incidentes */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/incidents"
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                  >
                    <Bug className="h-5 w-5 shrink-0" />
                    {!collapsed && <span className="text-sm">Incidentes</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Grupo SIG - colapsable (solo si tiene algún sub-ítem visible) */}
              {canSeeSig && (
                <Collapsible defaultOpen={isSigActive} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
                        <div className="flex items-center gap-3">
                          <ShieldAlert className="h-5 w-5 shrink-0" />
                          {!collapsed && <span className="text-sm">SIG</span>}
                        </div>
                        {!collapsed && (
                          <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                  </SidebarMenuItem>
                  {!collapsed && (
                    <CollapsibleContent>
                      <SidebarMenu className="pl-4 border-l border-sidebar-border/50 ml-4 mt-1 space-y-1">
                        {sigSubItems.map((item) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild>
                              <NavLink
                                to={item.url}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors",
                                  isActivePath(currentPath, item.url)
                                    ? "text-sidebar-primary font-medium"
                                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                                )}
                              >
                                {item.title === "Incidentes de seguridad" && <ShieldAlert className="h-3 w-3" />}
                                {item.title === "Accesos y usuarios" && <FileText className="h-3 w-3" />}
                                {item.title === "Solicitud de cambios" && <FileText className="h-3 w-3" />}
                                {item.title === "Capacitación y mejoras" && <GraduationCap className="h-3 w-3" />}
                                <span>{item.title}</span>
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </CollapsibleContent>
                  )}
                </Collapsible>
              )}

              {/* Reportes */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/reports"
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                  >
                    <BarChart3 className="h-5 w-5 shrink-0" />
                    {!collapsed && <span className="text-sm">Reportes</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Notificaciones */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/notificaciones"
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                  >
                    <Bell className="h-5 w-5 shrink-0" />
                    {!collapsed && <span className="text-sm">Notificaciones</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Configuración */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/settings"
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                  >
                    <Settings className="h-5 w-5 shrink-0" />
                    {!collapsed && <span className="text-sm">Configuración</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <>
            <Separator className="bg-sidebar-border mx-4" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider px-4">
                Proyectos Recientes
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <p className="px-4 py-2 text-xs text-sidebar-muted">Sin proyectos aún</p>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="sidebar-gradient p-4">
        {!collapsed && (
          <p className="text-[10px] text-sidebar-muted text-center">© 2026 Jigacore</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
