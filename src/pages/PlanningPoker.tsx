import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  useEstimationSession,
  useUpdateEstimationSession,
  useSessionEstimations,
  useEstimationVotes,
  useCastVote,
} from "@/hooks/useEstimationSessions";
import { useUserStory, useUpdateUserStory } from "@/hooks/useUserStories";
import { useProjectMembers } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, Eye, RotateCcw, Save, Check, Trophy, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const fromTable = (table: string) => (supabase as any).from(table);

const SCALES: Record<string, string[]> = {
  fibonacci: ["0", "1", "2", "3", "5", "8", "13", "21", "34", "?", "☕"],
};

export default function PlanningPoker() {
  const { id: projectId, sessionId } = useParams<{ id: string; sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: session } = useEstimationSession(sessionId);
  const updateSession = useUpdateEstimationSession();
  const { data: estimations, refetch: refetchEstimations } = useSessionEstimations(sessionId);
  const { data: members } = useProjectMembers(projectId);
  const updateStory = useUpdateUserStory();

  const [revealed, setRevealed] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [storyEstimations, setStoryEstimations] = useState<Record<string, number | null>>({});
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);

  // Participants
  const [participants, setParticipants] = useState<any[]>([]);
  useEffect(() => {
    if (!sessionId) return;
    fromTable("estimation_session_participants")
      .select("*, profiles:user_id(id, full_name, email, avatar_url)")
      .eq("session_id", sessionId)
      .then(({ data }: any) => setParticipants(data ?? []));
  }, [sessionId]);

  // Is current user the moderator?
  const isModerator = session?.created_by === user?.id;

  // Initialize activeStoryId from session
  useEffect(() => {
    if (session?.current_story_id && !activeStoryId) {
      setActiveStoryId(session.current_story_id);
    }
  }, [session?.current_story_id]);

  // Current estimation based on local state
  const currentEstimation = useMemo(
    () => estimations?.find((e) => e.user_story_id === activeStoryId),
    [estimations, activeStoryId]
  );

  const { data: votes, refetch: refetchVotes } = useEstimationVotes(currentEstimation?.id);
  const castVote = useCastVote();
  const { data: currentStory } = useUserStory(activeStoryId ?? undefined);

  // Stories in session
  const storyIds = useMemo(() => estimations?.map((e) => e.user_story_id) ?? [], [estimations]);

  // Fetch all stories for the session
  const [sessionStories, setSessionStories] = useState<any[]>([]);
  useEffect(() => {
    if (!storyIds.length) { setSessionStories([]); return; }
    supabase
      .from("user_stories")
      .select("id, title, story_points, status, description, acceptance_criteria")
      .in("id", storyIds)
      .then(({ data }) => setSessionStories(data ?? []));
  }, [storyIds]);

  // Realtime subscriptions
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`poker-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "estimation_votes" }, () => {
        refetchVotes();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "estimation_sessions", filter: `id=eq.${sessionId}` }, (payload: any) => {
        qc.invalidateQueries({ queryKey: ["estimation-session", sessionId] });
        // If moderator changed the current story, sync for participants
        if (payload.new?.current_story_id && !isModerator) {
          setActiveStoryId(payload.new.current_story_id);
          setRevealed(false);
          setSelectedCard(null);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, isModerator]);

  // Mark self online
  useEffect(() => {
    if (!sessionId || !user) return;
    fromTable("estimation_session_participants")
      .update({ is_online: true })
      .eq("session_id", sessionId)
      .eq("user_id", user.id);
    return () => {
      fromTable("estimation_session_participants")
        .update({ is_online: false })
        .eq("session_id", sessionId)
        .eq("user_id", user.id);
    };
  }, [sessionId, user?.id]);

  const scale = SCALES[session?.scale_type ?? "fibonacci"] ?? SCALES.fibonacci;

  const myVote = votes?.find((v) => v.user_id === user?.id);

  const handleVote = async (value: string) => {
    if (!currentEstimation || !user) return;
    setSelectedCard(value);
    await castVote.mutateAsync({ estimationId: currentEstimation.id, userId: user.id, voteValue: value });
  };

  const handleReveal = () => {
    setRevealed(true);
    const numericVotes = votes?.filter((v) => !["?", "☕"].includes(v.vote_value)).map((v) => v.vote_value) ?? [];
    if (numericVotes.length > 1 && new Set(numericVotes).size === 1) {
      import("canvas-confetti").then((mod) => mod.default({ particleCount: 100, spread: 70, origin: { y: 0.6 } }));
    }
  };

  const handleNewRound = async () => {
    if (!currentEstimation) return;
    await supabase.from("estimation_votes").delete().eq("estimation_id", currentEstimation.id);
    setRevealed(false);
    setSelectedCard(null);
    refetchVotes();
  };

  const handleAcceptPoints = async (points: number) => {
    if (!activeStoryId) return;
    await updateStory.mutateAsync({ id: activeStoryId, story_points: points });
    setStoryEstimations((prev) => ({ ...prev, [activeStoryId]: points }));
    toast({ title: `${points} puntos asignados` });
    // Move to next unestimated story
    const currentIdx = storyIds.indexOf(activeStoryId);
    const nextId = storyIds.find((id, i) => i > currentIdx && !storyEstimations[id] && id !== activeStoryId);
    if (nextId) {
      handleSelectStory(nextId);
    } else {
      setRevealed(false);
      setSelectedCard(null);
    }
  };

  const handleSelectStory = useCallback((storyId: string) => {
    setActiveStoryId(storyId);
    setRevealed(false);
    setSelectedCard(null);
    // Moderator syncs story for all participants
    if (isModerator && sessionId) {
      updateSession.mutate({ id: sessionId, current_story_id: storyId });
    }
  }, [isModerator, sessionId]);

  const navigateStory = (dir: -1 | 1) => {
    const idx = storyIds.indexOf(activeStoryId ?? "");
    const next = storyIds[idx + dir];
    if (next) handleSelectStory(next);
  };

  const handleFinishSession = async () => {
    if (!session) return;
    await updateSession.mutateAsync({ id: session.id, status: "completed" });
    toast({ title: "Sesión finalizada" });
    navigate(`/proyectos/${projectId}`);
  };

  const handleApplyAllPoints = async () => {
    for (const [storyId, points] of Object.entries(storyEstimations)) {
      if (points !== null) {
        await updateStory.mutateAsync({ id: storyId, story_points: points });
      }
    }
    await handleFinishSession();
  };

  // Compute vote stats
  const numericVotes = votes?.filter((v) => !["?", "☕"].includes(v.vote_value)).map((v) => parseFloat(v.vote_value)).filter((n) => !isNaN(n)) ?? [];
  const average = numericVotes.length ? Math.round((numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length) * 10) / 10 : 0;
  const allSame = numericVotes.length > 1 && new Set(numericVotes).size === 1;
  const maxDiff = numericVotes.length > 1 ? Math.max(...numericVotes) - Math.min(...numericVotes) : 0;

  const voteDist = useMemo(() => {
    if (!votes || !revealed) return [];
    const counts: Record<string, number> = {};
    votes.forEach((v) => { counts[v.vote_value] = (counts[v.vote_value] || 0) + 1; });
    return Object.entries(counts).map(([value, count]) => ({ value, count }));
  }, [votes, revealed]);

  const initials = (name: string | null) => name ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  const getStoryStatus = (storyId: string) => {
    if (activeStoryId === storyId) return "estimating";
    if (storyEstimations[storyId] !== undefined) return "estimated";
    const s = sessionStories.find((st) => st.id === storyId);
    if (s?.story_points != null && s.story_points > 0) return "estimated";
    return "pending";
  };

  const participantCount = participants.length || members?.length || 0;
  const voteProgress = participantCount > 0 ? Math.round(((votes?.length ?? 0) / participantCount) * 100) : 0;

  if (!session) {
    return <div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  const estimatedCount = Object.keys(storyEstimations).length + sessionStories.filter(s => s.story_points != null && s.story_points > 0 && !storyEstimations[s.id]).length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/proyectos/${projectId}`)}>
            <ChevronLeft className="h-4 w-4 mr-1" />Volver
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="text-lg font-bold text-foreground">{session.name}</h1>
            <p className="text-xs text-muted-foreground">
              {isModerator ? "🎯 Moderador" : "🃏 Participante"} · Fibonacci · {storyIds.length} historias
            </p>
          </div>
        </div>
        {isModerator && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setFinishOpen(true)}>
              Finalizar sesión
            </Button>
          </div>
        )}
      </div>

      {/* SECTION: Current Story */}
      {currentStory ? (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {isModerator && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => navigateStory(-1)} disabled={storyIds.indexOf(activeStoryId ?? "") <= 0}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <CardTitle className="text-base truncate">{currentStory.title}</CardTitle>
                {isModerator && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => navigateStory(1)} disabled={storyIds.indexOf(activeStoryId ?? "") >= storyIds.length - 1}>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Badge variant="outline" className="text-xs shrink-0">{storyIds.indexOf(activeStoryId ?? "") + 1}/{storyIds.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {currentStory.description && <p className="text-sm text-muted-foreground">{currentStory.description}</p>}
            {currentStory.acceptance_criteria && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Criterios de aceptación:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{currentStory.acceptance_criteria}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-4"><CardContent className="py-10 text-center text-muted-foreground">Selecciona una historia para comenzar a estimar</CardContent></Card>
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* Center: Voting area */}
        <div className="col-span-12 md:col-span-8 space-y-4">
          {/* Vote status */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="space-y-1 flex-1">
                  <p className="text-sm text-muted-foreground">
                    {revealed ? "Votos revelados" : `${votes?.length ?? 0} de ${participantCount} participantes han votado`}
                  </p>
                  {!revealed && <Progress value={voteProgress} className="h-1.5" />}
                </div>
                {isModerator && (
                  <div className="flex gap-2 ml-4">
                    {!revealed && (
                      <Button size="sm" onClick={handleReveal} disabled={!votes?.length}>
                        <Eye className="h-3.5 w-3.5 mr-1" />Revelar votos
                      </Button>
                    )}
                    {revealed && (
                      <Button size="sm" variant="outline" onClick={handleNewRound}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />Nueva ronda
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Participant vote cards */}
              <div className="flex flex-wrap gap-3 justify-center">
                {(participants.length > 0 ? participants : members ?? []).map((p) => {
                  const memberId = p.user_id;
                  const memberProfile = p.profiles || p.profiles;
                  const memberName = memberProfile?.full_name || memberProfile?.email || "?";
                  const vote = votes?.find((v) => v.user_id === memberId);
                  const hasVoted = !!vote;
                  const isOnline = p.is_online;
                  return (
                    <div key={memberId} className="flex flex-col items-center gap-1">
                      <div
                        className={cn(
                          "w-14 h-20 rounded-lg border-2 flex items-center justify-center transition-all duration-500",
                          revealed && hasVoted
                            ? "bg-primary/10 border-primary"
                            : hasVoted
                              ? "bg-green-500/10 border-green-500"
                              : "bg-muted/50 border-muted-foreground/20"
                        )}
                      >
                        {revealed && hasVoted ? (
                          <span className="text-lg font-bold text-foreground">{vote.vote_value}</span>
                        ) : hasVoted ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <span className="text-muted-foreground text-xs">?</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={cn("h-2 w-2 rounded-full", isOnline ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40")} />
                        <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">
                          {memberName?.split(" ")[0] || "?"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Results after reveal */}
              {revealed && votes && votes.length > 0 && (
                <div className="mt-4 space-y-3">
                  <Separator />

                  {allSame && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 text-sm">
                      <Trophy className="h-4 w-4" />
                      ¡Consenso! Todos votaron {numericVotes[0]}
                    </div>
                  )}
                  {!allSame && maxDiff > 2 && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400 text-sm">
                      Discrepancia detectada. Se recomienda discutir antes de votar de nuevo.
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-foreground">
                      Promedio: <span className="text-primary text-lg font-bold">{average}</span> puntos
                    </span>
                  </div>

                  {/* Vote distribution */}
                  <div className="flex items-end gap-1 h-16">
                    {voteDist.map((d) => (
                      <div key={d.value} className="flex flex-col items-center gap-0.5 flex-1">
                        <div className="bg-primary/70 rounded-sm w-full min-h-[4px] transition-all" style={{ height: `${(d.count / (votes?.length || 1)) * 48}px` }} />
                        <span className="text-[9px] text-muted-foreground">{d.value}</span>
                        <span className="text-[9px] font-medium text-foreground">{d.count}</span>
                      </div>
                    ))}
                  </div>

                  {/* Accept buttons - only moderator */}
                  {isModerator && (
                    <div className="flex gap-2 flex-wrap">
                      {[...new Set(numericVotes)].sort((a, b) => a - b).map((v) => (
                        <Button key={v} size="sm" variant="outline" onClick={() => handleAcceptPoints(v)}>
                          ✓ Aceptar {v} pts
                        </Button>
                      ))}
                      <Button size="sm" onClick={() => handleAcceptPoints(Math.round(average))}>
                        <Save className="h-3.5 w-3.5 mr-1" />Guardar {Math.round(average)} pts
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cards to vote - shown for all when not revealed */}
          {!revealed && currentEstimation && (
            <div className="space-y-3">
              {selectedCard && (
                <p className="text-center text-sm text-muted-foreground">
                  Tu voto: <span className="font-bold text-primary">{selectedCard}</span>
                  <Button variant="link" size="sm" className="ml-2 h-auto p-0 text-xs" onClick={() => setSelectedCard(null)}>Cambiar</Button>
                </p>
              )}
              <div className="flex flex-wrap gap-2 justify-center">
                {scale.map((value) => (
                  <button
                    key={value}
                    onClick={() => handleVote(value)}
                    className={cn(
                      "w-14 h-20 rounded-lg border-2 flex items-center justify-center text-lg font-bold transition-all hover:scale-105 hover:-translate-y-1",
                      selectedCard === value
                        ? "border-primary bg-primary/10 -translate-y-2 shadow-lg scale-110 text-primary"
                        : "border-border bg-card text-foreground hover:border-primary/50"
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Stories & Participants */}
        <div className="col-span-12 md:col-span-4 space-y-4">
          {/* Participants */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Participantes ({participantCount})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(participants.length > 0 ? participants : members ?? []).map((p) => {
                const memberId = p.user_id;
                const prof = p.profiles;
                const vote = votes?.find((v) => v.user_id === memberId);
                return (
                  <div key={memberId} className="flex items-center gap-2">
                    <div className="relative">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[9px] bg-muted">{initials(prof?.full_name ?? null)}</AvatarFallback>
                      </Avatar>
                      <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background", p.is_online ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {prof?.full_name || prof?.email || "?"}
                        {memberId === session?.created_by && <span className="text-[9px] text-muted-foreground ml-1">(Moderador)</span>}
                      </p>
                    </div>
                    {revealed && vote && <Badge variant="outline" className="text-[10px]">{vote.vote_value}</Badge>}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Stories list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Historias ({sessionStories.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 max-h-64 overflow-y-auto">
              {sessionStories.map((s) => {
                const status = getStoryStatus(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => isModerator ? handleSelectStory(s.id) : undefined}
                    disabled={!isModerator}
                    className={cn(
                      "w-full text-left p-2 rounded-md text-sm transition-colors",
                      status === "estimating" && "bg-primary/10 border border-primary/30",
                      status === "estimated" && "bg-muted/50",
                      status === "pending" && (isModerator ? "hover:bg-muted/50 cursor-pointer" : ""),
                      !isModerator && "cursor-default"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-xs">
                        {status === "estimating" ? "🎯" : status === "estimated" ? "✅" : "⏳"}
                      </span>
                      <span className="flex-1 text-foreground line-clamp-1 text-xs">{s.title}</span>
                      {(storyEstimations[s.id] !== undefined || (s.story_points != null && s.story_points > 0)) && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">{storyEstimations[s.id] ?? s.story_points} SP</Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Finish Session Dialog */}
      <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Finalizar Sesión</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {estimatedCount} de {sessionStories.length} historias estimadas.
            </p>
            {sessionStories.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="flex-1 truncate text-foreground">{s.title}</span>
                <Badge variant={storyEstimations[s.id] != null || (s.story_points != null && s.story_points > 0) ? "default" : "outline"} className="text-[10px]">
                  {storyEstimations[s.id] ?? s.story_points ?? "—"} SP
                </Badge>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinishOpen(false)}>Cancelar</Button>
            <Button onClick={handleApplyAllPoints}>
              <Save className="h-3.5 w-3.5 mr-1" />Aplicar puntos y finalizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
