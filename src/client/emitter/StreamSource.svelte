<script lang="ts">
	import iconFullScreenExit from "bootstrap-icons/icons/fullscreen-exit.svg?raw";
	import iconFullScreenEnter from "bootstrap-icons/icons/fullscreen.svg?raw";
	import iconStop from "bootstrap-icons/icons/stop-fill.svg?raw";
	import { _ } from "svelte-i18n";
	import BatteryInfo from "../battery/BatteryInfo.svelte";
	import { batteryInfo$ } from "../battery/battery";
	import { exitFullScreen, fullScreenActive$, fullScreenSupported, requestFullScreen } from "../fullScreen";
	import type { Devices, StreamConfig } from "../mediaDevices";
	import { ScreenConfig } from "../mediaDevices";
	import SpaceAvailable from "../storage/SpaceAvailable.svelte";
	import { storageInfo$ } from "../storage/browserStorage";

	export let mediaConstraints: MediaStreamConstraints | undefined;
	export let mediaDevices: Devices;
	export let streamConfig: StreamConfig;
	export let stream: MediaStream | null = null;
	export let record: boolean;
	export let fullScreen = true;

	$: isSharingScreen = streamConfig instanceof ScreenConfig;

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

	$: {
		if (stream && !isSharingScreen && fullScreen) {
			requestFullScreen();
		}
	}

	$: {
		if ($fullScreenActive$ && !stream) {
			exitFullScreen();
		}
	}
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
		{#if fullScreenSupported}
			<div>
				<input id="fullScreen" type="checkbox" bind:checked={fullScreen} />
				<label for="fullScreen">{$_("fullScreen")}</label>
			</div>
		{/if}
		<div>
			<input id="record" type="checkbox" bind:checked={record} />
			<label for="record">{$_("record")}</label>
		</div>
		{#if record}
			<SpaceAvailable storageInfo={$storageInfo$} />
		{/if}
		<BatteryInfo batteryInfo={$batteryInfo$} />
		<div class="flex">
			<button on:click={setConfig}>{$_("shareVideoAudioDevices")}</button>{#if !!navigator.mediaDevices.getDisplayMedia}<button on:click={setScreenConfig}>{$_("shareScreen")}</button>{/if}
		</div>
		<small><a href="https://github.com/davdiv/obs-webrtc-server" target="_blank" rel="noopener">obs-webrtc-server</a> v{import.meta.env.VERSION}</small>
	{:else}
		<div class="flex">
			<button class="flex" on:click={stop} title={$_("stopSharing")}>{@html iconStop}</button>
			{#if $fullScreenActive$}
				<button class="flex" on:click={exitFullScreen} title={$_("exitFullScreen")}>{@html iconFullScreenExit}</button>
			{:else if fullScreenSupported && !isSharingScreen}
				<button class="flex" on:click={requestFullScreen} title={$_("switchToFullScreen")}>{@html iconFullScreenEnter}</button>
			{/if}
		</div>
		{#if record}
			<SpaceAvailable storageInfo={$storageInfo$} />
		{/if}
		<BatteryInfo batteryInfo={$batteryInfo$} />
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
