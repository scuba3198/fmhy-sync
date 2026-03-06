import { Effect } from "effect";

export type LogData = Record<string, unknown>;

export class Logger extends Effect.Service<Logger>()("Logger", {
	accessors: true,
	effect: Effect.succeed({
		info: Effect.fn("Logger.info")((message: string, data?: LogData) =>
			data ? Effect.logInfo(message).pipe(Effect.annotateLogs(data)) : Effect.logInfo(message),
		),
		warn: Effect.fn("Logger.warn")((message: string, data?: LogData) =>
			data
				? Effect.logWarning(message).pipe(Effect.annotateLogs(data))
				: Effect.logWarning(message),
		),
		error: Effect.fn("Logger.error")((message: string, data?: LogData) =>
			data ? Effect.logError(message).pipe(Effect.annotateLogs(data)) : Effect.logError(message),
		),
	}),
}) {}
