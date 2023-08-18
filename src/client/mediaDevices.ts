import { asReadable, writable, type ReadableSignal } from "@amadeus-it-group/tansu";
import deepEqual from "fast-deep-equal";
import { checkAbortSignal, subAbortController, waitAbortSignal } from "../common/abortUtils";
import { asyncSerialDerived } from "../common/asyncSerialDerived";
import type { Devices } from "../common/rpcInterface";

const emptyDevices = (): Devices => ({ audioinput: {}, videoinput: {} });

const devices$ = writable(emptyDevices(), {
	onUse() {
		refresh();
		navigator.mediaDevices?.addEventListener("devicechange", refresh);
		return () => navigator.mediaDevices?.removeEventListener("devicechange", refresh);
	},
	equal: deepEqual,
});

const refresh = async () => {
	const res = emptyDevices();
	const enumDevices = (await navigator.mediaDevices?.enumerateDevices()) ?? [];
	for (const dev of enumDevices) {
		const kind = res[dev.kind as "audioinput" | "videoinput"];
		if (kind && dev.deviceId !== "default") {
			kind[dev.deviceId] = { label: dev.label };
		}
	}
	devices$.set(res);
};

export const mediaDevices$ = asReadable(devices$, {
	refresh,
});

export class ScreenConfig {
	constructor(public audio: boolean) {}
	toJSON() {
		return "screen";
	}
}

export type StreamConfig = MediaStreamConstraints | null | undefined | ScreenConfig;

export const deriveStream = (streamConfig: ReadableSignal<StreamConfig>) =>
	asyncSerialDerived(streamConfig, {
		async derive(config, set: (stream: null | MediaStream) => void, abortSignal) {
			set(null);
			if (!config) {
				return;
			}
			const result = await (config instanceof ScreenConfig ? navigator.mediaDevices.getDisplayMedia({ audio: config.audio }) : navigator.mediaDevices.getUserMedia(config));
			checkAbortSignal(abortSignal);
			refresh();
			set(result);
			const abortController = new AbortController();
			subAbortController(abortSignal, abortController);
			result.getTracks().forEach((track) => track.addEventListener("ended", () => abortController.abort()));
			await waitAbortSignal(abortController.signal);
			set(null);
			result.getTracks().forEach((track) => track.stop());
		},
		initialValue: null,
		equal: Object.is,
	});

const applyConfig = (config: MediaStreamConstraints, type: "audio" | "video", selection: string) => {
	if (selection === "none") {
		config[type] = false;
	} else {
		let configType = config[type];
		if (!configType || typeof configType !== "object") {
			configType = {};
			config[type] = configType;
		}
		if (selection != "default") {
			configType.deviceId = selection;
		}
	}
};

export const createStreamConfig = (mediaConstraints: MediaStreamConstraints | undefined, selectedVideoDevice: string, selectedAudioDevice: string) => {
	const newConfig = structuredClone(mediaConstraints ?? {});
	applyConfig(newConfig, "video", selectedVideoDevice);
	applyConfig(newConfig, "audio", selectedAudioDevice);
	return newConfig;
};

const readDeviceId = (value: boolean | MediaTrackConstraints | undefined) => {
	if (!value || typeof value === "boolean" || !value.deviceId || typeof value.deviceId !== "string") {
		return value ? "default" : "none";
	} else {
		return value.deviceId;
	}
};

export const readStreamConfig = (mediaConstraints: MediaStreamConstraints | undefined | null) => ({
	video: readDeviceId(mediaConstraints?.video),
	audio: readDeviceId(mediaConstraints?.audio),
});
