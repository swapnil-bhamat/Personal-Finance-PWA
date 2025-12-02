import { useState, useEffect } from "react";
import { resetDatabase, db, initializeDatabase } from "../services/db";
import type { Config } from "../services/db";
import {
  Container,
  Card,
  Button,
  Alert,
  Form,
  Tabs,
  Tab,
  Row,
  Col,
  Spinner,
} from "react-bootstrap";
import { logError, logInfo } from "../services/logger";
import { useBioLock } from "../services/bioLockContext";
import { useLiveQuery } from "dexie-react-hooks";
import FormModal from "../components/FormModal";
import BasePage from "../components/BasePage";
import {
  initializeGoogleDrive,
  signInWithGoogleDrive,
  listFiles,
  readFile,
  deleteFile,
  uploadJsonFile,
  type DriveFile,
} from "../services/googleDrive";
import QueryBuilderPage from "./QueryBuilderPage";
import DebugConsole from "./DebugConsole";
import { BsShieldLock, BsDatabase, BsSliders, BsFiletypeSql } from "react-icons/bs";
import { VscDebugLineByLine } from "react-icons/vsc";

// --- Configs Component ---
interface ConfigFormProps {
  show: boolean;
  onHide: () => void;
  item?: Config;
  onSave: (config: Config | Partial<Config>) => Promise<void>;
}

