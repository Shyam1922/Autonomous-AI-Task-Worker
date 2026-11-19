export type TaskEventType =
  | "task_created"
  | "task_started"
  | "agent_thought"
  | "plan_updated"
  | "tool_called"
  | "tool_result"
  | "tool_failed"
  | "policy_denied"
  | "approval_requested"
  | "approval_granted"
  | "approval_rejected"
  | "input_requested"
  | "user_input"
  | "verification_started"
  | "verification_finished"
  | "task_finished";

export interface TaskEvent {
  id: number;
  type: TaskEventType | string;
  message: string;
  data: Record<string, unknown>;
  created_at: string;
}

export interface UserRequest {
  id: string;
  kind: "approval" | "input";
  status: "pending" | "approved" | "rejected" | "answered" | "cancelled";
  tool_name: string;
  tool_input: Record<string, unknown>;
  prompt: string;
  response: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface VerificationCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface Verification {
  status: "passed" | "failed" | "inconclusive";
  checks: VerificationCheck[];
}

export interface FinanceRecord {
  record_id: string;
  vendor: string;
  invoice_number: string;
  amount: string;
  currency: string;
  due_date: string;
  source_document: string | null;
  created_by_task_id: string | null;
  created_at: string | null;
}

export interface DemoDocument {
  path: string;
  document_type: string;
  vendor: string | null;
  reference: string | null;
  document_date: string | null;
}

export interface RuntimeConfig {
  app_env: string;
  llm_provider: "claude" | "mock";
  llm_model: string;
  llm_effort: string;
  max_steps_per_task: number;
  max_retries_per_step: number;
  tool_timeout_seconds: number;
  require_approval_for_writes: boolean;
}
