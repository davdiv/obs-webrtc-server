<script lang="ts">
	export let stream: MediaStream | null;
	export let muted = false;

	function videoSource(videoElement: HTMLVideoElement, stream: MediaStream | null) {
		const update = (stream: MediaStream | null) => {
			videoElement.srcObject = stream;
		};
		update(stream);
		return {
			update,
		};
	}
</script>

{#if stream}
	<!-- svelte-ignore a11y-media-has-caption -->
	<video class="fullscreen" use:videoSource={stream} autoplay playsinline {muted} on:resize />
{/if}
