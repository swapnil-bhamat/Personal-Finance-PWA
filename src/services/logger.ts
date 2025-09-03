// src/services/logger.ts

type LogEntry = {
  timestamp: string;
  level: "info" | "error" | "warn";
  message: unknown[];
};

let logs: LogEntry[] = [];

export function logInfo(...message: unknown[]) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: "info",
    message,
  };
  logs.push(entry);
  console.log("[INFO]", ...message);
}

export function logError(...message: unknown[]) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: "error",
    message,
  };
  logs.push(entry);
  console.error("[ERROR]", ...message);
}

export function logWarn(...message: unknown[]) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: "warn",
    message,
  };
  logs.push(entry);
  console.warn("[WARN]", ...message);
}

export function getLogs() {
  return logs;
}

export function clearLogs() {
  logs = [];
}
