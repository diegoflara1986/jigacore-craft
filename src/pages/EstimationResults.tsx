import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  useEstimationRound,
  useRoundStories,
  useRoundVotes,
  useRoundParticipants,
  useCloseRound,
  useAcceptStoryPoints,
} from "@/hooks/useEstimationRounds";
import { useProject } from "@/hooks/useProjects";
import { useUpdateUserStory } from "@/hooks/useUserStories";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, Check, Lock, Trophy, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function EstimationResults() {
  const { id: projectId, roundId } = useParams<{ id: string; roundId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: round } = useEstimationRound(roundId);
  const { data: project } = useProject(projectId);
  const { data: roundStories, refetch: refetchStories } = useRoundStories(roundId);
  const { data: allVotes } = useRoundVotes(roundId);
  const { data: participants } = useRoundParticipants(roundId);
  const closeRound = useCloseRound();
  const acceptPoints = useAcceptStoryPoints();
  const updateStory = useUpdateUserStory();

  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [customPoints, setCustomPoints] = useState<Record<string, string>>({});

  if (!round) {
    return <div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  const isClosed = round.status === "cerrada";
  const isCreator = round.created_by === user?.id;
  const participantCount = participants?.length ?? 0;

  const getStoryVotes = (roundStoryId: string) => allVotes?.filter((v) => v.round_story_id === roundStoryId) ?? [];

  const computeStats = (roundStoryId: string) => {
    const sv = getStoryVotes(roundStoryId).filter((v) => v.vote_value >= 0);
    const values = sv.map((v) => v.vote_value);
    if (!values.length) return { avg: 0, min: 0, max: 0, mode: 0, allSame: false, diff: 0, totalVotes: 0 };
    const avg = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const freq: Record<number, number> = {};
    values.forEach((v) => { freq[v] = (freq[v] || 0) + 1; });
    const mode = parseInt(Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "0");
    const allSame = new Set(values).size === 1;
    const diff = max - min;
    return { avg, min, max, mode, allSame, diff, totalVotes: sv.length };
  };

  const handleAccept = async (roundStoryId: string, userStoryId: string) => {
    const pts = parseInt(customPoints[roundStoryId] ?? String(computeStats(roundStoryId).mode));
    if (isNaN(pts) || pts < 0) return;
    await acceptPoints.mutateAsync({ roundStoryId, points: pts, userStoryId });
    refetchStories();
  };

  const handleClose = async () => {
    if (!roundId) return;
    await closeRound.mutateAsync(roundId);
    setCloseConfirmOpen(false);
  };

  const handleApplyAll = async () => {
    if (!roundStories) return;
    let applied = 0;
    for (const rs of roundStories) {
      if (rs.result_points !== null) continue;
      const stats = computeStats(rs.id);
      if (stats.totalVotes > 0) {
        await acceptPoints.mutateAsync({ roundStoryId: rs.id, points: stats.mode, userStoryId: rs.user_story_id });
        applied++;
      }
    }
    refetchStories();
    toast({ title: `${applied} HU estimadas con la moda de votos` });
  };

  const estimatedCount = roundStories?.filter((rs) => rs.result_points !== null).length ?? 0;
  const totalCount = roundStories?.length ?? 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/proyectos/${projectId}?tab=estimation`)}>
            <ChevronLeft className="h-4 w-4 mr-1" />Volver
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">{round.title} — Resultados</h1>
            <p className="text-xs text-muted-foreground">{project?.name} · {estimatedCount}/{totalCount} HU estimadas</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isCreator && !isClosed && (
            <>
              <Button variant="outline" size="sm" onClick={handleApplyAll}>
                Aplicar todos (moda)
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setCloseConfirmOpen(true)}>
                <Lock className="h-3.5 w-3.5 mr-1" />Cerrar Ronda
              </Button>
            </>
          )}
          {isClosed && <Badge variant="secondary">Ronda cerrada</Badge>}
        </div>
      </div>

      {/* Summary bar */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{estimatedCount} de {totalCount} HU con puntos aceptados</span>
          <span>{Math.round((estimatedCount / Math.max(totalCount, 1)) * 100)}%</span>
        </div>
        <Progress value={(estimatedCount / Math.max(totalCount, 1)) * 100} className="h-2" />
      </div>

      {/* Per-story results */}
      <div className="space-y-4">
        {roundStories?.map((rs) => {
          const story = rs.user_story;
          if (!story) return null;
          const stats = computeStats(rs.id);
          const storyVotes = getStoryVotes(rs.id);
          const pointsField = customPoints[rs.id] ?? (rs.result_points !== null ? String(rs.result_points) : String(stats.mode));

          return (
            <Card key={rs.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">HU-{String(story.story_number ?? 0).padStart(3, "0")}</span>
                    {story.title}
                  </CardTitle>
                  {rs.result_points !== null && (
                    <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                      ✅ {rs.result_points} SP
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Consensus indicator */}
                {stats.totalVotes > 0 && (
                  <>
                    {stats.allSame && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 text-sm">
                        <Trophy className="h-4 w-4" />
                        Consenso en {stats.mode} puntos
                      </div>
                    )}
                    {!stats.allSame && stats.diff <= 2 && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        Discrepancia menor. Sugerido: {Math.round(stats.avg)} SP
                      </div>
                    )}
                    {!stats.allSame && stats.diff > 2 && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-sm">
                        <XCircle className="h-4 w-4" />
                        Discrepancia alta. Se recomienda discutir.
                      </div>
                    )}
                  </>
                )}

                {/* Votes table */}
                {storyVotes.length > 0 && (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Miembro</TableHead>
                          <TableHead className="w-20 text-center">Voto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {storyVotes.map((v) => (
                          <TableRow key={v.id}>
                            <TableCell className="text-sm">{v.profile?.full_name || v.profile?.email || "—"}</TableCell>
                            <TableCell className="text-center font-bold">{v.vote_value === -1 ? "?" : v.vote_value}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Stats */}
                {stats.totalVotes > 0 && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Promedio: <strong className="text-foreground">{stats.avg}</strong></span>
                    <span>Mín: <strong className="text-foreground">{stats.min}</strong></span>
                    <span>Máx: <strong className="text-foreground">{stats.max}</strong></span>
                    <span>Moda: <strong className="text-foreground">{stats.mode}</strong></span>
                  </div>
                )}

                {/* Accept points (only for creator while open or if not yet accepted) */}
                {isCreator && rs.result_points === null && stats.totalVotes > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Story Points finales:</span>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      className="h-8 w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={pointsField}
                      onChange={(e) => setCustomPoints((prev) => ({ ...prev, [rs.id]: e.target.value }))}
                    />
                    <Button size="sm" onClick={() => handleAccept(rs.id, rs.user_story_id)} disabled={acceptPoints.isPending}>
                      <Check className="h-3.5 w-3.5 mr-1" />Aceptar
                    </Button>
                  </div>
                )}

                {/* No votes */}
                {stats.totalVotes === 0 && (
                  <p className="text-sm text-muted-foreground italic">Aún no hay votos para esta historia</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Close confirmation */}
      <Dialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cerrar esta ronda?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Los miembros ya no podrán cambiar sus votos. Las HU sin puntos aceptados quedarán pendientes en el backlog.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseConfirmOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleClose} disabled={closeRound.isPending}>Cerrar ronda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
