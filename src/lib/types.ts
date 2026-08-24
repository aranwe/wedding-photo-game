export interface Team {
  id: string;
  name: string;
  created_at: string;
}

export interface Player {
  id: string;
  name: string;
  team_id: string | null;
  solo: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  title_cs: string;
  sort_order: number;
  active: boolean;
}

export interface Submission {
  id: string;
  task_id: string;
  player_id: string;
  team_id: string | null;
  image_key: string;
  title: string;
  created_at: string;
}

export interface ThemeConfig {
  primary: string;
  secondary: string;
}

export interface EventConfig {
  partner1: string;
  and: string;
  partner2: string;
  subtitle: string;
}

/** Completion + viewing state for the wheel picker. */
export type TaskState = "completed" | "in-progress" | "free";
