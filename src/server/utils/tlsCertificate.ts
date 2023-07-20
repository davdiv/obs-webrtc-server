import rs from "jsrsasign";

const THOUSAND_YEARS_IN_MS = 1000 * 365 * 24 * 60 * 60 * 1000;

const lineReturnRegExp = /\r\n|\n\r/g;

// https://github.com/kjur/jsrsasign/wiki/Tutorial-for-generating-X.509-certificate
export const generateTLSCertificate = async (): Promise<{ certificate: string; privateKey: string }> => {
	const kp = rs.KEYUTIL.generateKeypair("EC", "secp256r1");
	const prv = kp.prvKeyObj;
	const pub = kp.pubKeyObj;
	const prvpem = rs.KEYUTIL.getPEM(prv, "PKCS8PRV");

	const notBefore = new Date();
	const notAfter = new Date(notBefore.getTime() + THOUSAND_YEARS_IN_MS);
	const subject = "/CN=OBS WebRTC server";
	const x = new rs.KJUR.asn1.x509.Certificate({
		version: 3,
		serial: { int: notBefore.getTime() },
		issuer: { str: subject },
		notbefore: new rs.KJUR.asn1.DERUTCTime({ date: notBefore }).getString(),
		notafter: new rs.KJUR.asn1.DERUTCTime({ date: notAfter }).getString(),
		subject: { str: subject },
		sbjpubkey: pub,
		ext: [
			{ extname: "basicConstraints", cA: false },
			{ extname: "keyUsage", critical: true, names: ["digitalSignature"] },
		],
		sigalg: "SHA256withECDSA",
		cakey: prv,
	});

	return {
		privateKey: prvpem.replace(lineReturnRegExp, "\n"),
		certificate: x.getPEM().replace(lineReturnRegExp, "\n"),
	};
};
