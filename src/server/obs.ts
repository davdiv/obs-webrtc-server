import OBS from "obs-websocket-js";
import type { RequestBatchRequest } from "obs-websocket-js";
import type { ServerConfig } from "./config";
import { hashId } from "./utils/createId";

export const noop = () => {};
export const obsManager = (
	{
		obsServer = "127.0.0.1",
		obsPassword,
		obsPort = 4455,
		obsScenePrefix = "webrtc-",
		obsSceneExtraSources = [],
	}: Pick<ServerConfig, "obsServer" | "obsPassword" | "obsPort" | "obsScenePrefix" | "obsSceneExtraSources">,
	buildURL: (id: string) => string,
) => {
	if (!obsPassword) {
		console.log("Connection to OBS not configured!");
		return {
			addId(id: string) {
				const url = buildURL(id);
				console.log("Adding receiver URL:", url);
				return () => {
					console.log("Removing receiver URL:", url);
				};
			},
		};
	}
	const ids = new Set<string>();
	let obs: OBS | undefined;
	const toSceneName = (id: string) => `${obsScenePrefix}${hashId(id)}`;
	const syncIds = async () => {
		if (!obs?.identified) return;
		const response = await obs.callBatch([{ requestType: "GetSceneList" }, { requestType: "GetVideoSettings" }]);
		const { scenes } = response[0].responseData as any as { scenes: { sceneName: string }[] };
		const { baseWidth: width, baseHeight: height } = response[1].responseData as { baseWidth: number; baseHeight: number };
		const keepSceneNames = new Map<string, string>();
		for (const id of ids) {
			keepSceneNames.set(toSceneName(id), id);
		}
		const missingSceneNames = new Set(keepSceneNames.keys());
		const batchedRequests: RequestBatchRequest[] = [];
		for (const { sceneName } of scenes) {
			if (sceneName.startsWith(obsScenePrefix)) {
				missingSceneNames.delete(sceneName);
				if (!keepSceneNames.has(sceneName)) {
					batchedRequests.push({
						requestType: "RemoveScene",
						requestData: {
							sceneName,
						},
					});
				}
			}
		}
		for (const sceneName of missingSceneNames) {
			const id = keepSceneNames.get(sceneName)!;
			batchedRequests.push(
				{
					requestType: "CreateScene",
					requestData: {
						sceneName,
					},
				},
				{
					requestType: "CreateInput",
					requestData: {
						sceneName,
						inputName: `${sceneName}-input`,
						inputKind: "browser_source",
						sceneItemEnabled: true,
						inputSettings: {
							url: buildURL(id),
							css: "",
							height,
							width,
							reroute_audio: true,
							shutdown: false,
							webpage_control_level: 1,
						},
					},
				},
			);
			obsSceneExtraSources.forEach((sourceName) => {
				batchedRequests.push({
					requestType: "CreateSceneItem",
					requestData: {
						sceneName,
						sourceName,
					},
				});
			});
		}
		if (batchedRequests.length > 0) {
			await obs.callBatch(batchedRequests);
		}
	};
	const connectToOBS = async function () {
		obs = new OBS();
		try {
			await obs.connect(`ws://${obsServer}:${obsPort}`, obsPassword, { rpcVersion: 1 });
		} catch (error) {
			console.log("connection error");
			setTimeout(connectToOBS, 1000);
			return;
		}
		obs.on("ConnectionClosed", () => {
			console.log("obs connection closed");
			setTimeout(connectToOBS, 1000);
		});
		await syncIds();
	};
	connectToOBS();
	return {
		addId(id: string) {
			ids.add(id);
			syncIds();
			return () => {
				ids.delete(id);
				syncIds();
			};
		},
	};
};
