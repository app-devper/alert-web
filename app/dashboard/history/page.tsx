"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, staffGet } from "@/lib/api";

interface ChannelStat {
  sent: number;
  delivered: number;
  failed: number;
}

interface EventItem {
  id: string;
  eventNo: string;
  eventType: string;
  triggeredBy: string;
  confirmedWith: string;
  recipientCount: number;
  channelSummary: { sms: ChannelStat; push: ChannelStat; line: ChannelStat };
  sentAt: string;
  status: string;
}

const EVENT_LABELS: Record<string, string> = {
  FIRE: "🔥 ไฟไหม้",
  EVACUATE: "🟠 ให้ออกจากร้าน",
  AVOID_AREA: "🟡 หลีกเลี่ยงพื้นที่",
  SUSPICIOUS_OBJECT: "⚠️ วัตถุต้องสงสัย",
  BRAWL: "🚨 ทะเลาะวิวาท",
  EXTERNAL: "🌧️ เหตุภายนอก",
  ALL_CLEAR: "✅ กลับสู่ปกติ",
  TEST: "🧪 ทดสอบ",
};

export default function HistoryPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    staffGet<EventItem[]>(`/dashboard/events?page=${page}&limit=20`)
      .then((response) => {
        setEvents(response.data ?? []);
        setTotal(response.meta?.total ?? 0);
      })
      .catch((err) =>
        setMessage(err instanceof ApiError ? err.message : "โหลดประวัติไม่สำเร็จ (ต้องเป็น MANAGER ขึ้นไป)")
      );
  }, [page]);

  useEffect(load, [load]);

  return (
    <main className="mx-auto max-w-3xl p-4 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">ประวัติเหตุการณ์</h1>
        <Link href="/dashboard" className="text-sm text-slate-600 underline">
          ← กลับ Dashboard
        </Link>
      </header>
      {message && <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{message}</div>}
      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-bold">
                {EVENT_LABELS[event.eventType] ?? event.eventType}
                <span className="ml-2 font-mono text-xs text-slate-400">{event.eventNo}</span>
              </p>
              <p className="text-sm text-slate-500">
                {new Date(event.sentAt).toLocaleString("th-TH")}
              </p>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              ผู้กด: {event.triggeredBy} • ยืนยันด้วย:{" "}
              {event.confirmedWith === "PIN" ? "Emergency PIN" : "กดค้าง 3 วินาที"} • ผู้รับ{" "}
              {event.recipientCount} ราย
            </p>
            <p className="mt-1 text-sm">
              SMS {event.channelSummary.sms.sent}/{event.channelSummary.sms.failed} • Push{" "}
              {event.channelSummary.push.sent}/{event.channelSummary.push.failed} • LINE{" "}
              {event.channelSummary.line.sent}/{event.channelSummary.line.failed}
              <span className="ml-2 text-xs text-slate-400">(ส่งแล้ว/ล้มเหลว)</span>
            </p>
          </div>
        ))}
        {events.length === 0 && (
          <p className="rounded-xl bg-white p-6 text-center text-slate-400 shadow-sm">
            ไม่มีประวัติเหตุการณ์
          </p>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <button
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={page <= 1}
          className="rounded-lg bg-slate-200 px-4 py-2 disabled:opacity-40"
        >
          ← ก่อนหน้า
        </button>
        <span className="text-slate-500">
          หน้า {page} • ทั้งหมด {total} เหตุการณ์
        </span>
        <button
          onClick={() => setPage((current) => current + 1)}
          disabled={page * 20 >= total}
          className="rounded-lg bg-slate-200 px-4 py-2 disabled:opacity-40"
        >
          ถัดไป →
        </button>
      </div>
    </main>
  );
}
