import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function SigIncidentesSeguridad() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-6 w-6" />
          Incidentes de Seguridad
        </h1>
        <p className="text-muted-foreground">
          Gestión de incidentes relacionados con seguridad de la información y protección de datos.
        </p>
      </div>

      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <p className="text-muted-foreground text-center">
            Próximamente — formularios en construcción
          </p>
        </CardContent>
      </Card>
    </div>
  );
}