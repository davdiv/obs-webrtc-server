import type { ServerConfig } from "./config";
export const validate: {
	(input: any): input is ServerConfig;
	errors: any;
};
