<script lang="ts">
	import Emitter from "./Emitter.svelte";
	import Receiver from "./Receiver.svelte";
	import { model } from "./model";
	const { connected$, data$ } = model;
</script>

{#if !$connected$}
	Connecting...
{:else if $data$?.type === "emitter"}
	<Emitter />
{:else if $data$?.type === "receiver"}
	<Receiver />
{/if}
