import type { AppError } from "./types";

type Ok<T> = { ok: true; data: T };
type Fail = { ok: false; error: AppError };

function clientNetworkError(): AppError {
  return {
    code: "unknown",
    message:
      "Lost connection to the app (dev server or network). Refresh if retry keeps failing — your last results are still in memory until you reload.",
    retryable: true,
  };
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw clientNetworkError();
  }
  let json: Ok<T> | Fail;
  try {
    json = (await response.json()) as Ok<T> | Fail;
  } catch {
    throw clientNetworkError();
  }
  if (!json.ok) throw json.error;
  return json.data;
}

export async function apiGet<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path);
  } catch {
    throw clientNetworkError();
  }
  let json: Ok<T> | Fail;
  try {
    json = (await response.json()) as Ok<T> | Fail;
  } catch {
    throw clientNetworkError();
  }
  if (!json.ok) throw json.error;
  return json.data;
}

export function isAppError(error: unknown): error is AppError {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      "message" in error &&
      "retryable" in error,
  );
}
