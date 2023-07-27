const noop = () => {};
export const onAbort = (abortSignal: AbortSignal, fn: () => void): (() => void) => {
	if (abortSignal.aborted) {
		fn();
		return noop;
	} else {
		abortSignal.addEventListener("abort", fn);
		return () => abortSignal.removeEventListener("abort", fn);
	}
};

export const waitAbortSignal = (abortSignal: AbortSignal) => new Promise<void>((resolve) => onAbort(abortSignal, resolve));

export class AbortError extends Error {
	constructor() {
		super("AbortError");
	}
}

export const checkAbortSignal = (abortSignal: AbortSignal) => {
	if (abortSignal.aborted) {
		throw new AbortError();
	}
};

export const isAbortError = (error: any) => error instanceof AbortError || error.name === "AbortError";

export const subAbortController = (abortSignal: AbortSignal, subAbortController: AbortController) => {
	const removeListener = onAbort(abortSignal, () => subAbortController.abort());
	onAbort(subAbortController.signal, removeListener);
};
