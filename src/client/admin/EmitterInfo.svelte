<script lang="ts">
	import iconBroadcast from "bootstrap-icons/icons/broadcast.svg?raw";
	import iconDown from "bootstrap-icons/icons/chevron-down.svg?raw";
	import iconRight from "bootstrap-icons/icons/chevron-right.svg?raw";
	import iconFile from "bootstrap-icons/icons/file.svg?raw";
	import iconDelete from "bootstrap-icons/icons/trash.svg?raw";
	import iconUpload from "bootstrap-icons/icons/upload.svg?raw";
	import iconFileCheck from "bootstrap-icons/icons/file-check.svg?raw";
	import { _ } from "svelte-i18n";
	import type { CallMethod } from "../../common/jsonRpc";
	import type { EmitterAdminInfo, RpcServerInterface, ServerSentAdminInfo, ServerSentInfo } from "../../common/rpcInterface";
	import Resolution from "../Resolution.svelte";
	import BatteryInfo from "../battery/BatteryInfo.svelte";
	import SpaceAvailable from "../storage/SpaceAvailable.svelte";
	import { formatSize } from "../storage/formatSize";
	import RecordingInfo from "./RecordingInfo.svelte";
	import TransformImage from "../TransformImage.svelte";

	export let emitterId: string;
	export let emitter: EmitterAdminInfo;
	export let socketApi: CallMethod<RpcServerInterface, ServerSentInfo>;
	export let files: ServerSentAdminInfo["files"];

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
	<BatteryInfo batteryInfo={emitter.emitterInfo?.batteryInfo} />
	<SpaceAvailable storageInfo={emitter.emitterInfo?.storageInfo} />
	<Resolution resolution={emitter.emitterInfo?.videoResolution} hasAudio={emitter.emitterInfo?.streamInfo?.hasAudio} />
	<RecordingInfo
		label={$_("emitterRecording")}
		recordingInfo={emitter.emitterInfo?.recording}
		streamInfo={emitter.emitterInfo?.streamInfo}
		storageInfo={emitter.emitterInfo?.storageInfo}
		onRecordClick={() => socketApi("toggleRecording", { emitterId, emitter: true, action: "start" })}
		onStopClick={() => socketApi("toggleRecording", { emitterId, emitter: true, action: "stop" })}
	/>
	<Resolution resolution={emitter.receiverInfo?.videoResolution} hasAudio={emitter.emitterInfo?.streamInfo?.hasAudio} />
	{#if emitter.receiverInfo}
		<RecordingInfo
			label={$_("receiverRecording")}
			recordingInfo={emitter.receiverInfo?.recording}
			streamInfo={emitter.emitterInfo?.streamInfo}
			onRecordClick={() => socketApi("toggleRecording", { emitterId, receiver: true, action: "start" })}
			onStopClick={() => socketApi("toggleRecording", { emitterId, receiver: true, action: "stop" })}
		/>
	{/if}
	{#if emitter.receiverInfo?.viewport && emitter.emitterInfo?.videoResolution}
		<TransformImage
			viewportSize={emitter.receiverInfo.viewport}
			videoResolution={emitter.emitterInfo.videoResolution}
			transformImage={emitter.transformImage}
			updateTransformImage={(transformImage) =>
				socketApi("transformImage", {
					emitterId,
					transformImage,
				})}
		/>
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
					{@const keyInFiles = `${emitter.emitterShortId}/${file.name}`}
					{@const valueInFiles = files?.[keyInFiles]}
					<div class="flex">
						{@html iconFile}<span>{file.name} ({formatSize(file.size, $_)})</span><button class="flex" on:click={() => socketApi("uploadFile", { emitterId, fileName: file.name })}
							>{@html iconUpload}</button
						><button class="flex" on:click={() => socketApi("removeFile", { emitterId, fileName: file.name })}>{@html iconDelete}</button>
						{#if valueInFiles === file.size}
							{@html iconFileCheck}
						{:else if valueInFiles != null}
							<progress value={valueInFiles} max={file.size}>{formatSize(valueInFiles, $_)}</progress>
						{/if}
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
