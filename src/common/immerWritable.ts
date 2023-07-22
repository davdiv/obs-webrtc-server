import type { StoreOptions, Updater, WritableSignal } from "@amadeus-it-group/tansu";
import { asReadable, writable } from "@amadeus-it-group/tansu";
import { produce } from "immer";

export const simpleEqualOption = { equal: Object.is };

export const immerWritable = <T>(initialValue: T, options: Pick<StoreOptions<T>, "equal"> = simpleEqualOption): WritableSignal<T> => {
	const res = writable(initialValue, options);
	return asReadable(res, {
		set: res.set,
		update: (updater: Updater<T>) => res.update((value) => produce(value, updater)),
	});
};
