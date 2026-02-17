import { STORAGE_KEY_COUNT, STORAGE_KEY_LAST_SYNC, STORAGE_KEY_STATUS } from "@domain/constants";
import { logger } from "./logger";

/**
 * Infrastructure wrapper for chrome.storage.local.
 * Why: Dependency inversion and centralized storage access.
 */
export class StorageService {
	/**
	 * Gets sync-related data from storage.
	 */
	async getSyncData(): Promise<Record<string, unknown>> {
		try {
			const data = await chrome.storage.local.get([
				STORAGE_KEY_LAST_SYNC,
				STORAGE_KEY_STATUS,
				STORAGE_KEY_COUNT,
			]);
			return data;
		} catch (error) {
			logger.error({ error }, "Failed to get sync data from storage");
			throw error;
		}
	}

	/**
	 * Sets the last sync timestamp and status.
	 */
	async saveSyncSuccess(timestamp: string, status: string): Promise<void> {
		try {
			await chrome.storage.local.set({
				[STORAGE_KEY_LAST_SYNC]: timestamp,
				[STORAGE_KEY_STATUS]: status,
				[STORAGE_KEY_COUNT]: "Categorized",
			});
		} catch (error) {
			logger.error({ error }, "Failed to save sync success to storage");
			throw error;
		}
	}

	/**
	 * Updates the status message in storage.
	 */
	async updateStatus(status: string): Promise<void> {
		try {
			await chrome.storage.local.set({ [STORAGE_KEY_STATUS]: status });
		} catch (error) {
			logger.error({ error }, "Failed to update status in storage");
			throw error;
		}
	}
}

export const storageService = new StorageService();
