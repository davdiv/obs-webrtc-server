import type { OnUseArgument, ReadableSignal, StoreOptions, StoresInput, StoresInputValues } from "@amadeus-it-group/tansu";
import { asReadable, derived } from "@amadeus-it-group/tansu";
import { checkAbortSignal, isAbortError } from "./abortUtils";
import { stringifyError } from "./stringifyError";

export type AsyncReadableSignal<T> = ReadableSignal<T> & { asyncOperation?: () => Promise<void> };

export function asyncSerialDerived<T, S extends StoresInput>(
	store: S,
	options: { derive: (value: StoresInputValues<S>, set: OnUseArgument<T | undefined>, abortSignal: AbortSignal) => void | Promise<void>; equal?: StoreOptions<T | undefined>["equal"] },
): AsyncReadableSignal<T | undefined>;
export function asyncSerialDerived<T, S extends StoresInput>(
	store: S,
	options: { derive: (value: StoresInputValues<S>, set: OnUseArgument<T>, abortSignal: AbortSignal) => void | Promise<void>; initialValue: T; equal?: StoreOptions<T>["equal"] },
): AsyncReadableSignal<T>;
export function asyncSerialDerived<T, S extends StoresInput>(
	store: S,
	{
		derive,
		initialValue,
		equal,
	}: { derive: (value: StoresInputValues<S>, set: OnUseArgument<T>, abortSignal: AbortSignal) => void | Promise<void>; initialValue?: T; equal?: StoreOptions<T>["equal"] },
): AsyncReadableSignal<T> {
	let currentOperation = Promise.resolve();

	return asReadable(
		derived(
			store,
			{
				derive: (value, set) => {
					set(initialValue as T);
					const abortController = new AbortController();
					currentOperation = currentOperation.then(async () => {
						try {
							checkAbortSignal(abortController.signal);
							await derive(value, set, abortController.signal);
						} catch (error: any) {
							if (!isAbortError(error)) {
								// TODO: report exceptions
								console.log(`asyncSerialDerived error: ${stringifyError(error)}`);
								console.log(error.stack);
							}
						}
					});
					return () => abortController.abort();
				},
				equal,
			},
			initialValue as T,
		),
		{
			asyncOperation: async () => currentOperation,
		},
	);
}
