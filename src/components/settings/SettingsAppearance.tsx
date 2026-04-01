import { useTheme } from "@/lib/theme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Sun, Moon, Monitor } from "lucide-react";

export function SettingsAppearance() {
  const { theme, toggleTheme } = useTheme();

  const options = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Oscuro", icon: Moon },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold text-foreground">Apariencia</h2>
      <Card>
        <CardHeader><CardTitle className="text-base">Tema de la aplicación</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => { if (theme !== opt.value) toggleTheme(); }}
                className={cn(
                  "flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all",
                  theme === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                <opt.icon className={cn("h-8 w-8", theme === opt.value ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-sm font-medium", theme === opt.value ? "text-primary" : "text-muted-foreground")}>{opt.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
