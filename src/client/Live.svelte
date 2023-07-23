<script lang="ts">
	import { _ } from "svelte-i18n";
</script>

<div><span>&#9673;</span>{$_("live")}</div>

<style>
	@keyframes blink {
		0% {
			opacity: 1;
		}
		40% {
			opacity: 0;
		}
		100% {
			opacity: 1;
		}
	}

	div {
		border-radius: 0.5em;
		position: absolute;
		background-color: red;
		font-weight: bold;
		font-size: x-large;
		font-variant-caps: small-caps;
		color: white;
		padding: 0.5em;
		margin: 0.5em;
		right: 0;
		bottom: 0;
	}

	span {
		padding-right: 0.5em;
		animation-duration: 2s;
		animation-name: blink;
		animation-iteration-count: infinite;
		transition: none;
	}
</style>
