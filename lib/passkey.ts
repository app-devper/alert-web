import { ApiError, jsonHeaders, UM_API_URL } from "@/lib/api";

type JsonCredentialStatics = {
  parseRequestOptionsFromJSON?: (o: unknown) => PublicKeyCredentialRequestOptions;
  isConditionalMediationAvailable?: () => Promise<boolean>;
};

/** How to ask for a passkey: in the browser's modal prompt, or offered in the username field (conditional). */
export type PasskeyRequest = { conditional?: boolean; signal?: AbortSignal };

function statics(): JsonCredentialStatics | null {
  if (typeof window === "undefined" || typeof window.PublicKeyCredential !== "function") return null;
  return window.PublicKeyCredential as unknown as JsonCredentialStatics;
}

/** Whether this browser can answer UM's passkey login options. */
export function passkeysSupported(): boolean {
  return typeof statics()?.parseRequestOptionsFromJSON === "function";
}

/** Whether this browser can offer passkeys in the username field (WebAuthn conditional mediation). */
export async function passkeyAutofillSupported(): Promise<boolean> {
  const s = statics();
  if (!s?.parseRequestOptionsFromJSON || typeof s.isConditionalMediationAvailable !== "function") return false;
  try {
    return await s.isConditionalMediationAvailable();
  } catch {
    return false;
  }
}

async function umPost(path: string, body: unknown): Promise<unknown> {
  const response = await fetch(`${UM_API_URL}${path}`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(data?.code ?? "PASSKEY_FAILED", passkeyMessage(data?.code, response.status), response.status);
  return data;
}

function passkeyMessage(code: string | undefined, status: number): string {
  if (code === "UM-401-005") return "passkey นี้ใช้กับระบบนี้ไม่ได้ ลองเลือก passkey อื่นหรือเข้าสู่ระบบด้วยรหัสผ่าน";
  if (code === "UM-401-006") return "passkey ที่เลือกเป็นของบัญชีอื่น ไม่ตรงกับชื่อผู้ใช้ที่กรอก เลือก passkey ของบัญชีนี้หรือล้างช่องชื่อผู้ใช้";
  if (code === "UM-400-006") return "คำขอ passkey หมดเวลา ลองใหม่อีกครั้ง";
  if (code === "UM-404-002") return "ระบบยังไม่เปิดใช้ passkey";
  if (status === 401) return "บัญชีนี้ใช้ระบบ Alert ไม่ได้";
  if (status === 429) return "ลองหลายครั้งเกินไป กรุณารอสักครู่";
  return "เข้าสู่ระบบด้วย passkey ไม่สำเร็จ";
}

/**
 * Signs in with a passkey on ALERT (um-api ADR-0010): UM issues the options,
 * the browser asks the authenticator, UM checks the answer and returns a token.
 * `typedUsername` is what the login form holds when the passkey answers.
 */
export async function umPasskeyLogin(typedUsername = "", request: PasskeyRequest = {}): Promise<string> {
  const parse = statics()?.parseRequestOptionsFromJSON;
  if (!parse) throw new ApiError("PASSKEY_UNSUPPORTED", "เบราว์เซอร์นี้ใช้ passkey ไม่ได้", 400);
  const options = (await umPost("/auth/passkey/login/options", { system: "ALERT" })) as {
    ceremonyId: string;
    options: { publicKey: unknown };
  };
  let credential: Credential | null;
  try {
    credential = await navigator.credentials.get({
      publicKey: parse(options.options.publicKey),
      mediation: request.conditional ? "conditional" : undefined,
      signal: request.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "AbortError")) {
      throw new ApiError("PASSKEY_CANCELLED", "ยกเลิกการใช้ passkey แล้ว", 400);
    }
    throw new ApiError("PASSKEY_FAILED", "เข้าสู่ระบบด้วย passkey ไม่สำเร็จ", 400);
  }
  if (!credential) throw new ApiError("PASSKEY_CANCELLED", "ยกเลิกการใช้ passkey แล้ว", 400);
  const json = (credential as PublicKeyCredential & { toJSON: () => unknown }).toJSON();
  // The typed username, if any, must own the passkey (um-api ADR-0010).
  const username = typedUsername.trim();
  const data = (await umPost("/auth/passkey/login", { ceremonyId: options.ceremonyId, credential: json, ...(username ? { username } : {}) })) as {
    accessToken?: string;
  };
  if (!data?.accessToken) throw new ApiError("LOGIN_FAILED", "ไม่พบ token จากระบบยืนยันตัวตน", 500);
  return data.accessToken;
}
