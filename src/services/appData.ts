import { InitializationData } from './db';
import { readFile, writeFile, findFile, uploadJsonFile } from './googleDrive';

const APP_DATA_FILENAME = 'personal_finance_data.json';

export async function getAppData() {
  try {
    const file = await findFile(APP_DATA_FILENAME);
    if (file) {
      const content = await readFile<string>(file.id);
      return content ? JSON.parse(content as string) : null;
    }
    return null;
  } catch (error) {
    console.error('Error reading app data:', error);
    return null;
  }
}

export async function setAppData(data: InitializationData) {
  try {
    const file = await findFile(APP_DATA_FILENAME);
    const content = JSON.stringify(data, null, 2);
    if (file) {
      await writeFile(file.id, content);
    } else {
      await uploadJsonFile(content, APP_DATA_FILENAME);
    }
  } catch (error) {
    console.error('Error writing app data:', error);
    throw error;
  }
}
