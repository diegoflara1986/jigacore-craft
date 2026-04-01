import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FolderKanban, BookOpen, Bug, User } from "lucide-react";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface SearchResult {
  projects: { id: string; name: string; status: string }[];
  stories: { id: string; title: string; story_number: number; project_name: string; project_id: string }[];
  incidents: { id: string; title: string; ticket_code: string; severity: string; project_id: string }[];
  users: { id: string; full_name: string; email: string; role: string }[];
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({ projects: [], stories: [], incidents: [], users: [] });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  // Ctrl+K listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ projects: [], stories: [], incidents: [], users: [] });
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      const q = `%${query}%`;

      const [projRes, storyRes, incRes, userRes] = await Promise.all([
        supabase.from("projects").select("id, name, status").ilike("name", q).limit(3),
        supabase.from("user_stories").select("id, title, story_number, projects(name, id)").ilike("title", q).is("deleted_at", null).limit(3),
        supabase.from("incidents").select("id, title, ticket_code, severity, project_id").or(`title.ilike.${q},ticket_code.ilike.${q}`).limit(3),
        isAdmin ? supabase.from("profiles").select("id, full_name, email, role").or(`full_name.ilike.${q},email.ilike.${q}`).limit(3) : Promise.resolve({ data: [] }),
      ]);

      setResults({
        projects: projRes.data ?? [],
        stories: (storyRes.data ?? []).map((s: any) => ({
          id: s.id, title: s.title, story_number: s.story_number,
          project_name: s.projects?.name ?? "", project_id: s.projects?.id ?? "",
        })),
        incidents: incRes.data ?? [],
        users: (userRes as any).data ?? [],
      });
      setLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, isAdmin]);

  const go = (path: string) => { setOpen(false); setQuery(""); navigate(path); };
  const hasResults = results.projects.length + results.stories.length + results.incidents.length + results.users.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar proyectos, tareas, incidentes..." value={query} onValueChange={setQuery} />
      <CommandList>
        {!query.trim() && <CommandEmpty>Escribe para buscar...</CommandEmpty>}
        {query.trim() && !loading && !hasResults && <CommandEmpty>No se encontraron resultados</CommandEmpty>}

        {results.projects.length > 0 && (
          <CommandGroup heading="🗂️ Proyectos">
            {results.projects.map(p => (
              <CommandItem key={p.id} onSelect={() => go(`/proyectos/${p.id}`)} className="cursor-pointer">
                <FolderKanban className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{p.name}</span>
                <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.stories.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="📋 Historias de Usuario">
              {results.stories.map(s => (
                <CommandItem key={s.id} onSelect={() => go(`/proyectos/${s.project_id}`)} className="cursor-pointer">
                  <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mr-2 font-mono">HU-{s.story_number}</span>
                  <span className="flex-1 truncate">{s.title}</span>
                  <span className="text-xs text-muted-foreground">{s.project_name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {results.incidents.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="🐛 Incidentes">
              {results.incidents.map(i => (
                <CommandItem key={i.id} onSelect={() => go("/incidents")} className="cursor-pointer">
                  <Bug className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-mono mr-2 text-primary">{i.ticket_code}</span>
                  <span className="flex-1 truncate">{i.title}</span>
                  <Badge variant="secondary" className="text-[10px]">{i.severity}</Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {results.users.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="👥 Usuarios">
              {results.users.map(u => (
                <CommandItem key={u.id} onSelect={() => go("/settings")} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{u.full_name || u.email}</span>
                  <Badge variant="outline" className="text-[10px]">{u.role}</Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
