import type {
  DemoDocument,
  FinanceRecord,
  RuntimeConfig,
  TaskEvent,
} from "../types/execution";
import type { Task, TaskStats, TaskSummary } from "../types/task";

// In development Vite proxies /api and /health to the backend (see vite.config.ts).
// Set VITE_API_URL to call a backend on another origin instead.
export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(0, "Cannot reach the TaskPilot backend. Is it running?");
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail)) message = body.detail.map((d: { msg: string }) => d.msg).join("; ");
    } catch {
      /* keep the generic message */
    }
    throw new ApiError(response.status, message);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export const api = {
  health: () => request<{ status: string; database: string }>("/health/ready"),
  config: () => request<RuntimeConfig>("/api/config"),

  listTasks: (limit = 50) => request<TaskSummary[]>(`/api/tasks?limit=${limit}`),
  stats: () => request<TaskStats>("/api/tasks/stats"),
  getTask: (id: string) => request<Task>(`/api/tasks/${id}`),
  listEvents: (id: string, after = 0) =>
    request<TaskEvent[]>(`/api/tasks/${id}/events?after=${after}`),

  createTask: (goal: string) =>
    request<Task>("/api/tasks", { method: "POST", body: JSON.stringify({ goal }) }),
  cancelTask: (id: string) => request<Task>(`/api/tasks/${id}/cancel`, { method: "POST" }),
  retryTask: (id: string) => request<Task>(`/api/tasks/${id}/retry`, { method: "POST" }),

  decideApproval: (taskId: string, requestId: string, decision: "approve" | "reject", comment?: string) =>
    request<Task>(`/api/tasks/${taskId}/approvals/${requestId}`, {
      method: "POST",
      body: JSON.stringify({ decision, comment: comment || null }),
    }),
  answerInput: (taskId: string, requestId: string, answer: string) =>
    request<Task>(`/api/tasks/${taskId}/inputs/${requestId}`, {
      method: "POST",
      body: JSON.stringify({ answer }),
    }),

  documents: () => request<DemoDocument[]>("/api/demo/documents"),
  financeRecords: () => request<FinanceRecord[]>("/api/demo/finance/records"),
  resetFinanceRecords: () => request<void>("/api/demo/finance/records", { method: "DELETE" }),
};
