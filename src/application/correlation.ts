/**
 * Simple correlation ID generator.
 * Why: Part of the project directive for tracking requests.
 */
export function generateCorrelationId(): string {
	return `sync-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
