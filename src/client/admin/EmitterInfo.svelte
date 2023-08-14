<script lang="ts">
	import iconBroadcast from "bootstrap-icons/icons/broadcast.svg?raw";
	import iconDown from "bootstrap-icons/icons/chevron-down.svg?raw";
	import iconRight from "bootstrap-icons/icons/chevron-right.svg?raw";
	import iconFile from "bootstrap-icons/icons/file.svg?raw";
	import iconRecording from "bootstrap-icons/icons/record-fill.svg?raw";
	import iconStopRecording from "bootstrap-icons/icons/stop-fill.svg?raw";
	import iconDelete from "bootstrap-icons/icons/trash.svg?raw";
	import iconUpload from "bootstrap-icons/icons/upload.svg?raw";
	import { _ } from "svelte-i18n";
	import type { EmitterAdminInfo, RpcServerInterface, ServerSentInfo } from "../../common/rpcInterface";
	import Resolution from "../Resolution.svelte";
	import BatteryInfo from "../battery/BatteryInfo.svelte";
	import SpaceAvailable from "../storage/SpaceAvailable.svelte";
	import { formatSize } from "../storage/formatSize";
	import { formatTime } from "../formatTime";
	import type { CallMethod } from "../../common/jsonRpc";

	export let emitterId: string;
	export let emitter: EmitterAdminInfo;
	export let socketApi: CallMethod<RpcServerInterface, ServerSentInfo>;

	$: recordingInfo = emitter?.emitterInfo?.recording;
	$: storageInfo = emitter?.emitterInfo?.storageInfo;

	$: recordedTime = recordingInfo ? (new Date(recordingInfo.updateTime).getTime() - new Date(recordingInfo.startTime).getTime()) / 1000 : 0;
	$: recordingBytesRate = recordingInfo && recordedTime > 0 ? recordingInfo.size / recordedTime : undefined;
	$: recordingTimeRemaining = recordingBytesRate && storageInfo ? (storageInfo.quota! - storageInfo.usage!) / recordingBytesRate : undefined;

	let expandRecordedFiles = true;
</script>

<div class="card">
	<div class="flex">
		{emitter.emitterShortId} ({emitter.emitterIP})
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
	{#if recordingInfo}
		<div class="flex">
			{@html iconRecording}
			<span>{$_("recording")}</span>
			<button class="flex" on:click={() => socketApi("toggleRecording", { emitterId, action: "stop" })}>{@html iconStopRecording}</button>
		</div>
		<div class="flex">
			<span>{formatTime(recordedTime, $_)}</span>
			<span>{formatSize(recordingInfo.size, $_)}</span>
		</div>
		<div class="flex">
			{#if recordingBytesRate != null}
				<div>{formatSize(Math.round(recordingBytesRate), $_)}/s</div>
			{/if}
			{#if recordingTimeRemaining != null}
				<div>{formatTime(recordingTimeRemaining, $_)}</div>
			{/if}
		</div>
	{:else if emitter?.emitterInfo?.streamInfo?.hasAudio || emitter?.emitterInfo?.streamInfo?.hasVideo}
		<button class="flex" on:click={() => socketApi("toggleRecording", { emitterId, action: "start" })}>{@html iconRecording}</button>
	{/if}
	{#if emitter.receiverInfo?.videoDelay}
		<div>{$_("videoDelay", { values: { delay: Math.round(emitter.receiverInfo?.videoDelay) } })}</div>
	{/if}
	{#if emitter.receiverInfo?.audioDelay}
		<div>{$_("audioDelay", { values: { delay: Math.round(emitter.receiverInfo?.audioDelay) } })}</div>
	{/if}
	{#if emitter.emitterInfo?.roundTripTime}
		<div>{$_("roundTripTime", { values: { value: Math.round(emitter.emitterInfo?.roundTripTime * 1000) / 1000 } })}</div>
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
					<div class="flex">
						{@html iconFile}<span>{file.name} ({formatSize(file.size, $_)})</span><button class="flex" on:click={() => socketApi("uploadFile", { emitterId, fileName: file.name })}
							>{@html iconUpload}</button
						><button class="flex" on:click={() => socketApi("removeFile", { emitterId, fileName: file.name })}>{@html iconDelete}</button>
					</div>
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
