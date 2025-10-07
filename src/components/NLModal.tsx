// components/NLModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Modal, Button, Form, ListGroup, Spinner } from "react-bootstrap";
import { ActionCandidate, NLCrud } from "../lib/nlCrud";
import { db } from "../services/db";

const nl = new NLCrud();

type NLModalProps = {
  show: boolean;
  setShow: (show: boolean) => void;
};

export default function NLModal({ show, setShow }: NLModalProps) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{ me?: boolean; text: string }[]>(
    []
  );
  const [candidates, setCandidates] = useState<ActionCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [schemaLoaded, setSchemaLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const json = await loadJsonFromDrive();
        console.log("Loaded JSON from drive", json);
        await nl.loadSchema(json);
        setSchemaLoaded(true);
        setMessages([{ text: "Schema loaded. Ask me to read/update data." }]);
      } catch (e: unknown) {
        setMessages([
          { text: "Failed to load schema: " + (e as Error).message },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadJsonFromDrive = async () => {
    try {
      const data = {
        configs: await db.configs.toArray(),
        assetPurpose: await db.assetPurposes.toArray(),
        loanType: await db.loanTypes.toArray(),
        holders: await db.holders.toArray(),
        sipTypes: await db.sipTypes.toArray(),
        buckets: await db.buckets.toArray(),
        assetClasses: await db.assetClasses.toArray(),
        assetSubClasses: await db.assetSubClasses.toArray(),
        goals: await db.goals.toArray(),
        accounts: await db.accounts.toArray(),
        income: await db.income.toArray(),
        cashFlow: await db.cashFlow.toArray(),
        assetsHoldings: await db.assetsHoldings.toArray(),
        liabilities: await db.liabilities.toArray(),
      };

      setMessages([{ text: "Data exported successfully!" }]);
      return data;
    } catch (error) {
      setMessages([
        {
          text: "Failed to export data: " + (error as Error).message,
        },
      ]);
      return {};
    }
  };

  const saveJsonToDrive = async (jsonData: unknown) => {
    try {
      //const jsonData = JSON.parse(e.target?.result as string);
      //await initializeDatabase(jsonData);
      console.log("Saving to drive", jsonData);
      setMessages([
        {
          text: "Data imported successfully!",
        },
      ]);
    } catch (error) {
      setMessages([
        {
          text: "Failed to import data: " + (error as Error).message,
        },
      ]);
    }
  };

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setMessages((m) => [...m, { me: true, text: query }]);
    setLoading(true);
    try {
      const c = await nl.proposeActions(query);
      setCandidates(c);
      setMessages((m) => [
        ...m,
        { text: `Found ${c.length} possible action(s).` },
      ]);
    } catch (err: unknown) {
      setMessages((m) => [...m, { text: "Error: " + (err as Error).message }]);
    } finally {
      setQuery("");
      setLoading(false);
    }
  };

  const onConfirm = async (action: ActionCandidate) => {
    setLoading(true);
    try {
      const result = nl.executeAction(action);
      setMessages((m) => [
        ...m,
        { text: `✅ Executed: ${action.humanReadable}` },
        { text: JSON.stringify(result, null, 2) },
      ]);
      await saveJsonToDrive(nl.currentSchema);
      setMessages((m) => [...m, { text: "📁 Saved to Drive." }]);
    } catch (err: unknown) {
      setMessages((m) => [
        ...m,
        { text: "❌ Failed: " + (err as Error).message },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={() => setShow(false)} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Natural Language Assistant (⚠️ Experimental)</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div style={{ maxHeight: "50vh", overflowY: "auto" }} className="mb-3">
          <ListGroup variant="flush">
            {messages.map((m, idx) => (
              <ListGroup.Item
                key={idx}
                className={m.me ? "text-end bg-dark text-white" : ""}
              >
                <pre className="m-0" style={{ whiteSpace: "pre-wrap" }}>
                  {m.text}
                </pre>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </div>

        <Form onSubmit={onSubmit}>
          <Form.Control
            placeholder="e.g., Show accounts for Swapnil"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading || !schemaLoaded}
          />
          <div className="d-flex justify-content-between align-items-center mt-2">
            <small className="text-muted">
              Tip: Try “Show accounts for Swapnil” or “Update Swapnil's account
              number to 9999”.
            </small>
            <div>
              <Button
                variant="secondary"
                className="me-2"
                onClick={() =>
                  nl
                    .retrain()
                    .then(() =>
                      setMessages((m) => [
                        ...m,
                        { text: "🔁 Retrained index from schema." },
                      ])
                    )
                }
              >
                Retrain
              </Button>
              <Button type="submit" disabled={!schemaLoaded || loading}>
                {loading ? <Spinner size="sm" animation="border" /> : "Ask"}
              </Button>
            </div>
          </div>
        </Form>

        {candidates.length > 0 && (
          <>
            <hr />
            <h6>Suggested Actions</h6>
            <ListGroup>
              {candidates.map((c, i) => (
                <ListGroup.Item
                  key={i}
                  className="d-flex justify-content-between align-items-center"
                >
                  <div>
                    <div className="fw-bold text-truncate">
                      {c.humanReadable || `${c.type} ${c.collection}`}
                    </div>
                    <div className="small text-muted">
                      score: {Number(c.score).toFixed(2)}
                      {c.resolvedFrom &&
                        ` • from ${c.resolvedFrom.collection}.${c.resolvedFrom.field}=${c.resolvedFrom.value}`}
                    </div>
                  </div>
                  <div>
                    <Button
                      size="sm"
                      variant="outline-primary"
                      className="me-2"
                      onClick={() =>
                        setMessages((m) => [
                          ...m,
                          { text: `Preview: ${c.humanReadable}` },
                          {
                            text: JSON.stringify(nl.executeAction(c), null, 2),
                          },
                        ])
                      }
                    >
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onConfirm(c)}
                    >
                      Confirm
                    </Button>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShow(false)}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
