"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, clearStaffToken, staffGet, staffPost, staffToken } from "@/lib/api";

const EVENT_BUTTONS = [
  { type: "FIRE", emoji: "🔥", label: "ไฟไหม้", color: "bg-red-600" },
  { type: "EVACUATE", emoji: "🟠", label: "แจ้งให้ออกจากร้าน", color: "bg-orange-500" },
  { type: "AVOID_AREA", emoji: "🟡", label: "หลีกเลี่ยงพื้นที่", color: "bg-amber-500" },
  { type: "SUSPICIOUS_OBJECT", emoji: "⚠️", label: "พบวัตถุต้องสงสัย", color: "bg-yellow-600" },
  { type: "BRAWL", emoji: "🚨", label: "เหตุทะเลาะวิวาท", color: "bg-rose-600" },
  { type: "EXTERNAL", emoji: "🌧️", label: "เหตุภายนอกร้าน", color: "bg-sky-600" },
  { type: "ALL_CLEAR", emoji: "✅", label: "กลับสู่ภาวะปกติ", color: "bg-green-600" },
  { type: "TEST", emoji: "🧪", label: "ทดสอบระบบ", color: "bg-slate-500" },
];

interface Summary {
  activeCheckIns: number;
  totalPeople: number;
  pushEnabled: number;
  lineEnabled: number;
  branchId: string;
}

interface Preview {
  eventType: string;
  template: { textTh: string; textEn: string };
  recipientCount: number;
  confirmMethod: string;
  cooldownRemaining: number;
}

interface ChannelStat {
  sent: number;
  delivered: number;
  failed: number;
}

