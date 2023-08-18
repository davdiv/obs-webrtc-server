export interface BatteryInfo {
	charging: boolean;
	level: number;
	chargingTime: number;
	dischargingTime: number;
}

export type ServerSentInfo = ServerSentEmitterInfo | ServerSentReceiverInfo | ServerSentAdminInfo;

export interface TransformImage {
	zoom?: number;
	positionX?: number;
	positionY?: number;
}

export interface ServerSentEmitterInfo extends ReceiverToEmitterInfo {
	mode: "emitter";
	recordingInReceiver?: boolean;
	mediaConstraints?: MediaStreamConstraints;
	recordOptions?: MediaRecorderOptions;
	record?: string | undefined;
}

export interface ServerSentReceiverInfo extends EmitterToReceiverInfo {
	mode: "receiver";
	record?: string | undefined;
	recordURL?: string;
	recordOptions?: MediaRecorderOptions;
	targetDelay?: number;
	transformImage?: TransformImage;
}

export interface ServerSentAdminInfo {
	mode: "admin";
	emitters: { [emitterId: string]: EmitterAdminInfo };
	files: Record<string, number>;
}

export type ClientSentInfo = ClientSentEmitterInfo | ClientSentReceiverInfo | undefined;

export interface EmitterAdminInfo {
	emitterShortId: string;
	emitterIP: string;
	emitterInfo?: ClientSentEmitterInfo;
	receiverIP?: string;
	receiverInfo?: ClientSentReceiverInfo;
	transformImage?: TransformImage;
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

export interface StoredFileInfo {
	name: string;
	size: number;
}

export interface RecordingInfo extends StoredFileInfo {
	startTime: string;
	updateTime: string;
}

export interface ClientSentEmitterInfo extends EmitterToReceiverInfo {
	streamInfo?: StreamInfo;
	videoResolution?: Resolution;
	recording?: RecordingInfo;
	storageInfo?: StorageInfo;
	batteryInfo?: BatteryInfo;
	files?: StoredFileInfo[];
}

export interface ClientSentReceiverInfo extends ReceiverToEmitterInfo {
	audioDelay?: number;
	videoDelay?: number;
	recording?: RecordingInfo;
	videoResolution?: Resolution;
	viewport?: Resolution;
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
	uploadFile(arg: { fileName: string; uploadURL: string }): void;
	removeFile(arg: { fileName: string }): void;
}

export interface RpcServerInterface {
	iceCandidate?(arg: { candidate: RTCIceCandidateInit | null }): void;
	uploadFile?(arg: { emitterId: string; fileName: string }): void;
	removeFile?(arg: { emitterId: string; fileName: string }): void;
	toggleRecording?(arg: { emitterId: string; action: "stop" | "start" | "newFile"; receiver?: boolean; emitter?: boolean }): void;
	transformImage?(arg: { emitterId: string; transformImage: TransformImage | undefined }): void;
}
