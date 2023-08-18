<script lang="ts">
	import iconFullScreenExit from "bootstrap-icons/icons/fullscreen-exit.svg?raw";
	import iconFullScreenEnter from "bootstrap-icons/icons/fullscreen.svg?raw";
	import iconStop from "bootstrap-icons/icons/stop-fill.svg?raw";
	import { _ } from "svelte-i18n";
	import type { Devices } from "../../common/rpcInterface";
	import BatteryInfo from "../battery/BatteryInfo.svelte";
	import { batteryInfo$ } from "../battery/battery";
	import { exitFullScreen, fullScreenActive$, fullScreenSupported, requestFullScreen } from "../fullScreen";
	import type { StreamConfig } from "../mediaDevices";
	import { ScreenConfig } from "../mediaDevices";
	import SpaceAvailable from "../storage/SpaceAvailable.svelte";
	import { storageInfo$ } from "../storage/browserStorage";
	import SelectDevices from "./SelectDevices.svelte";

	export let mediaConstraints: MediaStreamConstraints | undefined;
	export let mediaDevices: Devices;
	export let streamConfig: StreamConfig;
	export let stream: MediaStream | null = null;
	export let fullScreen = true;

	$: isSharingScreen = streamConfig instanceof ScreenConfig;

	let selectedVideoDevice: string;
	let selectedAudioDevice: string;

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

{#if !stream}
	<div class="container flex vertical">
		<SelectDevices {mediaConstraints} {mediaDevices} bind:selectedAudioDevice bind:selectedVideoDevice bind:streamConfig
			><svelte:fragment slot="buttons"
				>{#if !!navigator.mediaDevices.getDisplayMedia}<button on:click={setScreenConfig}>{$_("shareScreen")}</button>{/if}</svelte:fragment
			></SelectDevices
		>
		{#if fullScreenSupported}
			<div>
				<input id="fullScreen" type="checkbox" bind:checked={fullScreen} />
				<label for="fullScreen">{$_("fullScreen")}</label>
			</div>
		{/if}
		<SpaceAvailable storageInfo={$storageInfo$} />
		<BatteryInfo batteryInfo={$batteryInfo$} />
		<small><a href="https://github.com/davdiv/obs-webrtc-server" target="_blank" rel="noopener">obs-webrtc-server</a> v{import.meta.env.VERSION}</small>
	</div>
{:else}
	<div class="container flex vertical sharing">
		<div class="flex">
			<button class="flex" on:click={stop} title={$_("stopSharing")}>{@html iconStop}</button>
			{#if $fullScreenActive$}
				<button class="flex" on:click={exitFullScreen} title={$_("exitFullScreen")}>{@html iconFullScreenExit}</button>
			{:else if fullScreenSupported && !isSharingScreen}
				<button class="flex" on:click={requestFullScreen} title={$_("switchToFullScreen")}>{@html iconFullScreenEnter}</button>
			{/if}
		</div>
		<SpaceAvailable storageInfo={$storageInfo$} />
		<BatteryInfo batteryInfo={$batteryInfo$} />
	</div>
{/if}

<style>
	div.container {
		border-radius: 10px;
		padding: 10px;
		border: 1px solid black;
		background-color: white;
		color: black;
		margin: 10px;
	}
	div.sharing {
		position: absolute;
		left: 10px;
		top: 10px;
		z-index: 1;
	}
</style>
