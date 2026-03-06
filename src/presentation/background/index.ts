import { ALARM_NAME, ALARM_PERIOD_MINUTES, ACTION_SYNC_NOW } from "@domain/constants";
import { Effect, ManagedRuntime } from "effect";
import { SyncService } from "@application/sync.service";
import { BackgroundLive } from "../layers";

/**
 * Background script entry point.
 * Why: Presentation layer for Chrome Service Worker lifecycle.
 */

const runtime = ManagedRuntime.make(BackgroundLive);

function runSync(): void {
	void runtime.runPromise(SyncService.syncBookmarks());
}

// Schedule sync for every Monday at 9:00 AM
chrome.runtime.onInstalled.addListener(() => {
	void runtime.runPromise(
		Effect.logInfo("Extension installed, setting up alarm and initial sync."),
	);
	setupAlarm();
	runSync();
});

chrome.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name === ALARM_NAME) {
		void runtime.runPromise(Effect.logInfo("Alarm triggered, starting sync."));
		runSync();
	}
});

function setupAlarm(): void {
	const now = new Date();
	const nextMonday = new Date();
	const day = now.getDay();
	const daysUntilMonday = (1 + 7 - day) % 7;

	nextMonday.setDate(now.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
	nextMonday.setHours(9, 0, 0, 0);

	void runtime.runPromise(
		Effect.logInfo(`Scheduling next sync for: ${nextMonday.toLocaleString()}`),
	);

	void chrome.alarms.create(ALARM_NAME, {
		when: nextMonday.getTime(),
		periodInMinutes: ALARM_PERIOD_MINUTES,
	});
}

// Listen for manual trigger from popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
	if (request && typeof request === "object" && request.action === ACTION_SYNC_NOW) {
		void runtime.runPromise(Effect.logInfo("Manual sync triggered from popup."));
		void runtime.runPromise(SyncService.syncBookmarks()).then(
			() => sendResponse({ success: true }),
			() => sendResponse({ success: false }),
		);
		return true; // Keep channel open
	}
	return false;
});
