export interface ServerConfig {
  host: string;
  port: number;
  ollamaUrl: string;
  ollamaModel: string;
  timeoutMs: number;
  workTimeoutMs: number;
}

function readInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

export function getServerConfig(environment: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    host: '127.0.0.1',
    port: readInteger(environment.AI_OFFICE_API_PORT, 8787, 1024, 65535),
    ollamaUrl: environment.OLLAMA_CHAT_URL?.trim() || 'http://127.0.0.1:11434/api/chat',
    ollamaModel: environment.OLLAMA_MODEL?.trim() || 'qwen2.5:3b',
    timeoutMs: readInteger(environment.OLLAMA_TIMEOUT_MS, 30_000, 1_000, 120_000),
    workTimeoutMs: readInteger(environment.WORK_TIMEOUT_MS, 90_000, 5_000, 300_000),
  };
}
