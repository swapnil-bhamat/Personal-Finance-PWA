// src/services/logger.ts

type LogEntry = {
  timestamp: string;
  level: "info" | "error" | "warn";
  message: string;
  metadata?: Record<string, unknown>;
};

let logs: LogEntry[] = [];

export function logInfo(message: string, metadata: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toLocaleString(),
    level: "info",
    message,
    metadata,
  };
  logs.push(entry);
  console.log("[INFO]", message, metadata);
}

export function logError(message: string, metadata: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toLocaleString(),
    level: "error",
    message,
    metadata,
  };
  logs.push(entry);
  console.error("[ERROR]", message, metadata);
}

export function logWarn(message: string, metadata: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toLocaleString(),
    level: "warn",
    message,
    metadata,
  };
  logs.push(entry);
  console.warn("[WARN]", message, metadata);
}

export function getLogs() {
  return logs;
}

export function clearLogs() {
  logs = [];
}
