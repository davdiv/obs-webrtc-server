export type ServerControlledData = ServerControlledDataEmitter | ServerControlledDataReceiver;
export interface ServerControlledDataEmitter {
	type: "emitter";
	mediaConstraints?: MediaStreamConstraints;
}
export interface ServerControlledDataReceiver {
	type: "receiver";
	recordURL?: string;
	recordOptions?: MediaRecorderOptions;
}
export interface StreamInfo {
	hasAudio: boolean;
	hasVideo: boolean;
}
export interface ReceiverInfo {
	active: boolean;
}
export interface RpcClientInterface {
	dataChange(data: ServerControlledData): void;
	receiverInfo(arg: ReceiverInfo): void;
	createRTCConnection(arg: { configuration: RTCConfiguration }): void;
	deleteRTCConnection(arg: Record<string, never>): void;
	createOfferRTCConnection(arg: Record<string, never>): RTCSessionDescriptionInit;
	createAnswerRTCConnection(arg: { offer: RTCSessionDescriptionInit }): RTCSessionDescriptionInit;
	completeOfferRTCConnection(arg: { answer: RTCSessionDescriptionInit }): void;
	iceCandidate(arg: { candidate: RTCIceCandidateInit | null }): void;
}
export interface RpcServerInterface {
	streamChange(arg: StreamInfo): void;
	receiverInfo(arg: ReceiverInfo): void;
	iceCandidate(arg: { candidate: RTCIceCandidateInit | null }): void;
}
