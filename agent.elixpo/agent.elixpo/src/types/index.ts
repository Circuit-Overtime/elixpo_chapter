export interface SessionMeta {
  id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  trigger: "github_webhook" | "cli" | "web_dashboard";
  repo_full_name: string | null;
  issue_number: number | null;
  pr_number: number | null;
  user_id: string | null;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  current_step: number;
  result_pr_url: string | null;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface SessionDetail extends SessionMeta {
  workspace_path: string;
  plan: string | null;
  max_steps: number;
  messages: Message[];
  token_usage: TokenUsage;
}

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface AgentEvent {
  type: string;
  [key: string]: unknown;
}
