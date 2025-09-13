import { logError, logInfo } from './logger';
import { db } from './db';
import type { InitializationData } from './db';

const DEMO_DATA_PATH = '/public/data.json';

export async function initializeDemoMode(): Promise<boolean> {
  try {
    const response = await fetch(DEMO_DATA_PATH);
    if (!response.ok) {
      throw new Error('Failed to load demo data');
    }

    const data: InitializationData = await response.json();
    await importDemoData(data);
    logInfo('Successfully initialized demo mode');
    return true;
  } catch (error) {
    logError('Failed to initialize demo mode:', { error });
    return false;
  }
}

async function importDemoData(data: InitializationData): Promise<void> {
  try {
    await db.transaction('rw', db.tables, async () => {
      // Clear existing data
      await Promise.all(db.tables.map(table => table.clear()));

      // Import demo data
      if (data.configs?.length) await db.configs.bulkAdd(data.configs);
      if (data.assetPurpose?.length) await db.assetPurposes.bulkAdd(data.assetPurpose);
      if (data.loanType?.length) await db.loanTypes.bulkAdd(data.loanType);
      if (data.holders?.length) await db.holders.bulkAdd(data.holders);
      if (data.sipTypes?.length) await db.sipTypes.bulkAdd(data.sipTypes);
      if (data.buckets?.length) await db.buckets.bulkAdd(data.buckets);
      if (data.assetClasses?.length) await db.assetClasses.bulkAdd(data.assetClasses);
      if (data.assetSubClasses?.length) await db.assetSubClasses.bulkAdd(data.assetSubClasses);
      if (data.goals?.length) await db.goals.bulkAdd(data.goals);
      if (data.accounts?.length) await db.accounts.bulkAdd(data.accounts);
      if (data.income?.length) await db.income.bulkAdd(data.income);
      if (data.cashFlow?.length) await db.cashFlow.bulkAdd(data.cashFlow);
      if (data.assetsHoldings?.length) await db.assetsHoldings.bulkAdd(data.assetsHoldings);
      if (data.liabilities?.length) await db.liabilities.bulkAdd(data.liabilities);
    });
    logInfo('Successfully imported demo data');
  } catch (error) {
    logError('Failed to import demo data:', { error });
    throw error;
  }
}