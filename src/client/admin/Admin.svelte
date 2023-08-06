<script lang="ts">
	import { model } from "../model";
	import EmitterInfo from "./EmitterInfo.svelte";

	const { adminData$ } = model;
</script>

<div class="fullscreen flex vertical">
	{#if $adminData$}
		<div>
			{#each Object.keys($adminData$.emitters) as emitterId}
				<EmitterInfo emitter={$adminData$.emitters[emitterId]} {emitterId} />
			{/each}
		</div>
	{/if}
</div>

<style>
	.fullscreen {
		overflow: auto;
	}
</style>
