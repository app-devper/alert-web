"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { continueFromUm } from "@/lib/sign-in";

/** Signs in with the one-time ticket UM put in the address (um-api ADR-0011). */
export default function SsoPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const ticket = new URLSearchParams(window.location.search).get("ticket");
    window.history.replaceState(null, "", "/sso");
    if (!ticket) {
      router.replace("/login");
      return;
    }
    continueFromUm(ticket)
      .then(() => router.replace("/dashboard"))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "เปิดระบบ Alert จาก UM ไม่สำเร็จ กรุณาเข้าสู่ระบบ"),
      );
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6 text-center">
      <div className="text-4xl">🚨</div>
      <h1 className="mt-2 text-xl font-bold">Emergency Dashboard</h1>
      {error ? (
        <>
          <div role="alert" className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          <Link href="/login" replace className="mt-4 rounded-xl bg-red-600 p-4 font-bold text-white">
            ไปหน้าเข้าสู่ระบบ
          </Link>
        </>
      ) : (
        <p role="status" className="mt-6 text-sm text-slate-500">กำลังเปิดระบบ Alert จาก UM…</p>
      )}
    </main>
  );
}
