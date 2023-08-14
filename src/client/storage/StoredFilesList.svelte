<script lang="ts">
	import iconSave from "bootstrap-icons/icons/download.svg?raw";
	import iconDelete from "bootstrap-icons/icons/trash.svg?raw";
	import { _ } from "svelte-i18n";
	import { browserStorageFiles$, removeFile, saveFile } from "./browserStorage";
	import { formatSize } from "./formatSize";
</script>

{#if $browserStorageFiles$.length > 0}
	<div class="container flex vertical">
		{#each $browserStorageFiles$ as file}
			<div class="flex">
				{file.name} ({formatSize(file.size, $_)})
				<button class="flex" on:click={() => saveFile(file)} title={$_("save")}>{@html iconSave}</button>
				<button class="flex" on:click={() => removeFile(file)} title={$_("delete")}>{@html iconDelete}</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	div.container {
		left: 10px;
		border-radius: 10px;
		padding: 10px;
		border: 1px solid black;
		background-color: white;
		color: black;
		margin: 10px;
	}
</style>
