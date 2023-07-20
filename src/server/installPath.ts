import { fileURLToPath } from "url";
const currentUrl = import.meta.url;
export const getInstallPath = (path: string) => fileURLToPath(new URL(path, currentUrl));
