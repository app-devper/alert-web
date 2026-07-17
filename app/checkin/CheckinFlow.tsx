"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, publicGet, publicPost, setCustomerToken } from "@/lib/api";
import { subscribeWebPush } from "@/lib/push";

const PRIVACY_NOTICE_VERSION = "1.0";

interface QrInfo {
  clientId: string;
  branchId: string;
  tableNo: string;
  shopName: string;
  retentionHours: number;
  contactChannel: string;
  skipOtp: boolean;
}

interface OtpInfo {
  checkInId: string;
  refCode: string;
  otpExpiresAt: string;
}

interface CreateResult {
  checkInId?: string;
  refCode?: string;
  otpExpiresAt?: string;
  skipOtp?: boolean;
  sessionToken?: string;
}

type Step = "loading" | "invalid" | "form" | "otp" | "done";

export default function CheckinFlow() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const clientId = searchParams.get("clientId") ?? "";
  const branchId = searchParams.get("branchId") ?? "";
  const tableNo = searchParams.get("tableNo") ?? "";
  const hasTarget = token !== "" || (clientId !== "" && branchId !== "");
  const [step, setStep] = useState<Step>(hasTarget ? "loading" : "invalid");
  const [qrInfo, setQrInfo] = useState<QrInfo | null>(null);
  const [otpInfo, setOtpInfo] = useState<OtpInfo | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasTarget) {
      return;
    }
    const resolve = token
      ? publicGet<QrInfo>(`/public/qr/${token}`)
      : publicGet<QrInfo>(
          `/public/branch?clientId=${encodeURIComponent(clientId)}&branchId=${encodeURIComponent(branchId)}${tableNo ? `&tableNo=${encodeURIComponent(tableNo)}` : ""}`
        );
    resolve
      .then((response) => {
        setQrInfo(response.data);
        setStep("form");
      })
      .catch(() => setStep("invalid"));
  }, [hasTarget, token, clientId, branchId, tableNo]);

  if (step === "loading") {
    return <main className="p-6 text-center text-slate-500">กำลังโหลด…</main>;
  }
  if (step === "invalid" || !qrInfo) {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <div className="text-4xl">⚠️</div>
        <h1 className="mt-4 text-xl font-bold">ลิงก์ลงทะเบียนไม่ถูกต้องหรือถูกยกเลิกแล้ว</h1>
        <p className="mt-2 text-slate-600">กรุณาสแกน QR Code ใหม่จากภายในร้าน หรือติดต่อพนักงาน</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <header className="mb-6 text-center">
        <div className="text-3xl">🚨</div>
        <h1 className="text-xl font-bold">{qrInfo.shopName || "ลงทะเบียนรับการแจ้งเตือน"}</h1>
        <p className="text-sm text-slate-500">
          สาขา {qrInfo.branchId}
          {qrInfo.tableNo ? ` • โต๊ะ ${qrInfo.tableNo}` : ""}
        </p>
      </header>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {step === "form" && (
        <CheckinForm
          token={token}
          qrInfo={qrInfo}
          onError={setError}
          onSubmitted={(result) => {
            setError("");
            if (result.skipOtp && result.sessionToken) {
              setCustomerToken(result.sessionToken);
              setStep("done");
              return;
            }
            setOtpInfo({
              checkInId: result.checkInId ?? "",
              refCode: result.refCode ?? "",
              otpExpiresAt: result.otpExpiresAt ?? "",
            });
            setStep("otp");
          }}
        />
      )}
      {step === "otp" && otpInfo && (
        <OtpForm
          otpInfo={otpInfo}
          onError={setError}
          onVerified={() => {
            setError("");
            setStep("done");
          }}
        />
      )}
      {step === "done" && <SuccessPanel />}
    </main>
  );
}

