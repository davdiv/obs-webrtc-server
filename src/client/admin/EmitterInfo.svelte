<script lang="ts">
	import iconBroadcast from "bootstrap-icons/icons/broadcast.svg?raw";
	import iconRecording from "bootstrap-icons/icons/record-fill.svg?raw";
	import iconFile from "bootstrap-icons/icons/file.svg?raw";
	import iconRight from "bootstrap-icons/icons/chevron-right.svg?raw";
	import iconDown from "bootstrap-icons/icons/chevron-down.svg?raw";
	import { _ } from "svelte-i18n";
	import type { EmitterAdminInfo } from "../../common/rpcInterface";
	import Resolution from "../Resolution.svelte";
	import BatteryInfo from "../battery/BatteryInfo.svelte";
	import SpaceAvailable from "../storage/SpaceAvailable.svelte";
	import { formatSize } from "../storage/formatSize";

	export let emitterId: string;
	export let emitter: EmitterAdminInfo;

	let expandRecordedFiles = true;
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
	<Resolution resolution={emitter.emitterInfo?.videoResolution} hasAudio={emitter.emitterInfo?.streamInfo?.hasAudio} />
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
	{#if emitter.emitterInfo?.files && emitter.emitterInfo.files.length > 0}
		<!-- svelte-ignore a11y-invalid-attribute -->
		<a
			href="javascript:void(0)"
			class="flex"
			on:click|preventDefault={() => {
				expandRecordedFiles = !expandRecordedFiles;
			}}
		>
			{@html expandRecordedFiles ? iconDown : iconRight}
			<div>{emitter.emitterInfo.files.length} recorded file(s)</div>
		</a>
		{#if expandRecordedFiles}
			<div>
				{#each emitter.emitterInfo.files as file}
					<div class="flex">{@html iconFile}<span>{file.name} ({formatSize(file.size, $_)})</span></div>
				{/each}
			</div>
		{/if}
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
