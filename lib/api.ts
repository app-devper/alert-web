const ALERT_API_URL =
  process.env.NEXT_PUBLIC_ALERT_API_URL ?? "https://api.devper.app/api/alert/v1";
const UM_API_URL =
  process.env.NEXT_PUBLIC_UM_API_URL ?? "https://api.devper.app/api/um/v1";

export interface Envelope<T> {
  success: boolean;
  data: T;
  error: { code: string; message: string } | null;
  meta?: { total: number; page: number; limit: number };
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(url: string, init: RequestInit): Promise<Envelope<T>> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const code = body?.error?.code ?? body?.errcode ?? "UNKNOWN";
    const message = body?.error?.message ?? body?.error ?? response.statusText;
    throw new ApiError(code, message, response.status);
  }
  return body as Envelope<T>;
}

function jsonHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { "Content-Type": "application/json", ...extra };
}

export function staffToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("alert.staffToken") ?? "";
}

export function setStaffToken(token: string) {
  localStorage.setItem("alert.staffToken", token);
}

export function clearStaffToken() {
  localStorage.removeItem("alert.staffToken");
}

export function customerToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("alert.sessionToken") ?? "";
}

export function setCustomerToken(token: string) {
  localStorage.setItem("alert.sessionToken", token);
}

export function clearCustomerToken() {
  localStorage.removeItem("alert.sessionToken");
}

export async function publicGet<T>(path: string): Promise<Envelope<T>> {
  return request<T>(`${ALERT_API_URL}${path}`, { headers: jsonHeaders() });
}

export async function publicPost<T>(path: string, body?: unknown): Promise<Envelope<T>> {
  return request<T>(`${ALERT_API_URL}${path}`, {
    method: "POST",
    headers: jsonHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function customerHeaders(): Record<string, string> {
  return jsonHeaders({ "X-Session-Token": customerToken() });
}

export async function customerGet<T>(path: string): Promise<Envelope<T>> {
  return request<T>(`${ALERT_API_URL}${path}`, { headers: customerHeaders() });
}

export async function customerPost<T>(path: string, body?: unknown): Promise<Envelope<T>> {
  return request<T>(`${ALERT_API_URL}${path}`, {
    method: "POST",
    headers: customerHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function customerDelete<T>(path: string): Promise<Envelope<T>> {
  return request<T>(`${ALERT_API_URL}${path}`, {
    method: "DELETE",
    headers: customerHeaders(),
  });
}

function staffHeaders(): Record<string, string> {
  return jsonHeaders({ Authorization: `Bearer ${staffToken()}` });
}

export async function staffGet<T>(path: string): Promise<Envelope<T>> {
  return request<T>(`${ALERT_API_URL}${path}`, { headers: staffHeaders() });
}

export async function staffPost<T>(path: string, body?: unknown): Promise<Envelope<T>> {
  return request<T>(`${ALERT_API_URL}${path}`, {
    method: "POST",
    headers: staffHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function staffPut<T>(path: string, body?: unknown): Promise<Envelope<T>> {
  return request<T>(`${ALERT_API_URL}${path}`, {
    method: "PUT",
    headers: staffHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

interface LoginResponse {
  accessToken: string;
}

export async function umLogin(username: string, password: string): Promise<string> {
  const response = await fetch(`${UM_API_URL}/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ username, password }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError("LOGIN_FAILED", body?.error ?? "เข้าสู่ระบบไม่สำเร็จ", response.status);
  }
  const token = (body as LoginResponse)?.accessToken ?? body?.data?.accessToken;
  if (!token) {
    throw new ApiError("LOGIN_FAILED", "ไม่พบ token จากระบบยืนยันตัวตน", 500);
  }
  return token;
}
