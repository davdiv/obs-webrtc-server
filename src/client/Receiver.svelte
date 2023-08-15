<script lang="ts">
	import Video from "./Video.svelte";
	import { model } from "./model";

	const { receiverStream$, receiverData$, updateResolution } = model;
</script>

<Video stream={$receiverStream$} transformImage={$receiverData$?.transformImage} on:resize={updateResolution} />
