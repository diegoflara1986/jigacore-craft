import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  useEstimationRound,
  useRoundStories,
  useRoundVotes,
  useRoundParticipants,
  useSaveVotes,
} from "@/hooks/useEstimationRounds";
import { useProject } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, Save } from "lucide-react";
import { cn } from "@/lib/utils";

const FIBONACCI = [0, 1, 2, 3, 5, 8, 13, 21, 34];

const TYPES: Record<string, string> = { story: "📖", bug: "🐛", technical: "⚙️", spike: "🔍", improvement: "✨" };
const PRIORITIES: Record<string, string> = { critical: "Crítica", high: "Alta", medium: "Media", low: "Baja" };

export default function EstimationVoting() {
  const { id: projectId, roundId } = useParams<{ id: string; roundId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: round } = useEstimationRound(roundId);
  const { data: project } = useProject(projectId);
  const { data: roundStories } = useRoundStories(roundId);
  const { data: allVotes } = useRoundVotes(roundId);
  const { data: participants } = useRoundParticipants(roundId);
  const saveVotes = useSaveVotes();

  // Local vote state: { roundStoryId: vote_value }
  const [localVotes, setLocalVotes] = useState<Record<string, number>>({});

  // Initialize local votes from existing user votes
  const myExistingVotes = useMemo(() => {
    const map: Record<string, number> = {};
    allVotes?.filter((v) => v.user_id === user?.id).forEach((v) => {
      map[v.round_story_id] = v.vote_value;
    });
    return map;
  }, [allVotes, user?.id]);

  const getVote = (roundStoryId: string) => localVotes[roundStoryId] ?? myExistingVotes[roundStoryId];

  const handleSelectCard = (roundStoryId: string, value: number) => {
    setLocalVotes((prev) => ({ ...prev, [roundStoryId]: value }));
  };

  const handleSave = async () => {
    if (!user || !roundId || !roundStories) return;
    const votesToSave = roundStories
      .filter((rs) => getVote(rs.id) !== undefined)
      .map((rs) => ({
        round_id: roundId,
        round_story_id: rs.id,
        user_id: user.id,
        vote_value: getVote(rs.id)!,
      }));
    await saveVotes.mutateAsync(votesToSave);
    navigate(`/proyectos/${projectId}?tab=estimation`);
  };

  const initials = (name: string | null) => name ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  const participantCount = participants?.length ?? 0;

  if (!round) {
    return <div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  const isClosed = round.status === "cerrada";

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/proyectos/${projectId}?tab=estimation`)}>
          <ChevronLeft className="h-4 w-4 mr-1" />Volver
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">{round.title}</h1>
          <p className="text-xs text-muted-foreground">{project?.name} · {roundStories?.length ?? 0} historias · Fibonacci</p>
        </div>
        {isClosed && <Badge variant="secondary">Cerrada</Badge>}
      </div>

      {/* Stories with voting cards */}
      <div className="space-y-6">
        {roundStories?.map((rs) => {
          const story = rs.user_story;
          if (!story) return null;
          const currentVote = getVote(rs.id);

          // Progress for this story
          const storyVoteCount = allVotes?.filter((v) => v.round_story_id === rs.id).length ?? 0;
          const storyProgress = participantCount > 0 ? Math.round((storyVoteCount / participantCount) * 100) : 0;

          // Voter status
          const voterIds = new Set(allVotes?.filter((v) => v.round_story_id === rs.id).map((v) => v.user_id) ?? []);

          return (
            <Card key={rs.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">{TYPES[story.type] ?? "📖"}</span>
                  <CardTitle className="text-base flex-1">{story.title}</CardTitle>
                  <Badge variant="outline" className="text-[10px]">{PRIORITIES[story.priority] ?? story.priority}</Badge>
                  {story.story_number && <Badge variant="secondary" className="text-[10px]">HU-{String(story.story_number).padStart(3, "0")}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {story.description && <p className="text-sm text-muted-foreground">{story.description}</p>}
                {story.acceptance_criteria && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Criterios de aceptación:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{story.acceptance_criteria}</p>
                  </div>
                )}

                {/* Voting cards */}
                {!isClosed && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Tu voto:</p>
                    <div className="flex flex-wrap gap-2">
                      {FIBONACCI.map((val) => (
                        <button
                          key={val}
                          onClick={() => handleSelectCard(rs.id, val)}
                          className={cn(
                            "w-12 h-16 rounded-lg border-2 flex items-center justify-center text-lg font-bold transition-all hover:scale-105",
                            currentVote === val
                              ? "bg-accent text-accent-foreground border-accent shadow-lg scale-105"
                              : "bg-card text-foreground border-border hover:border-accent/50"
                          )}
                        >
                          {val}
                        </button>
                      ))}
                      <button
                        onClick={() => handleSelectCard(rs.id, -1)}
                        className={cn(
                          "w-12 h-16 rounded-lg border-2 flex items-center justify-center text-lg font-bold transition-all hover:scale-105",
                          currentVote === -1
                            ? "bg-accent text-accent-foreground border-accent shadow-lg scale-105"
                            : "bg-card text-foreground border-border hover:border-accent/50"
                        )}
                      >
                        ?
                      </button>
                    </div>
                  </div>
                )}

                {rs.result_points !== null && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/30">
                    <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                      ✅ Puntos aceptados: {rs.result_points} SP
                    </span>
                  </div>
                )}

                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{storyVoteCount} de {participantCount} miembros han votado</span>
                  </div>
                  <Progress value={storyProgress} className="h-1.5" />
                  <div className="flex items-center gap-1 mt-1">
                    {participants?.map((p) => (
                      <div key={p.user_id} className="relative">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[8px] bg-muted">{initials(p.profile?.full_name ?? null)}</AvatarFallback>
                        </Avatar>
                        <span className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-background",
                          voterIds.has(p.user_id) ? "bg-green-500" : "bg-muted-foreground/40"
                        )} />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save button */}
      {!isClosed && (
        <div className="sticky bottom-4 mt-6 flex justify-center">
          <Button size="lg" onClick={handleSave} disabled={saveVotes.isPending || Object.keys(localVotes).length === 0}>
            <Save className="h-4 w-4 mr-2" />Guardar mis votos
          </Button>
        </div>
      )}
    </div>
  );
}
