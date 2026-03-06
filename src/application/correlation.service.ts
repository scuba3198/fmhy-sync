import { Effect, FiberRef, Option, Schema } from "effect";

export const CorrelationId = Schema.String.pipe(Schema.brand("@FMHY/CorrelationId"));
export type CorrelationId = Schema.Schema.Type<typeof CorrelationId>;

function makeCorrelationId(): CorrelationId {
	return `sync-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as CorrelationId;
}

export class Correlation extends Effect.Service<Correlation>()("Correlation", {
	accessors: true,
	effect: Effect.sync(() => {
		const fiberRef = FiberRef.unsafeMake<Option.Option<CorrelationId>>(Option.none());

		const get = Effect.fn("Correlation.get")(() => FiberRef.get(fiberRef));

		const set = Effect.fn("Correlation.set")((correlationId: CorrelationId) =>
			FiberRef.set(fiberRef, Option.some(correlationId)),
		);

		const clear = Effect.fn("Correlation.clear")(() => FiberRef.set(fiberRef, Option.none()));

		const makeNew = Effect.fn("Correlation.makeNew")(() => Effect.sync(makeCorrelationId));

		return { fiberRef, get, set, clear, makeNew };
	}),
}) {}

export function withCorrelationId<A, E, R>(
	correlationId: CorrelationId,
	self: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R | Correlation> {
	return Effect.gen(function* () {
		const correlation = yield* Correlation;
		return yield* Effect.annotateLogs({ correlationId })(
			Effect.locally(self, correlation.fiberRef, Option.some(correlationId)),
		);
	});
}

export function withNewCorrelationId<A, E, R>(
	self: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R | Correlation> {
	return Effect.gen(function* () {
		const correlation = yield* Correlation;
		const correlationId = yield* correlation.makeNew();
		return yield* withCorrelationId(correlationId, self);
	});
}
