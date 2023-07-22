<script lang="ts">
	import Video from "./Video.svelte";
	import { model } from "./model";
	import Live from "./Live.svelte";
	import StreamSelection from "./StreamSelection.svelte";

	const { emitterStream$, emitterData$, recordLocally$ } = model;
</script>

<StreamSelection bind:stream={$emitterStream$} mediaConstraints={$emitterData$?.mediaConstraints} bind:record={$recordLocally$} />
<Video stream={$emitterStream$} muted /><br />

{#if $emitterData$?.obsActive}
	<Live />
{/if}
