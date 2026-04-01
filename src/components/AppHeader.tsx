import { Moon, Sun, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { GlobalTimer } from "@/components/timer/GlobalTimer";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { useRealtimeNotifications } from "@/hooks/useNotifications";

export function AppHeader() {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  useRealtimeNotifications();

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger aria-label="Abrir menú lateral" />
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors cursor-pointer"
          aria-label="Buscar (Ctrl+K)"
        >
          <Search className="h-4 w-4" />
          <span>Buscar...</span>
          <kbd className="ml-4 text-[10px] bg-background border border-border rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <GlobalTimer />

        <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground" aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <NotificationDropdown />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2" aria-label="Menú de usuario">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline">{profile?.full_name || "Usuario"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
