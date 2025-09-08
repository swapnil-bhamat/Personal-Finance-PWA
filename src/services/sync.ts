import { db } from "./db";
import type {
  Config,
  AssetPurpose,
  LoanType,
  Holder,
  SipType,
  Bucket,
  AssetClass,
  AssetSubClass,
  Goal,
  Account,
  Income,
  CashFlow,
  AssetHolding,
  Liability,
} from "./db";
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  collection,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { clearDatabase } from "./dbUtils";
import { logInfo, logError, LogEntry } from "./logger";

const firestore = getFirestore();

interface SyncMetadata {
  lastModified: number;
  modifiedBy: string;
  version: number;
}

interface ServerData {
  metadata?: SyncMetadata;
  configs?: Config[];
  assetPurpose?: AssetPurpose[];
  loanType?: LoanType[];
  holders?: Holder[];
  sipTypes?: SipType[];
  buckets?: Bucket[];
  assetClasses?: AssetClass[];
  assetSubClasses?: AssetSubClass[];
  goals?: Goal[];
  accounts?: Account[];
  income?: Income[];
  cashFlow?: CashFlow[];
  assetsHoldings?: AssetHolding[];
  liabilities?: Liability[];
}

// Tracks the last sync timestamp for conflict resolution
let lastSyncTimestamp = 0;
let unsubscribeFirestore: (() => void) | null = null;

// Initialize real-time sync
export async function initializeSync() {
  const auth = getAuth();
  if (!auth.currentUser) {
    logInfo("No authenticated user found during initialization");
    return;
  }

  try {
    logInfo(
      "Starting sync initialization for user:",
      String(auth.currentUser.email)
    );

    // First, try to get existing data from Firestore
    const docRef = doc(firestore, "appData", "main");
    const docSnap = await getDoc(docRef);

    logInfo("Clearing local database before sync...");
    await clearDatabase();

    if (docSnap.exists()) {
      const firestoreData = docSnap.data();
      logInfo("Raw Firestore data:", firestoreData);

      // Handle the existing data structure where data is stored in 'data' field
      const serverData =
        (firestoreData.data as ServerData) || (firestoreData as ServerData);
      logInfo("Parsed server data:", serverData as LogEntry["metadata"]);

      await syncFromServer(serverData);
      lastSyncTimestamp = serverData.metadata?.lastModified || Date.now();
      logInfo("Initial sync from server completed");
    } else {
      logInfo(
        "No existing data found in Firestore, attempting to create initial data"
      );
      await syncToServer();
      logInfo("Initial data pushed to Firestore");
    }

    // Subscribe to Firestore changes
    unsubscribeFirestore = onSnapshot(
      docRef,
      async (snapshot) => {
        const firestoreData = snapshot.data();
        if (!firestoreData) return;

        const serverData =
          (firestoreData.data as ServerData) || (firestoreData as ServerData);
        if (!serverData) return;

        const serverTimestamp = serverData.metadata?.lastModified || 0;
        const serverVersion = serverData.metadata?.version || 0;
        const serverModifier = serverData.metadata?.modifiedBy || "";

        // Skip if this is our own update
        if (auth.currentUser && serverModifier === auth.currentUser.email) {
          logInfo("Skipping own update");
          return;
        }

        // Only update if server has a newer version and it's not our own change
        if (serverVersion > (serverData.metadata?.version || 0)) {
          logInfo("Detected remote change, syncing from server");
          logInfo("Local timestamp:", lastSyncTimestamp);
          logInfo("Server timestamp:", serverTimestamp);
          logInfo("Changed by:", serverModifier);

          await syncFromServer(serverData);
          lastSyncTimestamp = serverTimestamp;
        } else {
          logInfo("Skipping sync - no significant changes");
        }
      },
      (error) => {
        logError("Error in Firestore sync:", error);
      }
    );

    logInfo("Real-time sync initialized");
  } catch (error) {
    logError(
      "Error during sync initialization:",
      error as LogEntry["metadata"]
    );
    throw error;
  }
}

