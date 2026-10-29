import {
  ApiError,
  clearAlertHost,
  clearStaffToken,
  resolveAlertHostFromUmSystem,
  setStaffToken,
  umExchange,
  umSystemCode,
} from "@/lib/api";

/**
 * Signs in with the one-time ticket UM put in the address when the user
 * opened Alert from UM (um-api ADR-0011); any earlier session here ends first
 * and a token for another system is refused.
 */
export async function continueFromUm(ticket: string): Promise<void> {
  clearStaffToken();
  clearAlertHost();
  const token = await umExchange(ticket);
  if ((await umSystemCode(token)) !== "ALERT") {
    throw new ApiError("WRONG_SYSTEM", "บัญชีนี้เปิดระบบ Alert จาก UM ไม่ได้ กรุณาเข้าสู่ระบบ", 403);
  }
  setStaffToken(token);
  await resolveAlertHostFromUmSystem(token);
}
