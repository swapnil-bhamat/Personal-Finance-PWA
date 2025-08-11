import Dexie from 'dexie';
import type { Table } from 'dexie';

export interface Config {
  id: number;
  key: string;
  value: string | number | boolean | Record<string, unknown>;
}

// When creating a new config, id is optional
export type NewConfig = Omit<Config, 'id'> & { id?: number };

export interface AssetPurpose {
  id: number;
  name: string;
  type: string;
}

export interface LoanType {
  id: number;
  name: string;
  type: string;
  interestRate: number;
}

export interface Holder {
  id: number;
  name: string;
}

export interface SipType {
  id: number;
  name: string;
}

export interface Bucket {
  id: number;
  name: string;
}

export interface AssetClass {
  id: number;
  name: string;
}

export interface AssetSubClass {
  id: number;
  assetClasses_id: number;
  name: string;
  expectedReturns: number;
}

export interface Goal {
  id: number;
  name: string;
  priority: number;
  amountRequiredToday: number;
  durationInYears: number;
  assetPurpose_id: number;
}

export interface Account {
  id: number;
  bank: string;
  accountNumber: string;
  holders_id: number;
}

export interface Income {
  id: number;
  item: string;
  accounts_id: number;
  holders_id: number;
  monthly: string;
}

export interface CashFlow {
  id: number;
  item: string;
  accounts_id: number;
  holders_id: number;
  monthly: number;
  yearly: number;
  assetPurpose_id: number;
}

export interface AssetHolding {
  id: number;
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

export interface Liability {
  id: number;
  loanType_id: number;
  loanAmount: number;
  balance: number;
  emi: number;
}

export class AppDatabase extends Dexie {
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

  constructor() {
    super('financeDb');
    this.version(1).stores({
      configs: '++id, key',
      assetPurposes: 'id, type',
      loanTypes: 'id, type',
      holders: 'id',
      sipTypes: 'id',
      buckets: 'id',
      assetClasses: 'id',
      assetSubClasses: 'id, assetClasses_id',
      goals: 'id, assetPurpose_id',
      accounts: 'id, holders_id',
      income: 'id, accounts_id, holders_id',
      cashFlow: 'id, accounts_id, holders_id, assetPurpose_id',
      assetsHoldings: 'id, assetClasses_id, assetSubClasses_id, goals_id, holders_id, buckets_id',
      liabilities: 'id, loanType_id'
    });
  }
}

export const db = new AppDatabase();

// Initialize the database with data from data.json
interface InitializationData {
  configs: Record<string, string | number | boolean | Record<string, unknown>>;
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
      db.liabilities
    ];

    await db.transaction('rw', tables,
      async () => {
        // Clear existing data
        await Promise.all([
          db.configs.clear(),
          db.assetPurposes.clear(),
          db.loanTypes.clear(),
          db.holders.clear(),
          db.sipTypes.clear(),
          db.buckets.clear(),
          db.assetClasses.clear(),
          db.assetSubClasses.clear(),
          db.goals.clear(),
          db.accounts.clear(),
          db.income.clear(),
          db.cashFlow.clear(),
          db.assetsHoldings.clear(),
          db.liabilities.clear(),
        ]);

        // Insert new data
        for (const [key, value] of Object.entries(data.configs)) {
          await db.configs.add({ key, value } as Config);
        }
        await db.assetPurposes.bulkAdd(data.assetPurpose);
        await db.loanTypes.bulkAdd(data.loanType);
        await db.holders.bulkAdd(data.holders);
        await db.sipTypes.bulkAdd(data.sipTypes);
        await db.buckets.bulkAdd(data.buckets);
        await db.assetClasses.bulkAdd(data.assetClasses);
        await db.assetSubClasses.bulkAdd(data.assetSubClasses);
        await db.goals.bulkAdd(data.goals);
        await db.accounts.bulkAdd(data.accounts);
        await db.income.bulkAdd(data.income);
        await db.cashFlow.bulkAdd(data.cashFlow);
        await db.assetsHoldings.bulkAdd(data.assetsHoldings);
        await db.liabilities.bulkAdd(data.liabilities);
    });
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}
