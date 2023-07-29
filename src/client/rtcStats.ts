import type { OnUseArgument, ReadableSignal } from "@amadeus-it-group/tansu";
import { computed } from "@amadeus-it-group/tansu";
import { asyncSerialDerived } from "../common/asyncSerialDerived";
import { waitAbortSignal } from "../common/abortUtils";

type MediaKind = "audio" | "video";
const findReceiver = (peerConnection: RTCPeerConnection | undefined, kind: MediaKind) => peerConnection?.getReceivers().find((receiver) => receiver.track.kind === kind);

const findStat = <T>(statsReport: RTCStatsReport | undefined, type: string, statExtractor: (stat: any) => T | undefined): T | undefined => {
	if (statsReport) {
		for (const stat of statsReport.values()) {
			if (stat.type == type) {
				const result = statExtractor(stat);
				if (result != null) {
					return result;
				}
			}
		}
	}
};

const timestampDiff = (stat: { timestamp: number; remoteTimestamp: number }) => (stat.timestamp && stat.remoteTimestamp ? stat.timestamp - stat.remoteTimestamp : undefined);
const roundTripTime = (stat: { roundTripTime?: number }) => stat.roundTripTime;

// captureTimestamp is in NTP timebase (counted since 1900 instead of 1970)
// cf https://github.com/w3c/webrtc-extensions/issues/97
const timebaseDiff = Date.UTC(1900, 0, 1);
const captureDelay = (stat: undefined | (RTCRtpSynchronizationSource & { captureTimestamp: DOMHighResTimeStamp; senderCaptureTimeOffset: DOMHighResTimeStamp })) =>
	stat && stat.captureTimestamp && stat.timestamp ? stat.timestamp - (stat.captureTimestamp + timebaseDiff) - stat.senderCaptureTimeOffset : undefined;

export const createRtcStatsModel = (peerConnection$: ReadableSignal<RTCPeerConnection | undefined>) => {
	const peerConnectionStats$ = asyncSerialDerived(peerConnection$, {
		async derive(peerConnection, set: OnUseArgument<RTCStatsReport | undefined>, abortSignal) {
			if (peerConnection) {
				while (!abortSignal.aborted) {
					set(await peerConnection.getStats());
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
			}
		},
		equal: Object.is,
	});

	const roundTripTime$ = computed(() => findStat(peerConnectionStats$(), "remote-inbound-rtp", roundTripTime));
	const timestampDiff$ = computed(() => findStat(peerConnectionStats$(), "remote-outbound-rtp", timestampDiff));

	const createReceiverAndCaptureDelayStores = (kind: MediaKind) => {
		const receiver$ = asyncSerialDerived(peerConnection$, {
			async derive(peerConnection, set: OnUseArgument<RTCRtpReceiver | undefined>, abortSignal) {
				if (peerConnection) {
					const trackHandler = () => {
						set(findReceiver(peerConnection, kind));
					};
					peerConnection.addEventListener("track", trackHandler);
					await waitAbortSignal(abortSignal);
					peerConnection.removeEventListener("track", trackHandler);
				}
			},
			equal: Object.is,
		});

		return {
			receiver$,
			captureDelay$: computed(() => {
				peerConnectionStats$();
				return captureDelay(receiver$()?.getSynchronizationSources()[0] as any);
			}),
		};
	};

	// cf https://w3c.github.io/webrtc-extensions/#dom-rtcrtpcontributingsource-sendercapturetimeoffset
	// oneWayDelay = RTCRtpContributingSource.timestamp - receiverCaptureTimestamp
	// receiverCaptureTimestamp = senderCaptureTimestamp + senderReceiverTimeOffset
	// senderReceiverTimeOffset = RTCRemoteOutboundRtpStreamStats.timestamp - (RTCRemoteOutboundRtpStreamStats.remoteTimestamp + RTCRemoteInboundRtpStreamStats.roundTripTime / 2)
	// senderCaptureTimestamp = RTCRtpContributingSource.captureTimestamp + RTCRtpContributingSource.senderCaptureTimeOffset
	// so...
	// oneWayDelay = RTCRtpContributingSource.timestamp - receiverCaptureTimestamp
	// oneWayDelay = RTCRtpContributingSource.timestamp - (senderCaptureTimestamp + senderReceiverTimeOffset)
	// oneWayDelay = RTCRtpContributingSource.timestamp - (RTCRtpContributingSource.captureTimestamp + RTCRtpContributingSource.senderCaptureTimeOffset + RTCRemoteOutboundRtpStreamStats.timestamp - (RTCRemoteOutboundRtpStreamStats.remoteTimestamp + RTCRemoteInboundRtpStreamStats.roundTripTime / 2))
	// oneWayDelay = RTCRtpContributingSource.timestamp - RTCRtpContributingSource.captureTimestamp - RTCRtpContributingSource.senderCaptureTimeOffset - RTCRemoteOutboundRtpStreamStats.timestamp + RTCRemoteOutboundRtpStreamStats.remoteTimestamp + RTCRemoteInboundRtpStreamStats.roundTripTime / 2
	// oneWayDelay = (RTCRtpContributingSource.timestamp - RTCRtpContributingSource.captureTimestamp - RTCRtpContributingSource.senderCaptureTimeOffset)
	//   - (RTCRemoteOutboundRtpStreamStats.timestamp - RTCRemoteOutboundRtpStreamStats.remoteTimestamp) + RTCRemoteInboundRtpStreamStats.roundTripTime / 2
	// oneWayDelay = captureDelay - timestampDiff + roundTripTime / 2

	return { roundTripTime$, timestampDiff$, audio: createReceiverAndCaptureDelayStores("audio"), video: createReceiverAndCaptureDelayStores("video") };
};
