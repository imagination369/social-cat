import { db } from './db';
import { apiCredentialsTable } from './schema';
import { encrypt, decrypt } from './crypto';
import { eq } from 'drizzle-orm';

// In-memory cache for credentials (clears on server restart)
const credentialsCache = new Map<string, { value: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get a credential value by key
 * Falls back to environment variable if not in database
 */
export async function getCredential(key: string): Promise<string | undefined> {
  // Check cache first
  const cached = credentialsCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }

  try {
    // Try to get from database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (db as any)
      .select()
      .from(apiCredentialsTable)
      .where(eq(apiCredentialsTable.key, key))
      .limit(1);

    if (result && result.length > 0) {
      const decrypted = await decrypt(result[0].value);
      if (decrypted) {
        // Cache the result
        credentialsCache.set(key, { value: decrypted, timestamp: Date.now() });
        return decrypted;
      }
    }
  } catch (error) {
    console.error(`Error fetching credential ${key} from database:`, error);
  }

  // Fallback to environment variable
  const envValue = process.env[key];
  if (envValue) {
    return envValue;
  }

  return undefined;
}

/**
 * Get multiple credentials at once
 */
export async function getCredentials(keys: string[]): Promise<Record<string, string | undefined>> {
  const result: Record<string, string | undefined> = {};

  await Promise.all(
    keys.map(async (key) => {
      result[key] = await getCredential(key);
    })
  );

  return result;
}

/**
 * Save or update a credential
 */
export async function setCredential(key: string, value: string, platform: string): Promise<void> {
  const encrypted = await encrypt(value);
  if (!encrypted) {
    throw new Error('Failed to encrypt credential');
  }

  try {
    // Check if credential exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (db as any)
      .select()
      .from(apiCredentialsTable)
      .where(eq(apiCredentialsTable.key, key))
      .limit(1);

    if (existing && existing.length > 0) {
      // Update existing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any)
        .update(apiCredentialsTable)
        .set({
          value: encrypted,
          updatedAt: new Date(),
        })
        .where(eq(apiCredentialsTable.key, key));
    } else {
      // Insert new
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).insert(apiCredentialsTable).values({
        key,
        value: encrypted,
        platform,
      });
    }

    // Clear cache for this key
    credentialsCache.delete(key);
  } catch (error) {
    console.error(`Error saving credential ${key}:`, error);
    throw error;
  }
}

/**
 * Delete a credential
 */
export async function deleteCredential(key: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .delete(apiCredentialsTable)
      .where(eq(apiCredentialsTable.key, key));

    // Clear cache
    credentialsCache.delete(key);
  } catch (error) {
    console.error(`Error deleting credential ${key}:`, error);
    throw error;
  }
}

/**
 * Get all credentials for a platform
 */
export async function getPlatformCredentials(platform: string): Promise<Record<string, string>> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await (db as any)
      .select()
      .from(apiCredentialsTable)
      .where(eq(apiCredentialsTable.platform, platform));

    const credentials: Record<string, string> = {};
    for (const row of results) {
      const decrypted = await decrypt(row.value);
      if (decrypted) {
        credentials[row.key] = decrypted;
      }
    }

    return credentials;
  } catch (error) {
    console.error(`Error fetching credentials for platform ${platform}:`, error);
    return {};
  }
}

/**
 * Clear the credentials cache (useful for testing or forcing refresh)
 */
export function clearCredentialsCache(): void {
  credentialsCache.clear();
}
