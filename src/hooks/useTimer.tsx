import { createContext, useContext, useState, useRef, useCallback, ReactNode, useEffect } from "react";

interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  elapsed: number; // seconds
  projectId: string | null;
  projectName: string | null;
  storyId: string | null;
  storyLabel: string | null;
  description: string;
}

interface TimerContextType extends TimerState {
  startTimer: (opts: { projectId: string; projectName: string; storyId?: string; storyLabel?: string; description: string }) => void;
  stopTimer: () => { elapsed: number; projectId: string; storyId: string | null; description: string } | null;
  discardTimer: () => void;
}

const TimerContext = createContext<TimerContextType | null>(null);

export const useTimer = () => {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be inside TimerProvider");
  return ctx;
};

const TIMER_KEY = "jigacore_timer";

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState>(() => {
    try {
      const raw = localStorage.getItem(TIMER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.isRunning && parsed.startTime) {
          return {
            isRunning: true,
            startTime: parsed.startTime,
            elapsed: Math.floor((Date.now() - parsed.startTime) / 1000),
            projectId: parsed.projectId ?? null,
            projectName: parsed.projectName ?? null,
            storyId: parsed.storyId ?? null,
            storyLabel: parsed.storyLabel ?? null,
            description: parsed.description ?? "",
          };
        }
      }
    } catch {
      // ignore parse errors
    }
    return {
      isRunning: false, startTime: null, elapsed: 0,
      projectId: null, projectName: null, storyId: null, storyLabel: null, description: "",
    };
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state.isRunning && state.startTime) {
      intervalRef.current = setInterval(() => {
        setState(prev => ({ ...prev, elapsed: Math.floor((Date.now() - (prev.startTime ?? Date.now())) / 1000) }));
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state.isRunning, state.startTime]);

  useEffect(() => {
    if (state.isRunning) {
      localStorage.setItem(TIMER_KEY, JSON.stringify({
        isRunning: state.isRunning,
        startTime: state.startTime,
        projectId: state.projectId,
        projectName: state.projectName,
        storyId: state.storyId,
        storyLabel: state.storyLabel,
        description: state.description,
      }));
    } else {
      localStorage.removeItem(TIMER_KEY);
    }
  }, [state.isRunning, state.startTime, state.projectId, state.projectName, state.storyId, state.storyLabel, state.description]);

  const startTimer = useCallback((opts: { projectId: string; projectName: string; storyId?: string; storyLabel?: string; description: string }) => {
    setState({
      isRunning: true, startTime: Date.now(), elapsed: 0,
      projectId: opts.projectId, projectName: opts.projectName,
      storyId: opts.storyId || null, storyLabel: opts.storyLabel || null,
      description: opts.description,
    });
  }, []);

  const stopTimer = useCallback(() => {
    if (!state.isRunning) return null;
    const result = { elapsed: state.elapsed, projectId: state.projectId!, storyId: state.storyId, description: state.description };
    setState(prev => ({ ...prev, isRunning: false }));
    if (intervalRef.current) clearInterval(intervalRef.current);
    localStorage.removeItem(TIMER_KEY);
    return result;
  }, [state]);

  const discardTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    localStorage.removeItem(TIMER_KEY);
    setState({ isRunning: false, startTime: null, elapsed: 0, projectId: null, projectName: null, storyId: null, storyLabel: null, description: "" });
  }, []);

  return (
    <TimerContext.Provider value={{ ...state, startTimer, stopTimer, discardTimer }}>
      {children}
    </TimerContext.Provider>
  );
}
