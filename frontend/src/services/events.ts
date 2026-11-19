import type { TaskEvent } from "../types/execution";
import type { Task } from "../types/task";
import { API_BASE } from "./api";

export interface TaskStreamHandlers {
  onEvent: (event: TaskEvent) => void;
  onTask: (task: Task) => void;
  onEnd?: () => void;
  onError?: () => void;
}

/**
 * Subscribe to a task's live Server-Sent Events stream.
 * Returns an unsubscribe function. `after` skips events already loaded.
 */
export function subscribeToTask(
  taskId: string,
  after: number,
  handlers: TaskStreamHandlers,
): () => void {
  const source = new EventSource(`${API_BASE}/api/tasks/${taskId}/stream?after=${after}`);

  source.addEventListener("event", (e) => handlers.onEvent(JSON.parse((e as MessageEvent).data)));
  source.addEventListener("task", (e) => handlers.onTask(JSON.parse((e as MessageEvent).data)));
  source.addEventListener("end", () => {
    source.close();
    handlers.onEnd?.();
  });
  source.onerror = () => handlers.onError?.();

  return () => source.close();
}
