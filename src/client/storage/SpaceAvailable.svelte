<script lang="ts">
	import { _ } from "svelte-i18n";
	import { spaceAvailable$, refreshStorageFiles, persisted$, requestPersistentStorage } from "./browserStorage";

	const formatSize = (size: number, $t: typeof $_) => {
		if (size > 1000000000) {
			return $t("gigabyte", { values: { size: Math.round(size / 1000000000) } });
		} else if (size > 1000000) {
			return $t("megabyte", { values: { size: Math.round(size / 1000000) } });
		} else if (size > 1000) {
			return $t("kilobyte", { values: { size: Math.round(size / 1000) } });
		}
		return $t("byte", { values: { size } });
	};

	$: values = $spaceAvailable$
		? {
				usage: formatSize($spaceAvailable$.usage!, $_),
				quota: formatSize($spaceAvailable$.quota!, $_),
		  }
		: undefined;
</script>

{#if values}
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div on:click={refreshStorageFiles}>
		{$_("spaceAvailable", { values })}
	</div>
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div on:click={requestPersistentStorage}>
		({$persisted$ ? $_("persistentStorage") : $_("volatileStorage")})
	</div>
{/if}
