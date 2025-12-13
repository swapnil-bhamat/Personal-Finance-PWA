/**
 * Utility for securely storing sensitive data in localStorage.
 * Note: This uses simple obfuscation (Base64 + XOR) to prevent plain-text storage.
 * It is NOT equivalent to server-side encryption but satisfies the requirement
 * to not store the API key as plain text in the browser.
 */

const DATA_PREFIX = 'pf_sec_';
const SALT = 'personal_finance_pwa_salt_2025';

const xorEncrypt = (text: string): string => {
  return text.split('').map((char, i) => {
    return String.fromCharCode(char.charCodeAt(0) ^ SALT.charCodeAt(i % SALT.length));
  }).join('');
};

export const saveEncrypted = (key: string, value: string): void => {
  if (!value) {
    localStorage.removeItem(DATA_PREFIX + key);
    return;
  }
  try {
    const obscured = xorEncrypt(value);
    const stored = btoa(obscured); // Base64 encode
    localStorage.setItem(DATA_PREFIX + key, stored);
  } catch (e) {
    console.error("Failed to save encrypted data", e);
  }
};

export const getDecrypted = (key: string): string | null => {
  const stored = localStorage.getItem(DATA_PREFIX + key);
  if (!stored) return null;
  
  try {
    const obscured = atob(stored); // Base64 decode
    return xorEncrypt(obscured); // XOR is reversible
  } catch (e) {
    console.error("Failed to decrypt data", e);
    return null;
  }
};
