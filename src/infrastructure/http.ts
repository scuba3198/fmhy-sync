import { FMHY_URL } from "@domain/constants";
import { logger } from "./logger";

/**
 * Infrastructure wrapper for HTTP requests.
 * Why: Centralized fetch logic with logging.
 */
export class HttpService {
	/**
	 * Fetches the raw HTML content from the FMHY source.
	 */
	async fetchBookmarksHtml(): Promise<string> {
		try {
			const response = await fetch(FMHY_URL);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status.toString()}`);
			}
			return await response.text();
		} catch (error) {
			logger.error({ error, url: FMHY_URL }, "Failed to fetch FMHY bookmarks");
			throw error;
		}
	}
}

export const httpService = new HttpService();
