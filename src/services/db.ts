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
  loanStartDate: string; // Format: DD-MM-YYYY
  totalMonths: number;
}

export interface AssetProjection extends BaseRecord {
  assetSubClasses_id: number;
  newMonthlyInvestment: number;
  lumpsumExpected: number;
  redemptionExpected: number;
  comment: string;
}

export interface LiabilityProjection extends BaseRecord {
  liability_id?: number; // Optional: null for future loans
  loanType_id?: number; // Required for future loans
  loanAmount?: number; // Required for future loans (initial balance)
  startDate?: string; // Required for future loans (DD-MM-YYYY format)
  totalMonths?: number; // Required for future loans
  prepaymentExpected: number;
  comment: string;
}

// Database version constants
const CURRENT_DB_VERSION = 8;

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
    
    // Define schema for version 1 (Base)
    this.version(1).stores({
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
      liabilitiesProjection: "++id, liability_id, loanType_id",
    });

    // Version 7 (Previous)
    this.version(7).stores({
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
      liabilitiesProjection: "++id, liability_id, loanType_id",
    });

    // Version 8 (Current) - Schema changes for Liabilities
    this.version(CURRENT_DB_VERSION).stores({
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
      liabilitiesProjection: "++id, liability_id, loanType_id",
    }).upgrade(async (tx) => {
      // Migrate Liabilities
      await tx.table("liabilities").toCollection().modify(record => {
        // Rename loanTakenDate -> loanStartDate
        if (record.loanTakenDate && !record.loanStartDate) {
          record.loanStartDate = record.loanTakenDate;
        }
        // Default loanStartDate if missing
        if (!record.loanStartDate) {
          const today = new Date();
          record.loanStartDate = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
        }
        // Default totalMonths if missing
        if (!record.totalMonths) {
          record.totalMonths = 120; // Default to 10 years
        }
        
        // Remove old fields
        delete record.balance;
        delete record.emi;
        delete record.loanTakenDate;
      });

      // Migrate LiabilityProjections
      await tx.table("liabilitiesProjection").toCollection().modify(record => {
        // Remove newEmi
        delete record.newEmi;
        
        // Ensure future loans have required fields
        if (!record.liability_id) {
           if (!record.startDate) {
             const today = new Date();
             record.startDate = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
           }
           if (!record.totalMonths) {
             record.totalMonths = 120;
           }
        }
      });

      // Migrate AssetSubClasses
      await tx.table("assetSubClasses").toCollection().modify(record => {
        if (record.expectedReturns === undefined) {
          record.expectedReturns = 12; // Default to 12%
        }
      });
      
      logInfo(`Database upgraded to version ${CURRENT_DB_VERSION}`);
    });
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

// Initialize the database with data from data.json
export interface InitializationData {
  version?: number;
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
  liabilitiesProjection: LiabilityProjection[];
}

export function sanitizeData(data: InitializationData): InitializationData {
  const dataVersion = data.version || 0;
  
  // Log version mismatch if any
  if (dataVersion !== CURRENT_DB_VERSION) {
    logInfo(`Sanitizing data from version ${dataVersion} to ${CURRENT_DB_VERSION}`);
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
        newRecord.loanStartDate = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
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
    sanitized.liabilitiesProjection = sanitized.liabilitiesProjection.map((record: any) => {
      const newRecord = { ...record };
      delete newRecord.newEmi;
      
      // Ensure future loans have required fields
      if (!newRecord.liability_id) {
         if (!newRecord.startDate) {
           const today = new Date();
           newRecord.startDate = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
         }
         if (!newRecord.totalMonths) {
           newRecord.totalMonths = 120;
         }
      }
      return newRecord;
    });

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
        await db.assetSubClasses.bulkAdd(removeIds(sanitizedData.assetSubClasses));
        await db.goals.bulkAdd(removeIds(sanitizedData.goals));
        await db.accounts.bulkAdd(removeIds(sanitizedData.accounts));
        await db.income.bulkAdd(removeIds(sanitizedData.income));
        await db.cashFlow.bulkAdd(removeIds(sanitizedData.cashFlow));
        await db.assetsHoldings.bulkAdd(removeIds(sanitizedData.assetsHoldings));
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
