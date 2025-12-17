import { useState, useEffect } from "react";

import {
  Container,
  Card,
  Tabs,
  Tab,
  Form,
  Button,
  Alert,
  Spinner,
  Table,
  Badge
} from "react-bootstrap";
import { useBioLock } from "../services/bioLockContext";
import { useAuth } from "../services/useAuth";
import QueryBuilderPage from "./QueryBuilderPage";
import DebugConsole from "./DebugConsole";
import { 
  BsShieldLock, 
  BsDatabase, 
  BsFiletypeSql, 
  BsPeople,
  BsBank,
  BsLayersHalf,
  BsLayers,
  BsFlag,
  BsBucket,
  BsGraphUp,
  BsFileEarmarkText,
  BsSliders,
} from "react-icons/bs";
import { VscDebugLineByLine } from "react-icons/vsc";
import { FaCloud, FaHistory, FaDownload, FaUpload, FaTrash, FaExclamationTriangle } from "react-icons/fa";

import { historyService, HistoryGroup } from "../services/historyService";
import { createBackup, listBackups, restoreBackup, deleteFile, DriveFile } from "../services/googleDrive";
import { initializeDatabase, CURRENT_DB_VERSION } from "../services/db";
import { exportDataFromIndexedDB } from "../services/driveSync";
import { logError } from "../services/logger";

// Configuration Pages Imports
import HoldersPage from './HoldersPage';
import AccountsPage from './AccountsPage';
import AssetClassesPage from './AssetClassesPage';
import AssetSubClassesPage from './AssetSubClassesPage';
import AssetPurposePage from './AssetPurposePage';
import BucketsPage from './BucketsPage';
import SipTypesPage from './SipTypesPage';
import LoanTypesPage from './LoanTypesPage';
import SystemPropertiesPage from './SystemPropertiesPage';

