<script lang="ts">
	import batteryCharging from "bootstrap-icons/icons/battery-charging.svg?raw";
	import battery from "bootstrap-icons/icons/battery.svg?raw";
	import { _ } from "svelte-i18n";
	import type { BatteryInfo } from "../../common/rpcInterface";
	import { formatTime } from "../formatTime";

	export let batteryInfo: BatteryInfo | undefined;
</script>

{#if batteryInfo}
	<div class="flex">
		{@html batteryInfo.charging ? batteryCharging : battery}
		<div>{Math.round(batteryInfo.level * 100)} %</div>
		{#if batteryInfo.charging}
			{#if batteryInfo.chargingTime > 0 && batteryInfo.chargingTime < Infinity}
				<div>({formatTime(batteryInfo.chargingTime, $_)})</div>
			{/if}
		{:else if batteryInfo.dischargingTime >= 0 && batteryInfo.dischargingTime < Infinity}
			<div>({formatTime(batteryInfo.dischargingTime, $_)})</div>
		{/if}
	</div>
{/if}
