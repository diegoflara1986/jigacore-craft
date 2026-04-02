import { useState } from "react";
import { Hexagon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { getStatusInfo, getSeverityInfo } from "@/hooks/useIncidents";

interface PublicIncident {
  ticket_code: string;
  title: string;
  status: string;
  severity: string;
  created_at: string;
  updated_at: string | null;
}

export default function LookupIncident() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PublicIncident | null>(null);
  const [notFound, setNotFound] = useState(false);

  const lookup = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);
    try {
      const { data, error } = await supabase.rpc("lookup_incident_public", { p_ticket_code: code.trim().toUpperCase() });
      if (error) throw error;
      if (data && data.length > 0) {
        setResult(data[0] as PublicIncident);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      <header className="w-full border-b py-4 flex justify-center items-center gap-2">
        <Hexagon className="h-7 w-7 text-primary" />
        <span className="text-lg font-bold">Jigacore PM</span>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-lg w-full">
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Consultar estado de tu reporte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="Ingresa tu código (ej: INC-2025-001)" value={code}
                onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === "Enter" && lookup()} />
              <Button onClick={lookup} disabled={loading}><Search className="h-4 w-4" /></Button>
            </div>
            {notFound && <p className="text-sm text-red-500 text-center">No encontramos un ticket con ese código</p>}
            {result && (() => {
              const si = getStatusInfo(result.status);
              const sev = getSeverityInfo(result.severity === "sin_evaluar" ? null : result.severity);
              return (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-lg">{result.ticket_code}</span>
                    <Badge className={si.color}>{si.icon} {si.label}</Badge>
                  </div>
                  <p className="font-medium text-foreground">{result.title}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div><span className="font-medium">Severidad:</span> <Badge className={sev.color}>{sev.label}</Badge></div>
                    <div><span className="font-medium">Creado:</span> {new Date(result.created_at).toLocaleDateString("es")}</div>
                    {result.updated_at && (
                      <div className="col-span-2"><span className="font-medium">Última actualización:</span> {new Date(result.updated_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                    )}
                  </div>
                </div>
              );
            })()}
            <div className="text-center pt-2">
              <Link to="/reportar-incidente" className="text-sm text-primary hover:underline">¿Quieres reportar un nuevo incidente?</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
