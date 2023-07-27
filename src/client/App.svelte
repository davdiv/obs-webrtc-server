<script lang="ts">
	import { _, isLoading } from "svelte-i18n";
	import Emitter from "./Emitter.svelte";
	import Receiver from "./Receiver.svelte";
	import { model } from "./model";
	import FullScreenInfo from "./FullScreenInfo.svelte";
	import StoredFilesList from "./storage/StoredFilesList.svelte";
	const { connected$, data$, emitterStream$ } = model;
</script>

{#if !$isLoading}
	{#if $connected$ === null}
		<FullScreenInfo>{$_("disconnected")}</FullScreenInfo>
	{:else if !$connected$}
		<FullScreenInfo>{$_("connecting")}</FullScreenInfo>
	{:else if $data$?.type === "emitter"}
		<Emitter />
		{#if !$emitterStream$}
			<StoredFilesList />
		{/if}
	{:else if $data$?.type === "receiver"}
		<Receiver />
	{/if}
{/if}