interface TriggerResult {
  event: { eventNo: string; recipientCount: number };
  allFailed?: boolean;
  channelSummary: { sms: ChannelStat; push: ChannelStat; line: ChannelStat };
}

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<TriggerResult | null>(null);
  const [error, setError] = useState("");

  const loadSummary = useCallback(() => {
    staffGet<Summary>("/dashboard/summary")
      .then((response) => setSummary(response.data))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearStaffToken();
          router.push("/login");
        }
      });
  }, [router]);

  useEffect(() => {
    if (!staffToken()) {
      router.push("/login");
      return;
    }
    loadSummary();
    const timer = setInterval(loadSummary, 10000);
    return () => clearInterval(timer);
  }, [loadSummary, router]);

  const openPreview = useCallback(async (eventType: string) => {
    setError("");
    setResult(null);
    try {
      const response = await staffGet<Preview>(`/emergency/preview?eventType=${eventType}`);
      setPreview(response.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ไม่สามารถโหลดข้อมูลได้");
    }
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-4 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">🚨 Emergency Dashboard</h1>
          <p className="text-sm text-slate-500">สาขา {summary?.branchId ?? "…"}</p>
        </div>
        <nav className="flex gap-3 text-sm">
          <Link href="/dashboard/checkins" className="text-slate-600 underline">
            รายชื่อลูกค้า
          </Link>
          <Link href="/dashboard/history" className="text-slate-600 underline">
            ประวัติ
          </Link>
          <Link href="/admin" className="text-slate-600 underline">
            ตั้งค่า
          </Link>
        </nav>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="ลูกค้าที่อยู่ในร้าน" value={summary?.activeCheckIns} highlight />
        <StatCard label="จำนวนคนรวม" value={summary?.totalPeople} />
        <StatCard label="เปิด Web Push" value={summary?.pushEnabled} />
        <StatCard label="รับทาง LINE (LON)" value={summary?.lineEnabled} />
      </section>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</div>}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {EVENT_BUTTONS.map((button) => (
          <button
            key={button.type}
            onClick={() => openPreview(button.type)}
            className={`${button.color} flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl p-4 text-white shadow-md active:scale-95`}
          >
            <span className="text-3xl">{button.emoji}</span>
            <span className="text-center text-sm font-bold">{button.label}</span>
          </button>
        ))}
      </section>

      {preview && (
        <ConfirmModal
          preview={preview}
          onClose={() => setPreview(null)}
          onSent={(triggerResult) => {
            setPreview(null);
            setResult(triggerResult);
            loadSummary();
          }}
          onError={setError}
        />
      )}

      {result && <ResultPanel result={result} />}

      <p className="mt-8 text-center text-xs text-slate-400">
        ระบบนี้เป็นช่องทางแจ้งเตือนเสริม — ใช้ไซเรนและระบบประกาศเสียงเป็นช่องทางหลักเสมอ
      </p>
    </main>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 shadow-sm ${highlight ? "bg-red-600 text-white" : "bg-white"}`}
    >
      <p className={`text-xs ${highlight ? "text-red-100" : "text-slate-500"}`}>{label}</p>
      <p className="text-2xl font-bold">{value ?? "…"}</p>
    </div>
  );
}

function ConfirmModal({
  preview,
  onClose,
  onSent,
  onError,
}: {
  preview: Preview;
  onClose: () => void;
  onSent: (result: TriggerResult) => void;
  onError: (message: string) => void;
}) {
  const [pin, setPin] = useState("");
  const [override, setOverride] = useState(false);
  const [sending, setSending] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const usePin = preview.confirmMethod === "PIN";
  const inCooldown = preview.cooldownRemaining > 0 && !override;

  const send = useCallback(async () => {
    setSending(true);
    try {
      const response = await staffPost<TriggerResult>("/emergency/trigger", {
        eventType: preview.eventType,
        confirmMethod: preview.confirmMethod,
        pin: usePin ? pin : undefined,
        overrideCooldown: override,
      });
      onSent(response.data);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "ส่งไม่สำเร็จ");
      onClose();
    } finally {
      setSending(false);
    }
  }, [preview, pin, usePin, override, onSent, onError, onClose]);

  const startHold = useCallback(() => {
    if (sending || inCooldown) return;
    const startedAt = Date.now();
    holdTimer.current = setInterval(() => {
      const progress = Math.min((Date.now() - startedAt) / 3000, 1);
      setHoldProgress(progress);
      if (progress >= 1 && holdTimer.current) {
        clearInterval(holdTimer.current);
        holdTimer.current = null;
        send();
      }
    }, 50);
  }, [sending, inCooldown, send]);

  const cancelHold = useCallback(() => {
    if (holdTimer.current) {
      clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
    setHoldProgress(0);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <h2 className="text-lg font-bold">
          ยืนยันส่งข้อความถึงลูกค้า {preview.recipientCount} หมายเลข?
        </h2>
        <div className="mt-3 rounded-lg bg-slate-100 p-3 text-sm">
          <p>{preview.template.textTh}</p>
          <p className="mt-2 text-slate-500">{preview.template.textEn}</p>
        </div>
        {preview.cooldownRemaining > 0 && (
          <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            เหตุการณ์เดิมเพิ่งถูกส่งไป — ส่งซ้ำได้ในอีก {Math.ceil(preview.cooldownRemaining)} วินาที
            <label className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={override}
                onChange={(event) => setOverride(event.target.checked)}
              />
              <span>ยืนยันส่งซ้ำ (MANAGER ขึ้นไป — บันทึกลง audit log)</span>
            </label>
          </div>
        )}
        {usePin && (
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
            placeholder="Emergency PIN (6 หลัก)"
            className="mt-3 w-full rounded-xl border border-slate-300 p-3 text-center font-mono text-xl"
          />
        )}
        <div className="mt-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-200 p-4 font-semibold"
          >
            ยกเลิก
          </button>
          {usePin ? (
            <button
              onClick={send}
              disabled={sending || pin.length !== 6 || inCooldown}
              className="flex-1 rounded-xl bg-red-600 p-4 font-bold text-white disabled:opacity-40"
            >
              {sending ? "กำลังส่ง…" : "ยืนยันส่ง"}
            </button>
          ) : (
            <button
              onPointerDown={startHold}
              onPointerUp={cancelHold}
              onPointerLeave={cancelHold}
              disabled={sending || inCooldown}
              className="relative flex-1 overflow-hidden rounded-xl bg-red-600 p-4 font-bold text-white disabled:opacity-40"
            >
              <span
                className="absolute inset-y-0 left-0 bg-red-900/60"
                style={{ width: `${holdProgress * 100}%` }}
              />
              <span className="relative">
                {sending ? "กำลังส่ง…" : "กดค้าง 3 วินาทีเพื่อส่ง"}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultPanel({ result }: { result: TriggerResult }) {
  return (
    <section className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-bold">
        ผลการส่ง — เหตุการณ์ {result.event.eventNo} (ผู้รับ {result.event.recipientCount} ราย)
      </h2>
      {result.allFailed && (
        <div className="mt-3 rounded-lg bg-red-600 p-4 font-bold text-white">
          ⚠️ ส่งไม่สำเร็จทั้งหมด — ใช้ระบบประกาศเสียงทันที!
        </div>
      )}
      <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
        <ChannelResult label="SMS" stat={result.channelSummary.sms} />
        <ChannelResult label="Web Push" stat={result.channelSummary.push} />
        <ChannelResult label="LINE" stat={result.channelSummary.line} />
      </div>
    </section>
  );
}

function ChannelResult({ label, stat }: { label: string; stat: ChannelStat }) {
  return (
    <div className="rounded-lg bg-slate-100 p-3">
      <p className="font-semibold">{label}</p>
      <p className="text-green-700">ส่งแล้ว {stat.sent}</p>
      <p className="text-red-600">ล้มเหลว {stat.failed}</p>
    </div>
  );
}