function ConfigForm({ onHide, show, item, onSave }: ConfigFormProps) {
  const [formData, setFormData] = useState({
    key: item?.key ?? "",
    value:
      typeof item?.value === "string"
        ? item.value
        : JSON.stringify(item?.value) ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!formData.key.trim() || !formData.value.trim()) {
        throw new Error("Key and value are required");
      }

      setIsSubmitting(true);

      // Try to parse the value as JSON if it looks like a JSON string
      let parsedValue: string | number | boolean | Record<string, unknown> =
        formData.value;
      if (formData.value.trim().match(/^[{["]/)) {
        try {
          parsedValue = JSON.parse(formData.value);
        } catch {
          // If it's not valid JSON, use it as is
          logInfo("Value is not valid JSON, using as string");
        }
      } else if (formData.value === "true" || formData.value === "false") {
        parsedValue = formData.value === "true";
      } else if (!isNaN(Number(formData.value))) {
        parsedValue = Number(formData.value);
      }

      await onSave({
        ...(item ?? {}),
        key: formData.key,
        value: parsedValue,
      });
    } catch (err) {
      logError("Form submission error:", { err });
      setError(
        err instanceof Error ? err.message : "An error occurred while saving"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? "Edit Config" : "Add Config"}
      isValid={!!formData.key && !!formData.value && !error}
    >
      <Form.Group className="mb-3" controlId="formConfigKey">
        <Form.Label>Key</Form.Label>
        <Form.Control
          type="text"
          value={formData.key}
          autoFocus
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setError(null);
            setFormData({ ...formData, key: e.target.value });
          }}
          required
          disabled={isSubmitting}
          isInvalid={!!error}
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formConfigValue">
        <Form.Label>Value</Form.Label>
        <Form.Control
          as="textarea"
          rows={4}
          value={formData.value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setError(null);
            setFormData({ ...formData, value: e.target.value });
          }}
          required
          disabled={isSubmitting}
          isInvalid={!!error}
        />
        <Form.Text className={error ? "text-danger" : "text-body-secondary"}>
          {error || "For objects or arrays, use valid JSON format"}
        </Form.Text>
      </Form.Group>
    </FormModal>
  );
}

function ConfigsTab() {
  const configs = useLiveQuery(() => db.configs.toArray()) || [];
  const handleAdd = async (config: Partial<Config>) => {
    try {
      if (!config.key || config.value === undefined || config.value === "") {
        throw new Error("Key and value are required");
      }

      const newConfig = {
        key: config.key,
        value: config.value,
      } as Config;

      const id = await db.configs.add(newConfig);
      if (!id) throw new Error("Failed to add config");

      logInfo("Added config:", { ...newConfig, id });
    } catch (error) {
      logError("Error adding config:", { error });
      throw error;
    }
  };

  const handleEdit = async (config: Config) => {
    try {
      if (!config.id) {
        throw new Error("Config ID is required for editing");
      }
      if (!config.key || config.value === undefined || config.value === "") {
        throw new Error("Key and value are required");
      }

      const updated = await db.configs.update(config.id, {
        key: config.key,
        value: config.value,
      });

      if (!updated) throw new Error("Failed to update config");

      logInfo("Updated config:", config);
    } catch (error) {
      logError("Error updating config:", { error });
      throw error;
    }
  };

  const handleDelete = async (config: Config) => {
    try {
      if (!config.id) {
        throw new Error("Config ID is required for deletion");
      }
      await db.configs.delete(config.id);
      logInfo("Deleted config:", config);
    } catch (error) {
      logError("Error deleting config:", { error });
      throw error;
    }
  };

  return (
    <BasePage<Config>
      title="Configurations"
      data={configs}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      columns={[
        { field: "key", headerName: "Key" },
        {
          field: "value",
          headerName: "Value",
          renderCell: (item) => JSON.stringify(item.value),
        },
      ]}
      FormComponent={ConfigForm}
    />
  );
}

// --- Data Management Component ---
function DataManagementTab() {
  // Local Import/Export State
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Google Drive State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);

  // Initialize Google Drive
  useEffect(() => {
    initializeGoogleDrive();
  }, []);

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

  // --- Google Drive Handlers ---
  const handleSignIn = async () => {
    try {
      await signInWithGoogleDrive();
      setIsAuthenticated(true);
      refreshFiles();
    } catch (error) {
      logError("Sign in failed:", { error });
    }
  };

  const refreshFiles = async () => {
    setLoading(true);
    try {
      const files = await listFiles();
      setFiles(files);
    } catch (error) {
      logError("Failed to list files:", { error });
    }
    setLoading(false);
  };

  const handleReadFile = async (fileId: string) => {
    try {
      const content = await readFile(fileId);
      alert("File content:\n" + JSON.stringify(content, null, 2));
    } catch (error) {
      logError("Failed to read file:", { error });
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await deleteFile(fileId);
      refreshFiles();
    } catch (error) {
      logError("Failed to delete file:", { error });
    }
  };

  const handleUploadLocalJson = async () => {
    try {
      // Upload current DB state
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
      
      const result = await uploadJsonFile(data);
      alert(`File saved to Drive! ID: ${result.id}, Name: ${result.name}`);

      refreshFiles();
    } catch (error) {
      logError("Upload failed:", { error });
      alert("Failed to upload file. Please try again.");
    }
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

      {/* Google Drive Section */}
      <Card>
        <Card.Header>Google Drive Backup</Card.Header>
        <Card.Body>
          <Row className="mb-3">
            <Col>
              {!isAuthenticated ? (
                <Button onClick={handleSignIn}>Sign in with Google</Button>
              ) : (
                <div className="d-flex gap-2 flex-wrap">
                  <Button onClick={refreshFiles} variant="outline-primary">
                    Refresh Files
                  </Button>
                  <Button variant="success" onClick={handleUploadLocalJson}>
                    Upload Current Data to Drive
                  </Button>
                </div>
              )}
            </Col>
          </Row>

          {loading && <Spinner animation="border" className="mb-3" />}

          <Row>
            {files.map((file) => (
              <Col md={6} lg={4} key={file.id} className="mb-3">
                <Card className="h-100">
                  <Card.Body>
                    <Card.Title className="h6 text-truncate" title={file.name}>{file.name}</Card.Title>
                    <div className="d-flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={() => handleReadFile(file.id)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => handleDeleteFile(file.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
            {isAuthenticated && files.length === 0 && !loading && (
                <Col>
                    <p className="text-muted">No backup files found in Drive.</p>
                </Col>
            )}
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
}

// --- Main Settings Page ---
export default function SettingsPage() {
  const { isEnabled, isSupported, register, disable } = useBioLock();
  const [isResetting, setIsResetting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    if (
      window.confirm(
        "Are you sure you want to reset the database? This will remove all your data and restore default values."
      )
    ) {
      try {
        setIsResetting(true);
        setError(null);
        await resetDatabase();
        setShowSuccess(true);
        // Force page reload after reset
        window.location.reload();
      } catch (err) {
        logError("Reset failed:", { err });
        setError(err instanceof Error ? err.message : "Reset failed");
      } finally {
        setIsResetting(false);
      }
    }
  };


  return (
    <Container fluid className="py-4 overflow-auto h-100">
      <h2 className="mb-4">Settings</h2>
      
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

          <Card className="mb-4 border-danger">
            <Card.Header className="bg-danger text-white">
              Danger Zone
            </Card.Header>
            <Card.Body style={{ backgroundColor: "rgba(255, 0, 0, 0.05)" }}>
              <h5>Reset Database to Default Values?</h5>
              <p className="text-body-secondary">
                This will delete all your current data and restore the default
                values. This action cannot be undone.
              </p>
              <Button
                variant="outline-danger"
                onClick={handleReset}
                disabled={isResetting}
              >
                {isResetting ? "Resetting..." : "Reset Database"}
              </Button>
            </Card.Body>
          </Card>
          {showSuccess && (
            <Alert
              variant="success"
              dismissible
              onClose={() => setShowSuccess(false)}
            >
              Database reset successfully
            </Alert>
          )}
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Tab>

        <Tab 
          eventKey="data" 
          title={<><BsDatabase className="me-2"/>Data Management</>}
        >
            <DataManagementTab />
        </Tab>

        <Tab 
          eventKey="configs" 
          title={<><BsSliders className="me-2"/>System Properties</>}
        >
            <ConfigsTab />
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
