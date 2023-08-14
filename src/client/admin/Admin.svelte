<script lang="ts">
	import { model } from "../model";
	import EmitterInfo from "./EmitterInfo.svelte";

	const { adminData$, socketApi$ } = model;
</script>

<div class="fullscreen flex vertical">
	{#if $adminData$ && $socketApi$}
		<div>
			{#each Object.keys($adminData$.emitters) as emitterId}
				<EmitterInfo emitter={$adminData$.emitters[emitterId]} {emitterId} socketApi={$socketApi$} />
			{/each}
		</div>
	{/if}
</div>

<style>
	.fullscreen {
		overflow: auto;
	}
</style>
