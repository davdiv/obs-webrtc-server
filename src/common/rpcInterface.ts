export interface BatteryInfo {
	charging: boolean;
	level: number;
	chargingTime: number;
	dischargingTime: number;
}

export type ServerSentInfo = ServerSentEmitterInfo | ServerSentReceiverInfo | ServerSentAdminInfo;

export interface ServerSentEmitterInfo extends ReceiverToEmitterInfo {
	mode: "emitter";
	mediaConstraints?: MediaStreamConstraints;
}

export interface ServerSentReceiverInfo extends EmitterToReceiverInfo {
	mode: "receiver";
	recordURL?: string;
	recordOptions?: MediaRecorderOptions;
	targetDelay?: number;
}

export interface ServerSentAdminInfo {
	mode: "admin";
	emitters: { [emitterId: string]: EmitterAdminInfo };
}

export type ClientSentInfo = ClientSentEmitterInfo | ClientSentReceiverInfo | undefined;

export interface EmitterAdminInfo {
	emitterIP: string;
	emitterInfo?: ClientSentEmitterInfo;
	receiverIP?: string;
	receiverInfo?: ClientSentReceiverInfo;
}

export interface Resolution {
	width: number;
	height: number;
}

export interface StorageInfo {
	quota?: number;
	usage?: number;
	persisted?: boolean;
}

export interface ClientSentEmitterInfo extends EmitterToReceiverInfo {
	streamInfo?: StreamInfo;
	videoResolution?: Resolution;
	recording?: boolean;
	storageInfo?: StorageInfo;
	batteryInfo?: BatteryInfo;
}

export interface ClientSentReceiverInfo extends ReceiverToEmitterInfo {
	audioDelay?: number;
	videoDelay?: number;
}

export interface ReceiverToEmitterInfo {
	obsActive?: boolean;
}

export interface EmitterToReceiverInfo {
	roundTripTime?: number;
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
	iceCandidate?(arg: { candidate: RTCIceCandidateInit | null }): void;
}
