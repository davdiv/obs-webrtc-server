<script lang="ts">
	import Video from "../Video.svelte";
	import { model } from "../model";
	import StoredFilesList from "../storage/StoredFilesList.svelte";
	import Live from "./Live.svelte";
	import Recording from "./Recording.svelte";
	import StreamSource from "./StreamSource.svelte";

	const { emitterStream$, emitterData$, updateResolution, emitterRecording$, emitterStreamConfig$, mediaDevices$ } = model;
</script>

<StreamSource mediaDevices={$mediaDevices$} mediaConstraints={$emitterData$?.mediaConstraints} bind:streamConfig={$emitterStreamConfig$} stream={$emitterStream$} />
<Video stream={$emitterStream$} muted on:resize={updateResolution} />

{#if $emitterData$?.obsActive}
	<Live />
{/if}
{#if $emitterRecording$}
	<Recording />
{/if}
{#if !$emitterStream$}
	<StoredFilesList />
{/if}
