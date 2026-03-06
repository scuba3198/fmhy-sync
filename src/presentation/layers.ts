import { Layer } from "effect";
import { Correlation } from "@application/correlation.service";
import { SyncService } from "@application/sync.service";
import { BookmarksService } from "@infrastructure/bookmarks.service";
import { ChromeOffscreenService } from "@infrastructure/chrome-offscreen.service";
import { HttpService } from "@infrastructure/http.service";
import { Logger } from "@infrastructure/logger.service";
import { StorageService } from "@infrastructure/storage.service";

export const BackgroundLive = Layer.mergeAll(
	Logger.Default,
	Correlation.Default,
	HttpService.Default,
	StorageService.Default,
	BookmarksService.Default,
	ChromeOffscreenService.Default,
	SyncService.Default,
);

export const PopupLive = Layer.mergeAll(Logger.Default, StorageService.Default);

export const OffscreenLive = Layer.mergeAll(Logger.Default, Correlation.Default);
