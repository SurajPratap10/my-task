import type { AppError } from "./types";

export class LlmError extends Error {
  code: AppError["code"];
  retryable: boolean;

  constructor(code: AppError["code"], message: string, retryable: boolean) {
    super(message);
    this.name = "LlmError";
    this.code = code;
    this.retryable = retryable;
  }

  toPayload(): AppError {
    return { code: this.code, message: this.message, retryable: this.retryable };
  }
}

export function friendlyNetworkMessage(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const msg = error.message.toLowerCase();
  const cause =
    error.cause instanceof Error ? error.cause.message.toLowerCase() : String(error.cause ?? "").toLowerCase();
  const combined = `${msg} ${cause}`;
  if (
    combined.includes("fetch failed") ||
    combined.includes("econnreset") ||
    combined.includes("etimedout") ||
    combined.includes("enotfound") ||
    combined.includes("socket hang up") ||
    combined.includes("network")
  ) {
    return "Could not reach the model API (network hiccup). Retry — your filters and results are unchanged.";
  }
  return null;
}

export function asAppError(error: unknown): AppError {
  if (error instanceof LlmError) return error.toPayload();
  if (error instanceof Error && error.name === "TimeoutError") {
    return {
      code: "timeout",
      message: "The model took too long. Your spec is unchanged — try again.",
      retryable: true,
    };
  }
  const network = friendlyNetworkMessage(error);
  return {
    code: "unknown",
    message: network ?? (error instanceof Error ? error.message : "Something unexpected broke."),
    retryable: true,
  };
}
