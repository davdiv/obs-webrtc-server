import type { _ } from "svelte-i18n";
import type { StoresInputValues } from "@amadeus-it-group/tansu";

export const formatTime = (value: number, $t: StoresInputValues<typeof _>) => {
	if (value > 3600) {
		return $t("hours", { values: { value: Math.round(value / 3600) } });
	} else if (value > 60) {
		return $t("minutes", { values: { value: Math.round(value / 60) } });
	}
	return $t("seconds", { values: { value } });
};
