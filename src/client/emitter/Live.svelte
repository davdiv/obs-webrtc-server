<script lang="ts">
	import { _ } from "svelte-i18n";
	import iconBroadcast from "bootstrap-icons/icons/broadcast.svg?raw";
</script>

<div class="flex rec-live">{@html iconBroadcast}<span>{$_("live")}</span></div>

<style>
	.rec-live {
		position: absolute;
		bottom: 0;
		right: 0;
	}
</style>
