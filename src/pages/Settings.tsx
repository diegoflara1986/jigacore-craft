import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { User, Bell, Palette, Building2, Users, Shield, Clock, FileText, Kanban, Tags, Puzzle, Box, Receipt, ClipboardList, Lock, Bug } from "lucide-react";
import { SettingsProfile } from "@/components/settings/SettingsProfile";
import { SettingsNotifications } from "@/components/settings/SettingsNotifications";
import { SettingsAppearance } from "@/components/settings/SettingsAppearance";
import { SettingsWorkspace } from "@/components/settings/SettingsWorkspace";
import { SettingsUsers } from "@/components/settings/SettingsUsers";
import { SettingsRoles } from "@/components/settings/SettingsRoles";
import { SettingsSLA } from "@/components/settings/SettingsSLA";
import { SettingsIntegrations } from "@/components/settings/SettingsIntegrations";
import { SettingsAudit } from "@/components/settings/SettingsAudit";
import { SettingsIncidentPermissions } from "@/components/settings/SettingsIncidentPermissions";

type Section = "profile" | "notifications" | "appearance" | "workspace" | "users" | "roles" | "sla" | "incident_perms" | "integrations" | "audit";

const PERSONAL_ITEMS = [
  { id: "profile" as Section, label: "Mi Perfil", icon: User },
  { id: "notifications" as Section, label: "Mis Notificaciones", icon: Bell },
  { id: "appearance" as Section, label: "Apariencia", icon: Palette },
];

const WORKSPACE_ITEMS = [
  { id: "workspace" as Section, label: "General", icon: Building2 },
  { id: "users" as Section, label: "Gestión de Usuarios", icon: Users },
  { id: "roles" as Section, label: "Roles y Permisos", icon: Shield },
  { id: "sla" as Section, label: "SLA de Incidentes", icon: Clock },
];

const SYSTEM_ITEMS = [
  { id: "integrations" as Section, label: "Integraciones", icon: Puzzle },
  { id: "audit" as Section, label: "Auditoría", icon: ClipboardList },
];

export default function Settings() {
  const { profile } = useAuth();
  const [section, setSection] = useState<Section>("profile");
  const role = profile?.role ?? "developer";
  const isAdmin = ["admin", "super_admin"].includes(role);

  const SidebarGroup = ({ title, items }: { title: string; items: typeof PERSONAL_ITEMS }) => (
    <div className="mb-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-3 mb-1">{title}</p>
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => setSection(item.id)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left",
            section === item.id
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex gap-6 animate-fade-in min-h-[calc(100vh-8rem)]">
      {/* Internal sidebar */}
      <aside className="w-[220px] shrink-0 space-y-1">
        <h2 className="text-lg font-bold text-foreground px-3 mb-4">Configuración</h2>
        <SidebarGroup title="Personal" items={PERSONAL_ITEMS} />
        {isAdmin && <SidebarGroup title="Workspace" items={WORKSPACE_ITEMS} />}
        {isAdmin && <SidebarGroup title="Sistema" items={SYSTEM_ITEMS} />}
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">
        {section === "profile" && <SettingsProfile />}
        {section === "notifications" && <SettingsNotifications />}
        {section === "appearance" && <SettingsAppearance />}
        {section === "workspace" && <SettingsWorkspace />}
        {section === "users" && <SettingsUsers />}
        {section === "roles" && <SettingsRoles />}
        {section === "sla" && <SettingsSLA />}
        {section === "integrations" && <SettingsIntegrations />}
        {section === "audit" && <SettingsAudit />}
      </main>
    </div>
  );
}
