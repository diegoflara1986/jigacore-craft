import {
  LayoutDashboard, FolderKanban, ClipboardList, Bug,
  BarChart3, Settings, Hexagon, ChevronLeft
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Proyectos", url: "/proyectos", icon: FolderKanban },
  { title: "Mi Trabajo", url: "/my-work", icon: ClipboardList },
  { title: "Incidentes", url: "/incidents", icon: Bug },
  { title: "Reportes", url: "/reports", icon: BarChart3 },
  { title: "Configuración", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

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
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
