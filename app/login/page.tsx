"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, resolveAlertHostFromUmSystem, setStaffToken, umLogin } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setSubmitting(true);
      setError("");
      try {
        const token = await umLogin(username, password);
        setStaffToken(token);
        await resolveAlertHostFromUmSystem(token);
        router.push("/dashboard");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
      } finally {
        setSubmitting(false);
      }
    },
    [username, password, router]
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <div className="text-center">
        <div className="text-4xl">🚨</div>
        <h1 className="mt-2 text-xl font-bold">เข้าสู่ระบบพนักงาน</h1>
        <p className="text-sm text-slate-500">Emergency Dashboard</p>
      </div>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="ชื่อผู้ใช้"
          autoComplete="username"
          className="rounded-xl border border-slate-300 p-3"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="รหัสผ่าน"
          autoComplete="current-password"
          className="rounded-xl border border-slate-300 p-3"
        />
        <button
          type="submit"
          disabled={submitting || !username || !password}
          className="rounded-xl bg-red-600 p-4 font-bold text-white disabled:opacity-40"
        >
          {submitting ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
        </button>
      </form>
    </main>
  );
}
