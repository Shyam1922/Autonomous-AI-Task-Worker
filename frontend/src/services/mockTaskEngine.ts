
export type TaskStatus =
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "failed";

export interface Task {
  id: string;
  description: string;
  status: TaskStatus;
  currentStep: number;
  createdAt: string;
}

export const executionSteps = [
  "Understanding user request",
  "Generating execution plan",
  "Searching relevant resources",
  "Extracting information",
  "Verifying results",
  "Preparing final response",
];

const STORAGE_KEY = "taskpilot_demo_tasks";

export function getTasks(): Task[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Task[]) : [];
  } catch {
    return [];
  }
}

export function saveTask(task: Task): void {
  const tasks = getTasks();
  const index = tasks.findIndex((item) => item.id === task.id);

  if (index === -1) {
    tasks.unshift(task);
  } else {
    tasks[index] = task;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function getTask(id: string): Task | undefined {
  return getTasks().find((task) => task.id === id);
}

export function createTask(description: string): Task {
  const task: Task = {
    id: crypto.randomUUID(),
    description,
    status: "queued",
    currentStep: 0,
    createdAt: new Date().toISOString(),
  };

  saveTask(task);
  return task;
}

export function updateTask(
  id: string,
  updates: Partial<Task>
): Task | undefined {
  const task = getTask(id);

  if (!task) return undefined;

  const updated = { ...task, ...updates };
  saveTask(updated);

  return updated;
}
