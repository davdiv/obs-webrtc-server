import type { OnUseArgument } from "@amadeus-it-group/tansu";
import { derived, readable } from "@amadeus-it-group/tansu";
import equal from "fast-deep-equal";
import { asyncSerialDerived } from "../../common/asyncSerialDerived";
import type { BatteryInfo } from "../../common/rpcInterface";

const battery$ = asyncSerialDerived(readable(false), {
	async derive(unused, set: OnUseArgument<any>) {
		set(undefined);
		try {
			const battery = await (navigator as any).getBattery?.();
			set(battery);
		} catch {
			// ignore the error
		}
	},
});

export const batteryInfo$ = derived(
	battery$,
	{
		derive: (battery, set: OnUseArgument<BatteryInfo | undefined>) => {
			if (!battery) {
				set(undefined);
				return;
			}
			const update = () => {
				set({
					charging: battery.charging,
					chargingTime: battery.chargingTime,
					dischargingTime: battery.dischargingTime,
					level: battery.level,
				});
			};
			battery.addEventListener("chargingchange", update);
			battery.addEventListener("levelchange", update);
			battery.addEventListener("chargingtimechange", update);
			battery.addEventListener("dischargingtimechange", update);
			update();
			return () => {
				battery.removeEventListener("chargingchange", update);
				battery.removeEventListener("levelchange", update);
				battery.removeEventListener("chargingtimechange", update);
				battery.removeEventListener("dischargingtimechange", update);
			};
		},
		equal,
	},
	undefined,
);
