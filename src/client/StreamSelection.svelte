<script lang="ts">
	import { writable } from "@amadeus-it-group/tansu";
	import StreamSource from "./StreamSource.svelte";
	import { deriveStream, mediaDevices$ } from "./mediaDevices";
	import type { StreamConfig } from "./mediaDevices";

	export let stream: MediaStream | null;
	export let mediaConstraints: MediaStreamConstraints | undefined;
	export let record: boolean;
	let streamConfig$ = writable(null as StreamConfig);
	let videoStream$ = deriveStream(streamConfig$);
	$: stream = $videoStream$;
</script>

<StreamSource mediaDevices={$mediaDevices$} {mediaConstraints} bind:record bind:streamConfig={$streamConfig$} {stream} />
