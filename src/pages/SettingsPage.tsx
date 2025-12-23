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
  BsDisplay
} from "react-icons/bs";
import { VscDebugLineByLine } from "react-icons/vsc";
import { FaCloud, FaHistory, FaDownload, FaUpload, FaTrash, FaExclamationTriangle, FaTrashRestore, FaSun, FaMoon } from "react-icons/fa";

import { historyService, HistoryGroup } from "../services/historyService";
import { createBackup, listBackups, restoreBackup, deleteFile, DriveFile } from "../services/googleDrive";
import { initializeDatabase, CURRENT_DB_VERSION } from "../services/db";
import { exportDataFromIndexedDB } from "../services/driveSync";
import { logError } from "../services/logger";
import { DesktopTableView } from "../components/common/DesktopTableView";
import { MobileCardView } from "../components/common/MobileCardView";
import { useTheme, Theme } from "../services/themeContext";
import { Column } from "../types/ui";

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

const backupColumns: Column<DriveFile>[] = [
  {
    field: "createdTime",
    headerName: "Created",
    renderCell: (file) => new Date(file.createdTime || "").toLocaleString(),
  },
  {
    field: "name",
    headerName: "Filename",
  },
];

interface HistoryItem {
  id: string;
  action: string;
  table: string;
  details: string;
}

