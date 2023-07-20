import { asReadable, writable, type ReadableSignal } from "@amadeus-it-group/tansu";
import { asyncSerialDerived } from "../common/asyncSerialDerived";
import { checkAbortSignal, waitAbortSignal } from "../common/abortUtils";
import deepEqual from "fast-deep-equal";

export type Devices = {
	[kind in "audioinput" | "audiooutput" | "videoinput"]: { [id: string]: { label: string } };
};

const emptyDevices = (): Devices => ({ audioinput: {}, audiooutput: {}, videoinput: {} });

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
		const kind = res[dev.kind];
		if (kind) {
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
			await waitAbortSignal(abortSignal);
			set(null);
			result.getTracks().forEach((track) => track.stop());
		},
		initialValue: null,
		equal: Object.is,
	});
