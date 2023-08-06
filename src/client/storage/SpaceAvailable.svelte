<script lang="ts">
	import iconFolder from "bootstrap-icons/icons/folder.svg?raw";
	import { _ } from "svelte-i18n";
	import type { StorageInfo } from "../../common/rpcInterface";
	import { formatSize } from "./formatSize";

	export let storageInfo: StorageInfo | undefined;

	$: values = storageInfo
		? {
				...storageInfo,
				usage: formatSize(storageInfo.usage!, $_),
				quota: formatSize(storageInfo.quota!, $_),
		  }
		: undefined;
</script>

{#if values}
	<div class="flex" title={values.persisted ? $_("persistentStorage") : $_("volatileStorage")}>
		{@html iconFolder}
		<div>{$_("spaceAvailable", { values })}</div>
	</div>
{/if}
