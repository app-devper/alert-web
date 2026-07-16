"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, staffGet, staffPost } from "@/lib/api";

interface CheckInItem {
  id: string;
  checkInNo: string;
  phoneMasked: string;
  tableNo: string;
  groupSize: number;
  checkedInAt: string;
  hasPush: boolean;
}

export default function CheckinsPage() {
  const [items, setItems] = useState<CheckInItem[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    staffGet<CheckInItem[]>(`/dashboard/check-ins${query}`)
      .then((response) => setItems(response.data))
      .catch((err) =>
        setMessage(err instanceof ApiError ? err.message : "โหลดรายชื่อไม่สำเร็จ")
      );
  }, [search]);

  useEffect(load, [load]);

  const checkout = useCallback(
    async (id: string) => {
      if (!window.confirm("เช็กเอาต์ลูกค้ารายนี้?")) return;
      try {
        await staffPost(`/dashboard/check-ins/${id}/checkout`);
        load();
      } catch (err) {
        setMessage(err instanceof ApiError ? err.message : "เช็กเอาต์ไม่สำเร็จ");
      }
    },
    [load]
  );

  return (
    <main className="mx-auto max-w-3xl p-4 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">รายชื่อลูกค้าที่เช็กอิน</h1>
        <Link href="/dashboard" className="text-sm text-slate-600 underline">
          ← กลับ Dashboard
        </Link>
      </header>
      <div className="mb-4 flex gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ค้นหาด้วยเลขโต๊ะ หรือเลขท้ายเบอร์ 4 หลัก"
          className="flex-1 rounded-xl border border-slate-300 p-3"
        />
      </div>
      {message && <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{message}</div>}
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-3">เบอร์ (mask)</th>
              <th className="p-3">โต๊ะ</th>
              <th className="p-3">คน</th>
              <th className="p-3">เช็กอินเมื่อ</th>
              <th className="p-3">ช่องทาง</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="p-3 font-mono">{item.phoneMasked}</td>
                <td className="p-3">{item.tableNo || "-"}</td>
                <td className="p-3">{item.groupSize}</td>
                <td className="p-3">
                  {new Date(item.checkedInAt).toLocaleTimeString("th-TH")}
                </td>
                <td className="p-3">
                  📱 💬{item.hasPush ? " 🔔" : ""}
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => checkout(item.id)}
                    className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white"
                  >
                    เช็กเอาต์
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  ไม่มีลูกค้าที่เช็กอินอยู่
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
