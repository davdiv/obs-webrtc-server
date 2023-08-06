<script lang="ts">
	import iconBroadcast from "bootstrap-icons/icons/broadcast.svg?raw";
	import iconRecording from "bootstrap-icons/icons/record-fill.svg?raw";
	import { _ } from "svelte-i18n";
	import type { EmitterAdminInfo } from "../../common/rpcInterface";
	import Resolution from "../Resolution.svelte";
	import BatteryInfo from "../battery/BatteryInfo.svelte";
	import SpaceAvailable from "../storage/SpaceAvailable.svelte";

	export let emitterId: string;
	export let emitter: EmitterAdminInfo;
</script>

<div class="card">
	<div class="flex">
		{emitterId} ({emitter.emitterIP})
	</div>
	{#if emitter.receiverInfo?.obsActive}
		<div class="flex">
			{@html iconBroadcast}
			<span>{$_("live")}</span>
		</div>
	{/if}
	<Resolution resolution={emitter.emitterInfo?.videoResolution} />
	<BatteryInfo batteryInfo={emitter.emitterInfo?.batteryInfo} />
	<SpaceAvailable storageInfo={emitter.emitterInfo?.storageInfo} />
	{#if emitter.emitterInfo?.recording}
		<div class="flex">
			{@html iconRecording}
			<span>{$_("recording")}</span>
		</div>
	{/if}
	{#if emitter.receiverInfo?.videoDelay}
		<div>{$_("videoDelay", { values: { delay: Math.round(emitter.receiverInfo?.videoDelay) } })}</div>
	{/if}
	{#if emitter.receiverInfo?.audioDelay}
		<div>{$_("audioDelay", { values: { delay: Math.round(emitter.receiverInfo?.audioDelay) } })}</div>
	{/if}
</div>

<style>
	.card {
		margin: 0.5em;
		background-color: white;
		color: black;
		border: 1px solid black;
		padding: 0.5em;
		border-radius: 0.25rem;
	}
</style>
