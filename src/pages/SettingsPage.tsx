import { useState } from "react";
import { db, initializeDatabase } from "../services/db";

import {
  Container,
  Card,
  Button,
  Alert,
  Form,
  Tabs,
  Tab,
} from "react-bootstrap";
import { useBioLock } from "../services/bioLockContext";
import QueryBuilderPage from "./QueryBuilderPage";
import DebugConsole from "./DebugConsole";
import { BsShieldLock, BsDatabase, BsFiletypeSql } from "react-icons/bs";
import { VscDebugLineByLine } from "react-icons/vsc";

function DataManagementTab() {
  // Local Import/Export State
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);


  // --- Local Export/Import Handlers ---
  const handleExport = async () => {
    try {
      const data = {
        version: db.verno,
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
        assetsProjection: await db.assetsProjection.toArray(),
        liabilitiesProjection: await db.liabilitiesProjection.toArray(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "finance-data.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: "success", text: "Data exported successfully!" });
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to export data: " + (error as Error).message,
      });
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        await initializeDatabase(jsonData);
        setMessage({ type: "success", text: "Data imported successfully!" });
      } catch (error) {
        setMessage({
          type: "error",
          text: "Failed to import data: " + (error as Error).message,
        });
      }
    };
    reader.readAsText(file);
  };


  return (
    <div className="d-flex flex-column gap-4">
      {/* Local Backup Section */}
      <Card>
        <Card.Header>Local Backup & Restore</Card.Header>
        <Card.Body>
          <p className="text-body-secondary">
            Export your current data for backup, or import a previously exported
            file to restore your data.
            <br />
            <strong>Note:</strong> Importing will replace all existing data in
            the application.
          </p>
          <div className="d-flex gap-2 mb-3 flex-wrap">
            <Button variant="outline-primary" onClick={handleExport}>
              Export to File
            </Button>
            <Button variant="outline-secondary" as="label">
              Import from File
              <input
                type="file"
                hidden
                accept=".json"
                onChange={handleImport}
              />
            </Button>
          </div>
          {message && (
            <Alert variant={message.type} className="mb-0" dismissible onClose={() => setMessage(null)}>
              {message.text}
            </Alert>
          )}
        </Card.Body>
      </Card>

    </div>
  );
}

// --- Main Settings Page ---
export default function SettingsPage() {
  const { isEnabled, isSupported, register, disable } = useBioLock();


  return (
    <Container fluid className="py-4 overflow-auto h-100">
      <Tabs
        defaultActiveKey="general"
        id="settings-tabs"
        className="mb-4 scrollable-tabs"
        fill
      >
        <Tab 
          eventKey="general" 
          title={<><BsShieldLock className="me-2"/>General</>}
        >
          <Card className="mb-4">
            <Card.Header>Security</Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-1">Biometric Lock</h5>
                  <p className="text-muted mb-0">
                    Require fingerprint or face ID to access the app.
                  </p>
                  {!isSupported && (
                    <small className="text-danger">
                      Biometric authentication is not supported on this device.
                    </small>
                  )}
                </div>
                <Form.Check
                  type="switch"
                  id="bio-lock-switch"
                  label={isEnabled ? "Enabled" : "Disabled"}
                  checked={isEnabled}
                  disabled={!isSupported}
                  onChange={async (e) => {
                    if (e.target.checked) {
                      const success = await register();
                      if (!success) {
                        alert("Failed to register biometric credential.");
                      }
                    } else {
                      disable();
                    }
                  }}
                />
              </div>
            </Card.Body>
          </Card>

        </Tab>

        <Tab 
          eventKey="data" 
          title={<><BsDatabase className="me-2"/>Data Management</>}
        >
            <DataManagementTab />
        </Tab>
        <Tab 
          eventKey="query-builder" 
          title={<><BsFiletypeSql className="me-2"/>Query Builder</>}
        >
            <QueryBuilderPage />
        </Tab>

        <Tab 
          eventKey="debug" 
          title={<><VscDebugLineByLine className="me-2"/>DB Logs</>}
        >
            <DebugConsole />
        </Tab>
      </Tabs>
    </Container>
  );
}
