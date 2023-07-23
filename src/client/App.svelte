<script lang="ts">
	import { _, isLoading } from "svelte-i18n";
	import Emitter from "./Emitter.svelte";
	import Receiver from "./Receiver.svelte";
	import { model } from "./model";
	const { connected$, data$ } = model;
</script>

{#if !$isLoading}
	{#if !$connected$}
		{$_("connecting")}
	{:else if $data$?.type === "emitter"}
		<Emitter />
	{:else if $data$?.type === "receiver"}
		<Receiver />
	{/if}
{/if}
