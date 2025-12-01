import Dexie, { Table } from "dexie";
import { logError, logInfo } from "./logger";
import {
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
  AssetProjection,
  LiabilityProjection,
  InitializationData,
  CURRENT_DB_VERSION,
} from "../types/db.types";
import { defineSchema } from "./dbMigrations";

// Re-export types for backward compatibility
export * from "../types/db.types";

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
  liabilitiesProjection!: Table<LiabilityProjection>;

  constructor() {
    super("financeDb");
    defineSchema(this);
  }
}

// Initialize database
async function initializeDexieDb() {
  try {
    const db = new AppDatabase();

    db.on("ready", () => {
      logInfo("Database ready, current version:", db.verno);
    });

    return db;
  } catch (error) {
    logError("Failed to initialize database:", { error });
    throw error;
  }
}

// Export the database instance
export const db = await initializeDexieDb();

export function sanitizeData(data: InitializationData): InitializationData {
  const dataVersion = data.version || 0;

  // Log version mismatch if any
  if (dataVersion !== CURRENT_DB_VERSION) {
    logInfo(
      `Sanitizing data from version ${dataVersion} to ${CURRENT_DB_VERSION}`
    );
  }

  // Ensure all arrays exist
  const sanitized: InitializationData = {
    version: CURRENT_DB_VERSION,
    configs: data.configs || [],
    assetPurpose: data.assetPurpose || [],
    loanType: data.loanType || [],
    holders: data.holders || [],
    sipTypes: data.sipTypes || [],
    buckets: data.buckets || [],
    assetClasses: data.assetClasses || [],
    assetSubClasses: data.assetSubClasses || [],
    goals: data.goals || [],
    accounts: data.accounts || [],
    income: data.income || [],
    cashFlow: data.cashFlow || [],
    assetsHoldings: data.assetsHoldings || [],
    liabilities: data.liabilities || [],
    assetsProjection: data.assetsProjection || [],
    liabilitiesProjection: data.liabilitiesProjection || [],
  };

  // Apply migrations for imported data
  if (dataVersion < 8) {
    // Migrate Liabilities
    sanitized.liabilities = sanitized.liabilities.map((record: any) => {
      const newRecord = { ...record };

      // Rename loanTakenDate -> loanStartDate
      if (newRecord.loanTakenDate && !newRecord.loanStartDate) {
        newRecord.loanStartDate = newRecord.loanTakenDate;
      }
      // Default loanStartDate if missing
      if (!newRecord.loanStartDate) {
        const today = new Date();
        newRecord.loanStartDate = `${String(today.getDate()).padStart(
          2,
          "0"
        )}-${String(today.getMonth() + 1).padStart(
          2,
          "0"
        )}-${today.getFullYear()}`;
      }
      // Default totalMonths if missing
      if (!newRecord.totalMonths) {
        newRecord.totalMonths = 120; // Default to 10 years
      }

      // Remove old fields
      delete newRecord.balance;
      delete newRecord.emi;
      delete newRecord.loanTakenDate;

      return newRecord;
    });

    // Migrate LiabilityProjections
    sanitized.liabilitiesProjection = sanitized.liabilitiesProjection.map(
      (record: any) => {
        const newRecord = { ...record };
        delete newRecord.newEmi;

        // Ensure future loans have required fields
        if (!newRecord.liability_id) {
          if (!newRecord.startDate) {
            const today = new Date();
            newRecord.startDate = `${String(today.getDate()).padStart(
              2,
              "0"
            )}-${String(today.getMonth() + 1).padStart(
              2,
              "0"
            )}-${today.getFullYear()}`;
          }
          if (!newRecord.totalMonths) {
            newRecord.totalMonths = 120;
          }
        }
        return newRecord;
      }
    );

    // Migrate AssetSubClasses
    sanitized.assetSubClasses = sanitized.assetSubClasses.map((record: any) => {
      const newRecord = { ...record };
      if (newRecord.expectedReturns === undefined) {
        newRecord.expectedReturns = 12; // Default to 12%
      }
      return newRecord;
    });
  }

  return sanitized;
}

export async function initializeDatabase(data: InitializationData) {
  try {
    const sanitizedData = sanitizeData(data);

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
      db.liabilitiesProjection,
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
        await db.configs.bulkAdd(removeIds(sanitizedData.configs));
        await db.assetPurposes.bulkAdd(removeIds(sanitizedData.assetPurpose));
        await db.loanTypes.bulkAdd(removeIds(sanitizedData.loanType));
        await db.holders.bulkAdd(removeIds(sanitizedData.holders));
        await db.sipTypes.bulkAdd(removeIds(sanitizedData.sipTypes));
        await db.buckets.bulkAdd(removeIds(sanitizedData.buckets));
        await db.assetClasses.bulkAdd(removeIds(sanitizedData.assetClasses));
        await db.assetSubClasses.bulkAdd(
          removeIds(sanitizedData.assetSubClasses)
        );
        await db.goals.bulkAdd(removeIds(sanitizedData.goals));
        await db.accounts.bulkAdd(removeIds(sanitizedData.accounts));
        await db.income.bulkAdd(removeIds(sanitizedData.income));
        await db.cashFlow.bulkAdd(removeIds(sanitizedData.cashFlow));
        await db.assetsHoldings.bulkAdd(
          removeIds(sanitizedData.assetsHoldings)
        );
        await db.liabilities.bulkAdd(removeIds(sanitizedData.liabilities));
        await db.assetsProjection.bulkAdd(
          removeIds(sanitizedData.assetsProjection)
        );
        await db.liabilitiesProjection.bulkAdd(
          removeIds(sanitizedData.liabilitiesProjection)
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
    // No need to remove localStorage items anymore
    logInfo("Database reset successfully");
  } catch (error) {
    logError("Failed to reset database:", { error });
    throw error;
  }
}
