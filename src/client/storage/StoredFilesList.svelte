<script lang="ts">
	import { _ } from "svelte-i18n";
	import { browserStorageFiles, saveFile, removeFile } from "./browserStorage";
</script>

{#if $browserStorageFiles.length > 0}
	<div class="container flex vertical">
		{#each $browserStorageFiles as file}
			<div>
				{file.name}
				<button on:click={() => saveFile(file)}>{$_("save")}</button>
				<button on:click={() => removeFile(file)}>{$_("delete")}</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	div.container {
		position: absolute;
		left: 10px;
		bottom: 10px;
		border-radius: 10px;
		padding: 10px;
		border: 1px solid black;
		background-color: white;
		color: black;
		z-index: 1;
	}
</style>
