<script lang="ts">
	import { _ } from "svelte-i18n";
	import { ScreenConfig } from "./mediaDevices";
	import type { Devices, StreamConfig } from "./mediaDevices";
	import SpaceAvailable from "./storage/SpaceAvailable.svelte";

	export let mediaConstraints: MediaStreamConstraints | undefined;
	export let mediaDevices: Devices;
	export let streamConfig: StreamConfig;
	export let stream: MediaStream | null = null;
	export let record: boolean;

	let selectedVideoDevice = mediaConstraints?.video === false ? "none" : "default";
	let selectedAudioDevice = mediaConstraints?.audio === false ? "none" : "default";

	const applyConfig = (config: MediaStreamConstraints, type: "audio" | "video", selection: string) => {
		if (selection === "none") {
			config[type] = false;
		} else {
			let configType = config[type];
			if (!configType || typeof configType !== "object") {
				configType = {};
				config[type] = configType;
			}
			if (selection != "default") {
				configType.deviceId = selection;
			}
		}
	};

	const setConfig = () => {
		const newConfig = structuredClone(mediaConstraints ?? {});
		applyConfig(newConfig, "video", selectedVideoDevice);
		applyConfig(newConfig, "audio", selectedAudioDevice);
		streamConfig = newConfig;
	};

	const setScreenConfig = () => {
		streamConfig = new ScreenConfig(true);
	};

	const stop = () => {
		streamConfig = null;
	};
</script>

<div class="container flex vertical">
	{#if !stream}
		<div class="flex">
			<label for="videoDevice">{$_("videoDevice")}</label>
			<select id="videoDevice" bind:value={selectedVideoDevice}>
				<option value="default">{$_("defaultVideoDevice")}</option>
				<option value="none">{$_("noVideo")}</option>
				{#each Object.keys(mediaDevices.videoinput) as id, index}
					<option value={id}>{mediaDevices.videoinput[id].label || $_("videoDeviceNum", { values: { num: index + 1 } })}</option>
				{/each}
			</select>
		</div>
		<div class="flex">
			<label for="audioDevice">{$_("audioDevice")}</label>
			<select id="audioDevice" bind:value={selectedAudioDevice}>
				<option value="default">{$_("defaultAudioDevice")}</option>
				<option value="none">{$_("noAudio")}</option>
				{#each Object.keys(mediaDevices.audioinput) as id, index}
					<option value={id}>{mediaDevices.audioinput[id].label || $_("audioDeviceNum", { values: { num: index + 1 } })}</option>
				{/each}
			</select>
		</div>
		<div>
			<input id="record" type="checkbox" bind:checked={record} />
			<label for="record">{$_("record")}</label>
		</div>
		{#if record}
			<SpaceAvailable />
		{/if}
		<div class="flex">
			<button on:click={setConfig}>{$_("shareVideoAudioDevices")}</button><button on:click={setScreenConfig}>{$_("shareScreen")}</button>
		</div>
		<small><a href="https://github.com/davdiv/obs-webrtc-server" target="_blank" rel="noopener">obs-webrtc-server</a> v{import.meta.env.VERSION}</small>
	{:else}
		<button on:click={stop}>{$_("stopSharing")}</button>
		{#if record}
			<SpaceAvailable />
		{/if}
	{/if}
</div>

<style>
	select {
		flex: 1 0;
	}
	div.container {
		position: absolute;
		left: 10px;
		top: 10px;
		border-radius: 10px;
		padding: 10px;
		border: 1px solid black;
		background-color: white;
		color: black;
		z-index: 1;
	}
</style>