// Stop syncing when user logs out
export function stopSync() {
  if (unsubscribeFirestore) {
    unsubscribeFirestore();
    unsubscribeFirestore = null;
  }
}

// Sync data from server to local DB
async function syncFromServer(serverData: ServerData) {
  try {
    logInfo("Starting sync from server with data:", {
      availableTables: Object.keys(serverData).filter(
        (key) => key !== "metadata"
      ),
    });

    const tables = db.tables.map((table) => table.name);
    logInfo("Local database tables:", tables);

    await db.transaction("rw", tables, async () => {
      // Clear all tables first
      logInfo("Clearing all tables before sync...");
      for (const table of tables) {
        await db.table(table).clear();
      }

      // Type-safe way to handle each table
      // Type-safe way to handle each table with explicit handling
      if (serverData.configs && serverData.configs.length > 0) {
        logInfo(`Syncing configs: ${serverData.configs.length} records`);
        await db.configs.bulkAdd(serverData.configs);
      }
      if (serverData.assetPurpose && serverData.assetPurpose.length > 0) {
        logInfo(
          `Syncing assetPurpose: ${serverData.assetPurpose.length} records`
        );
        await db.assetPurposes.bulkAdd(serverData.assetPurpose);
      }
      if (serverData.loanType && serverData.loanType.length > 0) {
        logInfo(`Syncing loanType: ${serverData.loanType.length} records`);
        await db.loanTypes.bulkAdd(serverData.loanType);
      }
      if (serverData.holders && serverData.holders.length > 0) {
        logInfo(`Syncing holders: ${serverData.holders.length} records`);
        await db.holders.bulkAdd(serverData.holders);
      }
      if (serverData.sipTypes && serverData.sipTypes.length > 0) {
        logInfo(`Syncing sipTypes: ${serverData.sipTypes.length} records`);
        await db.sipTypes.bulkAdd(serverData.sipTypes);
      }
      if (serverData.buckets && serverData.buckets.length > 0) {
        logInfo(`Syncing buckets: ${serverData.buckets.length} records`);
        await db.buckets.bulkAdd(serverData.buckets);
      }
      if (serverData.assetClasses && serverData.assetClasses.length > 0) {
        logInfo(
          `Syncing assetClasses: ${serverData.assetClasses.length} records`
        );
        await db.assetClasses.bulkAdd(serverData.assetClasses);
      }
      if (serverData.assetSubClasses && serverData.assetSubClasses.length > 0) {
        logInfo(
          `Syncing assetSubClasses: ${serverData.assetSubClasses.length} records`
        );
        await db.assetSubClasses.bulkAdd(serverData.assetSubClasses);
      }
      if (serverData.goals && serverData.goals.length > 0) {
        logInfo(`Syncing goals: ${serverData.goals.length} records`);
        await db.goals.bulkAdd(serverData.goals);
      }
      if (serverData.accounts && serverData.accounts.length > 0) {
        logInfo(`Syncing accounts: ${serverData.accounts.length} records`);
        await db.accounts.bulkAdd(serverData.accounts);
      }
      if (serverData.income && serverData.income.length > 0) {
        logInfo(`Syncing income: ${serverData.income.length} records`);
        await db.income.bulkAdd(serverData.income);
      }
      if (serverData.cashFlow && serverData.cashFlow.length > 0) {
        logInfo(`Syncing cashFlow: ${serverData.cashFlow.length} records`);
        await db.cashFlow.bulkAdd(serverData.cashFlow);
      }
      if (serverData.assetsHoldings && serverData.assetsHoldings.length > 0) {
        logInfo(
          `Syncing assetsHoldings: ${serverData.assetsHoldings.length} records`
        );
        await db.assetsHoldings.bulkAdd(serverData.assetsHoldings);
      }
      if (serverData.liabilities && serverData.liabilities.length > 0) {
        logInfo(
          `Syncing liabilities: ${serverData.liabilities.length} records`
        );
        await db.liabilities.bulkAdd(serverData.liabilities);
      }
    });

    // Verify the sync
    const verificationResults = await Promise.all(
      tables.map(async (tableName) => {
        const count = await db.table(tableName).count();
        return { table: tableName, count };
      })
    );

    logInfo(
      "Sync verification - record counts:",
      verificationResults as LogEntry["metadata"]
    );
  } catch (error) {
    logError("Error syncing from server:", error as LogEntry["metadata"]);
    throw error;
  }
}