function CheckinForm({
  token,
  qrInfo,
  onSubmitted,
  onError,
}: {
  token: string;
  qrInfo: QrInfo;
  onSubmitted: (result: CreateResult) => void;
  onError: (message: string) => void;
}) {
  const [phone, setPhone] = useState("");
  const [groupSize, setGroupSize] = useState(1);
  const [tableNo, setTableNo] = useState(qrInfo.tableNo);
  const [language, setLanguage] = useState("TH");
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async () => {
    if (!acceptPrivacy) {
      onError("กรุณายอมรับประกาศความเป็นส่วนตัวก่อนดำเนินการต่อ");
      return;
    }
    setSubmitting(true);
    try {
      const target = token
        ? { qrToken: token }
        : { clientId: qrInfo.clientId, branchId: qrInfo.branchId };
      const response = await publicPost<CreateResult>("/public/check-ins", {
        ...target,
        phone,
        groupSize,
        tableNo,
        preferredLanguage: language,
        acceptPrivacyNotice: acceptPrivacy,
        privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
        marketingConsent: marketing,
      });
      onSubmitted(response.data);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  }, [
    acceptPrivacy,
    token,
    qrInfo.clientId,
    qrInfo.branchId,
    phone,
    groupSize,
    tableNo,
    language,
    marketing,
    onError,
    onSubmitted,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <label className="block">
        <span className="text-sm font-medium">หมายเลขโทรศัพท์มือถือ</span>
        <input
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="08X-XXX-XXXX"
          className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-lg"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium">จำนวนคนในกลุ่ม</span>
          <input
            type="number"
            min={1}
            max={100}
            value={groupSize}
            onChange={(event) => setGroupSize(Number(event.target.value))}
            className="mt-1 w-full rounded-xl border border-slate-300 p-3"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">โต๊ะ/โซน (ถ้ามี)</span>
          <input
            value={tableNo}
            onChange={(event) => setTableNo(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 p-3"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-medium">ภาษาแจ้งเตือน</span>
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 p-3"
        >
          <option value="TH">ไทย</option>
          <option value="EN">English</option>
        </select>
      </label>
      <div className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
        <p className="font-semibold">ประกาศความเป็นส่วนตัว (ฉบับย่อ v{PRIVACY_NOTICE_VERSION})</p>
        <p className="mt-1">
          ร้านเก็บหมายเลขโทรศัพท์ของท่านเพื่อส่งการแจ้งเตือนด้านความปลอดภัยและเหตุฉุกเฉินระหว่างที่ท่านใช้บริการเท่านั้น
          ข้อมูลจะไม่ถูกใช้เพื่อการโฆษณา และจะถูกลบโดยอัตโนมัติภายใน {qrInfo.retentionHours}{" "}
          ชั่วโมงหลังออกจากร้าน
        </p>
        <label className="mt-3 flex items-start gap-2">
          <input
            type="checkbox"
            checked={acceptPrivacy}
            onChange={(event) => setAcceptPrivacy(event.target.checked)}
            className="mt-1"
          />
          <span>ข้าพเจ้ายอมรับประกาศความเป็นส่วนตัว (จำเป็น)</span>
        </label>
        <label className="mt-2 flex items-start gap-2">
          <input
            type="checkbox"
            checked={marketing}
            onChange={(event) => setMarketing(event.target.checked)}
            className="mt-1"
          />
          <span>ยินยอมรับข่าวสารการตลาด (ไม่บังคับ)</span>
        </label>
      </div>
      <button
        onClick={submit}
        disabled={submitting || !phone || !acceptPrivacy}
        className="rounded-xl bg-red-600 p-4 text-lg font-bold text-white disabled:opacity-40"
      >
        {submitting
          ? "กำลังลงทะเบียน…"
          : qrInfo.skipOtp
            ? "ลงทะเบียน"
            : "รับรหัส OTP"}
      </button>
    </div>
  );
}

function OtpForm({
  otpInfo,
  onVerified,
  onError,
}: {
  otpInfo: OtpInfo;
  onVerified: () => void;
  onError: (message: string) => void;
}) {
  const [otp, setOtp] = useState("");
  const [refCode, setRefCode] = useState(otpInfo.refCode);
  const [submitting, setSubmitting] = useState(false);

  const verify = useCallback(async () => {
    setSubmitting(true);
    try {
      const response = await publicPost<{ sessionToken: string }>(
        `/public/check-ins/${otpInfo.checkInId}/verify`,
        { otp }
      );
      setCustomerToken(response.data.sessionToken);
      onVerified();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "รหัสไม่ถูกต้อง");
    } finally {
      setSubmitting(false);
    }
  }, [otp, otpInfo.checkInId, onVerified, onError]);

  const resend = useCallback(async () => {
    try {
      const response = await publicPost<OtpInfo>(
        `/public/check-ins/${otpInfo.checkInId}/resend-otp`
      );
      setRefCode(response.data.refCode);
      onError("");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "ขอรหัสใหม่ไม่สำเร็จ");
    }
  }, [otpInfo.checkInId, onError]);

  return (
    <div className="flex flex-col gap-4 text-center">
      <p className="text-slate-600">
        กรอกรหัส OTP 6 หลักที่ส่งไปยังโทรศัพท์ของท่าน
        <br />
        <span className="font-mono text-sm">Ref: {refCode}</span> (หมดอายุใน 5 นาที)
      </p>
      <input
        inputMode="numeric"
        maxLength={6}
        value={otp}
        onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
        className="mx-auto w-48 rounded-xl border border-slate-300 p-4 text-center font-mono text-2xl tracking-widest"
      />
      <button
        onClick={verify}
        disabled={submitting || otp.length !== 6}
        className="rounded-xl bg-red-600 p-4 text-lg font-bold text-white disabled:opacity-40"
      >
        ยืนยันรหัส
      </button>
      <button onClick={resend} className="text-sm text-slate-500 underline">
        ไม่ได้รับรหัส? ขอรหัสใหม่
      </button>
    </div>
  );
}

function SuccessPanel() {
  const router = useRouter();
  const [pushStatus, setPushStatus] = useState<"idle" | "enabled" | "failed">("idle");

  const enablePush = useCallback(async () => {
    try {
      const success = await subscribeWebPush();
      setPushStatus(success ? "enabled" : "failed");
    } catch {
      setPushStatus("failed");
    }
  }, []);

  return (
    <div className="flex flex-col gap-4 text-center">
      <div className="text-5xl">✅</div>
      <h2 className="text-xl font-bold">ลงทะเบียนสำเร็จ</h2>
      <p className="text-slate-600">
        ท่านจะได้รับการแจ้งเตือนหากเกิดเหตุฉุกเฉินระหว่างอยู่ในร้าน
        ตามช่องทางที่ร้านเปิดใช้งาน — เปิดการแจ้งเตือนผ่าน Browser ด้านล่างเพื่อรับเร็วที่สุด
      </p>
      <div className="rounded-xl bg-slate-100 p-4 text-left text-sm">
        <p className="font-semibold">รับแจ้งเตือนเร็วขึ้น (ไม่บังคับ)</p>
        {pushStatus === "enabled" ? (
          <p className="mt-2 text-green-700">✓ เปิดการแจ้งเตือนผ่าน Browser แล้ว</p>
        ) : (
          <button
            onClick={enablePush}
            className="mt-2 w-full rounded-lg bg-slate-800 p-3 font-semibold text-white"
          >
            🔔 อนุญาตการแจ้งเตือนผ่าน Browser
          </button>
        )}
        {pushStatus === "failed" && (
          <p className="mt-2 text-amber-700">
            เปิดไม่สำเร็จ — ท่านยังคงได้รับแจ้งเตือนตามช่องทางอื่นที่ร้านเปิดใช้ (iOS ต้องเพิ่มหน้านี้ลง Home Screen ก่อน)
          </p>
        )}
      </div>
      <button
        onClick={() => router.push("/status")}
        className="rounded-xl bg-red-600 p-4 font-bold text-white"
      >
        ไปหน้าสถานะของฉัน
      </button>
    </div>
  );
}
