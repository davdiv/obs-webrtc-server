export const stringifyError = (error: any) => `${error.message ?? error}`.replace(/^Error:\s*/, "");
