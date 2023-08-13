<script lang="ts">
	import type { Resolution } from "../common/rpcInterface";
	import iconResolution from "bootstrap-icons/icons/aspect-ratio.svg?raw";
	import iconAudio from "bootstrap-icons/icons/volume-up.svg?raw";
	import iconNoAudio from "bootstrap-icons/icons/volume-mute.svg?raw";

	export let resolution: Resolution | undefined;
	export let hasAudio: boolean | undefined;
</script>

{#if resolution}
	<div class="flex">
		{@html iconResolution}
		{resolution.width}&times;{resolution.height}
		{@html hasAudio ? iconAudio : iconNoAudio}
	</div>
{/if}
