<script lang="ts">
	import Video from "./Video.svelte";
	import { model } from "./model";

	const { receiverStream$, updateResolution } = model;
</script>

<Video stream={$receiverStream$} on:resize={updateResolution} /><br />
