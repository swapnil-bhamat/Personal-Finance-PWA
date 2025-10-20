import { logError, logInfo } from "./logger";
import { db } from "./db";
import type { InitializationData } from "./db";
import { findFile, readFile, uploadJsonFile } from "./googleDrive";

const DATA_FILE_NAME = "data.json";
let syncInProgress = false;
// Track the last successful sync timestamp
let syncTimeout: NodeJS.Timeout | null = null;

export async function initializeFromDrive(
  shouldRestore = false
): Promise<boolean> {
  try {
    if (shouldRestore) {
      const existingFile = await findFile(DATA_FILE_NAME);
      if (existingFile) {
        const data = await readFile<InitializationData>(existingFile.id);
        if (data.assetSubClasses.length === 0) {
          logInfo("No existing data file found in Google Drive");
          return false;
        }
        await importDataToIndexedDB(data);
        logInfo("Successfully restored data from Google Drive");
        return true;
      }
      logInfo("No existing data file found in Google Drive");
      return false;
    }

    // Load initial data from public/data.json
    try {
      logInfo("Attempting to load data.json from public folder...");
      const response = await fetch("/data.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const initialData = await response.json();
      logInfo("Successfully loaded initial data:", initialData);

      // Create initial data in Google Drive
      logInfo("Uploading initial data to Google Drive...");
      await uploadJsonFile(initialData, DATA_FILE_NAME);
      logInfo(
        "Successfully uploaded to Google Drive, now importing to IndexedDB..."
      );
      await importDataToIndexedDB(initialData);
      logInfo("Created new data file in Google Drive with default data");
      return true;
    } catch (error) {
      logError("Failed to load initial data:", { error });
      // Fallback to empty data structure
      const emptyData = {
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
        assetsProjection: [],
      };
      await uploadJsonFile(emptyData, DATA_FILE_NAME);
      await importDataToIndexedDB(emptyData);
      logInfo("Created new data file in Google Drive with empty data");
      return true;
    }
  } catch (error) {
    logError("Failed to initialize from Drive:", { error });
    return false;
  }
}

async function importDataToIndexedDB(data: InitializationData): Promise<void> {
  try {
    logInfo("Starting data import to IndexedDB with data:", data);
    await db.transaction("rw", db.tables, async () => {
      // Clear existing data
      logInfo("Clearing existing data from tables...");
      await Promise.all(db.tables.map((table) => table.clear()));
      logInfo("Tables cleared successfully");

      // Import new data
      logInfo("Beginning data import...");
      if (data.configs?.length) await db.configs.bulkAdd(data.configs);
      if (data.assetPurpose?.length)
        await db.assetPurposes.bulkAdd(data.assetPurpose);
      if (data.loanType?.length) await db.loanTypes.bulkAdd(data.loanType);
      if (data.holders?.length) await db.holders.bulkAdd(data.holders);
      if (data.sipTypes?.length) await db.sipTypes.bulkAdd(data.sipTypes);
      if (data.buckets?.length) await db.buckets.bulkAdd(data.buckets);
      if (data.assetClasses?.length)
        await db.assetClasses.bulkAdd(data.assetClasses);
      if (data.assetSubClasses?.length)
        await db.assetSubClasses.bulkAdd(data.assetSubClasses);
      if (data.goals?.length) await db.goals.bulkAdd(data.goals);
      if (data.accounts?.length) await db.accounts.bulkAdd(data.accounts);
      if (data.income?.length) await db.income.bulkAdd(data.income);
      if (data.cashFlow?.length) await db.cashFlow.bulkAdd(data.cashFlow);
      if (data.assetsHoldings?.length)
        await db.assetsHoldings.bulkAdd(data.assetsHoldings);
      if (data.liabilities?.length)
        await db.liabilities.bulkAdd(data.liabilities);
      if (data.assetsProjection?.length)
        await db.assetsProjection.bulkAdd(data.assetsProjection);
    });
    logInfo("Successfully imported data to IndexedDB");
  } catch (error) {
    logError("Failed to import data to IndexedDB:", { error });
    throw error;
  }
}

async function exportDataFromIndexedDB(): Promise<InitializationData> {
  try {
    return {
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
    };
  } catch (error) {
    logError("Failed to export data from IndexedDB:", { error });
    throw error;
  }
}

export function setupDriveSync(isDemoMode = false): void {
  if (isDemoMode) {
    logInfo("Demo mode enabled, skipping Drive sync setup");
    return;
  }

  // Function to handle changes
  const handleChange = () => {
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }

    // Debounce sync to avoid too many updates
    syncTimeout = setTimeout(() => {
      syncToDrive().catch(logError);
    }, 1000); // Wait 1 second after last change before syncing
  };

  // Subscribe to changes on all tables
  db.tables.forEach((table) => {
    table.hook("creating", handleChange);
    table.hook("updating", handleChange);
    table.hook("deleting", handleChange);
  });
}

export async function syncToDrive(): Promise<void> {
  if (syncInProgress) {
    logInfo("Sync already in progress, skipping...");
    return;
  }

  try {
    syncInProgress = true;
    const data = await exportDataFromIndexedDB();
    await uploadJsonFile(data, DATA_FILE_NAME);
    logInfo("Successfully synced to Drive");
  } catch (error) {
    logError("Failed to sync to Drive:", { error });
    throw error;
  } finally {
    syncInProgress = false;
  }
}

export function stopDriveSync(): void {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
  db.tables.forEach((table) => {
    table.hook("creating").unsubscribe(syncToDrive);
    table.hook("updating").unsubscribe(syncToDrive);
    table.hook("deleting").unsubscribe(syncToDrive);
  });
}
