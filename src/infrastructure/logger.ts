import pino from "pino";

/**
 * Pino logger configured for the browser environment.
 * Why: Structured logging as mandated by the project directive.
 */
export const logger = pino({
	browser: {
		asObject: true,
	},
	level: "info",
	base: {
		env: (globalThis as any).process?.env?.NODE_ENV ?? "development",
		version: "1.1.4",
	},
});

/**
 * Creates a child logger with a correlationId.
 * Why: To track a single request's lifecycle.
 */
export function createScopedLogger(correlationId: string) {
	return logger.child({ correlationId });
}
