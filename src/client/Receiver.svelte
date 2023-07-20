<script lang="ts">
	import Video from "./Video.svelte";
	import { model } from "./model";

	const { receiverStream$ } = model;
</script>

<Video stream={$receiverStream$} /><br />
