import { asReadable, computed, writable } from "@amadeus-it-group/tansu";

export const storeMap = <K, V>() => {
	const store$ = writable({});
	const map = new Map<K, V>();
	return asReadable(
		computed(() => {
			store$();
			return [...map.values()];
		}),
		{
			add(key: K, value: V) {
				if (map.has(key)) {
					throw new Error("Key already present");
				}
				map.set(key, value);
				store$.set({});
				let removed = false;
				return () => {
					if (!removed) {
						removed = true;
						map.delete(key);
						store$.set({});
					}
				};
			},
			get(key: K) {
				return map.get(key);
			},
		},
	);
};
