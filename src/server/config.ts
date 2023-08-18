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
	adminPaths?: string[];
	receiverPrefix?: string;
	rtcConfiguration?: RTCConfiguration;
	mediaConstraints?: MediaStreamConstraints;
	recordPrefix?: string;
	recordingsFolder?: string;
	recordOptions?: MediaRecorderOptions;
	targetDelay?: number;
	log?: string;
}

export interface TLSCertificate {
	certificate: string;
	privateKey: string;
}
