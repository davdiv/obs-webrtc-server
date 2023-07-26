<script lang="ts">
	import { _, isLoading } from "svelte-i18n";
	import Emitter from "./Emitter.svelte";
	import Receiver from "./Receiver.svelte";
	import { model } from "./model";
	import FullScreenInfo from "./FullScreenInfo.svelte";
	const { connected$, data$ } = model;
</script>

{#if !$isLoading}
	{#if $connected$ === null}
		<FullScreenInfo>{$_("disconnected")}</FullScreenInfo>
	{:else if !$connected$}
		<FullScreenInfo>{$_("connecting")}</FullScreenInfo>
	{:else if $data$?.type === "emitter"}
		<Emitter />
	{:else if $data$?.type === "receiver"}
		<Receiver />
	{/if}
{/if}
