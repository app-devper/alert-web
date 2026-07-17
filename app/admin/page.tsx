"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ApiError,
  alertApiUrl,
  staffClientId,
  staffGet,
  staffPost,
  staffPut,
} from "@/lib/api";

import MessagingConfigTab from "./MessagingConfigTab";

type Tab = "templates" | "settings" | "messaging" | "qr" | "permissions";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("templates");
  const [message, setMessage] = useState("");

  return (
    <main className="mx-auto max-w-3xl p-4 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">⚙️ ตั้งค่าระบบ (ADMIN)</h1>
        <Link href="/dashboard" className="text-sm text-slate-600 underline">
          ← กลับ Dashboard
        </Link>
      </header>
      <nav className="mb-4 flex gap-2 overflow-x-auto">
        {(
          [
            ["templates", "ข้อความสำเร็จรูป"],
            ["settings", "ตั้งค่าสาขา & PIN"],
            ["messaging", "SMS & LINE"],
            ["qr", "QR Code"],
            ["permissions", "สิทธิ์พนักงาน"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              setMessage("");
            }}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
              tab === key ? "bg-red-600 text-white" : "bg-white text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      {message && (
        <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{message}</div>
      )}
      {tab === "templates" && <TemplatesTab onMessage={setMessage} />}
      {tab === "settings" && <SettingsTab onMessage={setMessage} />}
      {tab === "messaging" && <MessagingConfigTab onMessage={setMessage} />}
      {tab === "qr" && <QrTab onMessage={setMessage} />}
      {tab === "permissions" && <PermissionsTab onMessage={setMessage} />}
    </main>
  );
}

interface Template {
  id: string;
  code: string;
  textTh: string;
  textEn: string;
  active: boolean;
  updatedBy: string;
}

