<script lang="ts">
	import { _ } from "svelte-i18n";
	import type { Devices } from "../../common/rpcInterface";
	import type { StreamConfig } from "../mediaDevices";
	import { createStreamConfig, readStreamConfig } from "../mediaDevices";

	export let mediaDevices: Devices;
	export let mediaConstraints: MediaStreamConstraints | undefined;
	export let selectedVideoDevice = mediaConstraints?.video === false ? "none" : "default";
	export let selectedAudioDevice = mediaConstraints?.audio === false ? "none" : "default";
	export let streamConfig: StreamConfig | "screen";

	$: curStreamConfigDevices = typeof streamConfig === "string" ? { audio: "none", video: "none" } : readStreamConfig(streamConfig);

	export let setConfig = (config: MediaStreamConstraints | undefined) => {
		streamConfig = config;
	};

	const shareDevices = () => {
		setConfig(createStreamConfig(mediaConstraints, selectedVideoDevice, selectedAudioDevice));
	};
</script>

<div class="flex">
	<label for="videoDevice">{$_("videoDevice")}</label>
	<select
		id="videoDevice"
		bind:value={selectedVideoDevice}
		title={mediaDevices.videoinput[curStreamConfigDevices?.video]?.label ?? (curStreamConfigDevices?.video === "default" ? $_("defaultVideoDevice") : "")}
	>
		<option value="default">{$_("defaultVideoDevice")}</option>
		<option value="none">{$_("noVideo")}</option>
		{#each Object.keys(mediaDevices.videoinput) as id, index}
			<option value={id}>{mediaDevices.videoinput[id].label || $_("videoDeviceNum", { values: { num: index + 1 } })}</option>
		{/each}
	</select>
</div>
<div class="flex">
	<label for="audioDevice">{$_("audioDevice")}</label>
	<select
		id="audioDevice"
		bind:value={selectedAudioDevice}
		title={mediaDevices.audioinput[curStreamConfigDevices?.audio]?.label ?? (curStreamConfigDevices?.audio === "default" ? $_("defaultAudioDevice") : "")}
	>
		<option value="default">{$_("defaultAudioDevice")}</option>
		<option value="none">{$_("noAudio")}</option>
		{#each Object.keys(mediaDevices.audioinput) as id, index}
			<option value={id}>{mediaDevices.audioinput[id].label || $_("audioDeviceNum", { values: { num: index + 1 } })}</option>
		{/each}
	</select>
</div>
<slot />
<div class="flex">
	<button on:click={shareDevices}>{$_("shareVideoAudioDevices")}</button><slot name="buttons" />
</div>

<style>
	select {
		flex: 1 0;
	}
</style>
