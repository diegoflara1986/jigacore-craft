import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

const INTEGRATIONS = [
  {
    name: "GitHub", logo: "🐙",
    description: "Vincula commits y PRs a tus Historias de Usuario",
    connected: false,
  },
  {
    name: "GitLab", logo: "🦊",
    description: "Vincula commits y merge requests a tus HU",
    connected: false,
  },
  {
    name: "Slack", logo: "💬",
    description: "Recibe notificaciones en tus canales de Slack",
    connected: false,
  },
  {
    name: "Google Calendar", logo: "📅",
    description: "Sincroniza sprints y fechas límite con tu calendario",
    connected: false,
  },
];

export function SettingsIntegrations() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Integraciones</h2>
      <p className="text-sm text-muted-foreground">Conecta herramientas externas para mejorar tu flujo de trabajo.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INTEGRATIONS.map(int => (
          <Card key={int.name} className="hover:shadow-md transition-shadow">
            <CardContent className="py-5">
              <div className="flex items-start gap-4">
                <span className="text-3xl">{int.logo}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{int.name}</h3>
                    <Badge variant={int.connected ? "default" : "secondary"} className="text-[10px]">
                      {int.connected ? "Conectado" : "Desconectado"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{int.description}</p>
                  <Button variant="outline" size="sm" className="mt-3" disabled>
                    <ExternalLink className="h-3 w-3 mr-1" /> {int.connected ? "Configurar" : "Conectar"}
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-1">Próximamente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
