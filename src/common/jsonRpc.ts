export const stringifyError = (error: any) => `${error}`.replace(/^Error:\s*/, "");

export type RemoteFunctionParam<T> = T extends (arg: infer U) => any ? U : never;
export type RemoteFunctionReturnType<T> = T extends (arg: any) => infer V ? V : never;
export type RemoteFunctionImpl<T, Context> = T extends (arg: infer U) => infer V ? (arg: U, context: Context) => Promise<V> : never;
export type RemoteInterfaceImpl<T, Context> = { [K in keyof T]: RemoteFunctionImpl<T[K], Context> };
export type CallMethod<T> = <K extends keyof T>(methodName: K, params: RemoteFunctionParam<T[K]>) => Promise<RemoteFunctionReturnType<T[K]>>;
export interface JsonRPCTransport {
	write(message: string): void;
	isClosed(): boolean;
	addCloseListener(listener: () => void): void;
	addMessageListener(listener: (value: string) => void): void;
}

export const jsonRpc = <T, U, Context>(methods: RemoteInterfaceImpl<U, Context>, transport: JsonRPCTransport, context: Context) => {
	methods = Object.assign(Object.create(null), methods);

	const sendJson = (json: any) => {
		const message = JSON.stringify(json);
		transport.write(message);
	};

	transport.addMessageListener(async (stringValue: string) => {
		let value;
		try {
			// TODO: __proto__
			value = JSON.parse(stringValue);
		} catch (error) {
			// parse error
			return;
		}
		const id = value?.id;
		const methodName = value.method;
		if (methodName) {
			try {
				const method = (methods as any)[methodName];
				if (!method) {
					sendJson({ jsonrpc: "2.0", error: { message: "Method not found", code: -32601 }, id });
					return;
				}
				const result = (await method(value.params, context)) ?? null;
				if (id) {
					sendJson({ jsonrpc: "2.0", result, id });
				}
			} catch (error: any) {
				if (id) {
					sendJson({ jsonrpc: "2.0", error: { message: stringifyError(error), code: 1 }, id });
				}
			}
		} else if (id) {
			const listener = idsMap.get(id);
			if (listener) {
				idsMap.delete(id);
				listener(value);
			}
		}
	});

	const idsMap = new Map<number, (value: any) => void>();
	let idCounter = 0;
	const callMethod: CallMethod<T> = async (methodName, params) => {
		if (transport.isClosed()) {
			return Promise.reject(new Error("Connection closed"));
		}
		const id = ++idCounter;
		const promise = new Promise<any>((resolve) => idsMap.set(id, resolve));
		sendJson({ jsonrpc: "2.0", method: methodName, params, id });
		const object = await promise;
		if ("result" in object) {
			return object.result;
		}
		return Promise.reject(object.error);
	};
	transport.addCloseListener(() => {
		const values = [...idsMap.values()];
		idsMap.clear();
		for (const resolve of values) {
			resolve({ error: new Error("Connection closed") });
		}
	});

	return callMethod;
};
