import { GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function SigCapacitacionMejoras() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <GraduationCap className="h-6 w-6" />
          Capacitación y Mejoras
        </h1>
        <p className="text-muted-foreground">
          Programas de capacitación, evaluación de competencias e iniciativas de mejora continua.
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