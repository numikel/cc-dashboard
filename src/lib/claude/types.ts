export interface ClaudeUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export interface ClaudeTranscriptLine {
  type?: string;
  timestamp?: string;
  sessionId?: string;
  session_id?: string;
  cwd?: string;
  gitBranch?: string;
  isSidechain?: boolean;
  isApiErrorMessage?: boolean;
  model?: string | { id?: string; display_name?: string };
  message?: {
    model?: string;
    stop_reason?: string | null;
    usage?: ClaudeUsage;
    content?: unknown;
  };
}

export interface ParsedSession {
  id: string;
  projectPath: string;
  projectName: string;
  sourceFile: string;
  model: string | null;
  models: string[];
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
  contextLength: number;
  messageCount: number;
  toolCalls: number;
  gitBranch: string | null;
  cwd: string | null;
}

export interface ScannedFile {
  path: string;
  mtimeMs: number;
  sizeBytes: number;
}

export interface ActiveSession {
  id: string;
  name: string | null;
  status: string | null;
  pid: number | null;
  cwd: string | null;
  updatedAt: string | null;
  sourceFile: string;
}
