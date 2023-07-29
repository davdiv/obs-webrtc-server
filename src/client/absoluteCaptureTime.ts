const kAbsCaptureTime = "http://www.webrtc.org/experiments/rtp-hdrext/abs-capture-time";

const hasSetHeaderExtensionsToNegotiate = !!(RTCRtpTransceiver.prototype as any)["setHeaderExtensionsToNegotiate"];

function addHeaderExtensionToSdp(sdp: string, uri: string) {
	// Code copied from https://github.com/web-platform-tests/wpt/pull/22115/files
	const extmap = new RegExp("a=extmap:(\\d+)");
	const sdpLines = sdp.split("\r\n");

	// This assumes at most one audio m= section and one video m= section.
	// If more are present, only the first section of each kind is munged.
	for (const section of ["audio", "video"]) {
		let found_section = false;
		let maxId = undefined;
		let maxIdLine = undefined;
		let extmapAllowMixed = false;

		// find the largest header extension id for section.
		for (let i = 0; i < sdpLines.length; ++i) {
			if (!found_section) {
				if (sdpLines[i].startsWith("m=" + section)) {
					found_section = true;
				}
				continue;
			} else {
				if (sdpLines[i].startsWith("m=")) {
					// end of section
					break;
				}
			}

			if (sdpLines[i] === "a=extmap-allow-mixed") {
				extmapAllowMixed = true;
			}
			const result = sdpLines[i].match(extmap);
			if (result && result.length === 2) {
				if (maxId == undefined || +result[1] > maxId) {
					maxId = +result[1];
					maxIdLine = i;
				}
			}
		}

		if (maxId == 14 && !extmapAllowMixed) {
			// Reaching the limit of one byte header extension. Adding two byte header
			// extension support.
			sdpLines.splice(maxIdLine! + 1, 0, "a=extmap-allow-mixed");
		}
		if (maxIdLine !== undefined) {
			sdpLines.splice(maxIdLine + 1, 0, "a=extmap:" + (maxId! + 1).toString() + " " + uri);
		}
	}
	return sdpLines.join("\r\n");
}

export const addCaptureTimeToSdp = hasSetHeaderExtensionsToNegotiate ? (sdp: string) => sdp : (sdp: string) => addHeaderExtensionToSdp(sdp, kAbsCaptureTime);
export const addCaptureTimeToRTCConnection = hasSetHeaderExtensionsToNegotiate
	? (peerConnection: RTCPeerConnection) => {
			for (const transceiver of peerConnection.getTransceivers() as any[]) {
				const capabilities = transceiver.getHeaderExtensionsToNegotiate();
				for (const capability of capabilities) {
					if (capability.uri === kAbsCaptureTime) {
						capability.direction = "sendrecv";
					}
				}
				transceiver.setHeaderExtensionsToNegotiate(capabilities);
			}
	  }
	: () => {};