function DataManagementTab() {
  const [key, setKey] = useState("cloud");
  const { user, handleSignIn } = useAuth();
  
  // Cloud State
  const [backups, setBackups] = useState<DriveFile[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [cloudMsg, setCloudMsg] = useState<{ type: string, text: string } | null>(null);

  // Local History State
  const [undoStack, setUndoStack] = useState<HistoryGroup[]>([]);

  useEffect(() => {
    refreshHistory();
    // Subscribe to history changes
    const unsub = historyService.subscribe(refreshHistory);
    return unsub;
  }, []);

  useEffect(() => {
    if (user && key === "cloud") {
      fetchBackups();
    }
  }, [user, key]);

  const refreshHistory = () => {
    setUndoStack([...historyService.getUndoStack()].reverse()); // Show newest first
  };

  const fetchBackups = async () => {
    setLoadingCloud(true);
    try {
      const files = await listBackups();
      setBackups(files);
      setCloudMsg(null);
    } catch (error) {
      setCloudMsg({ type: "danger", text: "Failed to load backups." });
    } finally {
      setLoadingCloud(false);
    }
  };

  const handleCreateBackup = async () => {
    setLoadingCloud(true);
    try {
      const data = await exportDataFromIndexedDB();

      // Check against latest backup if exists
      if (backups.length > 0) {
          try {
              const latest = backups[0];
              // We must fetch the content to compare. This might be heavy but ensures accuracy.
              const lastData = await restoreBackup(latest.id);
              
              if (JSON.stringify(data) === JSON.stringify(lastData)) {
                  setCloudMsg({ type: "info", text: "No changes detected. Backup skipped." });
                  setLoadingCloud(false);
                  return;
              }
          } catch (e) {
              // specific error for comparison fail shouldn't block new backup
              console.warn("Could not compare with latest backup, proceeding...", e);
          }
      }

      await createBackup(data);
      await fetchBackups();
      setCloudMsg({ type: "success", text: "Backup created successfully!" });
    } catch (error) {
      logError("Backup failed", {error});
      setCloudMsg({ type: "danger", text: "Failed to create backup." });
    } finally {
      if (loadingCloud) setLoadingCloud(false); // Safety check if returned early
    }
  };

  const handleRestore = async (file: DriveFile) => {
    if (!window.confirm("WARNING: resultoring will REPLACE all current data. Continue?")) return;

    setRestoring(true);
    try {
      const data = await restoreBackup(file.id);
      
      // Version Check
      if (!data.version || data.version < CURRENT_DB_VERSION) {
         if (!data.version) {
             throw new Error("Invalid backup file: Missing version.");
         }
      }

      await initializeDatabase(data);
      setCloudMsg({ type: "success", text: `Restored: ${file.name}` });
      setTimeout(() => window.location.reload(), 1500);

    } catch (error) {
      logError("Restore failed", {error});
      setCloudMsg({ type: "danger", text: `Restore failed: ${(error as Error).message}` });
      setRestoring(false);
    }
  };

  const handleDownload = async (file: DriveFile) => {
    setDownloading(file.id);
    try {
      // Re-using restoreBackup to fetch the JSON content
      const data = await restoreBackup(file.id);
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name; // Use the actual backup filename
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
       logError("Download failed", {error});
       setCloudMsg({ type: "danger", text: "Failed to download backup." });
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!window.confirm("Delete this backup?")) return;
    setLoadingCloud(true);
    try {
      await deleteFile(fileId);
      await fetchBackups(); 
    } catch (error) {
      setCloudMsg({ type: "danger", text: "Failed to delete backup." });
    } finally {
      setLoadingCloud(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm("Clear all session history? This cannot be undone.")) {
        historyService.clear();
        setUndoStack([]); // Force update
    }
  };

  // Helper to describe history items
  const renderHistoryRow = (group: HistoryGroup, idx: number) => {
      const firstOp = group[0];
      const count = group.length;
      
      let action = "Unknown";
      if (firstOp.type === "delete") action = "Created"; 
      if (firstOp.type === "add") action = "Deleted";
      if (firstOp.type === "update") action = "Updated"; 

      return (
          <tr key={idx}>
              <td><Badge bg="secondary">{action}</Badge></td>
              <td>{firstOp.table}</td>
              <td>{count > 1 ? `${count} records` : `ID: ${firstOp.key}`}</td>
          </tr>
      );
  };

  return (
    <Card>
      <Card.Header>Backup & Data Management</Card.Header>
      <Card.Body>
       <Tabs
        id="backup-tabs"
        activeKey={key}
        onSelect={(k) => setKey(k || "cloud")}
        className="mb-3"
      >
        <Tab eventKey="cloud" title={<span><FaCloud className="me-2"/>Cloud Backups</span>}>
           <div className="p-2">
               {!user ? (
                   <Alert variant="warning">
                       <FaExclamationTriangle className="me-2"/>
                       Please <Button variant="link" className="p-0 align-baseline" onClick={handleSignIn}>sign in</Button> to manage Cloud Backups.
                   </Alert>
               ) : (
                   <>
                       <div className="d-flex justify-content-between align-items-center mb-3">
                           <h5>Google Drive Backups</h5>
                           <Button variant="primary" onClick={handleCreateBackup} disabled={loadingCloud}>
                               {loadingCloud ? <Spinner size="sm" animation="border"/> : <FaUpload className="me-2"/>}
                               Create New Backup
                           </Button>
                       </div>

                       {cloudMsg && <Alert variant={cloudMsg.type}>{cloudMsg.text}</Alert>}

                       {backups.length === 0 && !loadingCloud ? (
                           <p className="text-muted text-center py-4">No backups found.</p>
                       ) : (
                           <Table hover responsive>
                               <thead>
                                   <tr>
                                       <th>Created</th>
                                       <th>Filename</th>
                                       <th className="text-end">Actions</th>
                                   </tr>
                               </thead>
                               <tbody>
                                   {backups.map(file => (
                                       <tr key={file.id}>
                                           <td>{new Date(file.createdTime || "").toLocaleString()}</td>
                                           <td>{file.name}</td>
                                           <td className="text-end">
                                               <Button 
                                                   variant="outline-primary" 
                                                   size="sm"
                                                   className="me-2"
                                                   onClick={() => handleDownload(file)}
                                                   disabled={downloading === file.id}
                                                   title="Download Backup"
                                               >
                                                   {downloading === file.id ? <Spinner size="sm" animation="border"/> : <FaDownload/>}
                                               </Button>
                                               <Button 
                                                   variant="outline-success" 
                                                   size="sm" 
                                                   className="me-2"
                                                   onClick={() => handleRestore(file)}
                                                   disabled={restoring}
                                                   title="Restore Backup"
                                               >
                                                   {restoring ? "Restoring..." : "Restore"}
                                               </Button>
                                               <Button 
                                                   variant="outline-danger" 
                                                   size="sm"
                                                   onClick={() => handleDelete(file.id)}
                                                   title="Delete Backup"
                                               >
                                                   <FaTrash/>
                                               </Button>
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                           </Table>
                       )}
                   </>
               )}
           </div>
        </Tab>
        
        <Tab eventKey="history" title={<span><FaHistory className="me-2"/>Session History</span>}>
            <div className="p-2">
                <div className="d-flex justify-content-between mb-3 align-items-center">
                     <div>
                        <h5>Recent Actions (Undo Stack)</h5>
                        <small className="text-muted">History is local to this session.</small>
                     </div>
                     <Button variant="outline-danger" size="sm" onClick={handleClearHistory} disabled={undoStack.length === 0}>
                        Clear History
                     </Button>
                </div>
                {undoStack.length === 0 ? (
                    <p className="text-muted">No history available.</p>
                ) : (
                    <Table striped hover size="sm">
                        <thead>
                            <tr>
                                <th>Action</th>
                                <th>Table</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {undoStack.map((group, i) => renderHistoryRow(group, i))}
                        </tbody>
                    </Table>
                )}
            </div>
        </Tab>
      </Tabs>
      </Card.Body>
    </Card>
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
          eventKey="family" 
          title={<><BsPeople className="me-2"/>Family</>}
        >
          <HoldersPage />
        </Tab>
        <Tab 
          eventKey="accounts" 
          title={<><BsBank className="me-2"/>Accounts</>}
        >
          <AccountsPage />
        </Tab>
        <Tab 
          eventKey="buckets" 
          title={<><BsBucket className="me-2"/>Buckets</>}
        >
          <BucketsPage />
        </Tab>
        <Tab 
          eventKey="asset-classes" 
          title={<><BsLayersHalf className="me-2"/>Types</>}
        >
          <AssetClassesPage />
        </Tab>
        <Tab 
          eventKey="asset-sub-classes" 
          title={<><BsLayers className="me-2"/>Sub-Types</>}
        >
          <AssetSubClassesPage />
        </Tab>
        <Tab 
          eventKey="asset-purpose" 
          title={<><BsFlag className="me-2"/>Purpose</>}
        >
          <AssetPurposePage />
        </Tab>
         <Tab 
          eventKey="sip-types" 
          title={<><BsGraphUp className="me-2"/>SIP Types</>}
        >
          <SipTypesPage />
        </Tab>
        <Tab 
          eventKey="loan-types" 
          title={<><BsFileEarmarkText className="me-2"/>Loan Types</>}
        >
          <LoanTypesPage />
        </Tab>
        <Tab 
          eventKey="system-properties" 
          title={<><BsSliders className="me-2"/>System</>}
        >
          <SystemPropertiesPage />
        </Tab>

        <Tab 
          eventKey="data" 
          title={<><BsDatabase className="me-2"/>Data</>}
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
          title={<><VscDebugLineByLine className="me-2"/>Logs</>}
        >
            <DebugConsole />
        </Tab>
      </Tabs>
    </Container>
  );
}
