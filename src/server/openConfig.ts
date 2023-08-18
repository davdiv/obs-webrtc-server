import { createInterface, Readline } from "readline/promises";
import { readFile, writeFile } from "fs/promises";
import yaml from "yaml";
import type { ServerConfig } from "./config";
import { getInstallPath } from "./installPath";
import { createId } from "./utils/createId";
import { generateTLSCertificate } from "./utils/tlsCertificate";
import { validate } from "./validator";

export const schemaPath = () => getInstallPath("./schema.json");
const configHeader = `# obs-webrtc-server configuration file\n# yaml-language-server: $schema=${schemaPath()}\n`;
export const stringifyConfig = (config: ServerConfig) => `${configHeader}${yaml.stringify(config)}`;

const defaultConfig = (): ServerConfig => {
	return {
		log: "./obs-webrtc-server-log.jsonl",
		receiverPrefix: `/${createId()}/`,
		recordPrefix: `/${createId()}/`,
		recordingsFolder: "./recordings/",
		emitterPaths: [`/${createId()}/`],
		adminPaths: [`/${createId()}/`],
		listenPort: 8080,
		mediaConstraints: {
			audio: true,
			video: {
				width: 1280,
				height: 720,
			},
		},
	};
};

const askQuestions = async (configFile: string): Promise<ServerConfig> => {
	const res: ServerConfig = {};
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	const stream = new Readline(process.stdout);
	stream.cursorTo(0, 0);
	stream.clearScreenDown();
	stream.commit();
	console.log("Welcome to obs-webrtc-server!");
	console.log("This program will start a web server allowing browsers connected to it to share their camera/microphone/screen");
	console.log("which are automatically added as sources in OBS Studio and can be recorded individually.");
	console.log("");
	console.log("Please start OBS Studio, check that the 'Enable WebSocket server' checkbox is checked (in Tools > WebSocket Server Settings),");
	console.log("and provide here the 'Server Password' (which is displayed by clicking on the 'Show Connect Info' button)");
	console.log("");
	console.log(`Note that the password will be saved in the following configuration file: ${configFile}`);
	res.obsPassword = await rl.question("Server Password:");
	stream.moveCursor(0, -1);
	stream.clearLine(0);
	stream.commit();
	rl.close();
	return res;
};

export const openConfigFile = async (configFile: string) => {
	let changed = false;
	let parsedFileContent: ServerConfig;
	try {
		const strFileContent = await readFile(configFile, "utf8");
		parsedFileContent = yaml.parse(strFileContent);
		if (!validate(parsedFileContent)) {
			console.log(validate.errors);
			throw new Error("Invalid configuration");
		}
		if (!strFileContent.startsWith(configHeader)) {
			changed = true;
		}
	} catch (error: any) {
		if (error.code !== "ENOENT") {
			throw error;
		}
		parsedFileContent = await askQuestions(configFile);
		changed = true;
	}
	const defConfig = defaultConfig();
	for (const prop of Object.keys(defConfig) as (keyof ServerConfig)[]) {
		if (!Object.hasOwn(parsedFileContent, prop)) {
			changed = true;
			parsedFileContent[prop] = defConfig[prop] as any;
		}
	}
	if (!parsedFileContent.tlsCertificate) {
		changed = true;
		parsedFileContent.tlsCertificate = await generateTLSCertificate();
	}
	if (changed) {
		await writeFile(configFile, stringifyConfig(parsedFileContent));
	}
	return parsedFileContent;
};
