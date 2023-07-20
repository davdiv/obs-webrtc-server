import { randomBytes, createHash } from "crypto";
export const createId = () => randomBytes(64).toString("base64url");
export const hashId = (id: string) => createHash("sha256").update(id, "utf8").digest("base64url").substring(0, 10);
