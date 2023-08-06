import type { StoresInputValues } from "@amadeus-it-group/tansu";
import type { _ } from "svelte-i18n";

export const formatSize = (size: number, $t: StoresInputValues<typeof _>) => {
	if (size > 1000000000) {
		return $t("gigabyte", { values: { size: Math.round(size / 1000000000) } });
	} else if (size > 1000000) {
		return $t("megabyte", { values: { size: Math.round(size / 1000000) } });
	} else if (size > 1000) {
		return $t("kilobyte", { values: { size: Math.round(size / 1000) } });
	}
	return $t("byte", { values: { size } });
};
