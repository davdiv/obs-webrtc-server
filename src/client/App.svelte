<script lang="ts">
	import { _, isLoading } from "svelte-i18n";
	import FullScreenInfo from "./FullScreenInfo.svelte";
	import Receiver from "./Receiver.svelte";
	import Admin from "./admin/Admin.svelte";
	import Emitter from "./emitter/Emitter.svelte";
	import { model } from "./model";
	const { connected$, mode$ } = model;
</script>

{#if !$isLoading}
	{#if $connected$ === null}
		<FullScreenInfo>{$_("disconnected")}</FullScreenInfo>
	{:else if !$connected$}
		<FullScreenInfo>{$_("connecting")}</FullScreenInfo>
	{:else if $mode$ === "emitter"}
		<Emitter />
	{:else if $mode$ === "receiver"}
		<Receiver />
	{:else if $mode$ === "admin"}
		<Admin />
	{/if}
{/if}
