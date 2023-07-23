export interface ServerConfig {
	obsServer?: string;
	obsPassword?: string;
	obsPort?: number;
	obsScenePrefix?: string;
	obsSceneExtraSources?: string[];
	tlsCertificate?: TLSCertificate;
	listenPort?: number;
	listenHost?: string;
	emitterPaths?: string[];
	receiverPrefix?: string;
	rtcConfiguration?: RTCConfiguration;
	mediaConstraints?: MediaStreamConstraints;
	record?: boolean;
	recordPrefix?: string;
	recordingsFolder?: string;
	recordOptions?: MediaRecorderOptions;
}

export interface TLSCertificate {
	certificate: string;
	privateKey: string;
}
