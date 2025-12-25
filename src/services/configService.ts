import { db } from "./db";

import { logError } from "./logger";

export const CONFIG_KEYS = {
  GEMINI_API_KEY: "GEMINI_API_KEY",
  GEMINI_MODEL: "GEMINI_MODEL",
  GOLD_API_KEY: "GOLD_API_KEY",
  GOLD_API_QUOTA: "GOLD_API_QUOTA",
  CHAT_PERMISSIONS: "CHAT_PERMISSIONS",
};

export const getAppConfig = async (key: string): Promise<string | null> => {
  try {
    const config = await db.configs.filter((c) => c.key === key).first();
    return config && typeof config.value === 'string' ? config.value : null;
  } catch (error) {
    console.error(`Failed to get config for ${key}`, error);
    return null;
  }
};

export const saveAppConfig = async (key: string, value: string): Promise<void> => {
  try {
    const existing = await db.configs.filter((c) => c.key === key).first();
    if (existing) {
      await db.configs.update(existing.id, { value });
    } else {
      await db.configs.add({ key, value } as any); // Cast to any because ID is auto-incremented
    }
  } catch (error) {
    logError(`Failed to save config for ${key}`, { error });
    throw error;
  }
};
