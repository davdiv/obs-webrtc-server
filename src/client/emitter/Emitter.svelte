<script lang="ts">
	import Live from "./Live.svelte";
	import StreamSelection from "./StreamSelection.svelte";
	import Video from "../Video.svelte";
	import { model } from "../model";
	import StoredFilesList from "../storage/StoredFilesList.svelte";
	import Recording from "./Recording.svelte";

	const { emitterStream$, emitterData$, recordLocally$, updateResolution } = model;
</script>

<StreamSelection bind:stream={$emitterStream$} mediaConstraints={$emitterData$?.mediaConstraints} bind:record={$recordLocally$} />
<Video stream={$emitterStream$} muted on:resize={updateResolution} /><br />

{#if $emitterData$?.obsActive}
	<Live />
{/if}
{#if $recordLocally$ && $emitterStream$}
	<Recording />
{/if}
{#if !$emitterStream$}
	<StoredFilesList />
{/if}
