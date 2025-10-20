import Dexie from "dexie";
import type { Table } from "dexie";
import { logError, logInfo } from "./logger";

interface BaseRecord {
  id: number;
}

export interface Config extends BaseRecord {
  key: string;
  value: string | number | boolean | Record<string, unknown>;
}

export interface AssetPurpose extends BaseRecord {
  name: string;
  type: string;
}

export interface LoanType extends BaseRecord {
  name: string;
  type: string;
  interestRate: number;
}

export interface Holder extends BaseRecord {
  name: string;
}

export interface SipType extends BaseRecord {
  name: string;
}

export interface Bucket extends BaseRecord {
  name: string;
}

export interface AssetClass extends BaseRecord {
  name: string;
}

export interface AssetSubClass extends BaseRecord {
  assetClasses_id: number;
  name: string;
  expectedReturns: number;
}

export interface Goal extends BaseRecord {
  name: string;
  priority: number;
  amountRequiredToday: number;
  durationInYears: number;
  assetPurpose_id: number;
}

export interface Account extends BaseRecord {
  bank: string;
  accountNumber: string;
  holders_id: number;
}

export interface Income extends BaseRecord {
  item: string;
  accounts_id: number;
  holders_id: number;
  monthly: string;
}

export interface CashFlow extends BaseRecord {
  item: string;
  accounts_id: number;
  holders_id: number;
  monthly: number;
  yearly: number;
  assetPurpose_id: number;
  goal_id?: number | null; // Optional, links to Goal if present
}

export interface AssetHolding extends BaseRecord {
  assetClasses_id: number;
  assetSubClasses_id: number;
  goals_id: number | null;
  holders_id: number;
  assetDetail: string;
  existingAllocation: number;
  sip: number;
  sipTypes_id: number;
  buckets_id: number;
  comments: string;
}

export interface Liability extends BaseRecord {
  loanType_id: number;
  loanAmount: number;
  balance: number;
  emi: number;
}

export interface AssetProjection extends BaseRecord {
  assetSubClasses_id: number;
  newMonthlyInvestment: number;
  lumpsumExpected: number;
  redemptionExpected: number;
  comment: string;
}

class AppDatabase extends Dexie {
  configs!: Table<Config>;
  assetPurposes!: Table<AssetPurpose>;
  loanTypes!: Table<LoanType>;
  holders!: Table<Holder>;
  sipTypes!: Table<SipType>;
  buckets!: Table<Bucket>;
  assetClasses!: Table<AssetClass>;
  assetSubClasses!: Table<AssetSubClass>;
  goals!: Table<Goal>;
  accounts!: Table<Account>;
  income!: Table<Income>;
  cashFlow!: Table<CashFlow>;
  assetsHoldings!: Table<AssetHolding>;
  liabilities!: Table<Liability>;
  assetsProjection!: Table<AssetProjection>;

  constructor() {
    super("financeDb");
    this.version(4).stores({
      configs: "++id",
      assetPurposes: "++id",
      loanTypes: "++id",
      holders: "++id",
      sipTypes: "++id",
      buckets: "++id",
      assetClasses: "++id",
      assetSubClasses: "++id, assetClasses_id",
      goals: "++id, assetPurpose_id",
      income: "++id, accounts_id, holders_id",
      cashFlow: "++id, accounts_id, holders_id, assetPurpose_id, goal_id",
      accounts: "++id, holders_id",
      assetsHoldings:
        "++id, assetClasses_id, assetSubClasses_id, goals_id, holders_id, buckets_id",
      liabilities: "++id, loanType_id",
      assetsProjection: "++id, assetSubClasses_id",
    });
  }
}

// Delete the old database if it exists
async function deleteOldDatabase() {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase("financeDb");
    req.onsuccess = () => {
      logInfo("Old database deleted successfully");
      resolve();
    };
    req.onerror = () => {
      logError("Could not delete old database");
      reject(new Error("Failed to delete old database"));
    };
    req.onblocked = () => {
      logError("Database deletion blocked");
      reject(new Error("Database deletion blocked"));
    };
  });
}

