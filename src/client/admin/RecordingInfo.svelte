<script lang="ts">
	import iconRecording from "bootstrap-icons/icons/record-fill.svg?raw";
	import iconStopRecording from "bootstrap-icons/icons/stop-fill.svg?raw";
	import type { RecordingInfo, StorageInfo, StreamInfo } from "../../common/rpcInterface";

	import { _ } from "svelte-i18n";
	import { formatTime } from "../formatTime";
	import { formatSize } from "../storage/formatSize";

	export let label: string;
	export let recordingInfo: RecordingInfo | undefined;
	export let streamInfo: StreamInfo | undefined;
	export let storageInfo: StorageInfo | undefined = undefined;
	export let onStopClick: undefined | (() => void) = undefined;
	export let onRecordClick: undefined | (() => void) = undefined;

	$: recordedTime = recordingInfo ? (new Date(recordingInfo.updateTime).getTime() - new Date(recordingInfo.startTime).getTime()) / 1000 : 0;
	$: recordingBytesRate = recordingInfo && recordedTime > 0 ? recordingInfo.size / recordedTime : undefined;
	$: recordingTimeRemaining = recordingBytesRate && storageInfo ? (storageInfo.quota! - storageInfo.usage!) / recordingBytesRate : undefined;
</script>

{#if recordingInfo}
	<div class="flex">
		{@html iconRecording}
		<span>{label}</span>
		<button class="flex" on:click={onStopClick}>{@html iconStopRecording}</button>
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
{:else if streamInfo?.hasAudio || streamInfo?.hasVideo}
	<div class="flex">
		<span>{label}</span>
		<button class="flex" on:click={onRecordClick}>{@html iconRecording}</button>
	</div>
{/if}
