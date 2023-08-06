<script lang="ts">
	import { _ } from "svelte-i18n";
	import iconRecord from "bootstrap-icons/icons/record-fill.svg?raw";
</script>

<div class="flex rec-live">{@html iconRecord}<span>{$_("recording")}</span></div>

<style>
	.rec-live {
		position: absolute;
		top: 0;
		right: 0;
	}
</style>
