<script lang="ts">
	import type { TransformImage } from "../common/rpcInterface";

	export let stream: MediaStream | null;
	export let muted = false;
	export let transformImage: TransformImage | undefined = undefined;

	$: zoom = transformImage?.zoom ?? 1;
	$: translateX = -100 * (zoom - 1) * (transformImage?.positionX ?? 0.5);
	$: translateY = -100 * (zoom - 1) * (transformImage?.positionY ?? 0.5);
	$: transformStyle = `transform-origin: 0 0; transform: translate(${translateX}%, ${translateY}%) scale(${zoom})`;

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
	<div class="fullscreen">
		<video class="fullscreen" style={transformStyle} use:videoSource={stream} autoplay playsinline {muted} on:resize />
	</div>
{/if}
