// src/components/DebugConsole.tsx
import React, { useState } from "react";
import { Container, Card, Button } from "react-bootstrap";
import { getLogs, clearLogs } from "../services/logger";

const DebugConsole: React.FC = () => {
  const [logs, setLogs] = useState(getLogs());

  const refreshLogs = () => setLogs([...getLogs()]);
  const handleClear = () => {
    clearLogs();
    setLogs([]);
  };

  return (
    <Container fluid className="py-4 h-100 overflow-auto">
      <Card className="mb-4">
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <strong>Debug Console</strong>
            <div className="d-flex gap-2">
              <Button size="sm" variant="secondary" onClick={refreshLogs}>
                Refresh
              </Button>
              <Button size="sm" variant="danger" onClick={handleClear}>
                Clear
              </Button>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          <div
            className="p-2 rounded"
            style={{
              maxHeight: "300px",
              overflowY: "auto",
              fontSize: "0.85rem",
            }}
          >
            {logs.length === 0 && <div>No logs yet</div>}
            {logs.map((log, idx) => (
              <div key={idx}>
                <span className="text-muted">[{log.timestamp}]</span>{" "}
                <span
                  className={`text-${
                    log.level === "error"
                      ? "danger"
                      : log.level === "warn"
                      ? "warning"
                      : "info"
                  }`}
                >
                  {log.level.toUpperCase()}
                </span>{" "}
                {log.message.join(" ")}
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default DebugConsole;
