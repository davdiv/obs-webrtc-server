import type { OnUseArgument } from "@amadeus-it-group/tansu";
import { writable } from "@amadeus-it-group/tansu";
import { asyncSerialDerived } from "../../common/asyncSerialDerived";
import { checkAbortSignal } from "../../common/abortUtils";

const refresh$ = writable({});
export const refreshStorageFiles = () => refresh$.set({});
export const browserStorageFiles = asyncSerialDerived(refresh$, {
	initialValue: [] as FileSystemFileHandle[],
	async derive(unused, set: OnUseArgument<FileSystemFileHandle[]>, signal) {
		set(await getFiles(signal));
	},
});

export const spaceAvailable$ = asyncSerialDerived(refresh$, {
	async derive(unused, set: OnUseArgument<StorageEstimate | undefined>) {
		set(await navigator.storage.estimate());
	},
});

export const persisted$ = asyncSerialDerived(refresh$, {
	async derive(unused, set: OnUseArgument<boolean | undefined>) {
		set(await navigator.storage.persisted());
	},
});

const getFiles = async (signal: AbortSignal) => {
	const directory = await navigator.storage.getDirectory();
	const files: FileSystemFileHandle[] = [];
	for await (const entry of (directory as any).values()) {
		files.push(entry);
		checkAbortSignal(signal);
	}
	return files;
};

export const saveFile = async (fileHandle: FileSystemFileHandle) => {
	const file = await fileHandle.getFile();
	const url = URL.createObjectURL(file);
	const link = document.createElement("a");
	link.href = url;
	link.download = `obs-webrtc-server-${fileHandle.name}`;
	link.click();
};

export const removeFile = async (fileHandle: FileSystemFileHandle) => {
	const directory = await navigator.storage.getDirectory();
	await directory.removeEntry(fileHandle.name);
	refreshStorageFiles();
};

export const requestPersistentStorage = async () => {
	await navigator.storage.persist();
	refreshStorageFiles();
};
