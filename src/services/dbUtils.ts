import { getAppData, setAppData } from './appData';
import { initializeDatabase } from './db';
// Sync Dexie data to Firestore
export const syncDexieToFirestore = async () => {
  // Read all tables and build InitializationData
  const data = {
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
  await setAppData(data);
  console.log('Dexie data synced to Firestore');
};

// Sync Firestore data to Dexie
export const syncFirestoreToDexie = async () => {
  const data = await getAppData();
  if (data) {
    await initializeDatabase(data);
    console.log('Firestore data synced to Dexie');
  } else {
    console.warn('No app data found in Firestore');
  }
};
import { db } from './db';

export const clearDatabase = async () => {
  try {
    // Get all table names from Dexie instance
    const tableNames = db.tables.map(table => table.name);
    
    // Clear all tables in a transaction
    await db.transaction('rw', tableNames, async () => {
      for (const tableName of tableNames) {
        await db.table(tableName).clear();
      }
    });
    
    // Remove the version flag
    localStorage.removeItem('dbVersion');
    
    console.log('Database cleared successfully');
  } catch (error) {
    console.error('Error clearing database:', error);
    throw error;
  }
};

export const getDatabaseStats = async () => {
  const stats: Record<string, number> = {};
  
  try {
    await db.transaction('r', db.tables, async () => {
      for (const table of db.tables) {
        stats[table.name] = await table.count();
      }
    });
  } catch (error) {
    console.error('Error getting database stats:', error);
  }
  
  return stats;
};

export const validateDatabase = async () => {
  const stats = await getDatabaseStats();
  const hasData = Object.values(stats).some(count => count > 0);
  return hasData;
};
