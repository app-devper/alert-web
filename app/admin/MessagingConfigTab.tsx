"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, staffGet, staffPut } from "@/lib/api";

interface MaskedConfig {
  smsApiUrl: string;
  smsBalanceUrl: string;
  smsSenderId: string;
  smsApiKeyMasked: string;
  hasSmsApiSecret: boolean;
  hasSmsWebhookSecret: boolean;
  lineTokenMasked: string;
  hasLineChannelSecret: boolean;
}

interface ConfigForm {
  smsApiUrl: string;
  smsBalanceUrl: string;
  smsSenderId: string;
  smsApiKey: string;
  smsApiSecret: string;
  smsWebhookSecret: string;
  lineChannelToken: string;
  lineChannelSecret: string;
}

const EMPTY_FORM: ConfigForm = {
  smsApiUrl: "",
  smsBalanceUrl: "",
  smsSenderId: "",
  smsApiKey: "",
  smsApiSecret: "",
  smsWebhookSecret: "",
  lineChannelToken: "",
  lineChannelSecret: "",
};

export default function MessagingConfigTab({
  onMessage,
}: {
  onMessage: (m: string) => void;
}) {
  const [masked, setMasked] = useState<MaskedConfig | null>(null);
  const [form, setForm] = useState<ConfigForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    staffGet<MaskedConfig>("/admin/messaging-config")
      .then((response) => {
        setMasked(response.data);
        setForm((current) => ({
          ...current,
          smsApiUrl: response.data.smsApiUrl,
          smsBalanceUrl: response.data.smsBalanceUrl,
          smsSenderId: response.data.smsSenderId,
        }));
      })
      .catch((err) => onMessage(err instanceof ApiError ? err.message : "โหลดไม่สำเร็จ"));
  }, [onMessage]);

  useEffect(load, [load]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await staffPut("/admin/messaging-config", form);
      onMessage("บันทึกการตั้งค่า SMS & LINE เรียบร้อย");
      setForm((current) => ({
        ...current,
        smsApiKey: "",
        smsApiSecret: "",
        smsWebhookSecret: "",
        lineChannelToken: "",
        lineChannelSecret: "",
      }));
      load();
    } catch (err) {
      onMessage(err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }, [form, load, onMessage]);

  const setField = useCallback(
    (field: keyof ConfigForm) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value })),
    []
  );

  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="font-semibold">SMS Gateway ของร้าน (แยกต่อ client)</p>
        <p className="mt-1 text-xs text-slate-500">
          ค่าที่เว้นว่างจะใช้ค่ากลางของระบบ; ช่อง secret เว้นว่าง = คงค่าเดิม
        </p>
        <label className="mt-3 block">
          <span className="font-medium">API URL</span>
          <input
            value={form.smsApiUrl}
            onChange={setField("smsApiUrl")}
            placeholder="https://api.thaibulksms.com/..."
            className="mt-1 w-full rounded-xl border border-slate-300 p-3"
          />
        </label>
        <label className="mt-2 block">
          <span className="font-medium">Balance URL</span>
          <input
            value={form.smsBalanceUrl}
            onChange={setField("smsBalanceUrl")}
            className="mt-1 w-full rounded-xl border border-slate-300 p-3"
          />
        </label>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="font-medium">Sender ID (จดทะเบียนแล้ว)</span>
            <input
              value={form.smsSenderId}
              onChange={setField("smsSenderId")}
              placeholder="SHOPNAME"
              className="mt-1 w-full rounded-xl border border-slate-300 p-3"
            />
          </label>
          <label className="block">
            <span className="font-medium">API Key</span>
            <input
              value={form.smsApiKey}
              onChange={setField("smsApiKey")}
              placeholder={masked?.smsApiKeyMasked || "ยังไม่ได้ตั้ง"}
              className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-mono"
            />
          </label>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="font-medium">API Secret</span>
            <input
              type="password"
              value={form.smsApiSecret}
              onChange={setField("smsApiSecret")}
              placeholder={masked?.hasSmsApiSecret ? "ตั้งค่าแล้ว — กรอกเพื่อเปลี่ยน" : "ยังไม่ได้ตั้ง"}
              className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-mono"
            />
          </label>
          <label className="block">
            <span className="font-medium">Webhook Secret</span>
            <input
              type="password"
              value={form.smsWebhookSecret}
              onChange={setField("smsWebhookSecret")}
              placeholder={masked?.hasSmsWebhookSecret ? "ตั้งค่าแล้ว — กรอกเพื่อเปลี่ยน" : "ยังไม่ได้ตั้ง"}
              className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-mono"
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="font-semibold">LINE OA ของร้าน (เปิดใช้ LINE Official Notification แล้ว)</p>
        <p className="mt-1 text-xs text-slate-500">
          Channel token/secret จาก LINE Developers console ของ OA ร้านนี้ —
          ตั้ง webhook ของ OA เป็น .../webhook/line?clientId=&lt;client ของร้าน&gt;
        </p>
        <label className="mt-3 block">
          <span className="font-medium">Channel Access Token</span>
          <input
            type="password"
            value={form.lineChannelToken}
            onChange={setField("lineChannelToken")}
            placeholder={masked?.lineTokenMasked || "ยังไม่ได้ตั้ง"}
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-mono"
          />
        </label>
        <label className="mt-2 block">
          <span className="font-medium">Channel Secret</span>
          <input
            type="password"
            value={form.lineChannelSecret}
            onChange={setField("lineChannelSecret")}
            placeholder={masked?.hasLineChannelSecret ? "ตั้งค่าแล้ว — กรอกเพื่อเปลี่ยน" : "ยังไม่ได้ตั้ง"}
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-mono"
          />
        </label>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full rounded-xl bg-red-600 p-3 font-bold text-white disabled:opacity-40"
      >
        {saving ? "กำลังบันทึก…" : "บันทึกการตั้งค่า SMS & LINE"}
      </button>
    </div>
  );
}
