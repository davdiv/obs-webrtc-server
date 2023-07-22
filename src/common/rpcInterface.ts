export type ServerSentInfo = ServerSentEmitterInfo | ServerSentReceiverInfo;

export interface ServerSentEmitterInfo extends ReceiverToEmitterInfo {
	type: "emitter";
	mediaConstraints?: MediaStreamConstraints;
}

export interface ServerSentReceiverInfo {
	type: "receiver";
	recordURL?: string;
	recordOptions?: MediaRecorderOptions;
}

export type ClientSentInfo = ClientSentEmitterInfo | ClientSentReceiverInfo | undefined;

export interface ClientSentEmitterInfo {
	streamInfo?: StreamInfo;
}

export interface ClientSentReceiverInfo extends ReceiverToEmitterInfo {}

export interface ReceiverToEmitterInfo {
	obsActive?: boolean;
}

export interface StreamInfo {
	hasAudio: boolean;
	hasVideo: boolean;
}

export interface RpcClientInterface {
	createRTCConnection(arg: { configuration: RTCConfiguration }): void;
	deleteRTCConnection(arg: Record<string, never>): void;
	createOfferRTCConnection(arg: Record<string, never>): RTCSessionDescriptionInit;
	createAnswerRTCConnection(arg: { offer: RTCSessionDescriptionInit }): RTCSessionDescriptionInit;
	completeOfferRTCConnection(arg: { answer: RTCSessionDescriptionInit }): void;
	iceCandidate(arg: { candidate: RTCIceCandidateInit | null }): void;
}

export interface RpcServerInterface {
	iceCandidate(arg: { candidate: RTCIceCandidateInit | null }): void;
}
