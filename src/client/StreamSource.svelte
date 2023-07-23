<script lang="ts">
	import { _ } from "svelte-i18n";
	import { ScreenConfig } from "./mediaDevices";
	import type { Devices, StreamConfig } from "./mediaDevices";

	export let mediaConstraints: MediaStreamConstraints | undefined;
	export let mediaDevices: Devices;
	export let streamConfig: StreamConfig;

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

<div>
	<button on:click={setScreenConfig}>{$_("shareScreen")}</button>
	<br /><br />
	<label>
		{$_("videoDevice")}
		<select bind:value={selectedVideoDevice}>
			<option value="default">{$_("defaultVideoDevice")}</option>
			<option value="none">{$_("noVideo")}</option>
			{#each Object.keys(mediaDevices.videoinput) as id, index}
				<option value={id}>{mediaDevices.videoinput[id].label || $_("videoDeviceNum", { values: { num: index + 1 } })}</option>
			{/each}
		</select>
	</label>
	<br />
	<label
		>{$_("audioDevice")}
		<select bind:value={selectedAudioDevice}>
			<option value="default">{$_("defaultAudioDevice")}</option>
			<option value="none">{$_("noAudio")}</option>
			{#each Object.keys(mediaDevices.audioinput) as id, index}
				<option value={id}>{mediaDevices.audioinput[id].label || $_("audioDeviceNum", { values: { num: index + 1 } })}</option>
			{/each}
		</select>
	</label>
	<br />
	<br />
	<button on:click={setConfig}>{$_("shareVideoAudioDevice")}</button><br /><br />
	<button on:click={stop}>{$_("stopSharing")}</button>
</div>

<style>
	div {
		border-radius: 10px;
		padding: 10px;
		border: 1px solid black;
		background-color: white;
		position: absolute;
		z-index: 1;
	}
</style>