const historyColumns: Column<HistoryItem>[] = [
  {
    field: "action",
    headerName: "Action",
    renderCell: (item) => <Badge bg="secondary">{item.action}</Badge>,
  },
  {
    field: "table",
    headerName: "Table",
  },
  {
    field: "details",
    headerName: "Details",
  },
];

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

  return (
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
                              New
                           </Button>
                       </div>

                       {cloudMsg && <Alert variant={cloudMsg.type}>{cloudMsg.text}</Alert>}

                       {backups.length === 0 && !loadingCloud ? (
                           <p className="text-muted text-center py-4">No backups found.</p>
                       ) : (
                           <>
                               <DesktopTableView
                                   data={backups}
                                   columns={backupColumns}
                                   renderActions={(file) => (
                                       <>
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
                                              {restoring ? <Spinner size="sm" animation="border" /> : <FaTrashRestore />}
                                           </Button>
                                           <Button 
                                               variant="outline-danger" 
                                               size="sm"
                                               onClick={() => handleDelete(file.id)}
                                               title="Delete Backup"
                                           >
                                               <FaTrash/>
                                           </Button>
                                       </>
                                   )}
                               />
                               <MobileCardView
                                   data={backups}
                                   columns={backupColumns}
                                   renderActions={(file) => (
                                       <>
                                           <Button 
                                               variant="outline-primary" 
                                               size="sm"
                                               className="p-1"
                                               style={{ width: "32px", height: "32px" }}
                                               onClick={() => handleDownload(file)}
                                               disabled={downloading === file.id}
                                               title="Download Backup"
                                           >
                                               {downloading === file.id ? <Spinner size="sm" animation="border"/> : <FaDownload/>}
                                           </Button>
                                           <Button 
                                               variant="outline-success" 
                                               size="sm" 
                                               className="p-1"
                                               style={{ width: "32px", height: "32px" }}
                                               onClick={() => handleRestore(file)}
                                               disabled={restoring}
                                               title="Restore Backup"
                                           >
                                               {restoring ? <Spinner size="sm" animation="border" /> : <FaTrashRestore />}
                                           </Button>
                                           <Button 
                                               variant="outline-danger" 
                                               size="sm"
                                               className="p-1"
                                               style={{ width: "32px", height: "32px" }}
                                               onClick={() => handleDelete(file.id)}
                                               title="Delete Backup"
                                           >
                                               <FaTrash/>
                                           </Button>
                                       </>
                                   )}
                               />
                           </>
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
                        <FaTrash/> Clear
                     </Button>
                </div>
                {undoStack.length === 0 ? (
                    <p className="text-muted">No history available.</p>
                ) : (
                    <div className="p-0 border rounded">
                        <DesktopTableView
                            data={undoStack.map((group, i) => {
                                const firstOp = group[0];
                                let action = "Unknown";
                                if (firstOp.type === "delete") action = "Created"; 
                                if (firstOp.type === "add") action = "Deleted";
                                if (firstOp.type === "update") action = "Updated";
                                return {
                                    id: `hist-${i}`,
                                    action,
                                    table: firstOp.table,
                                    details: group.length > 1 ? `${group.length} records` : `ID: ${firstOp.key}`
                                };
                            })}
                            columns={historyColumns}
                        />
                         <MobileCardView
                            data={undoStack.map((group, i) => {
                                const firstOp = group[0];
                                let action = "Unknown";
                                if (firstOp.type === "delete") action = "Created"; 
                                if (firstOp.type === "add") action = "Deleted";
                                if (firstOp.type === "update") action = "Updated";
                                return {
                                    id: `hist-${i}`,
                                    action,
                                    table: firstOp.table,
                                    details: group.length > 1 ? `${group.length} records` : `ID: ${firstOp.key}`
                                };
                            })}
                            columns={historyColumns}
                        />
                    </div>
                )}
            </div>
        </Tab>
      </Tabs>
  );
}

// --- Main Settings Page ---
export default function SettingsPage() {
  const { isEnabled, isSupported, register, disable } = useBioLock();
  const { theme, setTheme } = useTheme();

  return (
    <Container fluid className="py-4 overflow-auto h-100">
      <Tabs
        defaultActiveKey="general"
        id="settings-tabs"
        className="mb-4 flex-nowrap flex-md-wrap overflow-x-auto overflow-y-hidden py-1 align-items-stretch"
      >
        <Tab 
          eventKey="general" 
          title={<><BsShieldLock className="me-2"/>General</>}
          tabClassName="h-100 d-flex align-items-center"
        >
          <Card className="mb-4">
            <Card.Header>Appearance</Card.Header>
            <Card.Body>
              <Form.Group>
                <Form.Label className="h5 mb-1">Theme</Form.Label>
                <p className="text-muted mb-3">
                  Choose how the app looks on your device.
                </p>
                <div className="d-flex gap-2">
                  {(["system", "light", "dark"] as Theme[]).map((t) => {
                    let Icon = BsDisplay;
                    if (t === "light") Icon = FaSun;
                    if (t === "dark") Icon = FaMoon;
                    
                    return (
                      <Button
                        size="sm"
                        key={t}
                        variant={theme === t ? "primary" : "outline-primary"}
                        onClick={() => setTheme(t)}
                        className="text-capitalize px-2 d-flex align-items-center gap-2"
                      >
                        <Icon />
                        {t === "system" ? "System Default" : t}
                      </Button>
                    );
                  })}
                </div>
              </Form.Group>
            </Card.Body>
          </Card>

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
          tabClassName="h-100 d-flex align-items-center"
        >
          <HoldersPage />
        </Tab>
        <Tab 
          eventKey="accounts" 
          title={<><BsBank className="me-2"/>Accounts</>}
          tabClassName="h-100 d-flex align-items-center"
        >
          <AccountsPage />
        </Tab>
        <Tab 
          eventKey="buckets" 
          title={<><BsBucket className="me-2"/>Buckets</>}
          tabClassName="h-100 d-flex align-items-center"
        >
          <BucketsPage />
        </Tab>
        <Tab 
          eventKey="asset-classes" 
          title={<><BsLayersHalf className="me-2"/>Types</>}
          tabClassName="h-100 d-flex align-items-center"
        >
          <AssetClassesPage />
        </Tab>
        <Tab 
          eventKey="asset-sub-classes" 
          title={<><BsLayers className="me-2"/>Sub-Types</>}
          tabClassName="h-100 d-flex align-items-center"
        >
          <AssetSubClassesPage />
        </Tab>
        <Tab 
          eventKey="asset-purpose" 
          title={<><BsFlag className="me-2"/>Purpose</>}
          tabClassName="h-100 d-flex align-items-center"
        >
          <AssetPurposePage />
        </Tab>
         <Tab 
          eventKey="sip-types" 
          title={<><BsGraphUp className="me-2"/>SIP Types</>}
          tabClassName="h-100 d-flex align-items-center"
        >
          <SipTypesPage />
        </Tab>
        <Tab 
          eventKey="loan-types" 
          title={<><BsFileEarmarkText className="me-2"/>Loan Types</>}
          tabClassName="h-100 d-flex align-items-center"
        >
          <LoanTypesPage />
        </Tab>
        <Tab 
          eventKey="system-properties" 
          title={<><BsSliders className="me-2"/>System</>}
          tabClassName="h-100 d-flex align-items-center"
        >
          <SystemPropertiesPage />
        </Tab>

        <Tab 
          eventKey="data" 
          title={<><BsDatabase className="me-2"/>Data</>}
          tabClassName="h-100 d-flex align-items-center"
        >
            <DataManagementTab />
        </Tab>
        <Tab 
          eventKey="query-builder" 
          title={<><BsFiletypeSql className="me-2"/>Query Builder</>}
          tabClassName="h-100 d-flex align-items-center"
        >
            <QueryBuilderPage />
        </Tab>

        <Tab 
          eventKey="debug" 
          title={<><VscDebugLineByLine className="me-2"/>Logs</>}
          tabClassName="h-100 d-flex align-items-center"
        >
            <DebugConsole />
        </Tab>
      </Tabs>
    </Container>
  );
}
