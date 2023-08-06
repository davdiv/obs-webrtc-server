import { readable } from "@amadeus-it-group/tansu";

export const fullScreenSupported = document.fullscreenEnabled;
export const fullScreenActive$ = readable(!!document.fullscreenElement, (set) => {
	const update = () => {
		set(!!document.fullscreenElement);
	};
	update();
	document.addEventListener("fullscreenchange", update);
	return () => {
		document.removeEventListener("fullscreenchange", update);
	};
});
export const requestFullScreen = () =>
	document.body.requestFullscreen({
		navigationUI: "hide",
	});
export const exitFullScreen = () => document.exitFullscreen();
