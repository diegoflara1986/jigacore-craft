import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function SigSolicitudCambios() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Solicitud de Cambios
        </h1>
        <p className="text-muted-foreground">
          Proceso de solicitud, evaluación y aprobación de cambios en sistemas y configuraciones.
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