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
	<video use:videoSource={stream} autoplay playsinline {muted} />
{:else}
	<div />
{/if}

<style>
	video,
	div {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		background-color: black;
	}
</style>
