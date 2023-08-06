<script lang="ts">
	import type { Resolution } from "../common/rpcInterface";
	import iconResolution from "bootstrap-icons/icons/aspect-ratio.svg?raw";

	export let resolution: Resolution | undefined;
</script>

{#if resolution}
	<div class="flex">
		{@html iconResolution}
		{resolution.width}&times;{resolution.height}
	</div>
{/if}
