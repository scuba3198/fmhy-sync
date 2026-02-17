import { syncService } from "@application/sync.service";
import { ALARM_NAME, ALARM_PERIOD_MINUTES, ACTION_SYNC_NOW } from "@domain/constants";
import { logger } from "@infrastructure/logger";

/**
 * Background script entry point.
 * Why: Presentation layer for Chrome Service Worker lifecycle.
 */

// Schedule sync for every Monday at 9:00 AM
chrome.runtime.onInstalled.addListener(() => {
	logger.info("Extension installed, setting up alarm and initial sync.");
	setupAlarm();
	void syncService.syncBookmarks();
});

chrome.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name === ALARM_NAME) {
		logger.info("Alarm triggered, starting sync.");
		void syncService.syncBookmarks();
	}
});

function setupAlarm(): void {
	const now = new Date();
	const nextMonday = new Date();
	const day = now.getDay();
	const daysUntilMonday = (1 + 7 - day) % 7;

	nextMonday.setDate(now.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
	nextMonday.setHours(9, 0, 0, 0);

	logger.info(`Scheduling next sync for: ${nextMonday.toLocaleString()}`);

	void chrome.alarms.create(ALARM_NAME, {
		when: nextMonday.getTime(),
		periodInMinutes: ALARM_PERIOD_MINUTES,
	});
}

// Listen for manual trigger from popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
	if (request && typeof request === "object" && request.action === ACTION_SYNC_NOW) {
		logger.info("Manual sync triggered from popup.");
		void syncService.syncBookmarks().then(() => {
			sendResponse({ success: true });
		});
		return true; // Keep channel open
	}
	return false;
});
