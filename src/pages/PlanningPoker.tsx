import { useState, useEffect, useMemo } from "react";
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
import { ArrowLeft, Eye, RotateCcw, Save, Check, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

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

  // Current estimation
  const currentEstimation = useMemo(
    () => estimations?.find((e) => e.user_story_id === session?.current_story_id),
    [estimations, session?.current_story_id]
  );

  const { data: votes, refetch: refetchVotes } = useEstimationVotes(currentEstimation?.id);
  const castVote = useCastVote();
  const { data: currentStory } = useUserStory(session?.current_story_id ?? undefined);

  // Stories in session
  const storyIds = useMemo(() => estimations?.map((e) => e.user_story_id) ?? [], [estimations]);

  // Fetch all stories for the session
  const [sessionStories, setSessionStories] = useState<any[]>([]);
  useEffect(() => {
    if (!storyIds.length) { setSessionStories([]); return; }
    supabase
      .from("user_stories")
      .select("id, title, story_points, status")
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
      .on("postgres_changes", { event: "*", schema: "public", table: "estimation_sessions", filter: `id=eq.${sessionId}` }, () => {
        qc.invalidateQueries({ queryKey: ["estimation-session", sessionId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const scale = SCALES[session?.scale_type ?? "fibonacci"] ?? SCALES.fibonacci;

  const myVote = votes?.find((v) => v.user_id === user?.id);

  const handleVote = async (value: string) => {
    if (!currentEstimation || !user) return;
    setSelectedCard(value);
    await castVote.mutateAsync({ estimationId: currentEstimation.id, userId: user.id, voteValue: value });
  };

  const handleReveal = () => {
    setRevealed(true);
    // Check consensus
    const numericVotes = votes?.filter((v) => !["?", "☕"].includes(v.vote_value)).map((v) => v.vote_value) ?? [];
    if (numericVotes.length > 1 && new Set(numericVotes).size === 1) {
      import("canvas-confetti").then((mod) => mod.default({ particleCount: 100, spread: 70, origin: { y: 0.6 } }));
    }
  };

  const handleNewRound = async () => {
    if (!currentEstimation) return;
    // Delete all votes for this estimation
    await supabase.from("estimation_votes").delete().eq("estimation_id", currentEstimation.id);
    setRevealed(false);
    setSelectedCard(null);
    refetchVotes();
  };

  const handleAcceptPoints = async (points: number) => {
    if (!session?.current_story_id) return;
    await updateStory.mutateAsync({ id: session.current_story_id, story_points: points });
    setStoryEstimations((prev) => ({ ...prev, [session.current_story_id!]: points }));
    // Move to next unestimated story
    const currentIdx = storyIds.indexOf(session.current_story_id);
    const nextId = storyIds.find((id, i) => i > currentIdx && !storyEstimations[id]);
    if (nextId) {
      await updateSession.mutateAsync({ id: session.id, current_story_id: nextId });
    }
    setRevealed(false);
    setSelectedCard(null);
  };

  const handleSelectStory = async (storyId: string) => {
    if (!session) return;
    await updateSession.mutateAsync({ id: session.id, current_story_id: storyId });
    setRevealed(false);
    setSelectedCard(null);
  };

  const handleFinishSession = async () => {
    if (!session) return;
    await updateSession.mutateAsync({ id: session.id, status: "completed" });
    navigate(`/proyectos/${projectId}`);
  };

  const handleApplyAllPoints = async () => {
    for (const [storyId, points] of Object.entries(storyEstimations)) {
      if (points !== null) {
        await updateStory.mutateAsync({ id: storyId, story_points: points });
      }
    }
    handleFinishSession();
  };

  // Compute vote stats
  const numericVotes = votes?.filter((v) => !["?", "☕"].includes(v.vote_value)).map((v) => parseFloat(v.vote_value)).filter((n) => !isNaN(n)) ?? [];
  const average = numericVotes.length ? Math.round((numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length) * 10) / 10 : 0;
  const allSame = numericVotes.length > 1 && new Set(numericVotes).size === 1;
  const maxDiff = numericVotes.length > 1 ? Math.max(...numericVotes) - Math.min(...numericVotes) : 0;

  // Vote distribution for chart
  const voteDist = useMemo(() => {
    if (!votes || !revealed) return [];
    const counts: Record<string, number> = {};
    votes.forEach((v) => { counts[v.vote_value] = (counts[v.vote_value] || 0) + 1; });
    return Object.entries(counts).map(([value, count]) => ({ value, count }));
  }, [votes, revealed]);

  const initials = (name: string | null) => name ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  const getStoryStatus = (storyId: string) => {
    if (session?.current_story_id === storyId) return "estimating";
    if (storyEstimations[storyId] !== undefined) return "estimated";
    return "pending";
  };

  if (!session) {
    return <div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/proyectos/${projectId}`)}>
            <ArrowLeft className="h-4 w-4 mr-1" />Volver
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="text-lg font-bold text-foreground">{session.name}</h1>
            <p className="text-xs text-muted-foreground">
              Escala: Fibonacci · {storyIds.length} historias
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleApplyAllPoints}>
            <Save className="h-3.5 w-3.5 mr-1" />Aplicar todos los puntos
          </Button>
          <Button variant="secondary" size="sm" onClick={handleFinishSession}>
            Finalizar sesión
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Top: Story list - full width */}
        <div className="col-span-12 space-y-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Historias a estimar ({sessionStories.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
                {sessionStories.map((s) => {
                  const status = getStoryStatus(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSelectStory(s.id)}
                      className={cn(
                        "w-full text-left p-2.5 rounded-md text-sm transition-colors",
                        status === "estimating" && "bg-primary/10 border border-primary/30",
                        status === "estimated" && "bg-muted/50",
                        status === "pending" && "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="shrink-0">
                          {status === "estimating" ? "🎯" : status === "estimated" ? "✅" : "⏳"}
                        </span>
                        <span className="flex-1 text-foreground line-clamp-2">{s.title}</span>
                        {storyEstimations[s.id] !== undefined && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">{storyEstimations[s.id]} SP</Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center: Voting area */}
        <div className="col-span-12 md:col-span-8 space-y-4">
          {currentStory ? (
            <>
              {/* Story info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{currentStory.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {currentStory.description && (
                    <p className="text-sm text-muted-foreground">{currentStory.description}</p>
                  )}
                  {currentStory.acceptance_criteria && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Criterios de aceptación:</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{currentStory.acceptance_criteria}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Voting status */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">
                      {revealed ? "Votos revelados" : `Esperando votos... (${votes?.length ?? 0}/${members?.length ?? 0} han votado)`}
                    </p>
                    <div className="flex gap-2">
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
                  </div>

                  {/* Participant votes */}
                  <div className="flex flex-wrap gap-3 justify-center">
                    {members?.map((m) => {
                      const vote = votes?.find((v) => v.user_id === m.user_id);
                      const hasVoted = !!vote;
                      return (
                        <div key={m.user_id} className="flex flex-col items-center gap-1">
                          <div
                            className={cn(
                              "w-14 h-20 rounded-lg border-2 flex items-center justify-center transition-all duration-500",
                              revealed && hasVoted
                                ? "bg-primary/10 border-primary animate-in flip-in-y"
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
                          <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">
                            {m.profiles?.full_name?.split(" ")[0] || m.profiles?.email?.split("@")[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Results */}
                  {revealed && votes && votes.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-foreground">
                            Promedio: <span className="text-primary text-lg font-bold">{average}</span> puntos
                          </span>
                          {allSame && (
                            <Badge variant="default" className="gap-1">
                              <Trophy className="h-3 w-3" />¡Consenso!
                            </Badge>
                          )}
                          {!allSame && maxDiff > 2 && (
                            <Badge variant="destructive" className="text-[10px]">Se recomienda discutir</Badge>
                          )}
                        </div>
                      </div>

                      {/* Vote distribution */}
                      <div className="flex items-end gap-1 h-16">
                        {voteDist.map((d) => (
                          <div key={d.value} className="flex flex-col items-center gap-0.5 flex-1">
                            <div
                              className="bg-primary/70 rounded-sm w-full min-h-[4px] transition-all"
                              style={{ height: `${(d.count / (votes?.length || 1)) * 48}px` }}
                            />
                            <span className="text-[9px] text-muted-foreground">{d.value}</span>
                            <span className="text-[9px] font-medium text-foreground">{d.count}</span>
                          </div>
                        ))}
                      </div>

                      {/* Accept buttons */}
                      <div className="flex gap-2 flex-wrap">
                        {[...new Set(numericVotes)].sort((a, b) => a - b).map((v) => (
                          <Button key={v} size="sm" variant="outline" onClick={() => handleAcceptPoints(v)}>
                            Aceptar {v} pts
                          </Button>
                        ))}
                        <Button size="sm" onClick={() => handleAcceptPoints(Math.round(average))}>
                          <Save className="h-3.5 w-3.5 mr-1" />Guardar {Math.round(average)} pts
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cards to vote */}
              {!revealed && (
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
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Selecciona una historia para comenzar a estimar
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Participants */}
        <div className="col-span-12 md:col-span-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Participantes ({members?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {members?.map((m) => {
                const vote = votes?.find((v) => v.user_id === m.user_id);
                return (
                  <div key={m.user_id} className="flex items-center gap-2">
                    <div className="relative">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[9px] bg-muted">
                          {initials(m.profiles?.full_name ?? null)}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                        vote ? "bg-green-500" : "bg-muted-foreground/40"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {m.profiles?.full_name || m.profiles?.email}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">{m.project_role}</p>
                    </div>
                    {revealed && vote && (
                      <Badge variant="outline" className="text-[10px]">{vote.vote_value}</Badge>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