// Initialize database with version check
async function initializeDexieDb() {
  try {
    // Check if we need to migrate
    const currentVersion = localStorage.getItem("dbVersion");
    if (currentVersion && currentVersion !== "3") {
      logInfo("Database schema changed, deleting old database...");
      await deleteOldDatabase();
      localStorage.removeItem("dbInitialized");
      localStorage.removeItem("dbVersion");
    }

    // Create new database instance
    const db = new AppDatabase();

    db.on("ready", () => {
      logInfo("Database ready, current version:", db.verno);
      localStorage.setItem("dbVersion", db.verno.toString());
    });

    db.on("versionchange", (event) => {
      logInfo("Database version changed:", event);
      db.close();
      localStorage.removeItem("dbInitialized");
      localStorage.removeItem("dbVersion");
      window.location.reload();
    });

    return db;
  } catch (error) {
    logError("Failed to initialize database:", { error });
    throw error;
  }
}

// Export the database instance
export const db = await initializeDexieDb();

// Initialize the database with data from data.json
export interface InitializationData {
  configs: Config[];
  assetPurpose: AssetPurpose[];
  loanType: LoanType[];
  holders: Holder[];
  sipTypes: SipType[];
  buckets: Bucket[];
  assetClasses: AssetClass[];
  assetSubClasses: AssetSubClass[];
  goals: Goal[];
  accounts: Account[];
  income: Income[];
  cashFlow: CashFlow[];
  assetsHoldings: AssetHolding[];
  liabilities: Liability[];
  assetsProjection: AssetProjection[];
}

export async function initializeDatabase(data: InitializationData) {
  try {
    const tables = [
      db.configs,
      db.assetPurposes,
      db.loanTypes,
      db.holders,
      db.sipTypes,
      db.buckets,
      db.assetClasses,
      db.assetSubClasses,
      db.goals,
      db.accounts,
      db.income,
      db.cashFlow,
      db.assetsHoldings,
      db.liabilities,
      db.assetsProjection,
    ];

    await db.transaction("rw", tables, async () => {
      // Clear existing data only if tables are empty
      const isEmpty = await Promise.all(
        tables.map((table) => table.count())
      ).then((counts) => counts.every((count) => count === 0));

      if (isEmpty) {
        logInfo("Tables are empty, initializing with default data...");
        // Insert new data only if tables are empty
        // Helper function to set id to undefined for auto-increment
        const removeIds = <T extends { id?: number }>(items: T[]): T[] => {
          return items.map((item) => ({ ...item, id: undefined }));
        };

        // Add all items without their ids to let the database auto-increment
        await db.configs.bulkAdd(removeIds(data.configs));
        await db.assetPurposes.bulkAdd(removeIds(data.assetPurpose));
        await db.loanTypes.bulkAdd(removeIds(data.loanType));
        await db.holders.bulkAdd(removeIds(data.holders));
        await db.sipTypes.bulkAdd(removeIds(data.sipTypes));
        await db.buckets.bulkAdd(removeIds(data.buckets));
        await db.assetClasses.bulkAdd(removeIds(data.assetClasses));
        await db.assetSubClasses.bulkAdd(removeIds(data.assetSubClasses));
        await db.goals.bulkAdd(removeIds(data.goals));
        await db.accounts.bulkAdd(removeIds(data.accounts));
        await db.income.bulkAdd(removeIds(data.income));
        await db.cashFlow.bulkAdd(removeIds(data.cashFlow));
        await db.assetsHoldings.bulkAdd(removeIds(data.assetsHoldings));
        await db.liabilities.bulkAdd(removeIds(data.liabilities));
        await db.assetsProjection.bulkAdd(
          removeIds(data.assetsProjection || [])
        );
      } else {
        logInfo("Tables already contain data, skipping initialization");
      }
    });
    logInfo("Database initialized successfully");
  } catch (error) {
    logError("Failed to initialize database:", { error });
    throw error;
  }
}

export async function resetDatabase() {
  try {
    await db.transaction("rw", db.tables, async () => {
      await Promise.all(db.tables.map((table) => table.clear()));
    });
    localStorage.removeItem("dbInitialized");
    logInfo("Database reset successfully");
  } catch (error) {
    logError("Failed to reset database:", { error });
    throw error;
  }
}
