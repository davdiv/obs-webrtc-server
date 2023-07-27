<script lang="ts">
	import Video from "./Video.svelte";
	import { model } from "./model";
	import Live from "./Live.svelte";
	import StreamSelection from "./StreamSelection.svelte";

	const { emitterStream$, remoteReceiverInfo$, data$, recordLocally$ } = model;
</script>

<StreamSelection bind:stream={$emitterStream$} mediaConstraints={$data$?.type === "emitter" ? $data$.mediaConstraints : undefined} bind:record={$recordLocally$} />
<Video stream={$emitterStream$} muted /><br />

{#if $remoteReceiverInfo$?.active}
	<Live />
{/if}
