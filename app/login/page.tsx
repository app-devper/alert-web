"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ApiError, resolveAlertHostFromUmSystem, setStaffToken, umLogin } from "@/lib/api";
import { passkeysSupported, umPasskeyLogin } from "@/lib/passkey";

const noSubscription = () => () => {};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Prerendered without a browser: show the passkey button only once hydrated.
  const passkeyAvailable = useSyncExternalStore(noSubscription, passkeysSupported, () => false);

  const signIn = useCallback(
    async (getToken: () => Promise<string>, fallback: string) => {
      setSubmitting(true);
      setError("");
      try {
        const token = await getToken();
        setStaffToken(token);
        await resolveAlertHostFromUmSystem(token);
        router.push("/dashboard");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : fallback);
      } finally {
        setSubmitting(false);
      }
    },
    [router]
  );

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      await signIn(() => umLogin(username, password), "เข้าสู่ระบบไม่สำเร็จ");
    },
    [username, password, signIn]
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
        {passkeyAvailable && (
          <>
            <p className="text-center text-xs text-slate-400">หรือ</p>
            <button
              type="button"
              onClick={() => signIn(umPasskeyLogin, "เข้าสู่ระบบด้วย passkey ไม่สำเร็จ")}
              disabled={submitting}
              className="rounded-xl border border-slate-300 p-4 font-bold text-slate-800 disabled:opacity-40"
            >
              เข้าสู่ระบบด้วย passkey
            </button>
            <p className="text-center text-xs text-slate-500">เพิ่ม passkey ได้ที่ um.devper.app หน้าโปรไฟล์</p>
          </>
        )}
      </form>
    </main>
  );
}
