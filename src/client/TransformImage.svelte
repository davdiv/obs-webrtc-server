<script lang="ts">
	import type { MouseEventHandler, WheelEventHandler } from "svelte/elements";
	import type { Resolution, TransformImage } from "../common/rpcInterface";

	export let viewportSize: Resolution;
	export let videoResolution: Resolution;
	export let transformImage: TransformImage | undefined;
	export let updateTransformImage: (newValue: TransformImage | undefined) => void;
	export let size = 100;

	$: containerRatio = viewportSize.width / viewportSize.height;
	$: containerWidth = containerRatio > 1 ? size : size * containerRatio;
	$: containerHeight = containerWidth / containerRatio;

	$: videoRatio = videoResolution.width / videoResolution.height;
	$: videoWidth = videoRatio > containerRatio ? containerWidth : containerHeight * videoRatio;
	$: videoHeight = videoWidth / videoRatio;

	$: newViewWidth = containerWidth / (transformImage?.zoom ?? 1) - 2;
	$: newViewHeight = containerHeight / (transformImage?.zoom ?? 1) - 2;
	$: newViewLeft = (containerWidth - 2 - newViewWidth) * (transformImage?.positionX ?? 0.5);
	$: newViewTop = (containerHeight - 2 - newViewHeight) * (transformImage?.positionY ?? 0.5);

	const minZoom = 1;
	const maxZoom = 10;
	const zoomStep = 1.05;

	const adjust = (value: number, min: number, max: number) => Math.max(Math.min(value, max), min);

	const onWheel: WheelEventHandler<HTMLDivElement> = (event) => {
		const zoomIn = event.deltaY < 0;
		const zoom = adjust((transformImage?.zoom ?? 1) * (zoomIn ? zoomStep : 1 / zoomStep), minZoom, maxZoom);
		if (zoom === 1) {
			updateTransformImage(undefined);
			return;
		}
		const newWidth = containerWidth / zoom - 2;
		const newHeight = containerHeight / zoom - 2;
		// center around the mouse position:
		let newLeft = event.offsetX - newWidth / 2;
		let newTop = event.offsetY - newHeight / 2;
		if (zoomIn) {
			// the previous view must contain the new view
			newLeft = adjust(newLeft, newViewLeft, newViewLeft + newViewWidth - newWidth);
			newTop = adjust(newTop, newViewTop, newViewTop + newViewHeight - newHeight);
		} else {
			// the new view must contain the previous view
			newLeft = adjust(newLeft, newViewLeft + newViewWidth - newWidth, newViewLeft);
			newLeft = adjust(newLeft, 0, containerWidth - 2 - newWidth);
			newTop = adjust(newTop, newViewTop + newViewHeight - newHeight, newViewTop);
			newTop = adjust(newTop, 0, containerHeight - 2 - newHeight);
		}
		const positionX = newLeft / (containerWidth - 2 - newWidth);
		const positionY = newTop / (containerHeight - 2 - newHeight);
		updateTransformImage({ positionX, positionY, zoom });
	};

	let mouseDown: null | { offsetX: number; offsetY: number; newViewLeft: number; newViewTop: number };
	const onMouseDown: MouseEventHandler<HTMLDivElement> = (event) => {
		const { offsetX, offsetY } = event;
		if (event.button === 0 && offsetX >= newViewLeft && offsetX <= newViewLeft + newViewWidth && offsetY >= newViewTop && offsetY <= newViewTop + newViewHeight) {
			mouseDown = { offsetX, offsetY, newViewLeft, newViewTop };
		}
		if (event.button === 2) {
			updateTransformImage(undefined);
		}
	};
	const onMouseMove: MouseEventHandler<HTMLDivElement> = (event) => {
		if (mouseDown) {
			let newLeft = mouseDown.newViewLeft + (event.offsetX - mouseDown.offsetX);
			let newTop = mouseDown.newViewTop + (event.offsetY - mouseDown.offsetY);
			newLeft = adjust(newLeft, 0, containerWidth - 2 - newViewWidth);
			newTop = adjust(newTop, 0, containerHeight - 2 - newViewHeight);
			const positionX = newLeft / (containerWidth - 2 - newViewWidth);
			const positionY = newTop / (containerHeight - 2 - newViewHeight);
			updateTransformImage({ positionX, positionY, zoom: transformImage?.zoom });
		}
	};
	const onMouseUp: MouseEventHandler<Window> = (event) => {
		mouseDown = null;
	};
</script>

<svelte:window on:mouseup={onMouseUp} />

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="container"
	style={`width:${containerWidth}px;height:${containerHeight}px;`}
	on:wheel|preventDefault={onWheel}
	on:mousedown|preventDefault={onMouseDown}
	on:mousemove|preventDefault={onMouseMove}
	on:contextmenu|preventDefault
>
	<div class="video" style={`width:${videoWidth}px;height:${videoHeight}px;left:${(containerWidth - videoWidth) / 2}px;top:${(containerHeight - videoHeight) / 2}px`}></div>
	<div class="newview" style={`width:${newViewWidth}px;height:${newViewHeight}px;left:${newViewLeft}px;top:${newViewTop}px;`}></div>
</div>

<style>
	div {
		position: absolute;
		pointer-events: none;
	}
	div.container {
		border: 1px solid black;
		background-color: black;
		position: relative;
		margin: 0.25em;
		pointer-events: auto;
	}
	div.video {
		background-color: blue;
	}
	div.newview {
		border: 1px solid white;
	}
</style>
