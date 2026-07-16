"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, clearCustomerToken, customerGet, customerPost } from "@/lib/api";
import { subscribeWebPush } from "@/lib/push";

interface MyStatus {
  checkInNo: string;
  branchId: string;
  tableNo: string;
  groupSize: number;
  phoneMasked: string;
  preferredLanguage: string;
  checkedInAt: string;
  expiresAt: string;
  status: string;
  channels: { sms: boolean; push: boolean; line: boolean };
  consent: { consentAt: string; privacyNoticeVersion: string };
}

export default function StatusPage() {
  const [status, setStatus] = useState<MyStatus | null>(null);
  const [state, setState] = useState<"loading" | "none" | "ready">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    customerGet<MyStatus>("/public/me")
      .then((response) => {
        setStatus(response.data);
        setState("ready");
      })
      .catch(() => {
        clearCustomerToken();
        setState("none");
      });
  }, []);

  useEffect(load, [load]);

  const checkout = useCallback(async () => {
    try {
      await customerPost("/public/me/checkout");
      setMessage("เช็กเอาต์เรียบร้อยแล้ว ขอบคุณที่ใช้บริการ");
      load();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    }
  }, [load]);

  const withdraw = useCallback(async () => {
    if (!window.confirm("ถอนความยินยอมและลบข้อมูลทั้งหมดทันที?")) return;
    try {
      await customerPost("/public/me/withdraw");
      clearCustomerToken();
      setMessage("ลบข้อมูลของท่านเรียบร้อยแล้ว");
      setState("none");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด");
    }
  }, []);

  const enablePush = useCallback(async () => {
    try {
      if (await subscribeWebPush()) {
        load();
      } else {
        setMessage("เปิด Web Push ไม่สำเร็จ (ต้องอนุญาต Notification)");
      }
    } catch {
      setMessage("เปิด Web Push ไม่สำเร็จ");
    }
  }, [load]);

  if (state === "loading") {
    return <main className="p-6 text-center text-slate-500">กำลังโหลด…</main>;
  }
  if (state === "none") {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <div className="text-4xl">ℹ️</div>
        <h1 className="mt-4 text-xl font-bold">ไม่พบการลงทะเบียน</h1>
        <p className="mt-2 text-slate-600">{message || "กรุณาสแกน QR Code ของร้านเพื่อลงทะเบียน"}</p>
        <Link href="/" className="mt-6 inline-block text-red-600 underline">
          กลับหน้าหลัก
        </Link>
      </main>
    );
  }

  const isActive = status?.status === "ACTIVE";

  return (
    <main className="mx-auto max-w-md p-6">
      <header className="mb-6 text-center">
        <div className="text-3xl">{isActive ? "🟢" : "⚪️"}</div>
        <h1 className="text-xl font-bold">
          {isActive ? "กำลังอยู่ในร้าน — รับการแจ้งเตือน" : "สิ้นสุดการรับแจ้งเตือนแล้ว"}
        </h1>
        <p className="text-sm text-slate-500">หมายเลขลงทะเบียน {status?.checkInNo}</p>
      </header>
      {message && (
        <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">{message}</div>
      )}
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt className="text-slate-500">สาขา</dt>
          <dd>{status?.branchId}</dd>
          <dt className="text-slate-500">โต๊ะ/โซน</dt>
          <dd>{status?.tableNo || "-"}</dd>
          <dt className="text-slate-500">จำนวนคน</dt>
          <dd>{status?.groupSize}</dd>
          <dt className="text-slate-500">เบอร์โทรศัพท์</dt>
          <dd>{status?.phoneMasked}</dd>
          <dt className="text-slate-500">เช็กอินเมื่อ</dt>
          <dd>{status && new Date(status.checkedInAt).toLocaleString("th-TH")}</dd>
          <dt className="text-slate-500">หมดอายุอัตโนมัติ</dt>
          <dd>{status && new Date(status.expiresAt).toLocaleString("th-TH")}</dd>
        </dl>
      </section>
      <section className="mt-4 rounded-xl bg-white p-4 shadow-sm text-sm">
        <p className="font-semibold">ช่องทางแจ้งเตือนที่เปิดอยู่</p>
        <ul className="mt-2 space-y-1">
          <li>📱 SMS — เปิดเสมอ</li>
          <li>
            🔔 Web Push — {status?.channels.push ? "เปิด" : "ปิด"}
            {!status?.channels.push && isActive && (
              <button onClick={enablePush} className="ml-2 text-red-600 underline">
                เปิดใช้งาน
              </button>
            )}
          </li>
          <li>💬 LINE — ส่งตามเบอร์โทรศัพท์โดยอัตโนมัติ (LINE Official Notification)</li>
        </ul>
      </section>
      {isActive && (
        <button
          onClick={checkout}
          className="mt-6 w-full rounded-xl bg-slate-800 p-4 font-bold text-white"
        >
          เช็กเอาต์ — ออกจากร้านแล้ว
        </button>
      )}
      <section className="mt-6 rounded-xl bg-slate-100 p-4 text-xs text-slate-600">
        <p className="font-semibold">สิทธิของท่านตาม PDPA</p>
        <p className="mt-1">
          ข้อมูลถูกเก็บตาม Privacy Notice v{status?.consent.privacyNoticeVersion} และจะถูกลบอัตโนมัติตามเวลาที่แสดงด้านบน
        </p>
        <button onClick={withdraw} className="mt-2 text-red-600 underline">
          ถอนความยินยอมและลบข้อมูลทันที
        </button>
      </section>
    </main>
  );
}
