export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

export function badRequest(message: string) {
  return Object.assign(new Error(message), { code: "BAD_REQUEST" });
}

export function notFound(message: string) {
  return Object.assign(new Error(message), { code: "NOT_FOUND" });
}
