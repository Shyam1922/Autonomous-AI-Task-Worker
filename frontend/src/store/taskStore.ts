import { useCallback, useEffect, useRef, useState } from "react";

import { api, ApiError } from "../services/api";
import { subscribeToTask } from "../services/events";
import type { TaskEvent } from "../types/execution";
import { isTerminal, type Task } from "../types/task";

interface TaskState {
  task: Task | null;
  events: TaskEvent[];
  loading: boolean;
  error: string | null;
  live: boolean;
}

/** Loads a task and its audit trail, then follows it live until it finishes. */
export function useTask(taskId: string | undefined) {
  const [state, setState] = useState<TaskState>({
    task: null,
    events: [],
    loading: true,
    error: null,
    live: false,
  });
  const [reconnect, setReconnect] = useState(0);
  const lastEventId = useRef(0);

  useEffect(() => {
    if (!taskId) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const [task, events] = await Promise.all([api.getTask(taskId), api.listEvents(taskId)]);
        if (cancelled) return;
        lastEventId.current = events.at(-1)?.id ?? 0;
        setState({ task, events, loading: false, error: null, live: !isTerminal(task.status) });

        if (isTerminal(task.status)) return;

        unsubscribe = subscribeToTask(taskId, lastEventId.current, {
          onEvent: (event) => {
            if (event.id <= lastEventId.current) return;
            lastEventId.current = event.id;
            setState((s) => ({ ...s, events: [...s.events, event] }));
          },
          onTask: (next) => setState((s) => ({ ...s, task: next, live: !isTerminal(next.status) })),
          onEnd: () => setState((s) => ({ ...s, live: false })),
          onError: () => setState((s) => ({ ...s, live: false })),
        });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof ApiError ? err.message : "Failed to load task";
        setState((s) => ({ ...s, loading: false, error: message }));
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [taskId, reconnect]);

  /** Apply a task returned by a mutation and re-attach the live stream if needed. */
  const applyTask = useCallback((task: Task) => {
    setState((s) => ({ ...s, task }));
    if (!isTerminal(task.status)) setReconnect((n) => n + 1);
  }, []);

  return { ...state, applyTask };
}
