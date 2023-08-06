import type { OnUseArgument } from "@amadeus-it-group/tansu";
import { computed, writable } from "@amadeus-it-group/tansu";
import { checkAbortSignal } from "../../common/abortUtils";
import { asyncSerialDerived } from "../../common/asyncSerialDerived";
import type { StorageInfo } from "../../common/rpcInterface";

export interface FileInfo {
	name: string;
	size: number;
	fileHandle: FileSystemFileHandle;
	file: File;
}

const refresh$ = writable({});
export const refreshStorageFiles = () => refresh$.set({});
export const browserStorageFiles = asyncSerialDerived(refresh$, {
	initialValue: [] as FileInfo[],
	async derive(unused, set: OnUseArgument<FileInfo[]>, signal) {
		set(await getFiles(signal));
	},
});

export const spaceAvailable$ = asyncSerialDerived(refresh$, {
	async derive(unused, set: OnUseArgument<Pick<StorageInfo, "usage" | "quota"> | undefined>) {
		const result = await navigator.storage.estimate();
		// on some browsers, result may have more properties than only quota and usage
		set({
			quota: result.quota,
			usage: result.usage,
		});
	},
});

export const persisted$ = asyncSerialDerived(refresh$, {
	async derive(unused, set: OnUseArgument<boolean | undefined>) {
		set(await navigator.storage.persisted());
	},
});

const getFiles = async (signal: AbortSignal) => {
	const directory = await navigator.storage.getDirectory();
	const files: FileInfo[] = [];
	for await (const entry of (directory as any).values()) {
		const file: File = await entry.getFile();
		files.push({
			name: entry.name,
			size: file.size,
			fileHandle: entry,
			file,
		});
		checkAbortSignal(signal);
	}
	return files;
};

export const saveFile = async (fileInfo: FileInfo) => {
	const url = URL.createObjectURL(fileInfo.file);
	const link = document.createElement("a");
	link.href = url;
	link.download = `obs-webrtc-server-${fileInfo.fileHandle.name}`;
	link.click();
	await 0;
	URL.revokeObjectURL(url);
};

export const removeFile = async (fileInfo: FileInfo) => {
	const directory = await navigator.storage.getDirectory();
	await directory.removeEntry(fileInfo.fileHandle.name);
	refreshStorageFiles();
};

export const requestPersistentStorage = async () => {
	await navigator.storage.persist();
	refreshStorageFiles();
};

export const storageInfo$ = computed(
	(): StorageInfo => ({
		...spaceAvailable$(),
		persisted: persisted$(),
	}),
);
