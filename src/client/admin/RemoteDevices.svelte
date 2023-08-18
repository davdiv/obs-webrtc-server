<script lang="ts">
	import { _ } from "svelte-i18n";
	import type { ClientSentEmitterInfo, Devices, StreamInfo } from "../../common/rpcInterface";
	import SelectDevices from "../emitter/SelectDevices.svelte";

	export let mediaConstraints: MediaStreamConstraints | undefined;
	export let mediaDevices: Devices | undefined;
	export let streamConfig: ClientSentEmitterInfo["streamConfig"];
	export let streamInfo: StreamInfo | undefined;
	export let onSetStreamConfig: (config: MediaStreamConstraints | undefined) => void;
</script>

{#if mediaDevices}
	<SelectDevices {mediaConstraints} {streamConfig} {mediaDevices} setConfig={onSetStreamConfig}>
		<svelte:fragment slot="buttons">
			{#if streamInfo?.hasAudio || streamInfo?.hasVideo}
				<button on:click={() => onSetStreamConfig(undefined)}>{$_("stopSharing")}</button>
			{/if}
		</svelte:fragment>
	</SelectDevices>
{/if}
