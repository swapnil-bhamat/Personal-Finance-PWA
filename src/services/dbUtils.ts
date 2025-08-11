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
