import type { UserRequest, Verification } from "./execution";

export type TaskStatus =
  | "queued"
  | "running"
  | "waiting_approval"
  | "waiting_input"
  | "completed"
  | "partial"
  | "blocked"
  | "failed"
  | "cancelled";

export const TERMINAL_STATUSES: TaskStatus[] = [
  "completed",
  "partial",
  "blocked",
  "failed",
  "cancelled",
];

export function isTerminal(status: TaskStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export interface PlanStep {
  title: string;
  success_criteria: string;
  status: "pending" | "completed";
}

export interface EvidenceItem {
  type: "destination_record" | "source_document";
  reference: string;
}

export interface TaskReport {
  status: "completed" | "partial" | "blocked" | "failed";
  summary: string;
  data: Record<string, unknown>;
  evidence: EvidenceItem[];
  unresolved_issues: string[];
}

export interface TaskSummary {
  id: string;
  goal: string;
  status: TaskStatus;
  llm_provider: string;
  step_count: number;
  summary: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Task extends TaskSummary {
  plan: PlanStep[];
  result: TaskReport | null;
  verification: Verification | null;
  error: string | null;
  pending_request: UserRequest | null;
}

export interface TaskStats {
  total: number;
  running: number;
  completed: number;
  needs_attention: number;
}