// Sync local changes to server with optimistic updates
export async function syncToServer() {
  const auth = getAuth();
  if (!auth.currentUser) return;

  try {
    // Create initial data if needed
    const docRef = doc(firestore, "appData", "main");
    const docSnap = await getDoc(docRef);

    // If no data exists, create initial structure with empty arrays
    if (!docSnap.exists()) {
      logInfo("Creating initial data structure in Firestore");
      const initialData: ServerData = {
        configs: [],
        assetPurpose: [],
        loanType: [],
        holders: [],
        sipTypes: [],
        buckets: [],
        assetClasses: [],
        assetSubClasses: [],
        goals: [],
        accounts: [],
        income: [],
        cashFlow: [],
        assetsHoldings: [],
        liabilities: [],
        metadata: {
          lastModified: Date.now(),
          modifiedBy: auth.currentUser.email || "unknown",
          version: 1,
        },
      };
      await setDoc(docRef, initialData);
    }

    // Now sync current data
    const syncData: ServerData = {
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

    // Get the current server data to check version
    const currentDoc = await getDoc(doc(firestore, "appData", "main"));
    const currentData = currentDoc.exists() ? currentDoc.data() : null;
    const currentServerData =
      (currentData?.data as ServerData) || (currentData as ServerData);
    const currentVersion = currentServerData?.metadata?.version || 0;

    const metadata: SyncMetadata = {
      lastModified: Date.now(),
      modifiedBy: auth.currentUser?.email || "unknown",
      version: Math.max(currentVersion, lastSyncTimestamp) + 1,
    };

    // Optimistically update lastSyncTimestamp
    const newTimestamp = metadata.lastModified;

    logInfo("Syncing to server with version:", metadata.version);

    // Update Firestore - maintain the existing structure with data field
    await setDoc(doc(firestore, "appData", "main"), {
      data: {
        ...syncData,
        metadata,
      },
    });

    lastSyncTimestamp = newTimestamp;
    logInfo("Successfully synced to server");
  } catch (error) {
    logError("Error syncing to server:", error as LogEntry["metadata"]);
    throw error;
  }
}

// Listen for local changes and sync to server
export function setupLocalChangeSync() {
  let syncTimeout: NodeJS.Timeout | null = null;

  // Function to handle local changes
  const handleChange = () => {
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }

    // Debounce sync to avoid too many updates
    syncTimeout = setTimeout(() => {
      syncToServer().catch(logError);
    }, 1000); // Wait 1 second after last change before syncing
  };

  // Subscribe to changes on all tables
  db.tables.forEach((table) => {
    table.hook("creating", handleChange);
    table.hook("updating", handleChange);
    table.hook("deleting", handleChange);
  });
}

// Export a function to force refresh from server
export async function forceRefreshFromServer() {
  const snapshot = await getDocs(
    query(
      collection(firestore, "appData"),
      where("metadata.lastModified", ">", lastSyncTimestamp),
      orderBy("metadata.lastModified", "desc"),
      limit(1)
    )
  );

  if (!snapshot.empty) {
    const serverData = snapshot.docs[0].data();
    await syncFromServer(serverData);
    lastSyncTimestamp = serverData.metadata?.lastModified || 0;
  }
}