function TemplatesTab({ onMessage }: { onMessage: (m: string) => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);

  const load = useCallback(() => {
    staffGet<Template[]>("/admin/templates")
      .then((response) => setTemplates(response.data ?? []))
      .catch((err) => onMessage(err instanceof ApiError ? err.message : "โหลดไม่สำเร็จ"));
  }, [onMessage]);

  useEffect(load, [load]);

  const save = useCallback(async () => {
    if (!editing) return;
    try {
      await staffPut(`/admin/templates/${editing.id}`, {
        code: editing.code,
        textTh: editing.textTh,
        textEn: editing.textEn,
        active: editing.active,
      });
      onMessage("บันทึกข้อความเรียบร้อย");
      setEditing(null);
      load();
    } catch (err) {
      onMessage(err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ");
    }
  }, [editing, load, onMessage]);

  return (
    <div className="space-y-3">
      {templates.map((template) => (
        <div key={template.id} className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-bold">
              {template.code}
              {!template.active && (
                <span className="ml-2 rounded bg-slate-200 px-2 py-0.5 text-xs">ปิดใช้งาน</span>
              )}
            </p>
            <button
              onClick={() => setEditing(template)}
              className="text-sm text-red-600 underline"
            >
              แก้ไข
            </button>
          </div>
          <p className="mt-1 text-sm">{template.textTh}</p>
          <p className="mt-1 text-sm text-slate-500">{template.textEn}</p>
        </div>
      ))}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6">
            <h2 className="font-bold">แก้ไขข้อความ: {editing.code}</h2>
            <p className="mt-1 text-xs text-slate-500">
              ห้ามใส่ลิงก์ในข้อความ — ระบบจะปฏิเสธการบันทึก
            </p>
            <textarea
              value={editing.textTh}
              onChange={(event) => setEditing({ ...editing, textTh: event.target.value })}
              rows={3}
              className="mt-3 w-full rounded-xl border border-slate-300 p-3 text-sm"
            />
            <textarea
              value={editing.textEn}
              onChange={(event) => setEditing({ ...editing, textEn: event.target.value })}
              rows={3}
              className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm"
            />
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(event) => setEditing({ ...editing, active: event.target.checked })}
              />
              เปิดใช้งาน
            </label>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 rounded-xl bg-slate-200 p-3 font-semibold"
              >
                ยกเลิก
              </button>
              <button
                onClick={save}
                className="flex-1 rounded-xl bg-red-600 p-3 font-bold text-white"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface BranchSetting {
  shopName: string;
  retentionHours: number;
  cooldownSeconds: number;
  confirmMethod: string;
  skipOtp: boolean;
  smsCreditThreshold: number;
  contactChannel: string;
}

function SettingsTab({ onMessage }: { onMessage: (m: string) => void }) {
  const [setting, setSetting] = useState<BranchSetting | null>(null);
  const [hasPin, setHasPin] = useState(false);
  const [pin, setPin] = useState("");

  useEffect(() => {
    staffGet<{ setting: BranchSetting; hasPin: boolean }>("/admin/settings")
      .then((response) => {
        setSetting(response.data.setting);
        setHasPin(response.data.hasPin);
      })
      .catch((err) => onMessage(err instanceof ApiError ? err.message : "โหลดไม่สำเร็จ"));
  }, [onMessage]);

  const save = useCallback(async () => {
    if (!setting) return;
    try {
      await staffPut("/admin/settings", setting);
      onMessage("บันทึกการตั้งค่าเรียบร้อย");
    } catch (err) {
      onMessage(err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ");
    }
  }, [setting, onMessage]);

  const savePin = useCallback(async () => {
    if (!setting) return;
    try {
      await staffPut("/admin/settings/pin", {
        pin,
        confirmMethod: setting.confirmMethod,
      });
      onMessage("ตั้งค่า Emergency PIN เรียบร้อย");
      setPin("");
      setHasPin(true);
    } catch (err) {
      onMessage(err instanceof ApiError ? err.message : "ตั้ง PIN ไม่สำเร็จ");
    }
  }, [pin, setting, onMessage]);

  if (!setting) return <p className="text-slate-500">กำลังโหลด…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <label className="block text-sm">
          <span className="font-medium">ชื่อร้าน/สาขา (แสดงบนหน้าเช็กอิน)</span>
          <input
            value={setting.shopName}
            onChange={(event) => setSetting({ ...setting, shopName: event.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 p-3"
          />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="font-medium">เก็บข้อมูล (ชั่วโมง, 6–24)</span>
            <input
              type="number"
              min={6}
              max={24}
              value={setting.retentionHours}
              onChange={(event) =>
                setSetting({ ...setting, retentionHours: Number(event.target.value) })
              }
              className="mt-1 w-full rounded-xl border border-slate-300 p-3"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Cooldown (วินาที, 60–180)</span>
            <input
              type="number"
              min={60}
              max={180}
              value={setting.cooldownSeconds}
              onChange={(event) =>
                setSetting({ ...setting, cooldownSeconds: Number(event.target.value) })
              }
              className="mt-1 w-full rounded-xl border border-slate-300 p-3"
            />
          </label>
        </div>
        <label className="mt-3 block text-sm">
          <span className="font-medium">วิธียืนยันขั้นที่สอง</span>
          <select
            value={setting.confirmMethod}
            onChange={(event) => setSetting({ ...setting, confirmMethod: event.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 p-3"
          >
            <option value="HOLD_3S">กดค้าง 3 วินาที</option>
            <option value="PIN">Emergency PIN</option>
          </select>
        </label>
        <label className="mt-3 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={setting.skipOtp}
            onChange={(event) => setSetting({ ...setting, skipOtp: event.target.checked })}
            className="mt-1 h-5 w-5"
          />
          <span>
            <span className="font-medium">ข้ามขั้นตอน OTP</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              ลูกค้ากรอกข้อมูล+ยอมรับเงื่อนไขแล้วลงทะเบียนได้ทันที ไม่ต้องยืนยัน OTP (ไม่ส่ง SMS OTP)
            </span>
          </span>
        </label>
        <label className="mt-3 block text-sm">
          <span className="font-medium">ช่องทางติดต่อผู้ควบคุมข้อมูล (PDPA)</span>
          <input
            value={setting.contactChannel}
            onChange={(event) => setSetting({ ...setting, contactChannel: event.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 p-3"
          />
        </label>
        <label className="mt-3 block text-sm">
          <span className="font-medium">เกณฑ์แจ้งเตือนเครดิต SMS ต่ำ</span>
          <input
            type="number"
            value={setting.smsCreditThreshold}
            onChange={(event) =>
              setSetting({ ...setting, smsCreditThreshold: Number(event.target.value) })
            }
            className="mt-1 w-full rounded-xl border border-slate-300 p-3"
          />
        </label>
        <button
          onClick={save}
          className="mt-4 w-full rounded-xl bg-red-600 p-3 font-bold text-white"
        >
          บันทึกการตั้งค่า
        </button>
      </div>
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="font-semibold">
          Emergency PIN {hasPin ? "(ตั้งค่าแล้ว — กรอกใหม่เพื่อเปลี่ยน)" : "(ยังไม่ได้ตั้ง)"}
        </p>
        <div className="mt-2 flex gap-3">
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
            placeholder="PIN 6 หลัก"
            className="flex-1 rounded-xl border border-slate-300 p-3 text-center font-mono"
          />
          <button
            onClick={savePin}
            disabled={pin.length !== 6}
            className="rounded-xl bg-slate-800 px-6 font-bold text-white disabled:opacity-40"
          >
            ตั้ง PIN
          </button>
        </div>
      </div>
    </div>
  );
}

interface QrToken {
  id: string;
  branchId: string;
  tableNo: string;
  token: string;
  active: boolean;
  createdAt: string;
}

function QrTab({ onMessage }: { onMessage: (m: string) => void }) {
  const [tokens, setTokens] = useState<QrToken[]>([]);
  const [branchId, setBranchId] = useState("HQ");
  const [tableNo, setTableNo] = useState("");

  const load = useCallback(() => {
    staffGet<QrToken[]>("/admin/qr")
      .then((response) => setTokens(response.data ?? []))
      .catch((err) => onMessage(err instanceof ApiError ? err.message : "โหลดไม่สำเร็จ"));
  }, [onMessage]);

  useEffect(load, [load]);

  const create = useCallback(async () => {
    try {
      await staffPost("/admin/qr", { branchId, tableNo });
      onMessage("สร้าง QR เรียบร้อย");
      setTableNo("");
      load();
    } catch (err) {
      onMessage(err instanceof ApiError ? err.message : "สร้างไม่สำเร็จ");
    }
  }, [branchId, tableNo, load, onMessage]);

  const revoke = useCallback(
    async (id: string) => {
      if (!window.confirm("ยกเลิก QR นี้? หน้าเช็กอินจาก QR นี้จะใช้ไม่ได้อีก")) return;
      try {
        await staffPost(`/admin/qr/${id}/revoke`);
        load();
      } catch (err) {
        onMessage(err instanceof ApiError ? err.message : "ยกเลิกไม่สำเร็จ");
      }
    },
    [load, onMessage]
  );

  const directLink =
    typeof window !== "undefined" && staffClientId()
      ? `${window.location.origin}/checkin?clientId=${staffClientId()}&branchId=${encodeURIComponent(branchId)}${tableNo ? `&tableNo=${encodeURIComponent(tableNo)}` : ""}`
      : "";

  const copyDirectLink = useCallback(() => {
    if (!directLink) return;
    navigator.clipboard?.writeText(directLink);
    onMessage("คัดลอกลิงก์ลงทะเบียนแล้ว");
  }, [directLink, onMessage]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="font-semibold">สร้าง QR ใหม่</p>
        <div className="mt-2 flex gap-3">
          <input
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
            placeholder="สาขา"
            className="w-28 rounded-xl border border-slate-300 p-3"
          />
          <input
            value={tableNo}
            onChange={(event) => setTableNo(event.target.value)}
            placeholder="โต๊ะ/โซน (ไม่บังคับ)"
            className="flex-1 rounded-xl border border-slate-300 p-3"
          />
          <button
            onClick={create}
            className="rounded-xl bg-red-600 px-6 font-bold text-white"
          >
            สร้าง
          </button>
        </div>
        {directLink && (
          <div className="mt-3 rounded-lg bg-slate-100 p-3 text-xs">
            <p className="font-semibold text-slate-700">
              ลิงก์ลงทะเบียนโดยตรง (ไม่ต้องสร้าง QR)
            </p>
            <p className="mt-1 break-all font-mono text-slate-500">{directLink}</p>
            <button
              onClick={copyDirectLink}
              className="mt-2 rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-white"
            >
              คัดลอกลิงก์
            </button>
          </div>
        )}
      </div>
      <div className="space-y-2">
        {tokens.map((token) => (
          <div
            key={token.id}
            className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-semibold">
                สาขา {token.branchId}
                {token.tableNo ? ` • โต๊ะ ${token.tableNo}` : ""}
                {!token.active && (
                  <span className="ml-2 rounded bg-slate-200 px-2 py-0.5 text-xs">ยกเลิกแล้ว</span>
                )}
              </p>
              <p className="text-xs text-slate-400">
                สร้างเมื่อ {new Date(token.createdAt).toLocaleString("th-TH")}
              </p>
            </div>
            {token.active && (
              <div className="flex gap-3 text-sm">
                <a
                  href={alertApiUrl(`/admin/qr/${token.id}/image`)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-600 underline"
                >
                  ดาวน์โหลดภาพ
                </a>
                <button onClick={() => revoke(token.id)} className="text-red-600 underline">
                  ยกเลิก
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface Permission {
  id: string;
  userId: string;
  branchId: string;
  phone: string;
  allowedEventTypes: string[];
  isTestRecipient: boolean;
  active: boolean;
}

const ALL_EVENT_TYPES = [
  "FIRE",
  "EVACUATE",
  "AVOID_AREA",
  "SUSPICIOUS_OBJECT",
  "BRAWL",
  "EXTERNAL",
  "ALL_CLEAR",
];

function PermissionsTab({ onMessage }: { onMessage: (m: string) => void }) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [form, setForm] = useState({
    userId: "",
    branchId: "HQ",
    phone: "",
    allowedEventTypes: [] as string[],
    isTestRecipient: false,
    active: true,
  });

  const load = useCallback(() => {
    staffGet<Permission[]>("/admin/permissions")
      .then((response) => setPermissions(response.data ?? []))
      .catch((err) => onMessage(err instanceof ApiError ? err.message : "โหลดไม่สำเร็จ"));
  }, [onMessage]);

  useEffect(load, [load]);

  const toggleEventType = useCallback((eventType: string) => {
    setForm((current) => ({
      ...current,
      allowedEventTypes: current.allowedEventTypes.includes(eventType)
        ? current.allowedEventTypes.filter((item) => item !== eventType)
        : [...current.allowedEventTypes, eventType],
    }));
  }, []);

  const save = useCallback(async () => {
    try {
      await staffPut("/admin/permissions", form);
      onMessage("บันทึกสิทธิ์เรียบร้อย");
      load();
    } catch (err) {
      onMessage(err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ");
    }
  }, [form, load, onMessage]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm text-sm">
        <p className="font-semibold">กำหนด/แก้ไขสิทธิ์พนักงาน</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <input
            value={form.userId}
            onChange={(event) => setForm({ ...form, userId: event.target.value })}
            placeholder="userId ของพนักงาน (จาก um)"
            className="rounded-xl border border-slate-300 p-3"
          />
          <input
            value={form.branchId}
            onChange={(event) => setForm({ ...form, branchId: event.target.value })}
            placeholder="สาขา"
            className="rounded-xl border border-slate-300 p-3"
          />
        </div>
        <input
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
          placeholder="เบอร์โทร (สำหรับรับข้อความทดสอบ)"
          className="mt-2 w-full rounded-xl border border-slate-300 p-3"
        />
        <p className="mt-3 font-medium">STAFF กดแจ้งเหตุประเภทใดได้บ้าง:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ALL_EVENT_TYPES.map((eventType) => (
            <button
              key={eventType}
              onClick={() => toggleEventType(eventType)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                form.allowedEventTypes.includes(eventType)
                  ? "bg-red-600 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {eventType}
            </button>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.isTestRecipient}
            onChange={(event) => setForm({ ...form, isTestRecipient: event.target.checked })}
          />
          รับข้อความโหมดทดสอบ
        </label>
        <label className="mt-1 flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => setForm({ ...form, active: event.target.checked })}
          />
          เปิดใช้งาน
        </label>
        <button
          onClick={save}
          disabled={!form.userId}
          className="mt-3 w-full rounded-xl bg-red-600 p-3 font-bold text-white disabled:opacity-40"
        >
          บันทึกสิทธิ์
        </button>
      </div>
      <div className="space-y-2">
        {permissions.map((permission) => (
          <button
            key={permission.id}
            onClick={() =>
              setForm({
                userId: permission.userId,
                branchId: permission.branchId,
                phone: permission.phone,
                allowedEventTypes: permission.allowedEventTypes ?? [],
                isTestRecipient: permission.isTestRecipient,
                active: permission.active,
              })
            }
            className="w-full rounded-xl bg-white p-4 text-left text-sm shadow-sm"
          >
            <p className="font-semibold">
              {permission.userId}
              <span className="ml-2 text-xs text-slate-400">สาขา {permission.branchId}</span>
              {!permission.active && (
                <span className="ml-2 rounded bg-slate-200 px-2 py-0.5 text-xs">ปิด</span>
              )}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              สิทธิ์: {(permission.allowedEventTypes ?? []).join(", ") || "ตาม role"}
              {permission.isTestRecipient ? " • รับข้อความทดสอบ" : ""}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
