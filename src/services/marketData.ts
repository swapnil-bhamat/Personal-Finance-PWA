import { logError } from "./logger";
import { getAppConfig, CONFIG_KEYS, saveAppConfig } from "./configService";

// const GOLD_API_KEY = import.meta.env.VITE_GOLD_API_KEY; // Removed in favor of dynamic config

const CACHE_KEYS = {
  GOLD: "market_data_gold",
  SILVER: "market_data_silver",
  DAILY_USAGE: "market_data_daily_usage",
};

// Cache duration in milliseconds
const CACHE_DURATION = {
  GOLD: 24 * 60 * 60 * 1000, // 24 hours
  SILVER: 24 * 60 * 60 * 1000, // 24 hours
};

interface CachedData<T> {
  data: T;
  timestamp: number;
}

interface DailyUsageStats {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface GoldData {
  price_gram_24k: number;
  price_gram_22k: number;
  currency: string;
  timestamp: number;
  city: string;
}

export interface SilverData {
  price_gram_24k: number;
  currency: string;
  timestamp: number;
  city: string;
}

const getFromCache = <T>(key: string, duration: number): T | null => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const parsed: CachedData<T> = JSON.parse(item);
    const now = Date.now();

    if (now - parsed.timestamp > duration) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch (e) {
    console.error("Error reading from cache", e);
    return null;
  }
};

const setCache = <T>(key: string, data: T) => {
  try {
    const cacheItem: CachedData<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (e) {
    console.error("Error writing to cache", e);
  }
};

const getDailyUsage = (): DailyUsageStats => {
  try {
    const item = localStorage.getItem(CACHE_KEYS.DAILY_USAGE);
    const today = new Date().toISOString().split("T")[0];
    if (item) {
      const stats: DailyUsageStats = JSON.parse(item);
      if (stats.date === today) {
        return stats;
      }
    }
    return { date: today, count: 0 };
  } catch (e) {
    return { date: new Date().toISOString().split("T")[0], count: 0 };
  }
};

export const checkDailyLimit = async (): Promise<void> => {
  const limitStr = await getAppConfig(CONFIG_KEYS.GOLD_API_DAILY_LIMIT);
  const limit = parseInt(limitStr || "3", 10);
  const usage = getDailyUsage();

  if (usage.count >= limit) {
    throw new Error(`Daily limit of ${limit} requests reached.`);
  }
};

const incrementDailyUsage = () => {
  const usage = getDailyUsage();
  usage.count += 1;
  localStorage.setItem(CACHE_KEYS.DAILY_USAGE, JSON.stringify(usage));
};

export const getDailyUsageCount = (): number => {
    return getDailyUsage().count;
};


export const fetchGoldData = async (forceRefresh = false, cityOverride?: string): Promise<GoldData | null> => {
  const apiKey = await getAppConfig(CONFIG_KEYS.GOLD_API_KEY);
  if (!apiKey) {
    console.warn("RapidAPI key is missing");
    return null;
  }

  const city = cityOverride || (await getAppConfig(CONFIG_KEYS.GOLD_API_CITY)) || "Nagpur";

  if (!forceRefresh) {
    const cached = getFromCache<GoldData>(CACHE_KEYS.GOLD, CACHE_DURATION.GOLD);
    if (cached && cached.city === city) return cached;
  }

  if (forceRefresh) {
     await checkDailyLimit();
  }

  try {
    const response = await fetch(`https://indian-gold-and-silver-price.p.rapidapi.com/gold?city=${city}`, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "indian-gold-and-silver-price.p.rapidapi.com",
        "x-rapidapi-key": apiKey,
      },
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.status) {
        throw new Error("API returned invalid status");
    }

    /*
    Response:
    {
      "status": true,
      "22k": 13940,
      "24k": 14637,
      "city": "Nagpur",
      "unit_gram": 1
    }
    */
    
    // API returns price per 1 gram (unit_gram: 1).
    // If unit_gram varies, we might need to normalize, but standard response seems to be 1g.
    
    const pricePerGram24k = data["24k"];
    const pricePerGram22k = data["22k"];
    
    // Calculate others if needed
    // Removed 21k and 18k as per request

    const result: GoldData = {
      price_gram_24k: pricePerGram24k,
      price_gram_22k: pricePerGram22k,
      currency: "INR",
      timestamp: Date.now(),
      city: data.city,
    };

    setCache(CACHE_KEYS.GOLD, result);
    if (forceRefresh) incrementDailyUsage();
    
    return result;
  } catch (error) {
    logError("Error fetching Gold data", { error });
    throw error;
  }
};

export const fetchSilverData = async (forceRefresh = false, cityOverride?: string): Promise<SilverData | null> => {
  const apiKey = await getAppConfig(CONFIG_KEYS.GOLD_API_KEY);
  if (!apiKey) {
    return null;
  }

  const city = cityOverride || (await getAppConfig(CONFIG_KEYS.GOLD_API_CITY)) || "Nagpur";

  if (!forceRefresh) {
    const cached = getFromCache<SilverData>(CACHE_KEYS.SILVER, CACHE_DURATION.SILVER);
    if (cached && cached.city === city) return cached;
  }

  // Note: Usually Gold and Silver might be fetched together or separately. 
  // If fetched separately, we burn 2 requests? 
  // User said "Keep hard stop at 3 request per day". 
  // If we fetch both, it's 2 requests. 
  // For now, let's treat them as separate requests but share the limit.
  // We should probably check limit here too if forceRefresh.
  
  if (forceRefresh) {
      // If we just fetched Gold and incremented, we might hit limit for Silver if limit is very low (e.g. 1).
      // But limit is 3.
      await checkDailyLimit();
  }

  try {
    const response = await fetch(`https://indian-gold-and-silver-price.p.rapidapi.com/silver?city=${city}`, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "indian-gold-and-silver-price.p.rapidapi.com",
        "x-rapidapi-key": apiKey,
      },
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
     if (!data.status) {
        throw new Error("API returned invalid status");
    }

    /*
    Response:
    {
      "status": true,
      "price": 300,
      "city": "Nagpur",
      "currency": "INR",
      "unit_gram": 1
    }
    */

    const result: SilverData = {
      price_gram_24k: data.price,
      currency: data.currency,
      timestamp: Date.now(),
      city: data.city,
    };

    setCache(CACHE_KEYS.SILVER, result);
    if (forceRefresh) incrementDailyUsage();

    return result;
  } catch (error) {
    logError("Error fetching Silver data", { error });
    throw error;
  }
};
