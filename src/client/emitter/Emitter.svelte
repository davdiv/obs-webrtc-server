<script lang="ts">
	import Live from "./Live.svelte";
	import StreamSelection from "./StreamSelection.svelte";
	import Video from "../Video.svelte";
	import { model } from "../model";
	import StoredFilesList from "../storage/StoredFilesList.svelte";
	import Recording from "./Recording.svelte";

	const { emitterStream$, emitterData$, updateResolution, emitterRecording$ } = model;
</script>

<StreamSelection bind:stream={$emitterStream$} mediaConstraints={$emitterData$?.mediaConstraints} />
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
